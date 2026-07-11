# Osama & Noor: Wedding Planner

A small shared wedding-planner web app for two people (Osama and Noor) planning a
Bahrain wedding. It is a plain PHP + MySQL app with a vanilla JavaScript
(ES modules) frontend. No framework, no build step.

The plan text itself (the 8 decisions, the checklist, the ownership lanes, the
vendor shortlist, the resource links) is fixed and lives in the frontend
(`public/js/content.js`). Only the *state* you change (checkmarks, decision
answers, vendor rows and prices, guests, the wedding date) is stored in the
database and shared between both accounts.

## How login works

There are exactly two accounts, Osama and Noor, each with their own password.
Passwords are verified server-side with PHP `password_verify` against a hash
stored in the `users` table, and a session is issued on success. Both accounts
read and write the same shared MySQL database, so whatever one person changes,
the other sees. Every stored change records who made it, which drives the
"by You / by Noor" attribution shown throughout the UI.

## Tabs

- **Dashboard**: countdown to the wedding date, overall progress, and a summary
  of where things stand.
- **8 Decisions**: the eight big early calls (Milcha/Nikah status, mixed vs
  segregated, one night vs a sequence, guest count, who pays what, budget
  ceiling, style/theme, honeymoon). Each holds a shared answer.
- **Checklist**: the week-by-week task list from Day 34 down to Day 0,
  including the Day -10 gate. Items are tagged you / her / shared and are checked
  off in the shared state.
- **Who owns what**: the ownership lanes: what Osama owns fully, what is shared
  and decided together, and what is Noor's to lead with support.
- **Vendors & £**: the vendor tracker: rows per vendor with status (not started,
  contacted, quoted, booked, paid in full) and prices, plus a shortlist of
  suggested Bahrain vendors you can star as favourites.
- **Guests**: the shared guest list with RSVP tracking.
- **Resources**: directories, local guides, and Instagram accounts to follow.

## Live sync and attribution

The page keeps itself in sync by polling the backend roughly every 5 seconds
(and again whenever the tab regains focus). The server keeps a monotonic global
revision that is bumped on every mutation, so a poll that carries the current
revision can early-out cheaply when nothing has changed. When the revision has
moved, the client pulls fresh state and re-renders, taking care not to clobber a
field you are actively editing (it defers that field's update until you blur it).
Each state row carries who last changed it and when, so the UI can attribute
every change to You or to the other person.

## Local development

This is plain PHP + MySQL with no build step. Serve the `public/` directory with
php-fpm (or `php -S` behind a web server) so the API under `public/api/` runs.

1. Create a MySQL database and load the schema from `public/api/schema.sql`.
2. Set the database connection via environment variables (defaults shown):
   - `DB_HOST` (default `127.0.0.1`)
   - `DB_PORT` (default `3306`)
   - `DB_NAME` (default `wedding`)
   - `DB_USER` (default `root`)
   - `DB_PASS` (default empty)
3. Serve `public/` and open it in a browser. Log in as Osama or Noor.

The API is a single router at `public/api/index.php`; requests come in as
`api/index.php?action=...`. There is no frontend tooling to install, so editing a
file under `public/` and reloading is the full dev loop.

## Deployment

Deployed on Dilmune Cloud at https://wedding.dilmune.app.
