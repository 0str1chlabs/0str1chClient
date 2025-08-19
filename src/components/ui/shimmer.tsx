import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  lines?: number;
  height?: string;
}

export const Shimmer: React.FC<ShimmerProps> = ({ 
  className, 
  lines = 3, 
  height = "h-4" 
}) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded",
            height,
            "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
          )}
          style={{
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite",
          }}
        />
      ))}
    </div>
  );
};

interface MessageShimmerProps {
  className?: string;
  count?: number;
}

export const MessageShimmer: React.FC<MessageShimmerProps> = ({ 
  className, 
  count = 4 
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-3">
          {/* Avatar shimmer */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
          
          {/* Message content shimmer */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Add custom CSS for shimmer animation
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = shimmerStyles;
  document.head.appendChild(styleElement);
}
