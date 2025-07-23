import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

// Qdrant client instance (adjust URL as needed)
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

// Embedding model for production
const EMBEDDING_MODEL = 'all-minilm:latest';
const VECTOR_SIZE = 384;

// Get embedding from Ollama for text
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    console.log('[Qdrant] Requesting embedding for text:', text);
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
    console.log('[Qdrant] Received embedding of length:', data.embedding.length);
    return data.embedding;
  } catch (error) {
    console.error('Ollama embedding error:', error);
    throw error;
  }
}

/**
 * Create the Qdrant collection for production with the correct vector size and distance metric.
 * Call this before uploading real data.
 * @param collectionName Name of the collection (default: 'sheet_row')
 * @param vectorSize Size of the embedding vector (default: 384 for all-minilm)
 * @param distance Distance metric (default: 'Cosine')
 */
export async function createSheetProfileCollection(collectionName = 'sheet_row', vectorSize = VECTOR_SIZE, distance: 'Cosine' | 'Dot' | 'Euclid' = 'Cosine') {
  await qdrant.createCollection(collectionName, {
    vectors: {
      size: vectorSize,
      distance,
    },
  });
  console.log(`✅ Created collection '${collectionName}' with vector size ${vectorSize} and distance '${distance}'`);
} 