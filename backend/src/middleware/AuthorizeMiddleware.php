<?php
namespace App\Middleware;

use App\Utils\Response;

class AuthorizeMiddleware {
    // Role hierarchy weights
    private static array $levels = [
        'technician' => 1,
        'manager'    => 2,
        'admin'      => 3,
    ];

    // Must match one of the given roles exactly
    public static function requireRole(object $user, string ...$roles): void {
        if (!in_array($user->role, $roles)) {
            Response::error(
                "Access denied. Required role: " . implode(' or ', $roles) . ". Your role: {$user->role}",
                403
            );
        }
    }

    // Must be at or above the minimum role level
    public static function requireMinRole(object $user, string $minRole): void {
        $userLevel = self::$levels[$user->role]  ?? 0;
        $minLevel  = self::$levels[$minRole]     ?? 99;

        if ($userLevel < $minLevel) {
            Response::error(
                "Access denied. Minimum required role: {$minRole}. Your role: {$user->role}",
                403
            );
        }
    }
}