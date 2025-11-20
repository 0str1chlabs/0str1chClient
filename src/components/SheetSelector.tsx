import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Plus, X, Calendar, HardDrive, FolderOpen } from '@/lib/icons';

interface SheetInfo {
  fileName: string;
  originalFileName?: string;
  lastModified: string;
  size?: number;
  fileId?: string;
}

interface SheetSelectorProps {
  sheets: SheetInfo[];
  onSelectSheet: (fileName: string) => void;
  onCreateBlankSheet?: () => void;
  onUploadNewSheet?: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  sheets,
  onSelectSheet,
  onCreateBlankSheet,
  onUploadNewSheet,
  onClose,
  isOpen
}) => {
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedSheet === 'blank') {
      onCreateBlankSheet?.();
    } else if (selectedSheet === 'upload') {
      onUploadNewSheet?.();
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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FolderOpen className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Sheet Library
                </h2>
                <p className="text-sm text-gray-600">
                  {sheets.length > 0 
                    ? `${sheets.length} sheet${sheets.length !== 1 ? 's' : ''} available in cloud storage`
                    : 'No sheets found in cloud storage'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* File System List - Vertical Layout */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {/* Create New Sheet Option */}
            <div
              className={`group relative flex items-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                selectedSheet === 'blank'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
              }`}
              onClick={() => setSelectedSheet('blank')}
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-base mb-1">
                  Create New Sheet
                </h3>
                <p className="text-sm text-gray-500">
                  Start with a blank spreadsheet
                </p>
              </div>
              {selectedSheet === 'blank' && (
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>

            {/* Upload New Sheet Option */}
            <div
              className={`group relative flex items-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                selectedSheet === 'upload'
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onClick={() => setSelectedSheet('upload')}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-base mb-1">
                  Upload New Sheet
                </h3>
                <p className="text-sm text-gray-500">
                  Upload a CSV file to create a new sheet
                </p>
              </div>
              {selectedSheet === 'upload' && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>

            {/* Existing Sheets */}
            {sheets.map((sheet, index) => (
              <div
                key={index}
                className={`group relative flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedSheet === sheet.fileName
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => setSelectedSheet(sheet.fileName)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-base mb-1 truncate" title={sheet.fileName.replace('.csv.gz', '').replace('.csv', '')}>
                    {sheet.fileName.replace('.csv.gz', '').replace('.csv', '')}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(sheet.lastModified)}</span>
                    </div>
                    {sheet.size && (
                      <div className="flex items-center space-x-1">
                        <HardDrive className="h-4 w-4" />
                        <span>{formatFileSize(sheet.size)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedSheet === sheet.fileName && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {sheets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Sheets Found</h3>
              <p className="text-gray-500 mb-4">Create a new blank sheet to get started</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedSheet === 'blank' 
              ? 'Ready to create a new blank sheet'
              : selectedSheet === 'upload'
                ? 'Ready to upload a CSV file'
              : selectedSheet 
                ? `Selected: ${selectedSheet.replace('.csv.gz', '').replace('.csv', '')}`
                : 'Select an option to continue'
            }
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedSheet}
              className={`px-6 py-2 text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                selectedSheet === 'blank'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : selectedSheet === 'upload'
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {selectedSheet === 'blank' ? 'Create Sheet' : selectedSheet === 'upload' ? 'Upload CSV' : 'Load Sheet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
