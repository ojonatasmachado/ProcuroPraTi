-- Schema SQL generated from src/lib/mockData.js
-- Use with Postgres (Supabase)

BEGIN;

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE,
  password text,
  phone text,
  location text,
  created_at timestamptz,
  terms_accepted_date timestamptz
);

CREATE TABLE companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  password text,
  phone text,
  cnpj text,
  address text,
  serves_locations jsonb,
  validation_status text,
  validation_reason text,
  vehicle_types jsonb,
  created_at timestamptz,
  terms_accepted_date timestamptz,
  payment_exempt_until timestamptz
);

CREATE TABLE procuras (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  vehicle_type text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year text,
  part_name text,
  part_description text,
  wants_photos boolean DEFAULT false,
  locations jsonb,
  created_at timestamptz,
  status text,
  duration integer
);

CREATE TABLE responses (
  id text PRIMARY KEY,
  procura_id text REFERENCES procuras(id) ON DELETE CASCADE,
  company_id text REFERENCES companies(id) ON DELETE SET NULL,
  company_name text,
  response_date timestamptz,
  status text,
  price numeric(10,2),
  message text,
  part_condition text,
  part_type text,
  photo_url text,
  cnpj text,
  address text,
  location text,
  is_read_by_user boolean DEFAULT false,
  is_read_by_company boolean DEFAULT false
);

CREATE TABLE messages (
  id text PRIMARY KEY,
  chat_id text,
  sender_id text,
  receiver_id text,
  text text,
  timestamp timestamptz,
  is_read boolean DEFAULT false
);

CREATE TABLE feedbacks (
  id text PRIMARY KEY,
  user_id text,
  user_type text,
  user_name text,
  type text,
  text_content text,
  rating integer,
  contact text,
  created_at timestamptz
);

CREATE INDEX idx_procuras_user ON procuras(user_id);
CREATE INDEX idx_responses_procura ON responses(procura_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);

COMMIT;
