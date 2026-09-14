"""fix links url / context_snippet to Text

Revision ID: 0003_fix_link_url_and_snippet
Revises: 0002_fix_raw_body
Create Date: 2026-09-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_fix_link_url_and_snippet'
down_revision: str = '0002_fix_raw_body'


def upgrade() -> None:
    op.alter_column('links', 'url', type_=sa.Text(), nullable=False)
    op.alter_column('links', 'context_snippet', type_=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column('links', 'url', type_=sa.String(length=255), nullable=False)
    op.alter_column('links', 'context_snippet', type_=sa.String(length=255), nullable=True)