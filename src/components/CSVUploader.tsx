
import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CSVUploaderProps {
  onUpload: (data: string[][]) => void;
}

export const CSVUploader = ({ onUpload }: CSVUploaderProps) => {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => 
        row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      );
      onUpload(rows.filter(row => row.some(cell => cell.length > 0)));
    };
    reader.readAsText(file);
  }, [onUpload]);

  return (
    <div className="p-4 border-b">
      <label htmlFor="csv-upload">
        <Button variant="outline" className="w-full" asChild>
          <div className="cursor-pointer">
            <Upload size={16} className="mr-2" />
            Upload CSV
          </div>
        </Button>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
    </div>
  );
};
