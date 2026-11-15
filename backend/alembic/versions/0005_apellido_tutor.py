"""agrega apellido_tutor faltante en bases creadas con el esquema anterior

La columna se incorporó al modelo y a la migración 0001 después de que algunas
bases ya estaban creadas. Esta migración repara esas bases sin afectar a las
nuevas, donde la columna ya existe.

Revision ID: 0005
Revises: 0004
"""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE inscripciones "
        "ADD COLUMN IF NOT EXISTS apellido_tutor VARCHAR(120)"
    )
    op.execute(
        "UPDATE inscripciones SET apellido_tutor = '' "
        "WHERE apellido_tutor IS NULL"
    )
    op.execute(
        "ALTER TABLE inscripciones "
        "ALTER COLUMN apellido_tutor SET NOT NULL"
    )


def downgrade():
    # La columna forma parte del esquema inicial: no se elimina al revertir.
    pass
