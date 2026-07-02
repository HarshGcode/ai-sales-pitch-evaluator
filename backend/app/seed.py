"""Seed a demo organization, one user per role, and a sample script.

Run with: python -m app.seed
"""

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.organization import Organization
from app.models.script import Script, ScriptSection
from app.models.user import Role, User

DEMO_SCRIPT_TEXT = """Bank Loan Script

Greeting: Greet the customer warmly and introduce yourself and the bank.
Customer Verification: Verify the customer's identity and existing relationship with the bank.
Loan Eligibility: Explain eligibility criteria for the loan product.
Interest Rate: Clearly state the current interest rate and how it is calculated.
EMI: Walk the customer through the EMI calculation for their loan amount.
Processing Fee: Disclose the processing fee and any other charges.
Documentation: List the documents required to proceed with the application.
Closing: Summarize next steps and thank the customer for their time.
"""


def run():
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.name == "Acme Corp").first()
        if org:
            print("Demo data already exists, skipping seed.")
            return

        org = Organization(name="Acme Corp")
        db.add(org)
        db.flush()

        admin = User(
            organization_id=org.id,
            email="admin@acmecorp.com",
            hashed_password=hash_password("admin123"),
            full_name="Alice Admin",
            role=Role.ADMIN.value,
        )
        db.add(admin)
        db.flush()

        manager = User(
            organization_id=org.id,
            email="manager@acmecorp.com",
            hashed_password=hash_password("manager123"),
            full_name="Mark Manager",
            role=Role.MANAGER.value,
            department="Retail Banking",
        )
        db.add(manager)
        db.flush()

        sales_exec = User(
            organization_id=org.id,
            email="exec@acmecorp.com",
            hashed_password=hash_password("exec123"),
            full_name="Sam Executive",
            role=Role.SALES_EXEC.value,
            department="Retail Banking",
            manager_id=manager.id,
        )
        db.add(sales_exec)
        db.flush()

        script = Script(
            organization_id=org.id,
            uploaded_by=manager.id,
            title="Bank Loan Script",
            original_filename="bank_loan_script.txt",
            file_path="seed/bank_loan_script.txt",
            raw_text=DEMO_SCRIPT_TEXT,
            structured_json={
                "mandatory_points": [
                    "Greeting",
                    "Customer Verification",
                    "Loan Eligibility",
                    "Interest Rate",
                    "EMI",
                    "Processing Fee",
                    "Documentation",
                    "Closing",
                ],
                "optional_points": [],
                "compliance_statements": ["Disclose processing fee and charges clearly."],
                "objection_handling": [
                    {
                        "objection": "The interest rate is too high.",
                        "suggested_response": "Explain rate is competitive and tied to credit profile; offer to review options.",
                    }
                ],
                "closing": ["Summarize next steps and thank the customer for their time."],
            },
            status="ready",
        )
        db.add(script)
        db.flush()

        section_map = [
            ("mandatory_point", "Greeting", 0),
            ("mandatory_point", "Customer Verification", 1),
            ("mandatory_point", "Loan Eligibility", 2),
            ("mandatory_point", "Interest Rate", 3),
            ("mandatory_point", "EMI", 4),
            ("mandatory_point", "Processing Fee", 5),
            ("mandatory_point", "Documentation", 6),
            ("closing", "Summarize next steps and thank the customer for their time.", 7),
            ("compliance_statement", "Disclose processing fee and charges clearly.", 8),
        ]
        for section_type, content, order_index in section_map:
            db.add(ScriptSection(script_id=script.id, section_type=section_type, content=content, order_index=order_index))

        db.commit()
        print("Seeded demo org 'Acme Corp' with users:")
        print("  admin@acmecorp.com / admin123")
        print("  manager@acmecorp.com / manager123")
        print("  exec@acmecorp.com / exec123")
    finally:
        db.close()


if __name__ == "__main__":
    run()
