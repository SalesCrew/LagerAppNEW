import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, X } from 'lucide-react';
import SearchResults from './SearchResults';
import { useSearch } from '@/hooks/useSearch';
import { SearchResult } from '@/lib/api/search';
import { CommandList, CommandInput, CommandGroup, CommandItem, CommandDialog } from './ui/command';

export default function SearchBar() {
  const router = useRouter();
  const { query, setQuery, results, loading, clearSearch } = useSearch();
  const [showResults, setShowResults] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle clicks outside the search component to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open command dialog
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandDialog(true);
      }
      
      // Escape to close results
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
  };

  const handleInputFocus = () => {
    setShowResults(true);
  };

  const handleClearSearch = () => {
    clearSearch();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    console.log('Search result clicked:', result);
    setShowResults(false);
    
    // Navigate based on result type
    switch (result.type) {
      case 'brand':
        router.push(`/inventory?brandId=${result.id}`);
        break;
      case 'item':
        const brandId = result.additionalInfo?.brandId;
        if (brandId) {
          router.push(`/inventory?brandId=${brandId}&itemId=${result.id}`);
        }
        break;
      case 'promoter':
        router.push(`/inventory?promoterId=${result.id}`);
        break;
      case 'transaction':
        router.push(`/transactions?transactionId=${result.id}`);
        break;
      default:
        console.warn('Unknown result type:', result.type);
    }
    
    clearSearch();
  };

  return (
    <>
      <div ref={searchRef} className="relative w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Suche nach Marken, Artikeln, Promotoren..."
            className="w-full pl-10 pr-9 h-9 rounded-md focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 focus:outline-none focus-visible:outline-none"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        {showResults && (
          <SearchResults
            results={results}
            onResultClick={handleResultClick}
            loading={loading}
            query={query}
          />
        )}
      </div>

      <CommandDialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
        <CommandInput
          placeholder="Suche nach Marken, Artikeln, Promotoren..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandGroup heading="Marken">
            {results.brands.map((brand) => (
              <CommandItem
                key={brand.id}
                onSelect={() => {
                  handleResultClick(brand);
                  setShowCommandDialog(false);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>{brand.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Artikel">
            {results.items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  handleResultClick(item);
                  setShowCommandDialog(false);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
                {item.description && <span className="ml-2 text-gray-500 text-xs">{item.description}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Promotoren">
            {results.promoters.map((promoter) => (
              <CommandItem
                key={promoter.id}
                onSelect={() => {
                  handleResultClick(promoter);
                  setShowCommandDialog(false);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                <span>{promoter.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}