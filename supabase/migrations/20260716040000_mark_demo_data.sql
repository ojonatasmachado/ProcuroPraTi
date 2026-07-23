ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE procuras ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE users SET is_demo = true WHERE id LIKE 'user-%' OR id LIKE 'demo-%';
UPDATE companies SET is_demo = true WHERE id LIKE 'company-%' OR id LIKE 'demo-%';
UPDATE procuras SET is_demo = true WHERE id LIKE 'procura-%' OR id LIKE 'demo-%' OR id IN ('1700000000001', '1700000000002');
UPDATE feedbacks SET is_demo = true WHERE id LIKE 'fb%';

CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);
CREATE INDEX IF NOT EXISTS idx_companies_is_demo ON companies(is_demo);
CREATE INDEX IF NOT EXISTS idx_procuras_is_demo ON procuras(is_demo);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_demo ON feedbacks(is_demo);
