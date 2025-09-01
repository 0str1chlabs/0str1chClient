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
