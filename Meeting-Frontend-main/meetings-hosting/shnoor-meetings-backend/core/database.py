import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor


BASE_DIR = Path(__file__).resolve().parent.parent
SCHEMA_PATH = BASE_DIR / "schema.sql"
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)


def get_database_url():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    host = os.getenv("POSTGRES_HOST", "127.0.0.1")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "shnoor_meetings")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")

    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


def get_db_connection():
    return psycopg2.connect(get_database_url(), cursor_factory=RealDictCursor)


def init_db():
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Database schema file not found: {SCHEMA_PATH}")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
