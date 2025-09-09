import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseAndLogSheet, loadSheetToDuckDB, queryDuckDB, getSheetMeta, profileColumns, sheetProfileSummary } from '../lib/utils';
import * as XLSX from 'xlsx';

interface CSVUploaderProps {
  onUpload: (data: string[][]) => void;
}

export const CSVUploader = ({ onUpload }: CSVUploaderProps) => {
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Use SheetJS to parse the file robustly
    let data: ArrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    parseAndLogSheet(file); // still log for debug
    onUpload(rows);

    // Profile and summarize the sheet
    const meta = getSheetMeta(rows);
    const profiles = profileColumns(rows);
    const summary = sheetProfileSummary(meta, profiles);
    console.log('Sheet Profile Summary:', summary);

    // Send summary to backend for embedding/storage
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
      const resp = await fetch(`${backendUrl}/api/sheet-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      const result = await resp.json();
      console.log('Backend embedding response:', result);
    } catch (err) {
  
    }

    // Load into DuckDB and log a sample query
    if (rows.length > 1) {
      try {
        console.log('CSV data prepared for upload, AIAssistant will handle DuckDB loading');
        console.log('Sample data:', {
          header: rows[0],
          firstDataRow: rows[1],
          totalRows: rows.length
        });
      } catch (loadErr) {

        // Don't fail the upload if there are issues
      }
    }
  }, [onUpload]);

  return (
    <div className="p-4 border-b">
      <label htmlFor="csv-upload">
        <Button variant="outline" className="w-full text-foreground" asChild>
          <div className="cursor-pointer">
            <Upload size={16} className="mr-2 text-foreground" />
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
