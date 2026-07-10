# Manifest — Offline Document Intelligence Platform

> Ask questions of your company's documents. Get cited answers. Fully offline, fully private.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=flat&logo=next.js&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-FF6B35?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## What is Manifest?

Manifest is a self-hosted, fully offline RAG (Retrieval-Augmented Generation) platform that lets employees upload company documents and ask natural language questions about them — with every answer traced back to a specific source document.

Built as an internship project to solve a real problem: companies have confidential documents (SOPs, reports, contracts, manuals) that employees need to query, but cannot safely send to third-party AI services like ChatGPT or NotebookLM.

**Manifest runs entirely on your own hardware. No data ever leaves your network.**

---

## Demo

| Login | Document Library | Chat |
|-------|-----------------|------|
| Secure username/password auth | Upload PDF, DOCX, PPTX, Excel, images | Ask questions, get cited answers |

---

## Key Features

- **100% offline** — Ollama runs the LLM locally, ChromaDB stores vectors on disk, no external API calls during inference
- **Per-user document isolation** — access control enforced at the vector retrieval layer, not the AI model layer (the architecturally correct approach)
- **Multi-format support** — PDF, DOCX, PPTX, TXT, XLSX, CSV, and scanned documents via Tesseract OCR
- **Private/shared documents** — each user can mark uploads as private (only them) or shared (whole company)
- **Audit logging** — every login, upload, and query is logged with user ID and timestamp
- **Brute-force protection** — account lockout after repeated failed login attempts
- **Professional UI** — clean React/Next.js frontend with sidebar navigation, drag-and-drop upload, and real-time chat

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│              Next.js Frontend (localhost:3000)           │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (local network only)
┌─────────────────────▼───────────────────────────────────┐
│                  FastAPI Backend (localhost:8000)         │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Auth/Sessions│  │Doc Ingestion │  │  RAG Engine    │  │
│  │   (SQLite)  │  │Parse→Chunk   │  │Embed→Search    │  │
│  └─────────────┘  │→Embed→Store  │  │→Filter→Answer  │  │
│                   └──────┬───────┘  └───────┬────────┘  │
└──────────────────────────┼──────────────────┼───────────┘
                           │                  │
           ┌───────────────▼──────────────────▼───────────┐
           │              Ollama (localhost:11434)          │
           │   nomic-embed-text    │    llama3.1:8b        │
           │   (embeddings)        │    (generation)       │
           └───────────────────────────────────────────────┘
                           │
           ┌───────────────▼───────────────────────────────┐
           │           ChromaDB (local disk)                │
           │  Vector store with per-user metadata filtering  │
           └───────────────────────────────────────────────┘
```

### Security model

The critical architectural decision: **permission filtering happens inside the ChromaDB query, not inside the LLM prompt.**

When User A asks a question, the vector search is filtered to only return chunks where `owner_id == A OR visibility == "shared"` before any chunks reach the language model. User B's private documents are excluded at the database layer — they never appear in retrieved context, regardless of what the model does.

This is meaningfully different from (and more secure than) asking the model to "only use documents this user is allowed to see."

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | Type-safe, fast, no extra dependencies |
| Backend | Python 3.11, FastAPI | Best ecosystem for RAG/ML work |
| AI model | Ollama + Llama 3.1 8B | Local inference, zero data leakage |
| Embeddings | nomic-embed-text | Long context (8192 tokens), fast, local |
| Vector DB | ChromaDB | Zero setup, persistent, filterable metadata |
| Auth DB | SQLite | Single file, zero setup, adequate for this scale |
| OCR | Tesseract 5.x | Free, open source, runs locally |
| Password hashing | bcrypt | Industry standard |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/download) installed
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) installed (Windows)

### 1. Pull the required models

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env    # Windows
# cp .env.example .env   # Mac/Linux

# Create your first admin account
python create_admin.py

# Start the backend
uvicorn main:app --reload
```

### 3. Frontend setup

```bash
cd manifest
npm install
# Create .env.local with:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm run dev
```

### 4. Open the app

Navigate to `http://localhost:3000` and sign in with the admin credentials you created.

---

## Project Structure

```
manifest/                    # Next.js frontend
├── app/
│   ├── page.tsx            # Root page — auth check + routing
│   ├── layout.tsx          # App layout
│   └── globals.css         # Global styles
├── components/
│   ├── LoginScreen.tsx     # Login UI
│   └── AppShell.tsx        # Main app — sidebar, chat, library
└── lib/
    ├── api.ts              # Backend API client
    └── types.ts            # Shared TypeScript types

backend/                     # FastAPI backend
├── main.py                 # FastAPI app + all routes
├── auth.py                 # Login, sessions, brute-force protection
├── database.py             # SQLite schema + queries
├── config.py               # Settings from .env
├── ingest.py               # Document ingestion pipeline
├── storage.py              # File storage + document records
├── query.py                # RAG query engine
├── ollama_client.py        # Ollama API wrapper
└── create_admin.py         # One-time admin account setup
```

---

## How RAG Works in Manifest

1. **Upload** — user selects a file and marks it private or shared
2. **Parse** — text extracted from PDF/DOCX/PPTX/Excel/image (OCR for scanned docs)
3. **Chunk** — text split into ~800 character overlapping segments
4. **Embed** — each chunk converted to a vector by `nomic-embed-text` running locally
5. **Store** — vectors + metadata (owner_id, visibility, filename) saved to ChromaDB
6. **Query** — user asks a question
7. **Embed question** — question converted to a vector using the same model
8. **Search** — ChromaDB finds the top matching chunks, filtered by permission
9. **Generate** — matching chunks + question sent to Llama 3.1 8B
10. **Answer** — response returned with source document citations

---

## Security Considerations

- Passwords hashed with bcrypt (never stored in plaintext)
- Sessions stored server-side in SQLite — logout actually invalidates the session
- Account lockout after 5 failed login attempts (10 minute cooldown)
- Per-user document isolation enforced at the ChromaDB query layer
- Audit log records every login, upload, and query with timestamp
- No external network calls during inference — fully air-gapped capable
- CORS restricted to frontend origin only

---

## Known Limitations

- **Speed** — CPU-only inference is slow (20-60 seconds per query). A GPU server would bring this to under 5 seconds
- **Scale** — designed for 50-500 internal users, not a public-facing product
- **No streaming** — responses appear all at once rather than token-by-token (planned improvement)
- **Excel/CSV** — complex formatted spreadsheets may not extract perfectly

---

## Roadmap

- [ ] Streaming responses (token-by-token display)
- [ ] File encryption at rest
- [ ] Department-level document sharing (not just private/shared)
- [ ] Admin dashboard (usage stats, user management UI)
- [ ] Docker deployment package
- [ ] Support for more file types (audio transcription, email)

---

## Built With

This project was built during an internship to demonstrate production-grade RAG architecture on local hardware. The security model, document isolation approach, and system design reflect real engineering considerations — not just a tutorial follow-along.

Key engineering decisions documented in the codebase:
- Why permission filtering happens at the retrieval layer, not the prompt layer
- Why server-side sessions were chosen over JWT cookies
- Why ChromaDB was chosen over a managed vector database
- Why Ollama was chosen over cloud LLM APIs

---
*Built with Python, FastAPI, Next.js, Ollama, and ChromaDB*
