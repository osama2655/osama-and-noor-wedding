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
        // Sprint 4 — Guests hub: each guest party mints its OWN RSVP link, and the
        // public reply writes back to the guest row (rsvp/seats/message + replied_at).
        $hasTok = (int) db()->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guests' AND COLUMN_NAME = 'token'"
        )->fetchColumn();
        if ($hasTok === 0) {
            db()->exec(
                "ALTER TABLE guests
                   ADD COLUMN token VARCHAR(32) NULL,
                   ADD COLUMN replied_at TIMESTAMP NULL DEFAULT NULL,
                   ADD COLUMN message VARCHAR(500) NOT NULL DEFAULT '',
                   ADD UNIQUE KEY uniq_guests_token (token)"
            );
            // Backfill a unique RSVP token for every existing guest party.
            db()->exec(
                "UPDATE guests SET token = LOWER(HEX(RANDOM_BYTES(16))) WHERE token IS NULL OR token = ''"
            );
        }

        // Sprint 4 — Vendor journey: link a Payments row back to the Shortlist listing
        // it was booked from (nullable; a manual row simply has no link).
        $hasCat = (int) db()->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'catalog_id'"
        )->fetchColumn();
        if ($hasCat === 0) {
            db()->exec('ALTER TABLE vendors ADD COLUMN catalog_id INT NULL, ADD KEY idx_vendors_catalog (catalog_id)');
        }

        // Sprint 4 — Price band on listings so the Shortlist can filter by budget.
        $hasPrice = (int) db()->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog' AND COLUMN_NAME = 'price_min'"
        )->fetchColumn();
        if ($hasPrice === 0) {
            db()->exec('ALTER TABLE catalog ADD COLUMN price_min DECIMAL(10,3) NULL, ADD COLUMN price_max DECIMAL(10,3) NULL');
        }

        // Seed a starter shortlist of Bahrain caterers, guarded per name (a count
        // guard once lost the whole seed to a single user-created empty row).
        $caterers = [
            ['Villa Mamas', 'Adliya', 'villamamas', 'Signature Bahraini and Middle Eastern; a favourite for weddings and events.'],
            ['Arabella Catering', 'Bahrain', '', 'Premier caterer since 2005; fresh seasonal cuisine, plus table, decor and lighting rentals.'],
            ['Dar Al Wasmiya', 'Bahrain', '', 'Arabic, Continental and finger food; weddings and full event management (alwasmiya.com).'],
            ['Global Events Tent', 'Bahrain', '', 'Wedding catering plus tents and event equipment; traditional Bahraini menus.'],
            ['Professional Caterers Bahrain', 'Bahrain', '', 'Catering for tents and events since 2015 (professionalcateringbahrain.com).'],
        ];
        $ins = db()->prepare(
            "INSERT INTO catalog (category, name, area, instagram, note, verify, status, sort)
             SELECT 'caterer', ?, ?, ?, ?, 'Confirm phone and wedding availability', 'todo', ?
             WHERE NOT EXISTS (SELECT 1 FROM catalog WHERE category = 'caterer' AND name = ?)"
        );
        $sort = 100;
        foreach ($caterers as $c) {
            $ins->execute([$c[0], $c[1], $c[2], $c[3], $sort++, $c[0]]);
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
