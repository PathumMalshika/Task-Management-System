<?php
namespace App\Services;

use App\Config\Database;
use App\Utils\JWT;

class AuthService {
    private \PDO $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ── Register (admin only) ─────────────────────────────────────
    public function register(array $data): array {
        $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$data['email']]);
        if ($stmt->fetch()) throw new \Exception('Email already exists', 409);

        $allowed = ['admin', 'manager', 'technician'];
        if (!in_array($data['role'] ?? '', $allowed)) {
            throw new \Exception('Invalid role', 422);
        }

        $id   = JWT::uuid();
        $hash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);

        $stmt = $this->db->prepare(
            'INSERT INTO users (id, name, email, password_hash, role)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$id, $data['name'], $data['email'], $hash, $data['role']]);

        return ['id' => $id, 'name' => $data['name'],
                'email' => $data['email'], 'role' => $data['role']];
    }

    // ── Login ─────────────────────────────────────────────────────
    public function login(string $email, string $password): array {
        $stmt = $this->db->prepare(
            'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \Exception('Invalid credentials', 401);
        }

        // Rehash if bcrypt cost has changed
        if (password_needs_rehash($user['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
            $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                     ->execute([$newHash, $user['id']]);
        }

        $accessToken  = JWT::generateAccessToken($user['id'], $user['role']);
        $refreshToken = JWT::generateRefreshToken($user['id']);

        // Store refresh token in DB
        $tokenId   = JWT::uuid();
        $expiresAt = date('Y-m-d H:i:s', time() + (int)$_ENV['JWT_REFRESH_EXPIRES_IN']);

        $this->db->prepare(
            'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
        )->execute([$tokenId, $user['id'], $refreshToken, $expiresAt]);

        // Clean up expired refresh tokens for this user
        $this->db->prepare(
            'DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()'
        )->execute([$user['id']]);

        return [
            'accessToken'  => $accessToken,
            'refreshToken' => $refreshToken,
            'user' => [
                'id'    => $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role'],
            ],
        ];
    }

    // ── Refresh access token ──────────────────────────────────────
    public function refresh(string $token): array {
        try {
            $decoded = JWT::decodeRefreshToken($token);
        } catch (\Exception $e) {
            throw new \Exception('Invalid refresh token', 401);
        }

        $stmt = $this->db->prepare(
            'SELECT * FROM refresh_tokens
             WHERE token = ? AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$token]);
        if (!$stmt->fetch()) throw new \Exception('Token expired or revoked', 401);

        $stmt = $this->db->prepare(
            'SELECT id, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$decoded->userId]);
        $user = $stmt->fetch();
        if (!$user) throw new \Exception('User not found', 401);

        return ['accessToken' => JWT::generateAccessToken($user['id'], $user['role'])];
    }

    // ── Logout ────────────────────────────────────────────────────
    public function logout(string $token): void {
        $this->db->prepare('DELETE FROM refresh_tokens WHERE token = ?')->execute([$token]);
    }
}