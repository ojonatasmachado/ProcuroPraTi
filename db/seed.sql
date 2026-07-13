-- Seed data based on src/lib/mockData.js

BEGIN;

-- Users
INSERT INTO users (id, name, email, password, phone, location, created_at, terms_accepted_date) VALUES
('user-test', 'Usuário Teste Padrão', 'usuario@teste.com', '123', '11987654321', 'São Paulo, SP', now() - interval '10 days', null),
('user-test-2', 'Maria Silva', 'maria@teste.com', '123', '21987650000', 'Rio de Janeiro, RJ', now() - interval '5 days', null)
ON CONFLICT (id) DO NOTHING;

-- Companies
INSERT INTO companies (id, name, email, password, phone, cnpj, address, serves_locations, validation_status, vehicle_types, created_at) VALUES
('company-test', 'Empresa Teste Alfa', 'empresa@teste.com', '123', '1123456789', '12.345.678/0001-99', 'Rua Fictícia, 123, Centro, Campinas, SP', '["Campinas, SP"]'::jsonb, 'validated', '["car"]'::jsonb, now() - interval '20 days'),
('company-test-rj', 'Empresa Peças Rio', 'empresario@teste.com', '123', '2122334455', '98.765.432/0001-11', 'Av. Brasil, 1000, Bonsucesso, Rio de Janeiro, RJ', '["Rio de Janeiro, RJ"]'::jsonb, 'pending', '["car","motorcycle"]'::jsonb, now() - interval '15 days'),
('company-test-bh', 'Empresa Minas Parts', 'empresamg@teste.com', '123', '3133445566', '11.222.333/0001-55', 'Rua Principal, 456, Centro, Belo Horizonte, MG', '["Belo Horizonte, MG"]'::jsonb, 'validated', '["car","truck"]'::jsonb, now() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- Procuras
INSERT INTO procuras (id, user_id, vehicle_type, vehicle_brand, vehicle_model, vehicle_year, part_name, part_description, wants_photos, locations, created_at, status, duration) VALUES
('1700000000001', 'user-test', 'car', 'Ford', 'Fiesta', '2015', 'Farol Esquerdo', 'Preciso do farol esquerdo completo, com lâmpadas.', true, '[{"value": "São Paulo, SP", "label": "São Paulo - SP"}, {"value": "Campinas, SP", "label": "Campinas - SP"}]'::jsonb, now() - interval '3 days', 'active', 1),
('1700000000002', 'user-test', 'car', 'Volkswagen', 'Gol', '2018', 'Para-choque Dianteiro', 'Cor prata, sem furos para sensor.', false, '[{"value": "Rio de Janeiro, RJ", "label": "Rio de Janeiro - RJ"}]'::jsonb, now() - interval '5 days', 'active', 1)
ON CONFLICT (id) DO NOTHING;

-- Responses
INSERT INTO responses (id, procura_id, company_id, company_name, response_date, status, price, message, part_condition, part_type, photo_url, cnpj, address, location, is_read_by_user, is_read_by_company) VALUES
('resp-1', '1700000000001', 'company-test', 'Empresa Teste Alfa', now() - interval '1 day', 'available', 250.00, 'Temos a peça em estoque, original.', 'good', 'original', 'https://via.placeholder.com/150/008000/FFFFFF?Text=Farol+Fiesta', '12.345.678/0001-99', 'Rua Fictícia, 123, Centro, Campinas, SP', 'Campinas, SP', false, true),
('resp-2', '1700000000001', 'company-test-bh', 'Empresa Minas Parts', now() - interval '2 days', 'unavailable', NULL, 'Infelizmente não temos essa peça no momento.', NULL, NULL, NULL, '11.222.333/0001-55', 'Rua Principal, 456, Centro, Belo Horizonte, MG', 'Belo Horizonte, MG', true, true),
('resp-3', '1700000000002', 'company-test-rj', 'Empresa Peças Rio', now() - interval '1 day', 'available', 350.00, 'Temos similar, cor prata, sem furos.', 'excellent', 'parallel', 'https://via.placeholder.com/150/C0C0C0/000000?Text=Parachoque+Gol', '98.765.432/0001-11', 'Av. Brasil, 1000, Bonsucesso, Rio de Janeiro, RJ', 'Rio de Janeiro, RJ', false, true)
ON CONFLICT (id) DO NOTHING;

-- Messages (chats)
INSERT INTO messages (id, chat_id, sender_id, receiver_id, text, timestamp, is_read) VALUES
('chat1', 'user-test_company-test', 'user-test', 'company-test', 'Olá, sobre o farol do Fiesta, ele é novo ou usado?', now() - interval '20 minutes', true),
('chat2', 'user-test_company-test', 'company-test', 'user-test', 'Olá! É usado original, em ótimo estado.', now() - interval '18 minutes', false)
ON CONFLICT (id) DO NOTHING;

-- Feedbacks
INSERT INTO feedbacks (id, user_id, user_type, user_name, type, text_content, rating, created_at) VALUES
('fb1', 'user-test', 'user', 'Usuário Teste Padrão', 'rating', 'Plataforma muito útil!', 5, now() - interval '2 days'),
('fb2', 'company-test-rj', 'company', 'Empresa Peças Rio', 'suggestion_popup', 'Gostaria de poder filtrar procuras por raio de KM.', NULL, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

COMMIT;
