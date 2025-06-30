import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, BarChart3, Lightbulb, Calculator, TrendingUp, ChevronRight, ChevronLeft, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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
        // Get selected cell data
        const cellData: Record<string, any> = {};
        selectedCells.forEach(cellId => {
          const cell = activeSheet.cells[cellId];
          if (cell) {
            cellData[cellId] = cell.value;
          }
        });
        
        const { columns, sampleRows } = extractColumnsAndRows();
        const response = await fetch('http://localhost:8090/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: operation === 'sum-selected' ? 'Calculate the sum of the selected cells' : 'Calculate the average of the selected cells',
            columns, 
            sampleRows, 
            selectedCells,
            cellData
          }),
        });
        const data = await response.json();
        console.log('V AI backend response:', data); // Debug log for full AI backend response
        
        if (data && data.result !== null && data.result !== undefined) {
          const operationText = operation === 'sum-selected' ? 'Sum' : 'Average';
          addMessage('ai', `${operationText} of selected cells: ${data.result}`);
        } else {
          addMessage('ai', `❌ Could not calculate ${operation === 'sum-selected' ? 'sum' : 'average'}`);
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
    addMessage('user', message);
    setIsLoading(true);
    try {
      // Extract columns and sampleRows for the AI API
      const { columns, sampleRows } = extractColumnsAndRows();
      
      // Get selected cell data
      const cellData: Record<string, any> = {};
      if (selectedCells.length > 0 && activeSheet) {
        selectedCells.forEach(cellId => {
          const cell = activeSheet.cells[cellId];
          if (cell) {
            cellData[cellId] = cell.value;
          }
        });
      }
      
      const response = await fetch('http://localhost:8090/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          columns, 
          sheetData: {
            cells: activeSheet.cells,
            rowCount: activeSheet.rowCount,
            colCount: activeSheet.colCount
          },
          selectedCells,
          cellData
        }),
      });
      const data = await response.json();
      console.log('V AI backend response:', data); // Debug log for full AI backend response
      
      let aiText = '';
      let updatesSummary = '';
      // Debug: check updates array type and content
      let updates = data.updates;
      if (typeof updates === 'string') {
        try {
          updates = JSON.parse(updates);
        } catch (e) {
          console.error('Failed to parse updates string:', updates);
          updates = [];
        }
      }
      if (updates && Array.isArray(updates)) {
        console.log('AI updates array:', updates); // Debug: log updates array
      }
      const displayFormulaResult = typeof data.formulaResult === 'object' && data.formulaResult !== null
        ? data.formulaResult.message || data.formulaResult.value || JSON.stringify(data.formulaResult)
        : data.formulaResult;
      if (data && data.explanation) {
        aiText = data.explanation;
        if (data.formula) {
          aiText += `\n\nFormula: ${data.formula}`;
        }
        if (data.result !== null && data.result !== undefined) {
          aiText += `\n\nResult: ${data.result}`;
        }
      } else if (data && data.raw) {
        aiText = data.raw;
        if (displayFormulaResult) {
          aiText += `\n\nResult: ${displayFormulaResult}`;
        }
      } else {
        aiText = JSON.stringify(data);
      }

      // Always process updates if present
      if (updates && Array.isArray(updates)) {
        let applied = 0;
        updates.forEach((update: { cellId: string, value: string | number }) => {
          console.log('Update candidate:', update);
          if (update.cellId && update.value !== undefined) {
            console.log('Applying update from AI:', update.cellId, update.value);
            updateCell(update.cellId, update.value);
            applied++;
          } else {
            console.warn('Skipped update (missing cellId or value):', update);
          }
        });
        if (applied > 0) {
          updatesSummary = `\n\nApplied ${applied} cell update${applied > 1 ? 's' : ''} to the spreadsheet.`;
        }
        console.log('Total updates applied:', applied);
      } else {
        console.warn('No valid updates array found in AI response.');
      }

      addMessage('ai', aiText + updatesSummary);
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

  if (isMinimized) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          onClick={onToggleMinimize}
          className="rounded-l-xl rounded-r-none bg-gradient-to-r from-black to-neutral-800 hover:from-neutral-800 hover:to-neutral-900 text-yellow-100 p-4 shadow-xl transition-all duration-300 hover:scale-105"
        >
          <ChevronLeft size={24} />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-96 h-screen flex flex-col bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-l border-yellow-200/50 dark:border-neutral-700/50 fixed right-0 top-0 z-50 shadow-2xl">
      <div className="p-6 border-b bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 dark:from-neutral-900/20 dark:via-neutral-800/20 dark:to-neutral-900/20 border-yellow-200 dark:border-neutral-700 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg bg-gradient-to-r from-black to-neutral-800 dark:from-yellow-200 dark:to-yellow-100 bg-clip-text text-transparent">AI Assistant</h3>
          <p className="text-sm text-neutral-600 dark:text-yellow-400 mt-1">
            Your creative data companion
          </p>
        </div>
        <Button
          onClick={onToggleMinimize}
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-white/50 dark:hover:bg-neutral-800/50 rounded-xl"
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Main Prompts */}
      {messages.length === 1 && (
        <div className="p-6 space-y-4 border-b border-yellow-200 dark:border-neutral-700">
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-yellow-300 mb-4">Get Started</h4>
          {mainPrompts.map((prompt, index) => (
            <Card 
              key={index}
              className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg border-2 hover:border-yellow-300 dark:hover:border-yellow-600"
              onClick={prompt.action}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${prompt.bg}`}>
                    <prompt.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-neutral-800 dark:text-yellow-200">{prompt.label}</h5>
                    <p className="text-xs text-neutral-600 dark:text-yellow-400">{prompt.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-6 border-b border-yellow-200 dark:border-neutral-700">
        <h4 className="text-sm font-semibold text-neutral-700 dark:text-yellow-300 mb-4">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-yellow-100 dark:hover:from-neutral-900/20 dark:hover:to-neutral-800/20 transition-all duration-200 hover:scale-105 border-2 hover:border-yellow-300 dark:hover:border-yellow-600"
              onClick={action.action}
            >
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <action.icon size={16} />
              </div>
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-lg transition-all duration-200 hover:shadow-xl ${
              msg.type === 'user' 
                ? 'bg-gradient-to-r from-black to-neutral-800 text-yellow-100 rounded-br-md' 
                : 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-neutral-800 dark:to-neutral-700 border-2 border-yellow-200 dark:border-neutral-600 rounded-bl-md text-neutral-900 dark:text-yellow-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-2xl text-sm shadow-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-neutral-800 dark:to-neutral-700 border-2 border-yellow-200 dark:border-neutral-600 rounded-bl-md text-neutral-900 dark:text-yellow-100 animate-pulse">
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-yellow-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                processing your request
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-neutral-800 dark:to-neutral-700 border-yellow-200 dark:border-neutral-700 sticky bottom-0">
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything about your data..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 resize-none bg-white/80 dark:bg-neutral-900/80 backdrop-blur text-neutral-900 dark:text-yellow-100 border-2 border-yellow-200 dark:border-neutral-600 rounded-xl focus:border-yellow-400 dark:focus:border-yellow-500 transition-all duration-200 min-h-[40px] max-h-[200px]"
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage}
            className="bg-gradient-to-r from-black to-neutral-800 hover:from-neutral-800 hover:to-neutral-900 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};
