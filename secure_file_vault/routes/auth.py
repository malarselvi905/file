from flask import Blueprint, request, jsonify, session
from datetime import datetime, timezone, timedelta
from models import db
from models.user import User
from models.audit_log import LoginAttempt
from services.audit_service import log_security_event
import re

auth_bp = Blueprint('auth', __name__)

def is_valid_password(password: str) -> bool:
    """Enforce minimum 8 characters, uppercase, lowercase, digit, and symbol."""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'All fields are required.'}), 400

    if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', username):
        return jsonify({'error': 'Username must be 3-30 characters (alphanumeric, _ or -).'}), 400

    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({'error': 'Invalid email address.'}), 400

    if not is_valid_password(password):
        return jsonify({
            'error': 'Password must be at least 8 characters and contain uppercase, lowercase, numbers, and symbols.'
        }), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'error': 'Username or email already registered.'}), 409

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    log_security_event(
        action='USER_REGISTRATION',
        status='SUCCESS',
        details=f"New user registered: {username} ({email})",
        user_id=new_user.id
    )

    return jsonify({'message': 'Registration successful. Please log in.'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    identifier = data.get('username', '').strip()
    password = data.get('password', '')
    ip = request.remote_addr or '127.0.0.1'

    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()

    # Generic error message to prevent account enumeration
    auth_failed_msg = 'Invalid username or password.'

    if not user:
        # Record failed attempt against IP/identifier
        attempt = LoginAttempt(username=identifier, ip_address=ip, success=False, failure_reason='User Not Found')
        db.session.add(attempt)
        db.session.commit()
        log_security_event(action='USER_LOGIN_FAILED', status='FAILED', details=f"Unknown identifier: {identifier}")
        return jsonify({'error': auth_failed_msg}), 401

    if user.is_locked():
        remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
        log_security_event(
            action='LOGIN_BLOCKED_LOCKOUT',
            status='BLOCKED',
            details=f"Attempt on locked account {user.username}",
            user_id=user.id
        )
        return jsonify({
            'error': f'Account locked due to repeated failed login attempts. Try again in {max(1, remaining)} minutes.'
        }), 423

    if user.account_status == 'inactive':
        return jsonify({'error': 'Account has been deactivated by security administrator.'}), 403

    if not user.check_password(password):
        user.failed_login_attempts += 1
        attempt = LoginAttempt(username=user.username, ip_address=ip, success=False, failure_reason='Password Mismatch')
        db.session.add(attempt)

        if user.failed_login_attempts >= 5:
            user.account_status = 'locked'
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            log_security_event(
                action='ACCOUNT_LOCKED',
                status='WARNING',
                details=f"Account {user.username} locked after 5 failed attempts.",
                user_id=user.id
            )
            db.session.commit()
            return jsonify({
                'error': 'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
            }), 423

        db.session.commit()
        log_security_event(
            action='USER_LOGIN_FAILED',
            status='FAILED',
            details=f"Failed attempt #{user.failed_login_attempts} for user {user.username}",
            user_id=user.id
        )
        return jsonify({'error': auth_failed_msg}), 401

    # Login successful: reset failed counter
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    attempt = LoginAttempt(username=user.username, ip_address=ip, success=True)
    db.session.add(attempt)
    db.session.commit()

    # Session establishment
    session.clear()
    session['user_id'] = user.id
    session['role'] = user.role
    session['username'] = user.username
    session.permanent = True

    log_security_event(
        action='USER_LOGIN_SUCCESS',
        status='SUCCESS',
        details=f"User {user.username} successfully authenticated.",
        user_id=user.id
    )

    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    uid = session.get('user_id')
    uname = session.get('username')
    session.clear()
    if uid:
        log_security_event(
            action='USER_LOGOUT',
            status='SUCCESS',
            details=f"User {uname} logged out.",
            user_id=uid
        )
    return jsonify({'message': 'Logged out successfully.'}), 200

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(uid)
    if not user or user.account_status != 'active':
        session.clear()
        return jsonify({'error': 'Session invalid'}), 401
    return jsonify({'user': user.to_dict()}), 200
