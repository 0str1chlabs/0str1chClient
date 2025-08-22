import { useCallback, useRef, useEffect } from 'react';
import { updateCellInDuckDB, batchUpdateCellsInDuckDB } from '../lib/utils';

interface DuckDBUpdateHook {
  updateCell: (cellId: string, value: string | number) => Promise<void>;
  batchUpdateCells: (updates: { cellId: string, value: string | number }[]) => Promise<void>;
  isUpdating: boolean;
}

export const useDuckDBUpdates = (): DuckDBUpdateHook => {
  const updateQueue = useRef<{ cellId: string, value: string | number }[]>([]);
  const isUpdating = useRef(false);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Process the update queue
  const processUpdateQueue = useCallback(async () => {
    if (isUpdating.current || updateQueue.current.length === 0) return;

    isUpdating.current = true;
    const updates = [...updateQueue.current];
    updateQueue.current = [];

    try {
      if (updates.length === 1) {
        // Single cell update
        const { cellId, value } = updates[0];
        await updateCellInDuckDB(cellId, value);
      } else {
        // Batch update for multiple cells
        await batchUpdateCellsInDuckDB(updates);
      }
    } catch (error) {
      console.error('Error processing DuckDB updates:', error);
      // Re-queue failed updates
      updateQueue.current.unshift(...updates);
    } finally {
      isUpdating.current = false;
      
      // Process any new updates that came in while we were processing
      if (updateQueue.current.length > 0) {
        // Small delay to prevent rapid-fire updates
        setTimeout(() => processUpdateQueue(), 50);
      }
    }
  }, []);

  // Add cell to update queue
  const updateCell = useCallback(async (cellId: string, value: string | number) => {
    // Add to queue
    updateQueue.current.push({ cellId, value });

    // Clear existing timeout
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    // Set new timeout to batch updates
    updateTimeout.current = setTimeout(() => {
      processUpdateQueue();
    }, 100); // 100ms delay to batch multiple rapid updates
  }, [processUpdateQueue]);

  // Batch update multiple cells
  const batchUpdateCells = useCallback(async (updates: { cellId: string, value: string | number }[]) => {
    // Add all updates to queue
    updateQueue.current.push(...updates);

    // Clear existing timeout
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }

    // Process immediately for batch updates
    processUpdateQueue();
  }, [processUpdateQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, []);

  return {
    updateCell,
    batchUpdateCells,
    isUpdating: isUpdating.current,
  };
};
