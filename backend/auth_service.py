import os
import hmac
import hashlib
import base64
import json
import time
import secrets
from typing import Optional, Dict, Any

def hash_password(password: str) -> str:
    """Hashes a password with a cryptographically secure random salt using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100000)
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored salt$hex PBKDF2 hash."""
    try:
        if not plain_password or not hashed_password or "$" not in hashed_password:
            return False
        salt, expected_hex = hashed_password.split("$", 1)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), bytes.fromhex(salt), 100000)
        return secrets.compare_digest(key.hex(), expected_hex)
    except Exception:
        return False


class AuthService:
    def __init__(self):
        self._load_config()

    def _load_config(self):
        # Secret key for signing tokens
        self.secret_key = os.getenv("AUTH_SECRET_KEY", "").strip()
        if not self.secret_key:
            # Persistent key fallback based on DB url or static seed
            seed = os.getenv("DATABASE_URL", "guptchar_regulatory_secret_salt_2026")
            self.secret_key = hashlib.sha256(seed.encode("utf-8")).hexdigest()

        # Token expiry: 7 days in seconds
        self.token_expiry_sec = int(os.getenv("AUTH_TOKEN_EXPIRY_SEC", str(7 * 24 * 3600)))

    def _base64url_encode(self, data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

    def _base64url_decode(self, s: str) -> bytes:
        padding = "=" * (4 - (len(s) % 4)) if (len(s) % 4) != 0 else ""
        return base64.urlsafe_b64decode(s + padding)

    async def verify_credentials(self, username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticates an operator against the Neon PostgreSQL users table.
        Matches either username or email and validates password against PBKDF2 hash.
        """
        from .database import get_user_by_identity

        if not username_or_email or not password:
            return None

        user = await get_user_by_identity(username_or_email.strip())
        if not user:
            return None

        stored_hash = user.get("password", "")
        if not verify_password(password.strip(), stored_hash):
            return None

        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "name": user.get("username", "Operator"),
            "role": user.get("role", "ADMIN"),
            "access_level": "FULL_ACCESS",
            "permissions": ["all"]
        }

    def create_token(self, user_data: Dict[str, Any]) -> str:
        self._load_config()
        header = {"alg": "HS256", "typ": "JWT"}
        now = int(time.time())
        payload = {
            "sub": user_data.get("id", "usr_user"),
            "username": user_data.get("username", "operator"),
            "email": user_data.get("email", ""),
            "name": user_data.get("name", user_data.get("username", "Operator")),
            "role": user_data.get("role", "ADMIN"),
            "access_level": user_data.get("access_level", "FULL_ACCESS"),
            "iat": now,
            "exp": now + self.token_expiry_sec,
            "jti": secrets.token_hex(16)
        }

        encoded_header = self._base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        encoded_payload = self._base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")

        signature = hmac.new(self.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        encoded_signature = self._base64url_encode(signature)

        return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        self._load_config()
        if not token or not isinstance(token, str):
            return None

        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        encoded_header, encoded_payload, encoded_signature = parts

        try:
            signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
            expected_sig = hmac.new(self.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
            actual_sig = self._base64url_decode(encoded_signature)

            if not hmac.compare_digest(expected_sig, actual_sig):
                return None

            payload_bytes = self._base64url_decode(encoded_payload)
            payload = json.loads(payload_bytes.decode("utf-8"))

            # Check expiration
            if payload.get("exp", 0) < time.time():
                return None

            return payload
        except Exception:
            return None

auth_service = AuthService()
