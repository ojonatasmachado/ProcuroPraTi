import { mkdir, writeFile } from 'node:fs/promises';

const apiBase = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const getJson = async (path) => {
  const response = await fetch(`${apiBase}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`IBGE respondeu ${response.status} para ${path}`);
  return response.json();
};

const states = await getJson('/estados?orderBy=nome');
const catalog = await Promise.all(states.map(async (state) => {
  const cities = await getJson(`/estados/${state.sigla}/municipios?orderBy=nome`);
  return {
    value: state.sigla,
    label: state.nome,
    cities: cities.map(city => ({ id: String(city.id), value: city.nome, label: city.nome })),
  };
}));

catalog.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
await mkdir('src/data', { recursive: true });
await writeFile('src/data/brazilianMunicipalities.json', `${JSON.stringify(catalog)}\n`);

const cityCount = catalog.reduce((total, state) => total + state.cities.length, 0);
console.log(JSON.stringify({ source: 'IBGE API de Localidades', states: catalog.length, cities: cityCount }, null, 2));
