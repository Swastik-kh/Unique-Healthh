
import React, { useState } from 'react';
import { Baby, Droplets, Stethoscope, Settings, X, Plus, Trash2, MapPin, CalendarDays, Info, CheckCircle2 } from 'lucide-react';
import { GarbhawatiPatient, ChildImmunizationRecord } from '../types/healthTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { GarbhawatiTDRegistration } from './GarbhawatiTDRegistration';
import { ChildImmunizationRegistration } from './ChildImmunizationRegistration';

interface VaccinationServiceTabsProps {
  currentFiscalYear: string;
  generalSettings: OrganizationSettings;
  onUpdateGeneralSettings: (settings: OrganizationSettings) => void;
  garbhawatiPatients: GarbhawatiPatient[];
  onAddGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onUpdateGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onDeleteGarbhawatiPatient: (patientId: string) => void;
  bachhaImmunizationRecords: ChildImmunizationRecord[];
  onAddBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onUpdateBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onDeleteBachhaImmunizationRecord: (recordId: string) => void;
}

export const VaccinationServiceTabs: React.FC<VaccinationServiceTabsProps> = ({
  currentFiscalYear,
  generalSettings,
  onUpdateGeneralSettings,
  garbhawatiPatients,
  onAddGarbhawatiPatient,
  onUpdateGarbhawatiPatient,
  onDeleteGarbhawatiPatient,
  bachhaImmunizationRecords,
  onAddBachhaImmunizationRecord,
  onUpdateBachhaImmunizationRecord,
  onDeleteBachhaImmunizationRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'child' | 'maternal'>('child');
  const [showSettings, setShowSettings] = useState(false);
  const [newCenter, setNewCenter] = useState('');

  const centers = generalSettings.vaccinationCenters || ['मुख्य अस्पताल'];
  const sessionDays = generalSettings.vaccinationSessions || [6, 20];

  const handleAddCenter = () => {
    if (!newCenter.trim()) return;
    if (centers.includes(newCenter.trim())) {
      alert("यो केन्द्र पहिले नै छ।");
      return;
    }
    const updatedCenters = [...centers, newCenter.trim()];
    onUpdateGeneralSettings({ ...generalSettings, vaccinationCenters: updatedCenters });
    setNewCenter('');
  };

  const handleRemoveCenter = (centerName: string) => {
    if (centers.length <= 1) {
      alert("कम्तिमा एउटा केन्द्र हुनुपर्छ।");
      return;
    }
    const updatedCenters = centers.filter(c => c !== centerName);
    onUpdateGeneralSettings({ ...generalSettings, vaccinationCenters: updatedCenters });
  };

  const toggleSessionDay = (day: number) => {
    let updatedDays = [...sessionDays];
    if (updatedDays.includes(day)) {
      updatedDays = updatedDays.filter(d => d !== day);
    } else {
      updatedDays.push(day);
    }
    onUpdateGeneralSettings({ ...generalSettings, vaccinationSessions: updatedDays.sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-600">
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">खोप सेवा व्यवस्थापन</h2>
            <p className="text-sm text-slate-500">खोप केन्द्र र सेवा दर्ता विवरण</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveTab('child')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'child' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Baby size={18} /> बच्चाको खोप
            </button>
            <button
              onClick={() => setActiveTab('maternal')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'maternal' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Droplets size={18} /> गर्भवती महिला TD
            </button>
          </div>
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-all border ${showSettings ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
            title="Vaccination Settings"
          >
            <Settings size={22} className={showSettings ? 'animate-spin-slow' : ''} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-indigo-900 font-nepali flex items-center gap-2">
              <Settings size={18} /> खोप सेवा कन्फिगरेसन (Settings)
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Center Management */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 font-nepali flex items-center gap-2">
                <MapPin size={16} className="text-indigo-600"/> खोप केन्द्रहरू व्यवस्थापन गर्नुहोस्:
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newCenter}
                  onChange={(e) => setNewCenter(e.target.value)}
                  placeholder="नयाँ केन्द्रको नाम..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCenter()}
                />
                <button 
                  onClick={handleAddCenter}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700"
                >
                  <Plus size={18}/> थप्नुहोस्
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {centers.map(center => (
                  <div key={center} className="bg-white border border-indigo-200 pl-3 pr-1 py-1 rounded-full flex items-center gap-2 text-xs font-bold text-indigo-700 shadow-sm group">
                    {center}
                    <button 
                      onClick={() => handleRemoveCenter(center)}
                      className="p-1 hover:bg-red-50 rounded-full text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Day Management */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 font-nepali flex items-center gap-2">
                <CalendarDays size={16} className="text-indigo-600"/> खोप चल्ने गतेहरू छान्नुहोस् (१-३२):
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {Array.from({ length: 32 }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    onClick={() => toggleSessionDay(day)}
                    className={`h-9 rounded-lg text-xs font-bold transition-all border ${
                      sessionDays.includes(day)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="p-3 bg-indigo-100/50 rounded-xl flex items-start gap-3 border border-indigo-200">
                <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-indigo-800 font-nepali">
                  यहाँ छनोट गरिएका गतेहरूमा मात्र 'आगामी खोप' प्रणालीले गणना गर्नेछ।
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {activeTab === 'child' ? (
          <ChildImmunizationRegistration
            currentFiscalYear={currentFiscalYear}
            records={bachhaImmunizationRecords}
            generalSettings={generalSettings}
            onAddRecord={onAddBachhaImmunizationRecord}
            onUpdateRecord={onUpdateBachhaImmunizationRecord}
            onDeleteRecord={onDeleteBachhaImmunizationRecord}
          />
        ) : (
          <GarbhawatiTDRegistration
            currentFiscalYear={currentFiscalYear}
            patients={garbhawatiPatients}
            onAddPatient={onAddGarbhawatiPatient}
            onUpdatePatient={onUpdateGarbhawatiPatient}
            onDeletePatient={onDeleteGarbhawatiPatient}
          />
        )}
      </div>
    </div>
  );
};
