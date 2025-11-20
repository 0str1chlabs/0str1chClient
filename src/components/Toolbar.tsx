import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  ChevronRight,
  Settings,
  BarChart3,
  LayoutGrid,
  Table,
  Shield
} from '@/lib/icons';
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
  onShowPivotTable?: () => void;
  onShowPivotFullScreen?: () => void;
  onShowPivotModal?: () => void;
  onSanitizeData?: () => void;
  onTestFormat?: () => void;
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
  onAddSheet,
  onShowPivotTable,
  onShowPivotFullScreen,
  onShowPivotModal,
  onSanitizeData,
  onTestFormat
}: ToolbarProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [colorPalettePosition, setColorPalettePosition] = useState({ x: 0, y: 0 });
  
  // Debug color palette state
  useEffect(() => {
    console.log('🎨 Color palette state changed:', showColorPalette);
    if (showColorPalette) {
      console.log('🎨 Rendering color palette dropdown!', { showColorPalette, selectedCells });
    }
  }, [showColorPalette, selectedCells]);
  const [showTextFormat, setShowTextFormat] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [textFormatPosition, setTextFormatPosition] = useState({ x: 0, y: 0 });
  const [textColorPosition, setTextColorPosition] = useState({ x: 0, y: 0 });
  const colorPaletteRef = useRef<HTMLDivElement>(null);
  const textFormatRef = useRef<HTMLDivElement>(null);
  const textPaletteRef = useRef<HTMLDivElement>(null);
  
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

  // Text colors for text color picker
  const textColors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc', // Dark grays
    '#ffffff', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0', // Light grays
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', // Primary colors
    '#00ffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', // Secondary colors
  ];

  const getAppliedFormats = () => {
    if (!activeSheet || selectedCells.length === 0) {
      return { bold: false, italic: false, underline: false, fontSize: 12, fontFamily: 'Arial' };
    }
    
    // Check if all selected cells have the same formatting
    const formats = selectedCells.map(cellId => {
      const cell = activeSheet.cells[cellId];
      return {
        bold: cell?.style?.bold || false,
        italic: cell?.style?.italic || false,
        underline: cell?.style?.underline || false,
        fontSize: cell?.style?.fontSize || 12,
        fontFamily: cell?.style?.fontFamily || 'Arial',
      };
    });
    
    // If all cells have the same formatting, return that format
    // Otherwise, return false (mixed state)
    const allSameBold = formats.every(f => f.bold === formats[0].bold);
    const allSameItalic = formats.every(f => f.italic === formats[0].italic);
    const allSameUnderline = formats.every(f => f.underline === formats[0].underline);
    const allSameFontSize = formats.every(f => f.fontSize === formats[0].fontSize);
    const allSameFontFamily = formats.every(f => f.fontFamily === formats[0].fontFamily);
    
    return {
      bold: allSameBold ? formats[0].bold : false,
      italic: allSameItalic ? formats[0].italic : false,
      underline: allSameUnderline ? formats[0].underline : false,
      fontSize: allSameFontSize ? formats[0].fontSize : 12,
      fontFamily: allSameFontFamily ? formats[0].fontFamily : 'Arial',
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
        // Copy functionality - use the onFormat handler
        onFormat('copy');
        break;
      case 'paste':
        // Paste functionality - use the onFormat handler
        onFormat('paste');
        break;
      default:
        onFormat(action, value);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if clicking on color palette dropdown
      if (showColorPalette) {
        const colorPaletteElement = document.querySelector('[data-color-palette="true"]');
        if (colorPaletteElement && !colorPaletteElement.contains(target)) {
          setShowColorPalette(false);
        }
      }
      
      // Check if clicking on text format dropdown
      if (showTextFormat) {
        const textFormatElement = document.querySelector('[data-text-format="true"]');
        if (textFormatElement && !textFormatElement.contains(target)) {
          setShowTextFormat(false);
        }
      }
      
      // Check if clicking on text color dropdown
      if (showTextColor) {
        const textColorElement = document.querySelector('[data-text-color="true"]');
        if (textColorElement && !textColorElement.contains(target)) {
          setShowTextColor(false);
        }
      }
    };

    if (showColorPalette || showTextFormat || showTextColor) {
      // Use a small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showColorPalette, showTextFormat, showTextColor]);

  return (
    <>
      {/* Compact Toolbar */}
      <div className="toolbar flex flex-col items-center gap-1 p-2 rounded-lg bg-white/70 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm text-[13px] md:text-[14px] overflow-visible" style={{ width: 76, overflow: 'visible' }} data-toolbar="true">
        {/* Add Sheet Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 hover:bg-gray-100"
              onClick={(e) => {
                console.log('➕ Add sheet button clicked!');
                e.stopPropagation();
                onAddSheet();
              }}
              data-tour="toolbar-add-sheet"
            >
              <Plus size={16} className="text-foreground" />
            </Button>
          </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.addSheet.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.addSheet.description}</p>
            </TooltipContent>
        </Tooltip>

        {/* Pivot Table Buttons - Moved to top navbar for better accessibility */}

        {/* Undo/Redo Group */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatAction('undo');
                }}
                disabled={!canUndo}
                data-tour="toolbar-undo"
              >
                <Undo size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.undo.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.undo.description}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatAction('redo');
                }}
                disabled={!canRedo}
                data-tour="toolbar-redo"
              >
                <Redo size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.redo.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.redo.description}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator className="w-6 my-1 bg-gray-200" />

        {/* Text Formatting Group */}
        <div className="relative" ref={textFormatRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100 relative"
                onClick={(e) => {
                  console.log('📝 Text format button clicked!', { showTextFormat, selectedCells });
                  e.stopPropagation();
                  
                  // Calculate position relative to the button
                  const buttonRect = e.currentTarget.getBoundingClientRect();
                  const dropdownWidth = 120; // Approximate dropdown width
                  const dropdownHeight = 120; // Approximate dropdown height
                  
                  const OFFSET_X = 16; // consistent comfortable offset
                  const OFFSET_Y = 16;
                  let x = buttonRect.right + OFFSET_X; // to the right of the button
                  let y = buttonRect.top - OFFSET_Y;  // slightly above the button
                  
                  // Check if dropdown would go off-screen to the right
                  if (x + dropdownWidth > window.innerWidth) {
                    x = buttonRect.left - dropdownWidth - OFFSET_X; // Show to the left instead
                  }
                  
                  // Check if dropdown would go off-screen to the top
                  if (y < 0) {
                    y = buttonRect.bottom + OFFSET_Y; // Show below the button instead
                  }
                  
                  const newPosition = { x, y };
                  setTextFormatPosition(newPosition);
                  const newState = !showTextFormat;
                  console.log('📝 Setting text format to:', newState, 'at position:', newPosition);
                  setShowTextFormat(newState);
                }}
                data-tour="toolbar-text-format"
              >
                            <Type size={16} className="text-foreground" />
            <ChevronRight size={10} className="absolute -bottom-1 -right-1 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">Text Formatting</p>
              <p className="text-xs text-muted-foreground">Bold, italic, underline</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Text Formatting Dropdown */}
          {showTextFormat && createPortal(
            <div 
              className="fixed bg-white dark:bg-gray-800 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-[9999] min-w-[120px]" 
              data-text-format="true" 
              style={{ 
                position: 'fixed',
                left: `${textFormatPosition.x}px`,
                top: `${textFormatPosition.y}px`,
                zIndex: 9999
              }}
            >
              <div className="flex flex-col gap-1">
                <Button 
                  variant={appliedFormats.bold ? "default" : "ghost"}
                  size="sm" 
                  className="w-8 h-8 p-0 hover:bg-gray-100 justify-start gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFormatAction('bold');
                    setShowTextFormat(false);
                  }}
                >
                  <Bold size={14} className={appliedFormats.bold ? "text-muted-foreground" : "text-foreground"} />
                  <span className="text-xs">Bold</span>
                </Button>
                <Button 
                  variant={appliedFormats.italic ? "default" : "ghost"}
                  size="sm" 
                  className="w-8 h-8 p-0 hover:bg-gray-100 justify-start gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFormatAction('italic');
                    setShowTextFormat(false);
                  }}
                >
                  <Italic size={14} className={appliedFormats.italic ? "text-muted-foreground" : "text-foreground"} />
                  <span className="text-xs">Italic</span>
                </Button>
                <Button 
                  variant={appliedFormats.underline ? "default" : "ghost"}
                  size="sm" 
                  className="w-8 h-8 p-0 hover:bg-gray-100 justify-start gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFormatAction('underline');
                    setShowTextFormat(false);
                  }}
                >
                  <Underline size={14} className={appliedFormats.underline ? "text-muted-foreground" : "text-foreground"} />
                  <span className="text-xs">Underline</span>
                </Button>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Font Size Selection */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 h-8">
                <Select
                  value={getAppliedFormats().fontSize?.toString() || '12'}
                  onValueChange={(value) => onFormat('font-size', value)}
                >
                  <SelectTrigger className="w-8 h-8 p-0 hover:bg-gray-100 border-0 bg-transparent">
                    <SelectValue className="text-xs" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="right" sideOffset={12} alignOffset={8}>
                    {fontSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">Font Size</p>
              <p className="text-xs text-muted-foreground">Change text size</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Font Family Selection */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 h-8">
                <Select
                  value={getAppliedFormats().fontFamily || 'Arial'}
                  onValueChange={(value) => onFormat('font-family', value)}
                >
                  <SelectTrigger className="w-8 h-8 p-0 hover:bg-gray-100 border-0 bg-transparent">
                    <SelectValue className="text-xs" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="right" sideOffset={12} alignOffset={8}>
                    {fonts.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">Font Family</p>
              <p className="text-xs text-muted-foreground">Change font type</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator className="w-6 my-1 bg-gray-200" />

        {/* Color Palette Button */}
        <div className="relative" ref={colorPaletteRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100 relative"
                onClick={(e) => {
                  console.log('🎨 Color palette button clicked!', { showColorPalette, selectedCells });
                  e.stopPropagation();
                  
                  // Calculate position relative to the button
                  const buttonRect = e.currentTarget.getBoundingClientRect();
                  const dropdownWidth = 200; // Approximate dropdown width
                  const dropdownHeight = 150; // Approximate dropdown height
                  
                  const OFFSET_X = 16;
                  const OFFSET_Y = 16;
                  let x = buttonRect.right + OFFSET_X;
                  let y = buttonRect.top - OFFSET_Y;
                  
                  // Check if dropdown would go off-screen to the right
                  if (x + dropdownWidth > window.innerWidth) {
                    x = buttonRect.left - dropdownWidth - OFFSET_X;
                  }
                  
                  // Check if dropdown would go off-screen to the top
                  if (y < 0) {
                    y = buttonRect.bottom + OFFSET_Y;
                  }
                  
                  const newPosition = { x, y };
                  
                  setColorPalettePosition(newPosition);
                  const newState = !showColorPalette;
                  console.log('🎨 Setting color palette to:', newState, 'at position:', newPosition);
                  setShowColorPalette(newState);
                }}
              >
                            <Palette size={16} className="text-foreground" />
            <ChevronRight size={10} className="absolute -bottom-1 -right-1 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">Cell Colors</p>
              <p className="text-xs text-muted-foreground">Highlight selected cells with colors</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Color Palette Dropdown */}
          {showColorPalette && createPortal(
            <div 
              className="fixed bg-white dark:bg-gray-800 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-[9999] min-w-[200px]" 
              data-color-palette="true" 
              style={{ 
                position: 'fixed',
                left: `${colorPalettePosition.x}px`,
                top: `${colorPalettePosition.y}px`,
                zIndex: 9999
              }}
            >
              <div className="text-xs text-gray-600 mb-2">Color Palette</div>
              <div className="grid grid-cols-7 gap-1 w-48">
                {highlightColors.map((color, index) => (
                  <button
                    key={index}
                    className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={(e) => {
                      console.log('🎨 Color palette clicked:', color);
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
                  className="w-full px-2 py-1 text-xs text-foreground hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormat('fill-color', 'transparent');
                    setShowColorPalette(false);
                  }}
                >
                  Clear Color
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Text Color Button */}
        <div className="relative" ref={textPaletteRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100 relative"
                onClick={(e) => {
                  console.log('🎨 Text color button clicked!', { showTextColor, selectedCells });
                  e.stopPropagation();
                  
                  // Calculate position relative to the button
                  const buttonRect = e.currentTarget.getBoundingClientRect();
                  const dropdownWidth = 200; // Approximate dropdown width
                  const dropdownHeight = 150; // Approximate dropdown height
                  
                  let x = buttonRect.right + 8; // 8px to the right of the button
                  let y = buttonRect.top - 10;  // Slightly above the button
                  
                  // Check if dropdown would go off-screen to the right
                  if (x + dropdownWidth > window.innerWidth) {
                    x = buttonRect.left - dropdownWidth - 8; // Show to the left instead
                  }
                  
                  // Check if dropdown would go off-screen to the top
                  if (y < 0) {
                    y = buttonRect.bottom + 8; // Show below the button instead
                  }
                  
                  const newPosition = { x, y };
                  setTextColorPosition(newPosition);
                  const newState = !showTextColor;
                  console.log('🎨 Setting text color to:', newState, 'at position:', newPosition);
                  setShowTextColor(newState);
                }}
                data-tour="toolbar-text-color"
              >
                <Type size={16} className="text-foreground" />
                <ChevronRight size={10} className="absolute -bottom-1 -right-1 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">Text Color</p>
              <p className="text-xs text-muted-foreground">Change text color</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Text Color Dropdown */}
          {showTextColor && createPortal(
            <div 
              className="fixed bg-white dark:bg-gray-800 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-[9999] min-w-[200px]" 
              data-text-color="true" 
              style={{ 
                position: 'fixed',
                left: `${textColorPosition.x}px`,
                top: `${textColorPosition.y}px`,
                zIndex: 9999
              }}
            >
              <div className="grid grid-cols-7 gap-1 w-48">
                {textColors.map((color, index) => (
                  <button
                    key={index}
                    className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFormat('text-color', color);
                      setShowTextColor(false);
                    }}
                    title={`Apply ${color} text color`}
                  />
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <button
                  className="w-full px-2 py-1 text-xs text-foreground hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormat('text-color', '#000000');
                    setShowTextColor(false);
                  }}
                >
                  Reset to Black
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>

        <Separator className="w-6 my-1 bg-gray-200" />

        {/* Alignment Group */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => handleFormatAction('align-left')}
                data-tour="toolbar-align-left"
              >
                <AlignLeft size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.alignLeft.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.alignLeft.description}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => handleFormatAction('align-center')}
                data-tour="toolbar-align-center"
              >
                <AlignCenter size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.alignCenter.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.alignCenter.description}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => handleFormatAction('align-right')}
                data-tour="toolbar-align-right"
              >
                <AlignRight size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.alignRight.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.alignRight.description}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator className="w-6 my-1 bg-gray-200" />

        {/* Copy/Paste Group */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => handleFormatAction('copy')}
                data-tour="toolbar-copy"
              >
                <Copy size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.copy.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.copy.description}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => handleFormatAction('paste')}
                data-tour="toolbar-paste"
              >
                <Clipboard size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.paste.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.paste.description}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Search and Functions */}
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => setShowSearch(true)}
                data-tour="toolbar-search"
              >
                <Search size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.search.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.search.description}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0 hover:bg-gray-100"
                onClick={() => handleFormatAction('functions')}
                data-tour="toolbar-functions"
              >
                <Calculator size={16} className="text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-semibold">{TOOL_DESCRIPTIONS.functions.name}</p>
              <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS.functions.description}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Pivot Table Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-8 h-8 p-0 hover:bg-gray-100"
              onClick={() => onShowPivotTable && onShowPivotTable()}
              data-tour="toolbar-pivot-table"
            >
              <Table size={16} className="text-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="font-semibold">Pivot Table</p>
            <p className="text-xs text-muted-foreground">Create interactive pivot tables for data analysis</p>
          </TooltipContent>
        </Tooltip>

              {/* Sanitize Data Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-8 h-8 p-0 hover:bg-gray-100"
                    onClick={() => onSanitizeData && onSanitizeData()}
                    data-tour="toolbar-sanitize-data"
                  >
                    <Shield size={16} className="text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-semibold">Sanitize Data</p>
                  <p className="text-xs text-muted-foreground">Highlight cells with mismatched data types in red</p>
                </TooltipContent>
              </Tooltip>

              {/* Test Format Button - Temporary for debugging */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-8 h-8 p-0 hover:bg-gray-100"
                    onClick={() => onTestFormat && onTestFormat()}
                  >
                    <span className="text-xs font-bold text-red-500">T</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-semibold">Test Format</p>
                  <p className="text-xs text-muted-foreground">Test cell formatting (temporary)</p>
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
