
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ChevronDown, PenLine } from 'lucide-react';
import { matchesSearch } from '@/lib/textSearch';

const normalizeSuggestion = (suggestion) => typeof suggestion === 'string'
  ? { label: suggestion, value: suggestion, keywords: suggestion }
  : {
      label: suggestion?.label || suggestion?.value || '',
      value: suggestion?.value || suggestion?.label || '',
      keywords: suggestion?.keywords || [suggestion?.label, ...(suggestion?.aliases || [])].filter(Boolean).join(' '),
    };

const AutocompleteInput = ({ id, placeholder, value, onChange, onSelect, suggestions = [], className, disabled }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (event) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(newValue.length > 0);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.value);
    onSelect(suggestion.value);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur(); 
    }
  };

  const sortedSuggestions = useMemo(() => {
    return suggestions
      .map(normalizeSuggestion)
      .filter(suggestion => suggestion.label)
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [suggestions]);

  const filteredSuggestions = sortedSuggestions
    .filter(suggestion => matchesSearch(suggestion.keywords, inputValue))
    .slice(0, inputValue.trim() ? 100 : 50);

  const hasExactSuggestion = filteredSuggestions.some(suggestion => suggestion.value.toLowerCase() === inputValue.trim().toLowerCase());

  const shouldShowPopover = isOpen && (sortedSuggestions.length > 0 || inputValue.length > 0);

  return (
    <Popover open={shouldShowPopover} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild className="w-full">
        <div className="relative w-full">
          <Input
            id={id}
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            className={cn("w-full pr-10", className)}
            disabled={disabled}
            autoComplete="off"
          />
          <ChevronDown 
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
            onClick={() => setIsOpen(prev => !prev)}
          />
        </div>
      </PopoverTrigger>
      {shouldShowPopover && (
        <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border text-popover-foreground z-[60]" 
            side="bottom" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()} 
        >
          <Command>
            {!inputValue && <CommandInput placeholder="Digite para pesquisar..." className="border-border focus:border-primary"/>}
            <CommandList className="max-h-[200px] overflow-y-auto">
              {filteredSuggestions.length === 0 && inputValue.trim().length > 0 && (
                <CommandEmpty>Nenhuma sugestão encontrada.</CommandEmpty>
              )}
              {inputValue.trim().length > 0 && !hasExactSuggestion && (
                <CommandGroup>
                  <CommandItem
                    value={`__use-typed__${inputValue}`}
                    onSelect={() => handleSuggestionClick({ label: inputValue.trim(), value: inputValue.trim() })}
                    className="cursor-pointer gap-2 hover:!bg-primary/10 focus:!bg-primary/15 aria-selected:!bg-primary/15"
                  >
                    <PenLine className="h-4 w-4 shrink-0 text-muted-foreground" />
                    Usar "{inputValue.trim()}"
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup>
                {filteredSuggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion.value}-${index}`}
                    value={suggestion.value}
                    onSelect={() => handleSuggestionClick(suggestion)}
                    className="cursor-pointer hover:!bg-primary/10 focus:!bg-primary/15 aria-selected:!bg-primary/15"
                  >
                    {suggestion.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default AutocompleteInput;
