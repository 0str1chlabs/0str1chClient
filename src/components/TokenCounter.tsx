import { useEffect, useState } from 'react';

interface TokenCounterProps {
  targetTokens: number;
  duration?: number; // Animation duration in milliseconds
  className?: string;
}

/**
 * Animated token counter that counts up from 0 to targetTokens
 * Similar to Claude's token display - shows tokens being used in real-time
 */
export const TokenCounter = ({ targetTokens, duration = 2000, className = '' }: TokenCounterProps) => {
  const [displayTokens, setDisplayTokens] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (targetTokens === 0) {
      setDisplayTokens(0);
      return;
    }

    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayTokens;
    const endValue = targetTokens;
    const range = endValue - startValue;

    // Calculate steps - faster at start, slower at end (ease-out)
    const steps = Math.min(60, Math.max(20, Math.floor(targetTokens / 20))); // 20-60 steps
    const stepDuration = duration / steps;

    let currentStep = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= duration) {
        setDisplayTokens(endValue);
        setIsAnimating(false);
        return;
      }

      // Ease-out cubic function for smooth animation
      const progress = elapsed / duration;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (range * easedProgress));

      setDisplayTokens(currentValue);
      currentStep++;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [targetTokens, duration]);

  // Format number with commas
  const formattedTokens = displayTokens.toLocaleString();

  return (
    <span 
      className={`inline-flex items-center gap-1 text-xs font-mono ${className}`}
      title={`${formattedTokens} tokens used`}
    >
      <span className="text-muted-foreground/70">•</span>
      <span className={isAnimating ? 'text-blue-500' : 'text-muted-foreground'}>
        {formattedTokens}
      </span>
      <span className="text-muted-foreground/60 text-[10px]">tokens</span>
    </span>
  );
};

