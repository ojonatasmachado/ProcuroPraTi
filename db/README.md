# Banco de dados — PPT

Arquivos:
- `schema.sql` — schema inicial (Postgres)
- `seed.sql` — dados de exemplo retirados de `src/lib/mockData.js`

Como aplicar no Supabase:

Opção 1: usar o dashboard do Supabase

1. Crie um projeto Supabase.
2. Abra SQL Editor no dashboard.
3. Cole e execute `db/schema.sql`.
4. Cole e execute `db/seed.sql`.

Opção 2: usar CLI (se você tiver Docker ou Supabase local)

1. Instale o Supabase CLI (`brew install supabase/tap/supabase`).
2. Faça `supabase login` e `supabase link --project-ref <PROJECT_REF>`.
3. Rode o SQL com a `DB_URL` do Supabase:

```bash
psql "<SUPABASE_DB_URL>" -f db/schema.sql
psql "<SUPABASE_DB_URL>" -f db/seed.sql
```

Se você não tiver Docker ou `psql` local, use o SQL Editor do dashboard.
