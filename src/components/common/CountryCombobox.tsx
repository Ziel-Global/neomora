import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Globe2, Search, X } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CountryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  error?: boolean;
}

export const CountryCombobox: React.FC<CountryComboboxProps> = ({
  value,
  onChange,
  placeholder = 'Select country',
  disabled = false,
  className,
  id,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((country) => country.toLowerCase().includes(q));
  }, [query]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between gap-2 rounded-md border bg-background px-3 font-normal shadow-none hover:bg-background',
            !value && 'text-muted-foreground',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear country"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange('');
                  setQuery('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[100] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border/80 p-0 shadow-xl"
        align="start"
        sideOffset={6}
        collisionPadding={16}
      >
        <Command shouldFilter={false} className="rounded-xl">
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries…"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-border/50 bg-muted/15 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {query.trim() ? 'Matches' : 'All countries'}
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {filtered.length}
              {!query.trim() ? ` / ${COUNTRIES.length}` : ''}
            </p>
          </div>

          <CommandList className="max-h-56 overflow-y-auto overscroll-contain scrollbar-thin">
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              No country matches “{query.trim()}”
            </CommandEmpty>
            <CommandGroup className="p-1.5">
              {filtered.map((country) => {
                const selected = value === country;
                return (
                  <CommandItem
                    key={country}
                    value={country}
                    onSelect={() => {
                      onChange(country);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm',
                      selected && 'bg-primary/10 text-primary aria-selected:bg-primary/10 aria-selected:text-primary',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        selected ? 'opacity-100 text-primary' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{country}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
