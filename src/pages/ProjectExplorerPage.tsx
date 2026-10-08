import React, { useState } from 'react';
import {
  Code2,
  FileCode,
  Download,
  Copy,
  Check,
  Database,
  BookOpen,
  CheckSquare,
  FolderTree,
} from 'lucide-react';

interface ProjectExplorerPageProps {
  onAddToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; description?: string }) => void;
}

export const ProjectExplorerPage: React.FC<ProjectExplorerPageProps> = ({ onAddToast }) => {
  const [selectedFile, setSelectedFile] = useState<string>('schema.sql');
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const fileContents: Record<string, { label: string; language: string; content: string }> = {
    'schema.sql': {
      label: 'database/schema.sql',
      language: 'sql',
      content: `-- ============================================================================
-- Project: Secure File Vault (Cybersecurity Core Project)
-- Database: secure_file_vault
-- Target Engine: MySQL 8.0+ / MariaDB 10.4+ (XAMPP Compatible)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS \`secure_file_vault\` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE \`secure_file_vault\`;

-- Users table with failed login attempts & account lockout
CREATE TABLE \`users\` (
    \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`username\` VARCHAR(50) NOT NULL,
    \`email\` VARCHAR(120) NOT NULL,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`role\` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    \`account_status\` ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active',
    \`failed_login_attempts\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`locked_until\` DATETIME NULL DEFAULT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`last_login\` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_users_username\` (\`username\`),
    UNIQUE KEY \`uq_users_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Files table with AES-256-GCM metadata
CREATE TABLE \`files\` (
    \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`owner_id\` INT UNSIGNED NOT NULL,
    \`original_filename\` VARCHAR(255) NOT NULL,
    \`stored_filename\` VARCHAR(255) NOT NULL,
    \`file_size\` BIGINT UNSIGNED NOT NULL,
    \`file_type\` VARCHAR(120) NOT NULL,
    \`storage_path\` VARCHAR(500) NOT NULL,
    \`encryption_status\` ENUM('ENCRYPTED_AES256_GCM', 'UNENCRYPTED', 'CORRUPTED') NOT NULL DEFAULT 'ENCRYPTED_AES256_GCM',
    \`encryption_iv\` VARCHAR(64) NOT NULL,
    \`encryption_tag\` VARCHAR(64) NOT NULL,
    \`sha256_checksum\` CHAR(64) NOT NULL,
    \`uploaded_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_files_stored_filename\` (\`stored_filename\`),
    INDEX \`idx_files_owner_id\` (\`owner_id\`),
    CONSTRAINT \`fk_files_owner\` FOREIGN KEY (\`owner_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit logs recording non-repudiation security events
CREATE TABLE \`audit_logs\` (
    \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` INT UNSIGNED NULL DEFAULT NULL,
    \`action\` VARCHAR(60) NOT NULL,
    \`file_id\` INT UNSIGNED NULL DEFAULT NULL,
    \`ip_address\` VARCHAR(45) NOT NULL,
    \`user_agent\` VARCHAR(255) NULL DEFAULT NULL,
    \`status\` ENUM('SUCCESS', 'FAILED', 'BLOCKED', 'WARNING') NOT NULL,
    \`timestamp\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`details\` TEXT NULL,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_audit_logs_user_action\` (\`user_id\`, \`action\`),
    CONSTRAINT \`fk_audit_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    },
    'services/encryption.py': {
      label: 'services/encryption.py',
      language: 'python',
      content: `"""
Cryptographic Service Module
Server-side authenticated encryption at rest using AES-256-GCM (NIST SP 800-38D).
"""
import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app

def get_encryption_key() -> bytes:
    key = current_app.config.get('ENCRYPTION_KEY')
    if not key or len(key) != 32:
        raise ValueError("Invalid AES-256 key: Key must be exactly 32 bytes.")
    return key

def encrypt_file(file_bytes: bytes) -> dict:
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    
    # 96-bit (12-byte) initialization vector / nonce
    iv = os.urandom(12)
    sha256_checksum = hashlib.sha256(file_bytes).hexdigest()
    
    # Authenticated payload includes 16-byte MAC tag
    encrypted_payload = aesgcm.encrypt(iv, file_bytes, None)
    auth_tag = encrypted_payload[-16:]
    
    return {
        'ciphertext_with_tag': encrypted_payload,
        'iv_hex': iv.hex(),
        'auth_tag_hex': auth_tag.hex(),
        'sha256_checksum': sha256_checksum,
        'cipher_size': len(encrypted_payload)
    }

def decrypt_file(encrypted_payload: bytes, iv_hex: str) -> bytes:
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    iv = bytes.fromhex(iv_hex)
    return aesgcm.decrypt(iv, encrypted_payload, None)`,
    },
    'routes/files.py': {
      label: 'routes/files.py',
      language: 'python',
      content: `from flask import Blueprint, request, jsonify, session, Response
from models import db
from models.file import FileRecord
from services.encryption import encrypt_file, decrypt_file
from services.file_service import sanitize_user_filename, generate_vault_storage_name, save_encrypted_payload, read_encrypted_payload
from services.audit_service import log_security_event

files_bp = Blueprint('files', __name__)

@files_bp.route('/download/<int:file_id>', methods=['GET'])
def download_file(file_id: int):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    file_rec = FileRecord.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found.'}), 404

    # IDOR Protection: Strict ownership verification
    if file_rec.owner_id != user_id and session.get('role') != 'admin':
        log_security_event(
            action='UNAUTHORIZED_ACCESS_ATTEMPT',
            status='BLOCKED',
            details=f"IDOR attempt: User {user_id} tried downloading foreign file {file_id}",
            user_id=user_id,
            file_id=file_id
        )
        return jsonify({'error': 'Access denied: Resource ownership violation.'}), 403

    encrypted_bytes = read_encrypted_payload(file_rec.stored_filename)
    plaintext_bytes = decrypt_file(encrypted_bytes, file_rec.encryption_iv)

    log_security_event(
        action='FILE_DOWNLOAD_DECRYPTED',
        status='SUCCESS',
        details=f"Decrypted '{file_rec.original_filename}'",
        user_id=user_id,
        file_id=file_rec.id
    )

    response = Response(plaintext_bytes, mimetype=file_rec.file_type)
    response.headers['Content-Disposition'] = f'attachment; filename="{file_rec.original_filename}"'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-store, private'
    return response`,
    },
    'app.py': {
      label: 'app.py',
      language: 'python',
      content: `import os
from flask import Flask, jsonify
from config import Config
from models import db
from routes.auth import auth_bp
from routes.files import files_bp
from routes.dashboard import dashboard_bp
from routes.admin import admin_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Content-Security-Policy'] = "default-src 'self';"
        return response

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)`,
    },
    'requirements.txt': {
      label: 'requirements.txt',
      language: 'text',
      content: `Flask==3.0.3
Werkzeug==3.0.3
Flask-SQLAlchemy==3.1.1
Flask-WTF==1.2.1
cryptography==42.0.8
PyMySQL==1.1.1
python-dotenv==1.0.1
email-validator==2.1.1`,
    },
    'README.md': {
      label: 'README.md (Windows + XAMPP + VS Code)',
      language: 'markdown',
      content: `# Secure File Vault - Local Setup Guide (Windows + VS Code + XAMPP)

1. Start XAMPP Control Panel and start MySQL on port 3306.
2. In phpMyAdmin, import database/schema.sql.
3. Open project in VS Code.
4. Create and activate virtual environment:
   python -m venv venv
   .\\venv\\Scripts\\activate
5. Install dependencies:
   pip install -r requirements.txt
6. Configure .env with SECRET_KEY and ENCRYPTION_KEY.
7. Run:
   python app.py
8. Access at http://127.0.0.1:5000`,
    },
    'TESTING_CHECKLIST.md': {
      label: 'TESTING_CHECKLIST.md',
      language: 'markdown',
      content: `| Test ID | Test Case | Vector | Expected Result | Status |
|---|---|---|---|---|
| TC-SEC-01 | Password Complexity | "123" | Rejected (Enforces 8+ chars, upper, lower, digits, symbols) | PASSED |
| TC-SEC-02 | Password Hashing | "User@Vault2026!" | Hashed with Werkzeug PBKDF2/scrypt | PASSED |
| TC-SEC-04 | Account Lockout | 5 Bad Passwords | Account locked 15 minutes, audit alert generated | PASSED |
| TC-SEC-05 | IDOR Prevention | Download foreign ID | 403 Forbidden + UNAUTHORIZED_ACCESS_ATTEMPT log | PASSED |
| TC-SEC-09 | Path Traversal | ../../../../etc/passwd | Stripped to basename and saved as vault_<uuid>.enc | PASSED |
| TC-SEC-11 | AES-256-GCM | Encrypt at rest | Ciphertext stored outside web root with 96-bit IV | PASSED |
| TC-SEC-13 | Tamper Check | 1-bit ciphertext flip | GCM authentication tag mismatch halts decryption | PASSED |`,
    },
  };

  const copyCode = () => {
    navigator.clipboard.writeText(fileContents[selectedFile]?.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onAddToast({
      type: 'success',
      title: 'Copied to Clipboard',
      description: `Copied ${fileContents[selectedFile]?.label} contents.`,
    });
  };

  const downloadZip = async () => {
    setDownloadingZip(true);
    try {
      const res = await fetch('/api/export-project');
      if (!res.ok) throw new Error('Failed to generate ZIP package.');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'secure_file_vault_complete_python_flask_project.zip';
      a.click();
      URL.revokeObjectURL(url);

      onAddToast({
        type: 'success',
        title: 'Project ZIP Downloaded',
        description: 'Complete Python Flask, MySQL schema, and docs ready for Windows/VS Code.',
      });
    } catch (err: any) {
      onAddToast({
        type: 'error',
        title: 'Download Failed',
        description: err.message,
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase mb-1">
            <Code2 className="w-4 h-4" />
            <span>Academic Submission Package</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Flask Source Code & SQL Schema Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inspect the underlying Python/Flask architecture, cryptography routines, and MySQL schema.
          </p>
        </div>

        <button
          onClick={downloadZip}
          disabled={downloadingZip}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-cyan-600/20 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloadingZip ? 'Packaging ZIP...' : 'Download Complete Flask Project (ZIP)'}</span>
        </button>
      </div>

      {/* Code Viewer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Tree Selector (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <span>Project Files Index</span>
          </div>

          <div className="space-y-1">
            {Object.entries(fileContents).map(([key, item]) => (
              <button
                key={key}
                onClick={() => setSelectedFile(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors text-left ${
                  selectedFile === key
                    ? 'bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {key.endsWith('.sql') ? (
                    <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : key.endsWith('.md') ? (
                    <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate">{key}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
            <p>Target Stack: Python 3.10+, Flask 3.0, MySQL 8.0, XAMPP, VS Code.</p>
            <p>All files saved in repository root.</p>
          </div>
        </div>

        {/* Right Column: Code Display (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-slate-200">
              {fileContents[selectedFile]?.label}
            </span>

            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300 max-h-[550px] overflow-y-auto">
            <pre className="select-text whitespace-pre">
              {fileContents[selectedFile]?.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
