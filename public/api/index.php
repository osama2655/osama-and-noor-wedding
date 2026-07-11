<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/state.php';
require __DIR__ . '/handlers.php';

function json_out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function body(): array
{
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input');
        $decoded = $raw ? json_decode($raw, true) : [];
        $b = is_array($decoded) ? $decoded : [];
    }
    return $b;
}

$https = (($_SERVER['HTTPS'] ?? '') !== '') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 90,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => $https,
]);
session_name('wedding_sess');
session_start();

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'login':    handle_login(); break;
        case 'logout':   handle_logout(); break;
        case 'me':       json_out(['me' => (($u = current_user()) ? user_public($u) : null)]); break;
        case 'state':    handle_state(); break;
        case 'check':    handle_check(); break;
        case 'decision': handle_decision(); break;
        case 'vendor':   handle_vendor(); break;
        case 'vendor_delete': handle_vendor_delete(); break;
        case 'guest':    handle_guest(); break;
        case 'guest_delete':  handle_guest_delete(); break;
        case 'pick':     handle_pick(); break;
        case 'setting':  handle_setting(); break;
        default:         json_out(['error' => 'unknown action'], 404);
    }
} catch (Throwable $e) {
    error_log('[wedding-api] ' . $e->getMessage());
    json_out(['error' => 'server error'], 500);
}
