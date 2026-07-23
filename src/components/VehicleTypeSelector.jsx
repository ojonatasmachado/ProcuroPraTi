import React from 'react';
import { Bike, Bus, Car, Check, Truck } from 'lucide-react';

const OPTIONS = [
  { value: 'car', label: 'Carros', icon: Car },
  { value: 'motorcycle', label: 'Motos', icon: Bike },
  { value: 'truck', label: 'Caminhões', icon: Truck },
  { value: 'bus', label: 'Ônibus', icon: Bus },
];

const VehicleTypeSelector = ({ value = [], onChange, idPrefix = 'vehicle-types' }) => {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (vehicleType) => {
    onChange(selected.includes(vehicleType)
      ? selected.filter(item => item !== vehicleType)
      : [...selected, vehicleType]);
  };

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipos de veículos atendidos">
      {OPTIONS.map(({ value: vehicleType, label, icon: Icon }) => {
        const isSelected = selected.includes(vehicleType);
        return (
          <button
            key={vehicleType}
            id={`${idPrefix}-${vehicleType}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(vehicleType)}
            className={`relative flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-popover text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${isSelected ? 'text-primary' : ''}`} />
            <span>{label}</span>
            {isSelected && <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span>}
          </button>
        );
      })}
    </div>
  );
};

export default VehicleTypeSelector;
