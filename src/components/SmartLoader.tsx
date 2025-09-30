import React from 'react';
import { useLoader } from '@/hooks/useLoader';

interface SmartLoaderProps {
  children: React.ReactNode;
  loadingStates: {
    [key: string]: boolean;
  };
  loadingMessages: {
    [key: string]: string;
  };
}

const SmartLoader: React.FC<SmartLoaderProps> = ({ 
  children, 
  loadingStates, 
  loadingMessages 
}) => {
  const { loaderState, startLoader, stopLoader } = useLoader();
  
  // Determine which loader to show based on loading states
  const getActiveLoader = () => {
    const activeStates = Object.entries(loadingStates).filter(([_, isLoading]) => isLoading);
    
    if (activeStates.length === 0) {
      stopLoader();
      return null;
    }
    
    // Priority order: AI > Research > Data > Sheet
    const priority = ['ai', 'research', 'data', 'sheet'];
    const activeState = activeStates.find(([key, _]) => priority.includes(key)) || activeStates[0];
    
    const [stateKey, _] = activeState;
    const message = loadingMessages[stateKey] || 'Loading...';
    
    startLoader(message, stateKey as any);
    return loaderState;
  };

  const activeLoader = getActiveLoader();

  return (
    <>
      {children}
      {activeLoader && (
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
                  {activeLoader.message}
                </p>
                <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartLoader;

