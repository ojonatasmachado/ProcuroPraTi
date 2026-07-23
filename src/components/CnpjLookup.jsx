import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { formatCnpj, isValidCnpj } from '@/lib/cnpj';

const CnpjLookup = ({ value, onChange, onCompanyFound, required = false, inputClassName = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const lastSuccessfulCnpj = useRef('');

  const lookupCnpj = async (rawValue = value) => {
    const cnpj = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!isValidCnpj(cnpj)) {
      setLookupError('Confira o CNPJ informado.');
      return;
    }

    setIsLoading(true);
    setLookupError('');
    try {
      let company;
      const primaryResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(cnpj)}`);
      if (primaryResponse.ok) {
        company = await primaryResponse.json();
      } else {
        const fallbackResponse = await fetch(`https://open.cnpja.com/office/${encodeURIComponent(cnpj)}`);
        if (fallbackResponse.status === 404) {
          toast({ title: 'CNPJ não encontrado', description: 'Não localizamos esta empresa na base consultada.', variant: 'destructive' });
          return;
        }
        if (!fallbackResponse.ok) throw new Error('Falha ao consultar CNPJ');
        const fallback = await fallbackResponse.json();
        company = {
          razao_social: fallback.company?.name || '',
          nome_fantasia: fallback.alias || '',
          ddd_telefone_1: fallback.phones?.[0] ? `${fallback.phones[0].area || ''}${fallback.phones[0].number || ''}` : '',
          cep: fallback.address?.zip || '',
          logradouro: fallback.address?.street || '',
          numero: fallback.address?.number || '',
          complemento: fallback.address?.details || '',
          bairro: fallback.address?.district || '',
          municipio: typeof fallback.address?.city === 'string' ? fallback.address.city : fallback.address?.city?.name || '',
          uf: fallback.address?.state || '',
          descricao_situacao_cadastral: fallback.status?.text || 'Consultada',
        };
      }
      onCompanyFound(company);
      lastSuccessfulCnpj.current = cnpj;

      const status = company.descricao_situacao_cadastral || 'consultada';
      toast({
        title: 'Empresa encontrada',
        description: `Razão social e endereço cadastral preenchidos automaticamente. Confira o número da empresa. Situação: ${status}.`,
        variant: status.toUpperCase() === 'ATIVA' ? 'default' : 'destructive',
      });
    } catch (error) {
      setLookupError('Não foi possível consultar agora. Você pode preencher os dados manualmente.');
      toast({ title: 'Não foi possível consultar o CNPJ', description: 'Preencha os dados manualmente ou tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cnpj.length < 14) {
      setLookupError('');
      return undefined;
    }
    if (cnpj === lastSuccessfulCnpj.current) return undefined;
    if (!isValidCnpj(cnpj)) {
      setLookupError('Confira o CNPJ informado.');
      return undefined;
    }
    const timer = window.setTimeout(() => { void lookupCnpj(cnpj); }, 650);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div>
      <Label htmlFor="cnpj" className="text-muted-foreground text-xs sm:text-sm font-medium mb-1 block">CNPJ{required ? ' *' : ''}</Label>
      <div className="relative">
        <Input
          id="cnpj"
          name="cnpj"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="00.000.000/0000-00"
          value={value}
          onChange={(event) => { setLookupError(''); onChange(formatCnpj(event.target.value)); }}
          required={required}
          className={`${inputClassName} pr-10`}
        />
        {isLoading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" aria-label="Consultando CNPJ" />}
      </div>
      {lookupError ? <p className="mt-1 text-xs font-medium text-danger" role="alert">{lookupError}</p> : <p className="mt-1 text-[11px] text-muted-foreground">Os dados da empresa serão preenchidos automaticamente.</p>}
    </div>
  );
};

export default CnpjLookup;
