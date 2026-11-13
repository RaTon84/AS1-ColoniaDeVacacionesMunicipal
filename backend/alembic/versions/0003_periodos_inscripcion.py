"""Agrega el período de inscripción por temporada."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "periodos_inscripcion",
        sa.Column("temporada", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("apertura", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cierre", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "cierre > apertura",
            name="ck_periodo_inscripcion_orden",
        ),
    )


def downgrade():
    op.drop_table("periodos_inscripcion")