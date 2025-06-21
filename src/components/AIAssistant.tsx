import { useState } from 'react';
import { Send, BarChart3, Lightbulb, Calculator, TrendingUp, ChevronRight, ChevronLeft, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  onCreateCustom
}: AIAssistantProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      content: "✨ Welcome to your AI-powered infinite canvas! I can help you analyze data, create stunning visualizations, and perform complex calculations. What would you like to create today?"
    }
  ]);

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

  const handleCalculationSuggestion = (operation: string) => {
    onCalculate(operation);
    addMessage('user', `Calculate ${operation}`);
    addMessage('ai', 'Calculation completed! Check the notification for results.');
  };

  const addMessage = (type: 'ai' | 'user', content: string) => {
    setMessages(prev => [...prev, { type, content }]);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    addMessage('user', message);
    
    // Handle different types of AI requests
    if (message.toLowerCase().includes('sum') || message.toLowerCase().includes('average')) {
      if (!activeSheet) {
        addMessage('ai', 'No active sheet found. Please create or select a sheet first.');
        setMessage('');
        return;
      }

      let values: number[] = [];
      let result = '';
      
      const columnMatch = message.match(/\b([A-Z])\b/i);
      const column = columnMatch ? columnMatch[1].toUpperCase() : 'B';
      
      for (let i = 2; i <= 7; i++) {
        const cellValue = activeSheet.cells[`${column}${i}`]?.value;
        if (typeof cellValue === 'number') {
          values.push(cellValue);
        }
      }

      if (message.toLowerCase().includes('sum')) {
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          result = `✅ Sum of column ${column}: ${sum.toLocaleString()}`;
        } else {
          result = `❌ No numeric values found in column ${column}`;
        }
      } else if (message.toLowerCase().includes('average')) {
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          result = `✅ Average of column ${column}: ${avg.toFixed(2)}`;
        } else {
          result = `❌ No numeric values found in column ${column}`;
        }
      }
      
      addMessage('ai', result);
    } else if (message.toLowerCase().includes('chart')) {
      addMessage('ai', '📊 I can create beautiful charts! Choose from bar, line, pie, or area charts. Which style fits your data best?');
    } else {
      addMessage('ai', `🎯 I understand you want to: "${message}". Let me help you achieve that with your data!`);
    }
    
    setMessage('');
  };

  const handleSuggestion = (suggestion: string) => {
    addMessage('user', suggestion);
    addMessage('ai', `🚀 Great choice! I'll help you ${suggestion.toLowerCase()}.`);
  };

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
      </div>

      {/* Input */}
      <div className="p-6 border-t bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-neutral-800 dark:to-neutral-700 border-yellow-200 dark:border-neutral-700 sticky bottom-0">
        <div className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything about your data..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur text-neutral-900 dark:text-yellow-100 border-2 border-yellow-200 dark:border-neutral-600 rounded-xl focus:border-yellow-400 dark:focus:border-yellow-500 transition-all duration-200"
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
