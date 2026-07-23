import municipalityCoordinates from '@/data/municipalityCoordinates.json';

const UF_BY_IBGE_PREFIX = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const distanceInKm = (origin, destination) => {
  const radians = degrees => degrees * Math.PI / 180;
  const deltaLat = radians(destination.latitude - origin.latitude);
  const deltaLon = radians(destination.longitude - origin.longitude);
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export const municipalities = municipalityCoordinates.map(item => ({
  ...item,
  state: UF_BY_IBGE_PREFIX[item.stateCode] || '',
}));

const byId = new Map(municipalities.map(item => [String(item.id), item]));
const byLocation = new Map(municipalities.map(item => [`${normalize(item.name)}|${item.state}`, item]));

export const findMunicipality = ({ id, city, state, location } = {}) => {
  if (id && byId.has(String(id))) return byId.get(String(id));
  const parts = String(location || '').split(',').map(part => part.trim());
  const resolvedCity = city || (parts.length > 1 ? parts.at(-2) : parts[0]) || '';
  const resolvedState = state || parts.at(-1) || '';
  return byLocation.get(`${normalize(resolvedCity)}|${String(resolvedState).toUpperCase()}`) || null;
};

export const nearbyMunicipalities = (origin, radiusKm, limit = 18) => {
  if (![origin?.latitude, origin?.longitude].every(Number.isFinite)) return [];
  const visibleRadius = Math.max(Number(radiusKm) || 10, 10) * 1.35;
  return municipalities
    .map(item => ({ ...item, distance: distanceInKm(origin, item) }))
    .filter(item => item.distance !== null && item.distance <= visibleRadius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};

export const municipalityCenter = (lookup) => {
  const municipality = findMunicipality(lookup);
  return municipality ? { latitude: municipality.latitude, longitude: municipality.longitude } : null;
};

export const nearestMunicipality = (coordinates) => {
  if (![coordinates?.latitude, coordinates?.longitude].every(Number.isFinite)) return null;
  return municipalities.reduce((nearest, municipality) => {
    const distance = distanceInKm(coordinates, municipality);
    return !nearest || distance < nearest.distance ? { ...municipality, distance } : nearest;
  }, null);
};
