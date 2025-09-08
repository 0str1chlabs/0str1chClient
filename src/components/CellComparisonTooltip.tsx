import React from 'react';
import { Cell } from '@/types/spreadsheet';

interface CellComparisonTooltipProps {
  cell: Cell;
  cellId: string;
  onAcceptAIUpdate: (cellId: string) => void;
  onRejectAIUpdate: (cellId: string) => void;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const CellComparisonTooltip: React.FC<CellComparisonTooltipProps> = ({
  cell,
  cellId,
  onAcceptAIUpdate,
  onRejectAIUpdate,
  position,
  isVisible
}) => {
  if (!isVisible || !cell.hasAIUpdate) {
    return null;
  }

  const formatValue = (value: string | number | undefined) => {
    if (value === undefined || value === null) return 'Empty';
    if (typeof value === 'number') return value.toString();
    return value;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-[280px] max-w-[400px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Update Available
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {cell.aiUpdateTimestamp && formatTimestamp(cell.aiUpdateTimestamp)}
          </span>
        </div>

        {/* Cell ID */}
        <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
          Cell: {cellId}
        </div>

        {/* Value Comparison */}
        <div className="space-y-2">
          {/* Original Value */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="flex-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">Original:</div>
              <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                {formatValue(cell.originalValue)}
              </div>
            </div>
          </div>

          {/* AI Value */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">AI Suggested:</div>
              <div className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                {formatValue(cell.aiValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onAcceptAIUpdate(cellId)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Accept</span>
          </button>
          <button
            onClick={() => onRejectAIUpdate(cellId)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Reject</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Click Accept to use the AI value, or Reject to keep the original
        </div>
      </div>
    </div>
  );
};

export default CellComparisonTooltip;

// Column-level AI Update Tooltip Component
interface ColumnAITooltipProps {
  columnLetter: string;
  updateCount: number;
  onAcceptAll: (columnLetter: string) => void;
  onRejectAll: (columnLetter: string) => void;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const ColumnAITooltip: React.FC<ColumnAITooltipProps> = ({
  columnLetter,
  updateCount,
  onAcceptAll,
  onRejectAll,
  position,
  isVisible
}) => {
  if (!isVisible || updateCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Column {columnLetter} Updates ({updateCount})
        </div>

        {/* Description */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {updateCount} AI suggestion{updateCount !== 1 ? 's' : ''} in this column
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onAcceptAll(columnLetter)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Accept All</span>
          </button>
          <button
            onClick={() => onRejectAll(columnLetter)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Reject All</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Row-level AI Update Tooltip Component
interface RowAITooltipProps {
  rowNumber: number;
  updateCount: number;
  onAcceptAll: (rowNumber: number) => void;
  onRejectAll: (rowNumber: number) => void;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const RowAITooltip: React.FC<RowAITooltipProps> = ({
  rowNumber,
  updateCount,
  onAcceptAll,
  onRejectAll,
  position,
  isVisible
}) => {
  if (!isVisible || updateCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(10px, -50%)'
      }}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Row {rowNumber} Updates ({updateCount})
        </div>

        {/* Description */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {updateCount} AI suggestion{updateCount !== 1 ? 's' : ''} in this row
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onAcceptAll(rowNumber)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Accept All</span>
          </button>
          <button
            onClick={() => onRejectAll(rowNumber)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Reject All</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Sheet-level AI Update Control Component
interface SheetAIControlProps {
  totalUpdates: number;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onRestoreOriginal: () => void;
  className?: string;
}

export const SheetAIControl: React.FC<SheetAIControlProps> = ({
  totalUpdates,
  onAcceptAll,
  onRejectAll,
  onRestoreOriginal,
  className = ""
}) => {
  if (totalUpdates === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Updates ({totalUpdates})
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Sheet-wide controls
          </div>
        </div>

        {/* Description */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {totalUpdates} AI suggestion{totalUpdates !== 1 ? 's' : ''} across the entire sheet
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex space-x-2">
            <button
              onClick={onAcceptAll}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept All Updates</span>
            </button>
            <button
              onClick={onRejectAll}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Reject All Updates</span>
            </button>
          </div>
          <button
            onClick={onRestoreOriginal}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>Restore Original State</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Use column/row headers or individual cells for granular control
        </div>
      </div>
    </div>
  );
};