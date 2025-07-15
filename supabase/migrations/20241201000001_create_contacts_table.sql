CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  imported_at TIMESTAMP DEFAULT now()
);

insert into storage.buckets
  (id, name, public)
values
  ('imports', 'imports', false);


