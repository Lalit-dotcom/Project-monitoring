import React from 'react';
import { Sparkles } from 'lucide-react';

export const AI: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] w-full">
      <div className="bg-surface-container-lowest border border-outline-variant max-w-md w-full rounded-md p-10 text-center space-y-4 shadow-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="font-headline text-xl font-bold text-on-surface">AI Insights &mdash; Coming Soon</h3>
        <p className="font-sans text-sm text-secondary leading-relaxed">
          Intelligent ledger reconciliation, automated draft audits, and compliance bottleneck predictions are being finalized for this reporting cluster.
        </p>
      </div>
    </div>
  );
};
