-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Features table (defines available features)
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User feature permissions table
CREATE TABLE IF NOT EXISTS user_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  feature_id INTEGER NOT NULL,
  granted_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE(user_id, feature_id)
);

-- Default features
INSERT OR IGNORE INTO features (id, name, description) VALUES
  (1, 'dashboard', 'Access to daily dashboard and entry creation'),
  (2, 'reports', 'Access to reports and analytics'),
  (3, 'print', 'Ability to print daily entries'),
  (4, 'admin', 'Access to admin panel');

-- Daily entries table
CREATE TABLE IF NOT EXISTS daily_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  group_name TEXT,
  cash_in_hand REAL NOT NULL DEFAULT 0,
  credits REAL NOT NULL DEFAULT 0,
  waiter_expense REAL NOT NULL DEFAULT 0,
  servers_expense REAL NOT NULL DEFAULT 0,
  bookkeeping_expense REAL NOT NULL DEFAULT 0,
  other_expenses REAL NOT NULL DEFAULT 0,
  packets_used INTEGER NOT NULL DEFAULT 0,
  cups_used INTEGER NOT NULL DEFAULT 0,
  powder_cost REAL NOT NULL DEFAULT 0,
  profit REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON daily_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_date ON daily_entries(date DESC);

-- Powder purchases table (for tracking factory purchases)
CREATE TABLE IF NOT EXISTS powder_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  purchase_date DATE NOT NULL,
  supplier_name TEXT,
  packets_purchased INTEGER NOT NULL DEFAULT 0,
  cost_per_packet REAL NOT NULL DEFAULT 63,
  total_cost REAL NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('cash', 'credit', 'bank_transfer')),
  invoice_number TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for powder purchases
CREATE INDEX IF NOT EXISTS idx_powder_purchases_date ON powder_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_powder_purchases_user ON powder_purchases(user_id, purchase_date DESC);

-- Insert default admin user (password: admin123)
-- Hash generated with bcrypt for password 'admin123'
INSERT OR IGNORE INTO users (id, username, password_hash, role) 
VALUES (1, 'admin', '$2b$10$rcCB0aW8qWWAEkZpeXfRA.AjcNlNZSBqn0nSsQTHiTjdCdciON/96', 'admin');
