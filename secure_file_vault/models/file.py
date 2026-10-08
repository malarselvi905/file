from datetime import datetime, timezone
from models import db

class FileRecord(db.Model):
    __tablename__ = 'files'

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), unique=True, nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    file_type = db.Column(db.String(120), nullable=False)
    storage_path = db.Column(db.String(500), nullable=False)
    encryption_status = db.Column(
        db.Enum('ENCRYPTED_AES256_GCM', 'UNENCRYPTED', 'CORRUPTED', name='enc_status'),
        default='ENCRYPTED_AES256_GCM',
        nullable=False
    )
    encryption_iv = db.Column(db.String(64), nullable=False)
    encryption_tag = db.Column(db.String(64), nullable=False)
    sha256_checksum = db.Column(db.String(64), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'owner_id': self.owner_id,
            'original_filename': self.original_filename,
            'stored_filename': self.stored_filename,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'encryption_status': self.encryption_status,
            'encryption_iv': self.encryption_iv,
            'encryption_tag': self.encryption_tag,
            'sha256_checksum': self.sha256_checksum,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }
