import logging

from app import database
from app.models.script import Script, ScriptSection
from app.services.llm import get_llm_service, validate_script_structured

logger = logging.getLogger(__name__)

SECTION_TYPE_MAP = {
    "mandatory_points": "mandatory_point",
    "optional_points": "optional_point",
    "compliance_statements": "compliance_statement",
    "closing": "closing",
}


def run_script_extraction(script_id: str) -> None:
    db = database.SessionLocal()
    try:
        script = db.get(Script, script_id)
        if not script:
            logger.warning("Script %s not found for extraction", script_id)
            return

        llm = get_llm_service()
        raw = None
        try:
            raw = llm.structure_script(script.raw_text or "")
            structured = validate_script_structured(raw)
        except (ValueError, TypeError):
            try:
                raw = llm.structure_script(script.raw_text or "")
                structured = validate_script_structured(raw)
            except Exception as exc:  # noqa: BLE001
                script.status = "failed"
                script.error_message = f"Script structuring failed after retry: {exc}"
                db.commit()
                return

        script.structured_json = structured.model_dump()
        script.status = "ready"

        order_index = 0
        for field, section_type in SECTION_TYPE_MAP.items():
            for content in getattr(structured, field):
                db.add(
                    ScriptSection(
                        script_id=script.id,
                        section_type=section_type,
                        content=content,
                        order_index=order_index,
                    )
                )
                order_index += 1
        for item in structured.objection_handling:
            db.add(
                ScriptSection(
                    script_id=script.id,
                    section_type="objection_handling",
                    content=f"{item.objection} || {item.suggested_response}",
                    order_index=order_index,
                )
            )
            order_index += 1

        db.commit()
    finally:
        db.close()
