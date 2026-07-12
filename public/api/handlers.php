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
    $args = [
        (string) ($b['category'] ?? ''),
        (string) ($b['name'] ?? ''),
        (string) ($b['contact'] ?? ''),
        $status,
        num_in($b['quote'] ?? ''),
        num_in($b['deposit'] ?? ''),
        num_in($b['balance'] ?? ''),
        num_in($b['balance_due'] ?? ''),
        $u['id'],
    ];

    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare(
            'UPDATE vendors SET category=?, name=?, contact=?, status=?, quote=?, deposit=?, balance=?,
             balance_due=?, updated_by=?, updated_at=NOW() WHERE id=?'
        )->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare(
            'INSERT INTO vendors(category, name, contact, status, quote, deposit, balance, balance_due, updated_by, updated_at)
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
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
        db()->prepare(
            'INSERT INTO guests(name, side, seats, rsvp, notes, updated_by, updated_at) VALUES(?, ?, ?, ?, ?, ?, NOW())'
        )->execute($args);
        $id = (int) db()->lastInsertId();
    }
    json_out(['id' => $id, 'rev' => bump_rev((int) $u['id'])]);
}

function handle_guest_delete(): void
{
    $u = require_user();
    $id = (int) (body()['id'] ?? 0);
    db()->prepare('DELETE FROM guests WHERE id = ?')->execute([$id]);
    json_out(['rev' => bump_rev((int) $u['id'])]);
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
        (int) ($b['sort'] ?? 100),
        $u['id'],
    ];

    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare(
            'UPDATE catalog SET category=?, name=?, area=?, phone=?, instagram=?, maps_query=?, capacity=?,
             segregated=?, female_crew=?, featured=?, status=?, note=?, verify=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?'
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
    $args = [(string) ($b['label'] ?? ''), $date, (string) ($b['note'] ?? ''), (int) ($b['sort'] ?? 100), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE important_dates SET label=?, on_date=?, note=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
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
    $args = [(string) ($b['name'] ?? ''), (int) ($b['sort'] ?? 100), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE bundles SET name=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
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
    $args = [(int) ($b['bundleId'] ?? 0), (string) ($b['label'] ?? ''), num_in($b['cost'] ?? ''), (int) ($b['sort'] ?? 100), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE bundle_items SET bundle_id=?, label=?, cost=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
        $id = (int) $b['id'];
    } else {
        db()->prepare('INSERT INTO bundle_items (bundle_id, label, cost, sort, updated_by, updated_at) VALUES(?, ?, ?, ?, ?, NOW())')->execute($args);
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

// PUBLIC. Guests submit an RSVP by invite token. No session; the token is the authorization.
function handle_rsvp_submit(): void
{
    usleep(250000);
    $token = (string) ($_GET['token'] ?? '');
    $st = db()->prepare('SELECT id FROM invites WHERE token = ? AND active = 1');
    $st->execute([$token]);
    $inv = $st->fetch();
    if (!$inv) {
        json_out(['error' => 'not found'], 404);
    }
    $b = body();
    $side = in_array($b['side'] ?? '', GUEST_SIDES, true) ? $b['side'] : 'both';
    $attending = in_array($b['attending'] ?? '', ['yes', 'no'], true) ? $b['attending'] : 'yes';
    $head = max(1, min(20, (int) ($b['headcount'] ?? 1)));
    db()->prepare('INSERT INTO rsvps (invite_id, name, side, headcount, attending, message, created_at) VALUES(?, ?, ?, ?, ?, ?, NOW())')
        ->execute([(int) $inv['id'], mb_substr((string) ($b['name'] ?? ''), 0, 191), $side, $head, $attending, mb_substr((string) ($b['message'] ?? ''), 0, 500)]);
    bump_rev(0);
    json_out(['ok' => true]);
}

// PUBLIC. Minimal invite info for the guest RSVP page.
function handle_invite_info(): void
{
    $token = (string) ($_GET['token'] ?? '');
    $st = db()->prepare('SELECT label, active FROM invites WHERE token = ?');
    $st->execute([$token]);
    $inv = $st->fetch();
    if (!$inv || !$inv['active']) {
        json_out(['error' => 'not found'], 404);
    }
    json_out(['label' => $inv['label'], 'active' => (bool) $inv['active'], 'wedDate' => setting_get('wedDate') ?: '2026-08-14']);
}

const OWNERS = ['you', 'men', 'her', 'hall'];

function handle_check_item(): void
{
    $u = require_user();
    $b = body();
    $owner = in_array($b['owner'] ?? '', OWNERS, true) ? $b['owner'] : 'you';
    $args = [(string) ($b['phase'] ?? ''), (string) ($b['text'] ?? ''), $owner, (int) ($b['sort'] ?? 100), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE check_items SET phase=?, text=?, owner=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
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
    $args = [(string) ($b['label'] ?? ''), (string) ($b['value'] ?? ''), (int) ($b['sort'] ?? 100), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE facts SET label=?, value=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
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
    $args = [(string) ($b['title'] ?? ''), (string) ($b['detail'] ?? ''), $owner, (int) ($b['sort'] ?? 100), $u['id']];
    if (!empty($b['id'])) {
        $args[] = (int) $b['id'];
        db()->prepare('UPDATE open_items SET title=?, detail=?, owner=?, sort=?, updated_by=?, updated_at=NOW() WHERE id=?')->execute($args);
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
