import os
import uuid
import shutil
from datetime import datetime, timezone
import contextlib
import config
import database

ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "pptx", "txt", "png", "jpg", "jpeg", "csv"}

def validate_extension(filename: str):
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '.{ext}' is not supported. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    return ext

def save_file(file_bytes: bytes, filename: str, owner_id: int) -> tuple[str, str, str]:
    """
    Saves the uploaded file to disk under documents/{owner_id}/{document_id}/
    Returns (document_id, file_path, ext)
    """

    validate_extension(filename)

    document_id = str(uuid.uuid4())
    owner_dir = os.path.join(config.DOCUMENT_STORAGE_DIR, str(owner_id), document_id)
    os.makedirs(owner_dir, exist_ok=True)

    file_path = os.path.join(owner_dir, filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    return document_id, file_path

def create_document_record(
        document_id: str,
        filename: str,
        owner_id: int,
        visibility: str,
        file_path: str,
        size_bytes: int,
) -> None:
    with contextlib.closing(database.get_connection()) as conn:
        conn.execute(
            """
            INSERT INTO documents
            (id, filename, owner_id, visibility, file_path, size_bytes, status, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)
            """,
            (
                document_id, filename, owner_id, visibility,
                file_path, size_bytes,
                datetime.now(timezone.utc).isoformat(),
            ),
        ) 
        conn.commit()

def mark_document_ready(document_id: str, chunk_count: int):
    with contextlib.closing(database.get_connection()) as conn:
        conn.execute(
            "UPDATE documents SET status = 'ready', chunk_count = ? WHERE id = ?",
            (chunk_count, document_id),
        )
        conn.commit()

def mark_document_failed(document_id: str, reason: str):
    with contextlib.closing(database.get_connection()) as conn:
        conn.execute(
            "UPDATE documents SET status = 'failed' WHERE ID = ?",
            (document_id,),
        )
        conn.commit()

def get_user_documents(owner_id: int) -> list[dict]:
    with contextlib.closing(database.get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT d.*, u.username as owner_name
            FROM documents d
            JOIN users u ON u.id = d.owner_id
            WHERE (d.owner_id = ? OR d.visibility = 'shared')
            AND d.status = 'ready'
            ORDER BY d.uploaded_at DESC
            """,
            (owner_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    
def delete_document_record(document_id: str, owner_id: int) -> str:
    """
    Deletes the database record and returns the file path so the 
    caller can also delete the the file and chromaDB chunks.
    Only the owner can delete their own document.
    """

    with contextlib.closing(database.get_connection()) as conn:
        row = conn.execute(
            "SELECT file_path, owner_id FROM documents WHERE id = ?",
            (document_id,),
        ).fetchone()

        if row is None:
            raise ValueError("Document not found.")
        if row["owner_id"] != owner_id:
            raise PermissionError("You can only delete your own documents.")
        
        conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        conn.commit()
        return row["file_path"]