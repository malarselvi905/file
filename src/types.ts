export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  account_status: 'active' | 'inactive' | 'locked';
  created_at: string;
  last_login: string | null;
  failed_login_attempts?: number;
  locked_until?: string | null;
  file_count?: number;
}

export interface VaultFile {
  id: number;
  owner_id: number;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  encryption_status: 'ENCRYPTED_AES256_GCM' | 'UNENCRYPTED' | 'CORRUPTED';
  encryption_iv: string;
  encryption_tag: string;
  sha256_checksum: string;
  uploaded_at: string;
  updated_at?: string;
  owner_name?: string;
  owner_email?: string;
}

export interface AuditLog {
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

export interface UserStats {
  total_files: number;
  total_storage_bytes: number;
  encryption_cipher: string;
  key_strength: string;
  security_posture: string;
}

export interface AdminOverview {
  total_users: number;
  active_users: number;
  locked_users: number;
  total_files: number;
  total_storage_bytes: number;
  failed_logins: number;
  suspicious_events: number;
}
