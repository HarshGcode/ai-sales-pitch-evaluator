"""Populate the demo org with ~20 sales executives and a realistic evaluation history,
so the dashboard, leaderboard, and search have enough volume to be worth looking at.

This inserts Evaluation/Feedback rows directly rather than running audio through the
AI pipeline, since the goal here is dashboard volume, not testing the AI itself.

Run with: python -m app.seed_demo_data
"""

import random
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.evaluation import AudioFile, Evaluation, Feedback
from app.models.organization import Organization
from app.models.script import Script
from app.models.user import Role, User

random.seed(42)

MANAGERS = [
    {"email": "priya.manager@acmecorp.com", "full_name": "Priya Manager", "department": "Corporate Banking"},
    {"email": "rahul.manager@acmecorp.com", "full_name": "Rahul Manager", "department": "Wealth Management"},
]

# (name, department, skill tier). Tiers set the average-score band each person's
# evaluations are drawn from, so the leaderboard has a realistic top-to-bottom spread.
SALES_EXECS = [
    ("Aditi Sharma", "Retail Banking", "top"),
    ("Rohan Verma", "Retail Banking", "top"),
    ("Neha Gupta", "Retail Banking", "mid"),
    ("Karan Mehta", "Retail Banking", "mid"),
    ("Ishita Singh", "Retail Banking", "mid"),
    ("Vikram Rao", "Retail Banking", "low"),
    ("Ananya Iyer", "Retail Banking", "mid"),
    ("Arjun Nair", "Corporate Banking", "top"),
    ("Divya Reddy", "Corporate Banking", "mid"),
    ("Siddharth Joshi", "Corporate Banking", "mid"),
    ("Pooja Desai", "Corporate Banking", "mid"),
    ("Manish Kapoor", "Corporate Banking", "low"),
    ("Ritika Bose", "Corporate Banking", "mid"),
    ("Varun Malhotra", "Wealth Management", "top"),
    ("Sneha Pillai", "Wealth Management", "mid"),
    ("Aakash Chatterjee", "Wealth Management", "mid"),
    ("Meera Krishnan", "Wealth Management", "mid"),
    ("Tarun Agarwal", "Wealth Management", "low"),
    ("Kavya Menon", "Wealth Management", "mid"),
    ("Nikhil Bhatt", "Wealth Management", "mid"),
]

TIER_RANGES = {
    "top": (82, 96),
    "mid": (62, 84),
    "low": (40, 62),
}

STRENGTHS_POOL = [
    "Clear articulation of the loan terms",
    "Confirmed customer identity smoothly",
    "Explained the EMI breakdown clearly",
    "Handled the pricing objection well",
    "Maintained a warm, professional tone throughout",
    "Strong closing with a clear next step",
]

WEAKNESSES_POOL = [
    "Rushed through the documentation requirements",
    "Did not confirm customer understanding before moving on",
    "Missed an opportunity to address the objection directly",
    "Closing felt abrupt",
    "Limited engagement — mostly one-directional talking",
]

TIPS_POOL = [
    "Slow down when explaining the interest rate calculation",
    "Ask more open-ended questions to engage the customer",
    "Summarize next steps explicitly before ending the call",
    "Pause after key points to check for questions",
    "Lead with empathy before addressing pricing concerns",
]


def _score_in_tier(tier: str, rng: random.Random) -> int:
    lo, hi = TIER_RANGES[tier]
    return rng.randint(lo, hi)


def _make_scores(overall: int, rng: random.Random) -> dict:
    jitter = lambda: max(0, min(100, overall + rng.randint(-12, 12)))  # noqa: E731
    return {
        "tone": jitter(),
        "confidence": jitter(),
        "empathy": jitter(),
        "clarity": jitter(),
        "compliance": jitter(),
        "closing_quality": jitter(),
        "filler_word_count": rng.randint(0, 14),
        "talk_to_listen_ratio": rng.randint(40, 75),
        "interactivity_score": jitter(),
        "question_count": rng.randint(1, 8),
        "speaking_pace_wpm": rng.randint(110, 170),
    }


def run():
    db = SessionLocal()
    rng = random.Random(42)
    try:
        org = db.query(Organization).first()
        if not org:
            print("No organization found — run `python -m app.seed` first.")
            return

        script = db.query(Script).filter(Script.status == "ready").first()
        if not script:
            print("No ready script found — run `python -m app.seed` first.")
            return

        if db.query(User).filter(User.email == MANAGERS[0]["email"]).first():
            print("Demo dataset already seeded, skipping. Delete these users/evaluations first to reseed.")
            return

        base_manager = db.query(User).filter(User.role == Role.MANAGER.value).first()

        managers_by_department = {base_manager.department: base_manager}
        for m in MANAGERS:
            manager = User(
                organization_id=org.id,
                email=m["email"],
                hashed_password=hash_password("manager123"),
                full_name=m["full_name"],
                role=Role.MANAGER.value,
                department=m["department"],
            )
            db.add(manager)
            managers_by_department[m["department"]] = manager
        db.flush()

        now = datetime.now(timezone.utc)
        created_execs = 0
        created_evaluations = 0

        for name, department, tier in SALES_EXECS:
            manager = managers_by_department[department]
            email = name.lower().replace(" ", ".") + "@acmecorp.com"
            sales_exec = User(
                organization_id=org.id,
                email=email,
                hashed_password=hash_password("exec123"),
                full_name=name,
                role=Role.SALES_EXEC.value,
                department=department,
                manager_id=manager.id,
            )
            db.add(sales_exec)
            db.flush()
            created_execs += 1

            num_evaluations = rng.randint(3, 7)
            for _ in range(num_evaluations):
                days_ago = rng.randint(0, 120)
                created_at = now - timedelta(days=days_ago, hours=rng.randint(0, 23))
                overall = _score_in_tier(tier, rng)
                scores = _make_scores(overall, rng)
                adherence_pct = round(max(30, min(100, overall + rng.randint(-15, 10))), 1)
                missing = [] if adherence_pct > 85 else rng.sample(
                    ["Loan Eligibility", "EMI", "Documentation"], k=rng.randint(0, 2)
                )

                audio_file = AudioFile(
                    organization_id=org.id,
                    uploaded_by=manager.id,
                    file_path=f"demo/{sales_exec.id}-{days_ago}.mp3",
                    original_filename="pitch.mp3",
                    duration_seconds=float(rng.randint(90, 400)),
                    mime_type="audio/mpeg",
                )
                db.add(audio_file)
                db.flush()

                evaluation = Evaluation(
                    organization_id=org.id,
                    script_id=script.id,
                    sales_exec_id=sales_exec.id,
                    evaluated_by=manager.id,
                    audio_file_id=audio_file.id,
                    status="completed",
                    transcript_text="[DEMO DATA] Synthetic evaluation generated for dashboard population.",
                    transcript_language="en",
                    overall_score=overall,
                    completed_at=created_at,
                    created_at=created_at,
                )
                db.add(evaluation)
                db.flush()

                db.add(
                    Feedback(
                        evaluation_id=evaluation.id,
                        script_adherence_pct=adherence_pct,
                        scores_json=scores,
                        missing_mandatory_points=missing,
                        strengths=rng.sample(STRENGTHS_POOL, k=2),
                        weaknesses=rng.sample(WEAKNESSES_POOL, k=1 if missing else 2),
                        improvement_tips=rng.sample(TIPS_POOL, k=3),
                        raw_llm_response=None,
                    )
                )
                created_evaluations += 1

        db.commit()
        print(f"Seeded {len(MANAGERS)} managers, {created_execs} sales executives, {created_evaluations} evaluations.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
