import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const outputDirectory = resolve('public/maps');
await mkdir(outputDirectory, { recursive: true });
const brazilStateFeatures = [];

for (const state of states) {
  const baseUrl = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${state}?formato=application/vnd.geo+json&qualidade=minima`;
  const [municipalResponse, stateResponse] = await Promise.all([
    fetch(`${baseUrl}&intrarregiao=municipio`, { headers: { Accept: 'application/json' } }),
    fetch(baseUrl, { headers: { Accept: 'application/json' } }),
  ]);
  if (!municipalResponse.ok || !stateResponse.ok) throw new Error(`Falha ao baixar a malha de ${state}.`);
  const [municipalGeojson, stateGeojson] = await Promise.all([municipalResponse.json(), stateResponse.json()]);
  brazilStateFeatures.push(...(stateGeojson.features || []).map(feature => ({
    ...feature,
    properties: { ...(feature.properties || {}), sigla: state },
  })));
  await Promise.all([
    writeFile(resolve(outputDirectory, `${state}.geojson`), JSON.stringify(municipalGeojson), 'utf8'),
    writeFile(resolve(outputDirectory, `${state}-state.geojson`), JSON.stringify(stateGeojson), 'utf8'),
  ]);
  console.log(`${state}: ${municipalGeojson.features?.length || 0} municípios`);
}

await writeFile(resolve(outputDirectory, 'BR-states.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: brazilStateFeatures,
}), 'utf8');
console.log(`Brasil: ${brazilStateFeatures.length} estados`);
