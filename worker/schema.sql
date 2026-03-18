CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  enquiry_primary TEXT,
  enquiry_type TEXT,
  event_day TEXT,
  event_month TEXT,
  event_year TEXT,
  child_enquiry TEXT,
  message TEXT,
  user_agent TEXT,
  ip TEXT
);
