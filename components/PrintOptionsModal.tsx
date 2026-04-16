
import React from 'react';
import { Printer, X, Maximize2, Minimize2 } from 'lucide-react';

interface PrintOptionsModalProps {
  onClose: () => void;
  onPrint: (orientation: 'portrait' | 'landscape') => void;
}

export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({ onClose, onPrint }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-primary-50/50">
          <div className="flex items-center gap-3">
            <Printer size={20} className="text-primary-600"/>
            <h3 className="font-bold text-slate-800 text-lg font-nepali">प्रिन्ट विकल्पहरू (Print Options)</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full"><X size={20} className="text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-nepali">कृपया प्रिन्ट ओरिएन्टेशन छान्नुहोस् (Please select print orientation):</p>
          <button onClick={() => onPrint('portrait')} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-colors">
            <Minimize2 size={18} /> प्रिन्ट पोर्ट्रेट (Print Portrait)
          </button>
          <button onClick={() => onPrint('landscape')} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-bold shadow-md hover:bg-slate-900 transition-colors">
            <Maximize2 size={18} /> प्रिन्ट ल्यान्डस्केप (Print Landscape)
          </button>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 transition-all font-nepali">बन्द गर्नुहोस्</button>
        </div>
      </div>
    </div>
  );
};
