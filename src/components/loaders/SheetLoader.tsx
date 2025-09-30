import React from 'react';
import Loader from '../Loader';

interface SheetLoaderProps {
  isLoading: boolean;
  message?: string;
}

const SheetLoader: React.FC<SheetLoaderProps> = ({ isLoading, message }) => {
  return (
    <Loader 
      isLoading={isLoading} 
      type="sheet" 
      message={message || 'Loading spreadsheet data...'} 
    />
  );
};

export default SheetLoader;

