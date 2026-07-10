import bcrypt
import secrets
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
import contextlib
import config
import database 

def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), password_hash.encode())

def create_user(username: str, plain_password: str, is_admin: bool = False) -> int:
    with contextlib.closing(database.get_connection()) as conn:
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?,?,?,?)",
            (username, hash_password(plain_password), int(is_admin), datetime.utcnow().isoformat()),
        )
        conn.commit()
        return cursor.lastrowid

def authenticate(username: str, plain_password: str) -> dict:
    with contextlib.closing(database.get_connection()) as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()

        if user is None:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        if user["locked_until"]:
            locked_until = datetime.fromisoformat(user["locked_until"])
            if datetime.utcnow()<locked_until:
                minutes_left = int((locked_until-datetime.utcnow()).total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=429,
                    detail = f"Account locked. Try again in {minutes_left} minute(s).",
                )
        if not verify_password(plain_password, user["password_hash"]):
            new_attempts = user["failed_login_attempts"] + 1
            locked_until = None
            if new_attempts >= config.MAX_FAILED_LOGIN_ATTEMPTS:
                locked_until = (
                    datetime.utcnow() + timedelta(minutes=config.LOGIN_LOCKOUT_MINUTES)
                ).isoformat()
            conn.execute(
                "UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
                (new_attempts, locked_until, user["id"]),
            )
            conn.commit()
            database.log_action(user["id"], "login_failed", f"attempt {new_attempts}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        conn.execute(
            "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
            (user["id"],),
        )
        conn.commit()
        database.log_action(user["id"], "login_success")
        return{
            "id": user["id"], 
            "username": user["username"], 
            "is_admin": bool(user["is_admin"])
        }

def create_session(user_id: int) -> str:
    session_id = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires = now + timedelta(hours=config.SESSION_LIFETIME_HOURS)
    with contextlib.closing(database.get_connection()) as conn:
        conn.execute(
            "INSERT INTO sessions (session_id, user_id, created_at, expires_at) VALUES (?,?,?,?)",
            (session_id, user_id, now.isoformat(), expires.isoformat()),
        )
        conn.commit()
    return session_id

def get_user_from_session(session_id: str):
    with contextlib.closing(database.get_connection()) as conn:
        row = conn.execute(
            """
            SELECT u.id, u.username, u.is_admin, s.expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.session_id = ?
            """,
            (session_id,),
        ).fetchone()

        if row is None:
            return None

        if datetime.utcnow() > datetime.fromisoformat(row["expires_at"]):
            conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
            conn.commit()
            return None
        return {"id": row["id"], "username": row["username"], "is_admin": bool(row["is_admin"])}
    
def delete_session(session_id: str):
    with contextlib.closing(database.get_connection()) as conn:
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()

def require_user(request: Request) -> dict:
    session_id = request.cookies.get(config.SESSION_COOKIE_NAME)
    if not session_id:
        raise HTTPException(status_code=401, detail="Not Logged in")
    user = get_user_from_session(session_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user
