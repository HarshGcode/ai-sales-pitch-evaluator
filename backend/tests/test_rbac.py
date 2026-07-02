import pytest

from tests.conftest import login


@pytest.mark.parametrize(
    "role_email,role_password,expected_status",
    [
        ("admin@testorg.com", "admin123", 200),
        ("manager@testorg.com", "manager123", 200),
        ("exec@testorg.com", "exec123", 403),
    ],
)
def test_list_users_role_gated(client, seeded_org, role_email, role_password, expected_status):
    login(client, role_email, role_password)
    resp = client.get("/users")
    assert resp.status_code == expected_status


def test_list_users_without_auth_is_401(client, seeded_org):
    resp = client.get("/users")
    assert resp.status_code == 401


@pytest.mark.parametrize(
    "role_email,role_password,target_role,expected_status",
    [
        ("admin@testorg.com", "admin123", "manager", 201),
        ("admin@testorg.com", "admin123", "sales_exec", 201),
        ("manager@testorg.com", "manager123", "sales_exec", 201),
        ("manager@testorg.com", "manager123", "manager", 403),
        ("manager@testorg.com", "manager123", "admin", 403),
        ("exec@testorg.com", "exec123", "sales_exec", 403),
    ],
)
def test_create_user_role_gated(client, seeded_org, role_email, role_password, target_role, expected_status):
    login(client, role_email, role_password)
    resp = client.post(
        "/users",
        json={"email": f"new_{target_role}@testorg.com", "full_name": "New Person", "role": target_role},
    )
    assert resp.status_code == expected_status


def test_manager_created_sales_exec_is_scoped_to_manager(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    resp = client.post(
        "/users",
        json={"email": "report@testorg.com", "full_name": "Direct Report", "role": "sales_exec"},
    )
    assert resp.status_code == 201
    assert resp.json()["user"]["manager_id"] == seeded_org["manager"].id


def test_manager_cannot_update_non_report(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    resp = client.patch(f"/users/{seeded_org['admin'].id}", json={"department": "X"})
    assert resp.status_code in (403, 404)


def test_get_organization_requires_auth(client, seeded_org):
    resp = client.get("/organizations/me")
    assert resp.status_code == 401

    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/organizations/me")
    assert resp.status_code == 200
    assert resp.json()["id"] == seeded_org["org"].id
