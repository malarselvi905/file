from flask import Blueprint, request, jsonify, session, Response
from models import db
from models.file import FileRecord
from services.encryption import encrypt_file, decrypt_file
from services.file_service import (
    is_allowed_file, sanitize_user_filename, generate_vault_storage_name,
    save_encrypted_payload, read_encrypted_payload, delete_encrypted_payload
)
from services.audit_service import log_security_event

files_bp = Blueprint('files', __name__)

def require_auth():
    return session.get('user_id')

@files_bp.route('/upload', methods=['POST'])
def upload_file():
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file segment provided in request.'}), 400

    uploaded_file = request.files['file']
    raw_filename = uploaded_file.filename or ''

    if not raw_filename:
        return jsonify({'error': 'No file selected.'}), 400

    if not is_allowed_file(raw_filename):
        log_security_event(
            action='UNSUPPORTED_FILE_BLOCKED',
            status='BLOCKED',
            details=f"Blocked unsupported extension upload attempt: {raw_filename}",
            user_id=user_id
        )
        return jsonify({
            'error': 'File type disallowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG, ZIP.'
        }), 400

    # Sanitize user filename to eliminate path traversal attempts
    safe_name = sanitize_user_filename(raw_filename)
    file_bytes = uploaded_file.read()
    file_size = len(file_bytes)

    if file_size == 0:
        return jsonify({'error': 'Empty files cannot be vaulted.'}), 400

    # 1. Apply Server-Side AES-256-GCM Encryption at rest
    try:
        enc_result = encrypt_file(file_bytes)
    except Exception as e:
        return jsonify({'error': f'Cryptographic processing failed: {str(e)}'}), 500

    # 2. Store encrypted payload in private segregated vault folder with random UUID
    stored_name = generate_vault_storage_name()
    physical_path = save_encrypted_payload(enc_result['ciphertext_with_tag'], stored_name)

    # 3. Create file metadata record
    file_record = FileRecord(
        owner_id=user_id,
        original_filename=safe_name,
        stored_filename=stored_name,
        file_size=file_size,
        file_type=uploaded_file.mimetype or 'application/octet-stream',
        storage_path=physical_path,
        encryption_status='ENCRYPTED_AES256_GCM',
        encryption_iv=enc_result['iv_hex'],
        encryption_tag=enc_result['auth_tag_hex'],
        sha256_checksum=enc_result['sha256_checksum']
    )
    db.session.add(file_record)
    db.session.commit()

    # 4. Record audit trail
    log_security_event(
        action='FILE_UPLOAD_ENCRYPTED',
        status='SUCCESS',
        details=f"Uploaded & AES-256-GCM encrypted '{safe_name}' (SHA256: {enc_result['sha256_checksum'][:12]}...)",
        user_id=user_id,
        file_id=file_record.id
    )

    return jsonify({
        'message': 'File uploaded and encrypted securely at rest.',
        'file': file_record.to_dict()
    }), 201

@files_bp.route('', methods=['GET'])
def list_files():
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    search_query = request.args.get('search', '').strip().lower()
    file_type = request.args.get('type', '').strip().lower()

    query = FileRecord.query.filter_by(owner_id=user_id)

    if search_query:
        query = query.filter(FileRecord.original_filename.ilike(f'%{search_query}%'))
    if file_type and file_type != 'all':
        query = query.filter(FileRecord.original_filename.ilike(f'%.{file_type}'))

    files = query.order_by(FileRecord.uploaded_at.desc()).all()
    return jsonify({'files': [f.to_dict() for f in files]}), 200

@files_bp.route('/<int:file_id>', methods=['GET'])
def get_file_metadata(file_id: int):
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    file_rec = FileRecord.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found.'}), 404

    # IDOR Prevention: check ownership
    if file_rec.owner_id != user_id and session.get('role') != 'admin':
        log_security_event(
            action='UNAUTHORIZED_ACCESS_ATTEMPT',
            status='BLOCKED',
            details=f"IDOR attempt: User {user_id} tried inspecting metadata of file {file_id}",
            user_id=user_id,
            file_id=file_id
        )
        return jsonify({'error': 'Access denied: You do not own this file.'}), 403

    return jsonify({'file': file_rec.to_dict()}), 200

@files_bp.route('/download/<int:file_id>', methods=['GET'])
def download_file(file_id: int):
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    file_rec = FileRecord.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found.'}), 404

    # IDOR Protection: strict ownership check
    if file_rec.owner_id != user_id and session.get('role') != 'admin':
        log_security_event(
            action='UNAUTHORIZED_ACCESS_ATTEMPT',
            status='BLOCKED',
            details=f"IDOR attempt: User {user_id} attempted unauthorized download of file {file_id}",
            user_id=user_id,
            file_id=file_id
        )
        return jsonify({'error': 'Access denied: You do not have permission to download this file.'}), 403

    try:
        # 1. Read encrypted payload from segregated vault storage
        encrypted_bytes = read_encrypted_payload(file_rec.stored_filename)

        # 2. Decrypt using AES-256-GCM and verify authenticity tag
        plaintext_bytes = decrypt_file(encrypted_bytes, file_rec.encryption_iv)

        # 3. Log successful authenticated access
        log_security_event(
            action='FILE_DOWNLOAD_DECRYPTED',
            status='SUCCESS',
            details=f"Decrypted & downloaded '{file_rec.original_filename}'",
            user_id=user_id,
            file_id=file_rec.id
        )

        response = Response(plaintext_bytes, mimetype=file_rec.file_type)
        response.headers['Content-Disposition'] = f'attachment; filename="{file_rec.original_filename}"'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Cache-Control'] = 'no-store, private'
        return response

    except Exception as e:
        log_security_event(
            action='FILE_INTEGRITY_TAMPER_ALERT',
            status='FAILED',
            details=f"Decryption failure for file {file_id}: {str(e)}",
            user_id=user_id,
            file_id=file_id
        )
        return jsonify({'error': 'Cryptographic verification failed: Authentication tag mismatch.'}), 500

@files_bp.route('/delete/<int:file_id>', methods=['DELETE', 'POST'])
def delete_file(file_id: int):
    user_id = require_auth()
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    file_rec = FileRecord.query.get(file_id)
    if not file_rec:
        return jsonify({'error': 'File not found.'}), 404

    # IDOR Protection: verify owner or admin
    if file_rec.owner_id != user_id and session.get('role') != 'admin':
        log_security_event(
            action='UNAUTHORIZED_ACCESS_ATTEMPT',
            status='BLOCKED',
            details=f"User {user_id} attempted unauthorized deletion of file {file_id}",
            user_id=user_id,
            file_id=file_id
        )
        return jsonify({'error': 'Access denied.'}), 403

    orig_name = file_rec.original_filename

    # Delete encrypted payload from physical disk
    delete_encrypted_payload(file_rec.stored_filename)

    # Delete database record
    db.session.delete(file_rec)
    db.session.commit()

    log_security_event(
        action='FILE_DELETED',
        status='SUCCESS',
        details=f"File permanently purged from vault: '{orig_name}'",
        user_id=user_id
    )

    return jsonify({'message': f"File '{orig_name}' deleted securely."}), 200
