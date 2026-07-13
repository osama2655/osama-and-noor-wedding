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

    $checkItems = [];
    foreach ($pdo->query('SELECT * FROM check_items ORDER BY phase, sort, id') as $r) {
        $checkItems[] = with_attr([
            'id' => (int) $r['id'],
            'phase' => $r['phase'],
            'text' => $r['text'],
            'owner' => $r['owner'],
        ], $r, $users, 'updated_by');
    }

    $hiddenChecks = [];
    foreach ($pdo->query('SELECT item_key FROM hidden_checks') as $r) {
        $hiddenChecks[$r['item_key']] = true;
    }

    // Editable text for built-in checklist rows. Tolerate the table not yet existing.
    $checkOverrides = [];
    try {
        foreach ($pdo->query('SELECT item_key, text FROM check_overrides') as $r) {
            $checkOverrides[$r['item_key']] = $r['text'];
        }
    } catch (Throwable $e) {
        error_log('[wedding-api] check_overrides table missing; run schema.sql');
    }

    $facts = [];
    foreach ($pdo->query('SELECT * FROM facts ORDER BY sort, id') as $r) {
        $facts[] = with_attr(['id' => (int) $r['id'], 'label' => $r['label'], 'value' => $r['value']], $r, $users, 'updated_by');
    }

    $openItems = [];
    foreach ($pdo->query('SELECT * FROM open_items ORDER BY sort, id') as $r) {
        $openItems[] = with_attr(['id' => (int) $r['id'], 'title' => $r['title'], 'detail' => $r['detail'], 'owner' => $r['owner']], $r, $users, 'updated_by');
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

    // Tolerate the catalog_remarks / catalog_files tables not yet existing (schema.sql
    // not reloaded after this feature deployed) so the planner stays up meanwhile.
    $remarksByCat = [];
    $filesByCat = [];
    try {
        foreach ($pdo->query('SELECT * FROM catalog_remarks ORDER BY id DESC') as $r) {
            $bid = $r['created_by'] !== null ? (int) $r['created_by'] : null;
            $remarksByCat[(int) $r['catalog_id']][] = [
                'id' => (int) $r['id'],
                'body' => $r['body'],
                'by' => ($bid !== null && isset($users[$bid])) ? $users[$bid] : null,
                'byId' => $bid,
                'at' => $r['created_at'],
            ];
        }
        foreach ($pdo->query('SELECT * FROM catalog_files ORDER BY id DESC') as $r) {
            $bid = $r['uploaded_by'] !== null ? (int) $r['uploaded_by'] : null;
            $filesByCat[(int) $r['catalog_id']][] = [
                'id' => (int) $r['id'],
                'name' => $r['orig_name'],
                'size' => (int) $r['size_bytes'],
                'by' => ($bid !== null && isset($users[$bid])) ? $users[$bid] : null,
                'at' => $r['created_at'],
            ];
        }
    } catch (Throwable $e) {
        error_log('[wedding-api] catalog_remarks/files tables missing; run schema.sql');
    }

    $catalog = [];
    foreach ($pdo->query('SELECT * FROM catalog ORDER BY category, sort, id') as $r) {
        $row = catalog_row($r, $users);
        $row['remarks'] = $remarksByCat[(int) $r['id']] ?? [];
        $row['files'] = $filesByCat[(int) $r['id']] ?? [];
        $catalog[] = $row;
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

    // "Who owns what" lanes. Tolerate the tables not yet existing (schema.sql not
    // reloaded after this feature deployed) so the planner stays up meanwhile.
    $lanes = [];
    try {
        $itemsByLane = [];
        foreach ($pdo->query('SELECT * FROM lane_items ORDER BY sort, id') as $r) {
            $itemsByLane[(int) $r['lane_id']][] = with_attr([
                'id' => (int) $r['id'],
                'label' => $r['label'],
                'done' => (bool) $r['done'],
            ], $r, $users, 'updated_by');
        }
        foreach ($pdo->query('SELECT * FROM lanes ORDER BY sort, id') as $r) {
            $lid = (int) $r['id'];
            $lanes[] = with_attr([
                'id' => $lid,
                'title' => $r['title'],
                'note' => $r['note'],
                'tag' => $r['tag'],
                'items' => $itemsByLane[$lid] ?? [],
            ], $r, $users, 'updated_by');
        }
    } catch (Throwable $e) {
        error_log('[wedding-api] lanes tables missing; run schema.sql');
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

    // Tolerate the passes table not yet existing (schema.sql not reloaded after
    // this feature deployed) so the whole planner does not go down meanwhile.
    $passes = [];
    try {
        foreach ($pdo->query('SELECT * FROM passes ORDER BY id') as $r) {
            $rby = $r['redeemed_by'] !== null ? (int) $r['redeemed_by'] : null;
            $passes[] = [
                'id' => (int) $r['id'],
                'token' => $r['token'],
                'label' => $r['label'],
                'status' => $r['status'],
                'redeemedAt' => $r['redeemed_at'],
                'redeemedBy' => ($rby !== null && isset($users[$rby])) ? $users[$rby] : null,
            ];
        }
    } catch (Throwable $e) {
        error_log('[wedding-api] passes table missing; run schema.sql');
    }

    json_out([
        'me' => user_public($u),
        'passes' => $passes,
        'passCap' => 200,
        'wedDate' => setting_get('wedDate') ?: '2026-08-14',
        'theme' => setting_get('theme') ?: 'gold',
        'checks' => $checks,
        'checkItems' => $checkItems,
        'hiddenChecks' => $hiddenChecks,
        'checkOverrides' => $checkOverrides,
        'facts' => $facts,
        'openItems' => $openItems,
        'decisions' => $decisions,
        'vendors' => $vendors,
        'guests' => $guests,
        'picks' => $picks,
        'catalog' => $catalog,
        'notes' => $notes,
        'dates' => $dates,
        'bundles' => $bundles,
        'lanes' => $lanes,
        'invites' => $invites,
        'budgetMin' => (int) (setting_get('budgetMin') ?: 1000),
        'budgetMax' => (int) (setting_get('budgetMax') ?: 1200),
        'rev' => $rev,
    ]);
}
