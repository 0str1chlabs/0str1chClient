import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, X } from '@/lib/icons';

const DEFAULT_TIPS: string[] = [
  'Use pivot tables for enhanced analysis.',
  'Double-click a cell to edit its content.',
  'Press Ctrl + Z to undo the last action.',
  'Use filters to view specific data subsets.',
  'Freeze panes to keep headers visible.',
  'Use conditional formatting to highlight key data.',
  'Press Ctrl + S to save your work frequently.'
];

const STORAGE_KEY = 'aisheets.tips.hidden';

export default function TipsBanner() {
  const tips = useMemo(() => DEFAULT_TIPS, []);
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState<number>(0);

  useEffect(() => {
    if (hidden) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % tips.length);
    }, 5000);
    return () => clearInterval(id);
  }, [hidden, tips.length]);

  if (hidden) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-3 right-3 z-40"
      style={{}}
    >
      <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2 max-w-[360px]">
        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
        <div className="text-xs leading-snug">
          {tips[index]}
        </div>
        <button
          onClick={() => {
            try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
            setHidden(true);
          }}
          className="ml-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          title="Hide tips"
        >
          Hide tips
        </button>
      </div>
    </div>
  );
}


