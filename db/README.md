# Banco de dados — PPT

Arquivos:
- `schema.sql` — schema inicial (Postgres)
- `seed.sql` — dados de exemplo retirados de `src/lib/mockData.js`

Como aplicar no Supabase (CLI):

1. Instale o Supabase CLI (`brew install supabase/tap/supabase`)
2. Faça `supabase login` e `supabase link --project-ref <PROJECT_REF>`
3. Rode o SQL pelo psql com a `DB_URL` do Supabase:

```bash
psql "<SUPABASE_DB_URL>" -f db/schema.sql
psql "<SUPABASE_DB_URL>" -f db/seed.sql
```

Ou cole o conteúdo em SQL Editor do dashboard do Supabase.
