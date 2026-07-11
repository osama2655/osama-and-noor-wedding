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

function catalog_row(array $r, array $users): array
{
    return with_attr([
        'id' => (int) $r['id'],
        'category' => $r['category'],
        'name' => $r['name'],
        'area' => $r['area'],
        'phone' => $r['phone'],
        'instagram' => $r['instagram'],
        'mapsQuery' => $r['maps_query'],
        'capacity' => $r['capacity'] !== null ? (int) $r['capacity'] : null,
        'segregated' => (bool) $r['segregated'],
        'femaleCrew' => (bool) $r['female_crew'],
        'featured' => (bool) $r['featured'],
        'status' => $r['status'],
        'note' => $r['note'],
        'verify' => $r['verify'],
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

    $catalog = [];
    foreach ($pdo->query('SELECT * FROM catalog ORDER BY category, sort, id') as $r) {
        $catalog[] = catalog_row($r, $users);
    }

    $notes = [];
    foreach ($pdo->query('SELECT * FROM notes ORDER BY updated_at DESC, id DESC') as $r) {
        $notes[] = with_attr(['id' => (int) $r['id'], 'title' => $r['title'], 'body' => $r['body']], $r, $users, 'updated_by');
    }

    $dates = [];
    foreach ($pdo->query('SELECT * FROM important_dates ORDER BY on_date IS NULL, on_date, sort, id') as $r) {
        $dates[] = with_attr([
            'id' => (int) $r['id'],
            'label' => $r['label'],
            'date' => $r['on_date'] ?? '',
            'note' => $r['note'],
        ], $r, $users, 'updated_by');
    }

    $itemsByBundle = [];
    foreach ($pdo->query('SELECT * FROM bundle_items ORDER BY sort, id') as $r) {
        $bid = (int) $r['bundle_id'];
        $itemsByBundle[$bid][] = with_attr([
            'id' => (int) $r['id'],
            'label' => $r['label'],
            'cost' => num_out($r['cost']),
        ], $r, $users, 'updated_by');
    }
    $bundles = [];
    foreach ($pdo->query('SELECT * FROM bundles ORDER BY sort, id') as $r) {
        $bid = (int) $r['id'];
        $items = $itemsByBundle[$bid] ?? [];
        $forecast = 0.0;
        foreach ($items as $it) {
            $forecast += (float) ($it['cost'] === '' ? 0 : $it['cost']);
        }
        $bundles[] = with_attr([
            'id' => $bid,
            'name' => $r['name'],
            'items' => $items,
            'forecast' => num_out((string) $forecast),
        ], $r, $users, 'updated_by');
    }

    $rsvpsByInvite = [];
    foreach ($pdo->query('SELECT * FROM rsvps ORDER BY id DESC') as $r) {
        $rsvpsByInvite[(int) $r['invite_id']][] = [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'side' => $r['side'],
            'headcount' => (int) $r['headcount'],
            'attending' => $r['attending'],
            'message' => $r['message'],
            'at' => $r['created_at'],
        ];
    }
    $invites = [];
    foreach ($pdo->query('SELECT * FROM invites ORDER BY id') as $r) {
        $iid = (int) $r['id'];
        $rs = $rsvpsByInvite[$iid] ?? [];
        $invites[] = with_attr([
            'id' => $iid,
            'token' => $r['token'],
            'label' => $r['label'],
            'active' => (bool) $r['active'],
            'rsvps' => $rs,
            'rsvpCount' => count($rs),
        ], $r, $users, 'updated_by');
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
        'catalog' => $catalog,
        'notes' => $notes,
        'dates' => $dates,
        'bundles' => $bundles,
        'invites' => $invites,
        'budgetMin' => 1000,
        'budgetMax' => 1200,
        'rev' => $rev,
    ]);
}
