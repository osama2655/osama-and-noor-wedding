<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $name = getenv('DB_NAME') ?: 'wedding';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: '';
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function setting_get(string $k): ?string
{
    $st = db()->prepare('SELECT v FROM settings WHERE k = ?');
    $st->execute([$k]);
    $r = $st->fetch();
    return $r ? $r['v'] : null;
}

function get_rev(): int
{
    return (int) (setting_get('rev') ?? 0);
}

// Monotonic global revision — bumped on every mutation so cheap polls can early-out.
function bump_rev(int $uid): int
{
    db()->prepare(
        "INSERT INTO settings(k, v, updated_by, updated_at) VALUES('rev', '1', ?, NOW())
         ON DUPLICATE KEY UPDATE v = v + 1, updated_by = VALUES(updated_by), updated_at = NOW()"
    )->execute([$uid]);
    return get_rev();
}

// Attach {byId, by, at} attribution to a state row.
function with_attr(array $base, array $row, array $users, string $byCol): array
{
    $bid = $row[$byCol] ?? null;
    $base['byId'] = $bid !== null ? (int) $bid : null;
    $base['by'] = ($bid !== null && isset($users[(int) $bid])) ? $users[(int) $bid] : null;
    $base['at'] = $row['updated_at'] ?? ($row['created_at'] ?? null);
    return $base;
}

// Trim DECIMAL trailing zeros for clean display ("12.500" -> "12.5", null -> "").
function num_out($v): string
{
    if ($v === null || $v === '') {
        return '';
    }
    $s = (string) $v;
    return str_contains($s, '.') ? rtrim(rtrim($s, '0'), '.') : $s;
}
