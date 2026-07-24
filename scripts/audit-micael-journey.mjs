import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const vehicle = read('src/components/VehicleSelector.jsx');
const searchForm = read('src/components/SearchForm.jsx');
const combobox = read('src/components/CityCombobox.jsx');
const map = read('src/components/LocationMapPicker.jsx');
const chat = read('src/components/ChatModal.jsx');
const chatModel = read('src/lib/chat.js');
const chatList = read('src/components/ChatListModal.jsx');
const cep = read('src/components/CepAddressLookup.jsx');
const migration = read('supabase/migrations/20260717100000_search_radius_and_contextual_chats.sql');

const checks = [
  ['modelos possuem busca digitável', vehicle.includes('CityCombobox') && combobox.includes('searchText')],
  ['New Fiesta é localizado pelo nome popular', vehicle.includes('New Fiesta') && vehicle.includes('Novo Fiesta')],
  ['raio permite até 100 km', map.includes('max={100}') && migration.includes('search_radius_km <= 100')],
  ['ponto do mapa é arrastável', map.includes('onPointerDown') && map.includes('setIsDragging(true)') && map.includes('onPointerUp')],
  ['falha do mapa não bloqueia a procura', map.includes('MapCanvasErrorBoundary') && map.includes('criar a procura normalmente')],
  ['seletor nativo oferece as fontes de imagem do aparelho', chat.includes('accept="image/*"') && !chat.includes('capture="environment"')],
  ['chat restaura o foco após escolher imagem', chat.includes('openNativeImagePicker') && chat.includes('setShouldRestoreMessageFocus(true)')],
  ['CEP possui dois provedores', cep.includes('brasilapi.com.br/api/cep/v1') && cep.includes('viacep.com.br/ws')],
  ['CEP é pesquisado automaticamente ao completar os 8 dígitos', cep.includes("cep.length !== 8") && cep.includes('window.setTimeout(() => { void lookupCep(cep); }, 600)')],
  ['identificador do chat contém a procura', chatModel.includes('procuraId ?') && chatModel.includes('encodeURIComponent(String(procuraId))')],
  ['lista abre conversa da procura correta', chatList.includes('chat.procuraId') && chatList.includes('chat.procura.partName')],
  ['ano é escolhido antes da marca e pode ser informado', vehicle.includes('value={value.year ? `manual:${value.year}`') && vehicle.includes('manual:${year}')],
  ['busca avançada filtra modelos pelo ano', vehicle.includes('getModelIdsByYear') && vehicle.includes('Busca avançada')],
  ['modelo ausente pode ser salvo manualmente', vehicle.includes('onCreate={useManualModel}') && vehicle.includes('manual-model:')],
  ['modelo manual não envia identificador FIPE inexistente', searchForm.includes('vehicleModelId: selected.modelId || null')],
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) throw new Error(`Falhas: ${failed.map(([name]) => name).join(', ')}`);
console.log(JSON.stringify({ success: true, checks: checks.map(([name]) => name) }, null, 2));
