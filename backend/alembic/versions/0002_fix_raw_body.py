"""initial schema

Revision ID: b20e94ea5403
Revises: 
Create Date: 2026-08-22 19:07:04.030014

"""
from typing import Sequence, Union
import pgvector.sqlalchemy

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_fix_raw_body'
down_revision: str = 'b20e94ea5403'

def upgrade() -> None:
    op.alter_column('emails', 'raw_body', type_=sa.Text(), nullable=False)
    op.alter_column('emails', 'sender', nullable=True)
    op.alter_column('emails', 'thread_id', nullable=True)

def downgrade() -> None:
    op.alter_column('emails', 'raw_body', type_=sa.String(length=255), nullable=False)
    op.alter_column('emails', 'sender', nullable=False)
    op.alter_column('emails', 'thread_id', nullable=False)
