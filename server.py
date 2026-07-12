#!/usr/bin/env python3
from __future__ import annotations

import base64
import errno
import hashlib
import hmac
import ipaddress
import json
import mimetypes
import os
import re
import secrets
import signal
import sqlite3
import struct
import sys
import threading
import time
import traceback
import urllib.parse
from contextlib import contextmanager
from dataclasses import dataclass, field
from email.utils import formatdate
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
APP_VERSION = "2.1.0"
DB_PATH = Path(os.environ.get("MIELCORD_DB", ROOT / "mielcord.db")).resolve()
CONFIG_PATH = Path(os.environ.get("MIELCORD_CONFIG", ROOT / "mielcord_config.json")).resolve()
HOST = os.environ.get("MIELCORD_HOST", "0.0.0.0")
PORT = int(os.environ.get("MIELCORD_PORT", "8080"))
SESSION_COOKIE = "mielcord_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
MAX_SESSIONS_PER_USER = 5
MAX_JSON_BYTES = 80_000_000
MAX_MESSAGE_CHARS = 4_000
MAX_IMAGE_DATA_BYTES = 2_000_000
MAX_FILE_DATA_BYTES = 50_000_000
IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
ZIP_MIME_TYPES = {"application/zip", "application/x-zip-compressed", "multipart/x-zip"}
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{3,32}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

PERMISSIONS = [
    "administrator",
    "manage_guild",
    "manage_channels",
    "manage_roles",
    "manage_messages",
    "kick_members",
    "ban_members",
    "mute_members",
    "create_invite",
    "view_channels",
    "send_messages",
    "read_message_history",
    "connect",
    "speak",
    "stream",
]

MEMBER_PERMISSIONS = [
    "view_channels",
    "send_messages",
    "read_message_history",
    "connect",
    "speak",
    "stream",
    "create_invite",
]

AVATAR_COLORS = [
    "#d99a23",
    "#2a9d8f",
    "#c44569",
    "#6c5ce7",
    "#00a8cc",
    "#f25f5c",
    "#5c946e",
    "#8d6e63",
]

DEFAULT_CONFIG = {
    "guild_name": "Mielcord Central",
    "guild_description": "The shared community server on this Mielcord host.",
    "admin_usernames": ["admin"],
    "registration_enabled": True,
    "private_mode_enabled": False,
    "private_mode_password": "",
    "country_restriction_enabled": False,
    "allowed_country_codes": ["CA"],
    "country_restriction_allow_private": True,
    "country_headers": ["CF-IPCountry", "X-Country-Code", "X-AppEngine-Country", "X-Vercel-IP-Country"],
    "rtc_ice_servers": [
        {"urls": ["stun:stun.l.google.com:19302"]},
    ],
    "rate_limits": {
        "register_per_ip": {"limit": 5, "window_seconds": 600},
        "login_per_ip": {"limit": 30, "window_seconds": 300},
        "login_per_account": {"limit": 8, "window_seconds": 300},
        "message_per_user": {"limit": 12, "window_seconds": 8},
    },
}


class AppConfig:
    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.RLock()
        self.data: dict[str, Any] = {}
        self.mtime = 0.0
        self.load(force=True)

    def load(self, force: bool = False) -> None:
        with self.lock:
            if not self.path.exists():
                self.path.write_text(json.dumps(DEFAULT_CONFIG, indent=2) + "\n")
            mtime = self.path.stat().st_mtime
            if not force and mtime == self.mtime:
                return
            try:
                loaded = json.loads(self.path.read_text())
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid config JSON in {self.path}: {exc}") from exc
            if not isinstance(loaded, dict):
                loaded = {}
            merged = json.loads(json.dumps(DEFAULT_CONFIG))
            for key, value in loaded.items():
                if key == "rate_limits" and isinstance(value, dict):
                    merged[key].update(value)
                else:
                    merged[key] = value
            self.data = merged
            self.mtime = mtime

    def get(self, key: str, default: Any = None) -> Any:
        self.load()
        return self.data.get(key, default)

    def admin_usernames_lc(self) -> set[str]:
        values = self.get("admin_usernames", [])
        raw: list[str]
        if isinstance(values, str):
            raw = re.split(r"[\s,;]+", values)
        elif isinstance(values, list):
            raw = []
            for value in values:
                raw.extend(re.split(r"[\s,;]+", str(value)))
        else:
            raw = []
        return {value.strip().lower() for value in raw if value.strip()}

    def is_admin_username(self, username: str) -> bool:
        return str(username or "").strip().lower() in self.admin_usernames_lc()

    def guild_name(self) -> str:
        return clean_name(self.get("guild_name"), "Mielcord Central", 80)

    def guild_description(self) -> str:
        return clean_name(self.get("guild_description"), "", 240)

    def registration_enabled(self) -> bool:
        return bool(self.get("registration_enabled", True))

    def private_mode_enabled(self) -> bool:
        return bool(self.get("private_mode_enabled", False))

    def private_mode_password(self) -> str:
        return str(self.get("private_mode_password", "") or "")

    def country_restriction_enabled(self) -> bool:
        return bool(self.get("country_restriction_enabled", False))

    def country_restriction_allow_private(self) -> bool:
        return bool(self.get("country_restriction_allow_private", True))

    def allowed_country_codes(self) -> set[str]:
        values = self.get("allowed_country_codes", [])
        if isinstance(values, str):
            raw = re.split(r"[\s,;]+", values)
        elif isinstance(values, list):
            raw = [str(value) for value in values]
        else:
            raw = []
        return {re.sub(r"[^A-Z]", "", value.strip().upper())[:2] for value in raw if value.strip()}

    def country_headers(self) -> list[str]:
        values = self.get("country_headers", DEFAULT_CONFIG["country_headers"])
        if isinstance(values, str):
            raw = re.split(r"[\s,;]+", values)
        elif isinstance(values, list):
            raw = [str(value) for value in values]
        else:
            raw = []
        headers = [value.strip() for value in raw if value.strip()]
        return headers or list(DEFAULT_CONFIG["country_headers"])

    def rtc_ice_servers(self) -> list[dict[str, Any]]:
        values = self.get("rtc_ice_servers", DEFAULT_CONFIG["rtc_ice_servers"])
        if not isinstance(values, list):
            values = DEFAULT_CONFIG["rtc_ice_servers"]
        servers: list[dict[str, Any]] = []
        for value in values[:8]:
            if not isinstance(value, dict):
                continue
            raw_urls = value.get("urls", [])
            if isinstance(raw_urls, str):
                raw_urls = [raw_urls]
            if not isinstance(raw_urls, list):
                continue
            urls = [
                str(url).strip()
                for url in raw_urls[:8]
                if re.match(r"^(stun|stuns|turn|turns):", str(url).strip(), re.IGNORECASE)
            ]
            if not urls:
                continue
            server: dict[str, Any] = {"urls": urls}
            if value.get("username") is not None:
                server["username"] = str(value.get("username") or "")[:256]
            if value.get("credential") is not None:
                server["credential"] = str(value.get("credential") or "")[:512]
            servers.append(server)
        return servers or json.loads(json.dumps(DEFAULT_CONFIG["rtc_ice_servers"]))

    def rate_limit(self, name: str) -> tuple[int, int]:
        limits = self.get("rate_limits", {})
        item = limits.get(name, {}) if isinstance(limits, dict) else {}
        limit = int(item.get("limit", DEFAULT_CONFIG["rate_limits"][name]["limit"]))
        window = int(item.get("window_seconds", DEFAULT_CONFIG["rate_limits"][name]["window_seconds"]))
        return max(1, limit), max(1, window)


class RateLimiter:
    def __init__(self):
        self.lock = threading.RLock()
        self.hits: dict[str, list[float]] = {}

    def check(self, key: str, limit: int, window_seconds: int, message: str) -> None:
        current = time.monotonic()
        cutoff = current - window_seconds
        with self.lock:
            values = [stamp for stamp in self.hits.get(key, []) if stamp > cutoff]
            if len(values) >= limit:
                retry_after = max(1, int(values[0] + window_seconds - current))
                raise APIError(429, f"{message} Try again in {retry_after} seconds.")
            values.append(current)
            self.hits[key] = values



class APIError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def now() -> int:
    return int(time.time())


def bounded_int(value: Any, minimum: int, maximum: int, fallback: int = 0) -> int:
    try:
        parsed = int(float(value))
    except (TypeError, ValueError, OverflowError):
        return fallback
    return max(minimum, min(maximum, parsed))


def clean_email(value: Any) -> str:
    return str(value or "").strip().lower()[:254]


def gravatar_url(email_lc: str | None, size: int = 512) -> str:
    email_lc = str(email_lc or "").strip().lower()
    if not email_lc:
        return ""
    digest = hashlib.md5(email_lc.encode("utf-8")).hexdigest()
    return f"https://www.gravatar.com/avatar/{digest}?d=identicon&s={size}"


def is_mobile_user_agent(user_agent: str | None) -> bool:
    text = str(user_agent or "").lower()
    markers = ("android", "iphone", "ipad", "ipod", "mobile", "windows phone")
    return any(marker in text for marker in markers)


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def json_text(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=True)


def parse_permissions(raw: str | None) -> set[str]:
    if not raw:
        return set()
    try:
        values = json.loads(raw)
    except json.JSONDecodeError:
        return set()
    return {value for value in values if value in PERMISSIONS}


def clean_name(value: Any, fallback: str = "untitled", max_len: int = 80) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    if not text:
        text = fallback
    return text[:max_len]


def clean_channel_name(value: Any) -> str:
    text = str(value or "").lower().strip()
    text = re.sub(r"[^a-z0-9_-]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-_")
    return (text or "channel")[:48]


def password_hash(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 240_000)
    return salt.hex(), digest.hex()


def session_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "username": row["username"],
        "display_name": row["display_name"],
        "avatar_color": row["avatar_color"],
        "avatar_url": gravatar_url(row.get("email_lc", "")),
        "created_at": row["created_at"],
        "last_seen_at": row.get("last_seen_at"),
    }


class Database:
    def __init__(self, path: Path, config: AppConfig):
        self.path = path
        self.config = config
        self.lock = threading.RLock()

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @contextmanager
    def transaction(self):
        with self.lock:
            conn = self.connect()
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    def init(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.transaction() as conn:
            conn.execute("PRAGMA journal_mode = WAL")
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    username_lc TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL DEFAULT '',
                    email_lc TEXT NOT NULL DEFAULT '',
                    display_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    avatar_color TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    last_seen_at INTEGER,
                    disabled INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS guilds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    icon_color TEXT NOT NULL,
                    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS members (
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    nickname TEXT,
                    joined_at INTEGER NOT NULL,
                    muted INTEGER NOT NULL DEFAULT 0,
                    deafened INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (guild_id, user_id)
                );

                CREATE TABLE IF NOT EXISTS roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    color TEXT NOT NULL DEFAULT '#d99a23',
                    permissions TEXT NOT NULL,
                    position INTEGER NOT NULL DEFAULT 0,
                    is_everyone INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS member_roles (
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    PRIMARY KEY (guild_id, user_id, role_id)
                );

                CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('text', 'voice')),
                    topic TEXT NOT NULL DEFAULT '',
                    position INTEGER NOT NULL DEFAULT 0,
                    slowmode_seconds INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    image_name TEXT NOT NULL DEFAULT '',
                    image_mime TEXT NOT NULL DEFAULT '',
                    image_data TEXT NOT NULL DEFAULT '',
                    file_name TEXT NOT NULL DEFAULT '',
                    file_mime TEXT NOT NULL DEFAULT '',
                    file_data TEXT NOT NULL DEFAULT '',
                    file_size INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    edited_at INTEGER,
                    deleted_at INTEGER,
                    reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS invites (
                    code TEXT PRIMARY KEY,
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
                    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER,
                    max_uses INTEGER,
                    uses INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS bans (
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    banned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    reason TEXT NOT NULL DEFAULT '',
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER,
                    PRIMARY KEY (guild_id, user_id)
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id INTEGER NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
                    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    action TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    details TEXT NOT NULL DEFAULT '{}',
                    created_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
                CREATE INDEX IF NOT EXISTS idx_channels_guild ON channels(guild_id, position);
                CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, id DESC);
                CREATE INDEX IF NOT EXISTS idx_audit_guild ON audit_logs(guild_id, id DESC);
                """
            )
            self._migrate_tx(conn)
            self._sync_all_config_admins_tx(conn)

    def _migrate_tx(self, conn: sqlite3.Connection) -> None:
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "email" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
        if "email_lc" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN email_lc TEXT NOT NULL DEFAULT ''")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lc ON users(email_lc) WHERE email_lc != ''")
        message_columns = {row["name"] for row in conn.execute("PRAGMA table_info(messages)").fetchall()}
        if "image_name" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN image_name TEXT NOT NULL DEFAULT ''")
        if "image_mime" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN image_mime TEXT NOT NULL DEFAULT ''")
        if "image_data" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN image_data TEXT NOT NULL DEFAULT ''")
        if "file_name" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN file_name TEXT NOT NULL DEFAULT ''")
        if "file_mime" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN file_mime TEXT NOT NULL DEFAULT ''")
        if "file_data" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN file_data TEXT NOT NULL DEFAULT ''")
        if "file_size" not in message_columns:
            conn.execute("ALTER TABLE messages ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0")
        ban_columns = {row["name"] for row in conn.execute("PRAGMA table_info(bans)").fetchall()}
        if "expires_at" not in ban_columns:
            conn.execute("ALTER TABLE bans ADD COLUMN expires_at INTEGER")

    def user_count(self) -> int:
        with self.transaction() as conn:
            return int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])

    def create_user(self, username: str, password: str, email: str = "") -> dict[str, Any]:
        if not self.config.registration_enabled():
            raise APIError(403, "Account creation is disabled on this Mielcord host.")
        username = str(username or "").strip()
        email = clean_email(email)
        if not USERNAME_RE.match(username):
            raise APIError(400, "Usernames must be 3-32 characters: letters, numbers, dot, dash, underscore.")
        if not EMAIL_RE.match(email):
            raise APIError(400, "A valid email address is required for account creation.")
        if len(str(password or "")) < 8:
            raise APIError(400, "Passwords must be at least 8 characters.")

        salt, digest = password_hash(password)
        created = now()
        avatar_color = AVATAR_COLORS[secrets.randbelow(len(AVATAR_COLORS))]

        with self.transaction() as conn:
            if conn.execute("SELECT 1 FROM users WHERE username_lc = ?", (username.lower(),)).fetchone():
                raise APIError(409, "That username is already taken.")
            if conn.execute("SELECT 1 FROM users WHERE email_lc = ? AND email_lc != ''", (email,)).fetchone():
                raise APIError(409, "That email address is already registered.")
            cur = conn.execute(
                """
                INSERT INTO users (username, username_lc, email, email_lc, display_name, password_hash, salt, avatar_color, created_at, last_seen_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (username, username.lower(), email, email, username, digest, salt, avatar_color, created, created),
            )
            user_id = int(cur.lastrowid)
            guild_id = self._ensure_main_guild_for_user_tx(conn, user_id, actor_id=user_id)
            self._sync_config_admins_tx(conn, guild_id)

        user = self.get_user(user_id)
        if not user:
            raise APIError(500, "User creation failed.")
        return user

    def authenticate(self, username: str, password: str) -> dict[str, Any]:
        with self.transaction() as conn:
            identifier = str(username or "").strip().lower()
            row = conn.execute(
                "SELECT * FROM users WHERE (username_lc = ? OR email_lc = ?) AND disabled = 0",
                (identifier, identifier),
            ).fetchone()
            if row is None:
                raise APIError(401, "Invalid username or password.")
            salt = row["salt"]
            _, digest = password_hash(str(password or ""), salt)
            if not hmac.compare_digest(digest, row["password_hash"]):
                raise APIError(401, "Invalid username or password.")
            stamp = now()
            conn.execute("UPDATE users SET last_seen_at = ? WHERE id = ?", (stamp, row["id"]))
            if self.config.is_admin_username(row["username"]):
                guild_id = self._ensure_main_guild_for_user_tx(conn, int(row["id"]), actor_id=int(row["id"]))
                self._sync_config_admins_tx(conn, guild_id)
            return public_user(row_dict(row) | {"last_seen_at": stamp})

    def get_user(self, user_id: int) -> dict[str, Any] | None:
        with self.transaction() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ? AND disabled = 0", (user_id,)).fetchone()
            return public_user(row_dict(row)) if row else None

    def private_user(self, user_id: int) -> dict[str, Any] | None:
        with self.transaction() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ? AND disabled = 0", (user_id,)).fetchone()
            if row is None:
                return None
            data = public_user(row_dict(row))
            data["email"] = row["email"]
            return data

    def update_profile(self, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        email = clean_email(payload.get("email"))
        display_name = clean_name(payload.get("display_name"), "", 40) if payload.get("display_name") else ""
        if email and not EMAIL_RE.match(email):
            raise APIError(400, "A valid email address is required.")
        with self.transaction() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ? AND disabled = 0", (user_id,)).fetchone()
            if row is None:
                raise APIError(404, "User not found.")
            new_email = email or row["email_lc"]
            if new_email:
                existing = conn.execute(
                    "SELECT id FROM users WHERE email_lc = ? AND id != ? AND email_lc != ''",
                    (new_email, user_id),
                ).fetchone()
                if existing:
                    raise APIError(409, "That email address is already registered.")
            new_display = display_name or row["display_name"]
            conn.execute(
                "UPDATE users SET email = ?, email_lc = ?, display_name = ? WHERE id = ?",
                (new_email, new_email, new_display, user_id),
            )
            updated = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return public_user(row_dict(updated)) | {"email": updated["email"]}

    def create_session(self, user_id: int) -> str:
        token = secrets.token_urlsafe(40)
        stamp = now()
        with self.transaction() as conn:
            conn.execute("DELETE FROM sessions WHERE expires_at < ?", (stamp,))
            conn.execute(
                "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (session_hash(token), user_id, stamp, stamp + SESSION_TTL_SECONDS),
            )
            conn.execute(
                """
                DELETE FROM sessions
                WHERE token_hash IN (
                    SELECT token_hash FROM sessions
                    WHERE user_id = ?
                    ORDER BY created_at DESC, rowid DESC
                    LIMIT -1 OFFSET ?
                )
                """,
                (user_id, MAX_SESSIONS_PER_USER),
            )
        return token

    def delete_session(self, token: str) -> None:
        if not token:
            return
        with self.transaction() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (session_hash(token),))

    def user_for_session(self, token: str | None) -> dict[str, Any] | None:
        if not token:
            return None
        stamp = now()
        with self.transaction() as conn:
            row = conn.execute(
                """
                SELECT users.* FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.disabled = 0
                """,
                (session_hash(token), stamp),
            ).fetchone()
            if row is None:
                return None
            conn.execute("UPDATE users SET last_seen_at = ? WHERE id = ?", (stamp, row["id"]))
            if self.config.is_admin_username(row["username"]):
                guild_id = self._ensure_main_guild_for_user_tx(conn, int(row["id"]), actor_id=int(row["id"]))
                self._sync_config_admins_tx(conn, guild_id)
            return public_user(row_dict(row) | {"last_seen_at": stamp})

    def list_guilds(self, user_id: int) -> list[dict[str, Any]]:
        with self.transaction() as conn:
            guild_id = self._main_guild_id_tx(conn)
            if guild_id is None:
                return []
            self._sync_config_admins_tx(conn, guild_id)
            rows = conn.execute(
                """
                SELECT guilds.*,
                    (SELECT id FROM channels WHERE guild_id = guilds.id AND type = 'text' ORDER BY position, id LIMIT 1) AS default_channel_id
                FROM guilds
                JOIN members ON members.guild_id = guilds.id
                WHERE members.user_id = ? AND guilds.id = ?
                ORDER BY guilds.id
                """,
                (user_id, guild_id),
            ).fetchall()
            return [dict(row) for row in rows]

    def create_guild(self, user_id: int, name: str, description: str = "") -> dict[str, Any]:
        raise APIError(403, "This Mielcord host uses one shared guild. Edit mielcord_config.json for global server settings.")

    def _main_guild_id_tx(self, conn: sqlite3.Connection) -> int | None:
        row = conn.execute("SELECT id FROM guilds ORDER BY id LIMIT 1").fetchone()
        return int(row["id"]) if row else None

    def _require_main_guild_tx(self, conn: sqlite3.Connection, guild_id: int) -> None:
        main_guild_id = self._main_guild_id_tx(conn)
        if main_guild_id is None or int(guild_id) != main_guild_id:
            raise APIError(404, "Guild not found on this single-guild Mielcord host.")

    def _active_ban_tx(self, conn: sqlite3.Connection, guild_id: int, user_id: int) -> sqlite3.Row | None:
        ban = conn.execute("SELECT * FROM bans WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)).fetchone()
        if ban and ban["expires_at"] and int(ban["expires_at"]) <= now():
            conn.execute("DELETE FROM bans WHERE guild_id = ? AND user_id = ?", (guild_id, user_id))
            return None
        return ban

    def _ensure_main_guild_for_user_tx(self, conn: sqlite3.Connection, user_id: int, actor_id: int | None = None) -> int:
        guild_id = self._main_guild_id_tx(conn)
        if guild_id is None:
            guild_id = self._create_guild_tx(
                conn,
                owner_id=user_id,
                name=self.config.guild_name(),
                description=self.config.guild_description(),
                actor_id=actor_id or user_id,
            )
        banned = self._active_ban_tx(conn, guild_id, user_id)
        if banned:
            raise APIError(403, "This account is banned from the guild.")
        conn.execute(
            "INSERT OR IGNORE INTO members (guild_id, user_id, joined_at) VALUES (?, ?, ?)",
            (guild_id, user_id, now()),
        )
        return guild_id

    def _sync_all_config_admins_tx(self, conn: sqlite3.Connection) -> None:
        guild_id = self._main_guild_id_tx(conn)
        if guild_id is not None:
            self._sync_config_admins_tx(conn, guild_id)

    def _sync_config_admins_tx(self, conn: sqlite3.Connection, guild_id: int) -> None:
        self._require_main_guild_tx(conn, guild_id)
        admin_role = conn.execute(
            "SELECT id FROM roles WHERE guild_id = ? AND name = 'Admin' ORDER BY id LIMIT 1",
            (guild_id,),
        ).fetchone()
        if admin_role is None:
            role_id = int(conn.execute(
                """
                INSERT INTO roles (guild_id, name, color, permissions, position, is_everyone)
                VALUES (?, 'Admin', '#d99a23', ?, 100, 0)
                """,
                (guild_id, json_text(PERMISSIONS)),
            ).lastrowid)
        else:
            role_id = int(admin_role["id"])
            conn.execute(
                "UPDATE roles SET permissions = ?, position = 100 WHERE id = ?",
                (json_text(PERMISSIONS), role_id),
            )
        conn.execute("DELETE FROM member_roles WHERE guild_id = ? AND role_id = ?", (guild_id, role_id))
        admin_names = sorted(self.config.admin_usernames_lc())
        if not admin_names:
            return
        placeholders = ",".join("?" for _ in admin_names)
        rows = conn.execute(
            f"SELECT id FROM users WHERE disabled = 0 AND username_lc IN ({placeholders})",
            admin_names,
        ).fetchall()
        for row in rows:
            admin_user_id = int(row["id"])
            conn.execute("DELETE FROM bans WHERE guild_id = ? AND user_id = ?", (guild_id, admin_user_id))
            conn.execute(
                "INSERT OR IGNORE INTO members (guild_id, user_id, joined_at) VALUES (?, ?, ?)",
                (guild_id, admin_user_id, now()),
            )
            conn.execute(
                "INSERT OR IGNORE INTO member_roles (guild_id, user_id, role_id) VALUES (?, ?, ?)",
                (guild_id, admin_user_id, role_id),
            )

    def _is_config_admin_user_id_tx(self, conn: sqlite3.Connection, user_id: int) -> bool:
        row = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
        return bool(row and self.config.is_admin_username(row["username"]))

    def _create_guild_tx(
        self,
        conn: sqlite3.Connection,
        owner_id: int,
        name: str,
        description: str,
        actor_id: int,
    ) -> int:
        stamp = now()
        guild_color = AVATAR_COLORS[secrets.randbelow(len(AVATAR_COLORS))]
        cur = conn.execute(
            "INSERT INTO guilds (name, description, icon_color, owner_id, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, description, guild_color, owner_id, stamp),
        )
        guild_id = int(cur.lastrowid)
        conn.execute(
            "INSERT INTO members (guild_id, user_id, joined_at) VALUES (?, ?, ?)",
            (guild_id, owner_id, stamp),
        )
        everyone = conn.execute(
            """
            INSERT INTO roles (guild_id, name, color, permissions, position, is_everyone)
            VALUES (?, '@everyone', '#8b949e', ?, 0, 1)
            """,
            (guild_id, json_text(MEMBER_PERMISSIONS)),
        ).lastrowid
        admin = conn.execute(
            """
            INSERT INTO roles (guild_id, name, color, permissions, position, is_everyone)
            VALUES (?, 'Admin', '#d99a23', ?, 100, 0)
            """,
            (guild_id, json_text(PERMISSIONS)),
        ).lastrowid
        conn.execute(
            """
            INSERT INTO channels (guild_id, name, type, topic, position, created_at)
            VALUES (?, 'general', 'text', 'General conversation', 10, ?),
                   (?, 'announcements', 'text', 'Updates and admin notes', 20, ?),
                   (?, 'Lobby', 'voice', 'Default voice room', 30, ?)
            """,
            (guild_id, stamp, guild_id, stamp, guild_id, stamp),
        )
        self._audit_tx(
            conn,
            guild_id,
            actor_id,
            "guild.create",
            "guild",
            guild_id,
            {"name": name, "everyone_role": int(everyone), "admin_role": int(admin)},
        )
        return guild_id

    def guild_snapshot(self, guild_id: int, user_id: int) -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_main_guild_tx(conn, guild_id)
            self._membership_tx(conn, guild_id, user_id)
            self._sync_config_admins_tx(conn, guild_id)
            guild = conn.execute("SELECT * FROM guilds WHERE id = ?", (guild_id,)).fetchone()
            if guild is None:
                raise APIError(404, "Server not found.")
            channels = [dict(row) for row in conn.execute(
                "SELECT * FROM channels WHERE guild_id = ? ORDER BY position, id", (guild_id,)
            ).fetchall()]
            roles = [self._role_public(row) for row in conn.execute(
                "SELECT * FROM roles WHERE guild_id = ? ORDER BY position DESC, id", (guild_id,)
            ).fetchall()]
            member_rows = conn.execute(
                """
                SELECT users.id AS user_id, users.username, users.display_name, users.avatar_color, users.email_lc, users.created_at,
                       users.last_seen_at, members.nickname, members.joined_at, members.muted, members.deafened
                FROM members
                JOIN users ON users.id = members.user_id
                WHERE members.guild_id = ?
                ORDER BY lower(COALESCE(members.nickname, users.display_name, users.username))
                """,
                (guild_id,),
            ).fetchall()
            role_rows = conn.execute(
                "SELECT user_id, role_id FROM member_roles WHERE guild_id = ?",
                (guild_id,),
            ).fetchall()
            role_map: dict[int, list[int]] = {}
            for row in role_rows:
                role_map.setdefault(int(row["user_id"]), []).append(int(row["role_id"]))
            members = []
            for row in member_rows:
                item = dict(row)
                item["avatar_url"] = gravatar_url(item.pop("email_lc", ""))
                item["roles"] = role_map.get(int(row["user_id"]), [])
                members.append(item)
            permissions = sorted(self._permissions_tx(conn, guild_id, user_id))
            return {
                "guild": dict(guild),
                "channels": channels,
                "roles": roles,
                "members": members,
                "permissions": permissions,
            }

    def update_guild(self, guild_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "manage_guild")
            name = clean_name(payload.get("name"), "Server", 80)
            description = clean_name(payload.get("description"), "", 240) if payload.get("description") else ""
            icon_color = str(payload.get("icon_color") or "").strip()[:24]
            if not re.match(r"^#[0-9a-fA-F]{6}$", icon_color):
                icon_color = "#d99a23"
            conn.execute(
                "UPDATE guilds SET name = ?, description = ?, icon_color = ? WHERE id = ?",
                (name, description, icon_color, guild_id),
            )
            self._audit_tx(conn, guild_id, user_id, "guild.update", "guild", guild_id, {"name": name})
        return self.guild_snapshot(guild_id, user_id)

    def create_channel(self, guild_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        channel_type = payload.get("type")
        if channel_type not in {"text", "voice"}:
            raise APIError(400, "Channel type must be text or voice.")
        name = clean_channel_name(payload.get("name")) if channel_type == "text" else clean_name(payload.get("name"), "Voice", 48)
        topic = clean_name(payload.get("topic"), "", 180) if payload.get("topic") else ""
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "manage_channels")
            position = int(conn.execute(
                "SELECT COALESCE(MAX(position), 0) + 10 FROM channels WHERE guild_id = ?",
                (guild_id,),
            ).fetchone()[0])
            cur = conn.execute(
                "INSERT INTO channels (guild_id, name, type, topic, position, slowmode_seconds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (guild_id, name, channel_type, topic, position, int(payload.get("slowmode_seconds") or 0), now()),
            )
            channel = dict(conn.execute("SELECT * FROM channels WHERE id = ?", (int(cur.lastrowid),)).fetchone())
            self._audit_tx(conn, guild_id, user_id, "channel.create", "channel", channel["id"], channel)
            return channel

    def update_channel(self, channel_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        with self.transaction() as conn:
            channel = conn.execute("SELECT * FROM channels WHERE id = ?", (channel_id,)).fetchone()
            if channel is None:
                raise APIError(404, "Channel not found.")
            guild_id = int(channel["guild_id"])
            self._require_perm_tx(conn, guild_id, user_id, "manage_channels")
            name = clean_channel_name(payload.get("name")) if channel["type"] == "text" else clean_name(payload.get("name"), "Voice", 48)
            topic = clean_name(payload.get("topic"), "", 180) if payload.get("topic") else ""
            slowmode = max(0, min(3600, int(payload.get("slowmode_seconds") or 0)))
            position = int(payload.get("position") if payload.get("position") is not None else channel["position"])
            conn.execute(
                "UPDATE channels SET name = ?, topic = ?, slowmode_seconds = ?, position = ? WHERE id = ?",
                (name, topic, slowmode, position, channel_id),
            )
            updated = dict(conn.execute("SELECT * FROM channels WHERE id = ?", (channel_id,)).fetchone())
            self._audit_tx(conn, guild_id, user_id, "channel.update", "channel", channel_id, updated)
            return updated

    def delete_channel(self, channel_id: int, user_id: int) -> dict[str, Any]:
        with self.transaction() as conn:
            channel = conn.execute("SELECT * FROM channels WHERE id = ?", (channel_id,)).fetchone()
            if channel is None:
                raise APIError(404, "Channel not found.")
            guild_id = int(channel["guild_id"])
            self._require_perm_tx(conn, guild_id, user_id, "manage_channels")
            count = conn.execute("SELECT COUNT(*) FROM channels WHERE guild_id = ? AND type = ?", (guild_id, channel["type"])).fetchone()[0]
            if int(count) <= 1 and channel["type"] == "text":
                raise APIError(400, "A server needs at least one text channel.")
            conn.execute("DELETE FROM channels WHERE id = ?", (channel_id,))
            self._audit_tx(conn, guild_id, user_id, "channel.delete", "channel", channel_id, dict(channel))
            return {"id": channel_id, "guild_id": guild_id}

    def _clean_image_payload(self, image: Any) -> tuple[str, str, str]:
        if not image:
            return "", "", ""
        if not isinstance(image, dict):
            raise APIError(400, "Image payload must be an object.")
        name = clean_name(image.get("name"), "image", 120)
        mime = str(image.get("mime") or "").strip().lower()
        data = str(image.get("data") or "")
        if mime not in IMAGE_MIME_TYPES:
            raise APIError(400, "Images must be PNG, JPEG, GIF, or WebP.")
        if not data:
            raise APIError(400, "Image data is missing.")
        try:
            raw = base64.b64decode(data, validate=True)
        except Exception as exc:
            raise APIError(400, "Image data must be base64 encoded.") from exc
        if len(raw) > MAX_IMAGE_DATA_BYTES:
            raise APIError(413, "Image is too large. Keep it under 2 MB.")
        return name, mime, data

    def _clean_file_payload(self, attachment: Any) -> tuple[str, str, str, int]:
        if not attachment:
            return "", "", "", 0
        if not isinstance(attachment, dict):
            raise APIError(400, "Attachment payload must be an object.")
        name = clean_name(attachment.get("name"), "attachment.zip", 180)
        mime = str(attachment.get("mime") or "").strip().lower()
        data = str(attachment.get("data") or "")
        is_zip = mime in ZIP_MIME_TYPES or name.lower().endswith(".zip")
        if not is_zip:
            raise APIError(400, "Only ZIP attachments are supported.")
        if not data:
            raise APIError(400, "Attachment data is missing.")
        try:
            raw = base64.b64decode(data, validate=True)
        except Exception as exc:
            raise APIError(400, "Attachment data must be base64 encoded.") from exc
        if len(raw) > MAX_FILE_DATA_BYTES:
            raise APIError(413, "ZIP file is too large. Keep it under 50 MB.")
        if not mime or mime == "application/octet-stream":
            mime = "application/zip"
        return name, mime, data, len(raw)

    def list_messages(self, channel_id: int, user_id: int, limit: int = 80, before: int | None = None) -> list[dict[str, Any]]:
        limit = max(1, min(200, int(limit or 80)))
        with self.transaction() as conn:
            channel = self._channel_tx(conn, channel_id)
            if channel["type"] != "text":
                raise APIError(400, "Messages belong to text channels.")
            self._require_perm_tx(conn, int(channel["guild_id"]), user_id, "read_message_history")
            params: list[Any] = [channel_id]
            where = "WHERE messages.channel_id = ?"
            if before:
                where += " AND messages.id < ?"
                params.append(int(before))
            rows = conn.execute(
                f"""
                SELECT messages.*, users.username, users.display_name, users.avatar_color, users.email_lc
                FROM messages
                JOIN users ON users.id = messages.user_id
                {where}
                ORDER BY messages.id DESC
                LIMIT ?
                """,
                (*params, limit),
            ).fetchall()
            messages = [self._message_public(row) for row in reversed(rows)]
            return messages

    def create_message(self, channel_id: int, user_id: int, content: str, reply_to: int | None = None, image: Any = None, attachment: Any = None) -> dict[str, Any]:
        content = str(content or "").strip()
        image_name, image_mime, image_data = self._clean_image_payload(image)
        file_name, file_mime, file_data, file_size = self._clean_file_payload(attachment)
        if not content and not image_data and not file_data:
            raise APIError(400, "Message cannot be empty.")
        if len(content) > MAX_MESSAGE_CHARS:
            raise APIError(400, f"Message is too long. Keep it under {MAX_MESSAGE_CHARS} characters.")
        with self.transaction() as conn:
            channel = self._channel_tx(conn, channel_id)
            if channel["type"] != "text":
                raise APIError(400, "Messages belong to text channels.")
            self._require_perm_tx(conn, int(channel["guild_id"]), user_id, "send_messages")
            cur = conn.execute(
                """
                INSERT INTO messages (channel_id, user_id, content, image_name, image_mime, image_data, file_name, file_mime, file_data, file_size, created_at, reply_to)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (channel_id, user_id, content, image_name, image_mime, image_data, file_name, file_mime, file_data, file_size, now(), reply_to),
            )
            row = conn.execute(
                """
                SELECT messages.*, users.username, users.display_name, users.avatar_color, users.email_lc
                FROM messages
                JOIN users ON users.id = messages.user_id
                WHERE messages.id = ?
                """,
                (int(cur.lastrowid),),
            ).fetchone()
            return self._message_public(row)

    def update_message(self, message_id: int, user_id: int, content: str) -> dict[str, Any]:
        content = str(content or "").strip()
        if not content:
            raise APIError(400, "Message cannot be empty.")
        if len(content) > MAX_MESSAGE_CHARS:
            raise APIError(400, f"Message is too long. Keep it under {MAX_MESSAGE_CHARS} characters.")
        with self.transaction() as conn:
            message = self._message_tx(conn, message_id)
            channel = self._channel_tx(conn, int(message["channel_id"]))
            can_manage = self._has_perm_tx(conn, int(channel["guild_id"]), user_id, "manage_messages")
            if int(message["user_id"]) != user_id and not can_manage:
                raise APIError(403, "You can only edit your own messages.")
            conn.execute("UPDATE messages SET content = ?, edited_at = ? WHERE id = ?", (content, now(), message_id))
            row = conn.execute(
                """
                SELECT messages.*, users.username, users.display_name, users.avatar_color, users.email_lc
                FROM messages
                JOIN users ON users.id = messages.user_id
                WHERE messages.id = ?
                """,
                (message_id,),
            ).fetchone()
            return self._message_public(row)

    def delete_message(self, message_id: int, user_id: int, permanent: bool = False) -> dict[str, Any]:
        with self.transaction() as conn:
            message = self._message_tx(conn, message_id)
            channel = self._channel_tx(conn, int(message["channel_id"]))
            guild_id = int(channel["guild_id"])
            can_manage = self._has_perm_tx(conn, guild_id, user_id, "manage_messages")
            if int(message["user_id"]) != user_id and not can_manage:
                raise APIError(403, "You can only delete your own messages.")
            if permanent:
                if not can_manage:
                    raise APIError(403, "Only message managers can permanently delete messages.")
                conn.execute("DELETE FROM messages WHERE id = ?", (message_id,))
                self._audit_tx(conn, guild_id, user_id, "message.permanent_delete", "message", message_id, {"had_image": bool(message["image_data"]), "had_file": bool(message["file_data"])})
                return {"id": message_id, "channel_id": int(channel["id"]), "guild_id": guild_id, "permanent": True}
            conn.execute("UPDATE messages SET deleted_at = ?, content = '', image_name = '', image_mime = '', image_data = '', file_name = '', file_mime = '', file_data = '', file_size = 0 WHERE id = ?", (now(), message_id))
            if can_manage and int(message["user_id"]) != user_id:
                self._audit_tx(conn, guild_id, user_id, "message.delete", "message", message_id, {})
            return {"id": message_id, "channel_id": int(channel["id"]), "guild_id": guild_id, "permanent": False}

    def message_attachment(self, message_id: int, user_id: int) -> dict[str, Any]:
        with self.transaction() as conn:
            message = self._message_tx(conn, message_id)
            channel = self._channel_tx(conn, int(message["channel_id"]))
            self._require_perm_tx(conn, int(channel["guild_id"]), user_id, "read_message_history")
            file_data = str(message["file_data"] or "")
            if message["deleted_at"] is not None or not file_data:
                raise APIError(404, "Attachment not found.")
            try:
                raw = base64.b64decode(file_data, validate=True)
            except Exception as exc:
                raise APIError(500, "Stored attachment is corrupted.") from exc
            return {
                "name": clean_name(message["file_name"], "attachment.zip", 180),
                "mime": str(message["file_mime"] or "application/zip"),
                "size": int(message["file_size"] or len(raw)),
                "data": raw,
            }

    def create_invite(self, guild_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "create_invite")
            channel_id = payload.get("channel_id")
            if channel_id:
                channel = self._channel_tx(conn, int(channel_id))
                if int(channel["guild_id"]) != guild_id:
                    raise APIError(400, "Invite channel is not in this server.")
            max_uses = payload.get("max_uses")
            max_uses = max(1, min(1000, int(max_uses))) if max_uses else None
            ttl_hours = payload.get("ttl_hours")
            expires_at = now() + max(1, min(24 * 30, int(ttl_hours))) * 3600 if ttl_hours else None
            code = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:10]
            conn.execute(
                """
                INSERT INTO invites (code, guild_id, channel_id, created_by, created_at, expires_at, max_uses)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (code, guild_id, channel_id, user_id, now(), expires_at, max_uses),
            )
            self._audit_tx(conn, guild_id, user_id, "invite.create", "invite", code, {"max_uses": max_uses})
            return dict(conn.execute("SELECT * FROM invites WHERE code = ?", (code,)).fetchone())

    def list_invites(self, guild_id: int, user_id: int) -> list[dict[str, Any]]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "manage_guild")
            rows = conn.execute(
                "SELECT * FROM invites WHERE guild_id = ? ORDER BY created_at DESC",
                (guild_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def join_invite(self, code: str, user_id: int) -> dict[str, Any]:
        code = str(code or "").strip()
        with self.transaction() as conn:
            invite = conn.execute("SELECT * FROM invites WHERE code = ?", (code,)).fetchone()
            if invite is None:
                raise APIError(404, "Invite not found.")
            if invite["expires_at"] and int(invite["expires_at"]) < now():
                raise APIError(410, "Invite expired.")
            if invite["max_uses"] and int(invite["uses"]) >= int(invite["max_uses"]):
                raise APIError(410, "Invite has no uses left.")
            guild_id = int(invite["guild_id"])
            banned = self._active_ban_tx(conn, guild_id, user_id)
            if banned:
                raise APIError(403, "You are banned from this server.")
            already = conn.execute(
                "SELECT 1 FROM members WHERE guild_id = ? AND user_id = ?",
                (guild_id, user_id),
            ).fetchone()
            if not already:
                conn.execute(
                    "INSERT INTO members (guild_id, user_id, joined_at) VALUES (?, ?, ?)",
                    (guild_id, user_id, now()),
                )
                self._audit_tx(conn, guild_id, user_id, "member.join", "member", user_id, {"invite": code})
            conn.execute("UPDATE invites SET uses = uses + 1 WHERE code = ?", (code,))
        return self.guild_snapshot(guild_id, user_id)

    def list_roles(self, guild_id: int, user_id: int) -> list[dict[str, Any]]:
        with self.transaction() as conn:
            self._membership_tx(conn, guild_id, user_id)
            rows = conn.execute("SELECT * FROM roles WHERE guild_id = ? ORDER BY position DESC, id", (guild_id,)).fetchall()
            return [self._role_public(row) for row in rows]

    def create_role(self, guild_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        permissions = self._clean_permissions(payload.get("permissions") or [])
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "manage_roles")
            position = int(conn.execute(
                "SELECT COALESCE(MAX(position), 0) + 1 FROM roles WHERE guild_id = ?",
                (guild_id,),
            ).fetchone()[0])
            cur = conn.execute(
                "INSERT INTO roles (guild_id, name, color, permissions, position, is_everyone) VALUES (?, ?, ?, ?, ?, 0)",
                (
                    guild_id,
                    clean_name(payload.get("name"), "New Role", 40),
                    self._clean_color(payload.get("color")),
                    json_text(permissions),
                    position,
                ),
            )
            role = self._role_public(conn.execute("SELECT * FROM roles WHERE id = ?", (int(cur.lastrowid),)).fetchone())
            self._audit_tx(conn, guild_id, user_id, "role.create", "role", role["id"], role)
            return role

    def update_role(self, role_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        with self.transaction() as conn:
            role = conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
            if role is None:
                raise APIError(404, "Role not found.")
            guild_id = int(role["guild_id"])
            self._require_perm_tx(conn, guild_id, user_id, "manage_roles")
            if int(role["is_everyone"]) and "name" in payload:
                payload["name"] = "@everyone"
            conn.execute(
                "UPDATE roles SET name = ?, color = ?, permissions = ?, position = ? WHERE id = ?",
                (
                    clean_name(payload.get("name", role["name"]), role["name"], 40),
                    self._clean_color(payload.get("color", role["color"])),
                    json_text(self._clean_permissions(payload.get("permissions", json.loads(role["permissions"])))),
                    int(payload.get("position", role["position"])),
                    role_id,
                ),
            )
            updated = self._role_public(conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone())
            self._audit_tx(conn, guild_id, user_id, "role.update", "role", role_id, updated)
            return updated

    def delete_role(self, role_id: int, user_id: int) -> dict[str, Any]:
        with self.transaction() as conn:
            role = conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
            if role is None:
                raise APIError(404, "Role not found.")
            if int(role["is_everyone"]):
                raise APIError(400, "The @everyone role cannot be deleted.")
            guild_id = int(role["guild_id"])
            self._require_perm_tx(conn, guild_id, user_id, "manage_roles")
            conn.execute("DELETE FROM roles WHERE id = ?", (role_id,))
            self._audit_tx(conn, guild_id, user_id, "role.delete", "role", role_id, dict(role))
            return {"id": role_id, "guild_id": guild_id}

    def set_member_roles(self, guild_id: int, target_user_id: int, actor_id: int, role_ids: list[int]) -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, actor_id, "manage_roles")
            self._membership_tx(conn, guild_id, target_user_id)
            clean_ids = []
            for role_id in role_ids:
                role = conn.execute("SELECT * FROM roles WHERE id = ? AND guild_id = ?", (int(role_id), guild_id)).fetchone()
                if role and not int(role["is_everyone"]):
                    clean_ids.append(int(role_id))
            conn.execute("DELETE FROM member_roles WHERE guild_id = ? AND user_id = ?", (guild_id, target_user_id))
            for role_id in sorted(set(clean_ids)):
                conn.execute(
                    "INSERT INTO member_roles (guild_id, user_id, role_id) VALUES (?, ?, ?)",
                    (guild_id, target_user_id, role_id),
                )
            self._audit_tx(conn, guild_id, actor_id, "member.roles", "member", target_user_id, {"roles": clean_ids})
        return self.guild_snapshot(guild_id, actor_id)

    def set_member_voice_flags(self, guild_id: int, target_user_id: int, actor_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, actor_id, "mute_members")
            self._membership_tx(conn, guild_id, target_user_id)
            muted = 1 if payload.get("muted") else 0
            deafened = 1 if payload.get("deafened") else 0
            conn.execute(
                "UPDATE members SET muted = ?, deafened = ? WHERE guild_id = ? AND user_id = ?",
                (muted, deafened, guild_id, target_user_id),
            )
            self._audit_tx(conn, guild_id, actor_id, "member.voice_flags", "member", target_user_id, {"muted": muted, "deafened": deafened})
        return self.guild_snapshot(guild_id, actor_id)

    def kick_member(self, guild_id: int, target_user_id: int, actor_id: int, reason: str = "") -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, actor_id, "kick_members")
            if self._is_config_admin_user_id_tx(conn, target_user_id):
                raise APIError(400, "Config admins cannot be kicked. Remove the username from mielcord_config.json first.")
            self._membership_tx(conn, guild_id, target_user_id)
            conn.execute("DELETE FROM members WHERE guild_id = ? AND user_id = ?", (guild_id, target_user_id))
            self._audit_tx(conn, guild_id, actor_id, "member.kick", "member", target_user_id, {"reason": reason[:240]})
            return {"guild_id": guild_id, "user_id": target_user_id}

    def ban_member(self, guild_id: int, target_user_id: int, actor_id: int, reason: str = "", expires_at: int | None = None) -> dict[str, Any]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, actor_id, "ban_members")
            if self._is_config_admin_user_id_tx(conn, target_user_id):
                raise APIError(400, "Config admins cannot be banned. Remove the username from mielcord_config.json first.")
            conn.execute("DELETE FROM members WHERE guild_id = ? AND user_id = ?", (guild_id, target_user_id))
            conn.execute(
                "INSERT OR REPLACE INTO bans (guild_id, user_id, banned_by, reason, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
                (guild_id, target_user_id, actor_id, reason[:240], now(), expires_at),
            )
            action = "member.tempban" if expires_at else "member.ban"
            details = {"reason": reason[:240], "expires_at": expires_at}
            self._audit_tx(conn, guild_id, actor_id, action, "member", target_user_id, details)
            return {"guild_id": guild_id, "user_id": target_user_id, "expires_at": expires_at}

    def tempban_member(self, guild_id: int, target_user_id: int, actor_id: int, hours: int, reason: str = "") -> dict[str, Any]:
        hours = max(1, min(int(hours or 24), 8760))
        return self.ban_member(guild_id, target_user_id, actor_id, reason, now() + hours * 3600)

    def list_audit(self, guild_id: int, user_id: int) -> list[dict[str, Any]]:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "manage_guild")
            rows = conn.execute(
                """
                SELECT audit_logs.*, users.username AS actor_username
                FROM audit_logs
                LEFT JOIN users ON users.id = audit_logs.actor_id
                WHERE audit_logs.guild_id = ?
                ORDER BY audit_logs.id DESC
                LIMIT 200
                """,
                (guild_id,),
            ).fetchall()
            output = []
            for row in rows:
                item = dict(row)
                try:
                    item["details"] = json.loads(item["details"])
                except json.JSONDecodeError:
                    item["details"] = {}
                output.append(item)
            return output

    def search_messages(self, guild_id: int, user_id: int, query: str) -> list[dict[str, Any]]:
        query = str(query or "").strip()
        if len(query) < 2:
            return []
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "read_message_history")
            rows = conn.execute(
                """
                SELECT messages.*, users.username, users.display_name, users.avatar_color, users.email_lc, channels.name AS channel_name
                FROM messages
                JOIN users ON users.id = messages.user_id
                JOIN channels ON channels.id = messages.channel_id
                WHERE channels.guild_id = ? AND messages.deleted_at IS NULL AND messages.content LIKE ?
                ORDER BY messages.id DESC
                LIMIT 50
                """,
                (guild_id, f"%{query}%"),
            ).fetchall()
            return [self._message_public(row) | {"channel_name": row["channel_name"]} for row in rows]

    def guild_id_for_channel(self, channel_id: int) -> int:
        with self.transaction() as conn:
            return int(self._channel_tx(conn, channel_id)["guild_id"])

    def guilds_for_user(self, user_id: int) -> set[int]:
        with self.transaction() as conn:
            guild_id = self._main_guild_id_tx(conn)
            if guild_id is None:
                return set()
            self._sync_config_admins_tx(conn, guild_id)
            row = conn.execute("SELECT 1 FROM members WHERE guild_id = ? AND user_id = ?", (guild_id, user_id)).fetchone()
            return {guild_id} if row else set()

    def can_join_voice(self, channel_id: int, user_id: int) -> tuple[int, dict[str, Any]]:
        with self.transaction() as conn:
            channel = self._channel_tx(conn, channel_id)
            if channel["type"] != "voice":
                raise APIError(400, "That is not a voice channel.")
            guild_id = int(channel["guild_id"])
            self._require_perm_tx(conn, guild_id, user_id, "connect")
            return guild_id, dict(channel)

    def require_voice_moderator(self, guild_id: int, user_id: int) -> None:
        with self.transaction() as conn:
            self._require_perm_tx(conn, guild_id, user_id, "mute_members")

    def _guild_tx(self, conn: sqlite3.Connection, guild_id: int) -> sqlite3.Row:
        row = conn.execute("SELECT * FROM guilds WHERE id = ?", (guild_id,)).fetchone()
        if row is None:
            raise APIError(404, "Server not found.")
        return row

    def _channel_tx(self, conn: sqlite3.Connection, channel_id: int) -> sqlite3.Row:
        row = conn.execute("SELECT * FROM channels WHERE id = ?", (channel_id,)).fetchone()
        if row is None:
            raise APIError(404, "Channel not found.")
        return row

    def _message_tx(self, conn: sqlite3.Connection, message_id: int) -> sqlite3.Row:
        row = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
        if row is None:
            raise APIError(404, "Message not found.")
        return row

    def _membership_tx(self, conn: sqlite3.Connection, guild_id: int, user_id: int) -> sqlite3.Row:
        self._require_main_guild_tx(conn, guild_id)
        row = conn.execute(
            "SELECT * FROM members WHERE guild_id = ? AND user_id = ?",
            (guild_id, user_id),
        ).fetchone()
        if row is None:
            raise APIError(403, "You are not a member of that server.")
        return row

    def _permissions_tx(self, conn: sqlite3.Connection, guild_id: int, user_id: int) -> set[str]:
        self._require_main_guild_tx(conn, guild_id)
        self._guild_tx(conn, guild_id)
        self._membership_tx(conn, guild_id, user_id)
        user = conn.execute("SELECT username FROM users WHERE id = ? AND disabled = 0", (user_id,)).fetchone()
        if user and self.config.is_admin_username(user["username"]):
            return set(PERMISSIONS)
        rows = conn.execute(
            """
            SELECT permissions FROM roles
            WHERE guild_id = ? AND (
                is_everyone = 1 OR id IN (
                    SELECT role_id FROM member_roles WHERE guild_id = ? AND user_id = ?
                )
            )
            """,
            (guild_id, guild_id, user_id),
        ).fetchall()
        permissions: set[str] = set()
        for row in rows:
            permissions |= parse_permissions(row["permissions"])
        permissions.discard("administrator")
        return permissions

    def _has_perm_tx(self, conn: sqlite3.Connection, guild_id: int, user_id: int, permission: str) -> bool:
        permissions = self._permissions_tx(conn, guild_id, user_id)
        return "administrator" in permissions or permission in permissions

    def _require_perm_tx(self, conn: sqlite3.Connection, guild_id: int, user_id: int, permission: str) -> None:
        if not self._has_perm_tx(conn, guild_id, user_id, permission):
            raise APIError(403, f"Missing permission: {permission}.")

    def _audit_tx(
        self,
        conn: sqlite3.Connection,
        guild_id: int,
        actor_id: int | None,
        action: str,
        target_type: str,
        target_id: Any,
        details: dict[str, Any],
    ) -> None:
        conn.execute(
            """
            INSERT INTO audit_logs (guild_id, actor_id, action, target_type, target_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (guild_id, actor_id, action, target_type, str(target_id), json_text(details), now()),
        )

    def _role_public(self, row: sqlite3.Row) -> dict[str, Any]:
        item = dict(row)
        item["permissions"] = sorted(parse_permissions(item["permissions"]))
        item["is_everyone"] = bool(item["is_everyone"])
        return item

    def _message_public(self, row: sqlite3.Row) -> dict[str, Any]:
        item = dict(row)
        email_lc = item.pop("email_lc", "")
        item["author"] = {
            "id": item.pop("user_id"),
            "username": item.pop("username"),
            "display_name": item.pop("display_name"),
            "avatar_color": item.pop("avatar_color"),
            "avatar_url": gravatar_url(email_lc),
        }
        image_data = item.pop("image_data", "") or ""
        image_mime = item.pop("image_mime", "") or ""
        image_name = item.pop("image_name", "") or ""
        file_data = item.pop("file_data", "") or ""
        file_mime = item.pop("file_mime", "") or ""
        file_name = item.pop("file_name", "") or ""
        file_size = int(item.pop("file_size", 0) or 0)
        item["image"] = {
            "name": image_name,
            "mime": image_mime,
            "data_url": f"data:{image_mime};base64,{image_data}",
        } if image_data else None
        item["attachment"] = {
            "name": file_name,
            "mime": file_mime,
            "size": file_size,
            "download_url": f"/api/messages/{item['id']}/attachment",
        } if file_data else None
        item["deleted"] = item["deleted_at"] is not None
        return item

    def _clean_permissions(self, values: Any) -> list[str]:
        if isinstance(values, str):
            try:
                values = json.loads(values)
            except json.JSONDecodeError:
                values = []
        return sorted({str(value) for value in values if str(value) in PERMISSIONS})

    def _clean_color(self, color: Any) -> str:
        text = str(color or "").strip()
        return text if re.match(r"^#[0-9a-fA-F]{6}$", text) else "#d99a23"


def empty_media_state(ghost: bool = False) -> dict[str, Any]:
    return {
        "muted": bool(ghost),
        "camera": False,
        "screen": False,
        "speaking": False,
        "camera_stream_id": "",
        "screen_stream_id": "",
        "screen_width": 0,
        "screen_height": 0,
        "screen_frame_rate": 0,
        "stream_quality": "",
        **({"ghost": True} if ghost else {}),
    }


@dataclass(eq=False)
class WSClient:
    handler: "MielcordHandler"
    user: dict[str, Any]
    guild_ids: set[int]
    session_id: str
    send_lock: threading.Lock = field(default_factory=threading.Lock)
    voice_channel_id: int | None = None
    voice_guild_id: int | None = None
    media_state: dict[str, Any] = field(default_factory=empty_media_state)
    ghost: bool = False
    mobile: bool = False
    overlay_subscribed: bool = False

    @property
    def user_id(self) -> int:
        return int(self.user["id"])

    def send(self, event: str, payload: dict[str, Any]) -> None:
        frame = json_text({"event": event, "payload": payload}).encode("utf-8")
        with self.send_lock:
            write_ws_frame(self.handler.request, 0x1, frame)


class Hub:
    def __init__(self, db: Database):
        self.db = db
        self.lock = threading.RLock()
        self.voice_join_lock = threading.Lock()
        self.clients: set[WSClient] = set()
        self.voice_rooms: dict[int, set[WSClient]] = {}

    def register(self, client: WSClient) -> None:
        with self.lock:
            self.clients.add(client)
        mobile_by_guild = {str(guild_id): sorted(self.mobile_users(guild_id)) for guild_id in client.guild_ids}
        client.send("hello", {"user": client.user, "guild_ids": sorted(client.guild_ids), "voice": self.voice_presence_for_guilds(client.guild_ids), "mobile_user_ids": mobile_by_guild})
        self.broadcast_presence(client.user_id, "online", client.guild_ids)

    def offer_voice_handoff(self, client: WSClient) -> None:
        with self.lock:
            candidates = [
                peer
                for peer in self.clients
                if peer is not client and peer.user_id == client.user_id and peer.voice_channel_id
            ]
        if not candidates:
            return
        source = next((peer for peer in candidates if not peer.ghost), candidates[0])
        channel_id = int(source.voice_channel_id or 0)
        if not channel_id:
            return
        try:
            _, channel = self.db.can_join_voice(channel_id, client.user_id)
        except APIError:
            return
        client.send(
            "voice:handoff",
            {
                "channel_id": channel_id,
                "channel_name": channel.get("name", "Voice"),
                "ghost": bool(source.ghost),
                "message": "Voice is active on another device and can be moved here.",
            },
        )

    def unregister(self, client: WSClient) -> None:
        with self.lock:
            self.clients.discard(client)
        self.leave_voice(client, restore_visibility=False)
        if not self._is_user_visible_online(client.user_id):
            self.broadcast_presence(client.user_id, "offline", client.guild_ids)
        else:
            self.broadcast_presence(client.user_id, "online", client.guild_ids)

    def _is_user_online(self, user_id: int) -> bool:
        with self.lock:
            return any(c.user_id == user_id for c in self.clients)

    def _is_user_visible_online(self, user_id: int) -> bool:
        with self.lock:
            return any(c.user_id == user_id and not c.ghost for c in self.clients)

    def online_users(self, guild_id: int) -> set[int]:
        with self.lock:
            return {c.user_id for c in self.clients if guild_id in c.guild_ids and not c.ghost}

    def mobile_users(self, guild_id: int) -> set[int]:
        with self.lock:
            return {c.user_id for c in self.clients if guild_id in c.guild_ids and not c.ghost and c.mobile}

    def update_user(self, user_id: int, user: dict[str, Any]) -> None:
        with self.lock:
            for client in self.clients:
                if client.user_id == user_id:
                    client.user = user

    def voice_presence_for_guilds(self, guild_ids: set[int]) -> dict[str, list[dict[str, Any]]]:
        with self.lock:
            output: dict[str, list[dict[str, Any]]] = {}
            for channel_id, clients in self.voice_rooms.items():
                room = [
                    {"user": client.user, "state": client.media_state, "channel_id": channel_id}
                    for client in clients
                    if client.voice_guild_id in guild_ids and not client.ghost
                ]
                if room:
                    output[str(channel_id)] = room
            return output

    def voice_presence(self, guild_id: int) -> dict[str, list[dict[str, Any]]]:
        return self.voice_presence_for_guilds({guild_id})

    def overlay_subject(self, client: WSClient) -> WSClient | None:
        with self.lock:
            candidates = [
                candidate
                for candidate in self.clients
                if candidate.user_id == client.user_id and candidate.voice_channel_id and not candidate.ghost
            ]
        return candidates[0] if candidates else None

    def overlay_snapshot(self, client: WSClient) -> dict[str, Any]:
        subject = self.overlay_subject(client)
        if not subject or not subject.voice_channel_id:
            return {"channel_id": None, "channel_name": "", "users": []}
        channel_id = int(subject.voice_channel_id)
        try:
            _, channel = self.db.can_join_voice(channel_id, client.user_id)
            channel_name = channel.get("name", "Voice")
        except APIError:
            channel_name = "Voice"
        with self.lock:
            room = [peer for peer in self.voice_rooms.get(channel_id, set()) if not peer.ghost]
        users = [
            {
                "user": peer.user,
                "muted": bool(peer.media_state.get("muted")),
                "camera": bool(peer.media_state.get("camera")),
                "screen": bool(peer.media_state.get("screen")),
                "speaking": bool(peer.media_state.get("speaking")),
            }
            for peer in room
        ]
        return {"channel_id": channel_id, "channel_name": channel_name, "users": users}

    def send_overlay_snapshot(self, client: WSClient) -> None:
        client.send("overlay:snapshot", self.overlay_snapshot(client))

    def broadcast_overlay_for_channel(self, channel_id: int | None) -> None:
        if not channel_id:
            return
        with self.lock:
            subscribers = [client for client in self.clients if client.overlay_subscribed]
        for client in subscribers:
            subject = self.overlay_subject(client)
            if subject and subject.voice_channel_id == channel_id:
                try:
                    self.send_overlay_snapshot(client)
                except OSError:
                    pass

    def broadcast_presence(self, user_id: int, status: str, guild_ids: set[int]) -> None:
        for guild_id in guild_ids:
            self.broadcast_guild(guild_id, "presence:update", {"user_id": user_id, "status": status, "mobile": user_id in self.mobile_users(guild_id)})

    def broadcast_guild(self, guild_id: int, event: str, payload: dict[str, Any], exclude: WSClient | None = None) -> None:
        stale: list[WSClient] = []
        with self.lock:
            targets = [c for c in self.clients if c is not exclude and guild_id in c.guild_ids]
        for client in targets:
            try:
                client.send(event, payload)
            except OSError:
                stale.append(client)
        for client in stale:
            self.unregister(client)

    def refresh_membership(self, user_id: int) -> None:
        guild_ids = self.db.guilds_for_user(user_id)
        with self.lock:
            for client in self.clients:
                if client.user_id == user_id:
                    client.guild_ids = guild_ids

    def handle_client_event(self, client: WSClient, message: dict[str, Any]) -> None:
        event = message.get("event")
        payload = message.get("payload") or {}
        if event == "ping":
            client.send("pong", {"t": payload.get("t"), "at": now()})
        elif event == "overlay:subscribe":
            client.overlay_subscribed = True
            self.send_overlay_snapshot(client)
        elif event == "device:activate":
            self.offer_voice_handoff(client)
        elif event == "typing:start":
            channel_id = int(payload.get("channel_id") or 0)
            guild_id = self.db.guild_id_for_channel(channel_id)
            self.broadcast_guild(
                guild_id,
                "typing:start",
                {"channel_id": channel_id, "user": client.user, "at": now()},
                exclude=client,
            )
        elif event == "voice:join":
            self.join_voice(
                client,
                int(payload.get("channel_id") or 0),
                ghost=False,
                resume=bool(payload.get("resume")),
            )
        elif event == "voice:ghost_join":
            try:
                self.join_voice(
                    client,
                    int(payload.get("channel_id") or 0),
                    ghost=True,
                    resume=bool(payload.get("resume")),
                )
            except APIError as exc:
                client.send("error", {"message": exc.message})
        elif event == "voice:leave":
            self.leave_voice(client)
        elif event == "voice:admin_disconnect":
            try:
                self.admin_disconnect_voice(client, int(payload.get("target_user_id") or 0))
            except APIError as exc:
                client.send("error", {"message": exc.message})
        elif event == "voice:ring":
            try:
                self.ring_user(client, int(payload.get("target_user_id") or 0))
            except APIError as exc:
                client.send("error", {"message": exc.message})
        elif event == "voice:speaking":
            if client.ghost or not client.voice_channel_id or not client.voice_guild_id:
                return
            speaking = bool(payload.get("speaking"))
            if bool(client.media_state.get("speaking")) != speaking:
                client.media_state["speaking"] = speaking
                self.broadcast_guild(
                    client.voice_guild_id,
                    "voice:speaking",
                    {
                        "channel_id": client.voice_channel_id,
                        "user_id": client.user_id,
                        "user": client.user,
                        "speaking": speaking,
                    },
                )
                self.broadcast_overlay_for_channel(client.voice_channel_id)
        elif event == "voice:state":
            if client.ghost:
                return
            previous = dict(client.media_state)
            camera = bool(payload.get("camera"))
            screen = bool(payload.get("screen"))
            client.media_state.update({
                "muted": bool(payload.get("muted")),
                "camera": camera,
                "screen": screen,
                "speaking": bool(client.media_state.get("speaking")),
                "camera_stream_id": str(payload.get("camera_stream_id") or "")[:160] if camera else "",
                "screen_stream_id": str(payload.get("screen_stream_id") or "")[:160] if screen else "",
                "screen_width": bounded_int(payload.get("screen_width"), 0, 16384) if screen else 0,
                "screen_height": bounded_int(payload.get("screen_height"), 0, 16384) if screen else 0,
                "screen_frame_rate": bounded_int(payload.get("screen_frame_rate"), 0, 240) if screen else 0,
                "stream_quality": str(payload.get("stream_quality") or "")[:24] if screen else "",
            })
            changed = {key: client.media_state.get(key) for key in client.media_state if previous.get(key) != client.media_state.get(key)}
            if client.voice_channel_id and client.voice_guild_id:
                self.broadcast_guild(
                    client.voice_guild_id,
                    "voice:state",
                    {
                        "channel_id": client.voice_channel_id,
                        "user_id": client.user_id,
                        "user": client.user,
                        "state": client.media_state,
                        "changed": changed,
                    },
                )
                self.broadcast_overlay_for_channel(client.voice_channel_id)
        elif event == "rtc:signal":
            self.route_rtc_signal(client, payload)

    def join_voice(self, client: WSClient, channel_id: int, ghost: bool = False, resume: bool = False) -> None:
        with self.voice_join_lock:
            self._join_voice(client, channel_id, ghost=ghost, resume=resume)

    def _join_voice(self, client: WSClient, channel_id: int, ghost: bool = False, resume: bool = False) -> None:
        guild_id, channel = self.db.can_join_voice(channel_id, client.user_id)
        if ghost:
            self.db.require_voice_moderator(guild_id, client.user_id)
        with self.lock:
            other_devices = [
                peer
                for peer in self.clients
                if peer is not client and peer.user_id == client.user_id and peer.voice_channel_id
            ]
        if resume and any(peer.session_id != client.session_id for peer in other_devices):
            client.send(
                "voice:resume_blocked",
                {
                    "message": "Voice is active on another device.",
                    "channel_id": channel_id,
                },
            )
            return
        for peer in other_devices:
            try:
                peer.send(
                    "voice:transferred",
                    {
                        "message": "Voice moved to another device. Your account stays connected here.",
                        "channel_id": peer.voice_channel_id,
                    },
                )
            except OSError:
                pass
            self.leave_voice(peer)
        if client.voice_channel_id == channel_id and client.ghost == ghost:
            return
        was_visible = not client.ghost
        self.leave_voice(client, restore_visibility=False)
        with self.lock:
            peers = list(self.voice_rooms.setdefault(channel_id, set()))
            self.voice_rooms[channel_id].add(client)
            client.voice_channel_id = channel_id
            client.voice_guild_id = guild_id
            client.ghost = ghost
            client.media_state = empty_media_state(ghost)
        if ghost and was_visible and not self._is_user_visible_online(client.user_id):
            self.broadcast_presence(client.user_id, "offline", client.guild_ids)
        if not ghost and not was_visible:
            self.broadcast_presence(client.user_id, "online", client.guild_ids)
        client.send(
            "voice:joined",
            {
                "channel": channel,
                "ghost": ghost,
                "peers": [
                    {"user": peer.user, "state": peer.media_state}
                    for peer in peers
                    if peer.user_id != client.user_id and not peer.ghost
                ],
            },
        )
        if not ghost:
            self.broadcast_guild(
                guild_id,
                "voice:peer_joined",
                {"channel_id": channel_id, "user": client.user, "state": client.media_state},
                exclude=client,
            )
        self.broadcast_overlay_for_channel(channel_id)

    def leave_voice(self, client: WSClient, restore_visibility: bool = True) -> None:
        guild_id = client.voice_guild_id
        channel_id = client.voice_channel_id
        was_ghost = client.ghost
        if not channel_id:
            if restore_visibility and was_ghost:
                client.ghost = False
                self.broadcast_presence(client.user_id, "online", client.guild_ids)
            return
        with self.lock:
            room = self.voice_rooms.get(channel_id)
            peers = [peer for peer in (room or set()) if peer is not client]
            if room:
                room.discard(client)
                if not room:
                    self.voice_rooms.pop(channel_id, None)
            client.voice_channel_id = None
            client.voice_guild_id = None
            client.media_state = empty_media_state()
            client.ghost = False if restore_visibility else client.ghost
        if guild_id and was_ghost:
            for peer in peers:
                try:
                    peer.send("rtc:close", {"user_id": client.user_id})
                except OSError:
                    pass
        elif guild_id:
            self.broadcast_guild(guild_id, "voice:peer_left", {"channel_id": channel_id, "user_id": client.user_id, "user": client.user})
        if restore_visibility and was_ghost:
            self.broadcast_presence(client.user_id, "online", client.guild_ids)
        self.broadcast_overlay_for_channel(channel_id)

    def admin_disconnect_voice(self, client: WSClient, target_user_id: int) -> None:
        if not target_user_id or not client.voice_guild_id:
            return
        self.db.require_voice_moderator(client.voice_guild_id, client.user_id)
        with self.lock:
            targets = [peer for room in self.voice_rooms.values() for peer in room if peer.user_id == target_user_id and peer.voice_guild_id == client.voice_guild_id]
        for target in targets:
            try:
                target.send("voice:force_disconnect", {"by_user": client.user})
            except OSError:
                pass
            self.leave_voice(target)

    def ring_user(self, client: WSClient, target_user_id: int) -> None:
        if not client.voice_channel_id or not client.voice_guild_id:
            raise APIError(400, "Join a voice channel before ringing someone.")
        if not target_user_id or target_user_id == client.user_id:
            return
        guild_id, channel = self.db.can_join_voice(client.voice_channel_id, target_user_id)
        if guild_id != client.voice_guild_id:
            return
        with self.lock:
            targets = [peer for peer in self.clients if peer.user_id == target_user_id and guild_id in peer.guild_ids]
        payload = {
            "from_user": client.user,
            "channel_id": client.voice_channel_id,
            "channel_name": channel.get("name", "Voice"),
            "guild_id": guild_id,
        }
        delivered = 0
        for target in targets:
            try:
                target.send("voice:ring", payload)
                delivered += 1
            except OSError:
                pass
        client.send("voice:ring_sent", {"target_user_id": target_user_id, "delivered": delivered})

    def route_rtc_signal(self, client: WSClient, payload: dict[str, Any]) -> None:
        target_user_id = int(payload.get("target_user_id") or 0)
        channel_id = int(payload.get("channel_id") or client.voice_channel_id or 0)
        signal_payload = payload.get("signal")
        if (
            not target_user_id
            or not channel_id
            or signal_payload is None
            or client.voice_channel_id != channel_id
        ):
            return
        with self.lock:
            room = self.voice_rooms.get(channel_id, set())
            if client not in room:
                return
            targets = [
                peer
                for peer in room
                if peer is not client and peer.user_id == target_user_id
            ]
        for target in targets:
            target.send(
                "rtc:signal",
                {
                    "from_user_id": client.user_id,
                    "channel_id": channel_id,
                    "signal": signal_payload,
                },
            )


def parse_cookie(header: str | None) -> dict[str, str]:
    cookies: dict[str, str] = {}
    if not header:
        return cookies
    for part in header.split(";"):
        if "=" in part:
            key, value = part.split("=", 1)
            cookies[key.strip()] = urllib.parse.unquote(value.strip())
    return cookies


def make_cookie(token: str) -> str:
    encoded = urllib.parse.quote(token)
    expires = formatdate(time.time() + SESSION_TTL_SECONDS, usegmt=True)
    return (
        f"{SESSION_COOKIE}={encoded}; Path=/; Max-Age={SESSION_TTL_SECONDS}; "
        f"Expires={expires}; HttpOnly; SameSite=Lax"
    )


def clear_cookie() -> str:
    return (
        f"{SESSION_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; "
        "HttpOnly; SameSite=Lax"
    )


def read_ws_frame(stream) -> tuple[int, bytes] | None:
    header = stream.read(2)
    if len(header) < 2:
        return None
    b1, b2 = header
    opcode = b1 & 0x0F
    masked = bool(b2 & 0x80)
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack("!H", stream.read(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", stream.read(8))[0]
    mask = stream.read(4) if masked else b""
    payload = stream.read(length) if length else b""
    if masked:
        payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
    return opcode, payload


def write_ws_frame(sock, opcode: int, payload: bytes = b"") -> None:
    length = len(payload)
    first = 0x80 | opcode
    if length < 126:
        header = struct.pack("!BB", first, length)
    elif length < (1 << 16):
        header = struct.pack("!BBH", first, 126, length)
    else:
        header = struct.pack("!BBQ", first, 127, length)
    sock.sendall(header + payload)


class MielcordHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, server_address, handler_class, app: "MielcordApp"):
        super().__init__(server_address, handler_class)
        self.app = app


class MielcordApp:
    def __init__(self, db: Database, config: AppConfig):
        self.db = db
        self.config = config
        self.limiter = RateLimiter()
        self.hub = Hub(db)

    def limit(self, name: str, key: str, message: str) -> None:
        limit, window = self.config.rate_limit(name)
        self.limiter.check(f"{name}:{key}", limit, window, message)


class MielcordHandler(BaseHTTPRequestHandler):
    server_version = f"Mielcord/{APP_VERSION}"
    protocol_version = "HTTP/1.1"

    @property
    def app(self) -> MielcordApp:
        return self.server.app  # type: ignore[attr-defined]

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/ws":
            if not self.country_allowed():
                self.send_error(HTTPStatus.FORBIDDEN, "This Mielcord host is not available from your country.")
                return
            self.handle_websocket()
            return
        if parsed.path.startswith("/api/messages/") and parsed.path.endswith("/attachment"):
            self.handle_message_attachment(parsed)
            return
        if parsed.path.startswith("/api/"):
            self.handle_api("GET", parsed)
            return
        if not self.country_allowed():
            self.send_error(HTTPStatus.FORBIDDEN, "This Mielcord host is not available from your country.")
            return
        self.serve_static(parsed.path)

    def do_HEAD(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.send_response(405)
            self.send_header("Allow", "GET, POST, PATCH, DELETE")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if not self.country_allowed():
            self.send_error(HTTPStatus.FORBIDDEN, "This Mielcord host is not available from your country.")
            return
        self.serve_static(parsed.path, head_only=True)

    def do_POST(self) -> None:
        self.handle_api("POST", urllib.parse.urlparse(self.path))

    def do_PATCH(self) -> None:
        self.handle_api("PATCH", urllib.parse.urlparse(self.path))

    def do_DELETE(self) -> None:
        self.handle_api("DELETE", urllib.parse.urlparse(self.path))

    def handle_message_attachment(self, parsed: urllib.parse.ParseResult) -> None:
        try:
            self.enforce_country_access()
            user = self.require_user()
            segments = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
            if len(segments) != 4 or segments[:2] != ["api", "messages"] or segments[3] != "attachment":
                raise APIError(404, "Attachment not found.")
            attachment = self.app.db.message_attachment(int(segments[2]), int(user["id"]))
            body = attachment["data"]
            filename = str(attachment["name"] or "attachment.zip").replace("\\", "_").replace('"', "'")
            encoded = urllib.parse.quote(filename)
            self.send_response(200)
            self.send_header("Content-Type", attachment["mime"])
            self.send_header("Content-Length", str(len(body)))
            disposition = f"attachment; filename=\"{filename}\"; filename*=UTF-8''{encoded}"
            self.send_header("Content-Disposition", disposition)
            self.send_header("Cache-Control", "private, no-store")
            self.end_headers()
            self.wfile.write(body)
        except APIError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except Exception as exc:
            traceback.print_exc()
            self.send_json(500, {"error": f"Internal server error: {exc}"})

    def handle_api(self, method: str, parsed: urllib.parse.ParseResult) -> None:
        try:
            self.enforce_country_access()
            result, cookie = self.dispatch_api(method, parsed)
            self.send_json(200, result, cookie)
        except APIError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except Exception as exc:
            traceback.print_exc()
            self.send_json(500, {"error": f"Internal server error: {exc}"})

    def dispatch_api(self, method: str, parsed: urllib.parse.ParseResult) -> tuple[dict[str, Any] | list[Any], str | None]:
        segments = [urllib.parse.unquote(part) for part in parsed.path.strip("/").split("/") if part]
        query = urllib.parse.parse_qs(parsed.query)
        payload = self.read_json() if method in {"POST", "PATCH", "DELETE"} else {}

        if segments == ["api", "public-config"] and method == "GET":
            return {
                "version": APP_VERSION,
                "private_mode_enabled": self.app.config.private_mode_enabled(),
                "country_restriction_enabled": self.app.config.country_restriction_enabled(),
                "allowed_country_codes": sorted(self.app.config.allowed_country_codes()),
                "rtc_ice_servers": self.app.config.rtc_ice_servers(),
            }, None

        if segments == ["api", "register"] and method == "POST":
            self.app.limit("register_per_ip", self.client_ip(), "Too many account creation attempts.")
            self.validate_private_access(payload)
            user = self.app.db.create_user(payload.get("username", ""), payload.get("password", ""), payload.get("email", ""))
            token = self.app.db.create_session(int(user["id"]))
            private = self.app.db.private_user(int(user["id"])) or user
            return {"user": private, "guilds": self.app.db.list_guilds(int(user["id"])), "version": APP_VERSION}, make_cookie(token)

        if segments == ["api", "login"] and method == "POST":
            username_lc = str(payload.get("username", "")).strip().lower()
            self.app.limit("login_per_ip", self.client_ip(), "Too many login attempts from this address.")
            self.app.limit("login_per_account", f"{self.client_ip()}:{username_lc}", "Too many login attempts for this account.")
            self.validate_private_access(payload)
            user = self.app.db.authenticate(payload.get("username", ""), payload.get("password", ""))
            token = self.app.db.create_session(int(user["id"]))
            private = self.app.db.private_user(int(user["id"])) or user
            return {"user": private, "guilds": self.app.db.list_guilds(int(user["id"])), "version": APP_VERSION}, make_cookie(token)

        if segments == ["api", "logout"] and method == "POST":
            self.app.db.delete_session(self.session_token())
            return {"ok": True}, clear_cookie()

        user = self.require_user()
        user_id = int(user["id"])

        if segments == ["api", "me"]:
            if method == "GET":
                private = self.app.db.private_user(user_id) or user
                return {"user": private, "guilds": self.app.db.list_guilds(user_id), "version": APP_VERSION}, None
            if method == "PATCH":
                updated = self.app.db.update_profile(user_id, payload)
                public = dict(updated)
                public.pop("email", None)
                self.app.hub.update_user(user_id, public)
                return {"user": updated}, None

        if segments == ["api", "guilds"]:
            if method == "GET":
                return {"guilds": self.app.db.list_guilds(user_id)}, None
            if method == "POST":
                snapshot = self.app.db.create_guild(user_id, payload.get("name", ""), payload.get("description", ""))
                self.app.hub.refresh_membership(user_id)
                return snapshot, None

        if len(segments) >= 3 and segments[:2] == ["api", "guilds"]:
            guild_id = int(segments[2])
            if len(segments) == 3:
                if method == "GET":
                    snapshot = self.app.db.guild_snapshot(guild_id, user_id)
                    snapshot["online_user_ids"] = sorted(self.app.hub.online_users(guild_id))
                    snapshot["mobile_user_ids"] = sorted(self.app.hub.mobile_users(guild_id))
                    snapshot["voice"] = self.app.hub.voice_presence(guild_id)
                    return snapshot, None
                if method == "PATCH":
                    snapshot = self.app.db.update_guild(guild_id, user_id, payload)
                    self.app.hub.broadcast_guild(guild_id, "guild:update", snapshot)
                    return snapshot, None
            if len(segments) == 4 and segments[3] == "channels" and method == "POST":
                channel = self.app.db.create_channel(guild_id, user_id, payload)
                self.app.hub.broadcast_guild(guild_id, "channel:create", channel)
                return {"channel": channel}, None
            if len(segments) == 4 and segments[3] == "audit" and method == "GET":
                return {"audit": self.app.db.list_audit(guild_id, user_id)}, None
            if len(segments) == 4 and segments[3] == "invites":
                if method == "GET":
                    return {"invites": self.app.db.list_invites(guild_id, user_id)}, None
                if method == "POST":
                    invite = self.app.db.create_invite(guild_id, user_id, payload)
                    self.app.hub.broadcast_guild(guild_id, "invite:create", invite)
                    return {"invite": invite}, None
            if len(segments) == 4 and segments[3] == "roles":
                if method == "GET":
                    return {"roles": self.app.db.list_roles(guild_id, user_id)}, None
                if method == "POST":
                    role = self.app.db.create_role(guild_id, user_id, payload)
                    self.app.hub.broadcast_guild(guild_id, "role:create", role)
                    return {"role": role}, None
            if len(segments) == 5 and segments[3] == "members":
                target_user_id = int(segments[4])
                if method == "DELETE":
                    result = self.app.db.kick_member(guild_id, target_user_id, user_id, payload.get("reason", ""))
                    self.app.hub.refresh_membership(target_user_id)
                    self.app.hub.broadcast_guild(guild_id, "member:remove", result)
                    return result, None
            if len(segments) == 6 and segments[3] == "members":
                target_user_id = int(segments[4])
                action = segments[5]
                if action == "ban" and method == "POST":
                    result = self.app.db.ban_member(guild_id, target_user_id, user_id, payload.get("reason", ""))
                    self.app.hub.refresh_membership(target_user_id)
                    self.app.hub.broadcast_guild(guild_id, "member:remove", result)
                    return result, None
                if action == "tempban" and method == "POST":
                    result = self.app.db.tempban_member(guild_id, target_user_id, user_id, int(payload.get("hours") or 24), payload.get("reason", ""))
                    self.app.hub.refresh_membership(target_user_id)
                    self.app.hub.broadcast_guild(guild_id, "member:remove", result)
                    return result, None
                if action == "roles" and method == "POST":
                    snapshot = self.app.db.set_member_roles(guild_id, target_user_id, user_id, payload.get("roles") or [])
                    self.app.hub.broadcast_guild(guild_id, "guild:update", snapshot)
                    return snapshot, None
                if action == "voice" and method == "POST":
                    snapshot = self.app.db.set_member_voice_flags(guild_id, target_user_id, user_id, payload)
                    self.app.hub.broadcast_guild(guild_id, "guild:update", snapshot)
                    return snapshot, None

        if len(segments) == 4 and segments[:2] == ["api", "invites"] and segments[3] == "join" and method == "POST":
            snapshot = self.app.db.join_invite(segments[2], user_id)
            self.app.hub.refresh_membership(user_id)
            self.app.hub.broadcast_guild(int(snapshot["guild"]["id"]), "member:join", {"user_id": user_id})
            return snapshot, None

        if len(segments) == 3 and segments[:2] == ["api", "channels"]:
            channel_id = int(segments[2])
            if method == "PATCH":
                channel = self.app.db.update_channel(channel_id, user_id, payload)
                self.app.hub.broadcast_guild(int(channel["guild_id"]), "channel:update", channel)
                return {"channel": channel}, None
            if method == "DELETE":
                result = self.app.db.delete_channel(channel_id, user_id)
                self.app.hub.broadcast_guild(int(result["guild_id"]), "channel:delete", result)
                return result, None

        if len(segments) == 4 and segments[:2] == ["api", "channels"] and segments[3] == "messages":
            channel_id = int(segments[2])
            if method == "GET":
                limit = int((query.get("limit") or ["80"])[0])
                before_raw = (query.get("before") or [None])[0]
                before = int(before_raw) if before_raw else None
                return {"messages": self.app.db.list_messages(channel_id, user_id, limit, before)}, None
            if method == "POST":
                self.app.limit("message_per_user", str(user_id), "You are sending messages too quickly.")
                message = self.app.db.create_message(channel_id, user_id, payload.get("content", ""), payload.get("reply_to"), payload.get("image"), payload.get("attachment"))
                guild_id = self.app.db.guild_id_for_channel(channel_id)
                self.app.hub.broadcast_guild(guild_id, "message:create", message)
                return {"message": message}, None

        if len(segments) == 3 and segments[:2] == ["api", "messages"]:
            message_id = int(segments[2])
            if method == "PATCH":
                message = self.app.db.update_message(message_id, user_id, payload.get("content", ""))
                guild_id = self.app.db.guild_id_for_channel(int(message["channel_id"]))
                self.app.hub.broadcast_guild(guild_id, "message:update", message)
                return {"message": message}, None
            if method == "DELETE":
                result = self.app.db.delete_message(message_id, user_id, bool(payload.get("permanent")))
                self.app.hub.broadcast_guild(int(result["guild_id"]), "message:delete", result)
                return result, None

        if len(segments) == 3 and segments[:2] == ["api", "roles"]:
            role_id = int(segments[2])
            if method == "PATCH":
                role = self.app.db.update_role(role_id, user_id, payload)
                self.app.hub.broadcast_guild(int(role["guild_id"]), "role:update", role)
                return {"role": role}, None
            if method == "DELETE":
                result = self.app.db.delete_role(role_id, user_id)
                self.app.hub.broadcast_guild(int(result["guild_id"]), "role:delete", result)
                return result, None

        if segments == ["api", "search"] and method == "GET":
            guild_id = int((query.get("guild_id") or ["0"])[0])
            text = (query.get("q") or [""])[0]
            return {"results": self.app.db.search_messages(guild_id, user_id, text)}, None

        raise APIError(404, "Endpoint not found.")

    def enforce_country_access(self) -> None:
        if not self.country_allowed():
            raise APIError(403, "This Mielcord host is not available from your country.")

    def country_allowed(self) -> bool:
        if not self.app.config.country_restriction_enabled():
            return True
        if self.app.config.country_restriction_allow_private() and self.client_ip_is_private():
            return True
        country = self.request_country_code()
        allowed = self.app.config.allowed_country_codes()
        return bool(country and allowed and country in allowed)

    def request_country_code(self) -> str:
        for header in self.app.config.country_headers():
            raw = str(self.headers.get(header, "") or "").strip().upper()
            if not raw:
                continue
            code = re.sub(r"[^A-Z]", "", raw)[:2]
            if code and code not in {"XX", "ZZ"}:
                return code
        return ""

    def client_ip_is_private(self) -> bool:
        try:
            address = ipaddress.ip_address(self.client_ip().split("%", 1)[0])
        except ValueError:
            return False
        return address.is_private or address.is_loopback or address.is_link_local

    def validate_private_access(self, payload: dict[str, Any]) -> None:
        if not self.app.config.private_mode_enabled():
            return
        expected = self.app.config.private_mode_password()
        if not expected:
            raise APIError(403, "Private mode is enabled, but private_mode_password is empty in mielcord_config.json.")
        submitted = str(payload.get("server_password") or payload.get("host_password") or payload.get("private_mode_password") or "")
        if not hmac.compare_digest(submitted, expected):
            raise APIError(403, "Invalid Mielcord host password.")

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_JSON_BYTES:
            raise APIError(413, "Request body is too large.")
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise APIError(400, "Invalid JSON.") from exc
        if not isinstance(data, dict):
            raise APIError(400, "JSON body must be an object.")
        return data

    def session_token(self) -> str:
        return parse_cookie(self.headers.get("Cookie")).get(SESSION_COOKIE, "")

    def require_user(self) -> dict[str, Any]:
        user = self.app.db.user_for_session(self.session_token())
        if user is None:
            raise APIError(401, "You need to sign in.")
        return user

    def client_ip(self) -> str:
        forwarded = self.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip() or self.client_address[0]
        return self.client_address[0]

    def send_json(self, status: int, value: dict[str, Any] | list[Any], cookie: str | None = None) -> None:
        body = json_text(value).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path: str, head_only: bool = False) -> None:
        if path in {"", "/"}:
            path = "/index.html"
        relative = urllib.parse.unquote(path.lstrip("/"))
        target = (STATIC_DIR / relative).resolve()
        try:
            target.relative_to(STATIC_DIR.resolve())
        except ValueError:
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not target.exists() or not target.is_file():
            target = STATIC_DIR / "index.html"
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def handle_websocket(self) -> None:
        session_token = self.session_token()
        user = self.app.db.user_for_session(session_token)
        if user is None:
            self.send_error(HTTPStatus.UNAUTHORIZED)
            return
        key = self.headers.get("Sec-WebSocket-Key")
        if not key or self.headers.get("Upgrade", "").lower() != "websocket":
            self.send_error(HTTPStatus.BAD_REQUEST)
            return
        accept = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("ascii")).digest()
        ).decode("ascii")
        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        self.end_headers()

        client = WSClient(
            self,
            user,
            self.app.db.guilds_for_user(int(user["id"])),
            session_hash(session_token),
            mobile=is_mobile_user_agent(self.headers.get("User-Agent")),
        )
        self.app.hub.register(client)
        try:
            while True:
                frame = read_ws_frame(self.rfile)
                if frame is None:
                    break
                opcode, payload = frame
                if opcode == 0x8:
                    write_ws_frame(self.request, 0x8, b"")
                    break
                if opcode == 0x9:
                    write_ws_frame(self.request, 0xA, payload)
                    continue
                if opcode != 0x1:
                    continue
                try:
                    message = json.loads(payload.decode("utf-8"))
                except json.JSONDecodeError:
                    continue
                if isinstance(message, dict):
                    self.app.hub.handle_client_event(client, message)
        except (ConnectionError, OSError):
            pass
        finally:
            self.app.hub.unregister(client)
            self.close_connection = True



HONEY_ASCII = r"""
 __  __ _      _                     _
|  \/  (_) ___| | ___ ___  _ __ __| |
| |\/| | |/ _ \ |/ __/ _ \| '__/ _` |
| |  | | |  __/ | (_| (_) | | | (_| |
|_|  |_|_|\___|_|\___\___/|_|  \__,_|
        .--.     .--.     .--.
       /    \___/    \___/    \
       \    /   \    /   \    /
        '--'     '--'     '--'
"""

def main() -> int:
    config = AppConfig(CONFIG_PATH)
    db = Database(DB_PATH, config)
    db.init()
    app = MielcordApp(db, config)
    try:
        server = MielcordHTTPServer((HOST, PORT), MielcordHandler, app)
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            print(f"Mielcord could not start because {HOST}:{PORT} is already in use.", file=sys.stderr)
            print("Stop the existing server or choose another port, for example:", file=sys.stderr)
            print("  MIELCORD_PORT=8090 ./mielcord", file=sys.stderr)
            return 98
        raise

    def shutdown(_signum, _frame):
        print("\nStopping Mielcord...")
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print(HONEY_ASCII)
    print(f"Mielcord v{APP_VERSION} is running at http://127.0.0.1:{PORT}")
    print(f"Database: {DB_PATH}")
    print(f"Config: {CONFIG_PATH}")
    print("Press Ctrl+C to stop.")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
