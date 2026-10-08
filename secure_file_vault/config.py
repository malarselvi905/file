import os
from datetime import timedelta
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv()

class Config:
    """Base application security and environment configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-dev-secret-change-in-production-vault')
    
    # Database Configuration (MySQL / PyMySQL via XAMPP)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:@localhost:3306/secure_file_vault'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
    }

    # Cryptography: AES-256-GCM Master Key (32 bytes / 64 hex characters)
    ENCRYPTION_KEY_HEX = os.environ.get(
        'ENCRYPTION_KEY',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    )
    try:
        ENCRYPTION_KEY = bytes.fromhex(ENCRYPTION_KEY_HEX)
        if len(ENCRYPTION_KEY) != 32:
            raise ValueError("AES-256 requires exactly 32 bytes (64 hex characters).")
    except Exception as e:
        # Fallback to deterministic SHA-256 derived 32-byte key for safe local evaluation
        import hashlib
        ENCRYPTION_KEY = hashlib.sha256(ENCRYPTION_KEY_HEX.encode()).digest()

    # File Vault Security Parameters
    UPLOAD_FOLDER = os.path.abspath(os.environ.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), 'uploads')))
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 15 * 1024 * 1024))  # 15 MB
    
    ALLOWED_EXTENSIONS = {
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 
        'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 
        'png', 'zip'
    }

    # Session Security Controls
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=int(os.environ.get('SESSION_LIFETIME_MINUTES', 15)))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'

    # Brute Force Mitigation Settings
    MAX_FAILED_LOGIN_ATTEMPTS = int(os.environ.get('MAX_FAILED_LOGIN_ATTEMPTS', 5))
    ACCOUNT_LOCKOUT_MINUTES = int(os.environ.get('ACCOUNT_LOCKOUT_MINUTES', 15))
