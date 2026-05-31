"""
============================================================================
 AUTH MODULE — JWT Authentication for Restify Admin API
 ============================================================================
 Provides:
   - JWT token generation and validation
   - Password verification with bcrypt
   - FastAPI dependency `require_admin` to protect admin-only routes
   - Login endpoint logic
============================================================================
"""

import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

# --- Configuration ---
# In production, use an environment variable for SECRET_KEY
SECRET_KEY = "restify-secret-key-change-in-production-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

DB_PATH = "restify.db"

# --- Password hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Bearer token extraction ---
bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    """Creates a new database connection."""
    conexao = sqlite3.connect(DB_PATH)
    conexao.row_factory = sqlite3.Row
    return conexao


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares a plain text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a signed JWT token.
    
    Args:
        data: Payload dictionary (must include 'sub' with the username)
        expires_delta: Custom expiration time. Defaults to ACCESS_TOKEN_EXPIRE_HOURS.
    
    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """
    Validates credentials against the AdminUsers table.
    
    Returns:
        User dict if valid, None otherwise.
    """
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id, username, hashed_password FROM AdminUsers WHERE username = ?", (username,))
    row = cursor.fetchone()
    conexao.close()

    if row is None:
        return None
    if not verify_password(password, row["hashed_password"]):
        return None

    return {"id": row["id"], "username": row["username"]}


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """
    FastAPI dependency that protects admin-only routes.
    
    Usage:
        @app.get("/api/admin/something", dependencies=[Depends(require_admin)])
        def admin_endpoint(): ...
    
    Raises:
        HTTPException 401 if token is missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: sem campo 'sub'",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify user still exists in DB
    conexao = get_db()
    cursor = conexao.cursor()
    cursor.execute("SELECT id FROM AdminUsers WHERE username = ?", (username,))
    user = cursor.fetchone()
    conexao.close()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"username": username, "id": user["id"]}
