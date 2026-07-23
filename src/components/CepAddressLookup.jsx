import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { geocodeAddress } from '@/lib/geocoding';

export const formatCep = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

const CepAddressLookup = ({ value, onChange, onAddressFound, required = false, inputClassName = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const lastSuccessfulCep = useRef('');

  const lookupCep = async (rawValue = value) => {
    const cep = String(rawValue || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({ title: 'CEP inválido', description: 'Informe os 8 números do CEP.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      const providers = [
        fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, { signal: controller.signal }).then(async response => {
          if (!response.ok) throw new Error('BrasilAPI indisponível');
          const result = await response.json();
          return { street: result.street, neighborhood: result.neighborhood, city: result.city, state: result.state };
        }),
        fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal }).then(async response => {
          if (!response.ok) throw new Error('ViaCEP indisponível');
          const result = await response.json();
          if (result.erro) throw new Error('CEP não encontrado');
          return { street: result.logradouro, neighborhood: result.bairro, city: result.localidade, state: result.uf };
        }),
      ];
      let address = null;
      try {
        address = await Promise.any(providers);
      } catch {
        address = null;
      }
      window.clearTimeout(timeout);
      controller.abort();
      if (!address?.city || !address?.state) {
        toast({ title: 'CEP não encontrado', description: 'Confira o número informado e tente novamente.', variant: 'destructive' });
        return;
      }

      const foundAddress = {
        addressStreet: [address.street, address.neighborhood].filter(Boolean).join(', '),
        addressCity: (address.city || '').trim(),
        addressState: (address.state || '').trim().toUpperCase(),
      };
      const coordinates = await geocodeAddress({
        cep,
        street: foundAddress.addressStreet,
        city: foundAddress.addressCity,
        state: foundAddress.addressState,
      });
      onAddressFound({ ...foundAddress, ...(coordinates || {}) });
      lastSuccessfulCep.current = cep;
      toast({ title: 'Endereço encontrado', description: `${foundAddress.addressCity}/${foundAddress.addressState} preenchida automaticamente. Complete o número e o complemento.` });
    } catch (error) {
      toast({ title: 'Não foi possível consultar o CEP', description: 'Preencha o endereço manualmente ou tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cep = String(value || '').replace(/\D/g, '');
    if (cep.length !== 8 || cep === lastSuccessfulCep.current) return undefined;
    const timer = window.setTimeout(() => { void lookupCep(cep); }, 600);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div>
      <Label htmlFor="addressCep" className="text-muted-foreground text-xs sm:text-sm font-medium mb-1 block">
        CEP{required ? ' *' : ''}
      </Label>
      <div className="relative">
        <Input
          id="addressCep"
          name="addressCep"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={value}
          onChange={(event) => onChange(formatCep(event.target.value))}
          onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
          required={required}
          className={`${inputClassName} pr-10`}
        />
        {isLoading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" aria-label="Consultando CEP" />}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">O endereço será preenchido automaticamente ao completar o CEP.</p>
    </div>
  );
};

export default CepAddressLookup;
