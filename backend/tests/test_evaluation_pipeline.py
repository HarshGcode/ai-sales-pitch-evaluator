import io

from tests.conftest import login
from tests.test_script_upload import upload_txt


def upload_audio(client, script_id, sales_exec_id, filename="pitch.mp3"):
    return client.post(
        "/evaluations",
        data={"script_id": script_id, "sales_exec_id": sales_exec_id},
        files={"file": (filename, io.BytesIO(b"fake audio bytes"), "audio/mpeg")},
    )


def _ready_script_id(client):
    login(client, "manager@testorg.com", "manager123")
    return upload_txt(client).json()["id"]


def test_create_evaluation_end_to_end_with_mocks(client, seeded_org):
    script_id = _ready_script_id(client)
    login(client, "manager@testorg.com", "manager123")
    resp = upload_audio(client, script_id, seeded_org["sales_exec"].id)
    assert resp.status_code == 201
    evaluation_id = resp.json()["id"]

    # The create response is serialized before the background pipeline task runs, so
    # re-fetch to observe the final status (BackgroundTasks complete synchronously
    # within TestClient's in-process request cycle by the time this GET is issued).
    body = client.get(f"/evaluations/{evaluation_id}").json()
    assert body["status"] == "completed"
    assert body["mock_mode"] is True
    assert body["transcript_text"].startswith("[MOCK TRANSCRIPT]")
    assert 0 <= body["overall_score"] <= 100
    assert body["feedback"] is not None
    assert body["feedback"]["scores_json"]["tone"] >= 0
    assert body["script_title"] == "Bank Loan Script"
    assert body["sales_exec_name"] == "Test Exec"

    scores = body["feedback"]["scores_json"]
    assert 0 <= scores["talk_to_listen_ratio"] <= 100
    assert 0 <= scores["interactivity_score"] <= 100
    assert scores["question_count"] == body["transcript_text"].count("?")
    assert scores["speaking_pace_wpm"] > 0


def test_evaluation_rejects_unsupported_audio_type(client, seeded_org):
    script_id = _ready_script_id(client)
    login(client, "manager@testorg.com", "manager123")
    resp = client.post(
        "/evaluations",
        data={"script_id": script_id, "sales_exec_id": seeded_org["sales_exec"].id},
        files={"file": ("pitch.exe", io.BytesIO(b"nope"), "application/octet-stream")},
    )
    assert resp.status_code == 400


def test_evaluation_requires_ready_script(client, seeded_org):
    login(client, "manager@testorg.com", "manager123")
    processing_script = client.post(
        "/scripts",
        data={"title": "Not ready"},
        files={"file": ("s.txt", io.BytesIO(b""), "text/plain")},
    )
    # Force status back to processing to simulate an in-flight structuring job.
    script_id = processing_script.json()["id"]

    from app import database
    from app.models.script import Script

    db = database.SessionLocal()
    script = db.get(Script, script_id)
    script.status = "processing"
    db.commit()
    db.close()

    resp = upload_audio(client, script_id, seeded_org["sales_exec"].id)
    assert resp.status_code == 400


def test_sales_exec_can_only_evaluate_self(client, seeded_org):
    script_id = _ready_script_id(client)
    login(client, "exec@testorg.com", "exec123")
    resp = upload_audio(client, script_id, seeded_org["manager"].id)
    assert resp.status_code == 403

    resp = upload_audio(client, script_id, seeded_org["sales_exec"].id)
    assert resp.status_code == 201


def test_sales_exec_sees_only_own_evaluations(client, seeded_org):
    script_id = _ready_script_id(client)
    login(client, "manager@testorg.com", "manager123")
    upload_audio(client, script_id, seeded_org["sales_exec"].id)
    upload_audio(client, script_id, seeded_org["manager"].id)

    login(client, "exec@testorg.com", "exec123")
    resp = client.get("/evaluations")
    assert resp.status_code == 200
    evaluations = resp.json()
    assert len(evaluations) == 1
    assert evaluations[0]["sales_exec_id"] == seeded_org["sales_exec"].id


def test_admin_sees_all_evaluations_in_org(client, seeded_org):
    script_id = _ready_script_id(client)
    login(client, "manager@testorg.com", "manager123")
    upload_audio(client, script_id, seeded_org["sales_exec"].id)

    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/evaluations")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_evaluation_not_found_returns_404(client, seeded_org):
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/evaluations/does-not-exist")
    assert resp.status_code == 404


def test_evaluation_predating_gong_metrics_still_loads(client, seeded_org, db_session):
    """Regression test: Feedback rows persisted before talk_to_listen_ratio/interactivity_score/
    question_count/speaking_pace_wpm existed must still deserialize instead of 500ing."""
    script_id = _ready_script_id(client)
    login(client, "manager@testorg.com", "manager123")
    evaluation_id = upload_audio(client, script_id, seeded_org["sales_exec"].id).json()["id"]

    from app.models.evaluation import Feedback

    feedback = db_session.query(Feedback).filter(Feedback.evaluation_id == evaluation_id).one()
    feedback.scores_json = {
        "tone": 75,
        "confidence": 63,
        "empathy": 87,
        "clarity": 75,
        "compliance": 90,
        "closing_quality": 67,
        "filler_word_count": 10,
    }
    db_session.commit()

    resp = client.get(f"/evaluations/{evaluation_id}")
    assert resp.status_code == 200
    scores = resp.json()["feedback"]["scores_json"]
    assert scores["tone"] == 75
    assert scores["talk_to_listen_ratio"] is None
    assert scores["question_count"] is None

    dashboard_resp = client.get("/dashboard/stats")
    assert dashboard_resp.status_code == 200
