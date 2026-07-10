import os
from dotenv import load_dotenv
load_dotenv()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.1:8b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
DOCUMENT_STORAGE_DIR = os.getenv("DOCUMENT_STORAGE_DIR", "./documents")

SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "dev-only-change-me")
SESSION_COOKIE_NAME = "session_id"
SESSION_LIFETIME_HOURS =  12

MAX_CONCURRENT_OLLAMA_REQUESTS = int(
    os.getenv("MAX_CONCURRET_OLLAMA_REQUESTS", "1")
)

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 10

DATABASE_PATH = os.getenv("DATABASE_PATH", "./app_data.db")
