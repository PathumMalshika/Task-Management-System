<?php
namespace App\Controllers;

use App\Services\EmailService;
use App\Config\Database;
use App\Models\AuditLog;
use App\Utils\{Response, JWT};

class TaskController {
    private \PDO $db;
    public function __construct() { $this->db = Database::getInstance(); }

    // ── Create (manager / admin) ──────────────────────────────────
    public function create(object $auth): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['title'])) Response::error('Title is required', 422);

        $id = JWT::uuid();
        $stmt = $this->db->prepare(
            'INSERT INTO tasks (id, title, description, assigned_to, priority, due_date, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            $body['title'],
            $body['description']  ?? null,
            $body['assigned_to']  ?? null,
            $body['priority']     ?? 'medium',
            $body['due_date']     ?? null,
            $auth->userId,
        ]);

        $task = $this->db->query("SELECT * FROM tasks WHERE id = '$id'")->fetch();

        AuditLog::write([
            'userId' => $auth->userId, 'action' => 'CREATE_TASK',
            'resource' => 'task', 'resourceId' => $id,
            'details' => ['title' => $task['title']],
        ]);

        // ── Send email if task is assigned ────────────────────
        if (!empty($body['assigned_to'])) {
            $this->sendAssignmentEmail($id, $body['assigned_to'], $auth);
        }
        // ─────────────────────────────────────────────────────
        Response::json($task, 201);
    }

    // ── Get all (role-filtered) ───────────────────────────────────
    public function getAll(object $auth): void {
        if ($auth->role === 'admin') {
            $stmt = $this->db->prepare(
                'SELECT t.*, u.name AS assignee_name
                 FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
                 ORDER BY t.created_at DESC'
            );
            $stmt->execute();

        } elseif ($auth->role === 'manager') {
            $stmt = $this->db->prepare(
                'SELECT t.*, u.name AS assignee_name
                 FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
                 WHERE t.created_by = ? OR t.assigned_to = ?
                 ORDER BY t.created_at DESC'
            );
            $stmt->execute([$auth->userId, $auth->userId]);

        } else {
            // Technician sees only their own tasks
            $stmt = $this->db->prepare(
                'SELECT t.*, u.name AS assignee_name
                 FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
                 WHERE t.assigned_to = ?
                 ORDER BY t.created_at DESC'
            );
            $stmt->execute([$auth->userId]);
        }

        Response::json($stmt->fetchAll());
    }

    // ── Get single task ───────────────────────────────────────────
    public function getOne(string $id, object $auth): void {
        $task = $this->findTask($id);
        if (!$task) Response::error('Task not found', 404);

        // Technicians can only view their own tasks
        if ($auth->role === 'technician' && $task['assigned_to'] !== $auth->userId) {
            Response::error('Access denied', 403);
        }
        Response::json($task);
    }

    // ── Update ────────────────────────────────────────────────────
    public function update(string $id, object $auth): void {
        $task = $this->findTask($id);
        if (!$task) Response::error('Task not found', 404);

        // Technician can only update tasks assigned to them
        if ($auth->role === 'technician' && $task['assigned_to'] !== $auth->userId) {
            Response::error('Cannot modify tasks not assigned to you', 403);
        }

        // Technician can only change status, not reassign or change priority
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if ($auth->role === 'technician') {
            $body = array_intersect_key($body, array_flip(['status']));
        }

        $allowedStatuses   = ['pending','in_progress','completed','cancelled'];
        $allowedPriorities = ['low','medium','high','critical'];

        if (!empty($body['status']) && !in_array($body['status'], $allowedStatuses)) {
            Response::error('Invalid status value', 422);
        }
        if (!empty($body['priority']) && !in_array($body['priority'], $allowedPriorities)) {
            Response::error('Invalid priority value', 422);
        }

        $stmt = $this->db->prepare(
            'UPDATE tasks SET
               title       = COALESCE(?, title),
               description = COALESCE(?, description),
               status      = COALESCE(?, status),
               priority    = COALESCE(?, priority),
               due_date    = COALESCE(?, due_date),
               assigned_to = COALESCE(?, assigned_to)
             WHERE id = ?'
        );
        $stmt->execute([
            $body['title']       ?? null,
            $body['description'] ?? null,
            $body['status']      ?? null,
            $body['priority']    ?? null,
            $body['due_date']    ?? null,
            $body['assigned_to'] ?? null,
            $id,
        ]);

        AuditLog::write([
            'userId' => $auth->userId, 'action' => 'UPDATE_TASK',
            'resource' => 'task', 'resourceId' => $id, 'details' => $body,
        ]);

        // ── Only email if assignee changed ────────────────────
        $updatedTask = $this->findTask($id);
        $oldAssignee = $task['assigned_to']        ?? null;
        $newAssignee = $updatedTask['assigned_to'] ?? null;

        if ($newAssignee && $newAssignee !== $oldAssignee) {
            $this->sendAssignmentEmail($id, $newAssignee, $auth);
        }
        // ─────────────────────────────────────────────────────

        Response::json($updatedTask);
        
    }

    // ── Delete (admin only) ───────────────────────────────────────
    public function delete(string $id, object $auth): void {
        if (!$this->findTask($id)) Response::error('Task not found', 404);

        $this->db->prepare('DELETE FROM tasks WHERE id = ?')->execute([$id]);

        AuditLog::write([
            'userId' => $auth->userId, 'action' => 'DELETE_TASK',
            'resource' => 'task', 'resourceId' => $id,
        ]);
        Response::json(['message' => 'Task deleted successfully']);
    }

    private function findTask(string $id): array|false {
        $stmt = $this->db->prepare('SELECT * FROM tasks WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    // ── Email helper — task assigned ──────────────────────────
private function sendAssignmentEmail(string $taskId, string $assigneeId, object $authUser): void {
    try {
        $db = Database::getInstance();

        // Get full task details
        $stmt = $db->prepare('SELECT * FROM tasks WHERE id = ?');
        $stmt->execute([$taskId]);
        $task = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$task) return;

        // Get assignee details
        $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$assigneeId]);
        $assignee = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$assignee || empty($assignee['email'])) return;

        // Get assigned-by user details
        $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$authUser->userId]);
        $assignedBy = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$assignedBy) return;

        (new EmailService())->sendTaskAssigned($task, $assignee, $assignedBy);

    } catch (\Exception $e) {
        error_log('Assignment email error: ' . $e->getMessage());
    }
}

// ── Email helper — task updated ───────────────────────────
private function sendUpdateEmail(string $taskId, string $assigneeId, object $authUser): void {
    try {
        $db = Database::getInstance();

        $stmt = $db->prepare('SELECT * FROM tasks WHERE id = ?');
        $stmt->execute([$taskId]);
        $task = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$task) return;

        $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$assigneeId]);
        $assignee = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$assignee || empty($assignee['email'])) return;

        $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
        $stmt->execute([$authUser->userId]);
        $updatedBy = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$updatedBy) return;

        (new EmailService())->sendTaskUpdated($task, $assignee, $updatedBy);

    } catch (\Exception $e) {
        error_log('Update email error: ' . $e->getMessage());
    }
}
}