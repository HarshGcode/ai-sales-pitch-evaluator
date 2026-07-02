FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/storage/scripts /app/storage/audio

EXPOSE 8000

# $PORT is injected by hosting platforms like Railway; defaults to 8000 for local
# docker-compose. --reload is dropped here since production has no mounted source to
# watch; docker-compose.yml runs uvicorn directly with --reload for local dev instead.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
