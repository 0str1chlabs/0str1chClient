import { useState, useCallback } from 'react';
import NProgress from 'nprogress';

interface LoaderState {
  isLoading: boolean;
  message: string;
  type: 'sheet' | 'ai' | 'data' | 'upload' | 'research';
}

export const useLoader = () => {
  const [loaderState, setLoaderState] = useState<LoaderState>({
    isLoading: false,
    message: '',
    type: 'data'
  });

  const startLoader = useCallback((
    message: string, 
    type: 'sheet' | 'ai' | 'data' | 'upload' | 'research' = 'data'
  ) => {
    setLoaderState({
      isLoading: true,
      message,
      type
    });
    NProgress.start();
  }, []);

  const stopLoader = useCallback(() => {
    setLoaderState(prev => ({
      ...prev,
      isLoading: false
    }));
    NProgress.done();
  }, []);

  const updateMessage = useCallback((message: string) => {
    setLoaderState(prev => ({
      ...prev,
      message
    }));
  }, []);

  return {
    loaderState,
    startLoader,
    stopLoader,
    updateMessage
  };
};

export default useLoader;

