from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from models import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('user', 'admin', name='user_roles'), default='user', nullable=False)
    account_status = db.Column(db.Enum('active', 'inactive', 'locked', name='account_statuses'), default='active', nullable=False)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)

    # Relationships
    files = db.relationship('FileRecord', backref='owner', lazy=True, cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='user', lazy=True)

    def set_password(self, password: str):
        """Hash password using Werkzeug's secure hashing (PBKDF2/scrypt with salt)."""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256:600000')

    def check_password(self, password: str) -> bool:
        """Validate input password against stored cryptographic hash."""
        return check_password_hash(self.password_hash, password)

    def is_locked(self) -> bool:
        """Check if account is temporarily locked due to failed attempts."""
        if self.account_status == 'locked':
            if self.locked_until and datetime.now(timezone.utc) > self.locked_until.replace(tzinfo=timezone.utc if self.locked_until.tzinfo is None else None):
                # Lockout duration has expired, restore active status
                self.account_status = 'active'
                self.failed_login_attempts = 0
                self.locked_until = None
                db.session.commit()
                return False
            return True
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'account_status': self.account_status,
            'failed_login_attempts': self.failed_login_attempts,
            'locked_until': self.locked_until.isoformat() if self.locked_until else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
