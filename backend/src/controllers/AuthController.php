<?php
namespace App\Controllers;

use App\Services\AuthService;
use App\Models\AuditLog;
use App\Utils\Response;

class AuthController {
    private AuthService $service;

    public function __construct() { $this->service = new AuthService(); }

    public function login(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($body['email']) || empty($body['password'])) {
            Response::error('Email and password are required', 400);
        }

        try {
            $result = $this->service->login($body['email'], $body['password']);
            AuditLog::write([
                'userId'     => $result['user']['id'],
                'action'     => 'USER_LOGIN',
                'resource'   => 'auth',
                'resourceId' => $result['user']['id'],
                'details'    => ['email' => $body['email'], 'role' => $result['user']['role']],
            ]);
            Response::json($result);
        } catch (\Exception $e) {
            Response::error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    public function refresh(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (empty($body['refreshToken'])) Response::error('Refresh token required', 400);

        try {
            Response::json($this->service->refresh($body['refreshToken']));
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public function logout(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (!empty($body['refreshToken'])) $this->service->logout($body['refreshToken']);
        Response::json(['message' => 'Logged out successfully']);
    }
}