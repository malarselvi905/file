"""
Cryptographic Service Module
Implements authenticated server-side encryption at rest using AES-256-GCM (Galois/Counter Mode).
Complies with NIST SP 800-38D specifications for authenticated encryption.
"""

import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app

def get_encryption_key() -> bytes:
    """Retrieve 256-bit (32-byte) master encryption key from configuration."""
    key = current_app.config.get('ENCRYPTION_KEY')
    if not key or len(key) != 32:
        raise ValueError("Invalid AES-256 key: Key must be exactly 32 bytes.")
    return key

def encrypt_file(file_bytes: bytes) -> dict:
    """
    Encrypt plaintext bytes using AES-256-GCM.
    
    Returns:
        dict: {
            'ciphertext_with_tag': bytes (ciphertext + 16-byte auth tag appended by AESGCM),
            'iv_hex': str (12-byte initialization vector in hex),
            'auth_tag_hex': str (16-byte GCM authentication tag in hex),
            'sha256_checksum': str (digest of original plaintext before encryption)
        }
    """
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    
    # Generate cryptographically secure random 96-bit (12-byte) IV / Nonce
    iv = os.urandom(12)
    
    # Calculate SHA-256 checksum of original plaintext for integrity auditing
    sha256_checksum = hashlib.sha256(file_bytes).hexdigest()
    
    # AESGCM.encrypt appends 16-byte authentication tag to the end of the ciphertext
    encrypted_payload = aesgcm.encrypt(iv, file_bytes, None)
    
    # Extract tag for explicit database metadata recording (last 16 bytes)
    auth_tag = encrypted_payload[-16:]
    
    return {
        'ciphertext_with_tag': encrypted_payload,
        'iv_hex': iv.hex(),
        'auth_tag_hex': auth_tag.hex(),
        'sha256_checksum': sha256_checksum,
        'cipher_size': len(encrypted_payload)
    }

def decrypt_file(encrypted_payload: bytes, iv_hex: str) -> bytes:
    """
    Decrypt AES-256-GCM payload and verify integrity tag.
    
    Args:
        encrypted_payload: bytes containing ciphertext + 16-byte authentication tag
        iv_hex: 12-byte initialization vector in hexadecimal
        
    Returns:
        bytes: decrypted original plaintext
        
    Raises:
        cryptography.exceptions.InvalidTag: If payload or IV was tampered with
    """
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    iv = bytes.fromhex(iv_hex)
    
    # Decrypt and authenticate. Raises InvalidTag if ciphertext or tag was altered.
    plaintext = aesgcm.decrypt(iv, encrypted_payload, None)
    return plaintext
