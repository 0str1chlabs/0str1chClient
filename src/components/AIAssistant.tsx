import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, BarChart3, Lightbulb, Calculator, TrendingUp, ChevronRight, ChevronLeft, Upload, Sparkles, Move, X, Wand2, FileUp, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Resizable } from './Resizable';

interface Message {
  type: 'ai' | 'user';
  content: string;
}

interface AIAssistantProps {
  onGenerateChart: (type: 'bar' | 'line' | 'pie' | 'area') => void;
  onCalculate: (operation: string) => void;
  activeSheet: any;
  selectedCells: string[];
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onUploadCSV: () => void;
  onCreateCustom: () => void;
  updateCell: (cellId: string, value: string | number) => void;
}

// 🔒 Chatbot integration — do not modify. Has access to sheet data for AI actions and summaries.
export const AIAssistant = ({ 
  onGenerateChart, 
  onCalculate, 
  activeSheet, 
  selectedCells, 
  isMinimized, 
  onToggleMinimize,
  onUploadCSV,
  onCreateCustom,
  updateCell
}: AIAssistantProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      content: "✨ Welcome to your AI-powered infinite canvas! I can help you analyze data, create stunning visualizations, and perform complex calculations. What would you like to create today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ x: 200, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [selectedModel, setSelectedModel] = useState('0str1ch 1.0');
  const [minimized, setMinimized] = useState(isMinimized);
  const [isFixed, setIsFixed] = useState(true); // New state for fixed/movable mode

  const mainPrompts = [
    {
      icon: Upload,
      label: '📥 Upload CSV or Start New Sheet',
      description: 'Import your data or create a fresh spreadsheet',
      action: onUploadCSV,
      bg: 'bg-yellow-500 text-black'
    },
    {
      icon: Sparkles,
      label: '✨ Create Something Custom',
      description: 'Let me help you build exactly what you need',
      action: onCreateCustom,
      bg: 'bg-black text-yellow-400'
    }
  ];

  const quickActions = [
    {
      icon: Calculator,
      label: 'Sum Selected',
      action: () => handleCalculationSuggestion('sum-selected'),
      color: 'bg-yellow-500 text-black'
    },
    {
      icon: TrendingUp,
      label: 'Average',
      action: () => handleCalculationSuggestion('average-selected'),
      color: 'bg-black text-yellow-400'
    },
    {
      icon: BarChart3,
      label: 'Bar Chart',
      action: () => onGenerateChart('bar'),
      color: 'bg-yellow-400 text-black'
    },
    {
      icon: Lightbulb,
      label: 'Analyze',
      action: () => handleSuggestion('analyze trends'),
      color: 'bg-black text-yellow-400'
    },
  ];

  const handleCalculationSuggestion = async (operation: string) => {
    if (selectedCells.length > 0 && activeSheet) {
      setIsLoading(true);
      addMessage('user', `${operation === 'sum-selected' ? 'Sum' : 'Average'} Selected`);
      addMessage('ai', `⏳ Calculating ${operation === 'sum-selected' ? 'sum' : 'average'} of selected cells...`);
      try {
        const response = await fetch('http://localhost:8090/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: operation === 'sum-selected' ? 'Calculate the sum of the selected cells' : 'Calculate the average of the selected cells'
          }),
        });
        const data = await response.json();
        const fnString = data.function;
        let fn, result;
        try {
          // Remove code block markers if present
          let cleanFnString = fnString.trim();
          if (cleanFnString.startsWith('```')) {
            cleanFnString = cleanFnString.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
          }
          // Try to match a named function, but fallback to eval if it fails
          let match = cleanFnString.match(/^function\s+\w+\s*\(([^)]*)\)\s*{([\s\S]*)}\s*$/m);
          if (match) {
            const arg = match[1].trim();
            const body = match[2].trim();
            fn = new Function(arg, body);
          } else {
            // Fallback: try eval (may be an arrow function, anonymous, or just a function body)
            try {
              fn = eval('(' + cleanFnString + ')');
            } catch (e) {
              // As a last resort, wrap as a function body
              fn = new Function('cells', cleanFnString + '; return cells;');
            }
          }
          if (typeof fn !== 'function') throw new Error('AI did not return a function');
          // Build input array from all cells in the sheet
          const allCells = Object.keys(activeSheet.cells).map(cellId => ({
            cellId,
            value: activeSheet.cells[cellId]?.value
          }));
          result = fn(allCells);
        } catch (e) {
          addMessage('ai', `❌ Error executing AI function: ${e}`);
          setIsLoading(false);
          return;
        }
        // Show result
        if (Array.isArray(result)) {
          addMessage('ai', `Result: ${JSON.stringify(result)}`);
        } else {
          addMessage('ai', `Result: ${result}`);
        }
      } catch (err) {
        addMessage('ai', `❌ Error calculating ${operation === 'sum-selected' ? 'sum' : 'average'}`);
        console.error(err);
      }
      setIsLoading(false);
      return;
    }
    onCalculate(operation);
    addMessage('user', `Calculate ${operation}`);
  };

  const addMessage = (type: 'ai' | 'user', content: string) => {
    setMessages(prev => [...prev, { type, content }]);
  };

  const extractColumnsAndRows = () => {
    if (!activeSheet) return { columns: [], sampleRows: [] };
    const { cells, colCount, rowCount } = activeSheet;
    // Get column headers from first row (row 1)
    const columns: string[] = [];
    for (let col = 0; col < colCount; col++) {
      const colLetter = String.fromCharCode(65 + col);
      const cellId = `${colLetter}1`;
      const cell = cells[cellId];
      columns.push(cell && cell.value ? String(cell.value) : colLetter);
    }
    // Get up to 5 sample rows (excluding header)
    const sampleRows: any[][] = [];
    for (let row = 2; row <= Math.min(rowCount, 6); row++) {
      const rowArr: any[] = [];
      for (let col = 0; col < colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const cellId = `${colLetter}${row}`;
        const cell = cells[cellId];
        rowArr.push(cell && cell.value !== undefined ? cell.value : '');
      }
      sampleRows.push(rowArr);
    }
    return { columns, sampleRows };
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setMessage(''); // Clear input immediately

    const userMessage = message;
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      const { columns, sampleRows } = extractColumnsAndRows();
      const response = await fetch('http://localhost:8090/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          columns,
          sampleRows,
          selectedCells
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const fnString = data.function;
      
      addMessage('ai', `🤖 I'll help you with that! Here's what I can do:\n\n${fnString}`);

      // Execute the AI function if it returns updates
      let updates;
      try {
        // Remove code block markers if present
        let cleanFnString = fnString.trim();
        if (cleanFnString.startsWith('```')) {
          cleanFnString = cleanFnString.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        }
        
        // Try to match a named function, but fallback to eval if it fails
        let match = cleanFnString.match(/^function\s+\w+\s*\(([^)]*)\)\s*{([\s\S]*)}\s*$/m);
        let fn;
        if (match) {
          const arg = match[1].trim();
          const body = match[2].trim();
          fn = new Function(arg, body);
        } else {
          // Fallback: try eval (may be an arrow function, anonymous, or just a function body)
          try {
            fn = eval('(' + cleanFnString + ')');
          } catch (e) {
            // As a last resort, wrap as a function body
            fn = new Function('cells', cleanFnString + '; return cells;');
          }
        }
        
        if (typeof fn !== 'function') throw new Error('AI did not return a function');
        
        // Build input array from all cells in the sheet
        const allCells = Object.keys(activeSheet.cells).map(cellId => ({
          cellId,
          value: activeSheet.cells[cellId]?.value
        }));
        
        updates = fn(allCells);
      } catch (e) {
        addMessage('ai', `❌ Error executing AI function: ${e}`);
        setIsLoading(false);
        return;
      }
      // Apply updates to sheet
      if (updates && Array.isArray(updates)) {
        let applied = 0;
        updates.forEach((update: { cellId: string, value: string | number }) => {
          if (update.cellId && update.value !== undefined) {
            updateCell(update.cellId, update.value);
            applied++;
          }
        });
        addMessage('ai', `Applied ${applied} cell update${applied !== 1 ? 's' : ''} to the spreadsheet.`);
      } else {
        addMessage('ai', `AI function did not return an updates array.`);
      }
    } catch (err) {
      addMessage('ai', '❌ Error getting AI response.');
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleSuggestion = (suggestion: string) => {
    addMessage('user', suggestion);
    addMessage('ai', `🚀 Great choice! I'll help you ${suggestion.toLowerCase()}.`);
  };

  // Auto-expand textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if (isFixed) return; // Don't allow dragging when fixed
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = 'none';
  };
  const handleDrag = (e: MouseEvent) => {
    if (!dragging || isFixed) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  };
  const handleDragEnd = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };
  useEffect(() => {
    if (dragging && !isFixed) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragging, isFixed]);

  useEffect(() => { setMinimized(isMinimized); }, [isMinimized]);

  // Toggle fixed/movable mode
  const toggleFixedMode = () => {
    setIsFixed(!isFixed);
    if (!isFixed) {
      // When switching to fixed mode, reset position to right side
      setPosition({ x: window.innerWidth - 460, y: 100 });
    }
  };

  if (minimized) {
    return (
      <button
        onClick={() => { setMinimized(false); onToggleMinimize(); }}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1001,
          borderRadius: '9999px 0 0 9999px',
          background: 'white',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12), 0 1.5px 4px 0 rgba(0,0,0,0.10)',
          border: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Open AI Assistant"
      >
        <Wand2 className="h-6 w-6 text-primary" />
      </button>
    );
  }

  // Fixed position styles
  const fixedStyles = isFixed ? {
    position: 'fixed' as const,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1000,
  } : {
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    zIndex: 1000,
  };

  return (
    <div id="ai-chatbox" data-ai-chatbox className="ai-assistant" style={fixedStyles}>
      <Resizable
        initialWidth={440}
        initialHeight={650}
        minWidth={300}
        minHeight={400}
        maxWidth={800}
        maxHeight={1000}
      >
        <Card className="w-full h-full shadow-2xl flex flex-col overflow-hidden bg-background/80 backdrop-blur-sm border-[1.5px] border-[hsl(205.91,68.04%,61.96%)]">
          <div className="flex items-center justify-between p-3 border-b border-[hsl(205.91,68.04%,61.96%)] drag-handle cursor-move" onMouseDown={handleDragStart}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Wand2 className="h-5 w-5 text-primary" />
              AI Assistant
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 no-drag" 
                onClick={toggleFixedMode}
                title={isFixed ? "Make Movable" : "Fix Position"}
              >
                {isFixed ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 no-drag" onClick={() => { setMinimized(true); onToggleMinimize(); }} title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4 custom-blue-scrollbar">
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint={msg.type === 'user' ? 'person user' : 'robot'} />
                    <AvatarFallback>{msg.type === 'user' ? 'ME' : 'AI'}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-md rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.type === 'user'
                        ? 'bg-[hsl(205.91,68.04%,61.96%)] text-white'
                        : 'bg-[hsl(210,40%,96.08%)] text-gray-900'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="robot" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-3 py-2">
                    <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-[hsl(205.91,68.04%,61.96%)] space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0"><FileUp className="h-5 w-5" /></Button>
              <Input
                placeholder="Ask the AI to do something..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
                className="no-drag border-[1.5px] border-[hsl(205.91,68.04%,61.96%)] focus:ring-2 focus:ring-[hsl(205.91,68.04%,61.96%)]"
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !message.trim()} className="no-drag"><Send className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground mt-2 gap-2">
              <span>Powered by</span>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-6 text-xs w-auto border-0 bg-transparent p-1 focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 shadow-none no-drag">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0str1ch 1.0">0str1ch 1.0</SelectItem>
                  <SelectItem value="0str1ch mini">0str1ch mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </Resizable>
    </div>
  );
};

/* Add this to your global CSS or in a style tag for custom-blue-scrollbar */
/*
.custom-blue-scrollbar::-webkit-scrollbar {
  width: 8px;
  background: transparent;
}
.custom-blue-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(205.91,68.04%,61.96%);
  border-radius: 8px;
}
*/
