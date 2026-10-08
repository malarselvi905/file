from flask import Blueprint, request, jsonify, session
from models import db
from models.user import User
from models.file import FileRecord
from models.audit_log import AuditLog, LoginAttempt
from services.audit_service import log_security_event
from services.file_service import delete_encrypted_payload
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

def require_admin():
    if session.get('role') != 'admin':
        return False
    return True

@admin_bp.before_request
def check_admin_access():
    if not require_admin():
        user_id = session.get('user_id')
        log_security_event(
            action='UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
            status='BLOCKED',
            details=f"Non-admin access attempted on {request.path}",
            user_id=user_id
        )
        return jsonify({'error': 'Forbidden: Administrator privileges required.'}), 403

@admin_bp.route('/stats', methods=['GET'])
def get_admin_stats():
    total_users = User.query.count()
    active_users = User.query.filter_by(account_status='active').count()
    locked_users = User.query.filter_by(account_status='locked').count()
    total_files = FileRecord.query.count()
    total_storage = db.session.query(func.coalesce(func.sum(FileRecord.file_size), 0)).scalar()
    failed_logins = LoginAttempt.query.filter_by(success=False).count()
    suspicious_events = AuditLog.query.filter(AuditLog.status.in_(['BLOCKED', 'WARNING'])).count()

    recent_logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(15).all()

    return jsonify({
        'overview': {
            'total_users': total_users,
            'active_users': active_users,
            'locked_users': locked_users,
            'total_files': total_files,
            'total_storage_bytes': total_storage,
            'failed_logins': failed_logins,
            'suspicious_events': suspicious_events
        },
        'recent_logs': [l.to_dict() for l in recent_logs]
    }), 200

@admin_bp.route('/users', methods=['GET'])
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200

@admin_bp.route('/users/<int:user_id>/status', methods=['POST'])
def change_user_status(user_id: int):
    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in ['active', 'inactive', 'locked']:
        return jsonify({'error': 'Invalid status option.'}), 400

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found.'}), 404

    prev_status = target_user.account_status
    target_user.account_status = new_status
    if new_status == 'active':
        target_user.failed_login_attempts = 0
        target_user.locked_until = None

    db.session.commit()

    log_security_event(
        action='USER_STATUS_CHANGE',
        status='SUCCESS',
        details=f"Admin {session.get('username')} changed user {target_user.username} status from {prev_status} to {new_status}",
        user_id=session.get('user_id')
    )

    return jsonify({'message': f"User status updated to {new_status}", 'user': target_user.to_dict()}), 200

@admin_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    action_filter = request.args.get('action')
    status_filter = request.args.get('status')
    user_filter = request.args.get('user_id')

    query = AuditLog.query

    if action_filter:
        query = query.filter_by(action=action_filter)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if user_filter:
        query = query.filter_by(user_id=int(user_filter))

    logs = query.order_by(AuditLog.timestamp.desc()).limit(100).all()
    return jsonify({'logs': [l.to_dict() for l in logs]}), 200

@admin_bp.route('/files', methods=['GET'])
def list_all_files():
    files = FileRecord.query.order_by(FileRecord.uploaded_at.desc()).all()
    result = []
    for f in files:
        d = f.to_dict()
        d['owner_name'] = f.owner.username if f.owner else 'Deleted User'
        result.append(d)
    return jsonify({'files': result}), 200

@admin_bp.route('/files/<int:file_id>', methods=['DELETE'])
def admin_delete_file(file_id: int):
    file_rec = FileRecord.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found.'}), 404

    name = file_rec.original_filename
    delete_encrypted_payload(file_rec.stored_filename)
    db.session.delete(file_rec)
    db.session.commit()

    log_security_event(
        action='ADMIN_FILE_PURGE',
        status='WARNING',
        details=f"Admin purged file '{name}' owned by user ID {file_rec.owner_id}",
        user_id=session.get('user_id')
    )

    return jsonify({'message': f"File '{name}' purged by admin."}), 200
