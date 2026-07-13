# ProcuroPraTi

## Como rodar localmente

1. Instale dependências:
```bash
npm install
```

2. Crie um arquivo `.env` a partir do `.env.example`:
```bash
cp .env.example .env
```

3. Execute em modo dev:
```bash
npm run dev
```

## Supabase

O projeto atualmente usa `localStorage` para dados mock. Para usar Supabase:

1. Crie um projeto no Supabase.
2. Atualize `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Configure o banco com `db/schema.sql` e `db/seed.sql`.
4. Implemente a lógica de API em `src/lib/supabaseClient.js` e troque o salvamento de `localStorage` para chamadas Supabase.
5. Para popular o banco com os dados mock (via Node + Supabase), crie um arquivo `.env` com `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (ou `VITE_SUPABASE_ANON_KEY` para testes). Em seguida rode:

```bash
node scripts/seed-supabase.mjs
```

Observação: o script usa as funções de geração em `src/lib/mockData.js` e insere registros via `@supabase/supabase-js`.

## Nota

- `db/schema.sql` contém o schema inicial.
- `db/seed.sql` contém dados de exemplo.
- `src/lib/supabaseClient.js` já está preparado para usar Supabase.
