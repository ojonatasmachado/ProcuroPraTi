import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { formatCnpj, isValidCnpj } from '@/lib/cnpj';

const FIELD_LABELS = {
  name: 'razão social',
  phone: 'telefone',
  cep: 'CEP',
  logradouro: 'endereço',
  municipio: 'cidade',
  uf: 'estado',
};

const findMissingFields = (company) => {
  const missing = [];
  if (!(company.razao_social || company.nome_fantasia)) missing.push(FIELD_LABELS.name);
  if (!company.ddd_telefone_1) missing.push(FIELD_LABELS.phone);
  if (!company.cep) missing.push(FIELD_LABELS.cep);
  if (!company.logradouro) missing.push(FIELD_LABELS.logradouro);
  if (!company.municipio) missing.push(FIELD_LABELS.municipio);
  if (!company.uf) missing.push(FIELD_LABELS.uf);
  return missing;
};

const MAX_ATTEMPTS = 3;

const CnpjLookup = ({ value, onChange, onCompanyFound, required = false, inputClassName = '', autoFocus = false }) => {
  // idle | searching | retrying | error
  const [status, setStatus] = useState('idle');
  const [lookupError, setLookupError] = useState('');
  const lastSuccessfulCnpj = useRef('');

  const fetchCompany = async (cnpj) => {
    try {
      const primaryResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(cnpj)}`);
      if (primaryResponse.ok) return await primaryResponse.json();
    } catch {
      // segue para o provedor alternativo
    }
    try {
      const fallbackResponse = await fetch(`https://open.cnpja.com/office/${encodeURIComponent(cnpj)}`);
      if (!fallbackResponse.ok) return null;
      const fallback = await fallbackResponse.json();
      return {
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
    } catch {
      return null;
    }
  };

  const lookupCnpj = async (rawValue = value) => {
    const cnpj = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!isValidCnpj(cnpj)) {
      setStatus('idle');
      setLookupError('Confira o CNPJ informado.');
      return;
    }

    setStatus('searching');
    setLookupError('');
    let company = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !company; attempt++) {
      if (attempt > 1) setStatus('retrying');
      company = await fetchCompany(cnpj);
    }
    if (!company) {
      setStatus('error');
      setLookupError('Não localizamos essa empresa. Preencha os dados manualmente.');
      toast({ title: 'CNPJ não encontrado', description: 'Preencha os dados da empresa manualmente.', variant: 'destructive' });
      return;
    }

    setStatus('idle');
    onCompanyFound(company);
    lastSuccessfulCnpj.current = cnpj;

    const situacao = company.descricao_situacao_cadastral || 'consultada';
    const missing = findMissingFields(company);
    toast({
      title: 'Empresa encontrada',
      description: missing.length
        ? `Preenchemos o que veio da consulta, mas faltou: ${missing.join(', ')}. Complete manualmente. Situação: ${situacao}.`
        : `Razão social e endereço cadastral preenchidos automaticamente. Confira o número da empresa. Situação: ${situacao}.`,
      variant: situacao.toUpperCase() === 'ATIVA' && !missing.length ? 'default' : 'destructive',
    });
  };

  useEffect(() => {
    const cnpj = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cnpj.length < 14) {
      setStatus('idle');
      setLookupError('');
      return undefined;
    }
    if (cnpj === lastSuccessfulCnpj.current) return undefined;
    if (!isValidCnpj(cnpj)) {
      setStatus('idle');
      setLookupError('Confira o CNPJ informado.');
      return undefined;
    }
    const timer = window.setTimeout(() => { void lookupCnpj(cnpj); }, 650);
    return () => window.clearTimeout(timer);
  }, [value]);

  const isLoading = status === 'searching' || status === 'retrying';

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
          onChange={(event) => { setStatus('idle'); setLookupError(''); onChange(formatCnpj(event.target.value)); }}
          required={required}
          autoFocus={autoFocus}
          className={`${inputClassName} pr-10`}
        />
        {isLoading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Consultando CNPJ" />
          </span>
        )}
      </div>
      {isLoading ? (
        <p className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">{status === 'retrying' ? 'Não veio na primeira tentativa, buscando de novo...' : 'Buscando dados do CNPJ...'}</p>
      ) : lookupError ? (
        <p className="mt-1 text-xs font-medium text-danger" role="alert">{lookupError}</p>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">Os dados da empresa serão preenchidos automaticamente.</p>
      )}
    </div>
  );
};

export default CnpjLookup;
