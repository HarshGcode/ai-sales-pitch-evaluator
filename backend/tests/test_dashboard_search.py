from tests.conftest import login
from tests.test_evaluation_pipeline import upload_audio
from tests.test_script_upload import upload_txt


def _setup_completed_evaluation(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    script_id = upload_txt(client).json()["id"]
    upload_audio(client, script_id, seeded_org["sales_exec"].id)
    return script_id


def test_dashboard_stats_reflect_completed_evaluations(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/dashboard/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_evaluations"] == 1
    assert body["average_score"] is not None
    assert body["best_performer"]["name"] == "Test Exec"
    assert body["weakest_performer"]["name"] == "Test Exec"
    assert body["script_compliance_rate"] is not None
    assert len(body["recent_evaluations"]) == 1


def test_dashboard_stats_empty_state(client, seeded_org):
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/dashboard/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_evaluations"] == 0
    assert body["average_score"] is None
    assert body["best_performer"] is None


def test_dashboard_stats_scoped_to_sales_exec_own_data(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "exec@testorg.com", "exec123")
    resp = client.get("/dashboard/stats")
    assert resp.status_code == 200
    assert resp.json()["total_evaluations"] == 1


def test_leaderboard_ranks_by_average_score(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/dashboard/leaderboard")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["full_name"] == "Test Exec"
    assert entries[0]["evaluation_count"] == 1


def test_search_evaluations_by_employee_name(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/search/evaluations", params={"employee": "Test Exec"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.get("/search/evaluations", params={"employee": "Nobody"})
    assert resp.status_code == 200
    assert len(resp.json()) == 0


def test_search_evaluations_by_score_range(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/search/evaluations", params={"min_score": 0, "max_score": 100})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.get("/search/evaluations", params={"min_score": 101})
    assert resp.status_code == 200
    assert len(resp.json()) == 0


def test_search_evaluations_scoped_by_role(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "exec@testorg.com", "exec123")
    resp = client.get("/search/evaluations")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
