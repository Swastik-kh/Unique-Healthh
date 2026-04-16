import React from 'react';
import { Baby } from 'lucide-react';

export const SafeMotherhoodService: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-pink-100 p-2 rounded-lg text-pink-600">
            <Baby size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">सुरक्षित मातृत्व सेवा</h2>
            <p className="text-sm text-slate-500">Safe Motherhood Service</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <p className="text-center text-slate-500">यो सेवाको लागि सामग्री चाँडै उपलब्ध हुनेछ। (Content for this service will be available soon.)</p>
      </div>
    </div>
  );
};
