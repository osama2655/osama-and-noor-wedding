-- Osama & Noor wedding planner: shared schema. Run once against the `wedding` database.

CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(32) NOT NULL UNIQUE,
  display_name VARCHAR(64) NOT NULL,
  pass_hash    VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  k          VARCHAR(64) PRIMARY KEY,
  v          TEXT,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checks (
  item_key   VARCHAR(64) PRIMARY KEY,
  done       TINYINT NOT NULL DEFAULT 0,
  marked_by  INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS decisions (
  idx        INT PRIMARY KEY,
  answer     TEXT,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendors (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category    VARCHAR(128) NOT NULL DEFAULT '',
  name        VARCHAR(191) NOT NULL DEFAULT '',
  contact     VARCHAR(191) NOT NULL DEFAULT '',
  status      VARCHAR(16)  NOT NULL DEFAULT 'todo',
  quote       DECIMAL(10,3) NULL,
  deposit     DECIMAL(10,3) NULL,
  balance     DECIMAL(10,3) NULL,
  balance_due DATE NULL,
  catalog_id  INT NULL,
  sort        INT NOT NULL DEFAULT 100,
  updated_by  INT NULL,
  updated_at  TIMESTAMP NULL DEFAULT NULL,
  KEY idx_vendors_catalog (catalog_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guests (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(191) NOT NULL DEFAULT '',
  side       ENUM('you','her','both') NOT NULL DEFAULT 'you',
  seats      INT NOT NULL DEFAULT 1,
  rsvp       ENUM('pending','yes','no') NOT NULL DEFAULT 'pending',
  notes      VARCHAR(255) NOT NULL DEFAULT '',
  token      VARCHAR(32) NULL,
  replied_at TIMESTAMP NULL DEFAULT NULL,
  message    VARCHAR(500) NOT NULL DEFAULT '',
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_guests_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS picks (
  vendor_key VARCHAR(32) PRIMARY KEY,
  picked_by  INT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (name, display_name) VALUES ('osama', 'Osama'), ('noor', 'Noor')
  ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

INSERT INTO settings (k, v) VALUES ('rev', '0'), ('wedDate', '2026-08-21')
  ON DUPLICATE KEY UPDATE v = v;

INSERT INTO vendors (category, status, sort)
SELECT c, 'todo', o FROM (
  SELECT 'Planner' AS c, 1 AS o
  UNION ALL SELECT 'Venue', 2
  UNION ALL SELECT 'Photo + video', 3
  UNION ALL SELECT 'HMUA (hair & makeup)', 4
  UNION ALL SELECT 'Henna artist', 5
  UNION ALL SELECT 'Décor / flowers / kosha', 6
  UNION ALL SELECT 'Catering / menu', 7
  UNION ALL SELECT 'Cake', 8
  UNION ALL SELECT 'Entertainment (DJ / ardha)', 9
  UNION ALL SELECT 'Wedding car / transport', 10
  UNION ALL SELECT 'Invitations', 11
  UNION ALL SELECT 'Your attire (thobe/bisht)', 12
  UNION ALL SELECT 'Honeymoon', 13
) seed
WHERE (SELECT COUNT(*) FROM vendors) = 0;

CREATE TABLE IF NOT EXISTS catalog (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category    VARCHAR(32)  NOT NULL DEFAULT 'venue',
  name        VARCHAR(191) NOT NULL DEFAULT '',
  area        VARCHAR(128) NOT NULL DEFAULT '',
  phone       VARCHAR(64)  NOT NULL DEFAULT '',
  instagram   VARCHAR(128) NOT NULL DEFAULT '',
  maps_query  VARCHAR(191) NOT NULL DEFAULT '',
  capacity    INT NULL,
  segregated  TINYINT NOT NULL DEFAULT 0,
  female_crew TINYINT NOT NULL DEFAULT 0,
  featured    TINYINT NOT NULL DEFAULT 0,
  status      VARCHAR(16)  NOT NULL DEFAULT 'todo',
  note        TEXT,
  verify      VARCHAR(255) NOT NULL DEFAULT '',
  price_min   DECIMAL(10,3) NULL,
  price_max   DECIMAL(10,3) NULL,
  sort        INT NOT NULL DEFAULT 100,
  updated_by  INT NULL,
  updated_at  TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Free-form remarks logged against a catalog item (a hall / photographer), with
-- who said it and when. Append-only; the couple builds up a call history.
CREATE TABLE IF NOT EXISTS catalog_remarks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  catalog_id INT NOT NULL,
  body       VARCHAR(1000) NOT NULL DEFAULT '',
  created_by INT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_catalog_remarks_cat (catalog_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Files attached to a catalog item (quotes, PowerPoints, PDFs). The bytes live on
-- disk above the web root (uploads/, never served directly); this row is metadata.
CREATE TABLE IF NOT EXISTS catalog_files (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  catalog_id  INT NOT NULL,
  orig_name   VARCHAR(255) NOT NULL DEFAULT '',
  stored_name VARCHAR(64) NOT NULL,
  mime        VARCHAR(128) NOT NULL DEFAULT '',
  size_bytes  INT NOT NULL DEFAULT 0,
  uploaded_by INT NULL,
  created_at  TIMESTAMP NULL DEFAULT NULL,
  KEY idx_catalog_files_cat (catalog_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(191) NOT NULL DEFAULT '',
  body       TEXT,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS important_dates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  label      VARCHAR(191) NOT NULL DEFAULT '',
  on_date    DATE NULL,
  note       VARCHAR(255) NOT NULL DEFAULT '',
  sort       INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bundles (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(191) NOT NULL DEFAULT '',
  sort       INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bundle_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  bundle_id  INT NOT NULL,
  label      VARCHAR(191) NOT NULL DEFAULT '',
  cost       DECIMAL(10,3) NULL,
  sort       INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_bundle_items_bundle (bundle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invites (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  token      VARCHAR(32) NOT NULL UNIQUE,
  label      VARCHAR(191) NOT NULL DEFAULT '',
  active     TINYINT NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rsvps (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  invite_id  INT NOT NULL,
  name       VARCHAR(191) NOT NULL DEFAULT '',
  side       ENUM('you','her','both') NOT NULL DEFAULT 'both',
  headcount  INT NOT NULL DEFAULT 1,
  attending  ENUM('yes','no') NOT NULL DEFAULT 'yes',
  message    VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_rsvps_invite (invite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single-use entrance passes. Each token is redeemed exactly once at the door.
-- Capped at 200 rows by the API (see PASS_CAP in handlers.php).
CREATE TABLE IF NOT EXISTS passes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(32) NOT NULL UNIQUE,
  guest_id    INT NULL,
  label       VARCHAR(191) NOT NULL DEFAULT '',
  status      ENUM('unused','redeemed') NOT NULL DEFAULT 'unused',
  redeemed_at TIMESTAMP NULL DEFAULT NULL,
  redeemed_by INT NULL,
  created_by  INT NULL,
  created_at  TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uniq_passes_guest (guest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS check_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  phase      VARCHAR(16) NOT NULL DEFAULT '',
  text       VARCHAR(500) NOT NULL DEFAULT '',
  owner      VARCHAR(8) NOT NULL DEFAULT 'you',
  sort       INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Editable text for the built-in checklist rows. Keyed by the static item key
-- ("phase-index"); when present it replaces the hardcoded wording so the couple
-- can reword a task or add extra detail.
CREATE TABLE IF NOT EXISTS check_overrides (
  item_key   VARCHAR(64) PRIMARY KEY,
  text       VARCHAR(500) NOT NULL DEFAULT '',
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hidden_checks (
  item_key   VARCHAR(64) PRIMARY KEY,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS facts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(191) NOT NULL DEFAULT '',
  value TEXT,
  sort INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS open_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(191) NOT NULL DEFAULT '',
  detail TEXT,
  owner VARCHAR(8) NOT NULL DEFAULT 'you',
  sort INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- "Who owns what" ownership lanes. A lane is a titled group with an owner tag and
-- a list of items; mirrors the bundles / bundle_items shape. `done` makes each
-- item's checkbox real. Editable by the couple.
CREATE TABLE IF NOT EXISTS lanes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(191) NOT NULL DEFAULT '',
  note       VARCHAR(500) NOT NULL DEFAULT '',
  tag        VARCHAR(32) NOT NULL DEFAULT 'you',
  sort       INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lane_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  lane_id    INT NOT NULL,
  label      VARCHAR(500) NOT NULL DEFAULT '',
  done       TINYINT(1) NOT NULL DEFAULT 0,
  sort       INT NOT NULL DEFAULT 100,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_lane_items_lane (lane_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the 4 lanes from the original static content, only if empty (idempotent).
INSERT INTO lanes (title, note, tag, sort)
SELECT * FROM (
  SELECT 'YOU, fully' AS title, 'You own these end to end. Report progress, do not hand them off.' AS note, 'you' AS tag, 10 AS sort
  UNION ALL SELECT "MEN'S SIDE, both days", 'You, your brother, and Hashim run this together.', 'men', 20
  UNION ALL SELECT 'HER SIDE', 'Support it, do not take it over. Pay deposits on time and clear the admin.', 'her', 30
  UNION ALL SELECT 'THE HALL', 'All-inclusive. This absorbs roughly 60 percent of the work once booked.', 'hall', 40
) seed
WHERE NOT EXISTS (SELECT 1 FROM lanes LIMIT 1);

-- Seed lane items, correlating on lane title, only if empty (idempotent).
INSERT INTO lane_items (lane_id, label, sort)
SELECT l.id, s.label, s.sort FROM lanes l
JOIN (
  SELECT 'YOU, fully' AS title, 'Venue selection and contract.' AS label, 10 AS sort
  UNION ALL SELECT 'YOU, fully', "Milcha logistics and documents (ma'thoon, IDs, the full list).", 20
  UNION ALL SELECT 'YOU, fully', 'Your attire: thobe and bisht, or a suit.', 30
  UNION ALL SELECT 'YOU, fully', 'The gold, BD 2000.', 40
  UNION ALL SELECT 'YOU, fully', 'The payments tracker.', 50
  UNION ALL SELECT 'YOU, fully', 'Honeymoon, pending leave from Citi.', 60
  UNION ALL SELECT 'YOU, fully', 'The day-of runsheet.', 70
  UNION ALL SELECT 'YOU, fully', 'Being the calm coordinator.', 80
  UNION ALL SELECT "MEN'S SIDE, both days", "The men's majlis on Day B: gahwa, dates, lighter food.", 10
  UNION ALL SELECT "MEN'S SIDE, both days", 'Seating and the greeting order.', 20
  UNION ALL SELECT "MEN'S SIDE, both days", 'Receiving and looking after the men both days.', 30
  UNION ALL SELECT "MEN'S SIDE, both days", 'Gahwa and dates supplier.', 40
  UNION ALL SELECT 'HER SIDE', 'The dress.', 10
  UNION ALL SELECT 'HER SIDE', 'HMUA (hair and makeup) and the trial.', 20
  UNION ALL SELECT 'HER SIDE', "The henna night (women-led, bride's side).", 30
  UNION ALL SELECT 'HER SIDE', 'Her guest list.', 40
  UNION ALL SELECT 'HER SIDE', 'Bridal prep.', 50
  UNION ALL SELECT 'THE HALL', 'Theme and decor.', 10
  UNION ALL SELECT 'THE HALL', 'Flowers.', 20
  UNION ALL SELECT 'THE HALL', 'The stage and kosha.', 30
  UNION ALL SELECT 'THE HALL', 'Sound and DJ.', 40
  UNION ALL SELECT 'THE HALL', 'Catering.', 50
  UNION ALL SELECT 'THE HALL', 'On-site coordination.', 60
) s ON s.title = l.title
WHERE NOT EXISTS (SELECT 1 FROM lane_items LIMIT 1);
