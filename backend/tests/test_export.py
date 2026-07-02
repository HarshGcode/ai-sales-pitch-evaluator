import csv
import io

from tests.conftest import login
from tests.test_dashboard_search import _setup_completed_evaluation


def test_export_csv_returns_header_and_row(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/export/evaluations.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers["content-disposition"]

    rows = list(csv.reader(io.StringIO(resp.text)))
    assert rows[0][0] == "sales_exec_name"
    assert len(rows) == 2
    assert rows[1][0] == "Test Exec"


def test_export_csv_respects_filters(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "admin@testorg.com", "admin123")
    resp = client.get("/export/evaluations.csv", params={"employee": "Nobody"})
    rows = list(csv.reader(io.StringIO(resp.text)))
    assert len(rows) == 1  # header only


def test_export_csv_scoped_by_role(client, seeded_org):
    _setup_completed_evaluation(client, seeded_org)
    login(client, "exec@testorg.com", "exec123")
    resp = client.get("/export/evaluations.csv")
    rows = list(csv.reader(io.StringIO(resp.text)))
    assert len(rows) == 2
