"""permite reinscribir a un chico con la inscripción cancelada

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("uq_dni_chico_temporada", "inscripciones", type_="unique")
    op.create_index(
        "uq_dni_chico_temporada_activa",
        "inscripciones",
        ["dni_chico", "temporada"],
        unique=True,
        postgresql_where=sa.text("estado <> 'CANCELADA'"),
    )


def downgrade():
    op.drop_index("uq_dni_chico_temporada_activa", table_name="inscripciones")
    op.create_unique_constraint("uq_dni_chico_temporada", "inscripciones", ["dni_chico", "temporada"])
