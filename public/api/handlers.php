<?php
declare(strict_types=1);

const VENDOR_STATUSES = ['todo', 'contacted', 'quoted', 'booked', 'paid'];
const GUEST_SIDES = ['you', 'her', 'both'];
const GUEST_RSVPS = ['pending', 'yes', 'no'];

function num_in($v): ?string
{
    return ($v === '' || $v === null) ? null : (string) $v;
}

function handle_check(): void
{
    $u = require_user();
    $b = body();
    $key = trim((string) ($b['key'] ?? ''));
    if ($key === '') {
        json_out(['error' => 'missing key'], 400);
    }
    db()->prepare(
        'INSERT INTO checks(item_key, done, marked_by, updated_at) VALUES(?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE done = VALUES(done), marked_by = VALUES(marked_by), updated_at = NOW()'
    )->execute([$key, !empty($b['done']) ? 1 : 0, $u['id']]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_decision(): void
{
    $u = require_user();
    $b = body();
    $idx = (int) ($b['idx'] ?? -1);
    if ($idx < 0) {
        json_out(['error' => 'bad idx'], 400);
    }
    db()->prepare(
        'INSERT INTO decisions(idx, answer, updated_by, updated_at) VALUES(?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE answer = VALUES(answer), updated_by = VALUES(updated_by), updated_at = NOW()'
    )->execute([$idx, (string) ($b['answer'] ?? ''), $u['id']]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_vendor(): void
{
    $u = require_user();
    $b = body();
    $status = in_array($b['status'] ?? '', VENDOR_STATUSES, true) ? $b['status'] : 'todo';
    // A Payments row may be linked to the Shortlist listing it was booked from.
    // Accept either key so the camelCase store object round-trips without unlinking.
    $catRaw = $b['catalog_id'] ?? $b['catalogId'] ?? null;
    $catalogId = !empty($catRaw) ? (int) $catRaw : null;
    $args = [
        (string) ($b['category'] ?? ''),
        (string) ($b['name'] ?? ''),
        (string) ($b['contact'] ?? ''),
        $status,
        num_in($b['quote'] ?? ''),
        num_in($b['deposit'] ?? ''),
        num_in($b['balance'] ?? ''),
        num_in($b['balance_due'] ?? ''),
        $catalogId,
        $u['id'],
    ];

    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare(
            'UPDATE vendors SET category=?, name=?, contact=?, status=?, quote=?, deposit=?, balance=?,
             balance_due=?, catalog_id=?, updated_by=?, updated_at=NOW() WHERE id=?'
        )->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare(
            'INSERT INTO vendors(category, name, contact, status, quote, deposit, balance, balance_due, catalog_id, updated_by, updated_at)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_vendor_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM vendors WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_guest(): void
{
    $u = require_user();
    $b = body();
    $side = in_array($b['side'] ?? '', GUEST_SIDES, true) ? $b['side'] : 'you';
    $rsvp = in_array($b['rsvp'] ?? '', GUEST_RSVPS, true) ? $b['rsvp'] : 'pending';
    $args = [
        (string) ($b['name'] ?? ''),
        $side,
        (int) ($b['seats'] ?? 0),
        $rsvp,
        (string) ($b['notes'] ?? ''),
        $u['id'],
    ];

    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare(
            'UPDATE guests SET name=?, side=?, seats=?, rsvp=?, notes=?, updated_by=?, updated_at=NOW() WHERE id=?'
        )->execute($args);
        $id = (int) $b['id'];
    } else {
        // New parties mint a unique RSVP token (their own reply link) up front.
        db()->prepare(
            'INSERT INTO guests(name, side, seats, rsvp, notes, token, updated_by, updated_at)
             VALUES(?, ?, ?, ?, ?, LOWER(HEX(RANDOM_BYTES(16))), ?, NOW())'
        )->execute($args);
        $id = (int) db()->lastInsertId();
    }
    // Every guest gets one unique single-use QR entrance pass; keep its label = name.
    guest_pass_sync($id, (string) ($b['name'] ?? ''), (int) $u['id']);
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_guest_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM passes WHERE guest_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM guests WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

// Ensure a guest has exactly one single-use QR entrance pass, and keep its label = name.
// Guest passes are exempt from PASS_CAP (a guest list can exceed the manual-pass cap).
function guest_pass_sync(int $guestId, string $name, int $uid): void
{
    if ($guestId <= 0) {
        return;
    }
    try {
        $st = db()->prepare('SELECT id FROM passes WHERE guest_id = ? LIMIT 1');
        $st->execute([$guestId]);
        $pid = $st->fetchColumn();
        $label = mb_substr($name, 0, 191);
        if ($pid) {
            db()->prepare('UPDATE passes SET label = ? WHERE id = ?')->execute([$label, (int) $pid]);
        } else {
            db()->prepare(
                'INSERT INTO passes (guest_id, token, label, status, created_by, created_at) VALUES(?, ?, ?, \'unused\', ?, NOW())'
            )->execute([$guestId, bin2hex(random_bytes(16)), $label, $uid]);
        }
    } catch (Throwable $e) {
        error_log('[wedding-api] guest_pass_sync: ' . $e->getMessage());
    }
}

function handle_pick(): void
{
    $u = require_user();
    $b = body();
    $key = trim((string) ($b['key'] ?? ''));
    if ($key === '') {
        json_out(['error' => 'missing key'], 400);
    }
    if (!empty($b['picked'])) {
        db()->prepare(
            'INSERT INTO picks(vendor_key, picked_by, created_at) VALUES(?, ?, NOW())
             ON DUPLICATE KEY UPDATE picked_by = VALUES(picked_by)'
        )->execute([$key, $u['id']]);
    } else {
        db()->prepare('DELETE FROM picks WHERE vendor_key = ?')->execute([$key]);
    }
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_catalog(): void
{
    $u = require_user();
    $b = body();
    $status = in_array($b['status'] ?? '', VENDOR_STATUSES, true) ? $b['status'] : 'todo';
    $cap = ($b['capacity'] ?? '') === '' || ($b['capacity'] ?? null) === null ? null : (int) $b['capacity'];
    $args = [
        (string) ($b['category'] ?? 'venue'),
        (string) ($b['name'] ?? ''),
        (string) ($b['area'] ?? ''),
        (string) ($b['phone'] ?? ''),
        (string) ($b['instagram'] ?? ''),
        (string) ($b['mapsQuery'] ?? ''),
        $cap,
        !empty($b['segregated']) ? 1 : 0,
        !empty($b['femaleCrew']) ? 1 : 0,
        !empty($b['featured']) ? 1 : 0,
        $status,
        (string) ($b['note'] ?? ''),
        (string) ($b['verify'] ?? ''),
        (array_key_exists('sort', $b) ? (int) $b['sort'] : null),
        $u['id'],
    ];

    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare(
            'UPDATE catalog SET category=?, name=?, area=?, phone=?, instagram=?, maps_query=?, capacity=?,
             segregated=?, female_crew=?, featured=?, status=?, note=?, verify=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?'
        )->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare(
            'INSERT INTO catalog (category, name, area, phone, instagram, maps_query, capacity, segregated,
             female_crew, featured, status, note, verify, sort, updated_by, updated_at)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_catalog_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM catalog WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_note(): void
{
    $u = require_user();
    $b = body();
    $args = [(string) ($b['title'] ?? ''), (string) ($b['body'] ?? ''), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE notes SET title=?, body=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO notes (title, body, updated_by, updated_at) VALUES(?, ?, ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_note_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM notes WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_important_date(): void
{
    $u = require_user();
    $b = body();
    $date = num_in($b['date'] ?? '');
    $args = [(string) ($b['label'] ?? ''), $date, (string) ($b['note'] ?? ''), (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE important_dates SET label=?, on_date=?, note=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO important_dates (label, on_date, note, sort, updated_by, updated_at) VALUES(?, ?, ?, ?, ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_important_date_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM important_dates WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_bundle(): void
{
    $u = require_user();
    $b = body();
    $args = [(string) ($b['name'] ?? ''), (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE bundles SET name=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO bundles (name, sort, updated_by, updated_at) VALUES(?, ?, ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_bundle_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM bundle_items WHERE bundle_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM bundles WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_bundle_item(): void
{
    $u = require_user();
    $b = body();
    $args = [(int) ($b['bundleId'] ?? 0), (string) ($b['label'] ?? ''), num_in($b['cost'] ?? ''), (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE bundle_items SET bundle_id=?, label=?, cost=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO bundle_items (bundle_id, label, cost, sort, updated_by, updated_at) VALUES(?, ?, ?, COALESCE(?, 100), ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_bundle_item_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM bundle_items WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

const LANE_TAGS = ['you', 'men', 'her', 'hall'];

function handle_lane(): void
{
    $u = require_user();
    $b = body();
    $tag = in_array($b['tag'] ?? '', LANE_TAGS, true) ? $b['tag'] : 'you';
    $args = [(string) ($b['title'] ?? ''), (string) ($b['note'] ?? ''), $tag, (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE lanes SET title=?, note=?, tag=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO lanes (title, note, tag, sort, updated_by, updated_at) VALUES(?, ?, ?, COALESCE(?, 100), ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_lane_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM lane_items WHERE lane_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM lanes WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_lane_item(): void
{
    $u = require_user();
    $b = body();
    $args = [(int) ($b['laneId'] ?? 0), (string) ($b['label'] ?? ''), !empty($b['done']) ? 1 : 0, (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE lane_items SET lane_id=?, label=?, done=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO lane_items (lane_id, label, done, sort, updated_by, updated_at) VALUES(?, ?, ?, COALESCE(?, 100), ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_lane_item_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM lane_items WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_invite(): void
{
    $u = require_user();
    $b = body();
    $active = !empty($b['active']) || !isset($b['active']) ? 1 : 0;
    if (!empty($b['id'])) {
        $id = (int) $b['id'];
        db()->prepare('UPDATE invites SET label=?, active=?, updated_by=?, updated_at=NOW() WHERE id=?')
            ->execute([(string) ($b['label'] ?? ''), $active, $u['id'], $id]);
        $st = db()->prepare('SELECT token FROM invites WHERE id=?');
        $st->execute([$id]);
        $token = (string) ($st->fetchColumn() ?: '');
    } else {
        $token = bin2hex(random_bytes(16));
        db()->prepare('INSERT INTO invites (token, label, active, updated_by, updated_at) VALUES(?, ?, 1, ?, NOW())')
            ->execute([$token, (string) ($b['label'] ?? ''), $u['id']]);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'token' => $token, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_invite_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM rsvps WHERE invite_id = ?')->execute([$id]);
    db()->prepare('DELETE FROM invites WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_rsvp_add(): void
{
    $u = require_user();
    $b = body();
    $inviteId = (int) ($b['invite_id'] ?? 0);
    $st = db()->prepare('SELECT 1 FROM invites WHERE id = ?');
    $st->execute([$inviteId]);
    if (!$st->fetchColumn()) {
        json_out(['error' => 'bad request'], 400);
    }
    $side = in_array($b['side'] ?? '', GUEST_SIDES, true) ? $b['side'] : 'both';
    $attending = in_array($b['attending'] ?? '', ['yes', 'no'], true) ? $b['attending'] : 'yes';
    $head = max(1, min(20, (int) ($b['headcount'] ?? 1)));
    db()->prepare('INSERT INTO rsvps (invite_id, name, side, headcount, attending, message, created_at) VALUES(?, ?, ?, ?, ?, ?, NOW())')
        ->execute([$inviteId, mb_substr((string) ($b['name'] ?? ''), 0, 191), $side, $head, $attending, mb_substr((string) ($b['message'] ?? ''), 0, 500)]);
    json_out(['id' => (int) db()->lastInsertId(), 'rev' => bump_rev((int) $u['id'])]);
}

function handle_rsvp_update(): void
{
    $u = require_user();
    $b = body();
    $side = in_array($b['side'] ?? '', GUEST_SIDES, true) ? $b['side'] : 'both';
    $attending = in_array($b['attending'] ?? '', ['yes', 'no'], true) ? $b['attending'] : 'yes';
    $head = max(1, min(20, (int) ($b['headcount'] ?? 1)));
    db()->prepare('UPDATE rsvps SET name=?, side=?, headcount=?, attending=?, message=? WHERE id=?')
        ->execute([mb_substr((string) ($b['name'] ?? ''), 0, 191), $side, $head, $attending, mb_substr((string) ($b['message'] ?? ''), 0, 500), (int) ($b['id'] ?? 0)]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_rsvp_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM rsvps WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

// PUBLIC. Submit an RSVP by token. No session; the token is the authorization.
// A GUEST token writes back to that guest party (confirmed count capped at the
// seats the couple allotted). A legacy generic INVITE token still records an
// rsvp row AND folds the reply into a new guest party so it joins the one list.
function handle_rsvp_submit(): void
{
    usleep(250000);
    $token = (string) ($_GET['token'] ?? '');
    $b = body();
    $side = in_array($b['side'] ?? '', GUEST_SIDES, true) ? $b['side'] : 'both';
    $attending = in_array($b['attending'] ?? '', ['yes', 'no'], true) ? $b['attending'] : 'yes';
    $head = max(1, min(20, (int) ($b['headcount'] ?? 1)));
    $name = mb_substr((string) ($b['name'] ?? ''), 0, 191);
    $msg = mb_substr((string) ($b['message'] ?? ''), 0, 500);
    $rsvp = $attending === 'yes' ? 'yes' : 'no';

    // Guest token: write back to that party's row.
    $g = db()->prepare('SELECT id, seats FROM guests WHERE token = ? LIMIT 1');
    $g->execute([$token]);
    if ($row = $g->fetch()) {
        // A "yes" firms the confirmed count, capped at the allotted seats; a "no"
        // leaves the allotment untouched (rsvp='no' excludes it from headcount).
        $seats = $attending === 'yes'
            ? max(1, min((int) $row['seats'], $head))
            : (int) $row['seats'];
        db()->prepare('UPDATE guests SET rsvp=?, seats=?, message=?, replied_at=NOW() WHERE id=?')
            ->execute([$rsvp, $seats, $msg, (int) $row['id']]);
        bump_rev(0);
        json_out(['ok' => true]);
    }

    // Legacy generic invite link.
    $st = db()->prepare('SELECT id FROM invites WHERE token = ? AND active = 1');
    $st->execute([$token]);
    $inv = $st->fetch();
    if (!$inv) {
        json_out(['error' => 'not found'], 404);
    }
    db()->prepare('INSERT INTO rsvps (invite_id, name, side, headcount, attending, message, created_at) VALUES(?, ?, ?, ?, ?, ?, NOW())')
        ->execute([(int) $inv['id'], $name, $side, $head, $attending, $msg]);
    // Fold the reply into a guest party so every reply lands in the one list.
    db()->prepare(
        "INSERT INTO guests (name, side, seats, rsvp, notes, message, replied_at, token, updated_at)
         VALUES (?, ?, ?, ?, '', ?, NOW(), LOWER(HEX(RANDOM_BYTES(16))), NOW())"
    )->execute([$name !== '' ? $name : 'Guest', $side, $head, $rsvp, $msg]);
    bump_rev(0);
    json_out(['ok' => true]);
}

// PUBLIC. Info for the RSVP page. A guest token prefills that party's own reply
// (name, allotted seats, side, current answer); a legacy invite token returns
// its label. `kind` tells the page which form to render.
function handle_invite_info(): void
{
    $token = (string) ($_GET['token'] ?? '');
    $wed = setting_get('wedDate') ?: '2026-08-14';

    $g = db()->prepare('SELECT name, side, seats, rsvp, message FROM guests WHERE token = ? LIMIT 1');
    $g->execute([$token]);
    if ($row = $g->fetch()) {
        json_out([
            'kind' => 'guest',
            'name' => $row['name'],
            'side' => $row['side'],
            'seats' => (int) $row['seats'],
            'rsvp' => $row['rsvp'],
            'message' => $row['message'],
            'wedDate' => $wed,
        ]);
    }

    $st = db()->prepare('SELECT label, active FROM invites WHERE token = ?');
    $st->execute([$token]);
    $inv = $st->fetch();
    if (!$inv || !$inv['active']) {
        json_out(['error' => 'not found'], 404);
    }
    json_out(['kind' => 'invite', 'label' => $inv['label'], 'active' => (bool) $inv['active'], 'wedDate' => $wed]);
}

const REMARK_MAX = 1000;
const UPLOAD_MAX_BYTES = 120 * 1024 * 1024; // 120 MB per file
const UPLOAD_DIR = __DIR__ . '/../../uploads'; // above the web root, never served directly
const UPLOAD_EXT = [
    'pdf', 'ppt', 'pptx', 'key', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'zip',
    'mp4', 'mov', 'm4v', 'webm', // walkthrough videos, at the 120 MB ceiling
];

function catalog_exists(int $id): bool
{
    $st = db()->prepare('SELECT 1 FROM catalog WHERE id = ?');
    $st->execute([$id]);
    return (bool) $st->fetchColumn();
}

function handle_catalog_remark(): void
{
    $u = require_user();
    $b = body();
    $cid = (int) ($b['catalogId'] ?? 0);
    $body = trim((string) ($b['body'] ?? ''));
    if ($cid <= 0 || !catalog_exists($cid) || $body === '') {
        json_out(['error' => 'bad request'], 400);
    }
    db()->prepare('INSERT INTO catalog_remarks (catalog_id, body, created_by, created_at) VALUES(?, ?, ?, NOW())')
        ->execute([$cid, mb_substr($body, 0, REMARK_MAX), $u['id']]);
    json_out(['id' => (int) db()->lastInsertId(), 'rev' => bump_rev((int) $u['id'])]);
}

function handle_catalog_remark_update(): void
{
    $u = require_user();
    $b = body();
    $body = trim((string) ($b['body'] ?? ''));
    if ($body === '') {
        json_out(['error' => 'bad request'], 400);
    }
    db()->prepare('UPDATE catalog_remarks SET body=? WHERE id=?')
        ->execute([mb_substr($body, 0, REMARK_MAX), (int) ($b['id'] ?? 0)]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_catalog_remark_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM catalog_remarks WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

// Multipart. Stores the bytes under UPLOAD_DIR with a random name; the row keeps the
// original filename for display and download.
function handle_catalog_file_upload(): void
{
    $u = require_user();
    $cid = (int) ($_POST['catalogId'] ?? 0);
    if ($cid <= 0 || !catalog_exists($cid)) {
        json_out(['error' => 'bad request'], 400);
    }
    $f = $_FILES['file'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
        json_out(['error' => 'no file'], 400);
    }
    if ((int) $f['size'] > UPLOAD_MAX_BYTES) {
        json_out(['error' => 'file too large (max 120 MB)'], 400);
    }
    $orig = mb_substr((string) ($f['name'] ?? 'file'), 0, 255);
    $ext = strtolower((string) pathinfo($orig, PATHINFO_EXTENSION));
    if (!in_array($ext, UPLOAD_EXT, true)) {
        json_out(['error' => 'file type not allowed'], 400);
    }
    if (!is_dir(UPLOAD_DIR) && !mkdir(UPLOAD_DIR, 0700, true) && !is_dir(UPLOAD_DIR)) {
        json_out(['error' => 'server error'], 500);
    }
    $stored = bin2hex(random_bytes(16)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], UPLOAD_DIR . '/' . $stored)) {
        json_out(['error' => 'server error'], 500);
    }
    $mime = mb_substr((string) ($f['type'] ?? 'application/octet-stream'), 0, 128);
    db()->prepare(
        'INSERT INTO catalog_files (catalog_id, orig_name, stored_name, mime, size_bytes, uploaded_by, created_at)
         VALUES(?, ?, ?, ?, ?, ?, NOW())'
    )->execute([$cid, $orig, $stored, $mime, (int) $f['size'], $u['id']]);
    json_out(['id' => (int) db()->lastInsertId(), 'rev' => bump_rev((int) $u['id'])]);
}

// Streams a stored file back to the logged-in couple. Not JSON.
function handle_catalog_file_download(): void
{
    require_user();
    $id = (int) ($_GET['id'] ?? 0);
    $st = db()->prepare('SELECT orig_name, stored_name, mime FROM catalog_files WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    $path = $row ? UPLOAD_DIR . '/' . basename((string) $row['stored_name']) : '';
    if (!$row || !is_file($path)) {
        json_out(['error' => 'not found'], 404);
    }
    header('Content-Type: ' . ($row['mime'] ?: 'application/octet-stream'));
    header('Content-Length: ' . (string) filesize($path));
    header('Content-Disposition: attachment; filename="' . str_replace('"', '', (string) $row['orig_name']) . '"');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

function handle_catalog_file_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    $st = db()->prepare('SELECT stored_name FROM catalog_files WHERE id = ?');
    $st->execute([$id]);
    $stored = $st->fetchColumn();
    if ($stored) {
        @unlink(UPLOAD_DIR . '/' . basename((string) $stored));
    }
    db()->prepare('DELETE FROM catalog_files WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

const PASS_CAP = 200;

// Pull a bare token out of whatever the door scanner decoded: a full pass.html
// URL, a "token=..." query, or the raw 32-hex token on its own.
function pass_token_from(string $raw): string
{
    $raw = trim($raw);
    if (preg_match('/[?&]token=([0-9a-f]{32})/i', $raw, $m)) {
        return strtolower($m[1]);
    }
    if (preg_match('/^[0-9a-f]{32}$/i', $raw)) {
        return strtolower($raw);
    }
    return '';
}

// Mint up to `count` new passes, never exceeding PASS_CAP total.
function handle_passes_generate(): void
{
    $u = require_user();
    $b = body();
    $want = max(1, min(PASS_CAP, (int) ($b['count'] ?? 1)));
    $existing = (int) db()->query('SELECT COUNT(*) FROM passes WHERE guest_id IS NULL')->fetchColumn();
    $room = PASS_CAP - $existing;
    if ($room <= 0) {
        json_out(['created' => 0, 'total' => $existing, 'cap' => PASS_CAP, 'rev' => get_rev()]);
    }
    $make = min($want, $room);
    $ins = db()->prepare('INSERT INTO passes (token, label, status, created_by, created_at) VALUES(?, ?, \'unused\', ?, NOW())');
    for ($i = 0; $i < $make; $i++) {
        $ins->execute([bin2hex(random_bytes(16)), '', $u['id']]);
    }
    json_out(['created' => $make, 'total' => $existing + $make, 'cap' => PASS_CAP, 'rev' => bump_rev((int) $u['id'])]);
}

// Mint a single labelled pass, still bounded by PASS_CAP.
function handle_pass_add(): void
{
    $u = require_user();
    $b = body();
    if ((int) db()->query('SELECT COUNT(*) FROM passes WHERE guest_id IS NULL')->fetchColumn() >= PASS_CAP) {
        json_out(['error' => 'pass cap reached'], 400);
    }
    $token = bin2hex(random_bytes(16));
    db()->prepare('INSERT INTO passes (token, label, status, created_by, created_at) VALUES(?, ?, \'unused\', ?, NOW())')
        ->execute([$token, mb_substr((string) ($b['label'] ?? ''), 0, 191), $u['id']]);
    json_out(['id' => (int) db()->lastInsertId(), 'rev' => bump_rev((int) $u['id']), 'token' => $token]);
}

// Rename a pass (who it is for). Never resets status.
function handle_pass(): void
{
    $u = require_user();
    $b = body();
    $id = (int) ($b['id'] ?? 0);
    if ($id <= 0) {
        json_out(['error' => 'bad id'], 400);
    }
    db()->prepare('UPDATE passes SET label=? WHERE id=?')
        ->execute([mb_substr((string) ($b['label'] ?? ''), 0, 191), $id]);
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_pass_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM passes WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

// The door. Redemption is a single atomic UPDATE guarded on status='unused', so two
// simultaneous scans of the same code can never both succeed.
function handle_pass_redeem(): void
{
    $u = require_user();
    $token = pass_token_from((string) (body()['token'] ?? ''));
    if ($token === '') {
        json_out(['result' => 'invalid', 'rev' => get_rev()]);
    }
    $upd = db()->prepare(
        'UPDATE passes SET status=\'redeemed\', redeemed_at=NOW(), redeemed_by=? WHERE token=? AND status=\'unused\''
    );
    $upd->execute([$u['id'], $token]);
    if ($upd->rowCount() === 1) {
        $st = db()->prepare('SELECT label FROM passes WHERE token=?');
        $st->execute([$token]);
        json_out(['result' => 'ok', 'label' => (string) ($st->fetchColumn() ?: ''), 'rev' => bump_rev((int) $u['id'])]);
    }
    $st = db()->prepare('SELECT label, status, redeemed_at, redeemed_by FROM passes WHERE token=?');
    $st->execute([$token]);
    $p = $st->fetch();
    if (!$p) {
        json_out(['result' => 'invalid', 'rev' => get_rev()]);
    }
    $users = users_map();
    $by = ($p['redeemed_by'] !== null && isset($users[(int) $p['redeemed_by']])) ? $users[(int) $p['redeemed_by']] : null;
    json_out([
        'result' => 'used',
        'label' => (string) $p['label'],
        'redeemedAt' => $p['redeemed_at'],
        'redeemedBy' => $by,
        'rev' => get_rev(),
    ]);
}

function handle_pass_unredeem(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('UPDATE passes SET status=\'unused\', redeemed_at=NULL, redeemed_by=NULL WHERE id=?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

// PUBLIC. What a guest sees when they scan their own pass. Read-only, never redeems.
function handle_pass_info(): void
{
    $token = pass_token_from((string) ($_GET['token'] ?? ''));
    if ($token === '') {
        json_out(['error' => 'not found'], 404);
    }
    $st = db()->prepare('SELECT label, status, redeemed_at FROM passes WHERE token = ?');
    $st->execute([$token]);
    $p = $st->fetch();
    if (!$p) {
        json_out(['error' => 'not found'], 404);
    }
    json_out([
        'label' => (string) $p['label'],
        'status' => $p['status'],
        'redeemedAt' => $p['redeemed_at'],
        'wedDate' => setting_get('wedDate') ?: '2026-08-14',
    ]);
}

const OWNERS = ['you', 'men', 'her', 'hall'];

function handle_check_item(): void
{
    $u = require_user();
    $b = body();
    $owner = in_array($b['owner'] ?? '', OWNERS, true) ? $b['owner'] : 'you';
    $args = [(string) ($b['phase'] ?? ''), (string) ($b['text'] ?? ''), $owner, (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE check_items SET phase=?, text=?, owner=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO check_items (phase, text, owner, sort, updated_by, updated_at) VALUES(?, ?, ?, ?, ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_check_item_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM check_items WHERE id = ?')->execute([$id]);
    db()->prepare('DELETE FROM checks WHERE item_key = ?')->execute(["ci-{$id}"]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_check_override(): void
{
    $u = require_user();
    $b = body();
    $key = trim((string) ($b['key'] ?? ''));
    if ($key === '') {
        json_out(['error' => 'missing key'], 400);
    }
    db()->prepare(
        'INSERT INTO check_overrides(item_key, text, updated_by, updated_at) VALUES(?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE text = VALUES(text), updated_by = VALUES(updated_by), updated_at = NOW()'
    )->execute([$key, mb_substr((string) ($b['text'] ?? ''), 0, 500), $u['id']]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_check_override_delete(): void
{
    $u = require_user();
    $key = trim((string) (body()['key'] ?? ''));
    if ($key === '') {
        json_out(['error' => 'missing key'], 400);
    }
    db()->prepare('DELETE FROM check_overrides WHERE item_key = ?')->execute([$key]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_hide_check(): void
{
    $u = require_user();
    $b = body();
    $key = trim((string) ($b['key'] ?? ''));
    if ($key === '') {
        json_out(['error' => 'missing key'], 400);
    }
    if (!empty($b['hidden'])) {
        db()->prepare('INSERT INTO hidden_checks (item_key, updated_by, updated_at) VALUES(?, ?, NOW()) ON DUPLICATE KEY UPDATE updated_by = VALUES(updated_by), updated_at = NOW()')->execute([$key, $u['id']]);
    } else {
        db()->prepare('DELETE FROM hidden_checks WHERE item_key = ?')->execute([$key]);
    }
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_fact(): void
{
    $u = require_user();
    $b = body();
    $args = [(string) ($b['label'] ?? ''), (string) ($b['value'] ?? ''), (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE facts SET label=?, value=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO facts (label, value, sort, updated_by, updated_at) VALUES(?, ?, ?, ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_fact_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM facts WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_open_item(): void
{
    $u = require_user();
    $b = body();
    $owner = in_array($b['owner'] ?? '', OWNERS, true) ? $b['owner'] : 'you';
    $args = [(string) ($b['title'] ?? ''), (string) ($b['detail'] ?? ''), $owner, (array_key_exists('sort', $b) ? (int) $b['sort'] : null), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE open_items SET title=?, detail=?, owner=?, sort = COALESCE(?, sort), updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO open_items (title, detail, owner, sort, updated_by, updated_at) VALUES(?, ?, ?, ?, ?, NOW())')->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_open_item_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM open_items WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}

function handle_setting(): void
{
    $u = require_user();
    $b = body();
    $k = trim((string) ($b['k'] ?? ''));
    if ($k === '' || $k === 'rev') {
        json_out(['error' => 'bad key'], 400);
    }
    db()->prepare(
        'INSERT INTO settings(k, v, updated_by, updated_at) VALUES(?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE v = VALUES(v), updated_by = VALUES(updated_by), updated_at = NOW()'
    )->execute([$k, (string) ($b['v'] ?? ''), $u['id']]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
}
