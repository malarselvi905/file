"""
Audit Logging Service
Writes immutable security events to the audit_logs table for non-repudiation and threat analysis.
"""

from flask import request
from models import db
from models.audit_log import AuditLog

def log_security_event(action: str, status: str, details: str = None, user_id: int = None, file_id: int = None):
    """
    Record a security-critical action into the audit trail.
    
    Args:
        action: Identifier like 'USER_LOGIN_SUCCESS', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'FILE_UPLOAD_ENCRYPTED'
        status: 'SUCCESS', 'FAILED', 'BLOCKED', or 'WARNING'
        details: Human-readable diagnostic metadata
        user_id: ID of the actor (if authenticated)
        file_id: ID of the targeted file (if applicable)
    """
    try:
        ip_address = request.remote_addr or '127.0.0.1'
        # Normalize forwarded IP behind reverse proxies
        if request.headers.get('X-Forwarded-For'):
            ip_address = request.headers.get('X-Forwarded-For').split(',')[0].strip()
            
        user_agent = request.headers.get('User-Agent', 'Unknown')[:250]

        entry = AuditLog(
            user_id=user_id,
            action=action,
            file_id=file_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as e:
        # Failsafe: Audit failure should not crash application, but roll back transaction
        db.session.rollback()
