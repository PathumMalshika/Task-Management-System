<?php
namespace App\Models;

use App\Config\Database;
use App\Middleware\LoggerMiddleware;
use App\Utils\JWT;

class AuditLog {
    public static function write(array $data): void {
        try {
            $db   = Database::getInstance();
            $id   = JWT::uuid();
            $stmt = $db->prepare(
                'INSERT INTO audit_logs
                 (id, user_id, action, resource, resource_id, details, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $id,
                $data['userId']     ?? null,
                $data['action'],
                $data['resource']   ?? null,
                $data['resourceId'] ?? null,
                json_encode($data['details'] ?? []),
                $_SERVER['REMOTE_ADDR']     ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);

            LoggerMiddleware::get()->info('AUDIT', [
                'userId'   => $data['userId'] ?? null,
                'action'   => $data['action'],
                'resource' => $data['resource'] ?? null,
                'id'       => $data['resourceId'] ?? null,
            ]);
        } catch (\Exception $e) {
            LoggerMiddleware::get()->error('Audit write failed', ['error' => $e->getMessage()]);
        }
    }
}