import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, LocateFixed, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { findMunicipality, nearbyMunicipalities, nearestMunicipality } from '@/lib/municipalities';

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;
const KM_PER_LATITUDE_DEGREE = 111.32;

const geometryPath = (geometry, project) => {
  if (!geometry?.coordinates) return '';
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polygons.map(polygon => polygon.map(ring => ring.map(([longitude, latitude], index) => {
    const point = project({ latitude, longitude });
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(' ') + ' Z').join(' ')).join(' ');
};

const RegionalMap = ({ center, radiusKm, showRadius, cities, municipalityMesh, stateMesh, focusMunicipalityId, onPick }) => {
  const svgRef = useRef(null);
  const [draftPoint, setDraftPoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const visibleRadiusKm = showRadius ? Math.max(Number(radiusKm) || 10, 10) * 1.35 : 35;
  const latitudeSpan = visibleRadiusKm / KM_PER_LATITUDE_DEGREE;
  const longitudeScale = Math.max(Math.cos(center.latitude * Math.PI / 180), 0.2);
  const longitudeSpan = visibleRadiusKm / (KM_PER_LATITUDE_DEGREE * longitudeScale);

  useEffect(() => {
    setDraftPoint(null);
    setIsDragging(false);
  }, [center.latitude, center.longitude, radiusKm]);

  const project = point => ({
    x: MAP_WIDTH / 2 + ((point.longitude - center.longitude) / longitudeSpan) * (MAP_WIDTH / 2),
    y: MAP_HEIGHT / 2 - ((point.latitude - center.latitude) / latitudeSpan) * (MAP_HEIGHT / 2),
  });
  const coveredMunicipalityIds = useMemo(() => new Set(cities.filter(city => city.distance <= Number(radiusKm)).map(city => String(city.id))), [cities, radiusKm]);
  const municipalityPaths = useMemo(() => (municipalityMesh?.features || []).map(feature => {
    const id = String(feature.properties?.codarea || '');
    return { id, d: geometryPath(feature.geometry, project), isFocused: id === String(focusMunicipalityId || ''), isCovered: coveredMunicipalityIds.has(id) };
  }), [municipalityMesh, focusMunicipalityId, coveredMunicipalityIds, center.latitude, center.longitude, latitudeSpan, longitudeSpan]);
  const statePath = useMemo(() => (stateMesh?.features || []).map(feature => geometryPath(feature.geometry, project)).join(' '), [stateMesh, center.latitude, center.longitude, latitudeSpan, longitudeSpan]);

  const pointFromEvent = event => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const pointer = screenPoint.matrixTransform(matrix.inverse());
    const x = Math.min(Math.max(pointer.x / MAP_WIDTH, 0), 1);
    const y = Math.min(Math.max(pointer.y / MAP_HEIGHT, 0), 1);
    return {
      latitude: center.latitude + (0.5 - y) * latitudeSpan * 2,
      longitude: center.longitude + (x - 0.5) * longitudeSpan * 2,
      source: 'manual',
    };
  };

  const markerPoint = draftPoint || center;
  const markerPosition = project(markerPoint);
  const radiusPixels = showRadius ? Math.min(MAP_WIDTH / 2, MAP_HEIGHT / 2) * (Number(radiusKm) / visibleRadiusKm) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label={`Mapa regional com raio de ${radiusKm} quilômetros`}
      className="h-full w-full touch-none select-none"
      onClick={event => {
        if (isDragging) return;
        const point = pointFromEvent(event);
        if (point) onPick(point);
      }}
      onPointerMove={event => {
        if (!isDragging) return;
        const point = pointFromEvent(event);
        if (point) setDraftPoint(point);
      }}
      onPointerUp={event => {
        if (!isDragging) return;
        const point = pointFromEvent(event) || draftPoint;
        setIsDragging(false);
        setDraftPoint(null);
        if (point) onPick(point);
      }}
      onPointerCancel={() => { setIsDragging(false); setDraftPoint(null); }}
    >
      <defs>
        <radialGradient id="procuro-map-glow">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
          <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0" />
        </radialGradient>
        <filter id="procuro-marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="hsl(var(--background))" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="hsl(var(--card))" />
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#procuro-map-glow)" />
      {statePath && <path d={statePath} fill="hsl(var(--muted))" fillOpacity="0.82" stroke="none" fillRule="evenodd" />}
      <g aria-label="Limites municipais">
        {municipalityPaths.map(({ id, d, isFocused, isCovered }) => {
          return <path
            key={id}
            d={d}
            fill={isFocused ? 'hsl(var(--primary))' : isCovered ? 'hsl(var(--accent-agile))' : 'hsl(var(--card))'}
            fillOpacity={isFocused ? 0.24 : isCovered ? 0.13 : 0.32}
            stroke={isFocused ? 'hsl(var(--primary))' : isCovered ? 'hsl(var(--accent-agile))' : 'hsl(var(--border))'}
            strokeOpacity={isFocused ? 1 : isCovered ? 0.72 : 0.58}
            strokeWidth={isFocused ? 4 : isCovered ? 2.2 : 1.4}
            fillRule="evenodd"
          />;
        })}
      </g>
      {showRadius && <circle cx={markerPosition.x} cy={markerPosition.y} r={radiusPixels} fill="hsl(var(--primary))" fillOpacity="0.14" stroke="hsl(var(--primary))" strokeWidth="4" />}
      {statePath && <path d={statePath} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.48" strokeWidth="5" fillRule="evenodd" pointerEvents="none" />}
      {cities.map((city, index) => {
        const position = project(city);
        if (position.x < 10 || position.x > MAP_WIDTH - 10 || position.y < 10 || position.y > MAP_HEIGHT - 10) return null;
        const isCovered = city.distance <= Number(radiusKm);
        const showLabel = String(city.id) === String(focusMunicipalityId || '') || (isCovered && index < 8);
        return <g key={city.id}>
          <circle cx={position.x} cy={position.y} r={isCovered ? 7 : 5} fill={isCovered ? 'hsl(var(--accent-agile))' : 'hsl(var(--muted-foreground))'} stroke="hsl(var(--card))" strokeWidth="3" />
          {showLabel && <text x={position.x} y={position.y - 14} textAnchor="middle" fill="hsl(var(--foreground))" stroke="hsl(var(--card))" strokeWidth="4" paintOrder="stroke" fontSize="17" fontWeight="750">{city.name}</text>}
        </g>;
      })}
      <g
        transform={`translate(${markerPosition.x} ${markerPosition.y})`}
        filter="url(#procuro-marker-shadow)"
        className="cursor-grab active:cursor-grabbing"
        role="button"
        aria-label="Arrastar ponto central"
        tabIndex="0"
        onClick={event => event.stopPropagation()}
        onPointerDown={event => {
          event.stopPropagation();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDraftPoint(center);
          setIsDragging(true);
        }}
      >
        <circle r="27" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="7" />
        <circle r="9" fill="hsl(var(--accent-agile))" />
      </g>
    </svg>
  );
};

const LocationMapPicker = ({
  value,
  onChange,
  city,
  state,
  municipalityId,
  lookupQuery,
  showRadius = false,
  radiusKm = 10,
  onRadiusChange,
  allowGps = false,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');
  const [municipalityMesh, setMunicipalityMesh] = useState(null);
  const [stateMesh, setStateMesh] = useState(null);
  const [isLoadingMesh, setIsLoadingMesh] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const municipality = useMemo(
    () => findMunicipality({ id: municipalityId, city, state, location: lookupQuery }),
    [municipalityId, city, state, lookupQuery],
  );
  const hasPoint = Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);
  const center = useMemo(() => hasPoint
    ? { latitude: value.latitude, longitude: value.longitude }
    : municipality
      ? { latitude: municipality.latitude, longitude: municipality.longitude }
      : null,
  [hasPoint, value?.latitude, value?.longitude, municipality]);
  const nearbyCities = useMemo(() => center ? nearbyMunicipalities(center, radiusKm, 60) : [], [center, radiusKm]);
  const meshState = useMemo(() => {
    const fromLocation = String(lookupQuery || '').split(',').at(-1)?.trim().toUpperCase();
    return String(state || fromLocation || '').toUpperCase();
  }, [state, lookupQuery]);

  useEffect(() => {
    if (!/^[A-Z]{2}$/.test(meshState)) {
      setMunicipalityMesh(null);
      setStateMesh(null);
      setIsLoadingMesh(false);
      return undefined;
    }
    const controller = new AbortController();
    setIsLoadingMesh(true);
    const nearbyStates = [...new Set([meshState, ...nearbyCities.map(item => item.state)].filter(code => /^[A-Z]{2}$/.test(code)))];
    Promise.all([
      Promise.all(nearbyStates.map(code => fetch(`/maps/${code}.geojson`, { signal: controller.signal, cache: 'force-cache' }))),
      fetch('/maps/BR-states.geojson', { signal: controller.signal, cache: 'force-cache' }),
    ])
      .then(async ([municipalResponses, stateResponse]) => {
        if (municipalResponses.some(response => !response.ok) || !stateResponse.ok) throw new Error('Malha indisponível');
        const municipalCollections = await Promise.all(municipalResponses.map(response => response.json()));
        const stateData = await stateResponse.json();
        return [{ type: 'FeatureCollection', features: municipalCollections.flatMap(collection => collection.features || []) }, stateData];
      })
      .then(([municipalData, stateData]) => { setMunicipalityMesh(municipalData); setStateMesh(stateData); })
      .catch(error => { if (error.name !== 'AbortError') { setMunicipalityMesh(null); setStateMesh(null); } })
      .finally(() => { if (!controller.signal.aborted) setIsLoadingMesh(false); });
    return () => controller.abort();
  }, [meshState, nearbyCities]);

  useEffect(() => {
    if (hasPoint || !municipality) return;
    onChangeRef.current({ latitude: municipality.latitude, longitude: municipality.longitude, source: 'city_center' });
  }, [hasPoint, municipality]);

  const useDeviceLocation = () => {
    setLocationSuccess('');
    if (!window.isSecureContext) {
      setLocationError('A localização exige uma conexão segura. Abra o site pelo endereço https://procuroprati.com.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Este aparelho não disponibilizou a localização. O centro da cidade continuará selecionado.');
      return;
    }
    setIsLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const municipalityAtLocation = nearestMunicipality(coordinates);
        onChange({ ...coordinates, source: 'gps', municipality: municipalityAtLocation });
        setLocationSuccess(municipalityAtLocation ? `Localização aplicada em ${municipalityAtLocation.name}/${municipalityAtLocation.state}.` : 'Localização aplicada.');
        setIsLocating(false);
      },
      error => {
        const message = error.code === 1
          ? 'A localização está bloqueada. Libere a permissão de localização nas configurações do navegador e tente novamente.'
          : error.code === 3
            ? 'A localização demorou para responder. Verifique se a localização do aparelho está ativada e tente novamente.'
            : 'O aparelho não conseguiu determinar sua localização. O centro da cidade continuará selecionado.';
        setLocationError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  };

  const locationLabel = value?.source === 'gps'
    ? 'Sua localização está sendo usada como centro.'
    : value?.source === 'manual'
      ? 'Ponto ajustado manualmente.'
      : value?.source === 'cep'
        ? 'O ponto do CEP cadastrado está sendo usado como referência.'
        : 'O centro da cidade está sendo usado como referência.';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/60 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label className="flex items-center gap-1 text-sm text-foreground"><MapPin className="h-4 w-4 text-primary" />{showRadius ? 'Região da procura' : 'Localização da empresa'}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{locationLabel} Toque no mapa ou arraste a marca para ajustar.</p>
        </div>
        {allowGps && (
          <Button type="button" variant="outline" size="sm" onClick={useDeviceLocation} disabled={isLocating} className="min-h-10 shrink-0">
            <LocateFixed className={`mr-2 h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
            {isLocating ? 'Localizando' : 'Usar minha localização'}
          </Button>
        )}
      </div>
      {locationError && <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-foreground" role="status">{locationError}</p>}
      {locationSuccess && <p className="rounded-md bg-accent-agile/10 px-3 py-2 text-xs font-medium text-foreground" role="status">{locationSuccess}</p>}
      {center ? (
        <div className="relative h-72 w-full overflow-hidden rounded-md border border-border bg-card">
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm"><Crosshair className="h-3.5 w-3.5 text-primary" />Mapa regional Procuro Pra Ti</div>
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-2 rounded-md bg-card/88 px-2 py-1 text-[9px] font-semibold text-muted-foreground"><span className="h-2 w-2 rounded-full bg-accent-agile" />Municípios no raio</div>
          <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-card/85 px-2 py-1 text-[9px] font-medium text-muted-foreground">Limites municipais: IBGE</div>
          {isLoadingMesh && <div className="pointer-events-none absolute inset-x-0 bottom-7 z-10 text-center text-[10px] font-semibold text-muted-foreground">Desenhando municípios...</div>}
          <RegionalMap center={center} radiusKm={radiusKm} showRadius={showRadius} cities={nearbyCities} municipalityMesh={municipalityMesh} stateMesh={stateMesh} focusMunicipalityId={municipality?.id} onPick={onChange} />
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-border bg-muted/40 px-4 text-center text-xs leading-relaxed text-muted-foreground">Selecione uma cidade para visualizar a região.</div>
      )}
      {showRadius && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Raio da procura: {radiusKm} km</Label>
          <Slider min={5} max={100} step={5} value={[radiusKm]} onValueChange={([next]) => onRadiusChange(next)} />
          <p className="text-xs text-muted-foreground">Empresas compatíveis dentro do círculo receberão a procura. O zoom acompanha o raio automaticamente.</p>
        </div>
      )}
    </div>
  );
};

export default LocationMapPicker;
