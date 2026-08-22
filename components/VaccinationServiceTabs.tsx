
import React, { useState, useMemo } from 'react';
import { Baby, Droplets, Stethoscope, Settings, X, Plus, Trash2, MapPin, CalendarDays, Info, CheckCircle2, Layers, MessageSquare, Building2 } from 'lucide-react';
import { GarbhawatiPatient, ChildImmunizationRecord } from '../types/healthTypes';
import { OrganizationSettings, User } from '../types/coreTypes';
import { GarbhawatiTDRegistration } from './GarbhawatiTDRegistration';
import { ChildImmunizationRegistration } from './ChildImmunizationRegistration';
import { VaccineInventoryMonthly } from './VaccineInventoryMonthly';
import { safeEncodeKey } from '../firebase';

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
  activeOrgName?: string;
  currentUser?: User | null;
  allUsers?: User[];
  onSetActiveOrgName?: (orgName: string) => void;
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
  activeOrgName,
  currentUser,
  allUsers,
  onSetActiveOrgName,
}) => {
  const [activeTab, setActiveTab] = useState<'child' | 'maternal' | 'inventory'>('child');
  const [showSettings, setShowSettings] = useState(false);
  const [newCenter, setNewCenter] = useState('');

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const availableOrgs = useMemo(() => {
    if (!isSuperAdmin) {
      return [currentUser?.organizationName || activeOrgName].filter(Boolean) as string[];
    }
    if (allUsers && allUsers.length > 0) {
      const orgs = allUsers.map(u => u.organizationName).filter(Boolean);
      const combined = currentUser?.organizationName ? [currentUser.organizationName, ...orgs] : orgs;
      return Array.from(new Set(combined));
    }
    if (activeOrgName) return [activeOrgName];
    return [];
  }, [allUsers, currentUser, activeOrgName, isSuperAdmin]);

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
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner flex-wrap">
            <button
              onClick={() => setActiveTab('child')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'child' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Baby size={18} /> बच्चाको खोप
            </button>
            <button
              onClick={() => setActiveTab('maternal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'maternal' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Droplets size={18} /> गर्भवती महिला TD
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Layers size={18} /> मासिक खोप/सामग्री प्राप्ति
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

      {/* Super Admin Institution Selector */}
      {isSuperAdmin && availableOrgs.length > 1 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-md border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="text-indigo-400" size={20} />
              <span className="font-bold text-sm tracking-wide text-indigo-100 font-nepali">
                संस्था छनोट (Health Facility / Institution Data View)
              </span>
              <span className="bg-amber-400/90 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-300 font-nepali">
              सुपर एड्मिन मोड: तलको सूचीबाट संस्था छनोट गरी सम्बन्धित संस्थाको बच्चा खोप, गर्भवती TD र खोप मौज्दातको विवरण हेर्नुहोस् वा व्यवस्थापन गर्नुहोस्।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors px-3.5 py-2 rounded-xl border border-white/20">
              <span className="text-xs font-semibold text-indigo-200 font-nepali whitespace-nowrap">
                संस्था:
              </span>
              <select
                value={activeOrgName || ''}
                onChange={(e) => onSetActiveOrgName && onSetActiveOrgName(e.target.value)}
                className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer font-nepali [&>option]:text-slate-900 [&>option]:bg-white"
              >
                <option value="All">-- सबै संस्था (All Organizations) --</option>
                {availableOrgs.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-indigo-200 bg-black/30 px-3.5 py-2 rounded-xl border border-white/10">
              <span>बालबालिका: <strong className="text-white font-mono">{bachhaImmunizationRecords.length}</strong></span>
              <span className="opacity-40">|</span>
              <span>गर्भवती TD: <strong className="text-white font-mono">{garbhawatiPatients.length}</strong></span>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200 max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 text-left">
            <div className="flex justify-between items-center border-b border-indigo-50 pb-4">
              <h3 className="font-bold text-indigo-900 font-nepali flex items-center gap-2 text-lg">
                <Settings size={22} className="text-indigo-600 animate-spin-slow" /> खोप सेवा कन्फिगरेसन (Settings)
              </h3>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="बन्द गर्नुहोस्"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Center Management with specific operational dates */}
              <div className="md:col-span-2 space-y-4">
                <label className="text-sm font-bold text-indigo-900 font-nepali flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-600"/> खोप केन्द्रहरू व्यवस्थापन तथा खोप सञ्चालन हुने गतेहरू (१-३२):
                </label>
                
                <div className="flex gap-2 max-w-md">
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
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={18}/> थप्नुहोस्
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {centers.map(center => {
                    const encodedKey = safeEncodeKey(center);
                    const centerDays: number[] = generalSettings.vaccinationCenterDays?.[encodedKey] || [];
                    return (
                      <div key={center} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                          <span className="font-bold text-indigo-900 text-sm font-nepali flex items-center gap-1.5">
                            <MapPin size={15} className="text-indigo-600" />
                            {center}
                          </span>
                          <button 
                            onClick={() => handleRemoveCenter(center)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                            title="केन्द्र हटाउनुहोस्"
                          >
                            <Trash2 size={15}/>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center mb-1 text-[10px]">
                            <span className="text-slate-500 font-bold font-nepali">
                              यो केन्द्रमा खोप सञ्चालन हुने गतेहरू (१-३२):
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const allDays = Array.from({ length: 32 }, (_, i) => i + 1);
                                  const encodedKey = safeEncodeKey(center);
                                  const updatedCenterDays = {
                                    ...(generalSettings.vaccinationCenterDays || {}),
                                    [encodedKey]: allDays
                                  };
                                  onUpdateGeneralSettings({
                                    ...generalSettings,
                                    vaccinationCenterDays: updatedCenterDays
                                  });
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-bold font-nepali text-[9px]"
                              >
                                सबै छान्नुहोस्
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const encodedKey = safeEncodeKey(center);
                                  const updatedCenterDays = {
                                    ...(generalSettings.vaccinationCenterDays || {}),
                                    [encodedKey]: []
                                  };
                                  onUpdateGeneralSettings({
                                    ...generalSettings,
                                    vaccinationCenterDays: updatedCenterDays
                                  });
                                }}
                                className="text-rose-500 hover:text-rose-700 font-bold font-nepali text-[9px]"
                              >
                                सबै हटाउनुहोस्
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {Array.from({ length: 32 }, (_, i) => i + 1).map(day => {
                              const isSelected = centerDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const updatedDays = isSelected
                                      ? centerDays.filter(d => d !== day)
                                      : [...centerDays, day].sort((a, b) => a - b);
                                    
                                    const encodedKey = safeEncodeKey(center);
                                    const updatedCenterDays = {
                                      ...(generalSettings.vaccinationCenterDays || {}),
                                      [encodedKey]: updatedDays
                                    };
                                    onUpdateGeneralSettings({
                                      ...generalSettings,
                                      vaccinationCenterDays: updatedCenterDays
                                    });
                                  }}
                                  className={`h-6 rounded-md text-[10px] font-mono font-bold transition-all border flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[9px] text-slate-400 font-nepali mt-1">
                            {centerDays.length > 0 
                              ? `छनोट गरिएका गतेहरू: ${centerDays.join(', ')}`
                              : 'कुनै गते रोजिएको छैन (सबै गते सञ्चालन हुनेछ)'
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-indigo-100/50 rounded-xl flex items-start gap-3 border border-indigo-200">
                  <Info size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-indigo-800 font-nepali leading-relaxed">
                    यहाँ प्रत्येक केन्द्रको लागि छानिएका गतेहरूका आधारमा <strong>'खोप अनुगमन (Immunization Tracking)'</strong> मा आगामी खोपको सूचीमा बच्चाको खोप केन्द्र अनुसार सञ्चालन हुने गतेहरू स्वतः मिलाएर प्रदर्शन गरिनेछ।
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-indigo-50">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                बन्द गर्नुहोस् (Close)
              </button>
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
            onUpdateGeneralSettings={onUpdateGeneralSettings}
            currentUser={currentUser}
          />
        ) : activeTab === 'maternal' ? (
          <GarbhawatiTDRegistration
            currentFiscalYear={currentFiscalYear}
            patients={garbhawatiPatients}
            generalSettings={generalSettings}
            onAddPatient={onAddGarbhawatiPatient}
            onUpdatePatient={onUpdateGarbhawatiPatient}
            onDeletePatient={onDeleteGarbhawatiPatient}
            currentUser={currentUser}
          />
        ) : (
          <VaccineInventoryMonthly
            currentFiscalYear={currentFiscalYear}
            activeOrgName={activeOrgName || ""}
            generalSettings={generalSettings}
            bachhaImmunizationRecords={bachhaImmunizationRecords}
            garbhawatiPatients={garbhawatiPatients}
            showSettings={showSettings}
          />
        )}
      </div>
    </div>
  );
};
