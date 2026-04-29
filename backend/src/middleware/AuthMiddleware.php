<?php
namespace App\Middleware;

use App\Utils\JWT;
use App\Utils\Response;

class AuthMiddleware {
    public static function handle(): object {
        $headers    = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!str_starts_with($authHeader, 'Bearer ')) {
            Response::error('Authorization token not provided', 401);
        }

        $token = substr($authHeader, 7);

        try {
            return JWT::decodeAccessToken($token);  // { userId, role, exp, iat }
        } catch (\Firebase\JWT\ExpiredException $e) {
            Response::error('Token has expired', 401);
        } catch (\Exception $e) {
            Response::error('Invalid token', 401);
        }
    }
}