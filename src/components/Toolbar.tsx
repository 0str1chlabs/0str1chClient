import { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Undo,
  Redo,
  Plus,
  Minus,
  Copy,
  Clipboard,
  Search,
  Printer,
  Download,
  MoreHorizontal,
  Type,
  Palette,
  Calculator,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchDialog } from './SearchDialog';
import { ColorPicker } from './ColorPicker';
import { SheetData } from '@/types/spreadsheet';

interface ToolbarProps {
  onFormat: (action: string, value?: string) => void;
  selectedCells?: string[];
  activeSheet?: SheetData;
  onCellSelect?: (cellId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const Toolbar = ({ 
  onFormat, 
  selectedCells = [], 
  activeSheet, 
  onCellSelect, 
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: ToolbarProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32'];
  const fonts = ['Arial', 'Roboto', 'Times New Roman', 'Helvetica', 'Georgia', 'Courier New'];

  const getAppliedFormats = () => {
    if (!activeSheet || selectedCells.length === 0) return {};
    const firstCell = activeSheet.cells[selectedCells[0]];
    return {
      bold: firstCell?.style?.bold || false,
      italic: firstCell?.style?.italic || false,
      underline: firstCell?.style?.underline || false,
    };
  };

  const appliedFormats = getAppliedFormats();

  const handleFormatAction = (action: string, value?: string) => {
    console.log(`Formatting ${selectedCells.length} cells with action: ${action}`, value);
    
    switch (action) {
      case 'undo':
        onUndo?.();
        break;
      case 'redo':
        onRedo?.();
        break;
      case 'print':
        window.print();
        break;
      case 'bold':
        onFormat('bold-toggle', (!appliedFormats.bold).toString());
        break;
      case 'italic':
        onFormat('italic-toggle', (!appliedFormats.italic).toString());
        break;
      case 'underline':
        onFormat('underline-toggle', (!appliedFormats.underline).toString());
        break;
      case 'copy':
        // Copy functionality
        if (selectedCells.length > 0 && activeSheet) {
          const cellData = selectedCells.map(cellId => ({
            cellId,
            value: activeSheet.cells[cellId]?.value || ''
          }));
          navigator.clipboard.writeText(JSON.stringify(cellData));
        }
        break;
      case 'paste':
        // Paste functionality would need more complex implementation
        console.log('Paste functionality needs implementation');
        break;
      default:
        onFormat(action, value);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const newZoom = direction === 'in' ? Math.min(zoom + 10, 200) : Math.max(zoom - 10, 50);
    setZoom(newZoom);
    handleFormatAction('zoom', newZoom.toString());
  };

  return (
    <>
      {/* Left Sidebar Toolbar */}
      <div className="fixed left-0 top-16 bottom-0 w-16 bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-neutral-800 dark:to-black border-r border-yellow-200 dark:border-neutral-700 z-40 flex flex-col items-center py-4 gap-2">
        {/* File Actions */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('undo')}
          disabled={!canUndo}
        >
          <Undo size={16} className="text-black dark:text-yellow-400" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('redo')}
          disabled={!canRedo}
        >
          <Redo size={16} className="text-black dark:text-yellow-400" />
        </Button>

        <Separator className="w-8 bg-yellow-300 dark:bg-neutral-600" />

        {/* Text Formatting */}
        <Button 
          variant={appliedFormats.bold ? "default" : "ghost"}
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('bold')}
        >
          <Bold size={16} className={appliedFormats.bold ? "text-gray-500" : "text-black dark:text-yellow-400"} />
        </Button>
        
        <Button 
          variant={appliedFormats.italic ? "default" : "ghost"}
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('italic')}
        >
          <Italic size={16} className={appliedFormats.italic ? "text-gray-500" : "text-black dark:text-yellow-400"} />
        </Button>
        
        <Button 
          variant={appliedFormats.underline ? "default" : "ghost"}
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('underline')}
        >
          <Underline size={16} className={appliedFormats.underline ? "text-gray-500" : "text-black dark:text-yellow-400"} />
        </Button>

        <Separator className="w-8 bg-yellow-300 dark:bg-neutral-600" />

        {/* Alignment */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('align-left')}
        >
          <AlignLeft size={16} className="text-black dark:text-yellow-400" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('align-center')}
        >
          <AlignCenter size={16} className="text-black dark:text-yellow-400" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('align-right')}
        >
          <AlignRight size={16} className="text-black dark:text-yellow-400" />
        </Button>

        <Separator className="w-8 bg-yellow-300 dark:bg-neutral-600" />

        {/* Functions */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('functions')}
        >
          <Calculator size={16} className="text-black dark:text-yellow-400" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => setShowSearch(true)}
        >
          <Search size={16} className="text-black dark:text-yellow-400" />
        </Button>

        {/* Copy/Paste */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('copy')}
        >
          <Copy size={16} className="text-black dark:text-yellow-400" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleFormatAction('paste')}
        >
          <Clipboard size={16} className="text-black dark:text-yellow-400" />
        </Button>

        <Separator className="w-8 bg-yellow-300 dark:bg-neutral-600" />

        {/* Zoom Controls */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleZoom('in')}
        >
          <ZoomIn size={16} className="text-black dark:text-yellow-400" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-12 h-12 p-0 hover:bg-yellow-200 dark:hover:bg-neutral-700" 
          onClick={() => handleZoom('out')}
        >
          <ZoomOut size={16} className="text-black dark:text-yellow-400" />
        </Button>
      </div>
      
      <SearchDialog
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        sheet={activeSheet}
        onCellSelect={onCellSelect || (() => {})}
      />
    </>
  );
};
