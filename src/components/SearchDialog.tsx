
import { useState, useEffect, useCallback } from 'react';
import { Search, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SheetData } from '@/types/spreadsheet';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetData | undefined;
  onCellSelect: (cellId: string) => void;
}

export const SearchDialog = ({ isOpen, onClose, sheet, onCellSelect }: SearchDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ cellId: string; value: string | number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function
  const performSearch = useCallback((query: string) => {
    if (!sheet || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate a small delay for better UX (optional)
    setTimeout(() => {
      const results = Object.entries(sheet.cells)
        .filter(([_, cell]) => 
          cell.value.toString().toLowerCase().includes(query.toLowerCase())
        )
        .map(([cellId, cell]) => ({ cellId, value: cell.value }))
        .slice(0, 50); // Limit results to prevent UI lag

      setSearchResults(results);
      setIsSearching(false);
    }, 100);
  }, [sheet]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  // Manual search function (for button click)
  const handleSearch = () => {
    performSearch(searchQuery);
  };

  const handleCellClick = (cellId: string) => {
    onCellSelect(cellId);
    onClose();
  };

  // Helper function to highlight search terms
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Search in Sheet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for values... (searches as you type)"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search size={16} />
            </Button>
          </div>
          
          {/* Loading state */}
          {isSearching && (
            <div className="text-sm text-slate-500 text-center py-4">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500"></div>
                Searching...
              </div>
            </div>
          )}

          {/* Results */}
          {!isSearching && searchResults.length > 0 && (
            <div className="max-h-60 overflow-auto space-y-2">
              <h4 className="text-sm font-medium">Results ({searchResults.length})</h4>
              {searchResults.map(({ cellId, value }) => (
                <div
                  key={cellId}
                  className="p-2 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => handleCellClick(cellId)}
                >
                  <div className="text-sm font-medium">{cellId}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {highlightSearchTerm(value.toString(), searchQuery)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* No results */}
          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-4">
              No results found for "{searchQuery}"
            </div>
          )}

          {/* Initial state */}
          {!isSearching && !searchQuery && (
            <div className="text-sm text-slate-500 text-center py-4">
              Start typing to search for values in the sheet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
