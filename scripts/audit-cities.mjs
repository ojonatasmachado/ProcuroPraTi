import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync('src/data/brazilianMunicipalities.json', 'utf8'));
const cityCount = catalog.reduce((total, state) => total + state.cities.length, 0);
if (catalog.length !== 27) throw new Error(`Catálogo possui ${catalog.length} estados, esperado: 27.`);
if (cityCount < 5570) throw new Error(`Catálogo municipal incompleto: ${cityCount} municípios.`);

const rioGrandeDoSul = catalog.find(state => state.value === 'RS');
if (!rioGrandeDoSul?.cities.some(city => city.value === 'Cachoeirinha')) throw new Error('Cachoeirinha/RS não foi encontrada.');

const searchForm = readFileSync('src/components/SearchForm.jsx', 'utf8');
if (!searchForm.includes('CityCombobox')) throw new Error('A procura não usa o seletor pesquisável de cidades.');
if (!searchForm.includes('currentUser?.location')) throw new Error('A procura não considera a cidade salva no perfil.');
if (!searchForm.includes('searchRadiusKm')) throw new Error('O controle de raio não está conectado à procura.');

const cepLookup = readFileSync('src/components/CepAddressLookup.jsx', 'utf8');
if (!cepLookup.includes("cep.length !== 8") || !cepLookup.includes('window.setTimeout')) throw new Error('O CEP não dispara preenchimento automático.');

console.log(JSON.stringify({ success: true, source: 'IBGE', states: catalog.length, cities: cityCount, cachoeirinhaRs: true }, null, 2));
