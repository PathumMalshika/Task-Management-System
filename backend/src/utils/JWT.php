<?php
namespace App\Utils;

use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;

class JWT {
    public static function generateAccessToken(string $userId, string $role): string {
        return FirebaseJWT::encode([
            'iss'    => 'task-management-api',
            'iat'    => time(),
            'exp'    => time() + (int)$_ENV['JWT_EXPIRES_IN'],
            'userId' => $userId,
            'role'   => $role,
        ], $_ENV['JWT_SECRET'], 'HS256');
    }

    public static function generateRefreshToken(string $userId): string {
        return FirebaseJWT::encode([
            'iss'    => 'task-management-api',
            'iat'    => time(),
            'exp'    => time() + (int)$_ENV['JWT_REFRESH_EXPIRES_IN'],
            'userId' => $userId,
            'type'   => 'refresh',
        ], $_ENV['JWT_REFRESH_SECRET'], 'HS256');
    }

    public static function decodeAccessToken(string $token): object {
        return FirebaseJWT::decode($token, new Key($_ENV['JWT_SECRET'], 'HS256'));
    }

    public static function decodeRefreshToken(string $token): object {
        return FirebaseJWT::decode($token, new Key($_ENV['JWT_REFRESH_SECRET'], 'HS256'));
    }

    // Generate a UUID v4 (for MySQL 5.7 compatibility)
    public static function uuid(): string {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}