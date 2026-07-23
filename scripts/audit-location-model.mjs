import { readFile, readdir } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const [map, geocoding, search, dataService, admin, migration, coordinates, meshes, viteConfig] = await Promise.all([
  read('src/components/LocationMapPicker.jsx'),
  read('src/lib/geocoding.js'),
  read('src/components/SearchForm.jsx'),
  read('src/lib/dataService.js'),
  read('src/components/AdminDashboard.jsx'),
  read('supabase/migrations/20260721210000_internal_location_model.sql'),
  read('src/data/municipalityCoordinates.json').then(JSON.parse),
  readdir('public/maps'),
  read('vite.config.js'),
]);

const checks = [
  ['sem imagens externas de mapa', !map.includes('TileLayer') && !map.includes('tile.openstreetmap')],
  ['sem geocodificação pelo Nominatim', !geocoding.includes('nominatim.openstreetmap')],
  ['base nacional completa', coordinates.length >= 5570],
  ['malhas municipais de todos os estados', meshes.filter(file => /^[A-Z]{2}\.geojson$/.test(file)).length === 27],
  ['contornos estaduais de todo o Brasil', meshes.filter(file => /^[A-Z]{2}-state\.geojson$/.test(file)).length === 27],
  ['malha nacional de estados', meshes.includes('BR-states.geojson') && map.includes("fetch('/maps/BR-states.geojson'")],
  ['contornos municipais visíveis', map.includes('Limites municipais: IBGE') && map.includes('geometryPath')],
  ['malhas carregadas somente quando necessárias', map.includes('nearbyStates.map') && map.includes("fetch(`/maps/${code}.geojson`") && viteConfig.includes('municipality-meshes')],
  ['GPS opcional na procura', map.includes('Usar minha localização') && search.includes('allowGps')],
  ['fallback para o centro da cidade', map.includes("source: 'city_center'")],
  ['raio chega a 100 km', map.includes('max={100}')],
  ['origem da localização persistida', dataService.includes('searchLocationSource') && dataService.includes('locationSource')],
  ['municípios persistidos no Supabase', migration.includes('CREATE TABLE IF NOT EXISTS public.municipalities')],
  ['saúde da localização compacta no admin', admin.includes('Saúde da localização') && admin.includes('showLocationHealth')],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error(JSON.stringify({ success: false, failed: failed.map(([name]) => name) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ success: true, checks: checks.map(([name]) => name), municipalities: coordinates.length }, null, 2));
