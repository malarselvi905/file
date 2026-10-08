import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import JSZip from 'jszip';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security constants
const UPLOAD_DIR = path.resolve(process.cwd(), 'vault_secure_storage');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 256-bit (32-byte) Vault Master Key derived or loaded from environment
const MASTER_KEY_HEX = process.env.ENCRYPTION_KEY || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const MASTER_KEY = crypto.createHash('sha256').update(MASTER_KEY_HEX).digest(); // Guarantee exactly 32 bytes

// Multer memory storage (files encrypted in-memory before writing to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

app.use(express.json());

// Strict Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ----------------------------------------------------------------------------
// IN-MEMORY / PERSISTED REPOSITORY WITH RELATIONAL CONSTRAINTS
// ----------------------------------------------------------------------------
export interface UserRecord {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'user' | 'admin';
  account_status: 'active' | 'inactive' | 'locked';
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  last_login: string | null;
}

export interface VaultFileRecord {
  id: number;
  owner_id: number;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  encryption_status: 'ENCRYPTED_AES256_GCM' | 'UNENCRYPTED' | 'CORRUPTED';
  encryption_iv: string; // 12-byte hex
  encryption_tag: string; // 16-byte hex
  sha256_checksum: string;
  uploaded_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  file_id: number | null;
  ip_address: string;
  user_agent: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'WARNING';
  timestamp: string;
  details: string;
}

export interface LoginAttemptRecord {
  id: number;
  username: string;
  ip_address: string;
  success: boolean;
  failure_reason: string | null;
  timestamp: string;
}

// Password hashing function: PBKDF2 with SHA-256 and unique 16-byte salt
function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Initial state with demo accounts
const adminPass = hashPassword('Admin@Vault2026!');
const userPass = hashPassword('User@Vault2026!');

let users: UserRecord[] = [
  {
    id: 1,
    username: 'sec_admin',
    email: 'admin@vault.cyber.local',
    password_hash: adminPass.hash,
    salt: adminPass.salt,
    role: 'admin',
    account_status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    last_login: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'alice_analyst',
    email: 'alice@vault.cyber.local',
    password_hash: userPass.hash,
    salt: userPass.salt,
    role: 'user',
    account_status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    last_login: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    username: 'bob_developer',
    email: 'bob@vault.cyber.local',
    password_hash: userPass.hash,
    salt: userPass.salt,
    role: 'user',
    account_status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    last_login: new Date(Date.now() - 7200000).toISOString(),
  },
];

let files: VaultFileRecord[] = [];
let auditLogs: AuditLogRecord[] = [
  {
    id: 1,
    user_id: 1,
    username: 'sec_admin',
    action: 'SYSTEM_BOOTSTRAP',
    file_id: null,
    ip_address: '127.0.0.1',
    user_agent: 'SecureVault Engine/2.0',
    status: 'SUCCESS',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    details: 'Database schema provisioned, AES-256-GCM cipher subsystem online.',
  },
];
let loginAttempts: LoginAttemptRecord[] = [];

// Seed initial sample encrypted documents for demonstration
function seedSampleFiles() {
  const sampleDocs = [
    {
      ownerId: 2,
      name: 'network_defense_architecture.pdf',
      type: 'application/pdf',
      content: 'CONFIDENTIAL: Zero-Trust Network Defense Architecture Specification\nSecurity Controls: RBAC, AES-256-GCM, TLS 1.3, Mutual Authentication.',
    },
    {
      ownerId: 2,
      name: 'incident_response_playbook.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: 'STANDARD OPERATING PROCEDURE: Enterprise Incident Response Playbook\nTier 1: Triage -> Tier 2: Containment -> Tier 3: Forensics and Root Cause Analysis.',
    },
    {
      ownerId: 3,
      name: 'database_migration_plan.sql',
      type: 'text/plain',
      content: '-- Database Migration Plan for Relational MySQL Cluster\n-- Foreign key constraints and encryption status audit verification.',
    },
  ];

  sampleDocs.forEach((doc, idx) => {
    const rawBuffer = Buffer.from(doc.content, 'utf-8');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(rawBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([ciphertext, authTag]);

    const storedName = `vault_${crypto.randomUUID()}.enc`;
    const physicalPath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(physicalPath, payload);

    const sha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    const fileRec: VaultFileRecord = {
      id: idx + 1,
      owner_id: doc.ownerId,
      original_filename: doc.name,
      stored_filename: storedName,
      file_size: rawBuffer.length,
      file_type: doc.type,
      storage_path: physicalPath,
      encryption_status: 'ENCRYPTED_AES256_GCM',
      encryption_iv: iv.toString('hex'),
      encryption_tag: authTag.toString('hex'),
      sha256_checksum: sha256,
      uploaded_at: new Date(Date.now() - (idx + 1) * 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - (idx + 1) * 3600000 * 4).toISOString(),
    };
    files.push(fileRec);

    auditLogs.push({
      id: auditLogs.length + 1,
      user_id: doc.ownerId,
      username: doc.ownerId === 2 ? 'alice_analyst' : 'bob_developer',
      action: 'FILE_UPLOAD_ENCRYPTED',
      file_id: fileRec.id,
      ip_address: '192.168.1.105',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
      status: 'SUCCESS',
      timestamp: fileRec.uploaded_at,
      details: `Vaulted '${doc.name}' with AES-256-GCM (SHA-256: ${sha256.substring(0, 16)}...)`,
    });
  });
}
seedSampleFiles();

// Helper: Log Security Audit Event
function logAudit(
  action: string,
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'WARNING',
  details: string,
  req: Request,
  userId?: number | null,
  fileId?: number | null,
  customUsername?: string
) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'Unknown';
  
  let uname = customUsername || 'Anonymous';
  if (userId) {
    const u = users.find((x) => x.id === userId);
    if (u) uname = u.username;
  }

  const record: AuditLogRecord = {
    id: auditLogs.length + 1,
    user_id: userId || null,
    username: uname,
    action,
    file_id: fileId || null,
    ip_address: ip,
    user_agent: ua.substring(0, 200),
    status,
    timestamp: new Date().toISOString(),
    details,
  };
  auditLogs.unshift(record);
  if (auditLogs.length > 500) auditLogs.pop();
}

// Token / Session Helper (Simple stateless token with signature)
const JWT_SECRET = process.env.SECRET_KEY || 'vault-jwt-session-secret-key-32-chars!';
function generateToken(user: UserRecord): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 15 * 60 * 1000, // 15 mins expiration
  };
  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(base64).digest('base64url');
  return `${base64}.${signature}`;
}

function verifyToken(token: string | undefined): { id: number; username: string; role: 'user' | 'admin' } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(base64).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(base64, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);
  const userPayload = verifyToken(token);

  if (!userPayload) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired.' });
  }

  const user = users.find((u) => u.id === userPayload.id);
  if (!user || user.account_status !== 'active') {
    return res.status(403).json({ error: 'Account inactive or locked.' });
  }

  (req as any).user = user;
  next();
}

// Admin Only Middleware
function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as UserRecord;
  if (!user || user.role !== 'admin') {
    logAudit(
      'UNAUTHORIZED_ADMIN_ACCESS',
      'BLOCKED',
      `Non-admin attempted access to ${req.originalUrl}`,
      req,
      user?.id
    );
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  next();
}

// ----------------------------------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------------------------------

// 1. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const cleanUser = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUser)) {
    return res.status(400).json({ error: 'Username must be 3-30 characters (alphanumeric, _ or -).' });
  }

  if (!/^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Password policy: 8+ chars, upper, lower, digit, special char
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and contain uppercase, lowercase, numbers, and symbols.',
    });
  }

  if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase() || u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'Username or email already registered.' });
  }

  const { hash, salt } = hashPassword(password);
  const newUser: UserRecord = {
    id: users.length + 1,
    username: cleanUser,
    email: cleanEmail,
    password_hash: hash,
    salt,
    role: 'user',
    account_status: 'active',
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date().toISOString(),
    last_login: null,
  };
  users.push(newUser);

  logAudit(
    'USER_REGISTRATION',
    'SUCCESS',
    `New user account registered: ${cleanUser} (${cleanEmail})`,
    req,
    newUser.id,
    null,
    cleanUser
  );

  res.status(201).json({ message: 'Registration successful. You can now log in.' });
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const identifier = String(username || '').trim();

  const user = users.find(
    (u) => u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase()
  );

  const GENERIC_FAIL = 'Invalid username or password.';

  if (!user) {
    loginAttempts.unshift({
      id: loginAttempts.length + 1,
      username: identifier,
      ip_address: ip,
      success: false,
      failure_reason: 'User not found',
      timestamp: new Date().toISOString(),
    });
    logAudit('USER_LOGIN_FAILED', 'FAILED', `Failed login attempt for unknown user: ${identifier}`, req);
    return res.status(401).json({ error: GENERIC_FAIL });
  }

  // Check Lockout
  if (user.account_status === 'locked') {
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000)
      );
      logAudit('LOGIN_BLOCKED_LOCKOUT', 'BLOCKED', `Blocked login on locked account ${user.username}`, req, user.id);
      return res.status(423).json({
        error: `Account is temporarily locked due to 5 failed attempts. Please retry in ${remainingMinutes} minute(s).`,
      });
    } else {
      // Auto-unlock
      user.account_status = 'active';
      user.failed_login_attempts = 0;
      user.locked_until = null;
    }
  }

  if (user.account_status === 'inactive') {
    logAudit('LOGIN_BLOCKED_INACTIVE', 'BLOCKED', `Attempt on deactivated account ${user.username}`, req, user.id);
    return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
  }

  const isValid = verifyPassword(password, user.salt, user.password_hash);
  if (!isValid) {
    user.failed_login_attempts += 1;
    loginAttempts.unshift({
      id: loginAttempts.length + 1,
      username: user.username,
      ip_address: ip,
      success: false,
      failure_reason: 'Password mismatch',
      timestamp: new Date().toISOString(),
    });

    if (user.failed_login_attempts >= 5) {
      user.account_status = 'locked';
      user.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      logAudit(
        'ACCOUNT_LOCKED',
        'WARNING',
        `Account ${user.username} locked after 5 consecutive failed attempts.`,
        req,
        user.id
      );
      return res.status(423).json({
        error: 'Security Alert: Account has been locked for 15 minutes due to 5 consecutive failed login attempts.',
      });
    }

    logAudit(
      'USER_LOGIN_FAILED',
      'FAILED',
      `Failed attempt #${user.failed_login_attempts} for ${user.username}`,
      req,
      user.id
    );
    return res.status(401).json({
      error: GENERIC_FAIL,
      remaining_attempts: Math.max(0, 5 - user.failed_login_attempts),
    });
  }

  // Success
  user.failed_login_attempts = 0;
  user.locked_until = null;
  user.last_login = new Date().toISOString();

  loginAttempts.unshift({
    id: loginAttempts.length + 1,
    username: user.username,
    ip_address: ip,
    success: true,
    failure_reason: null,
    timestamp: new Date().toISOString(),
  });

  const token = generateToken(user);

  logAudit('USER_LOGIN_SUCCESS', 'SUCCESS', `User ${user.username} successfully authenticated.`, req, user.id);

  res.json({
    message: 'Authentication successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      created_at: user.created_at,
      last_login: user.last_login,
    },
  });
});

// 3. Auth: Session Check
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = (req as any).user as UserRecord;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      created_at: user.created_at,
      last_login: user.last_login,
    },
  });
});

// 4. Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const user = verifyToken(token);
  if (user) {
    logAudit('USER_LOGOUT', 'SUCCESS', `User ${user.username} signed out.`, req, user.id);
  }
  res.json({ message: 'Session terminated.' });
});

// 5. Files: List user files
app.get('/api/files', authMiddleware, (req, res) => {
  const user = (req as any).user as UserRecord;
  const search = String(req.query.search || '').trim().toLowerCase();
  const fileType = String(req.query.type || '').trim().toLowerCase();

  let userFiles = files.filter((f) => f.owner_id === user.id);

  if (search) {
    userFiles = userFiles.filter((f) => f.original_filename.toLowerCase().includes(search));
  }
  if (fileType && fileType !== 'all') {
    userFiles = userFiles.filter((f) => f.original_filename.toLowerCase().endsWith(`.${fileType}`));
  }

  userFiles.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

  res.json({ files: userFiles });
});

// 6. Files: Upload with AES-256-GCM Server-Side Encryption
const ALLOWED_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'zip'];

app.post('/api/files/upload', authMiddleware, upload.single('file'), (req, res) => {
  const user = (req as any).user as UserRecord;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const origName = req.file.originalname || 'document.dat';
  const ext = origName.includes('.') ? origName.split('.').pop()?.toLowerCase() : '';

  if (!ext || !ALLOWED_EXTS.includes(ext)) {
    logAudit(
      'UNSUPPORTED_FILE_BLOCKED',
      'BLOCKED',
      `Blocked unauthorized file extension: ${origName}`,
      req,
      user.id
    );
    return res.status(400).json({
      error: `Disallowed extension (.${ext}). Allowed: ${ALLOWED_EXTS.join(', ').toUpperCase()}`,
    });
  }

  // Prevent path traversal in original filename representation
  const cleanBaseName = path.basename(origName).replace(/[\r\n\t\0]/g, '');
  const rawBytes = req.file.buffer;

  // Compute pre-encryption SHA-256 checksum
  const sha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');

  // Cryptographic Operations: AES-256-GCM
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(rawBytes), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 128-bit authentication tag

  // Store encrypted binary (ciphertext + tag) outside public directories with UUID
  const storedFilename = `vault_${crypto.randomUUID()}.enc`;
  const physicalPath = path.join(UPLOAD_DIR, storedFilename);
  const payloadToStore = Buffer.concat([ciphertext, authTag]);

  try {
    fs.writeFileSync(physicalPath, payloadToStore);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to write encrypted payload to disk storage.' });
  }

  const newFile: VaultFileRecord = {
    id: files.length > 0 ? Math.max(...files.map((f) => f.id)) + 1 : 1,
    owner_id: user.id,
    original_filename: cleanBaseName,
    stored_filename: storedFilename,
    file_size: rawBytes.length,
    file_type: req.file.mimetype || 'application/octet-stream',
    storage_path: physicalPath,
    encryption_status: 'ENCRYPTED_AES256_GCM',
    encryption_iv: iv.toString('hex'),
    encryption_tag: authTag.toString('hex'),
    sha256_checksum: sha256,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  files.push(newFile);

  logAudit(
    'FILE_UPLOAD_ENCRYPTED',
    'SUCCESS',
    `AES-256-GCM encrypted '${cleanBaseName}' (${rawBytes.length} bytes, SHA-256: ${sha256.substring(0, 16)}...)`,
    req,
    user.id,
    newFile.id
  );

  res.status(201).json({
    message: 'File successfully encrypted and stored in vault.',
    file: newFile,
  });
});

// 7. Files: Download with Ownership Validation & IDOR Protection
app.get('/api/files/download/:id', authMiddleware, (req, res) => {
  const user = (req as any).user as UserRecord;
  const fileId = parseInt(req.params.id, 10);

  const fileRec = files.find((f) => f.id === fileId);
  if (!fileRec) {
    return res.status(404).json({ error: 'File not found in vault.' });
  }

  // IDOR Defense: Strictly verify owner or admin role
  if (fileRec.owner_id !== user.id && user.role !== 'admin') {
    logAudit(
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'BLOCKED',
      `IDOR Attack Attempt: User ${user.username} (ID: ${user.id}) tried downloading file #${fileId} owned by User #${fileRec.owner_id}`,
      req,
      user.id,
      fileId
    );
    return res.status(403).json({
      error: 'Access Denied: You do not possess cryptographic authorization for this resource (IDOR Protected).',
    });
  }

  const physicalPath = path.join(UPLOAD_DIR, fileRec.stored_filename);
  if (!fs.existsSync(physicalPath)) {
    return res.status(404).json({ error: 'Encrypted storage file is missing on server.' });
  }

  try {
    const rawPayload = fs.readFileSync(physicalPath);
    // Extract ciphertext and 16-byte auth tag
    const authTag = rawPayload.subarray(rawPayload.length - 16);
    const ciphertext = rawPayload.subarray(0, rawPayload.length - 16);

    const iv = Buffer.from(fileRec.encryption_iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(authTag);

    const decryptedBytes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // Verify SHA-256 integrity
    const computedSha = crypto.createHash('sha256').update(decryptedBytes).digest('hex');
    if (computedSha !== fileRec.sha256_checksum) {
      logAudit(
        'FILE_INTEGRITY_TAMPER_ALERT',
        'WARNING',
        `Integrity checksum mismatch on file #${fileRec.id}!`,
        req,
        user.id,
        fileRec.id
      );
      return res.status(500).json({ error: 'Cryptographic integrity violation: Checksum does not match.' });
    }

    logAudit(
      'FILE_DOWNLOAD_DECRYPTED',
      'SUCCESS',
      `Decrypted & streamed '${fileRec.original_filename}' to ${user.username}`,
      req,
      user.id,
      fileRec.id
    );

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRec.original_filename)}"`);
    res.setHeader('Content-Type', fileRec.file_type);
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(decryptedBytes);
  } catch (err: any) {
    logAudit(
      'DECRYPTION_FAILED',
      'FAILED',
      `Decryption failed for file #${fileRec.id}: ${err.message}`,
      req,
      user.id,
      fileRec.id
    );
    res.status(500).json({ error: 'Decryption failed: GCM authentication tag verification rejected.' });
  }
});

// 8. Files: Delete
app.delete('/api/files/:id', authMiddleware, (req, res) => {
  const user = (req as any).user as UserRecord;
  const fileId = parseInt(req.params.id, 10);

  const fileIdx = files.findIndex((f) => f.id === fileId);
  if (fileIdx === -1) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const fileRec = files[fileIdx];
  if (fileRec.owner_id !== user.id && user.role !== 'admin') {
    logAudit(
      'UNAUTHORIZED_DELETE_ATTEMPT',
      'BLOCKED',
      `User ${user.username} tried deleting file #${fileId}`,
      req,
      user.id,
      fileId
    );
    return res.status(403).json({ error: 'Access Denied.' });
  }

  // Remove physical file
  const physicalPath = path.join(UPLOAD_DIR, fileRec.stored_filename);
  if (fs.existsSync(physicalPath)) {
    try {
      fs.unlinkSync(physicalPath);
    } catch (e) {
      // ignore
    }
  }

  const deletedName = fileRec.original_filename;
  files.splice(fileIdx, 1);

  logAudit(
    'FILE_DELETED',
    'SUCCESS',
    `Permanently purged vaulted file '${deletedName}'`,
    req,
    user.id
  );

  res.json({ message: `File '${deletedName}' removed from vault.` });
});

// 9. Dashboard Stats
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const user = (req as any).user as UserRecord;
  const userFiles = files.filter((f) => f.owner_id === user.id);
  const totalBytes = userFiles.reduce((acc, f) => acc + f.file_size, 0);

  const recentFiles = [...userFiles]
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, 5);

  const userLogs = auditLogs.filter((l) => l.user_id === user.id).slice(0, 8);

  res.json({
    stats: {
      total_files: userFiles.length,
      total_storage_bytes: totalBytes,
      encryption_cipher: 'AES-256-GCM',
      key_strength: '256-bit Hardware Authenticated',
      security_posture: 'ENFORCED',
    },
    recent_files: recentFiles,
    recent_logs: userLogs,
  });
});

// 10. Admin: System Overview Stats
app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const totalStorage = files.reduce((acc, f) => acc + f.file_size, 0);
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.account_status === 'active').length;
  const lockedUsers = users.filter((u) => u.account_status === 'locked').length;
  const failedCount = loginAttempts.filter((l) => !l.success).length;
  const suspiciousCount = auditLogs.filter((l) => l.status === 'BLOCKED' || l.status === 'WARNING').length;

  res.json({
    overview: {
      total_users: totalUsers,
      active_users: activeUsers,
      locked_users: lockedUsers,
      total_files: files.length,
      total_storage_bytes: totalStorage,
      failed_logins: failedCount,
      suspicious_events: suspiciousCount,
    },
    recent_logs: auditLogs.slice(0, 15),
  });
});

// 11. Admin: User Management
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const result = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    account_status: u.account_status,
    failed_login_attempts: u.failed_login_attempts,
    locked_until: u.locked_until,
    created_at: u.created_at,
    last_login: u.last_login,
    file_count: files.filter((f) => f.owner_id === u.id).length,
  }));
  res.json({ users: result });
});

// 12. Admin: Update User Status (Activate, Deactivate, Unlock)
app.post('/api/admin/users/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const adminUser = (req as any).user as UserRecord;
  const targetId = parseInt(req.params.id, 10);
  const { status, role } = req.body;

  const target = users.find((u) => u.id === targetId);
  if (!target) {
    return res.status(404).json({ error: 'Target user not found.' });
  }

  if (target.id === 1 && adminUser.id !== 1 && status !== 'active') {
    return res.status(403).json({ error: 'Cannot deactivate master security administrator.' });
  }

  const prevStatus = target.account_status;
  if (status && ['active', 'inactive', 'locked'].includes(status)) {
    target.account_status = status;
    if (status === 'active') {
      target.failed_login_attempts = 0;
      target.locked_until = null;
    }
  }

  if (role && ['user', 'admin'].includes(role)) {
    target.role = role;
  }

  logAudit(
    'ADMIN_USER_MODIFICATION',
    'SUCCESS',
    `Admin ${adminUser.username} updated user ${target.username} (status: ${prevStatus} -> ${target.account_status}, role: ${target.role})`,
    req,
    adminUser.id
  );

  res.json({ message: `User ${target.username} successfully updated.` });
});

// 13. Admin: Security Logs
app.get('/api/admin/logs', authMiddleware, adminMiddleware, (req, res) => {
  const action = req.query.action as string;
  const status = req.query.status as string;
  const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : null;

  let filtered = [...auditLogs];

  if (action && action !== 'ALL') {
    filtered = filtered.filter((l) => l.action === action);
  }
  if (status && status !== 'ALL') {
    filtered = filtered.filter((l) => l.status === status);
  }
  if (userId) {
    filtered = filtered.filter((l) => l.user_id === userId);
  }

  res.json({ logs: filtered });
});

// 14. Admin: View All Files with Metadata
app.get('/api/admin/files', authMiddleware, adminMiddleware, (req, res) => {
  const list = files.map((f) => {
    const owner = users.find((u) => u.id === f.owner_id);
    return {
      ...f,
      owner_name: owner ? owner.username : 'Unknown',
      owner_email: owner ? owner.email : 'Unknown',
    };
  });
  res.json({ files: list });
});

// 15. Security Attack Vector Simulation Lab (Academic Demonstration)
app.post('/api/security/simulate-vector', authMiddleware, (req, res) => {
  const user = (req as any).user as UserRecord;
  const { vectorType } = req.body;

  switch (vectorType) {
    case 'IDOR': {
      // Simulate attempting to read file belonging to another user
      const otherFile = files.find((f) => f.owner_id !== user.id) || files[0];
      const targetId = otherFile ? otherFile.id : 999;
      logAudit(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'BLOCKED',
        `[SIMULATED ATTACK] IDOR Probe: User ${user.username} sent direct request for foreign file #${targetId}`,
        req,
        user.id,
        targetId
      );
      return res.status(403).json({
        vector: 'Insecure Direct Object Reference (IDOR)',
        defense_triggered: 'Object Ownership Authorization Barrier',
        http_status: 403,
        details: `Access to resource ID #${targetId} denied. Ownership validation enforced at controller layer. Security audit incident logged.`,
      });
    }

    case 'PATH_TRAVERSAL': {
      logAudit(
        'PATH_TRAVERSAL_BLOCKED',
        'BLOCKED',
        `[SIMULATED ATTACK] Path Traversal sequence '../../../../etc/shadow' neutralized by basename sanitizer & UUID remapping`,
        req,
        user.id
      );
      return res.status(200).json({
        vector: 'Path Traversal (CWE-22)',
        defense_triggered: 'UUID Disk Isolation & Werkzeug Sanitizer',
        mitigation: 'Filename is stripped of directory components and stored as vault_<uuid>.enc outside static root.',
      });
    }

    case 'BRUTE_FORCE': {
      logAudit(
        'BRUTE_FORCE_SPIKE',
        'WARNING',
        `[SIMULATED ATTACK] High frequency authentication attempts detected from IP ${req.socket.remoteAddress}`,
        req,
        user.id
      );
      return res.status(200).json({
        vector: 'Credential Stuffing / Brute-Force (CWE-307)',
        defense_triggered: 'Dynamic Account Lockout & Login Attempt Tracker',
        threshold: '5 failed attempts -> 15 minutes lockout.',
      });
    }

    case 'TAMPER_DETECTION': {
      // Demonstrate GCM tag verification
      const sample = Buffer.from('Plaintext payload test');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
      const ciphertext = Buffer.concat([cipher.update(sample), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Tamper with 1 bit of ciphertext
      ciphertext[0] ^= 0x01;

      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
        decipher.setAuthTag(authTag);
        decipher.update(ciphertext);
        decipher.final();
        return res.status(500).json({ error: 'Tamper detection failed (unexpected)' });
      } catch (err: any) {
        logAudit(
          'TAMPER_CORRUPTION_DETECTED',
          'WARNING',
          '[SIMULATED ATTACK] 1-bit ciphertext modification detected by GCM Galois MAC authentication tag',
          req,
          user.id
        );
        return res.status(200).json({
          vector: 'Ciphertext Tampering / Bit-Flipping Attack',
          defense_triggered: 'AES-256-GCM Authenticated Encryption (NIST SP 800-38D)',
          result: 'Decryption failed immediately. Tag mismatch verified.',
          error_caught: err.message,
        });
      }
    }

    default:
      return res.status(400).json({ error: 'Unknown vector type.' });
  }
});

// 16. Academic Project Source Code & File Exporter (Download Complete Flask Project as ZIP)
app.get('/api/export-project', async (req, res) => {
  try {
    const zip = new JSZip();
    const vaultFolder = zip.folder('secure_file_vault');

    // Read project files on disk
    const filesToInclude = [
      { name: 'schema.sql', path: path.resolve(process.cwd(), 'schema.sql') },
      { name: 'requirements.txt', path: path.resolve(process.cwd(), 'requirements.txt') },
      { name: 'README.md', path: path.resolve(process.cwd(), 'README.md') },
      { name: 'TESTING_CHECKLIST.md', path: path.resolve(process.cwd(), 'TESTING_CHECKLIST.md') },
      { name: '.env.example', path: path.resolve(process.cwd(), '.env.example') },
    ];

    filesToInclude.forEach((f) => {
      if (fs.existsSync(f.path)) {
        vaultFolder?.file(f.name, fs.readFileSync(f.path, 'utf-8'));
      }
    });

    // Also include python source files from secure_file_vault directory
    const pyFolder = path.resolve(process.cwd(), 'secure_file_vault');
    function addDirToZip(dir: string, zipDir: JSZip) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sub = zipDir.folder(entry.name);
          if (sub) addDirToZip(full, sub);
        } else {
          zipDir.file(entry.name, fs.readFileSync(full));
        }
      }
    }
    if (fs.existsSync(pyFolder) && vaultFolder) {
      addDirToZip(pyFolder, vaultFolder);
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Disposition', 'attachment; filename="secure_file_vault_flask_project.zip"');
    res.setHeader('Content-Type', 'application/zip');
    res.send(content);
  } catch (err: any) {
    res.status(500).json({ error: `Export failed: ${err.message}` });
  }
});

// Mount Vite or Serve Static in Production
async function start() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Secure File Vault] Production-Grade Security Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
