from fastapi import FastAPI, Depends, Response, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import database
import auth
import ollama_client
import os
import shutil
from fastapi import UploadFile, File, Form
import storage
import ingest
import query

app = FastAPI(title="Document chatbot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    database.init_db()
    reachable = await ollama_client.check_ollama_reachable()
    if not reachable:
        print("\n*** WARNING: Ollama not reachable. Run 'ollama serve' first. ***\n")
    else:
        print(f"Ollama is reachable at {config.OLLAMA_BASE_URL}")

@app.get("/api/health")
async def health():
    ollama_ok = await ollama_client.check_ollama_reachable()
    return{
        "backend" : "ok",
        "ollama_reachable" : ollama_ok,
        "chat_model" : config.OLLAMA_CHAT_MODEL,
        "embed_model" : config.OLLAMA_EMBED_MODEL,
    }

class LoginRequest(BaseModel):
    username : str
    password : str

@app.post("/api/auth/login")
async def login(payload: LoginRequest, response: Response):
    user = auth.authenticate(payload.username, payload.password)
    session_id = auth.create_session(user["id"])
    response.set_cookie(
        key=config.SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite="lax",
        max_age=config.SESSION_LIFETIME_HOURS * 3600,
    )
    return {"username": user["username"], "is_admin": user["is_admin"]}

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_id= request.cookies.get(config.SESSION_COOKIE_NAME)
    if session_id:
        auth.delete_session(session_id)
    response.delete_cookie(config.SESSION_COOKIE_NAME)
    return {"status": "logged out"}

@app.get("/api/auth/me")
async def me(user: dict = Depends(auth.require_user)):
    return user

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    visibility: str = Form("private"),
    user: dict = Depends(auth.require_user),
):
    file_bytes = await file.read()
    size_bytes = len(file_bytes)

    try:
        document_id, file_path = storage.save_file(
            file_bytes, file.filename, user["id"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    storage.create_document_record(
        document_id, file.filename, user["id"],
        visibility, file_path, size_bytes
    )
    database.log_action(user["id"], "upload", file.filename)

    try:
        chunk_count = await ingest.ingest_document(
            file_path, file.filename, document_id,
            user["id"], visibility,
        )
        storage.mark_document_ready(document_id, chunk_count)
        return{
            "document_id" : document_id,
            "filename" : file.filename,
            "chunks_indexed" : chunk_count,
            "status" : "ready",
        }
    except Exception as e:
        storage.mark_document_failed(document_id, str(e))
        raise HTTPException(status_code=422, detail=f"Ingestion failed: {str(e)}")
    
@app.get("/api/documents")
async def list_documents(user: dict = Depends(auth.require_user)):
    docs = storage.get_user_documents(user["id"])
    return docs

@app.delete("/api/documents/{document_id}")
async def delete_document(
    document_id: str,
    user: dict = Depends(auth.require_user),
):
    try:
        file_path = storage.delete_document_record(document_id, user["id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    
    if os.path.exists(file_path):
        shutil.rmtree(os.path.dirname(file_path), ignore_errors=True)

    try:
        ingest.collection.delete(where={"document_id": document_id})
    except Exception:
        pass

    database.log_action(user["id"], "delete", document_id)
    return {"status": "deleted"}

@app.get("/api/documents/{document_id}")
async def get_document(
    document_id: str,
    user: dict = Depends(auth.require_user),
):
    docs = storage.get_user_documents(user["id"])
    doc = next((d for d in docs if d["id"] == document_id), None)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

from pydantic import BaseModel

class ChatRequest(BaseModel):
    question : str

@app.post("/api/chat")
async def chat(
    payload: ChatRequest,
    user: dict = Depends(auth.require_user),
):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    database.log_action(user["id"], "chat_query", payload.question[:100])
    result = await query.answer_question(
        question=payload.question,
        user_id=user["id"],
    )
    return result

@app.get("/api/chat/hostory")
async def chat_history(user: dict = Depends(auth.require_user)):
    """
    Returns the last 20 queries this user made from audit log.
    Useful for the frontend to show recent questions.
    """
    import contextlib
    with contextlib.closing(database.get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT detail, timestamp FROM audit_log
            WHERE user_id = ? AND action = 'chat_query'
            ORDER BY timestamp DESC
            LIMIT 20
            """,
            (user["id"],),
        ).fetchall()
        return [{"question" : r["detail"], "timestamp" : r["timestamp"]} for r in rows]