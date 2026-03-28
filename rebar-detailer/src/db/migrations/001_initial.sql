CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drawing_sheets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  image_path TEXT,
  page_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rebar_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sheet_id TEXT NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
  bar_mark TEXT,
  bar_size INTEGER NOT NULL,
  shape_code TEXT DEFAULT '00',
  total_length REAL,
  dim_a REAL,
  dim_b REAL,
  dim_c REAL,
  dim_d REAL,
  dim_e REAL,
  hook_type TEXT,
  quantity INTEGER DEFAULT 1,
  spacing REAL,
  structural_element TEXT DEFAULT '',
  zone TEXT,
  grade INTEGER DEFAULT 60,
  coating TEXT DEFAULT 'none',
  notes TEXT,
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'manual',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sheets_project ON drawing_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_rebar_project ON rebar_items(project_id);
CREATE INDEX IF NOT EXISTS idx_rebar_sheet ON rebar_items(sheet_id);
