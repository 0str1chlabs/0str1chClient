import { QdrantClient } from '@qdrant/js-client-rest';
import { createCellSearchText, CellDocument } from './vectorDB';
import { createRowSearchText, RowDocument } from './vectorDB';
import { v4 as uuidv4 } from 'uuid';

// Qdrant client instance (adjust URL as needed)
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

// Embedding model for production
const EMBEDDING_MODEL = 'all-minilm:latest';
const VECTOR_SIZE = 384;

// Get embedding from Ollama for text
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error('Embedding request failed');
    }

    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('No embedding returned from Ollama');
    }
    if (data.embedding.length !== VECTOR_SIZE) {
      throw new Error(`Embedding vector size mismatch: expected ${VECTOR_SIZE}, got ${data.embedding.length}`);
    }
    return data.embedding;
  } catch (error) {
    console.error('Ollama embedding error:', error);
    throw error;
  }
}

/**
 * Create the Qdrant collection for production with the correct vector size and distance metric.
 * Call this before uploading real data.
 * @param collectionName Name of the collection (default: 'spreadsheet_cells')
 * @param vectorSize Size of the embedding vector (default: 768 for nomic-embed-text)
 * @param distance Distance metric (default: 'Cosine')
 */
export async function createSpreadsheetCollection(collectionName = 'spreadsheet_cells', vectorSize = VECTOR_SIZE, distance: 'Cosine' | 'Dot' | 'Euclid' = 'Cosine') {
  await qdrant.createCollection(collectionName, {
    vectors: {
      size: vectorSize,
      distance,
    },
  });
  console.log(`✅ Created collection '${collectionName}' with vector size ${vectorSize} and distance '${distance}'`);
}

// Helper for concurrency
async function mapWithConcurrency(arr, fn, concurrency = 10) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < arr.length) {
      const idx = i++;
      results[idx] = await fn(arr[idx], idx);
    }
  }
  await Promise.all(Array(concurrency).fill(0).map(worker));
  return results;
}

/**
 * Pushes cell documents to Qdrant, associating each with the user's email.
 * The unique identifier is a UUID.
 * Uploads in batches to avoid memory issues.
 */
export async function pushSheetToQdrantDB(
  cellDocs: CellDocument[],
  userEmail: string,
  collectionName = 'spreadsheet_cells'
) {
  const BATCH_SIZE = 1000;
  let total = cellDocs.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = cellDocs.slice(i, i + BATCH_SIZE);
    // Parallel embedding with concurrency limit
    const embeddings = await mapWithConcurrency(batch, async (cell) => {
      const searchText = createCellSearchText(cell);
      const embedding = await getEmbedding(searchText);
      if (embedding.length !== VECTOR_SIZE) {
        throw new Error(`Embedding vector size mismatch: expected ${VECTOR_SIZE}, got ${embedding.length}`);
      }
      return embedding;
    }, 10);
    const points = batch.map((cell, idx) => {
      const searchText = createCellSearchText(cell);
      return {
        id: uuidv4(),
        vector: embeddings[idx],
        payload: {
          ...cell,
          userEmail,
          searchText,
        },
      };
    });
    // Debug log: print the payload being sent
    console.log('Qdrant upsert payload:', JSON.stringify({ points }, null, 2));
    await qdrant.upsert(collectionName, { points });
    console.log(`✅ Uploaded batch ${i / BATCH_SIZE + 1} (${points.length} points)`);
  }
  console.log(`✅ Pushed ${cellDocs.length} cells to Qdrant for user ${userEmail}`);
}

/**
 * Pushes row documents to Qdrant, associating each with the user's email.
 * The unique identifier is a UUID.
 * Uploads in batches to avoid memory issues.
 */
export async function pushRowsToQdrantDB(
  rowDocs: RowDocument[],
  userEmail: string,
  collectionName = 'spreadsheet_rows'
) {
  const BATCH_SIZE = 1000;
  let total = rowDocs.length;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rowDocs.slice(i, i + BATCH_SIZE);
    // Sequential embedding
    const embeddings = [];
    for (const row of batch) {
      const searchText = createRowSearchText(row);
      const embedding = await getEmbedding(searchText);
      if (embedding.length !== VECTOR_SIZE) {
        throw new Error(`Embedding vector size mismatch: expected ${VECTOR_SIZE}, got ${embedding.length}`);
      }
      embeddings.push(embedding);
    }
    const points = batch.map((row, idx) => {
      const searchText = createRowSearchText(row);
      return {
        id: uuidv4(),
        vector: embeddings[idx],
        payload: {
          ...row,
          userEmail,
          searchText,
        },
      };
    });
    // Log all points being uploaded
    console.log('Uploading to Qdrant:', JSON.stringify(points, null, 2));
    await qdrant.upsert(collectionName, { points });
    console.log(`✅ Uploaded batch ${i / BATCH_SIZE + 1} (${points.length} rows)`);
  }
  console.log(`✅ Pushed ${rowDocs.length} rows to Qdrant for user ${userEmail}`);
}

/**
 * Query Qdrant for all cells belonging to a specific user (by email).
 * Returns all points for the given userEmail from the collection.
 */
export async function getUserCellsFromQdrant(userEmail: string, collectionName = 'spreadsheet_cells') {
  const result = await qdrant.scroll(collectionName, {
    filter: {
      must: [
        { key: 'userEmail', match: { value: userEmail } }
      ]
    },
    limit: 1000 // adjust as needed
  });
  return result;
}

/**
 * Query Qdrant for all points belonging to a specific user (by email).
 * Returns an array of points for the given userEmail from the collection.
 */
export async function getAllUserPoints(userEmail: string, collectionName = 'spreadsheet_cells', limit = 100) {
  const result = await qdrant.scroll(collectionName, {
    filter: {
      must: [
        { key: 'userEmail', match: { value: userEmail } }
      ]
    },
    limit
  });
  return result.points || [];
}

/**
 * Semantic search: Retrieve top-N most similar cells for a query (RAG)
 */
export async function semanticSearchQdrant(query: string, userEmail: string, topK = 5, collectionName = 'spreadsheet_cells') {
  const embedding = await getEmbedding(query);
  if (embedding.length !== VECTOR_SIZE) {
    throw new Error(`Embedding vector size mismatch: expected ${VECTOR_SIZE}, got ${embedding.length}`);
  }
  const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
  const result = await qdrant.search(collectionName, {
    vector: embedding,
    filter: {
      must: [
        { key: 'userEmail', match: { value: userEmail } }
      ]
    },
    limit: topK,
    with_payload: true,
    with_vector: false
  });
  return result;
}

/**
 * Utility: Format retrieved context for LLM prompt
 */
export function formatContextForPrompt(results: any[]): string {
  if (!results || results.length === 0) return 'No relevant spreadsheet data found.';
  return results.map((r, i) => {
    const p = r.payload;
    return `${i + 1}. Cell ${p.cellId} (${p.colHeader}, Row ${p.row}): "${p.value}" | ${p.searchText}`;
  }).join('\n');
} 