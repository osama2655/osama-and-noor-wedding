<?php
declare(strict_types=1);

function users_map(): array
{
    $map = [];
    foreach (db()->query('SELECT id, display_name FROM users') as $r) {
        $map[(int) $r['id']] = $r['display_name'];
    }
    return $map;
}

function vendor_row(array $r, array $users): array
{
    return with_attr([
        'id' => (int) $r['id'],
        'category' => $r['category'],
        'name' => $r['name'],
        'contact' => $r['contact'],
        'status' => $r['status'],
        'quote' => num_out($r['quote']),
        'deposit' => num_out($r['deposit']),
        'balance' => num_out($r['balance']),
        'balance_due' => $r['balance_due'] ?? '',
    ], $r, $users, 'updated_by');
}

function guest_row(array $r, array $users): array
{
    return with_attr([
        'id' => (int) $r['id'],
        'name' => $r['name'],
        'side' => $r['side'],
        'seats' => (string) (int) $r['seats'],
        'rsvp' => $r['rsvp'],
        'notes' => $r['notes'],
    ], $r, $users, 'updated_by');
}

function handle_state(): void
{
    $u = require_user();
    $rev = get_rev();

    $clientRev = $_GET['rev'] ?? null;
    if ($clientRev !== null && ctype_digit((string) $clientRev) && (int) $clientRev === $rev) {
        json_out(['rev' => $rev, 'same' => true]);
    }

    $pdo = db();
    $users = users_map();

    $checks = [];
    foreach ($pdo->query('SELECT * FROM checks') as $r) {
        $checks[$r['item_key']] = with_attr(['done' => (bool) $r['done']], $r, $users, 'marked_by');
    }

    $decisions = [];
    foreach ($pdo->query('SELECT * FROM decisions') as $r) {
        $decisions[(int) $r['idx']] = with_attr(['answer' => $r['answer']], $r, $users, 'updated_by');
    }

    $vendors = [];
    foreach ($pdo->query('SELECT * FROM vendors ORDER BY sort, id') as $r) {
        $vendors[] = vendor_row($r, $users);
    }

    $guests = [];
    foreach ($pdo->query('SELECT * FROM guests ORDER BY id') as $r) {
        $guests[] = guest_row($r, $users);
    }

    $picks = [];
    foreach ($pdo->query('SELECT * FROM picks') as $r) {
        $picks[$r['vendor_key']] = with_attr([], $r, $users, 'picked_by');
    }

    json_out([
        'me' => user_public($u),
        'wedDate' => setting_get('wedDate') ?: '2026-08-14',
        'theme' => setting_get('theme') ?: 'gold',
        'checks' => $checks,
        'decisions' => $decisions,
        'vendors' => $vendors,
        'guests' => $guests,
        'picks' => $picks,
        'rev' => $rev,
    ]);
}
