<?php
namespace App\Controllers;

use App\Config\Database;
use App\Utils\Response;

class AuditController {
    private \PDO $db;
    public function __construct() { $this->db = Database::getInstance(); }

    public function getAll(object $auth): void {
        $page  = max(1, (int)($_GET['page']  ?? 1));
        $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;

        $stmt = $this->db->prepare(
            'SELECT a.*, u.name AS user_name, u.email AS user_email
             FROM audit_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created_at DESC
             LIMIT ? OFFSET ?'
        );
        $stmt->execute([$limit, $offset]);

        $countStmt = $this->db->query('SELECT COUNT(*) AS total FROM audit_logs');
        $total = $countStmt->fetch()['total'];

        Response::json([
            'logs'       => $stmt->fetchAll(),
            'pagination' => [
                'page'  => $page,
                'limit' => $limit,
                'total' => (int)$total,
                'pages' => (int)ceil($total / $limit),
            ],
        ]);
    }
}