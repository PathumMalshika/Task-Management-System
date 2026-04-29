<?php
namespace App\Middleware;

use Monolog\Logger;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\JsonFormatter;

class LoggerMiddleware {
    private static ?Logger $instance = null;

    public static function get(): Logger {
        if (self::$instance === null) {
            self::$instance = new Logger('task-app');

            // Daily rotating logs — keep 30 days
            $daily = new RotatingFileHandler(
                __DIR__ . '/../../logs/app.log', 30, Logger::DEBUG
            );
            $daily->setFormatter(new JsonFormatter());

            // Error-only log
            $errors = new StreamHandler(
                __DIR__ . '/../../logs/error.log', Logger::ERROR
            );
            $errors->setFormatter(new JsonFormatter());

            self::$instance->pushHandler($daily);
            self::$instance->pushHandler($errors);
        }
        return self::$instance;
    }

    // Log every HTTP request (call in finally block of router)
    public static function logRequest(float $start, int $status, ?string $userId = null): void {
        $ms = round((microtime(true) - $start) * 1000, 2);
        self::get()->info('HTTP', [
            'method'   => $_SERVER['REQUEST_METHOD'],
            'uri'      => $_SERVER['REQUEST_URI'],
            'status'   => $status,
            'ms'       => $ms,
            'user'     => $userId ?? 'anonymous',
            'ip'       => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        ]);
    }
}