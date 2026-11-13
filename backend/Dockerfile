# Etapa 1: compila la SPA. Node no queda en la imagen final.
FROM node:22.12.0-bookworm-slim AS front
WORKDIR /front
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Etapa 2: la API, que además sirve la SPA compilada (ADR-012).
FROM python:3.12.7-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=front /front/dist ./app/static
# El proceso no corre como root (Clase 12).
RUN useradd --system --no-create-home colonia
USER colonia
EXPOSE 8000
# Al arrancar: aplica las migraciones, carga los turnos iniciales y levanta la API.
CMD ["/bin/sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
