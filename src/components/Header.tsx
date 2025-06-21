
import { Moon, Sun, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface HeaderProps {
  isAIMode: boolean;
  isDarkMode: boolean;
  toggleMode: () => void;
  toggleTheme: () => void;
  addSheet: () => void;
}

export const Header = ({ isAIMode, isDarkMode, toggleMode, toggleTheme, addSheet }: HeaderProps) => {
  return (
    <header className="h-14 border-b bg-background px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-primary">SheetScribe AI</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={addSheet}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          New Sheet
        </Button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Manual</span>
          <Switch checked={isAIMode} onCheckedChange={toggleMode} />
          <span className="text-sm text-muted-foreground">AI Mode</span>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  );
};
