
import React, { useState, useEffect } from 'react';
import { Syringe, Plus, Search, Calendar, Users, MapPin, Printer, Save, Trash2, Info } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, push, set, remove } from 'firebase/database';

export const KhopAbhiyan: React.FC<{ currentFiscalYear: string; activeOrgName: string; generalSettings?: any }> = ({ 
  currentFiscalYear, 
  activeOrgName, 
  generalSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'report'>('records');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <Syringe size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">खोप अभियान (Immunization Campaign)</h2>
            <p className="text-sm text-slate-500">राष्ट्रिय/स्थानीय खोप अभियानको विवरण तथा रिपोर्ट</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'records' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Calendar size={18} /> अभियान रेकर्ड
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Users size={18} /> अभियान रिपोर्ट
          </button>
        </div>
      </div>

      {activeTab === 'records' ? (
        <div className="grid gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" /> नयाँ अभियान थप्नुहोस्
              </h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">अभियानको नाम (Campaign Name)</label>
                <input 
                  type="text" 
                  placeholder="उदा: दादुरा-रुबेला अभियान"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">शुरु मिति (Start Date)</label>
                <input 
                  type="text" 
                  placeholder="२०८१-०१-०१"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">अन्त्य मिति (End Date)</label>
                <input 
                  type="text" 
                  placeholder="२०८१-०१-०७"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                <Save size={18} /> सुरक्षित गर्नुहोस्
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" /> हालसम्मका अभियानहरू
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="खोज्नुहोस्..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="p-4">अभियानको नाम</th>
                    <th className="p-4">अवधि</th>
                    <th className="p-4">लक्षित संख्या</th>
                    <th className="p-4 text-center">स्थिति</th>
                    <th className="p-4 text-right">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                      <div className="flex flex-col items-center gap-2">
                        <Info size={40} className="opacity-20" />
                        कुनै अभियान रेकर्ड भेटिएन।
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Printer size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-nepali">अभियान रिपोर्टिङ</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            यहाँबाट तपाइँले विभिन्न अभियानहरूको प्रगति विवरण र लक्षित संख्या अनुसारको प्रगति रिपोर्ट हेर्न र प्रिन्ट गर्न सक्नुहुनेछ।
          </p>
          <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
            रिपोर्ट तयार गर्नुहोस्
          </button>
        </div>
      )}
    </div>
  );
};
