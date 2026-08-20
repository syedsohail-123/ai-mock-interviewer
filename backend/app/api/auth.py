import hmac
import hashlib
import base64
import json
import time
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Response, Request, Header
from pydantic import BaseModel, EmailStr
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth Configuration & Token Management"])

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "fastapi-secure-auth-secret-key-2026")

def b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)

def generate_signed_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = b64_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_signed_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = b64_decode(signature_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(b64_decode(payload_b64).decode("utf-8"))
        if "exp" in payload and payload["exp"] < int(time.time()):
            return None
        return payload
    except Exception:
        return None

class EmailLoginRequest(BaseModel):
    email: EmailStr

@router.get("/config")
async def get_auth_config():
    """Provides public Supabase configuration to frontend clients."""
    return {
        "supabase_url": settings.SUPABASE_URL,
        "supabase_anon_key": settings.SUPABASE_ANON_KEY,
    }

@router.post("/login-email")
async def login_with_email(req: EmailLoginRequest, response: Response):
    """
    Direct Server Token Login (Alternate Auth Method):
    Generates a secure signed session token for the provided email and stores it in cookies.
    """
    email_clean = req.email.strip().lower()
    now = int(time.time())
    expires_in = 24 * 3600  # 24 hours (86,400 seconds)
    payload = {
        "email": email_clean,
        "iat": now,
        "exp": now + expires_in,
    }
    token = generate_signed_token(payload)

    # Set auth cookie for browser clients (expires in 24 hours)
    response.set_cookie(
        key="auth_token",
        value=token,
        max_age=expires_in,
        expires=expires_in,
        path="/",
        httponly=False,  # Allow JS access as needed
        samesite="lax",
    )

    return {
        "status": "success",
        "message": "Token generated and cookie stored successfully (expires in 24 hours)",
        "token": token,
        "email": email_clean,
        "expires_in": expires_in,
    }

@router.get("/me")
async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Validates the session token from cookie or Authorization header and returns user information.
    """
    token = request.cookies.get("auth_token")
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_signed_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "authenticated": True,
        "email": payload.get("email"),
    }

@router.post("/logout")
async def logout(response: Response):
    """Clears the auth_token cookie."""
    response.delete_cookie(key="auth_token", path="/")
    return {
        "status": "success",
        "message": "Logged out successfully",
    }
