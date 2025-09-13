import React, { useState } from 'react';

interface SheetInfo {
  fileName: string;
  lastModified: string;
  size?: number;
  fileId?: string;
}

interface SheetSelectorProps {
  sheets: SheetInfo[];
  onSelectSheet: (fileName: string) => void;
  onCreateBlankSheet?: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  sheets,
  onSelectSheet,
  onCreateBlankSheet,
  onClose,
  isOpen
}) => {
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedSheet === 'blank') {
      onCreateBlankSheet?.();
    } else if (selectedSheet) {
      onSelectSheet(selectedSheet);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Add New Sheet
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            {sheets.length > 0 
              ? `Found ${sheets.length} sheet${sheets.length !== 1 ? 's' : ''} in your cloud storage. Choose which one to load or create a blank sheet.`
              : 'Create a new blank sheet to get started.'
            }
          </p>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {/* Blank Sheet Option */}
            <div
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedSheet === 'blank'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedSheet('blank')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">📄</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      Create Blank Sheet
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Start with a new empty spreadsheet
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <input
                    type="radio"
                    checked={selectedSheet === 'blank'}
                    onChange={() => setSelectedSheet('blank')}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Existing Sheets */}
            {sheets.map((sheet, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedSheet === sheet.fileName
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedSheet(sheet.fileName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📊</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {sheet.fileName.replace('.csv.gz', '').replace('.csv', '')}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>📅 {formatDate(sheet.lastModified)}</span>
                        {sheet.size && (
                          <span>📊 {formatFileSize(sheet.size)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <input
                      type="radio"
                      checked={selectedSheet === sheet.fileName}
                      onChange={() => setSelectedSheet(sheet.fileName)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedSheet}
            className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedSheet === 'blank'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {selectedSheet === 'blank' ? 'Create Blank Sheet' : 'Load Selected Sheet'}
          </button>
        </div>
      </div>
    </div>
  );
};
