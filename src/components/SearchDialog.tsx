
import { useState } from 'react';
import { Search, X } from 'lucide-react';
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

  const handleSearch = () => {
    if (!sheet || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results = Object.entries(sheet.cells)
      .filter(([_, cell]) => 
        cell.value.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(([cellId, cell]) => ({ cellId, value: cell.value }));

    setSearchResults(results);
  };

  const handleCellClick = (cellId: string) => {
    onCellSelect(cellId);
    onClose();
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
              placeholder="Search for values..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search size={16} />
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-auto space-y-2">
              <h4 className="text-sm font-medium">Results ({searchResults.length})</h4>
              {searchResults.map(({ cellId, value }) => (
                <div
                  key={cellId}
                  className="p-2 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => handleCellClick(cellId)}
                >
                  <div className="text-sm font-medium">{cellId}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{value}</div>
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-4">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
