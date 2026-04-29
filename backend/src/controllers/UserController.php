<?php
namespace App\Controllers;

use App\Config\Database;
use App\Services\AuthService;
use App\Models\AuditLog;
use App\Utils\Response;

class UserController {
    private \PDO $db;
    public function __construct() { $this->db = Database::getInstance(); }

    public function create(object $auth): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $required = ['name', 'email', 'password', 'role'];
        foreach ($required as $field) {
            if (empty($body[$field])) Response::error("Field '{$field}' is required", 422);
        }

        try {
            $user = (new AuthService())->register($body);
            AuditLog::write([
                'userId' => $auth->userId, 'action' => 'CREATE_USER',
                'resource' => 'user', 'resourceId' => $user['id'],
                'details' => ['email' => $user['email'], 'role' => $user['role']],
            ]);
            Response::json($user, 201);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function getAll(object $auth): void {
        // Managers see only technicians; admins see everyone
        if ($auth->role === 'admin') {
            $stmt = $this->db->query(
                'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
            );
        } else {
            $stmt = $this->db->prepare(
                "SELECT id, name, email, role, is_active, created_at
                 FROM users WHERE role = 'technician' ORDER BY name"
            );
            $stmt->execute();
        }
        Response::json($stmt->fetchAll());
    }

    public function update(string $id, object $auth): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $stmt = $this->db->prepare(
            'UPDATE users SET
               name      = COALESCE(?, name),
               role      = COALESCE(?, role),
               is_active = COALESCE(?, is_active)
             WHERE id = ?'
        );
        $stmt->execute([
            $body['name']      ?? null,
            $body['role']      ?? null,
            isset($body['is_active']) ? (int)$body['is_active'] : null,
            $id,
        ]);

        AuditLog::write([
            'userId' => $auth->userId, 'action' => 'UPDATE_USER',
            'resource' => 'user', 'resourceId' => $id, 'details' => $body,
        ]);
        Response::json(['message' => 'User updated']);
    }

    public function delete(string $id, object $auth): void {
        // Prevent self-deletion
        if ($id === $auth->userId) Response::error('Cannot delete your own account', 400);

        $this->db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        AuditLog::write([
            'userId' => $auth->userId, 'action' => 'DELETE_USER',
            'resource' => 'user', 'resourceId' => $id,
        ]);
        Response::json(['message' => 'User deleted']);
    }
}