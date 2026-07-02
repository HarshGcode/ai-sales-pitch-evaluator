import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as database_module
from app.config import settings
from app.core.security import hash_password
from app.database import Base, get_db
from app.main import app
from app.models.organization import Organization
from app.models.user import Role, User


@pytest.fixture(autouse=True)
def force_mock_ai_services(monkeypatch):
    """Tests must be deterministic and offline regardless of real keys present in the
    developer's local .env — only test_service_selection.py overrides these explicitly
    to exercise the real-provider branches."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")


@pytest.fixture()
def db_session(monkeypatch):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Background tasks (e.g. script structuring, evaluation pipeline) open their own
    # session via app.database.SessionLocal rather than the request-scoped get_db
    # dependency, so it must point at the same in-memory engine during tests.
    monkeypatch.setattr(database_module, "SessionLocal", TestingSessionLocal)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_org(db_session):
    org = Organization(name="Test Org")
    db_session.add(org)
    db_session.flush()

    admin = User(
        organization_id=org.id,
        email="admin@testorg.com",
        hashed_password=hash_password("admin123"),
        full_name="Test Admin",
        role=Role.ADMIN.value,
    )
    manager = User(
        organization_id=org.id,
        email="manager@testorg.com",
        hashed_password=hash_password("manager123"),
        full_name="Test Manager",
        role=Role.MANAGER.value,
    )
    db_session.add_all([admin, manager])
    db_session.flush()

    sales_exec = User(
        organization_id=org.id,
        email="exec@testorg.com",
        hashed_password=hash_password("exec123"),
        full_name="Test Exec",
        role=Role.SALES_EXEC.value,
        manager_id=manager.id,
    )
    db_session.add(sales_exec)
    db_session.commit()

    return {"org": org, "admin": admin, "manager": manager, "sales_exec": sales_exec}


def login(client, email, password):
    return client.post("/auth/login", json={"email": email, "password": password})
