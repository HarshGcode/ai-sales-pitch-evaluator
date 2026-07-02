from tests.conftest import login


def test_login_success_sets_cookie_and_returns_user(client, seeded_org):
    resp = login(client, "admin@testorg.com", "admin123")
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["email"] == "admin@testorg.com"
    assert body["user"]["role"] == "admin"
    assert "access_token" in resp.cookies


def test_login_wrong_password_rejected(client, seeded_org):
    resp = login(client, "admin@testorg.com", "wrong-password")
    assert resp.status_code == 401


def test_login_unknown_email_rejected(client, seeded_org):
    resp = login(client, "nobody@testorg.com", "whatever")
    assert resp.status_code == 401


def test_login_inactive_user_rejected(client, seeded_org, db_session):
    seeded_org["sales_exec"].is_active = False
    db_session.commit()
    resp = login(client, "exec@testorg.com", "exec123")
    assert resp.status_code == 401


def test_me_requires_authentication(client, seeded_org):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user_after_login(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    resp = client.get("/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "manager@testorg.com"


def test_change_password_flow(client, seeded_org):
    login(client, "exec@testorg.com", "exec123")
    resp = client.post(
        "/auth/change-password",
        json={"current_password": "exec123", "new_password": "newpass456"},
    )
    assert resp.status_code == 200

    logout_client = client
    logout_client.cookies.clear()
    resp = login(logout_client, "exec@testorg.com", "exec123")
    assert resp.status_code == 401
    resp = login(logout_client, "exec@testorg.com", "newpass456")
    assert resp.status_code == 200


def test_change_password_wrong_current_rejected(client, seeded_org):
    login(client, "exec@testorg.com", "exec123")
    resp = client.post(
        "/auth/change-password",
        json={"current_password": "wrong", "new_password": "newpass456"},
    )
    assert resp.status_code == 400
