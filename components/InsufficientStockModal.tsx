
import React from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { MagItem } from '../types/inventoryTypes'; 

interface InsufficientStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  insufficientItems: Array<{ demandedItem: MagItem; availableQuantity: number; }>;
}

export const InsufficientStockModal: React.FC<InsufficientStockModalProps> = ({
  isOpen,
  onClose,
  insufficientItems,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-red-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-red-100 flex justify-between items-center bg-red-50/50">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-600" />
            <h3 className="font-bold text-slate-800 text-lg font-nepali">अपर्याप्त मौज्दात चेतावनी (Insufficient Stock Alert)</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full"><X size={20} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <p className="text-sm text-red-700 font-nepali">
            माफ गर्नुहोस्, गोदाममा माग गरिएको परिमाण अनुसारको पर्याप्त मौज्दात छैन। कृपया तलको विवरण हेर्नुहोस्:
          </p>
          
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-red-50 text-red-800 font-bold">
                <tr>
                  <th className="px-4 py-2">सामानको नाम</th>
                  <th className="px-4 py-2 text-center">माग</th>
                  <th className="px-4 py-2 text-center">उपलब्ध</th>
                  <th className="px-4 py-2 text-center">अपुग</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {insufficientItems.map((item, idx) => {
                  const demandedQty = parseFloat(item.demandedItem.quantity) || 0;
                  const shortfall = demandedQty - item.availableQuantity;
                  return (
                    <tr key={item.demandedItem.id || idx} className="hover:bg-red-50/50">
                      <td className="px-4 py-2 font-medium text-slate-800">{item.demandedItem.name}</td>
                      <td className="px-4 py-2 text-center text-slate-700">{demandedQty} {item.demandedItem.unit}</td>
                      <td className="px-4 py-2 text-center text-orange-600">{item.availableQuantity} {item.demandedItem.unit}</td>
                      <td className="px-4 py-2 text-center font-bold text-red-600">{shortfall} {item.demandedItem.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600 font-nepali flex items-center gap-2 mt-4">
              <Info size={14} className="text-slate-500" /> मौज्दात प्रमाणित गर्न, उपलब्ध स्टक बराबर वा कम परिमाण माग हुनुपर्छ।
          </p>
        </div>
        <div className="p-4 border-t border-red-100 bg-red-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 transition-all">
            बन्द गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
};