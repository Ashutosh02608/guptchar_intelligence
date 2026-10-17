import os
import smtplib
import asyncio
import logging
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional, Dict, Any

logger = logging.getLogger("GuptcharSMTP")

class SMTPService:
    def __init__(self):
        self._load_config()

    def _load_config(self):
        self.host = os.getenv("SMTP_HOST", "").strip()
        port_raw = os.getenv("SMTP_PORT", "587").strip()
        try:
            self.port = int(port_raw) if port_raw else 587
        except ValueError:
            self.port = 587
            
        self.user = os.getenv("SMTP_USER", "").strip()
        self.password = os.getenv("SMTP_PASSWORD", "").strip()
        self.from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or self.user
        self.from_name = os.getenv("SMTP_FROM_NAME", "Guptchar Intelligence").strip()
        
        # TLS vs SSL detection
        use_ssl_env = os.getenv("SMTP_USE_SSL", "").strip().lower()
        if use_ssl_env in ("true", "1", "yes"):
            self.use_ssl = True
            self.use_tls = False
        else:
            self.use_ssl = (self.port == 465)
            self.use_tls = (self.port in (587, 25))

    def is_configured(self) -> bool:
        self._load_config()
        return bool(self.host and self.user and self.password)

    def get_status(self) -> Dict[str, Any]:
        self._load_config()
        configured = self.is_configured()
        masked_user = ""
        if self.user:
            parts = self.user.split("@")
            if len(parts) == 2:
                masked_user = f"{parts[0][:3]}***@{parts[1]}"
            else:
                masked_user = f"{self.user[:3]}***"

        return {
            "configured": configured,
            "host": self.host or "(not configured)",
            "port": self.port,
            "user": masked_user if configured else "(not configured)",
            "from_email": self.from_email or self.user or "(not configured)",
            "from_name": self.from_name,
            "security": "SSL (Port 465)" if self.use_ssl else ("STARTTLS (Port 587)" if self.use_tls else "Standard SMTP"),
            "mode": "LIVE SMTP DISPATCH ACTIVE" if configured else "MOCK / DRY-RUN SIMULATION (Add credentials in .env to send real emails)"
        }

    def _send_sync(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Tuple[bool, str]:
        self._load_config()
        if not self.is_configured():
            logger.warning(
                f"[SMTP Simulated] SMTP credentials not set in .env. Simulated sending to {to_email}. Subject: '{subject}'"
            )
            return True, f"SIMULATED: SMTP not configured in .env. Email marked as sent to {to_email}."

        sender_addr = from_email or self.from_email or self.user
        sender_label = from_name or self.from_name

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_label} <{sender_addr}>"
        msg["To"] = to_email

        # Generate plain text fallback by stripping HTML tags
        plain_text = re.sub(r'<[^>]+>', '', body_html)
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        try:
            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=15)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=15)
                if self.use_tls:
                    server.starttls()

            if self.user and self.password:
                server.login(self.user, self.password)

            server.sendmail(sender_addr, [to_email], msg.as_string())
            server.quit()
            logger.info(f"[SMTP Success] Dispatched email to {to_email} via {self.host}:{self.port}")
            return True, f"Successfully dispatched via SMTP to {to_email}"
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[SMTP Failure] Failed sending to {to_email}: {error_msg}", exc_info=True)
            return False, error_msg

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Non-blocking async wrapper around smtplib."""
        return await asyncio.to_thread(
            self._send_sync,
            to_email,
            subject,
            body_html,
            from_email,
            from_name
        )


smtp_service = SMTPService()
