from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ObjectionHandlingItem(BaseModel):
    objection: str
    suggested_response: str


class ScriptStructured(BaseModel):
    mandatory_points: list[str] = Field(default_factory=list)
    optional_points: list[str] = Field(default_factory=list)
    compliance_statements: list[str] = Field(default_factory=list)
    objection_handling: list[ObjectionHandlingItem] = Field(default_factory=list)
    closing: list[str] = Field(default_factory=list)


class ScriptSectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    script_id: str
    section_type: str
    content: str
    order_index: int


class ScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    uploaded_by: str
    title: str
    original_filename: str
    status: str
    raw_text: str | None
    structured_json: ScriptStructured | None
    error_message: str | None
    created_at: datetime
