import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-base-100/30 backdrop-blur-[2px] transition-opacity duration-300">
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-base-200/70 border border-base-300/30 shadow-xl backdrop-blur-md">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm font-medium text-base-content/85 select-none animate-pulse">
          Loading page...
        </span>
      </div>
    </div>
  );
};
