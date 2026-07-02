from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPKMixin


class AudioFile(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "audio_files"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)


class Evaluation(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "evaluations"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    script_id: Mapped[str] = mapped_column(ForeignKey("scripts.id"), nullable=False)
    sales_exec_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    evaluated_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    audio_file_id: Mapped[str] = mapped_column(ForeignKey("audio_files.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    transcript_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript_language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    feedback: Mapped["Feedback"] = relationship(back_populates="evaluation", uselist=False, cascade="all, delete-orphan")
    script: Mapped["Script"] = relationship()  # noqa: F821
    sales_exec: Mapped["User"] = relationship(foreign_keys=[sales_exec_id])  # noqa: F821
    audio_file: Mapped["AudioFile"] = relationship(foreign_keys=[audio_file_id])


class Feedback(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "feedback"

    evaluation_id: Mapped[str] = mapped_column(ForeignKey("evaluations.id"), unique=True, nullable=False)
    script_adherence_pct: Mapped[float] = mapped_column(Float, nullable=False)
    scores_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    missing_mandatory_points: Mapped[list] = mapped_column(JSON, default=list)
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    weaknesses: Mapped[list] = mapped_column(JSON, default=list)
    improvement_tips: Mapped[list] = mapped_column(JSON, default=list)
    raw_llm_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    evaluation: Mapped["Evaluation"] = relationship(back_populates="feedback")
