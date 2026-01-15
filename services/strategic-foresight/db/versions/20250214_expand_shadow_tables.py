"""
owner: data-platform
risk: medium
backfill_required: true
estimated_runtime: 4m
reversible: true
flags:
  dual_write: true
  shadow_read: true
  cutover_enabled: false
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20250214_expand_shadow_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "intel_cases_shadow",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("intel_cases_shadow")
