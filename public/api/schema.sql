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
  sort        INT NOT NULL DEFAULT 100,
  updated_by  INT NULL,
  updated_at  TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guests (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(191) NOT NULL DEFAULT '',
  side       ENUM('you','her','both') NOT NULL DEFAULT 'you',
  seats      INT NOT NULL DEFAULT 1,
  rsvp       ENUM('pending','yes','no') NOT NULL DEFAULT 'pending',
  notes      VARCHAR(255) NOT NULL DEFAULT '',
  updated_by INT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS picks (
  vendor_key VARCHAR(32) PRIMARY KEY,
  picked_by  INT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (name, display_name) VALUES ('osama', 'Osama'), ('noor', 'Noor')
  ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

INSERT INTO settings (k, v) VALUES ('rev', '0'), ('wedDate', '2026-08-14')
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
  sort        INT NOT NULL DEFAULT 100,
  updated_by  INT NULL,
  updated_at  TIMESTAMP NULL DEFAULT NULL
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
