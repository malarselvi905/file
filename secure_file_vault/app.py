import os
from flask import Flask, jsonify
from config import Config
from models import db
from routes.auth import auth_bp
from routes.files import files_bp
from routes.dashboard import dashboard_bp
from routes.admin import admin_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize database
    db.init_app(app)

    # Ensure uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Security Headers Middleware
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Content-Security-Policy'] = "default-src 'self'; frame-ancestors 'none';"
        return response

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad Request: Malformed or invalid input.'}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Unauthorized: Valid session or token required.'}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden: Insufficient privileges to access resource.'}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not Found: The requested resource does not exist.'}), 404

    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({'error': 'File Too Large: Upload payload exceeds maximum 15MB limit.'}), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal Server Error: Secure failure mode triggered.'}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        # Automatically create tables if using local development
        db.create_all()
    print("==================================================")
    print(" Secure File Vault - Flask Cybersecurity Engine")
    print(" AES-256-GCM Encryption at Rest: ACTIVE")
    print(" Running at: http://127.0.0.1:5000")
    print("==================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
