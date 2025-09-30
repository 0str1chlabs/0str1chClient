import React from 'react';
import Loader from '../Loader';

interface ResearchLoaderProps {
  isLoading: boolean;
  message?: string;
  stage?: 'searching' | 'analyzing' | 'synthesizing';
}

const ResearchLoader: React.FC<ResearchLoaderProps> = ({ 
  isLoading, 
  message, 
  stage = 'searching' 
}) => {
  const getResearchMessage = () => {
    if (message) return message;
    
    switch (stage) {
      case 'searching':
        return 'Searching data sources...';
      case 'analyzing':
        return 'Analyzing research data...';
      case 'synthesizing':
        return 'Synthesizing insights...';
      default:
        return 'Researching...';
    }
  };

  return (
    <Loader 
      isLoading={isLoading} 
      type="research" 
      message={getResearchMessage()} 
    />
  );
};

export default ResearchLoader;

