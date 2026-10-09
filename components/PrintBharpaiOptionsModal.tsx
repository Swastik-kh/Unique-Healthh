
import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';

export interface PrintBharpaiOptions {
  showDearness: boolean;
  showFestival: boolean;
  showIncentive: boolean;
  showFieldDressMedicalOther: boolean;
  showPF: boolean;
  showCIT: boolean;
  showInsurance: boolean;
  showTax: boolean;
  showDeductionsOther: boolean;
}

interface PrintBharpaiOptionsModalProps {
  onClose: () => void;
  onPrint: (options: PrintBharpaiOptions) => void;
}

export const PrintBharpaiOptionsModal: React.FC<PrintBharpaiOptionsModalProps> = ({ onClose, onPrint }) => {
  const [options, setOptions] = useState<PrintBharpaiOptions>({
    showDearness: true,
    showFestival: true,
    showIncentive: true,
    showFieldDressMedicalOther: true,
    showPF: true,
    showCIT: true,
    showInsurance: true,
    showTax: true,
    showDeductionsOther: true,
  });

  const toggleOption = (key: keyof PrintBharpaiOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 text-lg">प्रिन्टमा समावेश गर्ने विवरणहरू छान्नुहोस्</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showDearness} onChange={() => toggleOption('showDearness')} /> महङ्गी भत्ता</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showFestival} onChange={() => toggleOption('showFestival')} /> चाडपर्व खर्च</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showIncentive} onChange={() => toggleOption('showIncentive')} /> प्रोत्साहन भत्ता</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showFieldDressMedicalOther} onChange={() => toggleOption('showFieldDressMedicalOther')} /> फिल्ड/पोशाक/अन्य भत्ता</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showPF} onChange={() => toggleOption('showPF')} /> क.सं.को.</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showCIT} onChange={() => toggleOption('showCIT')} /> ना.ल.को.</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showInsurance} onChange={() => toggleOption('showInsurance')} /> बीमा</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showTax} onChange={() => toggleOption('showTax')} /> कर/TDS</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={options.showDeductionsOther} onChange={() => toggleOption('showDeductionsOther')} /> अन्य कट्टी</label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">रद्द</button>
          <button onClick={() => onPrint(options)} className="px-4 py-2 bg-slate-800 text-white rounded-lg flex items-center gap-2"><Printer size={16} /> प्रिन्ट गर्नुहोस्</button>
        </div>
      </div>
    </div>
  );
};
