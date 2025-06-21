
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetData } from '@/types/spreadsheet';

interface SheetTabsProps {
  sheets: SheetData[];
  activeSheetId: string;
  setActiveSheet: (id: string) => void;
  removeSheet: (id: string) => void;
}

export const SheetTabs = ({ sheets, activeSheetId, setActiveSheet, removeSheet }: SheetTabsProps) => {
  return (
    <div className="h-10 border-b bg-muted/30 flex items-center px-2 gap-1">
      {sheets.map((sheet) => (
        <div
          key={sheet.id}
          className={`
            flex items-center gap-2 px-3 py-1 rounded-t-md cursor-pointer
            transition-colors hover:bg-muted/60 min-w-0 max-w-40
            ${activeSheetId === sheet.id 
              ? 'bg-background border border-b-0 text-foreground' 
              : 'text-muted-foreground'
            }
          `}
          onClick={() => setActiveSheet(sheet.id)}
        >
          <span className="truncate text-sm">{sheet.name}</span>
          {sheets.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 hover:bg-destructive/20"
              onClick={(e) => {
                e.stopPropagation();
                removeSheet(sheet.id);
              }}
            >
              <X size={12} />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
