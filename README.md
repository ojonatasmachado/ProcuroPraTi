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

## Nota

- `db/schema.sql` contém o schema inicial.
- `db/seed.sql` contém dados de exemplo.
- `src/lib/supabaseClient.js` já está preparado para usar Supabase.
