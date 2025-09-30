import React, { useState } from 'react';
import SheetLoader from './loaders/SheetLoader';
import AILoader from './loaders/AILoader';
import DataLoader from './loaders/DataLoader';
import ResearchLoader from './loaders/ResearchLoader';

const LoaderDemo: React.FC = () => {
  const [activeLoader, setActiveLoader] = useState<string | null>(null);

  const testLoaders = [
    { name: 'Sheet Loader', component: 'sheet' },
    { name: 'AI Loader', component: 'ai' },
    { name: 'Data Loader', component: 'data' },
    { name: 'Research Loader', component: 'research' }
  ];

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Professional Loader System Demo
        </h1>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          {testLoaders.map((loader) => (
            <button
              key={loader.component}
              onClick={() => setActiveLoader(loader.component)}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {loader.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click to test the {loader.name.toLowerCase()}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Loader Features
          </h2>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>✅ NProgress integration with custom theme</li>
            <li>✅ Professional gradient animations</li>
            <li>✅ Context-aware messages</li>
            <li>✅ Dark mode support</li>
            <li>✅ Responsive design</li>
            <li>✅ Accessibility support</li>
            <li>✅ Ultra-lightweight (~2KB)</li>
          </ul>
        </div>

        {/* Loader Components */}
        <SheetLoader 
          isLoading={activeLoader === 'sheet'} 
          message="Loading spreadsheet data..."
        />
        
        <AILoader 
          isLoading={activeLoader === 'ai'} 
          showThinking={true}
          message="AI is processing your request..."
        />
        
        <DataLoader 
          isLoading={activeLoader === 'data'} 
          operation="upload"
          message="Processing and uploading data..."
        />
        
        <ResearchLoader 
          isLoading={activeLoader === 'research'} 
          stage="searching"
          message="Researching data sources..."
        />

        {activeLoader && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>Active:</strong> {testLoaders.find(l => l.component === activeLoader)?.name} is running...
            </p>
            <button
              onClick={() => setActiveLoader(null)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Stop Loader
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoaderDemo;

