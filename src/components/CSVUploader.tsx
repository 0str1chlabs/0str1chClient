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
      const resp = await fetch('/api/sheet-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      const result = await resp.json();
      console.log('Backend embedding response:', result);
    } catch (err) {
      console.error('Error sending profile summary to backend:', err);
    }

    // Load into DuckDB and log a sample query
    if (rows.length > 1) {
      await loadSheetToDuckDB('Sheet1', rows);
      try {
        const colB = rows[0][1];
        const result = await queryDuckDB(`SELECT "${colB}" FROM "Sheet1" LIMIT 1`);
        const firstBValue = result.length > 0 ? result[0][colB] : undefined;
        console.log('First value in column B:', firstBValue);
      } catch (err) {
        console.error('DuckDB query error:', err);
      }
    }
  }, [onUpload]);

  return (
    <div className="p-4 border-b">
      <label htmlFor="csv-upload">
        <Button variant="outline" className="w-full border-[1.5px] border-[hsl(205.91,68.04%,61.96%)]" asChild>
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
