<?php
declare(strict_types=1);

function current_user(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }
    $st = db()->prepare('SELECT id, name, display_name FROM users WHERE id = ?');
    $st->execute([$_SESSION['uid']]);
    return $st->fetch() ?: null;
}

function user_public(array $u): array
{
    return ['id' => (int) $u['id'], 'name' => $u['name'], 'display' => $u['display_name']];
}

function require_user(): array
{
    $u = current_user();
    if (!$u) {
        json_out(['error' => 'unauthorized'], 401);
    }
    return $u;
}

function handle_login(): void
{
    $b = body();
    $name = strtolower(trim((string) ($b['name'] ?? '')));
    $pass = (string) ($b['password'] ?? '');
    usleep(250000); // constant-ish delay to blunt brute force

    $st = db()->prepare('SELECT * FROM users WHERE name = ?');
    $st->execute([$name]);
    $u = $st->fetch();
    if (!$u || $u['pass_hash'] === '' || !password_verify($pass, $u['pass_hash'])) {
        json_out(['error' => 'invalid credentials'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    json_out(['me' => user_public($u)]);
}

function handle_logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}
