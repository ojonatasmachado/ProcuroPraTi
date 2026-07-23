import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = 'https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/csv/municipios.csv';

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Falha ao baixar municípios: ${response.status}`);

const [headerLine, ...lines] = (await response.text()).trim().split(/\r?\n/);
const headers = headerLine.split(',');
const index = Object.fromEntries(headers.map((header, position) => [header, position]));
const municipalities = lines.map(line => {
  const columns = line.split(',');
  return {
    id: columns[index.codigo_ibge],
    name: columns[index.nome],
    latitude: Number(columns[index.latitude]),
    longitude: Number(columns[index.longitude]),
    stateCode: Number(columns[index.codigo_uf]),
  };
}).filter(item => item.id && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

await writeFile(
  resolve('src/data/municipalityCoordinates.json'),
  `${JSON.stringify(municipalities)}\n`,
  'utf8',
);

if (process.argv.includes('--supabase')) {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Credenciais administrativas do Supabase não configuradas.');
  const stateByCode = {
    11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
    21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
    31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS',
    50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
  };
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  for (let start = 0; start < municipalities.length; start += 500) {
    const rows = municipalities.slice(start, start + 500).map(item => ({
      id: item.id,
      name: item.name,
      state: stateByCode[item.stateCode],
      latitude: item.latitude,
      longitude: item.longitude,
      source: 'municipios-brasileiros',
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client.from('municipalities').upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
}

console.log(JSON.stringify({ success: true, count: municipalities.length, source: SOURCE_URL }, null, 2));
