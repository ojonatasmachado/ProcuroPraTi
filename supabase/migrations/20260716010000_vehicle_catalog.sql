BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS vehicles jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS vehicle_brands (
  id text PRIMARY KEY,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('car', 'motorcycle', 'truck')),
  name text NOT NULL,
  source text NOT NULL DEFAULT 'fipex',
  reference_month integer,
  reference_year integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_type, name)
);

CREATE TABLE IF NOT EXISTS vehicle_models (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  fipe_code text NOT NULL,
  name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, fipe_code)
);

CREATE TABLE IF NOT EXISTS vehicle_years (
  id text PRIMARY KEY,
  model_id text NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  year integer NOT NULL,
  fuel text,
  fuel_code text,
  zero_km boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, year, fuel_code)
);

ALTER TABLE procuras
  ADD COLUMN IF NOT EXISTS vehicle_brand_id text REFERENCES vehicle_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_model_id text REFERENCES vehicle_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_year_id text REFERENCES vehicle_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_fuel text;

CREATE INDEX IF NOT EXISTS idx_vehicle_brands_type_name ON vehicle_brands(vehicle_type, name);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand_name ON vehicle_models(brand_id, name);
CREATE INDEX IF NOT EXISTS idx_vehicle_years_model_year ON vehicle_years(model_id, year DESC);

COMMIT;
