import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Layers, Server, Database, KeyRound, Globe, Zap, Route, Bell, DollarSign,
  Terminal, AlertTriangle, ShieldCheck, ArrowDown, ArrowRight, Network, Webhook, Palette,
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionPlans';

const Chip = ({ children }) => (
  <code className="inline-block rounded-md bg-input/70 px-1.5 py-0.5 text-[11px] text-foreground">{children}</code>
);

const Field = ({ label, children }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="text-sm text-foreground/90">{children}</div>
  </div>
);

const EntryCard = ({ title, children, badge }) => (
  <div className="rounded-xl border border-border bg-input/30 p-4">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Chip>{title}</Chip>
      {badge}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

const SimpleList = ({ items }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {items.map(([name, description]) => (
      <div key={name} className="rounded-xl border border-border bg-input/30 p-3.5">
        <Chip>{name}</Chip>
        <p className="mt-1.5 text-sm text-foreground/90">{description}</p>
      </div>
    ))}
  </div>
);

const FlowNode = ({ label, detail }) => (
  <div className="w-full max-w-xs rounded-xl border-2 border-primary/40 bg-card px-4 py-3 text-center shadow-sm">
    <p className="font-semibold text-foreground">{label}</p>
    {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
  </div>
);

const FlowArrow = ({ label, direction = 'down' }) => (
  <div className="flex flex-col items-center gap-1 py-1 text-muted-foreground">
    {direction === 'down' ? <ArrowDown className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />}
    {label && <span className="text-center text-[11px] leading-tight">{label}</span>}
  </div>
);

const stack = [
  ['Front-end', 'React 18 + Vite 4 (SPA, sem SSR). Build estático servido pela Vercel.'],
  ['Estilo/UI', 'Tailwind CSS + Radix UI (padrão shadcn/ui). Tokens de cor semânticos em src/index.css, sem biblioteca de componentes de terceiros pronta.'],
  ['Animação', 'Framer Motion, usado nas transições de entrada de seção e cards.'],
  ['Estado', 'React state/hooks local, sem Redux/Zustand. App.jsx concentra o estado de sessão (usuário, procuras, chats) e distribui via props.'],
  ['Backend', 'Supabase: Postgres 17 + Auth + Storage + Realtime + Edge Functions. Não há servidor Node/Express próprio, toda regra de negócio sensível vive em funções SQL (SECURITY DEFINER) e RLS.'],
  ['Hospedagem', 'Vercel (SPA estático + rewrites). Deploy automático a partir do GitHub (branch main) ou manual via `vercel --prod`.'],
  ['PWA', 'vite-plugin-pwa (Workbox). Service worker com cache e recebimento de push em background.'],
];

const externalServices = [
  { name: 'BrasilAPI', usage: 'CEP (v1/v2) e CNPJ (v1)', where: 'Preenchimento automático de endereço no cadastro e dados da empresa a partir do CNPJ.', cost: 'Pública, sem chave. Grátis, sem SLA formal.' },
  { name: 'ViaCEP', usage: 'CEP', where: 'Segundo provedor de CEP, corrida em paralelo com BrasilAPI, usa o que responder primeiro.', cost: 'Pública, sem chave. Grátis.' },
  { name: 'open.cnpja.com', usage: 'CNPJ', where: 'Fallback se a consulta de CNPJ na BrasilAPI falhar.', cost: 'Pública, sem chave. Grátis.' },
  { name: 'IBGE (servicodados)', usage: 'Estados/municípios e malhas geográficas (GeoJSON)', where: 'Base de 5.571 municípios usada no mapa regional e nos filtros de localização.', cost: 'Pública, sem chave. Grátis. Só é chamada nos scripts sync:cities/sync:municipality-meshes, não em tempo real pelo usuário.' },
  { name: 'GitHub (kelvins/Municipios-Brasileiros)', usage: 'CSV de coordenadas de municípios', where: 'Fonte de latitude/longitude por município, complementa o IBGE.', cost: 'Pública. Só é chamada no script sync:municipality-coordinates.' },
  { name: 'Hugging Face (dataset alanwgt/fipex-veiculos-brasil)', usage: 'Tabela de veículos (marca/modelo/ano)', where: 'Base do catálogo de veículos usado no formulário de procura.', cost: 'Pública. Só é chamada no script sync:vehicles (Python).' },
  { name: 'Mercado Livre (api.mercadolibre.com)', usage: 'Categorias de autopeças', where: 'Origem de cerca de 2.500 itens do catálogo de peças (nomes, categorias, aliases).', cost: 'Pública, sem chave. Só é chamada no script sync:parts.' },
  { name: 'Resend', usage: 'Envio de e-mail transacional', where: 'E-mail com usuário/PIN de acesso quando um responsável cadastra um colaborador (Edge Function send-operator-access).', cost: 'Paga por volume (chave RESEND_API_KEY). Único envio de e-mail que não passa pelo Supabase Auth.' },
  { name: 'Supabase Auth (e-mail embutido)', usage: 'Confirmação de cadastro e recuperação de senha', where: 'Usa o provedor de e-mail padrão do Supabase, com templates HTML próprios em supabase/email-templates/.', cost: 'Incluso no plano do Supabase. Limite de frequência de 1 envio por minuto já configurado.' },
  { name: 'Web Push (VAPID)', usage: 'Notificações push do navegador/PWA', where: 'Nova procura, nova resposta e nova mensagem de chat, enviadas pela Edge Function send-web-push.', cost: 'Protocolo padrão do navegador, sem custo por envio. Chave pública/privada VAPID própria do projeto.' },
];

const tables = [
  ['users', 'Compradores: perfil vinculado a um usuário do Supabase Auth.'],
  ['companies', 'Empresas vendedoras: cadastro, endereço, plano, estado da assinatura, exclusão lógica (deleted_at).'],
  ['company_operators', 'Colaboradores de uma empresa (login por usuário e PIN, sem e-mail próprio).'],
  ['company_access_sessions', 'Sessões ativas de responsável/colaborador. Controla o limite de acessos simultâneos por plano.'],
  ['procuras', 'Anúncios de busca de peça criados por um comprador: veículo, peça, localização, raio, duração.'],
  ['responses', 'Respostas de empresas a uma procura: preço, condição, disponibilidade.'],
  ['messages', 'Mensagens de chat entre comprador e empresa, sempre vinculadas a uma procura.'],
  ['company_ratings', 'Avaliação do comprador sobre uma resposta recebida: nota mais comentário.'],
  ['feedbacks', 'Feedback livre enviado por usuários/empresas: avaliação geral, problema ou sugestão.'],
  ['subscription_plans', 'Catálogo dos 5 planos pagos: preço, alcance, atraso de visibilidade, limites.'],
  ['company_entitlement_adjustments', 'Histórico de ajustes manuais de plano/trial feitos pelo admin: trial estendido, plano cortesia, pausa de cobrança.'],
  ['company_trial_registry', 'Controle de CNPJ que já usou o período de trial, evita reaproveitar o trial recriando cadastro.'],
  ['push_subscriptions', 'Inscrições de push notification por dispositivo/usuário.'],
  ['push_notification_windows', 'Janela de deduplicação de push, evita notificar a mesma empresa várias vezes em poucos minutos.'],
  ['registration_progress', 'Rastreio de onde o usuário abandonou um cadastro incompleto, visível no funil do admin.'],
  ['part_catalog', 'Catálogo curado de nomes de peças, sinônimos, categoria e se é item de alto valor.'],
  ['part_catalog_submissions', 'Fila de nomes de peça digitados por usuários que não bateram com o catálogo, para revisão manual no admin.'],
  ['part_catalog_syncs', 'Log das importações automáticas do catálogo (Mercado Livre).'],
  ['vehicle_brands / vehicle_models / vehicle_years', 'Catálogo de veículos (marca, modelo, ano), importado da base FIPE.'],
  ['municipalities', 'Base de municípios do IBGE com coordenadas, usada no seletor de cidade e no mapa.'],
  ['ui_error_events', 'Log de erros de interface, agregado por assinatura (ver aba Erros).'],
  ['platform_settings', 'Configurações globais chave-valor da plataforma.'],
];

// Preenchido lendo a definição original de cada tabela em db/schema.sql mais
// todos os ALTER TABLE aplicados depois, para refletir o schema atual.
const dataDictionary = [
  ['users', [
    ['id', 'text', 'identificador do usuário, igual ao id do auth.users no Supabase Auth'],
    ['name', 'text', 'nome completo do usuário'],
    ['email', 'text', 'email de login, único'],
    ['cpf', 'text', 'CPF do usuário, único quando preenchido'],
    ['phone', 'text', 'telefone de contato'],
    ['location', 'text', 'descrição textual da localização informada no cadastro'],
    ['postal_code', 'text', 'CEP informado pelo usuário'],
    ['vehicles', 'jsonb', 'lista dos veículos cadastrados pelo usuário'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
    ['terms_accepted_date', 'timestamptz', 'data em que o usuário aceitou os termos de uso'],
    ['is_demo', 'boolean', 'marca registros de demonstração/teste, não contas reais'],
    ['email_verified_at', 'timestamptz', 'data em que o email do usuário foi confirmado'],
  ]],
  ['companies', [
    ['id', 'text', 'identificador da empresa, igual ao id do auth.users no Supabase Auth'],
    ['name', 'text', 'razão social ou nome fantasia da empresa'],
    ['email', 'text', 'email de login da empresa'],
    ['phone', 'text', 'telefone de contato'],
    ['whatsapp', 'text', 'número de WhatsApp para contato com o comprador'],
    ['cnpj', 'text', 'CNPJ da empresa'],
    ['address', 'text', 'endereço textual da empresa'],
    ['address_number', 'text', 'número do endereço'],
    ['postal_code', 'text', 'CEP da empresa'],
    ['latitude', 'double precision', 'latitude da localização da empresa'],
    ['longitude', 'double precision', 'longitude da localização da empresa'],
    ['location_source', 'text', 'origem da localização (cep, gps, manual, city_center ou legacy)'],
    ['serves_locations', 'jsonb', 'lista de localidades/regiões que a empresa atende'],
    ['validation_status', 'text', 'status de validação/aprovação da empresa na plataforma'],
    ['validation_reason', 'text', 'motivo associado ao status de validação'],
    ['vehicle_types', 'jsonb', 'tipos de veículo que a empresa atende (carro, moto, caminhão etc.)'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
    ['terms_accepted_date', 'timestamptz', 'data em que a empresa aceitou os termos de uso'],
    ['payment_exempt_until', 'timestamptz', 'data até a qual a empresa está isenta de cobrança'],
    ['deleted_at', 'timestamptz', 'data de exclusão lógica da conta (soft delete)'],
    ['access_history', 'jsonb', 'histórico de acessos registrados da empresa'],
    ['access_control_enabled', 'boolean', 'indica se a empresa ativou o controle de acesso por equipe/PIN'],
    ['max_concurrent_accesses', 'integer', 'número máximo de acessos simultâneos permitidos, conforme o plano'],
    ['is_demo', 'boolean', 'marca registros de demonstração/teste, não contas reais'],
    ['can_respond_anywhere', 'boolean', 'permite responder procuras de qualquer localidade, ignorando raio/estado'],
    ['email_verified_at', 'timestamptz', 'data em que o email da empresa foi confirmado'],
    ['subscription_state', 'text', 'estado da assinatura (trial_active, trial_ended, subscriber_active, past_due ou canceled)'],
    ['plan_code', 'text', 'código do plano de assinatura contratado, referencia subscription_plans'],
    ['trial_started_at', 'timestamptz', 'data de início do período de teste gratuito'],
    ['trial_min_ends_at', 'timestamptz', 'data mínima em que o teste gratuito pode terminar'],
    ['trial_hard_ends_at', 'timestamptz', 'data limite absoluta de término do teste gratuito'],
    ['trial_extended_until', 'timestamptz', 'data até a qual o teste gratuito foi estendido manualmente'],
    ['trial_welcome_seen_at', 'timestamptz', 'data em que a empresa viu a tela de boas-vindas do teste'],
    ['trial_end_summary_seen_at', 'timestamptz', 'data em que a empresa viu o resumo de fim do teste'],
    ['subscription_started_at', 'timestamptz', 'data de início da assinatura paga'],
    ['subscription_current_period_end', 'timestamptz', 'data de término do ciclo de cobrança atual'],
    ['subscription_cancel_at_period_end', 'boolean', 'indica se a assinatura será cancelada ao fim do ciclo atual'],
    ['subscription_payment_status', 'text', 'status do pagamento da assinatura'],
    ['stripe_customer_id', 'text', 'identificador do cliente no Stripe (coluna existe, integração não implementada)'],
    ['stripe_subscription_id', 'text', 'identificador da assinatura no Stripe (coluna existe, integração não implementada)'],
    ['stripe_price_id', 'text', 'identificador do preço/plano no Stripe (coluna existe, integração não implementada)'],
    ['manual_plan_ends_at', 'timestamptz', 'data de término de um plano concedido manualmente por um admin'],
    ['manual_plan_indefinite', 'boolean', 'indica se o plano concedido manualmente não tem prazo de término'],
    ['manual_plan_reason', 'text', 'justificativa registrada para a concessão manual de plano'],
    ['billing_pause_until', 'timestamptz', 'data até a qual a cobrança da empresa está pausada'],
    ['billing_pause_reason', 'text', 'motivo da pausa de cobrança'],
    ['logo_url', 'text', 'URL do logo/foto de perfil público da empresa'],
    ['bio', 'text', 'descrição curta (até 300 caracteres) do perfil público da empresa'],
    ['sees_all_procuras', 'boolean', 'flag de conta de teste que faz a empresa enxergar todas as procuras existentes'],
  ]],
  ['company_operators', [
    ['id', 'uuid', 'identificador do colaborador (operador) da empresa'],
    ['company_id', 'text', 'empresa à qual o colaborador pertence'],
    ['name', 'text', 'nome do colaborador'],
    ['username', 'text', 'usuário usado para login do colaborador, único por empresa'],
    ['pin_hash', 'text', 'hash do PIN de acesso do colaborador'],
    ['active', 'boolean', 'indica se o colaborador está ativo'],
    ['failed_attempts', 'integer', 'contador de tentativas erradas de PIN'],
    ['locked_until', 'timestamptz', 'bloqueio do colaborador por tentativas erradas'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
    ['disabled_at', 'timestamptz', 'data em que o colaborador foi desativado'],
    ['contact_email', 'text', 'email de contato usado para enviar os dados de acesso ao colaborador'],
    ['contact_phone', 'text', 'telefone de contato do colaborador'],
  ]],
  ['company_access_sessions', [
    ['id', 'uuid', 'identificador da sessão de acesso da empresa'],
    ['company_id', 'text', 'empresa associada à sessão'],
    ['auth_session_id', 'uuid', 'sessão de autenticação do Supabase Auth vinculada'],
    ['operator_id', 'uuid', 'colaborador associado à sessão, nulo quando é o responsável'],
    ['access_role', 'text', 'papel do acesso na sessão (owner ou operator)'],
    ['device_id', 'text', 'identificador do dispositivo usado para o acesso'],
    ['device_name', 'text', 'nome/descrição do dispositivo usado para o acesso'],
    ['created_at', 'timestamptz', 'data de criação da sessão'],
    ['last_seen_at', 'timestamptz', 'último heartbeat da sessão, usado para detectar inatividade'],
    ['revoked_at', 'timestamptz', 'data em que a sessão foi revogada/encerrada'],
  ]],
  ['procuras', [
    ['id', 'text', 'identificador da procura (pedido de peça) publicada pelo usuário'],
    ['user_id', 'text', 'usuário que criou a procura'],
    ['vehicle_type', 'text', 'tipo do veículo (carro, moto, caminhão etc.)'],
    ['vehicle_brand', 'text', 'marca do veículo em texto livre'],
    ['vehicle_model', 'text', 'modelo do veículo em texto livre'],
    ['vehicle_year', 'text', 'ano/modelo do veículo em texto livre'],
    ['vehicle_brand_id', 'text', 'marca do veículo referenciando o catálogo vehicle_brands'],
    ['vehicle_model_id', 'text', 'modelo do veículo referenciando o catálogo vehicle_models'],
    ['vehicle_year_id', 'text', 'ano do veículo referenciando o catálogo vehicle_years'],
    ['vehicle_fuel', 'text', 'combustível do veículo'],
    ['part_name', 'text', 'nome da peça procurada'],
    ['part_description', 'text', 'descrição adicional da peça procurada'],
    ['wants_photos', 'boolean', 'indica se o usuário deseja receber fotos da peça nas respostas'],
    ['reference_photo_url', 'text', 'URL de uma foto de referência enviada pelo usuário'],
    ['preferred_condition', 'text', 'condição preferida da peça (any, new ou used)'],
    ['locations', 'jsonb', 'cidade onde o usuário procura, preenchida automaticamente a partir do endereço do perfil (não é mais escolhida por procura, ver seção Limitações)'],
    ['created_at', 'timestamptz', 'data de criação da procura'],
    ['status', 'text', 'status da procura (ativa, encerrada etc.)'],
    ['duration', 'integer', 'duração/prazo configurado para a procura'],
    ['search_latitude', 'double precision', 'latitude do ponto de busca usado para o raio de alcance. O formulário não coleta mais isso (ver Limitações); fica null em toda procura nova, o matching cai direto para comparação por cidade'],
    ['search_longitude', 'double precision', 'longitude do ponto de busca usado para o raio de alcance. Mesma observação de search_latitude'],
    ['search_location_source', 'text', 'origem do ponto de busca (gps, manual, city_center ou legacy). Sempre city_center em procuras novas, já que gps/manual dependiam do mapa removido do formulário'],
    ['search_radius_km', 'numeric', 'raio de busca em km definido na criação (hoje não usado pelo matching, ver Planos)'],
    ['is_demo', 'boolean', 'marca registros de demonstração/teste, não procuras reais'],
    ['is_rare_part', 'boolean', 'marca a peça como rara, o que amplia o alcance de visibilidade nacional'],
    ['part_catalog_id', 'bigint', 'item do catálogo de peças associado automaticamente ao nome digitado'],
    ['part_name_original', 'text', 'texto original digitado pelo usuário, antes de qualquer normalização'],
  ]],
  ['responses', [
    ['id', 'text', 'identificador da resposta enviada por uma empresa a uma procura'],
    ['procura_id', 'text', 'procura à qual a resposta se refere'],
    ['company_id', 'text', 'empresa que enviou a resposta'],
    ['company_name', 'text', 'nome da empresa no momento da resposta'],
    ['response_date', 'timestamptz', 'data/hora do envio ou da última atualização da resposta'],
    ['status', 'text', 'status da resposta (available ou unavailable)'],
    ['price', 'numeric', 'preço informado pela empresa para a peça'],
    ['message', 'text', 'mensagem/observação da empresa sobre a peça'],
    ['part_condition', 'text', 'condição da peça oferecida (nova/usada)'],
    ['part_type', 'text', 'tipo/classificação da peça oferecida'],
    ['photo_url', 'text', 'URL da foto da peça anexada pela empresa'],
    ['cnpj', 'text', 'CNPJ da empresa no momento da resposta'],
    ['address', 'text', 'endereço da empresa no momento da resposta'],
    ['location', 'text', 'localização textual informada na resposta'],
    ['is_read_by_user', 'boolean', 'indica se o usuário já visualizou a resposta'],
    ['is_read_by_company', 'boolean', 'indica se a empresa já confirmou a própria resposta'],
    ['handled_by_operator_id', 'uuid', 'colaborador que enviou/atualizou a resposta, quando aplicável'],
    ['handled_by_operator_name', 'text', 'nome do colaborador que enviou/atualizou a resposta'],
  ]],
  ['messages', [
    ['id', 'text', 'identificador da mensagem de chat'],
    ['chat_id', 'text', 'identificador da conversa (remetente + destinatário + procura)'],
    ['sender_id', 'text', 'quem enviou a mensagem (usuário ou empresa)'],
    ['receiver_id', 'text', 'quem recebe a mensagem (usuário ou empresa)'],
    ['text', 'text', 'conteúdo textual da mensagem'],
    ['image_path', 'text', 'caminho da imagem anexada no storage, quando houver'],
    ['timestamp', 'timestamptz', 'data/hora de envio da mensagem'],
    ['is_read', 'boolean', 'indica se a mensagem foi lida pelo destinatário'],
    ['delivered_at', 'timestamptz', 'data/hora em que a mensagem foi entregue'],
    ['read_at', 'timestamptz', 'data/hora em que a mensagem foi lida'],
    ['sender_operator_id', 'uuid', 'colaborador que enviou a mensagem, quando aplicável'],
    ['sender_operator_name', 'text', 'nome do colaborador que enviou a mensagem'],
    ['procura_id', 'text', 'procura à qual a conversa está vinculada'],
  ]],
  ['company_ratings', [
    ['id', 'uuid', 'identificador da avaliação feita pelo comprador sobre a empresa'],
    ['company_id', 'text', 'empresa avaliada'],
    ['user_id', 'text', 'usuário que fez a avaliação'],
    ['procura_id', 'text', 'procura relacionada à avaliação'],
    ['response_id', 'text', 'resposta específica avaliada, único por avaliação'],
    ['rating', 'smallint', 'nota dada pelo comprador, de 1 a 5'],
    ['comment', 'text', 'comentário opcional deixado pelo comprador'],
    ['created_at', 'timestamptz', 'data de criação da avaliação'],
    ['updated_at', 'timestamptz', 'data da última atualização da avaliação'],
  ]],
  ['feedbacks', [
    ['id', 'text', 'identificador do feedback enviado'],
    ['user_id', 'text', 'identificador de quem enviou o feedback'],
    ['user_type', 'text', 'tipo de quem enviou (user ou company)'],
    ['user_name', 'text', 'nome de quem enviou o feedback'],
    ['type', 'text', 'tipo do feedback (rating, problem ou suggestion_popup)'],
    ['text_content', 'text', 'conteúdo textual do feedback'],
    ['rating', 'integer', 'nota dada no feedback, de 1 a 5, quando aplicável'],
    ['contact', 'text', 'contato informado para retorno, quando aplicável'],
    ['created_at', 'timestamptz', 'data de criação do feedback'],
    ['is_demo', 'boolean', 'marca registros de demonstração/teste'],
  ]],
  ['subscription_plans', [
    ['code', 'text', 'código único do plano (ex.: local, regional, nacional)'],
    ['name', 'text', 'nome de exibição do plano'],
    ['monthly_price', 'numeric', 'preço mensal do plano'],
    ['scope', 'text', 'abrangência geográfica do plano (radius, state ou national)'],
    ['radius_km', 'integer', 'raio de alcance em km, só para planos com escopo radius'],
    ['priority_level', 'integer', 'nível de prioridade do plano na ordenação/visibilidade'],
    ['visibility_delay_minutes', 'integer', 'atraso em minutos até a empresa ver novas procuras'],
    ['max_concurrent_accesses', 'integer', 'limite de acessos simultâneos incluído no plano'],
    ['response_highlight', 'boolean', 'indica se as respostas do plano recebem destaque visual'],
    ['fixed_response_top', 'boolean', 'indica se as respostas do plano ficam fixadas no topo'],
    ['report_level', 'text', 'nível de relatórios disponibilizado (none, basic ou complete)'],
    ['national_access', 'boolean', 'indica se o plano dá acesso a procuras em nível nacional'],
    ['rare_parts_badge', 'boolean', 'indica se o plano exibe selo de especialista em peças raras'],
    ['featured', 'boolean', 'indica se o plano é destacado na tela de escolha de planos'],
    ['active', 'boolean', 'indica se o plano está disponível para contratação'],
    ['sort_order', 'integer', 'ordem de exibição do plano na listagem'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['company_entitlement_adjustments', [
    ['id', 'uuid', 'identificador do ajuste manual de direitos/benefícios da empresa'],
    ['company_id', 'text', 'empresa afetada pelo ajuste'],
    ['adjustment_type', 'text', 'tipo do ajuste (trial_extension, manual_plan, billing_pause, plan_change ou subscription_cancel)'],
    ['plan_code', 'text', 'plano associado ao ajuste, quando aplicável'],
    ['reason', 'text', 'justificativa registrada para o ajuste'],
    ['starts_at', 'timestamptz', 'data de início de vigência do ajuste'],
    ['ends_at', 'timestamptz', 'data de término de vigência do ajuste'],
    ['indefinite', 'boolean', 'indica se o ajuste vale por prazo indeterminado'],
    ['no_charge', 'boolean', 'indica se o ajuste isenta a empresa de cobrança'],
    ['created_by', 'text', 'quem criou o ajuste (por padrão, admin)'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
  ]],
  ['company_trial_registry', [
    ['cnpj', 'text', 'CNPJ normalizado usado como chave para controlar reincidência de teste'],
    ['first_company_id', 'text', 'id da primeira empresa cadastrada com esse CNPJ'],
    ['first_trial_started_at', 'timestamptz', 'data de início do primeiro teste associado a esse CNPJ'],
    ['trial_consumed', 'boolean', 'indica se o teste gratuito já foi consumido para esse CNPJ'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
  ]],
  ['push_subscriptions', [
    ['id', 'uuid', 'identificador da inscrição de notificações push'],
    ['user_id', 'text', 'usuário ou empresa dona da inscrição'],
    ['user_type', 'text', 'tipo do titular da inscrição (user ou company)'],
    ['endpoint', 'text', 'URL de endpoint do serviço de push do navegador/dispositivo, único'],
    ['p256dh', 'text', 'chave pública usada para criptografar as notificações push'],
    ['auth', 'text', 'segredo de autenticação usado para criptografar as notificações push'],
    ['user_agent', 'text', 'user agent do navegador/dispositivo que gerou a inscrição'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
    ['auth_session_id', 'uuid', 'sessão de autenticação (empresa/colaborador) associada à inscrição'],
    ['company_operator_id', 'uuid', 'colaborador associado à inscrição, quando aplicável'],
  ]],
  ['push_notification_windows', [
    ['recipient_id', 'text', 'destinatário das notificações (parte da chave composta)'],
    ['channel', 'text', 'canal/tipo de notificação controlado (parte da chave composta)'],
    ['context_id', 'text', 'contexto específico da notificação, ex. conversa ou procura (parte da chave composta)'],
    ['last_sent_at', 'timestamptz', 'data/hora do último envio efetivo dentro da janela'],
    ['pending_count', 'integer', 'quantidade de envios represados/agrupados na janela atual'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['registration_progress', [
    ['email', 'text', 'email de quem está cadastrando, chave primária'],
    ['name', 'text', 'nome preenchido até o momento no cadastro'],
    ['phone', 'text', 'telefone preenchido até o momento no cadastro'],
    ['stage', 'text', 'etapa atual do cadastro (personal, address, vehicle ou completed)'],
    ['data', 'jsonb', 'demais dados parciais do formulário de cadastro'],
    ['updated_at', 'timestamptz', 'data da última atualização do progresso salvo'],
  ]],
  ['part_catalog', [
    ['id', 'bigint', 'identificador do item do catálogo de peças'],
    ['source', 'text', 'origem/fonte de importação do item do catálogo'],
    ['source_id', 'text', 'identificador do item na fonte de origem'],
    ['name', 'text', 'nome oficial da peça no catálogo'],
    ['normalized_name', 'text', 'nome da peça normalizado, usado para busca'],
    ['category_name', 'text', 'nome da categoria da peça na fonte de origem'],
    ['category_path', 'text[]', 'caminho hierárquico de categorias da peça'],
    ['aliases', 'text[]', 'sinônimos/variações de nome usados para casar buscas'],
    ['vehicle_types', 'text[]', 'tipos de veículo aos quais a peça se aplica'],
    ['is_high_value', 'boolean', 'marca peças de alto valor, libera visibilidade nacional ao plano nacional'],
    ['is_searchable', 'boolean', 'indica se o item aparece nas sugestões de busca do app'],
    ['active', 'boolean', 'indica se o item do catálogo está ativo'],
    ['source_updated_at', 'timestamptz', 'data de atualização do item na fonte de origem'],
    ['created_at', 'timestamptz', 'data de criação do registro'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
    ['primary_category', 'text', 'categoria principal atribuída/curada pelo admin'],
    ['secondary_categories', 'text[]', 'categorias secundárias atribuídas pelo admin'],
    ['admin_locked', 'boolean', 'impede que sincronizações automáticas sobrescrevam dados curados manualmente'],
    ['admin_notes', 'text', 'observações internas do admin sobre o item'],
    ['disabled_at', 'timestamptz', 'data em que o item foi desativado manualmente'],
  ]],
  ['part_catalog_submissions', [
    ['id', 'uuid', 'identificador da sugestão de termo de peça não encontrado no catálogo'],
    ['normalized_term', 'text', 'termo normalizado digitado pelos usuários, único'],
    ['latest_term', 'text', 'última grafia exata digitada para esse termo'],
    ['sample_terms', 'text[]', 'amostras de grafias diferentes recebidas para o mesmo termo'],
    ['occurrences', 'integer', 'quantas vezes esse termo foi digitado sem casar com o catálogo'],
    ['vehicle_types', 'text[]', 'tipos de veículo associados às ocorrências desse termo'],
    ['status', 'text', 'status de triagem do termo (pending, approved, linked, ignored ou blocked)'],
    ['linked_part_id', 'bigint', 'item do catálogo ao qual o termo foi vinculado, quando aplicável'],
    ['suggested_category', 'text', 'categoria sugerida pelo admin para o novo termo'],
    ['admin_notes', 'text', 'observações internas do admin sobre o termo'],
    ['first_seen_at', 'timestamptz', 'data da primeira ocorrência do termo'],
    ['last_seen_at', 'timestamptz', 'data da ocorrência mais recente do termo'],
    ['reviewed_at', 'timestamptz', 'data em que o termo foi revisado pelo admin'],
  ]],
  ['part_catalog_syncs', [
    ['id', 'bigint', 'identificador da execução de sincronização do catálogo de peças'],
    ['source', 'text', 'fonte de dados sincronizada'],
    ['source_created_at', 'timestamptz', 'data de criação/geração dos dados na fonte de origem'],
    ['records_seen', 'integer', 'quantidade de registros lidos da fonte na sincronização'],
    ['records_imported', 'integer', 'quantidade de registros efetivamente importados/atualizados'],
    ['searchable_records', 'integer', 'quantidade de registros marcados como pesquisáveis após a sincronização'],
    ['synced_at', 'timestamptz', 'data/hora em que a sincronização foi executada'],
  ]],
  ['vehicle_brands', [
    ['id', 'text', 'identificador da marca de veículo'],
    ['vehicle_type', 'text', 'tipo de veículo da marca (car, motorcycle ou truck)'],
    ['name', 'text', 'nome da marca'],
    ['source', 'text', 'origem dos dados da marca (por padrão, fipex)'],
    ['reference_month', 'integer', 'mês de referência da tabela FIPE de onde a marca veio'],
    ['reference_year', 'integer', 'ano de referência da tabela FIPE de onde a marca veio'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['vehicle_models', [
    ['id', 'text', 'identificador do modelo de veículo'],
    ['brand_id', 'text', 'marca à qual o modelo pertence'],
    ['fipe_code', 'text', 'código do modelo na tabela FIPE'],
    ['name', 'text', 'nome do modelo'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['vehicle_years', [
    ['id', 'text', 'identificador do ano/versão do veículo'],
    ['model_id', 'text', 'modelo ao qual esse ano/versão pertence'],
    ['year', 'integer', 'ano do veículo'],
    ['fuel', 'text', 'tipo de combustível dessa versão'],
    ['fuel_code', 'text', 'código do combustível na tabela FIPE'],
    ['zero_km', 'boolean', 'indica se a versão corresponde a veículo 0 km'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['municipalities', [
    ['id', 'text', 'identificador do município'],
    ['name', 'text', 'nome do município'],
    ['state', 'text', 'sigla do estado (UF) do município'],
    ['latitude', 'double precision', 'latitude do centro do município'],
    ['longitude', 'double precision', 'longitude do centro do município'],
    ['source', 'text', 'origem dos dados do município (por padrão, municipios-brasileiros)'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['ui_error_events', [
    ['id', 'bigint', 'identificador do evento/registro agregado de erro de interface'],
    ['user_id', 'text', 'usuário ou empresa logado no momento do erro, quando identificável'],
    ['message', 'text', 'mensagem do erro capturado'],
    ['component_stack', 'text', 'pilha de componentes React no momento do erro, quando disponível'],
    ['page_path', 'text', 'caminho/rota da aplicação onde o erro ocorreu'],
    ['user_agent', 'text', 'user agent do navegador em que o erro ocorreu'],
    ['app_version', 'text', 'versão do app em que o erro ocorreu'],
    ['created_at', 'timestamptz', 'data de criação do registro (primeira ocorrência)'],
    ['source', 'text', 'origem do erro (crash, error_toast, unhandled_rejection ou window_error)'],
    ['occurrences', 'integer', 'quantidade de vezes que esse erro (mesma assinatura) já ocorreu'],
    ['last_seen_at', 'timestamptz', 'data/hora da ocorrência mais recente desse erro'],
    ['fingerprint', 'text', 'assinatura única do erro, usada para agrupar ocorrências repetidas'],
  ]],
  ['platform_settings', [
    ['key', 'text', 'chave única da configuração da plataforma'],
    ['value', 'jsonb', 'valor da configuração, em formato livre conforme a chave'],
    ['updated_at', 'timestamptz', 'data da última atualização do registro'],
  ]],
  ['user_directory', [
    ['id', 'text', 'mesmo id do usuário em users'],
    ['name', 'text', 'nome do usuário; é o único dado exposto além do id, usado para resolver nomes em chats e notificações sem dar acesso a email, telefone ou veículos'],
  ], true],
  ['company_directory', [
    ['id', 'text', 'mesmo id da empresa em companies'],
    ['name', 'text', 'razão social ou nome fantasia, igual a companies.name'],
    ['phone', 'text', 'telefone de contato, igual a companies.phone'],
    ['cnpj', 'text', 'CNPJ da empresa, igual a companies.cnpj'],
    ['address', 'text', 'endereço textual, igual a companies.address'],
    ['latitude', 'double precision', 'latitude da empresa, igual a companies.latitude'],
    ['longitude', 'double precision', 'longitude da empresa, igual a companies.longitude'],
    ['serves_locations', 'jsonb', 'localidades/regiões atendidas, igual a companies.serves_locations'],
    ['validation_status', 'text', 'status de validação/aprovação, igual a companies.validation_status'],
    ['vehicle_types', 'jsonb', 'tipos de veículo atendidos, igual a companies.vehicle_types'],
    ['created_at', 'timestamptz', 'data de criação da empresa, igual a companies.created_at'],
    ['location_source', 'text', 'origem da localização, igual a companies.location_source'],
    ['postal_code', 'text', 'CEP da empresa, igual a companies.postal_code'],
    ['whatsapp', 'text', 'WhatsApp de contato, igual a companies.whatsapp'],
    ['address_number', 'text', 'número do endereço, igual a companies.address_number'],
    ['plan_code', 'text', 'plano de assinatura contratado, igual a companies.plan_code'],
    ['subscription_state', 'text', 'estado da assinatura, igual a companies.subscription_state'],
    ['avg_rating', 'numeric', 'nota média da empresa, trazida de company_reputation_stats (null quando ainda não há avaliação)'],
    ['rating_count', 'bigint', 'quantidade de avaliações recebidas, trazida de company_reputation_stats'],
    ['avg_response_hours', 'numeric', 'tempo médio de resposta em horas, trazido de company_reputation_stats'],
    ['available_rate', 'numeric', 'percentual de respostas "Tenho" sobre o total, trazido de company_reputation_stats'],
    ['badge_well_rated', 'boolean', 'selo de bem avaliada; false (nunca null) quando a empresa ainda não tem estatística de reputação'],
    ['badge_fast_responder', 'boolean', 'selo de resposta rápida; false (nunca null) quando a empresa ainda não tem estatística de reputação'],
    ['logo_url', 'text', 'URL do logo/foto de perfil, igual a companies.logo_url'],
    ['bio', 'text', 'descrição curta do perfil público, igual a companies.bio'],
  ], true],
  ['company_reputation_stats', [
    ['company_id', 'text', 'empresa a que as métricas se referem'],
    ['avg_rating', 'numeric', 'média das notas (1 a 5) recebidas em company_ratings, arredondada a 1 casa decimal'],
    ['rating_count', 'bigint', 'quantidade de avaliações distintas recebidas em company_ratings'],
    ['avg_response_hours', 'numeric', 'tempo médio, em horas, entre a criação da procura e o envio da resposta; para empresas assinantes, descontado o atraso de visibilidade do plano (visibility_delay_minutes), para não penalizar quem só viu a procura depois desse atraso'],
    ['response_count', 'bigint', 'quantidade total de respostas dadas pela empresa'],
    ['available_rate', 'numeric', 'percentual de respostas com status available ("Tenho") sobre o total de respostas; null quando a empresa nunca respondeu'],
    ['badge_well_rated', 'boolean', 'true quando rating_count >= 3 e a nota média bruta é >= 4.5'],
    ['badge_fast_responder', 'boolean', 'true quando response_count >= 5 e o tempo médio de resposta é <= 6 horas'],
  ], true],
];

const views = [
  ['user_directory', 'Recorte público de users (id e nome), usado para resolver nomes em chats e notificações.'],
  ['company_directory', 'Recorte público de companies (contato, endereço, reputação, plano), visível a qualquer usuário autenticado, não só ao próprio dono.'],
  ['company_reputation_stats', 'Agregação de nota média, taxa de disponibilidade e tempo médio de resposta por empresa, usada nos selos de reputação.'],
];

// Descrições conferidas lendo o corpo de cada função nas migrations mais recentes.
const functionsByArea = [
  ['Visibilidade e matching', [
    ['company_can_view_procura', 'Decide se a empresa autenticada pode ver uma procura específica. Libera direto se a empresa tem a flag sees_all_procuras ativa ou se já respondeu àquela procura. Senão, exige que o tipo de veículo seja atendido, que a procura esteja dentro da cobertura geográfica do plano (mesmo estado, raio, ou nacional com exceções para peça rara, veículo com 15+ anos ou ausência de resposta positiva no estado) e que já tenha passado o atraso de visibilidade do plano. Retorna falso se a empresa ou a procura não existirem.'],
    ['company_effective_subscription', 'Calcula e devolve em JSON o estado efetivo da assinatura de uma empresa (assinante ativo, trial ativo ou trial encerrado), considerando plano manual, pausa de cobrança, período pago vigente, contadores de respostas e de procuras recebidas durante o trial, e outros metadados usados pela interface.'],
    ['save_company_response', 'Insere ou atualiza a resposta de uma empresa a uma procura, validando sessão, acesso de equipe ativo, permissão de assinatura para responder, elegibilidade via company_can_view_procura e status ativo da procura, e grava qual operador da equipe atendeu o chamado.'],
    ['capture_procura_part_catalog', 'Trigger que, ao gravar o nome da peça em uma procura, tenta casar o texto normalizado com o catálogo (nome ou sinônimos) e preenche part_catalog_id. Se não encontrar correspondência, registra ou incrementa a ocorrência em part_catalog_submissions para curadoria posterior.'],
  ]],
  ['Contas e autenticação', [
    ['handle_new_account', 'Trigger que roda depois de criar uma conta em auth.users e cria o registro correspondente em users ou companies, conforme o tipo de conta enviado no cadastro, preenchendo localização, CEP, veículos etc.'],
    ['handle_new_auth_user', 'Tem a mesma lógica de criação de perfil que handle_new_account, mas hoje não está associada a nenhum trigger no banco: é código duplicado que não está em uso.'],
    ['account_type_for_email', 'Verifica se um e-mail pertence a um comprador ou a uma empresa (ignorando empresas com exclusão lógica) e retorna qual dos dois, ou nenhum.'],
    ['identifier_registered', 'Verifica se um CPF ou CNPJ já está cadastrado, comparando as versões normalizadas, usada para bloquear duplicidade no cadastro.'],
    ['confirm_own_email', 'Marca o e-mail da própria conta autenticada como confirmado, só se ainda não tinha sido confirmado antes.'],
    ['delete_own_company_account', 'Faz a exclusão lógica da empresa autenticada, exige ser o responsável. Anonimiza e-mail, telefone, CNPJ e endereço, apaga as assinaturas de push e remove o usuário do Supabase Auth.'],
  ]],
  ['Equipe e colaboradores da empresa', [
    ['claim_company_access', 'Autentica a sessão do dispositivo atual como responsável, sem exigir PIN por já ter entrado com a conta principal, ou como colaborador validando usuário e PIN (bloqueia por 15 minutos após 5 tentativas erradas). Respeita o limite de acessos simultâneos do plano.'],
    ['enable_company_team_access', 'Ativa o controle de acesso por equipe da empresa e registra a sessão atual como responsável. Se o controle já estiver ativo, só o responsável pode chamar de novo.'],
    ['save_company_operator', 'Cria ou atualiza um colaborador (nome, usuário, PIN, contato), validando formato de todos os campos e unicidade do usuário. Só o responsável pode chamar.'],
    ['list_company_operators', 'Lista os colaboradores cadastrados da empresa autenticada, com contatos e status ativo/desativado. Só o responsável pode chamar.'],
    ['disable_company_operator', 'Desativa um colaborador, apaga suas assinaturas de push e revoga as sessões de acesso abertas por ele. Só o responsável pode chamar.'],
    ['verify_company_collaborator_login', 'Valida o login de um colaborador por CNPJ, usuário e PIN, bloqueando por 15 minutos após 5 tentativas erradas, e retorna os dados da empresa e do colaborador se a combinação for válida.'],
    ['company_access_is_active', 'Retorna verdadeiro se o controle de acesso da empresa estiver desativado ou se a sessão atual tiver uma linha ativa (não revogada, vista nos últimos 10 minutos) em company_access_sessions.'],
    ['company_access_is_owner', 'Igual a company_access_is_active, mas exige também que a sessão atual seja do responsável, não de um colaborador.'],
    ['heartbeat_company_access', 'Atualiza a data de última atividade da sessão de acesso atual, se ela ainda estiver ativa, mantendo-a viva.'],
    ['record_company_access', 'Acrescenta um horário de acesso ao histórico da própria empresa autenticada.'],
    ['release_company_access', 'Revoga a sessão de acesso atual da empresa e apaga as assinaturas de push ligadas a ela, liberando a vaga de acesso simultâneo.'],
    ['get_company_access_context', 'Retorna em JSON o contexto de acesso da empresa autenticada: se o controle de equipe está ativo, se a sessão atual está autorizada, papel, colaborador e quantidade de acessos ativos. Expira antes as sessões inativas há mais de 10 minutos.'],
    ['list_company_access_sessions', 'Lista as sessões de acesso ativas da empresa (papel, colaborador, dispositivo, última atividade, se é a sessão atual). Só o responsável pode chamar.'],
    ['revoke_company_access_session', 'Encerra uma sessão de acesso específica da empresa e remove as assinaturas de push ligadas a ela. Só o responsável pode chamar.'],
    ['assign_push_access_context', 'Trigger que preenche automaticamente a sessão de acesso e o colaborador de uma assinatura de push a partir da sessão ativa no momento da gravação.'],
    ['current_auth_session_id', 'Extrai o identificador de sessão do token JWT atual, usado por outras funções de controle de acesso para identificar o dispositivo.'],
  ]],
  ['Chat', [
    ['mark_message_read', 'Marca uma mensagem específica como lida, só quando quem chama é o destinatário dela.'],
    ['mark_messages_delivered', 'Marca como entregues todas as mensagens ainda não entregues cujo destinatário é o usuário autenticado.'],
    ['buyer_started_chat', 'Verifica se já existe alguma mensagem enviada pelo comprador naquele chat, condição para a empresa poder responder.'],
    ['assign_message_operator', 'Trigger que, ao inserir uma mensagem enviada por uma empresa, grava qual colaborador da sessão ativa a enviou.'],
    ['recent_messages', 'Retorna, para o usuário autenticado, só as últimas mensagens de cada conversa em que ele participa (padrão 150, máximo 500 por conversa), em vez do histórico completo de todas as conversas.'],
  ]],
  ['Planos e trial', [
    ['get_company_subscription_context', 'Atalho que chama company_effective_subscription para a empresa autenticada consultar o próprio estado de assinatura.'],
    ['initialize_company_trial', 'Trigger que roda antes de criar uma empresa e define as datas de início e fim mínimo/máximo do trial (30 a 90 dias), já marcando se o CNPJ já consumiu um trial antes.'],
    ['register_company_trial_cnpj', 'Trigger que roda depois de criar uma empresa e registra o CNPJ normalizado em company_trial_registry, para impedir reaproveitar o trial recriando o cadastro.'],
    ['sync_company_plan_access_limit', 'Trigger que roda ao criar ou trocar o plano da empresa e sincroniza o limite de acessos simultâneos com o que está definido naquele plano.'],
    ['mark_trial_welcome_seen', 'Marca, uma única vez, que a empresa já viu a tela de boas-vindas do trial.'],
    ['mark_trial_end_summary_seen', 'Marca, uma única vez, que a empresa já viu o resumo de fim de trial.'],
  ]],
  ['Catálogo de peças', [
    ['search_part_catalog', 'Busca peças no catálogo por texto normalizado (correspondência exata, por prefixo, por substring ou por similaridade) e por tipo de veículo, retornando até 200 resultados ordenados por relevância.'],
    ['normalize_catalog_text', 'Normaliza um texto (minúsculas, sem acento, sem pontuação) para comparar nomes de peça de forma consistente.'],
  ]],
  ['Notificações e telemetria', [
    ['claim_push_notification_window', 'Controla a frequência de notificações push por destinatário, canal e contexto: se o último envio estiver fora da janela de tempo informada, registra o envio agora e retorna verdadeiro; senão só incrementa um contador e retorna falso.'],
    ['log_ui_error', 'Registra um erro de interface (tela quebrada, toast de erro, promise rejeitada ou erro de script), agregando por assinatura do erro em vez de criar uma linha por ocorrência, usado pela aba Erros do admin.'],
  ]],
  ['Diversos', [
    ['mark_response_read', 'Marca uma resposta de empresa como lida pelo comprador, só se a resposta pertencer a uma procura do próprio usuário autenticado.'],
    ['submit_feedback', 'Grava um feedback do usuário autenticado, validando tipo de usuário, tipo de feedback, nota entre 1 e 5, e limites de tamanho do texto e do contato.'],
    ['submit_company_rating', 'Registra ou atualiza a nota e o comentário do comprador sobre a resposta de uma empresa, validando que a resposta pertence a uma procura do próprio comprador.'],
    ['save_registration_progress', 'Salva ou atualiza em qual etapa um cadastro em andamento parou, identificado por e-mail, usado no funil de cadastros incompletos do admin.'],
  ]],
];

const edgeFunctions = [
  { name: 'send-web-push', what: 'Envia notificação push (nova procura, resposta ou mensagem). Chamada pelo front-end logo após a ação relevante ser gravada no banco.', auth: 'JWT não exigido explicitamente no config. Usa a service role internamente para ler destinatários.' },
  { name: 'company-collaborator-login', what: 'Verifica CNPJ, usuário e PIN de um colaborador e gera um magic link de login, sem exigir e-mail do colaborador.', auth: 'verify_jwt = false. Precisa ser assim porque o colaborador ainda não tem sessão.' },
  { name: 'send-operator-access', what: 'Envia por e-mail, via Resend, o usuário/PIN de acesso de um colaborador recém-cadastrado ou reativado.', auth: 'verify_jwt = true. Só quem já está autenticado (o responsável da empresa) pode acionar.' },
];

const frontendRoutes = [
  ['/', 'App principal: landing, cadastro/login ou dashboard, dependendo da sessão.'],
  ['/confirmacao', 'Callback de confirmação de e-mail (Supabase Auth redireciona pra cá), reescrito para index.html no vercel.json.'],
  ['/redefinir-senha', 'Callback de recuperação de senha, também reescrito para index.html.'],
  ['/painel-interno-preview', 'Painel administrativo. Só existe em modo de desenvolvimento local (import.meta.env.DEV), não é servido em produção.'],
];

const adminApiRoutes = [
  { route: '/api/admin-preview-data', method: 'GET', what: 'Lê usuários, empresas, procuras, feedbacks e progresso de cadastro direto do Postgres via REST, usando a service role. Só é chamada pela tela /painel-interno-preview, que continua restrita a modo de desenvolvimento local.' },
  { route: '/api/admin-catalog', method: 'GET/POST', what: 'Lista e edita o catálogo de peças e a fila de submissões pendentes.' },
  { route: '/api/admin-entitlements', method: 'POST', what: 'Aplica ajuste manual de plano, trial ou pausa de cobrança numa empresa e registra o motivo.' },
];

const apiLayers = [
  {
    name: 'API REST auto-gerada (PostgREST)',
    badge: 'API principal do produto',
    what: 'É a API que o produto realmente usa o tempo todo. O Supabase expõe automaticamente cada tabela e cada função SQL como um endpoint HTTP, gerado a partir do schema do Postgres. Quando o front-end chama supabase.from(\'procuras\').select() ou supabase.rpc(\'save_company_response\', {...}), isso é, por trás, uma chamada HTTP normal para esses endpoints.',
    examples: [
      'GET /rest/v1/procuras?select=*,responses(*)&order=created_at.desc',
      'POST /rest/v1/rpc/save_company_response',
    ],
    auth: 'Toda chamada leva o header apikey (chave pública do projeto) e, quando autenticado, Authorization: Bearer com o token do usuário logado. Quem decide o que cada chamada pode ler ou escrever não é o endpoint, é a Row Level Security de cada tabela.',
  },
  {
    name: 'API de arquivos (Supabase Storage)',
    badge: '2 buckets',
    what: 'Upload e leitura de imagens também é uma API REST própria do Supabase, com dois buckets configurados.',
    examples: [
      'part-photos: público, até 1,5 MB, jpeg/png/webp (fotos de peça e logo da empresa)',
      'chat-images: privado, até 1,5 MB, jpeg/png/webp (imagens trocadas no chat, exigem link assinado para visualizar)',
    ],
    auth: 'Mesmo padrão de autenticação da API REST, com políticas de acesso próprias por bucket.',
  },
  {
    name: 'Canal em tempo real (Supabase Realtime)',
    badge: 'WebSocket',
    what: 'O app abre uma conexão de WebSocket escutando mudanças nas tabelas procuras, responses e messages (dataService.subscribeToDataChanges). Quando alguma dessas tabelas muda, o front-end recebe o evento e atualiza os dados, sem precisar ficar consultando a cada poucos segundos.',
    examples: ['channel(\'app-data\').on(\'postgres_changes\', { table: \'messages\' }, ...)'],
    auth: 'Mesma sessão do usuário autenticado; RLS também vale para o que chega pelo canal.',
  },
];

const brandColors = [
  { name: 'primary', token: '--primary', hex: '#2e6ff3', hsl: '220.12 89.36% 56.67%', usage: 'Cor principal da marca. Botão "Vou procurar", links, foco de campos, header do app logado. Mesmo tom em claro e escuro.' },
  { name: 'accent-agile', token: '--accent-agile', hex: '#21c7b0', hsl: '171.69 71.55% 45.49%', usage: 'Verde-menta secundário, ligado ao lado "empresa/venda". Usado como preenchimento (badges, ícones de destaque) sobre fundo escuro ou como accent-agile-foreground por cima.' },
  { name: 'accent-agile-text', token: '--accent-agile-text', hex: '#147a6c (claro) / #21c7b0 (escuro)', hsl: '171.69 71.55% 28% no claro, mesmo valor de accent-agile no escuro', usage: 'Versão escurecida do verde-menta só para texto/borda/ícone sobre fundo claro, criada para o botão "Vou vender" e rótulos "Para quem vende" atingirem contraste AA (5.2:1). Em fundo escuro o tom original já tem contraste alto, então não muda.' },
  { name: 'success', token: '--success', hex: '#1a9e8c (claro) / mesmo tom de accent-agile no escuro', hsl: '172 72% 36% no claro', usage: 'Estados de sucesso e confirmação.' },
  { name: 'warning', token: '--warning', hex: '#e8a111 (claro) / #f2b84b (escuro)', hsl: '40 86% 49% no claro, 39.16 86.53% 62.16% no escuro', usage: 'Avisos, reta final do trial, limites se aproximando.' },
  { name: 'destructive / danger', token: '--destructive / --danger', hex: '#c11f1f (claro) / #f87171 (escuro)', hsl: '0 60-72% no claro, 0 90.6% 70.78% no escuro', usage: 'Erros, ações destrutivas (excluir, cancelar), mensagens de campo obrigatório.' },
  { name: 'background / foreground', token: '--background / --foreground', hex: '#f8f9fc / #0f1729 (claro), #070d1a / #eaf0fb (escuro)', hsl: '', usage: 'Fundo e texto base da aplicação. O modo escuro não é um simples inverte de cor: os tons de card, popover e border têm valores próprios (ver src/index.css) para manter contraste e profundidade.' },
  { name: 'border / input', token: '--border / --input', hex: '#c6d0dd (claro)', hsl: '214 25% 82-88% no claro', usage: 'Bordas de card, input, divisores.' },
];

const typography = [
  ['Plus Jakarta Sans (font-heading)', 'Pesos 500/700/800, carregada via Google Fonts em index.html. Usada em títulos, números de destaque e no logotipo (BrandLogo). Aplicada com a classe utilitária font-heading do Tailwind.'],
  ['Inter (font-sans)', 'Pesos 400/500/600/700, é a fonte padrão (sans) do Tailwind neste projeto: todo texto de corpo, rótulo e botão usa Inter por padrão, sem precisar de classe extra.'],
];

const brandAssets = [
  ['BrandLogo.jsx', 'Logotipo completo: ícone (public/favicon.svg) + nome, sempre em minúsculas ("procuro" em foreground, "pra ti" em primary). Usado no header, telas de login/cadastro e rodapé. Aceita as props as, iconClassName, textClassName e compactOnMobile (esconde o texto "pra ti" abaixo de 350px de largura).'],
  ['BrandMark.jsx', 'Só o ícone (favicon.svg) em tamanho pequeno, sem o texto. Usado dentro de botões e listas como marcador visual, por exemplo no botão "Vou procurar" e nos comboboxes de busca.'],
  ['public/favicon.svg', 'Arquivo fonte do ícone da marca, reaproveitado por BrandLogo e BrandMark em vez de duas imagens separadas.'],
];

const uiComponents = [
  ['Button', 'button.jsx', '7 variantes (default, positive, destructive, outline, secondary, ghost, link) e 4 tamanhos (default, sm, lg, icon), construído com class-variance-authority. positive usa accent-agile; outline é o padrão dos botões secundários em formulários.'],
  ['Badge', 'badge.jsx', '4 variantes (default, secondary, destructive, outline), pílula pequena usada para status, contadores e selos (ex.: "Prorrogado", selos de reputação da empresa).'],
  ['Card / CardHeader / CardTitle / CardDescription / CardContent / CardFooter', 'card.jsx', 'Contêiner padrão de conteúdo em todo o app: painel admin, formulários, listas de procuras e respostas.'],
  ['Checkbox', 'checkbox.jsx', 'Baseado em @radix-ui/react-checkbox. Usado em "Desejo receber fotos", termos de uso, seleção de tipos de veículo.'],
  ['Command / CommandInput / CommandList / CommandItem / CommandGroup / CommandEmpty', 'command.jsx', 'Paleta de busca construída sobre a lib cmdk, é a base do dropdown de sugestões do AutocompleteInput (nome da peça).'],
  ['Dialog / DialogContent / DialogHeader / DialogTitle / DialogFooter', 'dialog.jsx', 'Modal baseado em @radix-ui/react-dialog. Usado em confirmações, edição de item do catálogo, telas de trial (TrialWelcomeModal, TrialEndModal).'],
  ['DropdownMenu e subcomponentes', 'dropdown-menu.jsx', 'Menu suspenso baseado em @radix-ui/react-dropdown-menu.'],
  ['Input', 'input.jsx', 'Campo de texto padrão, estilo consistente para todos os forms.'],
  ['Label', 'label.jsx', 'Rótulo de campo de formulário, com variantes via class-variance-authority.'],
  ['Popover / PopoverContent / PopoverTrigger', 'popover.jsx', 'Baseado em @radix-ui/react-popover. É a base do CityCombobox (marca, modelo, ano, cidade de endereço) e do AutocompleteInput.'],
  ['ScrollArea / ScrollBar', 'scroll-area.jsx', 'Área com scroll customizado (usada, por exemplo, na lista de feedbacks do admin).'],
  ['Select / SelectTrigger / SelectContent / SelectItem / SelectValue', 'select.jsx', 'Baseado em @radix-ui/react-select. Usado em campos de escolha fechada, como tipo de veículo e filtros do admin.'],
  ['Slider', 'slider.jsx', 'Baseado em @radix-ui/react-slider. Usado para a duração da procura (1 a 15 dias).'],
  ['Tabs / TabsList / TabsTrigger / TabsContent', 'tabs.jsx', 'Baseado em @radix-ui/react-tabs. Estrutura as abas do painel admin e do CompanyDashboard.'],
  ['Textarea', 'textarea.jsx', 'Campo de texto multi-linha, usado em descrições e mensagens.'],
  ['Toast / Toaster / use-toast', 'toast.jsx, toaster.jsx, use-toast.js', 'Sistema de notificação temporária no canto da tela, usado em toda a aplicação para confirmar ações e mostrar erros. Toasts com variant destructive também disparam o registro em ui_error_events (ver seção API).'],
];

const productComponents = [
  ['VehicleSelector', 'Tipo + ano + marca + modelo do veículo, consumindo o catálogo FIPE (vehicleCatalogService). Permite marca e modelo manuais quando não existem no catálogo, usando o mesmo padrão "Usar ..." do AutocompleteInput.'],
  ['CityCombobox', 'Combobox de busca genérico (não é só para cidade, apesar do nome: também é usado para marca, modelo e ano do veículo). Busca por palavra, sem acento e sem diferenciar maiúscula/minúscula (matchesSearch, em textSearch.js), e pode receber onCreate para permitir valor digitado quando não há opção correspondente.'],
  ['AutocompleteInput', 'Campo de texto com sugestões (usado no nome da peça). Mesma busca por palavra do CityCombobox, mais um item "Usar “X”" sempre visível quando o texto digitado não bate exatamente com nenhuma sugestão, para deixar claro que dá para continuar com o nome digitado.'],
  ['BrandLogo / BrandMark', 'Ver seção "Marca e ícone" acima.'],
  ['ThemeToggle', 'Alterna entre modo claro e escuro, persistindo a preferência.'],
];

const sections = [
  { id: 'stack', icon: Layers, label: 'Stack' },
  { id: 'hosting', icon: Server, label: 'Hospedagem' },
  { id: 'database', icon: Database, label: 'Banco de dados' },
  { id: 'diagram', icon: Network, label: 'Relacionamentos' },
  { id: 'design', icon: Palette, label: 'Identidade visual' },
  { id: 'auth', icon: KeyRound, label: 'Contas' },
  { id: 'api', icon: Webhook, label: 'API' },
  { id: 'edge', icon: Zap, label: 'Edge Functions' },
  { id: 'external', icon: Globe, label: 'Integrações externas' },
  { id: 'routes', icon: Route, label: 'Rotas do site' },
  { id: 'push', icon: Bell, label: 'PWA/Push' },
  { id: 'business', icon: DollarSign, label: 'Planos' },
  { id: 'scripts', icon: Terminal, label: 'Scripts' },
  { id: 'limitations', icon: AlertTriangle, label: 'Limitações' },
];

export default function DocumentationPanel() {
  const [active, setActive] = useState('stack');
  const totalFunctions = functionsByArea.reduce((sum, [, fns]) => sum + fns.length, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-4 lg:h-fit lg:flex-col lg:overflow-visible lg:pb-0">
        {sections.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full ${active === id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-w-0 space-y-4">
        {active === 'stack' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Layers className="h-5 w-5 text-primary" />Stack técnica</CardTitle>
              <CardDescription>Visão geral de tudo que compõe o front-end e como ele é construído.</CardDescription>
            </CardHeader>
            <CardContent><SimpleList items={stack} /></CardContent>
          </Card>
        )}

        {active === 'hosting' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Server className="h-5 w-5 text-primary" />Hospedagem e ambientes</CardTitle>
              <CardDescription>Onde cada parte roda hoje.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <EntryCard title="Front-end">
                <p className="text-sm text-foreground/90">Vercel, projeto <Chip>procuro-pra-ti</Chip>, deploy de produção em <Chip>procuroprati.com</Chip> (também <Chip>www.procuroprati.com</Chip> e o domínio <Chip>.vercel.app</Chip>). Deploy dispara por push na branch <Chip>main</Chip> (integração com GitHub) ou manualmente via CLI.</p>
              </EntryCard>
              <EntryCard title="Banco/backend" badge={<span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">sem staging hoje</span>}>
                <p className="text-sm text-foreground/90">Um único projeto Supabase (região sa-east-1, São Paulo) usado tanto para desenvolvimento quanto produção. Não existe ambiente de staging isolado hoje (ver seção Limitações).</p>
              </EntryCard>
              <EntryCard title="Migrations">
                <p className="text-sm text-foreground/90">Versionadas em <Chip>supabase/migrations/*.sql</Chip> e aplicadas com <Chip>supabase db push</Chip> via CLI. Não há CI automatizado rodando isso.</p>
              </EntryCard>
              <EntryCard title="Variáveis de ambiente">
                <p className="text-sm text-foreground/90">URL/chave pública do Supabase e chave VAPID pública ficam no front (<Chip>VITE_*</Chip>). A chave de serviço (<Chip>SUPABASE_SERVICE_ROLE_KEY</Chip>) só é usada em scripts locais e nas Edge Functions, nunca no bundle do navegador.</p>
              </EntryCard>
            </CardContent>
          </Card>
        )}

        {active === 'database' && (
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Database className="h-5 w-5 text-primary" />Tabelas ({tables.length})</CardTitle>
                <CardDescription>Postgres gerenciado pelo Supabase. Toda regra de negócio sensível (quem vê o quê, quem pode responder) fica em Row Level Security e funções SQL, não no front-end.</CardDescription>
              </CardHeader>
              <CardContent><SimpleList items={tables} /></CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Views</CardTitle></CardHeader>
              <CardContent><SimpleList items={views} /></CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Funções SQL ({totalFunctions} no total)</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {functionsByArea.map(([area, fns]) => (
                  <div key={area}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-agile">{area}</p>
                    <SimpleList items={fns} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-accent-agile/40 bg-accent-agile/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-accent-agile" />Segurança em nível de linha (RLS)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/90">Todas as tabelas com dado de usuário têm RLS habilitada. O caso mais importante é <Chip>procuras_read_relevant</Chip>, que decide se uma empresa enxerga uma procura chamando <Chip>company_can_view_procura()</Chip>: essa função é a implementação real do modelo de matching (ver seção Planos). Funções que precisam ignorar RLS, como cadastro e ajustes de admin, são <Chip>SECURITY DEFINER</Chip> e revalidam <Chip>auth.uid()</Chip> manualmente por dentro.</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Dicionário de dados: coluna a coluna</CardTitle>
                <CardDescription>Junta a definição original de cada tabela e view com todas as alterações feitas depois por migration, sempre batendo com o schema real do banco.</CardDescription>
              </CardHeader>
            </Card>
            {dataDictionary.map(([tableName, columns, isView]) => (
              <Card key={tableName} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Chip>{tableName}</Chip>
                    {isView && <span className="rounded-full bg-accent-agile/15 px-2 py-0.5 text-[10px] font-semibold text-accent-agile">view</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {columns.map(([column, type, description]) => (
                      <div key={column} className="rounded-lg border border-border bg-input/30 p-3">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="font-mono text-xs font-semibold text-foreground">{column}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{type}</span>
                        </div>
                        <p className="mt-1 text-xs text-foreground/80">{description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {active === 'diagram' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Network className="h-5 w-5 text-primary" />Como as entidades principais se relacionam</CardTitle>
              <CardDescription>Só as tabelas centrais do fluxo de negócio. Tabelas de apoio (catálogos, planos, telemetria) ficam de fora para manter o diagrama legível.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="grid w-full max-w-2xl grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <FlowNode label="users" detail="comprador" />
                  <FlowArrow label="cria (user_id)" direction="right" />
                  <FlowNode label="procuras" detail="1 usuário → N procuras" />
                </div>
                <FlowArrow label="uma procura recebe respostas" />
                <div className="grid w-full max-w-2xl grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <FlowNode label="companies" detail="empresa vendedora" />
                  <FlowArrow label="envia (company_id)" direction="right" />
                  <FlowNode label="responses" detail="1 procura → N respostas, 1 por empresa" />
                </div>
                <FlowArrow label="depois de uma resposta, comprador e empresa podem conversar" />
                <FlowNode label="messages" detail="sempre vinculada a users + companies + procuras" />
                <FlowArrow label="uma empresa também se relaciona com" />
                <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
                  <FlowNode label="subscription_plans" detail="qual plano assina" />
                  <FlowNode label="company_operators" detail="colaboradores da equipe" />
                  <FlowNode label="company_ratings" detail="nota recebida por resposta" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {active === 'design' && (
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Palette className="h-5 w-5 text-primary" />Cores da marca</CardTitle>
                <CardDescription>Tokens semânticos definidos em src/index.css (:root para claro, .dark para escuro) e mapeados para classes Tailwind em tailwind.config.js. O código nunca usa hexadecimal direto, sempre a classe (ex.: bg-primary, text-accent-agile-text).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {brandColors.map(color => (
                  <div key={color.name} className="flex flex-col gap-2 rounded-xl border border-border bg-input/30 p-3.5 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 items-center gap-2 sm:w-40">
                      <span className="h-8 w-8 shrink-0 rounded-lg border border-border" style={{ background: color.hex.split(' ')[0] }} aria-hidden="true" />
                      <div>
                        <p className="font-mono text-xs font-semibold text-foreground">{color.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{color.token}</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-foreground/80">{color.hex}{color.hsl ? ` · HSL ${color.hsl}` : ''}</p>
                      <p className="mt-1 text-xs text-foreground/80">{color.usage}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Tipografia</CardTitle></CardHeader>
              <CardContent><SimpleList items={typography} /></CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Marca e ícone</CardTitle></CardHeader>
              <CardContent><SimpleList items={brandAssets} /></CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Biblioteca de componentes de UI ({uiComponents.length})</CardTitle>
                <CardDescription>src/components/ui/, padrão shadcn/ui: primitivas Radix UI sem estado próprio de estilo, com variantes via class-variance-authority e classes Tailwind usando os tokens de cor acima.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {uiComponents.map(([name, file, description]) => (
                  <div key={name} className="rounded-xl border border-border bg-input/30 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{name}</span>
                      <Chip>{file}</Chip>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/90">{description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Componentes de produto reutilizáveis</CardTitle>
                <CardDescription>Compostos a partir das primitivas de UI acima, usados em várias telas do produto.</CardDescription>
              </CardHeader>
              <CardContent><SimpleList items={productComponents} /></CardContent>
            </Card>
          </div>
        )}

        {active === 'api' && (
          <div className="space-y-4">
            <Card className="border-accent-agile/40 bg-accent-agile/5">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground/90">O produto tem API própria, sim. Ela só não é um servidor Express escrito à mão: é gerada automaticamente a partir do schema do Postgres pelo Supabase, mais três Edge Functions escritas à mão para os casos que precisam de lógica fora do banco (ver seção Edge Functions).</p>
              </CardContent>
            </Card>
            {apiLayers.map(layer => (
              <Card key={layer.name} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <Webhook className="h-4 w-4 text-primary shrink-0" />
                    {layer.name}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{layer.badge}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground/90">{layer.what}</p>
                  <div className="space-y-1.5 rounded-lg bg-input/40 p-3">
                    {layer.examples.map(example => <p key={example} className="font-mono text-xs text-foreground/80">{example}</p>)}
                  </div>
                  <Field label="Autenticação">{layer.auth}</Field>
                </CardContent>
              </Card>
            ))}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Rotas escritas à mão (funções serverless da Vercel)</CardTitle>
                <CardDescription>Vivem em api/*.js na raiz do projeto e a Vercel publica cada arquivo como uma função, rodando em produção junto com o resto do build. Usam a service role key lida de process.env dentro da função, nunca exposta ao navegador. Em desenvolvimento local (npm run dev), as mesmas rotas continuam também disponíveis via middleware do Vite (vite.config.js), só por conveniência de não precisar do vercel dev.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {adminApiRoutes.map(item => (
                  <div key={item.route} className="rounded-xl border border-border bg-input/30 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip>{item.route}</Chip>
                      <span className="rounded-full bg-input px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{item.method}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/90">{item.what}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {active === 'auth' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-primary" />Autenticação e modelo de contas</CardTitle>
              <CardDescription>Como cada tipo de perfil entra no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <EntryCard title="Comprador (users)"><p className="text-sm text-foreground/90">Conta padrão do Supabase Auth (e-mail e senha). Uma conta é uma pessoa.</p></EntryCard>
              <EntryCard title="Empresa (companies)"><p className="text-sm text-foreground/90">Também conta do Supabase Auth. O cadastro guarda CNPJ, endereço e plano vinculados a essa mesma conta.</p></EntryCard>
              <EntryCard title="Colaborador (company_operators)"><p className="text-sm text-foreground/90">Não tem conta própria no Supabase Auth. Entra com CNPJ, usuário e PIN numa Edge Function que verifica as credenciais e emite um magic link para a conta da empresa. O acesso dele dentro do app é limitado por regras de RLS/role, por exemplo não pode editar perfil nem excluir a conta.</p></EntryCard>
              <EntryCard title="Admin" badge={<span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">sem autenticação real</span>}>
                <p className="text-sm text-foreground/90">Não existe um perfil de admin autenticado hoje. A tela /painel-interno-preview só carrega em modo de desenvolvimento local (import.meta.env.DEV); as funções serverless que ela e o painel de catálogo/planos chamam (api/admin-*.js) existem em produção, mas sem nenhum login ou verificação de permissão na frente. Ver seção Limitações.</p>
              </EntryCard>
            </CardContent>
          </Card>
        )}

        {active === 'external' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-5 w-5 text-primary" />Integrações externas</CardTitle>
              <CardDescription>Todo serviço de terceiro do qual o produto depende para funcionar ou que foi usado para popular dados.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {externalServices.map(service => (
                <div key={service.name} className="rounded-xl border border-border bg-input/30 p-4">
                  <p className="font-semibold text-foreground">{service.name}</p>
                  <div className="mt-2 space-y-2">
                    <Field label="Usado para">{service.usage}</Field>
                    <Field label="Onde entra no produto">{service.where}</Field>
                    <Field label="Custo / observação">{service.cost}</Field>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {active === 'edge' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Zap className="h-5 w-5 text-primary" />Edge Functions (Supabase)</CardTitle>
              <CardDescription>Código server-side que roda fora do navegador, usado quando é preciso a service role key ou lógica que não pode ficar exposta ao cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {edgeFunctions.map(fn => (
                <div key={fn.name} className="rounded-xl border border-border bg-input/30 p-4">
                  <Chip>{fn.name}</Chip>
                  <div className="mt-2 space-y-2">
                    <Field label="O que faz">{fn.what}</Field>
                    <Field label="Autenticação">{fn.auth}</Field>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {active === 'routes' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Route className="h-5 w-5 text-primary" />Rotas do front-end</CardTitle>
              <CardDescription>A aplicação é uma SPA: praticamente tudo é uma única página; estas são as exceções de navegação. Não confundir com API, que fica na seção própria.</CardDescription>
            </CardHeader>
            <CardContent><SimpleList items={frontendRoutes} /></CardContent>
          </Card>
        )}

        {active === 'push' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-primary" />PWA e notificações push</CardTitle>
              <CardDescription>Instalável como app e capaz de notificar mesmo com o app fechado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <EntryCard title="Service worker"><p className="text-sm text-foreground/90">Gerado pelo <Chip>vite-plugin-pwa</Chip> (estratégia Workbox <Chip>generateSW</Chip>), com cache dos assets, mais um segundo service worker (<Chip>push-sw.js</Chip>) dedicado a receber push.</p></EntryCard>
              <EntryCard title="Assinatura de push"><p className="text-sm text-foreground/90">Endpoint e chaves ficam em <Chip>push_subscriptions</Chip>. O envio real é feito pela Edge Function <Chip>send-web-push</Chip> usando o protocolo Web Push padrão, com par de chaves VAPID próprio do projeto, sem depender de Firebase/OneSignal.</p></EntryCard>
              <EntryCard title="Deduplicação"><p className="text-sm text-foreground/90"><Chip>push_notification_windows</Chip> com <Chip>claim_push_notification_window()</Chip> evita notificar a mesma pessoa várias vezes em poucos minutos, por exemplo várias mensagens seguidas viram um só push.</p></EntryCard>
            </CardContent>
          </Card>
        )}

        {active === 'business' && (
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-primary" />Planos pagos (empresa)</CardTitle>
                <CardDescription>Como o produto monetiza. Isto é o núcleo de propriedade intelectual do produto.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div key={plan.code} className="rounded-xl border border-border bg-input/30 p-4">
                    <p className="font-semibold text-foreground">{plan.name} · R$ {plan.price}/mês</p>
                    <div className="mt-2 space-y-2">
                      <Field label="Alcance">{plan.reach}</Field>
                      <Field label="Atraso pra ver procuras novas">{plan.priority}</Field>
                      <Field label="Acessos simultâneos">{plan.accesses}</Field>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-accent-agile/40 bg-accent-agile/5">
              <CardHeader><CardTitle className="text-base">Regra de visibilidade (o "algoritmo de match")</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/90">Implementada em <Chip>company_can_view_procura()</Chip>: empresa em trial ou sem assinatura ativa vê procuras do mesmo estado, sem atraso. Assinante de plano por raio vê o que estiver dentro do raio do plano, com o atraso daquele plano. Plano estadual vê o estado inteiro. Plano nacional vê o Brasil todo, mas prioriza estado, peças raras ou de alto valor, veículos antigos e procuras sem resposta positiva há 3 ou mais dias. Uma empresa que já respondeu sempre continua vendo aquela procura, independente do plano.</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-base">Trial</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/90">Liberado por CNPJ, controlado por <Chip>company_trial_registry</Chip> para não ser reaproveitado recriando cadastro. Termina no primeiro critério atingido entre 30 dias corridos ou 30 respostas, com limite duro de 90 dias.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {active === 'scripts' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Terminal className="h-5 w-5 text-primary" />Scripts operacionais</CardTitle>
              <CardDescription>Comandos npm usados para popular dados e validar que o produto continua funcionando. Rodados manualmente, não em CI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <EntryCard title="npm run audit:*"><p className="text-sm text-foreground/90">Testam de ponta a ponta contra o banco real: cadastro, login, chat, respostas, push, plano/trial, catálogo de veículos, CEP, geolocalização e acesso de colaboradores. Criam e apagam contas de teste (@example.invalid) a cada execução.</p></EntryCard>
              <EntryCard title="npm run sync:*"><p className="text-sm text-foreground/90">Importam e atualizam os catálogos de referência (veículos, peças, municípios) a partir das fontes externas listadas em Integrações. Não rodam sozinhos, precisam ser disparados manualmente quando os dados de origem mudam.</p></EntryCard>
            </CardContent>
          </Card>
        )}

        {active === 'limitations' && (
          <Card className="border-warning/40 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-warning" />Limitações conhecidas e pontos de atenção</CardTitle>
              <CardDescription>Transparência para due diligence: o que um comprador ou time técnico deve saber antes de assumir o projeto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <EntryCard title="Sem ambiente de staging"><p className="text-sm text-foreground/90">Hoje só existe o banco de produção. Mudança de schema e testes de fluxo completo acontecem direto contra dados reais. Plano de criar um segundo projeto Supabase gratuito está definido mas ainda não executado, esbarrou no limite de 2 projetos ativos por conta gratuita.</p></EntryCard>
              <EntryCard title="Painel admin sem autenticação real" badge={<span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">endpoints em produção, sem tela de login</span>}><p className="text-sm text-foreground/90">A tela /painel-interno-preview (catálogo, planos, prévia de dados) só carrega em <Chip>npm run dev</Chip> local. Mas desde que as rotas api/admin-catalog.js, api/admin-entitlements.js e api/admin-preview-data.js viraram funções serverless da Vercel, elas respondem em produção para quem souber a URL, sem login, role ou verificação de permissão nenhuma na frente. Antes de expor qualquer tela admin publicamente, essas rotas precisam de autenticação própria.</p></EntryCard>
              <EntryCard title="Sem paginação de UI"><p className="text-sm text-foreground/90">Procuras e mensagens já são limitadas por consulta (índices e <Chip>recent_messages()</Chip> por conversa), mas não há "carregar mais" nas telas. Contas muito antigas ou muito ativas eventualmente deixam de ver o histórico mais antigo.</p></EntryCard>
              <EntryCard title="Uma única região/projeto Supabase"><p className="text-sm text-foreground/90">Região sa-east-1, sem réplica ou plano de disaster recovery formal.</p></EntryCard>
              <EntryCard title="Catálogo depende de fontes públicas de terceiros"><p className="text-sm text-foreground/90">Mercado Livre e Hugging Face, sem contrato firmado. Mudança ou queda dessas fontes só afeta a sincronização manual, não o funcionamento do produto no dia a dia.</p></EntryCard>
              <EntryCard title="Cobrança recorrente não está implementada" badge={<span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">importante para due diligence</span>}>
                <p className="text-sm text-foreground/90">A tabela companies já tem colunas para Stripe (stripe_customer_id, stripe_subscription_id, stripe_price_id), mas não existe nenhuma integração com o Stripe no código hoje. Toda concessão de plano é manual, feita pelo admin na aba Planos. Ou seja, não há cobrança automatizada de assinatura funcionando no produto.</p>
              </EntryCard>
              <EntryCard title="Procura não coleta mais localização própria"><p className="text-sm text-foreground/90">O formulário de nova procura (SearchForm) removeu o seletor de cidade e o mapa: a decisão foi que o alcance geográfico é definido do lado da empresa (cidades atendidas ou raio a partir do endereço dela), não pela pessoa que procura. Consequência no banco: search_latitude, search_longitude e search_radius_km ficam sempre vazios/no valor padrão em procuras novas, e locations é preenchido automaticamente com a cidade do perfil do usuário. O matching por raio (company_can_view_procura) continua existindo no banco para procuras antigas, mas na prática toda procura nova cai no fallback por nome de cidade.</p></EntryCard>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
