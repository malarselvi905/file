from datetime import datetime, timezone
from models import db

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = db.Column(db.String(60), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id', ondelete='SET NULL'), nullable=True)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    status = db.Column(db.Enum('SUCCESS', 'FAILED', 'BLOCKED', 'WARNING', name='audit_statuses'), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    details = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Anonymous',
            'action': self.action,
            'file_id': self.file_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'status': self.status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'details': self.details
        }

class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=False, index=True)
    success = db.Column(db.Boolean, default=False, nullable=False)
    failure_reason = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
