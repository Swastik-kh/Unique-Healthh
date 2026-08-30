import React, { useState, useRef, useMemo } from 'react';
import { Search, Save, Printer, Plus, Trash2, User, Stethoscope, Pill, History, Siren, AlertTriangle, Activity, Volume2, VolumeX, Eye, Edit2 } from 'lucide-react';
import { ServiceSeekerRecord, EmergencyRecord, PrescriptionItem, ServiceItem } from '../types/coreTypes';
import { InventoryItem } from '../types/inventoryTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';
import { callPatientSpeech } from './nepaliUtils';

interface EmergencySewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  emergencyRecords?: EmergencyRecord[];
  onSaveRecord: (record: EmergencyRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  serviceItems?: ServiceItem[];
  inventoryItems?: InventoryItem[];
}

const initialPrescriptionItem: PrescriptionItem = {
  id: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export const EmergencySewa: React.FC<EmergencySewaProps> = ({ 
  serviceSeekerRecords = [], 
  emergencyRecords = [], 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser,
  serviceItems = [],
  inventoryItems = []
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [emergencyData, setEmergencyData] = useState<Partial<EmergencyRecord>>({
    chiefComplaints: '',
    diagnosis: '',
    investigation: '',
    emergencyPrescriptions: [],
    dischargePrescriptions: [],
    advice: '',
    nextVisitDate: '',
    triage: 'Green',
    vitals: {
      temp: '',
      bp: '',
      pulse: '',
      rr: '',
      spo2: ''
    }
  });
  const [emergencyPrescriptions, setEmergencyPrescriptions] = useState<PrescriptionItem[]>([]);
  const [dischargePrescriptions, setDischargePrescriptions] = useState<PrescriptionItem[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState<'emergency' | 'discharge' | null>(null);
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem>(initialPrescriptionItem);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('queue_voice_muted') === 'true';
    }
    return false;
  });

  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('queue_voice_muted', String(newVal));
    }
  };
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const isAdmin = useMemo(() => {
    return currentUser?.role === 'admin' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  }, [currentUser]);

  const isReadOnly = useMemo(() => {
    return editingRecordId !== null && !isAdmin;
  }, [editingRecordId, isAdmin]);

  const filteredHistoryRecords = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase();
    if (!term) return emergencyRecords;

    return emergencyRecords.filter(record => {
      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
      const nameMatch = patient?.name.toLowerCase().includes(term) || false;
      const idMatch = record.uniquePatientId.toLowerCase().includes(term);
      const regMatch = patient?.registrationNumber.toLowerCase().includes(term) || false;
      const dateMatch = record.visitDate.includes(term);
      const diagnosisMatch = record.diagnosis?.toLowerCase().includes(term) || false;
      const complaintsMatch = record.chiefComplaints?.toLowerCase().includes(term) || false;

      return nameMatch || idMatch || regMatch || dateMatch || diagnosisMatch || complaintsMatch;
    });
  }, [emergencyRecords, serviceSeekerRecords, historySearchTerm]);

  const sortedHistoryRecords = useMemo(() => {
    return [...filteredHistoryRecords].sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.id.localeCompare(a.id));
  }, [filteredHistoryRecords]);

  const handleLoadRecord = (record: EmergencyRecord, editMode: boolean) => {
    const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
    if (!patient) {
      alert('बिरामीको मुख्य विवरण फेला परेन। (Patient details not found)');
      return;
    }

    if (editMode && !isAdmin) {
      alert('यो रेकर्ड सम्पादन गर्ने अधिकार एडमिनलाई मात्र छ। (Only Admin is allowed to edit this record)');
      return;
    }

    setCurrentPatient(patient);
    setEmergencyData({
      chiefComplaints: record.chiefComplaints,
      diagnosis: record.diagnosis,
      investigation: record.investigation,
      emergencyPrescriptions: record.emergencyPrescriptions || [],
      dischargePrescriptions: record.dischargePrescriptions || [],
      advice: record.advice,
      nextVisitDate: record.nextVisitDate,
      triage: record.triage || 'Green',
      vitals: record.vitals || { temp: '', bp: '', pulse: '', rr: '', spo2: '' }
    });
    setEmergencyPrescriptions(record.emergencyPrescriptions || []);
    setDischargePrescriptions(record.dischargePrescriptions || []);
    setEditingRecordId(record.id);

    // Smooth scroll to top form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const printRecordDirectly = (record: EmergencyRecord) => {
    const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
    if (!patient) return;
    
    setCurrentPatient(patient);
    setEmergencyData({
      chiefComplaints: record.chiefComplaints,
      diagnosis: record.diagnosis,
      investigation: record.investigation,
      emergencyPrescriptions: record.emergencyPrescriptions || [],
      dischargePrescriptions: record.dischargePrescriptions || [],
      advice: record.advice,
      nextVisitDate: record.nextVisitDate,
      triage: record.triage || 'Green',
      vitals: record.vitals || { temp: '', bp: '', pulse: '', rr: '', spo2: '' }
    });
    setEmergencyPrescriptions(record.emergencyPrescriptions || []);
    setDischargePrescriptions(record.dischargePrescriptions || []);
    setEditingRecordId(record.id);

    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  const todayNepaliDate = useMemo(() => new NepaliDate().format('YYYY-MM-DD'), []);

  const patientsOnQueue = useMemo(() => {
    return serviceSeekerRecords.filter(patient => {
      const isToday = patient.date === todayNepaliDate;
      const isEmergency = patient.serviceType === 'Emergency';
      if (!isToday || !isEmergency) return false;
      const hasEmergencyToday = emergencyRecords.some(r => r.uniquePatientId === patient.uniquePatientId && r.visitDate === todayNepaliDate);
      return !hasEmergencyToday && patient.status !== 'Completed';
    });
  }, [serviceSeekerRecords, emergencyRecords, todayNepaliDate]);

  const medicineSuggestions = useMemo(() => {
    const fromInventory = inventoryItems.map(i => i.itemName);
    const fromEmergency = emergencyRecords.flatMap(r => [
      ...(r.emergencyPrescriptions?.map(p => p.medicineName) || []),
      ...(r.dischargePrescriptions?.map(p => p.medicineName) || [])
    ]);
    return Array.from(new Set([...fromInventory, ...fromEmergency])).filter(Boolean).sort();
  }, [inventoryItems, emergencyRecords]);
  
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [showInvestigationResults, setShowInvestigationResults] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = (r.uniquePatientId || '').toLowerCase().includes(query) || 
                      (r.uniquePatientId || '').replace(/[^0-9]/g, '').includes(query);
      const nameMatch = (r.name || '').toLowerCase().includes(query);
      const regMatch = (r.registrationNumber || '').toLowerCase().includes(query);
      const mulDartaMatch = r.mulDartaNo && (r.mulDartaNo || '').toLowerCase().includes(query);
      return idMatch || nameMatch || regMatch || mulDartaMatch;
    });

    if (results.length === 1) {
      selectPatient(results[0]);
    } else if (results.length > 1) {
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      alert('बिरामी भेटिएन (Patient not found)');
      setCurrentPatient(null);
    }
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    const currentIndex = patientsOnQueue.findIndex(p => p.id === patient.id);
    const nextPatient = currentIndex !== -1 && currentIndex + 1 < patientsOnQueue.length 
      ? patientsOnQueue[currentIndex + 1] 
      : undefined;
    callPatientSpeech(patient, nextPatient);

    setCurrentPatient(patient);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchId('');
    setEmergencyData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      emergencyPrescriptions: [],
      dischargePrescriptions: [],
      advice: '',
      nextVisitDate: '',
      triage: 'Green',
      vitals: {
        temp: '',
        bp: '',
        pulse: '',
        rr: '',
        spo2: ''
      }
    });
    setEmergencyPrescriptions([]);
    setDischargePrescriptions([]);
    setEditingRecordId(null);
  };

  const handleRestore = () => {
    if (!currentPatient) return;
    const patientRecords = emergencyRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId);
    if (patientRecords.length === 0) {
      alert('यो बिरामीको कुनै पुरानo रेकर्ड भेटिएन।');
      return;
    }
    const sortedRecords = [...patientRecords].sort((a, b) => b.id.localeCompare(a.id));
    const latestRecord = sortedRecords[0];

    setEmergencyData({
      chiefComplaints: latestRecord.chiefComplaints,
      diagnosis: latestRecord.diagnosis,
      investigation: latestRecord.investigation,
      emergencyPrescriptions: latestRecord.emergencyPrescriptions || [],
      dischargePrescriptions: latestRecord.dischargePrescriptions || [],
      advice: latestRecord.advice,
      nextVisitDate: latestRecord.nextVisitDate,
      triage: latestRecord.triage || 'Green',
      vitals: latestRecord.vitals || { temp: '', bp: '', pulse: '', rr: '', spo2: '' }
    });
    setEmergencyPrescriptions(latestRecord.emergencyPrescriptions || []);
    setDischargePrescriptions(latestRecord.dischargePrescriptions || []);
    setEditingRecordId(latestRecord.id);
    alert(`पुरानो रेकर्ड (मिति: ${latestRecord.visitDate}) रिस्टोर गरियो।`);
  };

  const handleAddPrescription = () => {
    if (!currentPrescription.medicineName || !showPrescriptionForm) return;
    const newItem = { ...currentPrescription, id: Date.now().toString() };
    if (showPrescriptionForm === 'emergency') {
      setEmergencyPrescriptions([...emergencyPrescriptions, newItem]);
    } else {
      setDischargePrescriptions([...dischargePrescriptions, newItem]);
    }
    setCurrentPrescription(initialPrescriptionItem);
    setShowPrescriptionForm(null);
  };

  const handleRemovePrescription = (id: string, type: 'emergency' | 'discharge') => {
    if (type === 'emergency') {
      setEmergencyPrescriptions(emergencyPrescriptions.filter(item => item.id !== id));
    } else {
      setDischargePrescriptions(dischargePrescriptions.filter(item => item.id !== id));
    }
  };

  const handleAddInvestigation = (serviceName: string) => {
    const currentInv = emergencyData.investigation || '';
    const separator = currentInv ? '\n' : '';
    setEmergencyData({
      ...emergencyData,
      investigation: `${currentInv}${separator}${serviceName}`
    });
    setInvestigationSearch('');
    setShowInvestigationResults(false);
  };

  const handleSave = () => {
    if (!currentPatient) return;
    const recordId = editingRecordId || Date.now().toString();
    const visitDate = editingRecordId 
      ? (emergencyRecords.find(r => r.id === editingRecordId)?.visitDate || new NepaliDate().format('YYYY-MM-DD'))
      : new NepaliDate().format('YYYY-MM-DD');

    const newRecord: EmergencyRecord = {
      id: recordId,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      visitDate: visitDate,
      chiefComplaints: emergencyData.chiefComplaints || '',
      diagnosis: emergencyData.diagnosis || '',
      investigation: emergencyData.investigation || '',
      emergencyPrescriptions: emergencyPrescriptions,
      dischargePrescriptions: dischargePrescriptions,
      advice: emergencyData.advice,
      nextVisitDate: emergencyData.nextVisitDate,
      triage: emergencyData.triage as any,
      vitals: emergencyData.vitals as any
    };

    onSaveRecord(newRecord);
    alert(editingRecordId ? 'Emergency रेकर्ड अपडेट गरियो।' : 'Emergency रेकर्ड सुरक्षित गरियो।');
    
    setEmergencyData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      emergencyPrescriptions: [],
      dischargePrescriptions: [],
      advice: '',
      nextVisitDate: '',
      triage: 'Green',
      vitals: { temp: '', bp: '', pulse: '', rr: '', spo2: '' }
    });
    setEmergencyPrescriptions([]);
    setDischargePrescriptions([]);
    setEditingRecordId(null);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Emergency-${currentPatient?.uniquePatientId}`,
  });

  const filteredServices = serviceItems?.filter(item => 
    item.serviceName.toLowerCase().includes(investigationSearch.toLowerCase())
  ) || [];

  const triageColors = {
    Red: 'bg-red-500 text-white',
    Yellow: 'bg-yellow-400 text-black',
    Green: 'bg-green-500 text-white',
    Black: 'bg-black text-white'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <Siren className="text-red-600" />
          आकस्मिक सेवा (Emergency Service)
        </h2>
        <form onSubmit={handleSearch} className="flex gap-4 relative">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="मूल दर्ता नं., ID, नाम वा दर्ता नं."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-sm">
            खोज्नुहोस्
          </button>

          {showSearchResults && (
            <div className="absolute top-full left-0 mt-2 w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="font-medium text-slate-700">Search Results ({searchResults.length})</span>
                <button onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={16} /></button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map(patient => (
                  <div 
                    key={patient.id} 
                    onClick={() => selectPatient(patient)}
                    className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.age} / {patient.gender} | {patient.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono mb-1">
                          {patient.uniquePatientId} {patient.mulDartaNo && `| ${patient.mulDartaNo}`}
                        </span>
                        <p className="text-xs text-slate-500">Reg: {patient.registrationNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {patientsOnQueue.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                पर्खिरहेका बिरामीहरू (Patients on Queue): {patientsOnQueue.length}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  isMuted 
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                }`}
                title={isMuted ? "Unmute voice announcement" : "Mute voice announcement"}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isMuted ? "आवाज म्युट छ" : "आवाज अनम्युट छ"}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {patientsOnQueue.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => selectPatient(patient)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold border border-red-200 transition-all cursor-pointer"
                >
                  <User size={14} />
                  <span>{patient.name} ({patient.uniquePatientId})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <User size={18} /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">नाम:</span> <span className="font-medium">{currentPatient.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ID:</span> <span className="font-mono bg-slate-100 px-2 rounded">{currentPatient.uniquePatientId} {currentPatient.mulDartaNo && `| ${currentPatient.mulDartaNo}`}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">उमेर/लिङ्ग:</span> <span>{currentPatient.age} / {currentPatient.gender}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ठेगाना:</span> <span>{currentPatient.address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">फोन:</span> <span>{currentPatient.phone}</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <Activity size={18} className="text-blue-500" /> Vitals (शारीरिक अवस्था)
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Temp (°F)" 
                    value={emergencyData.vitals?.temp} 
                    onChange={e => setEmergencyData({...emergencyData, vitals: {...emergencyData.vitals, temp: e.target.value}})} 
                  />
                  <Input 
                    label="BP (mmHg)" 
                    value={emergencyData.vitals?.bp} 
                    onChange={e => setEmergencyData({...emergencyData, vitals: {...emergencyData.vitals, bp: e.target.value}})} 
                  />
                  <Input 
                    label="Pulse (bpm)" 
                    value={emergencyData.vitals?.pulse} 
                    onChange={e => setEmergencyData({...emergencyData, vitals: {...emergencyData.vitals, pulse: e.target.value}})} 
                  />
                  <Input 
                    label="RR (bpm)" 
                    value={emergencyData.vitals?.rr} 
                    onChange={e => setEmergencyData({...emergencyData, vitals: {...emergencyData.vitals, rr: e.target.value}})} 
                  />
                </div>
                <Input 
                  label="SpO2 (%)" 
                  value={emergencyData.vitals?.spo2} 
                  onChange={e => setEmergencyData({...emergencyData, vitals: {...emergencyData.vitals, spo2: e.target.value}})} 
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <AlertTriangle size={18} className="text-amber-500" /> Triage (प्राथमिकता)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(['Red', 'Yellow', 'Green', 'Black'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setEmergencyData({...emergencyData, triage: t})}
                    className={`py-2 rounded-lg font-bold text-sm transition-all ${emergencyData.triage === t ? 'ring-4 ring-slate-200 scale-105' : 'opacity-60'} ${triageColors[t]}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-bold text-slate-800 text-lg">Emergency परीक्षण फारम</h3>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {new NepaliDate().format('YYYY-MM-DD')}
                </span>
              </div>

              {isReadOnly && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2 font-semibold">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                  <span>सूचना: यो पुरानो रेकर्ड केवल हेर्न र प्रिन्ट गर्न मिल्ने (Read-Only) मोडमा छ। सम्पादन गर्न एडमिन हुनुपर्छ।</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                  <textarea
                    value={emergencyData.chiefComplaints}
                    onChange={(e) => setEmergencyData({...emergencyData, chiefComplaints: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    placeholder="बिरामीको मुख्य समस्याहरू लेख्नुहोस्..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">निदान (Diagnosis)</label>
                    <textarea
                      value={emergencyData.diagnosis}
                      onChange={(e) => setEmergencyData({...emergencyData, diagnosis: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                      placeholder="सम्भावित रोगको पहिचान..."
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">जाँच (Investigation)</label>
                    <div className="relative mb-2">
                       <input
                         type="text"
                         value={investigationSearch}
                         onChange={(e) => {
                           setInvestigationSearch(e.target.value);
                           setShowInvestigationResults(true);
                         }}
                         placeholder="Search Service..."
                         className="w-full p-2 pl-8 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                       />
                       <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       {showInvestigationResults && investigationSearch && (
                         <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                           {filteredServices.map(service => (
                             <div 
                               key={service.id}
                               onClick={() => handleAddInvestigation(service.serviceName)}
                               className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                             >
                               {service.serviceName}
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                    <textarea
                      value={emergencyData.investigation}
                      onChange={(e) => setEmergencyData({...emergencyData, investigation: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="border rounded-xl p-4 bg-red-50/30 border-red-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-red-700 flex items-center gap-2">
                      <Pill size={18} className="text-red-600" /> Emergency Medication (आकस्मिक औषधि)
                    </h4>
                    <button 
                      onClick={() => setShowPrescriptionForm('emergency')}
                      className="text-sm bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={16} /> औषधि थप्नुहोस्
                    </button>
                  </div>

                  {showPrescriptionForm === 'emergency' && (
                    <div className="bg-white p-4 rounded-lg border border-red-100 mb-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                          <Input 
                            label="औषधिको नाम" 
                            value={currentPrescription.medicineName} 
                            onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})} 
                            list="medicine-list"
                          />
                          <datalist id="medicine-list">
                            {medicineSuggestions.map((med, idx) => (
                              <option key={idx} value={med} />
                            ))}
                          </datalist>
                        </div>
                        <Input label="मात्रा (Dosage)" value={currentPrescription.dosage} onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})} />
                        <Input label="पटक (Frequency)" value={currentPrescription.frequency} onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})} />
                        <Input label="अवधि (Duration)" value={currentPrescription.duration} onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPrescriptionForm(null)} className="px-4 py-2 text-slate-500 rounded-lg text-sm">रद्द</button>
                        <button onClick={handleAddPrescription} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">थप्नुहोस्</button>
                      </div>
                    </div>
                  )}

                  {emergencyPrescriptions.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">औषधि</th>
                            <th className="p-3">मात्रा</th>
                            <th className="p-3">पटक</th>
                            <th className="p-3">अवधि</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {emergencyPrescriptions.map((item) => (
                            <tr key={item.id}>
                              <td className="p-3 font-medium">{item.medicineName}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">{item.frequency}</td>
                              <td className="p-3">{item.duration}</td>
                              <td className="p-3">
                                <button onClick={() => handleRemovePrescription(item.id, 'emergency')} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border rounded-xl p-4 bg-green-50/30 border-green-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-green-700 flex items-center gap-2">
                      <Pill size={18} className="text-green-600" /> Discharge Medication (डिस्चार्ज औषधि)
                    </h4>
                    <button 
                      onClick={() => setShowPrescriptionForm('discharge')}
                      className="text-sm bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={16} /> औषधि थप्नुहोस्
                    </button>
                  </div>

                  {showPrescriptionForm === 'discharge' && (
                    <div className="bg-white p-4 rounded-lg border border-green-100 mb-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                          <Input 
                            label="औषधिको नाम" 
                            value={currentPrescription.medicineName} 
                            onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})} 
                            list="medicine-list"
                          />
                          <datalist id="medicine-list">
                            {medicineSuggestions.map((med, idx) => (
                              <option key={idx} value={med} />
                            ))}
                          </datalist>
                        </div>
                        <Input label="मात्रा (Dosage)" value={currentPrescription.dosage} onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})} />
                        <Input label="पटक (Frequency)" value={currentPrescription.frequency} onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})} />
                        <Input label="अवधि (Duration)" value={currentPrescription.duration} onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPrescriptionForm(null)} className="px-4 py-2 text-slate-500 rounded-lg text-sm">रद्द</button>
                        <button onClick={handleAddPrescription} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">थप्नुहोस्</button>
                      </div>
                    </div>
                  )}

                  {dischargePrescriptions.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">औषधि</th>
                            <th className="p-3">मात्रा</th>
                            <th className="p-3">पटक</th>
                            <th className="p-3">अवधि</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dischargePrescriptions.map((item) => (
                            <tr key={item.id}>
                              <td className="p-3 font-medium">{item.medicineName}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">{item.frequency}</td>
                              <td className="p-3">{item.duration}</td>
                              <td className="p-3">
                                <button onClick={() => handleRemovePrescription(item.id, 'discharge')} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">सल्लाह / सुझाव (Advice)</label>
                  <textarea
                    value={emergencyData.advice}
                    onChange={(e) => setEmergencyData({...emergencyData, advice: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[60px]"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  {!isReadOnly && (
                    <button onClick={handleRestore} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-2 shadow-sm font-medium border border-amber-200">
                      <History size={18} /> Restore Previous
                    </button>
                  )}
                  <button onClick={handlePrint} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 shadow-sm">
                    <Printer size={18} /> प्रिन्ट (Print)
                  </button>
                  {(!editingRecordId || isAdmin) ? (
                    <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium">
                      <Save size={18} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                    </button>
                  ) : (
                    <div className="text-xs text-amber-800 font-semibold italic bg-amber-50 px-4 py-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      सम्पादन गर्न एडमिन लगइन हुनुपर्छ (Admin required to update)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All-Time Emergency Records List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base font-nepali flex items-center gap-2">
              <History className="text-indigo-600" size={20} />
              सबै आकस्मिक सेवा रेकर्डहरू (All Emergency Patient Records)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              दर्ता भएका सबै आकस्मिक बिरामीहरूको विवरण, खोजी, सम्पादन र प्रिन्ट कार्यहरू।
            </p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="नाम, ID, मिति वा निदान खोज्नुहोस्..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 bg-slate-50 hover:bg-slate-100/50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100 max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200 sticky top-0 z-10">
                <th className="p-3 text-left">मिति (Date)</th>
                <th className="p-3">सेवाग्राही विवरण (Patient Details)</th>
                <th className="p-3">प्राथमिकता (Triage)</th>
                <th className="p-3">मुख्य समस्या / निदान (Complaints & Diagnosis)</th>
                <th className="p-3">औषधिहरू (Medications)</th>
                <th className="p-3 text-right">कार्य (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedHistoryRecords.length > 0 ? (
                sortedHistoryRecords.map((record) => {
                  const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
                  
                  const emergencyCount = record.emergencyPrescriptions?.length || 0;
                  const dischargeCount = record.dischargePrescriptions?.length || 0;
                  
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                        {record.visitDate}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{patient?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 space-x-1.5">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">ID: {record.uniquePatientId}</span>
                          <span>|</span>
                          <span>{patient?.age} / {patient?.gender}</span>
                          {patient?.address && (
                            <>
                              <span>|</span>
                              <span>{patient.address}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${triageColors[record.triage || 'Green']}`}>
                          {record.triage || 'Green'}
                        </span>
                      </td>
                      <td className="p-3 max-w-[240px]">
                        {record.chiefComplaints && (
                          <div className="truncate text-slate-600" title={`Complaints: ${record.chiefComplaints}`}>
                            <span className="font-semibold text-slate-500">समस्या:</span> {record.chiefComplaints}
                          </div>
                        )}
                        {record.diagnosis && (
                          <div className="truncate text-slate-700 font-medium mt-0.5" title={`Diagnosis: ${record.diagnosis}`}>
                            <span className="font-semibold text-slate-500">निदान:</span> {record.diagnosis}
                          </div>
                        )}
                        {!record.chiefComplaints && !record.diagnosis && <span className="text-slate-400 italic">No entry</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5 text-[10px]">
                          {emergencyCount > 0 && (
                            <span className="text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded w-fit">
                              Emergency: {emergencyCount}
                            </span>
                          )}
                          {dischargeCount > 0 && (
                            <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                              Discharge: {dischargeCount}
                            </span>
                          )}
                          {emergencyCount === 0 && dischargeCount === 0 && (
                            <span className="text-slate-400 italic">No prescriptions</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => printRecordDirectly(record)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="प्रिन्ट गर्नुहोस् (Print)"
                        >
                          <Printer size={14} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleLoadRecord(record, false)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="विवरण हेर्नुहोस् (View Details)"
                        >
                          <Eye size={14} />
                        </button>

                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleLoadRecord(record, true)}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                              title="सम्पादन गर्नुहोस् (Edit - Admin Only)"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('के तपाईं यो आकस्मिक सेवा रेकर्ड हटाउन निश्चित हुनुहुन्छ? यो फिर्ता गर्न सकिने छैन।')) {
                                  onDeleteRecord(record.id);
                                  if (editingRecordId === record.id) {
                                    setEmergencyData({
                                      chiefComplaints: '',
                                      diagnosis: '',
                                      investigation: '',
                                      emergencyPrescriptions: [],
                                      dischargePrescriptions: [],
                                      advice: '',
                                      nextVisitDate: '',
                                      triage: 'Green',
                                      vitals: { temp: '', bp: '', pulse: '', rr: '', spo2: '' }
                                    });
                                    setEmergencyPrescriptions([]);
                                    setDischargePrescriptions([]);
                                    setEditingRecordId(null);
                                  }
                                }
                              }}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                              title="हटाउनुहोस् (Delete - Admin Only)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium italic">
                    कुनै रेकर्ड फेला परेन (No records found)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block">
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-300">
                <Siren size={32} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{currentUser?.organizationName || 'स्वास्थ्य संस्थाको नाम'}</h1>
                <p className="text-sm text-slate-600">Emergency Department</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {new NepaliDate().format('YYYY-MM-DD')}</p>
              <p><strong>Triage:</strong> <span className="font-bold">{emergencyData.triage}</span></p>
            </div>
          </div>

          {currentPatient && (
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
              <div><span className="font-bold text-slate-600">Name:</span> {currentPatient.name}</div>
              <div><span className="font-bold text-slate-600">Age/Sex:</span> {currentPatient.age} / {currentPatient.gender}</div>
              <div><span className="font-bold text-slate-600">PID:</span> {currentPatient.uniquePatientId} {currentPatient.mulDartaNo && `| Mul Darta No: ${currentPatient.mulDartaNo}`}</div>
              {emergencyData.vitals && (
                <div className="col-span-2 mt-2 pt-2 border-t border-slate-200 grid grid-cols-5 gap-2 text-[10px]">
                  <div><span className="font-bold">Temp:</span> {emergencyData.vitals.temp}</div>
                  <div><span className="font-bold">BP:</span> {emergencyData.vitals.bp}</div>
                  <div><span className="font-bold">Pulse:</span> {emergencyData.vitals.pulse}</div>
                  <div><span className="font-bold">RR:</span> {emergencyData.vitals.rr}</div>
                  <div><span className="font-bold">SpO2:</span> {emergencyData.vitals.spo2}</div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6 mb-8">
            {emergencyData.chiefComplaints && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Chief Complaints</h4>
                <p className="text-sm whitespace-pre-wrap">{emergencyData.chiefComplaints}</p>
              </div>
            )}
            {emergencyData.diagnosis && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Diagnosis</h4>
                <p className="text-sm whitespace-pre-wrap">{emergencyData.diagnosis}</p>
              </div>
            )}
            {emergencyData.investigation && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1 text-xs">Investigations</h4>
                <p className="text-xs whitespace-pre-wrap">{emergencyData.investigation}</p>
              </div>
            )}
          </div>

          {emergencyPrescriptions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-red-800 border-b-2 border-red-800 mb-4 pb-1">Emergency Medication</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="py-2 font-bold">Medicine</th>
                    <th className="py-2 font-bold">Dosage</th>
                    <th className="py-2 font-bold">Freq.</th>
                    <th className="py-2 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencyPrescriptions.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3">{item.medicineName}</td>
                      <td className="py-3">{item.dosage}</td>
                      <td className="py-3">{item.frequency}</td>
                      <td className="py-3">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dischargePrescriptions.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-green-800 border-b-2 border-green-800 mb-4 pb-1">Discharge Medication</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="py-2 font-bold">Medicine</th>
                    <th className="py-2 font-bold">Dosage</th>
                    <th className="py-2 font-bold">Freq.</th>
                    <th className="py-2 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {dischargePrescriptions.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3">{item.medicineName}</td>
                      <td className="py-3">{item.dosage}</td>
                      <td className="py-3">{item.frequency}</td>
                      <td className="py-3">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-auto pt-8">
            <div className="flex justify-between items-end mt-12 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-400">Printed on: {new Date().toLocaleString()}</div>
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 w-48 mb-2"></div>
                <p className="text-sm font-bold text-slate-700">Medical Officer Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
