from flask import Blueprint, jsonify, session
from models import db
from models.file import FileRecord
from models.audit_log import AuditLog
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
def get_user_dashboard():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    total_files = FileRecord.query.filter_by(owner_id=user_id).count()
    total_storage = db.session.query(func.coalesce(func.sum(FileRecord.file_size), 0)).filter(FileRecord.owner_id == user_id).scalar()

    recent_files = FileRecord.query.filter_by(owner_id=user_id).order_by(FileRecord.uploaded_at.desc()).limit(5).all()
    recent_activity = AuditLog.query.filter_by(user_id=user_id).order_by(AuditLog.timestamp.desc()).limit(10).all()

    return jsonify({
        'stats': {
            'total_files': total_files,
            'total_storage_bytes': total_storage,
            'encryption_algorithm': 'AES-256-GCM',
            'security_status': 'HARDENED'
        },
        'recent_files': [f.to_dict() for f in recent_files],
        'recent_activity': [a.to_dict() for a in recent_activity]
    }), 200
