"""Agrega la configuración de temporadas."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "configuracion_temporadas",
        sa.Column("temporada", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("edad_minima", sa.Integer(), nullable=False),
        sa.Column("edad_maxima", sa.Integer(), nullable=False),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.CheckConstraint(
            "edad_minima >= 0 AND edad_maxima >= edad_minima",
            name="ck_configuracion_temporadas_edades",
        ),
    )

    op.create_index(
        "uq_configuracion_temporadas_activa",
        "configuracion_temporadas",
        ["activa"],
        unique=True,
        postgresql_where=sa.text("activa IS TRUE"),
    )


def downgrade():
    op.drop_table("configuracion_temporadas")