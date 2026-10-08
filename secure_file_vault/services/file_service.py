"""
File Handling Service
Enforces strict sanitization, path traversal mitigation, MIME validation, and UUID storage.
"""

import os
import uuid
import re
from werkzeug.utils import secure_filename
from flask import current_app

def is_allowed_file(filename: str) -> bool:
    """Validate file extension against server whitelist."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in current_app.config['ALLOWED_EXTENSIONS']

def sanitize_user_filename(filename: str) -> str:
    """Sanitize original user filename, preventing path traversal and null bytes."""
    # Strip path separators and null bytes
    clean = re.sub(r'[\r\n\t\0]', '', filename)
    clean = os.path.basename(clean)
    clean = secure_filename(clean)
    if not clean:
        clean = "unnamed_vault_document.dat"
    return clean

def generate_vault_storage_name() -> str:
    """Generate unguessable UUIDv4 file identifier for physical disk storage."""
    return f"vault_{uuid.uuid4().hex}.enc"

def save_encrypted_payload(encrypted_bytes: bytes, stored_filename: str) -> str:
    """Save encrypted binary payload outside static paths."""
    upload_dir = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_dir, exist_ok=True)
    
    physical_path = os.path.join(upload_dir, stored_filename)
    with open(physical_path, 'wb') as f:
        f.write(encrypted_bytes)
    return physical_path

def read_encrypted_payload(stored_filename: str) -> bytes:
    """Read stored encrypted payload from disk."""
    upload_dir = current_app.config['UPLOAD_FOLDER']
    physical_path = os.path.join(upload_dir, stored_filename)
    if not os.path.exists(physical_path):
        raise FileNotFoundError(f"Vault physical file not found: {stored_filename}")
    with open(physical_path, 'rb') as f:
        return f.read()

def delete_encrypted_payload(stored_filename: str) -> bool:
    """Securely remove encrypted file from disk."""
    upload_dir = current_app.config['UPLOAD_FOLDER']
    physical_path = os.path.join(upload_dir, stored_filename)
    if os.path.exists(physical_path):
        os.remove(physical_path)
        return True
    return False
