
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const AutocompleteInput = ({ id, placeholder, value, onChange, onSelect, suggestions, className, disabled }) => {
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
    if (newValue.length > 0 && suggestions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };
  
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    onSelect(suggestion);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur(); 
    }
  };

  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => a.localeCompare(b));
  }, [suggestions]);

  const filteredSuggestions = sortedSuggestions.filter(s => 
    s.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  const shouldShowPopover = isOpen && filteredSuggestions.length > 0;

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
            onFocus={() => {
              if (inputValue.length === 0 || filteredSuggestions.length > 0) setIsOpen(true);
            }}
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
              {filteredSuggestions.length === 0 && inputValue.length > 0 && <CommandEmpty>Nenhuma sugestão encontrada.</CommandEmpty>}
              <CommandGroup>
                {filteredSuggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion}-${index}`}
                    value={suggestion}
                    onSelect={() => handleSuggestionClick(suggestion)}
                    className="cursor-pointer hover:!bg-accent/20 aria-selected:!bg-accent/30"
                  >
                    {suggestion}
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
