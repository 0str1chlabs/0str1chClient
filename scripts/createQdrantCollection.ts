import { createSpreadsheetCollection } from '../src/lib/qdrant';

(async () => {
  // For testing, use vector size 3. For production, use your real embedding size (e.g., 1536).
  await createSpreadsheetCollection('spreadsheet_cells', 384, 'Cosine');
})(); 