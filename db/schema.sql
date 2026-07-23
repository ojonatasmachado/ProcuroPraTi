-- Schema SQL generated from src/lib/mockData.js
-- Use with Postgres (Supabase)

BEGIN;

CREATE TABLE users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE,
  cpf text UNIQUE,
  password text,
  phone text,
  location text,
  postal_code text,
  vehicles jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz,
  terms_accepted_date timestamptz,
  is_demo boolean NOT NULL DEFAULT false
);

CREATE TABLE companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  password text,
  phone text,
  whatsapp text,
  cnpj text,
  address text,
  address_number text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  location_source text NOT NULL DEFAULT 'cep',
  serves_locations jsonb,
  validation_status text,
  validation_reason text,
  vehicle_types jsonb,
  created_at timestamptz,
  terms_accepted_date timestamptz,
  payment_exempt_until timestamptz,
  deleted_at timestamptz,
  access_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_control_enabled boolean NOT NULL DEFAULT false,
  owner_pin_hash text,
  owner_pin_failed_attempts integer NOT NULL DEFAULT 0,
  owner_pin_locked_until timestamptz,
  max_concurrent_accesses integer NOT NULL DEFAULT 1 CHECK (max_concurrent_accesses BETWEEN 1 AND 100),
  is_demo boolean NOT NULL DEFAULT false
);

CREATE TABLE company_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text NOT NULL,
  pin_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  UNIQUE (company_id, username)
);

CREATE TABLE company_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL UNIQUE,
  operator_id uuid REFERENCES company_operators(id) ON DELETE SET NULL,
  access_role text NOT NULL CHECK (access_role IN ('owner', 'operator')),
  device_id text NOT NULL,
  device_name text NOT NULL DEFAULT 'Dispositivo',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE vehicle_brands (
  id text PRIMARY KEY,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'motorcycle', 'truck')),
  name text NOT NULL,
  source text NOT NULL DEFAULT 'fipex',
  reference_month integer,
  reference_year integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_type, name)
);

CREATE TABLE municipalities (
  id text PRIMARY KEY,
  name text NOT NULL,
  state text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  source text NOT NULL DEFAULT 'municipios-brasileiros',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_models (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  fipe_code text NOT NULL,
  name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, fipe_code)
);

CREATE TABLE vehicle_years (
  id text PRIMARY KEY,
  model_id text NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  year integer NOT NULL,
  fuel text,
  fuel_code text,
  zero_km boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, year, fuel_code)
);

CREATE TABLE procuras (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  vehicle_type text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year text,
  vehicle_brand_id text REFERENCES vehicle_brands(id) ON DELETE SET NULL,
  vehicle_model_id text REFERENCES vehicle_models(id) ON DELETE SET NULL,
  vehicle_year_id text REFERENCES vehicle_years(id) ON DELETE SET NULL,
  vehicle_fuel text,
  part_name text,
  part_description text,
  wants_photos boolean DEFAULT false,
  reference_photo_url text,
  preferred_condition text NOT NULL DEFAULT 'any',
  locations jsonb,
  created_at timestamptz,
  status text,
  duration integer,
  search_latitude double precision,
  search_longitude double precision,
  search_location_source text NOT NULL DEFAULT 'city_center',
  search_radius_km numeric(6,2) NOT NULL DEFAULT 10,
  is_demo boolean NOT NULL DEFAULT false
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
  ,handled_by_operator_id uuid REFERENCES company_operators(id) ON DELETE SET NULL
  ,handled_by_operator_name text
);

CREATE TABLE messages (
  id text PRIMARY KEY,
  chat_id text,
  sender_id text,
  receiver_id text,
  text text,
  image_path text,
  timestamp timestamptz,
  is_read boolean DEFAULT false,
  delivered_at timestamptz,
  read_at timestamptz
  ,sender_operator_id uuid REFERENCES company_operators(id) ON DELETE SET NULL
  ,sender_operator_name text
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
  created_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false
);

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_type text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  ,auth_session_id uuid
  ,company_operator_id uuid REFERENCES company_operators(id) ON DELETE SET NULL
);

CREATE INDEX idx_procuras_user ON procuras(user_id);
CREATE INDEX idx_vehicle_brands_type_name ON vehicle_brands(vehicle_type, name);
CREATE INDEX idx_vehicle_models_brand_name ON vehicle_models(brand_id, name);
CREATE INDEX idx_vehicle_years_model_year ON vehicle_years(model_id, year DESC);
CREATE INDEX idx_responses_procura ON responses(procura_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_company_access_sessions_active ON company_access_sessions(company_id, last_seen_at DESC) WHERE revoked_at IS NULL;

COMMIT;
