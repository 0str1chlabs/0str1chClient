import React from 'react';
import Loader from '../Loader';

interface AILoaderProps {
  isLoading: boolean;
  message?: string;
  showThinking?: boolean;
}

const AILoader: React.FC<AILoaderProps> = ({ 
  isLoading, 
  message, 
  showThinking = true 
}) => {
  const getAIMessage = () => {
    if (message) return message;
    
    if (showThinking) {
      const thinkingMessages = [
        'AI is analyzing your data...',
        'Processing your request...',
        'Generating insights...',
        'Computing results...',
        'AI is thinking...'
      ];
      
      // Return a random message for variety
      return thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];
    }
    
    return 'AI is processing...';
  };

  return (
    <Loader 
      isLoading={isLoading} 
      type="ai" 
      message={getAIMessage()} 
    />
  );
};

export default AILoader;

