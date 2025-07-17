import { createSpreadsheetCollection } from '../src/lib/qdrant';

(async () => {
  // Use vector size 384 for nomic-embed-text or all-minilm:l6-v2 
  await createSpreadsheetCollection('spreadsheet_cells', 384, 'Cosine');
  console.log('✅ Qdrant collection created!');
})(); 