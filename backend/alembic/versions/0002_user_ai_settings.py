"""user ai provider settings

Revision ID: a1c9e2b40002
Revises: fbf927383292
Create Date: 2026-07-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1c9e2b40002"
down_revision: Union[str, None] = "fbf927383292"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("ai_provider", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("ai_api_key", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "ai_api_key")
    op.drop_column("users", "ai_provider")
