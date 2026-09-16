import React from 'react';

interface DataStatusFooterProps {
  statusInfo?: any;
  lastUpdatedTime?: string;
  isCached?: boolean;
}

export const DataStatusFooter: React.FC<DataStatusFooterProps> = () => {
  return (
    <footer id="data-status-footer" className="mt-8 pt-6 pb-8 border-t border-slate-200">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 text-center sm:text-left">
        <div>
          <span className="font-semibold text-slate-700">NER-SAFE © 2026</span>
        </div>
      </div>
    </footer>
  );
};
