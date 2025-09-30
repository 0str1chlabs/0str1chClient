import { changeDetector } from '@/lib/changeDetector';

export interface AIDiffUpdate {
  cellId: string;
  value: any;
}

export interface AIDiffEntry {
  cellId: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
}

// Sheet-specific persistent log storage
let persistentAIDiffLog: { [sheetId: string]: AIDiffEntry[] } = {};

// Load existing log from localStorage on initialization
try {
  const storedLog = localStorage.getItem('sheet_specific_ai_diff');
  if (storedLog) {
    persistentAIDiffLog = JSON.parse(storedLog);
  }
} catch (error) {
  console.error('❌ Failed to load AI diff log from localStorage:', error);
  persistentAIDiffLog = {};
}

/**
 * Build a JSON-friendly diff of AI-applied updates.
 * Does not mutate state; only computes and logs the diff.
 */
export function buildAIDiff(
  updates: AIDiffUpdate[],
  getPreviousValue: (cellId: string) => any
): AIDiffEntry[] {
  if (!Array.isArray(updates)) return [];
  return updates.map((u) => ({
    cellId: u.cellId,
    previousValue: getPreviousValue ? getPreviousValue(u.cellId) : undefined,
    newValue: u.value,
    timestamp: Date.now()
  }));
}

/**
 * Saves the AI diff as a JSON array to localStorage under 'updated_sheet_values'.
 * Maintains a persistent log that accumulates all changes over time.
 * If the same cell is updated again, it overrides the previous change.
 */
export function logAIDiff(
  updates: AIDiffUpdate[],
  getPreviousValue: (cellId: string) => any,
  sheetId: string
): void {
  const newDiffs = buildAIDiff(updates, getPreviousValue);
  
  // Initialize sheet-specific log if it doesn't exist
  if (!persistentAIDiffLog[sheetId]) {
    persistentAIDiffLog[sheetId] = [];
  }
  
  // Add new diffs to persistent log, overriding existing entries for the same cellId
  newDiffs.forEach(newDiff => {
    // Remove any existing entry for this cellId in this sheet
    persistentAIDiffLog[sheetId] = persistentAIDiffLog[sheetId].filter(diff => diff.cellId !== newDiff.cellId);
    // Add the new entry
    persistentAIDiffLog[sheetId].push(newDiff);
    
    // Also log to the unified change detector (requires sheet filename)
    // Note: This will be called with sheet filename from the main integration
  });
  
  // Store in localStorage silently
  try {
    localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(persistentAIDiffLog));
    // Only log if there are many entries to avoid spam
    if (persistentAIDiffLog[sheetId].length > 10) {
      console.log('💾 AI diff saved to localStorage for sheet', sheetId, ':', persistentAIDiffLog[sheetId].length, 'entries');
    }
  } catch (error) {
    console.error('❌ Failed to save AI diff log to localStorage:', error);
  }
}

/**
 * Gets the current persistent AI diff log for a specific sheet.
 * @param sheetId The sheet ID to get the log for
 * @returns The current persistent log of AI diffs for the sheet.
 */
export function getPersistentAIDiffLog(sheetId: string): AIDiffEntry[] {
  return [...(persistentAIDiffLog[sheetId] || [])];
}

/**
 * Clears the persistent AI diff log for a specific sheet.
 * @param sheetId The sheet ID to clear the log for
 */
export function clearPersistentAIDiffLog(sheetId: string): void {
  if (persistentAIDiffLog[sheetId]) {
    delete persistentAIDiffLog[sheetId];
  }
  try {
    localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(persistentAIDiffLog));
    console.log('🧹 Cleared AI diff log for sheet', sheetId);
  } catch (error) {
    console.error('❌ Failed to clear AI diff log from localStorage:', error);
  }
}

/**
 * Clears all persistent AI diff logs for all sheets.
 */
export function clearAllPersistentAIDiffLogs(): void {
  persistentAIDiffLog = {};
  try {
    localStorage.removeItem('sheet_specific_ai_diff');
    console.log('🧹 Cleared all AI diff logs from memory and localStorage');
  } catch (error) {
    console.error('❌ Failed to clear AI diff log from localStorage:', error);
  }
}


