<?php
declare(strict_types=1);

// DB credentials come from php-fpm env; if that isn't wired, fall back to an untracked
// `.db-secret.php` placed above the web root (survives redeploys, never served/committed).
function db_conf(): array
{
    $conf = [];
    foreach (['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $k) {
        $conf[$k] = getenv($k) ?: '';
    }
    if ($conf['DB_USER'] === '') {
        $secret = __DIR__ . '/../../.db-secret.php';
        if (is_file($secret)) {
            $s = include $secret;
            if (is_array($s)) {
                $conf = array_merge($conf, array_filter($s, 'strlen'));
            }
        }
    }
    return $conf;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $c = db_conf();
    $host = $c['DB_HOST'] ?: '127.0.0.1';
    $port = $c['DB_PORT'] ?: '3306';
    $name = $c['DB_NAME'] ?: 'wedding';
    $user = $c['DB_USER'] ?: 'root';
    $pass = $c['DB_PASS'] ?: '';
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    ensure_schema();
    return $pdo;
}

// One-time, idempotent migrations that run when a fresh worker first connects (the PDO is
// static-cached, so this runs once per process). Guarded so it is safe to run repeatedly and
// never breaks a request if it fails.
function ensure_schema(): void
{
    try {
        $has = (int) db()->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'passes' AND COLUMN_NAME = 'guest_id'"
        )->fetchColumn();
        if ($has === 0) {
            db()->exec('ALTER TABLE passes ADD COLUMN guest_id INT NULL, ADD UNIQUE KEY uniq_passes_guest (guest_id)');
            // Give every existing guest a single-use QR pass (token like bin2hex(random_bytes(16))).
            db()->exec(
                "INSERT IGNORE INTO passes (guest_id, token, label, status, created_at)
                 SELECT g.id, LOWER(HEX(RANDOM_BYTES(16))), g.name, 'unused', NOW() FROM guests g
                 WHERE NOT EXISTS (SELECT 1 FROM passes p WHERE p.guest_id = g.id)"
            );
        }
    } catch (Throwable $e) {
        error_log('[wedding-api] ensure_schema: ' . $e->getMessage());
    }
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

// Monotonic global revision, bumped on every mutation so cheap polls can early-out.
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
