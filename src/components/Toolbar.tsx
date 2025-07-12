import { useState, useEffect, useRef } from 'react';
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
  ChevronDown
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
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface ToolbarProps {
  onFormat: (action: string, value?: string) => void;
  selectedCells?: string[];
  activeSheet?: SheetData;
  onCellSelect?: (cellId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAddSheet?: () => void;
}

// Tool descriptions for tooltips
const TOOL_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  addSheet: { name: 'Add Sheet', description: 'Create a new sheet.' },
  undo: { name: 'Undo', description: 'Undo the last action.' },
  redo: { name: 'Redo', description: 'Redo the last undone action.' },
  bold: { name: 'Bold', description: 'Make selected text bold.' },
  italic: { name: 'Italic', description: 'Italicize selected text.' },
  underline: { name: 'Underline', description: 'Underline selected text.' },
  alignLeft: { name: 'Align Left', description: 'Align text to the left.' },
  alignCenter: { name: 'Align Center', description: 'Center align text.' },
  alignRight: { name: 'Align Right', description: 'Align text to the right.' },
  functions: { name: 'Functions', description: 'Insert or use spreadsheet functions.' },
  search: { name: 'Search', description: 'Search in the sheet.' },
  copy: { name: 'Copy', description: 'Copy selected cells.' },
  paste: { name: 'Paste', description: 'Paste from clipboard.' },
  zoomIn: { name: 'Zoom In', description: 'Zoom in to see more detail.' },
  zoomOut: { name: 'Zoom Out', description: 'Zoom out to see more area.' },
};

export const Toolbar = ({ 
  onFormat, 
  selectedCells = [], 
  activeSheet, 
  onCellSelect, 
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onAddSheet
}: ToolbarProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const colorPaletteRef = useRef<HTMLDivElement>(null);
  
  const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32'];
  const fonts = ['Arial', 'Roboto', 'Times New Roman', 'Helvetica', 'Georgia', 'Courier New'];
  
  // Color palette for cell highlighting
  const highlightColors = [
    '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', // Yellows
    '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', // Reds
    '#dbeafe', '#93c5fd', '#3b82f6', '#2563eb', '#1d4ed8', // Blues
    '#d1fae5', '#a7f3d0', '#10b981', '#059669', '#047857', // Greens
    '#f3e8ff', '#c4b5fd', '#8b5cf6', '#7c3aed', '#6d28d9', // Purples
    '#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', // Pinks
    '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', // Grays
  ];

  const getAppliedFormats = () => {
    if (!activeSheet || selectedCells.length === 0) {
      return { bold: false, italic: false, underline: false };
    }
    
    // Check if all selected cells have the same formatting
    const formats = selectedCells.map(cellId => {
      const cell = activeSheet.cells[cellId];
      return {
        bold: cell?.style?.bold || false,
        italic: cell?.style?.italic || false,
        underline: cell?.style?.underline || false,
      };
    });
    
    // If all cells have the same formatting, return that format
    // Otherwise, return false (mixed state)
    const allSameBold = formats.every(f => f.bold === formats[0].bold);
    const allSameItalic = formats.every(f => f.italic === formats[0].italic);
    const allSameUnderline = formats.every(f => f.underline === formats[0].underline);
    
    return {
      bold: allSameBold ? formats[0].bold : false,
      italic: allSameItalic ? formats[0].italic : false,
      underline: allSameUnderline ? formats[0].underline : false,
    };
  };

  const appliedFormats = getAppliedFormats();

  const handleFormatAction = (action: string, value?: string) => {
    switch (action) {
      case 'undo':
        console.log('Undo button clicked - selectedCells:', selectedCells);
        if (selectedCells.length === 0) {
          // Show notification if no cells are selected
          toast({
            title: "No Cells Selected",
            description: "Please select a cell to perform undo operation",
            variant: "destructive",
            duration: 3000,
          });
        } else {
          console.log('Calling onUndo function');
          onUndo?.();
        }
        break;
      case 'redo':
        console.log('Redo button clicked - selectedCells:', selectedCells);
        if (selectedCells.length === 0) {
          // Show notification if no cells are selected
          toast({
            title: "No Cells Selected",
            description: "Please select a cell to perform redo operation",
            variant: "destructive",
            duration: 3000,
          });
        } else {
          console.log('Calling onRedo function');
          onRedo?.();
        }
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



  // Close color palette when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPaletteRef.current && !colorPaletteRef.current.contains(event.target as Node)) {
        setShowColorPalette(false);
      }
    };

    if (showColorPalette) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPalette]);

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar flex flex-col items-center gap-2 p-2" style={{ width: 56 }} data-toolbar="true">
        {/* Add Sheet Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                onAddSheet();
              }}
            >
              <Plus size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.addSheet.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.addSheet.description}</p>
          </TooltipContent>
        </Tooltip>
        {/* File Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                handleFormatAction('undo');
              }}
              disabled={!canUndo}
            >
              <Undo size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.undo.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.undo.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                handleFormatAction('redo');
              }}
              disabled={!canRedo}
            >
              <Redo size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.redo.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.redo.description}</p>
          </TooltipContent>
        </Tooltip>
        <Separator className="w-8 my-1 bg-gray-200" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={appliedFormats.bold ? "default" : "ghost"}
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                handleFormatAction('bold');
              }}
            >
              <Bold size={20} className={appliedFormats.bold ? "text-gray-500" : "text-neutral-800"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.bold.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.bold.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={appliedFormats.italic ? "default" : "ghost"}
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                handleFormatAction('italic');
              }}
            >
              <Italic size={20} className={appliedFormats.italic ? "text-gray-500" : "text-neutral-800"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.italic.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.italic.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={appliedFormats.underline ? "default" : "ghost"}
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                handleFormatAction('underline');
              }}
            >
              <Underline size={20} className={appliedFormats.underline ? "text-gray-500" : "text-neutral-800"} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.underline.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.underline.description}</p>
          </TooltipContent>
        </Tooltip>
        <Separator className="w-8 my-1 bg-gray-200" />
        {/* Color Palette Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100 relative"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPalette(!showColorPalette);
              }}
            >
              <Palette size={20} className="text-neutral-800" />
              <ChevronDown size={12} className="absolute -bottom-1 -right-1 text-neutral-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">Cell Colors</p>
            <p className="text-xs text-muted-foreground">Highlight selected cells with colors</p>
          </TooltipContent>
        </Tooltip>
        {/* Color Palette Dropdown */}
        {showColorPalette && (
          <div ref={colorPaletteRef} className="absolute left-16 top-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50" data-color-palette="true">
            <div className="grid grid-cols-7 gap-1 w-56">
              {highlightColors.map((color, index) => (
                <button
                  key={index}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormat('fill-color', color);
                    setShowColorPalette(false);
                  }}
                  title={`Apply ${color} background`}
                />
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                className="w-full px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onFormat('fill-color', 'transparent');
                  setShowColorPalette(false);
                }}
              >
                Clear Color
              </button>
            </div>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => handleFormatAction('align-left')}
            >
              <AlignLeft size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.alignLeft.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.alignLeft.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => handleFormatAction('align-center')}
            >
              <AlignCenter size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.alignCenter.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.alignCenter.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => handleFormatAction('align-right')}
            >
              <AlignRight size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.alignRight.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.alignRight.description}</p>
          </TooltipContent>
        </Tooltip>
        <Separator className="w-8 my-1 bg-gray-200" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => handleFormatAction('functions')}
            >
              <Calculator size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.functions.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.functions.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => setShowSearch(true)}
            >
              <Search size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.search.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.search.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => handleFormatAction('copy')}
            >
              <Copy size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.copy.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.copy.description}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-10 h-10 p-0 hover:bg-gray-100"
              onClick={() => handleFormatAction('paste')}
            >
              <Clipboard size={20} className="text-neutral-800" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{TOOL_DESCRIPTIONS.paste.name}</p>
            <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.paste.description}</p>
          </TooltipContent>
        </Tooltip>

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
