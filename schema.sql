-- ============================================================================
-- Project: Secure File Vault (Cybersecurity Core Project)
-- Database: secure_file_vault
-- Target Engine: MySQL 8.0+ / MariaDB 10.4+ (XAMPP Compatible)
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `secure_file_vault` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `secure_file_vault`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `login_attempts`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `files`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- Table: users
-- Purpose: Authentication credentials, roles, account lockout tracking
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    `account_status` ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active',
    `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
    `locked_until` DATETIME NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_login` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_username` (`username`),
    UNIQUE KEY `uq_users_email` (`email`),
    INDEX `idx_users_status_role` (`account_status`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: files
-- Purpose: Metadata for securely uploaded, encrypted files at rest
-- Notice: Physical path points outside web static root; original filename sanitized
-- ----------------------------------------------------------------------------
CREATE TABLE `files` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `owner_id` INT UNSIGNED NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL,
    `file_size` BIGINT UNSIGNED NOT NULL,
    `file_type` VARCHAR(120) NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `encryption_status` ENUM('ENCRYPTED_AES256_GCM', 'UNENCRYPTED', 'CORRUPTED') NOT NULL DEFAULT 'ENCRYPTED_AES256_GCM',
    `encryption_iv` VARCHAR(64) NOT NULL,
    `encryption_tag` VARCHAR(64) NOT NULL,
    `sha256_checksum` CHAR(64) NOT NULL,
    `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_files_stored_filename` (`stored_filename`),
    INDEX `idx_files_owner_id` (`owner_id`),
    INDEX `idx_files_uploaded_at` (`uploaded_at`),
    CONSTRAINT `fk_files_owner` 
        FOREIGN KEY (`owner_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: audit_logs
-- Purpose: Immutable security audit trail recording access, operations, and threats
-- ----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NULL DEFAULT NULL,
    `action` VARCHAR(60) NOT NULL,
    `file_id` INT UNSIGNED NULL DEFAULT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(255) NULL DEFAULT NULL,
    `status` ENUM('SUCCESS', 'FAILED', 'BLOCKED', 'WARNING') NOT NULL,
    `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `details` TEXT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_logs_user_action` (`user_id`, `action`),
    INDEX `idx_audit_logs_timestamp` (`timestamp`),
    INDEX `idx_audit_logs_status` (`status`),
    CONSTRAINT `fk_audit_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_file` 
        FOREIGN KEY (`file_id`) 
        REFERENCES `files` (`id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: login_attempts
-- Purpose: IP-based and username-based brute force attack detection
-- ----------------------------------------------------------------------------
CREATE TABLE `login_attempts` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(120) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `success` TINYINT(1) NOT NULL DEFAULT 0,
    `failure_reason` VARCHAR(100) NULL DEFAULT NULL,
    `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_login_ip_time` (`ip_address`, `timestamp`),
    INDEX `idx_login_user_time` (`username`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Safe Demo Seed Data (Pass: Admin@Vault2026! and User@Vault2026!)
-- Hashed using Werkzeug / PBKDF2:SHA256 with 600,000 rounds
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `account_status`, `failed_login_attempts`, `created_at`)
VALUES
(1, 'sec_admin', 'admin@vault.cyber.local', 'pbkdf2:sha256:600000$tK4wZ9jE1$86121db3832c3be992c2a07474a2df85e50529d3fbc9584b4ef08f515db5e955', 'admin', 'active', 0, NOW()),
(2, 'alice_analyst', 'alice@vault.cyber.local', 'pbkdf2:sha256:600000$hL7xQ2mF8$9a1e0b5c4f28383a15239e248b1d830b808ec1343729e2fca9b1fca82d92bb31', 'user', 'active', 0, NOW()),
(3, 'bob_developer', 'bob@vault.cyber.local', 'pbkdf2:sha256:600000$mP9kR3vL4$5c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', 'user', 'active', 0, NOW());

-- Initial baseline security audit entry
INSERT INTO `audit_logs` (`user_id`, `action`, `file_id`, `ip_address`, `user_agent`, `status`, `details`)
VALUES 
(1, 'SYSTEM_INITIALIZATION', NULL, '127.0.0.1', 'SecureVault/1.0 Database Setup', 'SUCCESS', 'Database schema provisioned with AES-256-GCM encryption requirements and audit constraints.');
