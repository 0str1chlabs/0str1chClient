import React, { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

interface LoaderProps {
  isLoading: boolean;
  message?: string;
  type?: 'sheet' | 'ai' | 'data' | 'upload' | 'research';
}

const Loader: React.FC<LoaderProps> = ({ 
  isLoading, 
  message, 
  type = 'data' 
}) => {
  useEffect(() => {
    if (isLoading) {
      NProgress.start();
    } else {
      NProgress.done();
    }

    // Cleanup on unmount
    return () => {
      NProgress.done();
    };
  }, [isLoading]);

  if (!isLoading) return null;

  const getLoaderMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'sheet':
        return 'Loading spreadsheet...';
      case 'ai':
        return 'AI is processing your request...';
      case 'data':
        return 'Processing data...';
      case 'upload':
        return 'Uploading file...';
      case 'research':
        return 'Researching data sources...';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center space-x-3">
          {/* Professional spinner */}
          <div className="relative">
            <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-600 rounded-full animate-spin border-t-blue-500"></div>
            <div className="absolute inset-0 w-8 h-8 border-2 border-transparent rounded-full animate-pulse border-t-blue-300"></div>
          </div>
          
          {/* Loading message */}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getLoaderMessage()}
            </p>
            <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loader;

