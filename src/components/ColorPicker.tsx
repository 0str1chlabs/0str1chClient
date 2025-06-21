
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  children: React.ReactNode;
}

const colors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#808080', '#C0C0C0',
  '#FFA500', '#A52A2A', '#DDA0DD', '#90EE90', '#87CEEB', '#FFB6C1', '#F0E68C', '#DEB887'
];

export const ColorPicker = ({ onColorSelect, children }: ColorPickerProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 z-50">
        <div className="grid grid-cols-8 gap-2">
          {colors.map((color) => (
            <Button
              key={color}
              className="w-6 h-6 p-0 border border-slate-300"
              style={{ backgroundColor: color }}
              onClick={() => onColorSelect(color)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
