from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPKMixin


class Script(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "scripts"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="processing", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    sections: Mapped[list["ScriptSection"]] = relationship(
        back_populates="script", cascade="all, delete-orphan", order_by="ScriptSection.order_index"
    )


class ScriptSection(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "script_sections"

    script_id: Mapped[str] = mapped_column(ForeignKey("scripts.id"), nullable=False)
    section_type: Mapped[str] = mapped_column(String(30), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    script: Mapped["Script"] = relationship(back_populates="sections")
