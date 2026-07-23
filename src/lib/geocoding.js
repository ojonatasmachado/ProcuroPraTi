const numberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asCoordinates = (latitude, longitude) => {
  const lat = numberOrNull(latitude);
  const lon = numberOrNull(longitude);
  return lat === null || lon === null ? null : { latitude: lat, longitude: lon };
};

export const geocodeCep = async (cep) => {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
    if (!response.ok) return null;
    const result = await response.json();
    const coordinates = asCoordinates(result.location?.coordinates?.latitude, result.location?.coordinates?.longitude);
    return coordinates ? { ...coordinates, source: 'cep' } : null;
  } catch {
    return null;
  }
};

export const geocodeText = async (query) => {
  const municipality = findMunicipality({ location: query });
  return municipality ? { latitude: municipality.latitude, longitude: municipality.longitude, source: 'city_center' } : null;
};

export const geocodeAddress = async ({ cep, street, city, state }) => {
  const coordinates = await geocodeCep(cep);
  if (coordinates) return coordinates;
  const municipality = findMunicipality({ city, state });
  return municipality ? { latitude: municipality.latitude, longitude: municipality.longitude, source: 'city_center' } : null;
};

export const distanceInKm = (origin, destination) => {
  if (![origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude].every(Number.isFinite)) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(destination.latitude - origin.latitude);
  const deltaLon = radians(destination.longitude - origin.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
import { findMunicipality } from '@/lib/municipalities';
