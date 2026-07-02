import io

from tests.conftest import login

DEMO_SCRIPT = """Greeting: Welcome the customer.
Customer Verification: Confirm identity.
Loan Eligibility: Explain eligibility.
Closing: Thank the customer.
"""


def upload_txt(client, title="Bank Loan Script"):
    return client.post(
        "/scripts",
        data={"title": title},
        files={"file": ("script.txt", io.BytesIO(DEMO_SCRIPT.encode()), "text/plain")},
    )


def test_upload_script_requires_manager_or_admin(client, seeded_org):
    login(client, "exec@testorg.com", "exec123")
    resp = upload_txt(client)
    assert resp.status_code == 403


def test_upload_script_rejects_unsupported_extension(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    resp = client.post(
        "/scripts",
        data={"title": "Bad script"},
        files={"file": ("script.exe", io.BytesIO(b"not a script"), "application/octet-stream")},
    )
    assert resp.status_code == 400


def test_upload_txt_script_extracts_raw_text_and_structures(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    resp = upload_txt(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["raw_text"].strip().startswith("Greeting:")
    assert body["status"] == "processing"

    script_id = body["id"]
    detail = client.get(f"/scripts/{script_id}").json()
    assert detail["status"] == "ready"
    assert "Greeting" in detail["structured_json"]["mandatory_points"]
    assert detail["structured_json"]["closing"] == ["Closing"]


def test_get_script_sections_after_structuring(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    script_id = upload_txt(client).json()["id"]
    sections = client.get(f"/scripts/{script_id}/sections").json()
    section_types = {s["section_type"] for s in sections}
    assert "mandatory_point" in section_types
    assert "closing" in section_types


def test_list_scripts_scoped_to_organization(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    upload_txt(client)
    resp = client.get("/scripts")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_script_not_found_for_other_org(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    resp = client.get("/scripts/does-not-exist")
    assert resp.status_code == 404
