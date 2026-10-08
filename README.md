# Secure File Vault – Secure File Storage and Access Management System
**Cybersecurity Core Project & Enterprise File Vault System**

---

## 1. Project Overview & Architecture
**Secure File Vault** is an academic cybersecurity defense implementation developed to combat common OWASP Top 10 web vulnerabilities including **Insecure Direct Object References (IDOR)**, **Path Traversal**, **Unauthenticated File Exfiltration**, **Brute-Force Credential Stuffing**, and **Data-at-Rest Exposure**.

### Core Defensive Pillars:
1. **Server-Side Authenticated Encryption at Rest (AES-256-GCM)**: Every uploaded file is encrypted with a unique 96-bit (12-byte) initialization vector (IV) and a 128-bit authentication tag before being written to disk outside public static directories.
2. **Cryptographic Integrity & SHA-256 Checksums**: Both pre-encryption and ciphertext integrity are validated on download to thwart tampering.
3. **Defense-in-Depth File Handling**: Extension whitelisting, MIME type inspection, file signature (magic byte) verification, storage in a segregated private folder with UUID filenames (never exposing user names or physical disk paths).
4. **Role-Based Access Control (RBAC)**: Strict segregation between Standard Users (`user`) and Security Administrators (`admin`).
5. **Brute Force Protection & Auto-Lockout**: Progressive delay and account locking after 5 consecutive failed login attempts for 15 minutes.
6. **Immutable Security Audit Logging**: Every authentication event, upload, decrypt-download, file deletion, and blocked unauthorized attempt (IDOR attempt) is recorded with IP address, user agent, timestamp, and security status.

---

## 2. Directory Structure

```text
secure_file_vault/
├── app.py                     # Main application factory and server startup
├── config.py                  # Environment-driven configuration and security limits
├── requirements.txt           # Python dependency specifications
├── .env.example               # Template environment configuration (DO NOT COMMIT REAL .env)
├── README.md                  # Complete academic guide and deployment instructions
├── TESTING_CHECKLIST.md       # Comprehensive testing matrix & verification status
├── database/
│   └── schema.sql             # Production MySQL database schema with indexes & foreign keys
├── models/
│   ├── __init__.py
│   ├── user.py                # User credentials, roles, lockout state tracking
│   ├── file.py                # File metadata, encryption IV, auth tag, SHA-256
│   └── audit_log.py           # Immutable audit log entries and login attempt metrics
├── routes/
│   ├── __init__.py
│   ├── auth.py                # Registration, login, logout, password resets
│   ├── files.py               # Secure file upload, stream download, delete, search
│   ├── dashboard.py           # User dashboard & security statistics
│   └── admin.py               # Administrative oversight, user activation, audit inspection
├── services/
│   ├── __init__.py
│   ├── encryption.py          # Cryptography module (AES-256-GCM encrypt_file & decrypt_file)
│   ├── file_service.py        # Filename sanitization, UUID generation, MIME verification
│   └── audit_service.py       # Helper functions to log system events & detect anomalies
└── uploads/                   # PRIVATE physical vault storage (segregated from public web root)
    └── .gitkeep
```

---

## 3. Technology Stack & Prerequisites

* **Operating System**: Windows 10/11 (or Linux / macOS)
* **Code Editor**: Visual Studio Code (VS Code)
* **Local Web Server / Database**: XAMPP (Apache + MySQL / MariaDB)
* **Backend**: Python 3.10+ & Flask 3.0+
* **ORM & Database Driver**: SQLAlchemy & PyMySQL
* **Cryptography Engine**: Python `cryptography` library (hazmat primitives for AES-256-GCM)
* **Password Hashing**: Werkzeug Security (`scrypt` or `pbkdf2:sha256` with high work factors)

---

## 4. Local Deployment Instructions (Windows + XAMPP + VS Code)

### Step 1: Start XAMPP MySQL Service
1. Open the **XAMPP Control Panel** as Administrator.
2. Click **Start** next to **MySQL** (and Apache if using phpMyAdmin).
3. Confirm that MySQL is running on port `3306`.

### Step 2: Provision Database Schema
1. Open your browser to `http://localhost/phpmyadmin` (or use MySQL CLI: `mysql -u root`).
2. Click the **SQL** tab.
3. Open `database/schema.sql` (or `/schema.sql`), copy the entire SQL script, paste it into phpMyAdmin, and click **Go**.
4. The database `secure_file_vault` will be created with `users`, `files`, `audit_logs`, and `login_attempts` tables.

### Step 3: Set Up Python Virtual Environment
Open **VS Code Terminal** (`Ctrl + ~`) in the project directory:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# (If running standard Windows Command Prompt)
.\venv\Scripts\activate.bat

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy the `.env.example` file to `.env`:

```bash
copy .env.example .env
```

Generate a secure master encryption key (AES-256 requires 32 bytes = 64 hex characters):
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Paste this into `.env`:
```ini
SECRET_KEY=9b48c27940e4f2010839e944719b66c4293f77341e4599ffc71b655da54a4968
DATABASE_URL=mysql+pymysql://root:@localhost:3306/secure_file_vault
ENCRYPTION_KEY=<generated-64-hex-characters-above>
MAX_CONTENT_LENGTH=15728640
UPLOAD_FOLDER=./uploads
```

### Step 5: Start the Flask Application
```bash
python app.py
```
Access the application at `http://127.0.0.1:5000`.

---

## 5. Default Demonstration Credentials

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Security Admin** | `sec_admin` | `Admin@Vault2026!` | Full administrative review, user activation/deactivation, audit trail inspection |
| **User** | `alice_analyst` | `User@Vault2026!` | Personal vault file upload, AES-256-GCM download, individual activity logs |
| **User** | `bob_developer` | `User@Vault2026!` | Multi-tenant isolation testing (ensures Alice cannot access Bob's files) |

---

## 6. Cryptographic Implementation Details

### AES-256-GCM (Galois/Counter Mode)
1. **Master Key**: 256 bits (32 bytes) stored in server environment variable `ENCRYPTION_KEY`.
2. **IV (Nonce)**: 96 bits (12 bytes) cryptographically random bytes generated uniquely per file using `os.urandom(12)`. IV is stored in the database alongside ciphertext metadata.
3. **Authentication Tag**: 128 bits (16 bytes) generated by GCM during encryption. Verifies both authenticity and confidentiality. Any alteration of ciphertext bytes raises `InvalidTag` and halts decryption.
4. **Integrity Checksum**: Pre-encryption SHA-256 digest is calculated and compared upon decryption.

---

## 7. Security Mitigations Checklist

- [x] **IDOR (Broken Access Control)**: Enforced via `WHERE id = :file_id AND owner_id = :current_user_id`. Attempting to access another user's file returns `403 Forbidden` and records an immediate `UNAUTHORIZED_ACCESS_ATTEMPT` audit entry.
- [x] **Path Traversal Protection**: Filenames passed through `werkzeug.utils.secure_filename` and assigned a random UUIDv4 storage identifier. Files are stored outside static paths.
- [x] **No Executables**: Disallows `.exe`, `.bat`, `.sh`, `.php`, `.phtml`, `.py`, `.js`, etc. MIME sniffing checks true payload headers.
- [x] **SQL Injection Defense**: 100% parameterized queries via SQLAlchemy ORM; zero string interpolation in queries.
- [x] **Brute-Force Lockout**: 5 failed attempts locks user account for 15 minutes.
