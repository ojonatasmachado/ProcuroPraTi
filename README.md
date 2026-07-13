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

O projeto já roda localmente sem Supabase, usando `localStorage` como fallback. Para usar Supabase de verdade:

1. Crie um projeto no Supabase.
2. Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

3. Preencha no `.env`:

```env
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

4. Aplique o schema no banco:

- No dashboard do Supabase, abra SQL Editor e cole `db/schema.sql`.
- Em seguida, abra `db/seed.sql` e rode para popular dados de exemplo.

5. Com o `.env` configurado, rode o script de seed opcional:

```bash
npm run seed:supabase
```

6. Inicie o app:

```bash
npm run dev
```

### Observações

- Se você ainda não tiver projeto Supabase, pode usar o app normalmente com `localStorage`.
- Se a seed falhar porque o banco já está vazio ou porque você não tem `SUPABASE_SERVICE_ROLE_KEY`, use o SQL do dashboard.
- `src/lib/dataService.js` já está implementado para usar Supabase quando `VITE_SUPABASE_URL` estiver definido.

## Nota

- `db/schema.sql` contém o schema inicial.
- `db/seed.sql` contém dados de exemplo.
- `src/lib/supabaseClient.js` já está preparado para usar Supabase.
