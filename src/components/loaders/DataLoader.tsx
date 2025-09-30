import React from 'react';
import Loader from '../Loader';

interface DataLoaderProps {
  isLoading: boolean;
  message?: string;
  operation?: 'upload' | 'download' | 'sync' | 'process';
}

const DataLoader: React.FC<DataLoaderProps> = ({ 
  isLoading, 
  message, 
  operation = 'process' 
}) => {
  const getDataMessage = () => {
    if (message) return message;
    
    switch (operation) {
      case 'upload':
        return 'Uploading data to cloud storage...';
      case 'download':
        return 'Downloading data from cloud...';
      case 'sync':
        return 'Synchronizing data...';
      case 'process':
        return 'Processing data...';
      default:
        return 'Working with data...';
    }
  };

  return (
    <Loader 
      isLoading={isLoading} 
      type="data" 
      message={getDataMessage()} 
    />
  );
};

export default DataLoader;

