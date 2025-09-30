import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { csvChangeManager } from '@/lib/csvChangeManager';

interface ApplyChangesButtonProps {
  onChangesApplied?: () => void;
  className?: string;
}

export const ApplyChangesButton: React.FC<ApplyChangesButtonProps> = ({ 
  onChangesApplied, 
  className = '' 
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [pendingChangesCount, setPendingChangesCount] = useState(0);

  // Check for pending changes on mount and when localStorage changes
  useEffect(() => {
    const updatePendingCount = () => {
      const count = csvChangeManager.getPendingChangesCount();
      setPendingChangesCount(count);
    };

    // Initial check
    updatePendingCount();

    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'updated_sheet_values') {
        updatePendingCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case of same-tab updates
    const interval = setInterval(updatePendingCount, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleApplyChanges = async () => {
    if (pendingChangesCount === 0) {
      console.log('No pending changes to apply');
      return;
    }

    setIsApplying(true);
    
    try {
      const success = await csvChangeManager.applyChangesToCSV();
      
      if (success) {
        console.log('✅ Changes applied successfully to CSV');
        setPendingChangesCount(0);
        onChangesApplied?.();
      } else {
        console.error('❌ Failed to apply changes to CSV');
      }
    } catch (error) {
      console.error('❌ Error applying changes:', error);
    } finally {
      setIsApplying(false);
    }
  };

  if (pendingChangesCount === 0) {
    return null; // Don't show button if no pending changes
  }

  return (
    <Button
      onClick={handleApplyChanges}
      disabled={isApplying}
      className={`bg-green-600 hover:bg-green-700 text-white ${className}`}
      size="sm"
    >
      {isApplying ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Applying...
        </>
      ) : (
        <>
          <Check className="h-4 w-4 mr-2" />
          Apply {pendingChangesCount} Change{pendingChangesCount !== 1 ? 's' : ''}
        </>
      )}
    </Button>
  );
};


