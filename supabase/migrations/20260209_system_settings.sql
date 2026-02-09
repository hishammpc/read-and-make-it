CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO system_settings (key, value)
VALUES ('proposal_period', '{"start_date": "2025-12-01", "end_date": "2026-02-28"}')
ON CONFLICT (key) DO NOTHING;
