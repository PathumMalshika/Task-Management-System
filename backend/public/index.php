<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Middleware\{AuthMiddleware, AuthorizeMiddleware, LoggerMiddleware};
use App\Controllers\{AuthController, TaskController, UserController, AuditController};
use App\Utils\Response;

// ── Bootstrap ─────────────────────────────────────────────────
$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// ── CORS ──────────────────────────────────────────────────────
$origin = $_ENV['FRONTEND_URL'] ?? 'http://localhost:3000';
header("Access-Control-Allow-Origin: {$origin}");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Parse Route ───────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip /api prefix
if (str_starts_with($path, '/api')) {
    $path = substr($path, 4);
}

// Clean trailing slash
$path = rtrim($path, '/');
if ($path === '') $path = '/';


// Split into segments for dynamic routes e.g. /tasks/123
$segments = array_values(array_filter(explode('/', $path)));

$startTime  = microtime(true);
$statusCode = 200;
$authUser   = null;

// ── Routes ────────────────────────────────────────────────────
try {

    // ── PUBLIC ────────────────────────────────────────────────
    if ($method === 'POST' && $path === '/auth/login') {
        (new AuthController())->login();

    } elseif ($method === 'POST' && $path === '/auth/refresh') {
        (new AuthController())->refresh();

    // ── PROTECTED ─────────────────────────────────────────────
    } else {
        $authUser = AuthMiddleware::handle();

        // AUTH
        if ($method === 'POST' && $path === '/auth/logout') {
            (new AuthController())->logout();

        // USERS
        } elseif ($method === 'GET' && $path === '/users') {
            AuthorizeMiddleware::requireMinRole($authUser, 'manager');
            (new UserController())->getAll($authUser);

        } elseif ($method === 'POST' && $path === '/users') {
            AuthorizeMiddleware::requireRole($authUser, 'admin');
            (new UserController())->create($authUser);

        } elseif ($method === 'PUT' && ($segments[0] ?? '') === 'users' && isset($segments[1])) {
            AuthorizeMiddleware::requireRole($authUser, 'admin');
            (new UserController())->update($segments[1], $authUser);

        } elseif ($method === 'DELETE' && ($segments[0] ?? '') === 'users' && isset($segments[1])) {
            AuthorizeMiddleware::requireRole($authUser, 'admin');
            (new UserController())->delete($segments[1], $authUser);

        // TASKS
        } elseif ($method === 'GET' && $path === '/tasks') {
            (new TaskController())->getAll($authUser);

        } elseif ($method === 'GET' && ($segments[0] ?? '') === 'tasks' && isset($segments[1])) {
            (new TaskController())->getOne($segments[1], $authUser);

        } elseif ($method === 'POST' && $path === '/tasks') {
            AuthorizeMiddleware::requireMinRole($authUser, 'manager');
            (new TaskController())->create($authUser);

        } elseif ($method === 'PUT' && ($segments[0] ?? '') === 'tasks' && isset($segments[1])) {
            (new TaskController())->update($segments[1], $authUser);

        } elseif ($method === 'DELETE' && ($segments[0] ?? '') === 'tasks' && isset($segments[1])) {
            AuthorizeMiddleware::requireRole($authUser, 'admin');
            (new TaskController())->delete($segments[1], $authUser);

        // AUDIT LOGS
        } elseif ($method === 'GET' && $path === '/audit-logs') {
            AuthorizeMiddleware::requireRole($authUser, 'admin');
            (new AuditController())->getAll($authUser);

        } else {
            $statusCode = 404;
            Response::error('Route not found', 404);
        }
    }

} catch (\Exception $e) {
    $statusCode = ($e->getCode() >= 400 && $e->getCode() < 600)
        ? $e->getCode()
        : 500;

    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    Response::error(
        ($_ENV['APP_ENV'] ?? 'production') === 'development'
            ? $e->getMessage()
            : 'Internal server error',
        $statusCode
    );

} finally {
    LoggerMiddleware::logRequest($startTime, $statusCode, $authUser->userId ?? null);
}