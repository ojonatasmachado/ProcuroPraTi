import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const CityCombobox = ({ id, value, onChange, options = [], placeholder = 'Selecione uma cidade', searchPlaceholder = 'Digite o nome da cidade', disabled = false, className, maxResults = 100, onCreate, createLabel }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    const matches = normalizedQuery
      ? options.filter(option => normalize(`${option.label} ${option.value} ${option.searchText || ''}`).includes(normalizedQuery))
      : options;
    return matches.slice(0, maxResults);
  }, [options, query, maxResults]);

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery(''); }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className={cn('min-h-11 w-full justify-between bg-input px-3 text-left text-sm font-normal', !selected && 'text-muted-foreground', className)}>
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center border-b border-border px-3">
          <BrandMark className="mr-2 h-4 w-4 shrink-0" />
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} autoFocus className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="max-h-[min(50dvh,320px)] overflow-y-auto p-1 overscroll-contain">
          {filteredOptions.length === 0 && !onCreate ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma opção encontrada.</p> : filteredOptions.map(option => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }} className="flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-primary/10 focus:bg-primary/15 focus:outline-none">
              <Check className={cn('mr-2 h-4 w-4 shrink-0 text-primary', value === option.value ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0">
                <span className="block">{option.label}</span>
                {option.description && <span className="block text-xs text-muted-foreground">{option.description}</span>}
              </span>
            </button>
          ))}
          {filteredOptions.length === 0 && onCreate && query && (
            <button type="button" onClick={() => { onCreate(query.trim()); setOpen(false); setQuery(''); }} className="flex min-h-12 w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/10 focus:bg-primary/15 focus:outline-none">
              <Check className="mr-2 h-4 w-4 shrink-0" />
              {typeof createLabel === 'function' ? createLabel(query.trim()) : `Usar “${query.trim()}”`}
            </button>
          )}
          {!query && options.length > maxResults && <p className="px-3 py-2 text-center text-xs text-muted-foreground">Digite o nome para pesquisar entre todas as opções.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CityCombobox;
