"""multi_product_core_schema

Revision ID: 001
Revises:
Create Date: 2023-10-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Shared tables
    op.create_table(
        'organizations',
        sa.Column('org_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('org_type', sa.String(50)),  # newsroom, law_firm, financial, government
        sa.Column('subscription_tier', sa.String(50)),
        sa.Column('stripe_customer_id', sa.String(100)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('org_id')
    )

    op.create_table(
        'verification_requests',
        sa.Column('request_id', sa.UUID(), nullable=False),
        sa.Column('org_id', sa.UUID(), sa.ForeignKey('organizations.org_id')),
        sa.Column('product', sa.String(50)),  # factflow, factlaw, factmarkets, factgov
        sa.Column('claim_text', sa.Text()),
        sa.Column('verdict', sa.String(50)),
        sa.Column('confidence', sa.Float()),
        sa.Column('evidence', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('request_id')
    )

    # Add indexes
    op.create_index('idx_org_type', 'organizations', ['org_type'])
    op.create_index('idx_product', 'verification_requests', ['product'])
    op.create_index('idx_created_at', 'verification_requests', ['created_at'])

def downgrade():
    op.drop_table('verification_requests')
    op.drop_table('organizations')
