# Project Notes

## Architecture decisions

### Why permission filtering at the retrieval layer?

The most important security decision in this codebase is in `backend/query.py`:

```python
where={
    "$or": [
        {"owner_id": {"$eq": str(user_id)}},
        {"owner_id": {"$eq": user_id}},
        {"visibility": {"$eq": "shared"}},
    ]
}
```

This filter runs **inside ChromaDB**, before any chunks reach the LLM. An alternative approach — retrieving all chunks and asking the model to "only use documents this user is allowed to see" — is insecure because:

1. LLMs can hallucinate or ignore instructions
2. Prompt injection attacks in uploaded documents could override the instruction
3. There's no audit trail of what was actually retrieved vs. what the model used

By filtering at the database layer, we get a hard guarantee: a user's private documents are never retrieved for another user's query, regardless of what the model does.

### Why server-side sessions over JWT?

`backend/auth.py` stores sessions in SQLite rather than using stateless JWT tokens. This means:

- Logout actually works (delete the row = session is gone)
- Compromised tokens can be revoked immediately
- No token refresh complexity

The tradeoff is a database lookup on every request — acceptable at this scale.

### Why ChromaDB over a managed vector database?

- Zero setup — just `pip install chromadb`
- Persists to disk automatically
- Supports metadata filtering (essential for our permission model)
- Free, open source, no API keys
- At 50-500 users with typical document volumes, it scales fine

### Why Ollama over cloud LLM APIs?

The entire point of this project is confidentiality. Sending document chunks to OpenAI, Anthropic, or any third-party API contradicts that goal. Ollama runs models locally — the only network traffic is between the user's browser and the server on the local network.

## Development notes

### Adding a new file type

1. Add the extension to `ALLOWED_EXTENSIONS` in `backend/storage.py`
2. Add an extraction function in `backend/ingest.py`
3. Register it in the `extract_text()` routing function in `backend/ingest.py`

### Adding a new API endpoint

1. Add the route to `backend/main.py`
2. Add `Depends(auth.require_user)` to any endpoint that needs authentication
3. Add the corresponding function to `manifest/lib/api.ts`

### Changing the LLM model

Update `OLLAMA_CHAT_MODEL` in `backend/.env`. The model must be pulled with `ollama pull <model>` first. No code changes needed.

### Changing the embedding model

Update `OLLAMA_EMBED_MODEL` in `backend/.env`. **Important:** if you change the embedding model after documents are already indexed, you must delete `backend/chroma_data/` and re-index all documents — embeddings from different models are not compatible.
