import React, { useState, useMemo } from 'react';
import { Search, Save, Plus, Trash2, User, Calendar, Building2, Clock, FileText, History, X, Settings, Bed, Info, CheckCircle2, AlertCircle, Pill, PlusCircle } from 'lucide-react';
import { ServiceSeekerRecord, IPDRecord, OrganizationSettings, WardConfig, Medication } from '../types/coreTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface IPDSewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  ipdRecords?: IPDRecord[];
  opdRecords?: any[];
  emergencyRecords?: any[];
  labReports?: any[];
  billingRecords?: any[];
  onSaveRecord: (record: IPDRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onDeleteAllRecords: () => void;
  currentFiscalYear: string;
  currentUser: any;
  generalSettings: OrganizationSettings;
  onUpdateSettings: (settings: OrganizationSettings) => void;
}

export const IPDSewa: React.FC<IPDSewaProps> = ({ 
  serviceSeekerRecords = [], 
  ipdRecords = [], 
  opdRecords = [],
  emergencyRecords = [],
  labReports = [],
  billingRecords = [],
  onSaveRecord, 
  onDeleteRecord, 
  onDeleteAllRecords,
  currentFiscalYear,
  currentUser,
  generalSettings,
  onUpdateSettings
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'admission' | 'history' | 'status'>('status');
  const [showSettings, setShowSettings] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState<IPDRecord | null>(null);
  
  const [ipdData, setIpdData] = useState<Partial<IPDRecord>>({
    admissionDate: new NepaliDate().format('YYYY-MM-DD'),
    admissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bedNumber: '',
    wardName: '',
    provisionalDiagnosis: '',
    chiefComplaints: '',
    historyOfPresentIllness: '',
    medications: [],
    dischargeMedications: [],
    status: 'Admitted'
  });
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const canDeletePatient = (serviceSeekerId: string) => {
    const hasOPD = opdRecords.some(r => r.serviceSeekerId === serviceSeekerId);
    const hasEmergency = emergencyRecords.some(r => r.serviceSeekerId === serviceSeekerId);
    const hasLab = labReports.some(r => r.serviceSeekerId === serviceSeekerId);
    const hasBilling = billingRecords.some(r => r.serviceSeekerId === serviceSeekerId);
    return !(hasOPD || hasEmergency || hasLab || hasBilling);
  };

  const handleDelete = (admission: IPDRecord) => {
    if (currentUser?.role !== 'admin') {
      alert('तपाईंलाई यो रेकर्ड मेटाउने अनुमति छैन।');
      return;
    }

    const patientExists = serviceSeekerRecords.some(p => p.id === admission.serviceSeekerId);

    if (patientExists && !canDeletePatient(admission.serviceSeekerId)) {
      alert('यो बिरामीको अन्य सेवाहरूमा रेकर्ड छ, त्यसैले मेटाउन मिल्दैन।');
      return;
    }

    if (window.confirm('के तपाईं यो भर्ना रेकर्ड मेटाउन निश्चित हुनुहुन्छ?')) {
      onDeleteRecord(admission.id);
      setShowPatientDetails(null);
    }
  };

  const wards = useMemo(() => generalSettings.ipdWards || [], [generalSettings.ipdWards]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => 
      r.uniquePatientId.toLowerCase().includes(query) || 
      r.registrationNumber?.toLowerCase().includes(query) ||
      r.name.toLowerCase().includes(query) ||
      r.phone?.includes(query)
    );
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    setCurrentPatient(patient);
    setShowSearchResults(false);
    setSearchId(patient.uniquePatientId);
    
    // Check if patient is already admitted
    const activeAdmission = ipdRecords.find(r => r.serviceSeekerId === patient.id && r.status === 'Admitted');
    if (activeAdmission) {
      setIpdData(activeAdmission);
      setEditingRecordId(activeAdmission.id);
    } else {
      setIpdData({
        ...ipdData,
        admissionDate: new NepaliDate().format('YYYY-MM-DD'),
        admissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        // Preserve ward and bed if they were already selected via bed click
        wardName: ipdData.wardName || '',
        bedNumber: ipdData.bedNumber || '',
        provisionalDiagnosis: '',
        chiefComplaints: '',
        historyOfPresentIllness: '',
        medications: [],
        dischargeMedications: [],
        status: 'Admitted'
      });
      setEditingRecordId(null);
    }
    setActiveTab('admission');
  };

  const handleSave = () => {
    if (!currentPatient) {
      alert('कृपया पहिले बिरामी छान्नुहोस्');
      return;
    }

    if (!ipdData.wardName || !ipdData.bedNumber) {
      alert('कृपया वार्ड र बेड नम्बर छान्नुहोस्');
      return;
    }

    // Check if bed is already occupied by another patient
    const isBedOccupied = activeAdmissions.some(r => 
      r.wardName === ipdData.wardName && 
      r.bedNumber === ipdData.bedNumber && 
      r.id !== editingRecordId
    );

    if (isBedOccupied && ipdData.status === 'Admitted') {
      alert('यो बेड पहिले नै अर्को बिरामीले ओगटेको छ। कृपया अर्को बेड छान्नुहोस्।');
      return;
    }

    const record: IPDRecord = {
      ...ipdData as IPDRecord,
      id: editingRecordId || Math.random().toString(36).substr(2, 9),
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      createdBy: currentUser?.id
    };

    // If status is not Admitted (e.g., Discharged, Referred, LAMA, Death), clear the bed assignment
    if (record.status !== 'Admitted') {
      record.wardName = '';
      record.bedNumber = '';
    }

    onSaveRecord(record);
    alert('IPD रेकर्ड सुरक्षित गरियो');
    
    // Reset form for next admission
    setCurrentPatient(null);
    setSearchId('');
    setIpdData({
      admissionDate: new NepaliDate().format('YYYY-MM-DD'),
      admissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bedNumber: '',
      wardName: '',
      provisionalDiagnosis: '',
      chiefComplaints: '',
      historyOfPresentIllness: '',
      medications: [],
      dischargeMedications: [],
      status: 'Admitted'
    });
    setEditingRecordId(null);
    setActiveTab('status');
  };

  const activeAdmissions = useMemo(() => {
    return ipdRecords.filter(r => r.status === 'Admitted');
  }, [ipdRecords]);

  const getBedStatus = (wardName: string, bedNo: string) => {
    return activeAdmissions.find(r => r.wardName === wardName && r.bedNumber === bedNo);
  };

  const handleBedClick = (ward: WardConfig, bedIndex: number) => {
    const bedNo = (bedIndex + 1).toString();
    const admission = getBedStatus(ward.name, bedNo);
    
    if (admission) {
      setShowPatientDetails(admission);
    } else {
      setIpdData({
        ...ipdData,
        wardName: ward.name,
        bedNumber: bedNo,
        admissionDate: new NepaliDate().format('YYYY-MM-DD'),
        admissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Admitted'
      });
      setActiveTab('admission');
    }
  };

  const handleSaveWards = (newWards: WardConfig[]) => {
    onUpdateSettings({
      ...generalSettings,
      ipdWards: newWards
    });
    setShowSettings(false);
  };

  const patientHistory = useMemo(() => {
    if (!currentPatient) return [];
    return ipdRecords.filter(r => r.serviceSeekerId === currentPatient.id).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate));
  }, [currentPatient, ipdRecords]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-primary-600" /> आई.पी.डी. सेवा (IPD Service)
        </h2>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
          title="Ward Settings"
        >
          <Settings size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Patient Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Search size={18} className="text-primary-600" /> बिरामी खोज्नुहोस्
            </h3>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="ID, नाम वा फोन नम्बर..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <button type="submit" className="hidden">Search</button>
            </form>

            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden shadow-lg bg-white absolute z-10 w-64">
                {searchResults.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <p className="font-bold text-slate-800">{patient.name}</p>
                    <p className="text-xs text-slate-500">
                      {patient.uniquePatientId} {patient.mulDartaNo && `| Mul Darta: ${patient.mulDartaNo}`} {patient.registrationNumber ? `• Reg: ${patient.registrationNumber}` : ''} • {patient.phone}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentPatient && (
            <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 animate-in slide-in-from-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {currentPatient.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{currentPatient.name}</h4>
                  <p className="text-xs text-primary-700 font-medium">{currentPatient.uniquePatientId} {currentPatient.mulDartaNo && `| ${currentPatient.mulDartaNo}`}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">उमेर/लिङ्ग:</span>
                  <span className="font-medium">{currentPatient.age} / {currentPatient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ठेगाना:</span>
                  <span className="font-medium">{currentPatient.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">फोन:</span>
                  <span className="font-medium">{currentPatient.phone}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Admission Form & History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/50">
              <button 
                onClick={() => setActiveTab('status')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'status' ? 'bg-white text-primary-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <Bed size={16} /> बेड अवस्था (Bed Status)
              </button>
              <button 
                onClick={() => setActiveTab('admission')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'admission' ? 'bg-white text-primary-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <Plus size={16} /> भर्ना (Admission)
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <History size={16} /> इतिहास (History)
              </button>
              <button 
                onClick={() => setActiveTab('all-patients')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'all-patients' ? 'bg-white text-primary-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <User size={16} /> सबै बिरामी (All Patients)
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'all-patients' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                        type="text"
                        placeholder="दर्ता नं, बिरामी ID वा नामबाट खोज्नुहोस्..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    {currentUser?.role === 'admin' && (
                        <button onClick={onDeleteAllRecords} className="ml-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold shadow-sm hover:bg-red-700">
                            <Trash2 size={18} /> सबै मेटाउनुहोस्
                        </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">ID / Name</th>
                          <th className="p-3">भर्ना मिति</th>
                          <th className="p-3">अवस्था</th>
                          <th className="p-3 text-right">कार्य</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ipdRecords
                          .filter(r => 
                            r.uniquePatientId.toLowerCase().includes(searchId.toLowerCase()) ||
                            r.patientName.toLowerCase().includes(searchId.toLowerCase())
                          )
                          .map(record => (
                            <tr key={record.id} className="hover:bg-slate-50">
                              <td className="p-3">
                                <div className="font-bold text-slate-800">{record.patientName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {record.uniquePatientId} 
                                  {serviceSeekerRecords.find(p => p.id === record.serviceSeekerId)?.mulDartaNo && ` | ${serviceSeekerRecords.find(p => p.id === record.serviceSeekerId)?.mulDartaNo}`}
                                </div>
                              </td>
                              <td className="p-3">{record.admissionDate}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${record.status === 'Admitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => setShowPatientDetails(record)}
                                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                                >
                                  <Info size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'status' && (
                <div className="space-y-8">
                  {wards.length > 0 ? (
                    wards.map(ward => (
                      <div key={ward.id} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <Building2 size={18} className="text-primary-500" /> {ward.name}
                            <span className="text-xs font-normal text-slate-400">({ward.bedCount} Beds)</span>
                          </h4>
                          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Available</span>
                            <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> Occupied</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                          {Array.from({ length: ward.bedCount }).map((_, idx) => {
                            const bedNo = (idx + 1).toString();
                            const admission = getBedStatus(ward.name, bedNo);
                            return (
                              <button
                                key={idx}
                                onClick={() => handleBedClick(ward, idx)}
                                className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group ${
                                  admission 
                                    ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-400 shadow-sm' 
                                    : 'border-emerald-100 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100/50'
                                }`}
                              >
                                <Bed size={24} className={admission ? 'text-red-500' : 'text-emerald-500'} />
                                <span className="text-[10px] font-black">{bedNo}</span>
                                {admission && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                  <Info size={14} className={admission ? 'text-red-400' : 'text-emerald-400'} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Settings size={48} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">वार्ड सेटअप गरिएको छैन। सेटिङमा गएर वार्ड थप्नुहोस्।</p>
                      <button 
                        onClick={() => setShowSettings(true)}
                        className="mt-4 text-primary-600 font-bold hover:underline"
                      >
                        वार्ड सेटअप गर्नुहोस्
                      </button>
                    </div>
                  )}

                  {/* Current Admitted Patients List */}
                  {activeAdmissions.length > 0 && (
                    <div className="mt-12 space-y-4">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                        <User size={18} className="text-primary-600" /> हाल भर्ना भएका बिरामीहरू (Currently Admitted Patients)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left responsive-table">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">ID / Name</th>
                              <th className="p-3">वार्ड / बेड</th>
                              <th className="p-3">भर्ना मिति</th>
                              <th className="p-3">निदान (Diagnosis)</th>
                              <th className="p-3 text-right">कार्य</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeAdmissions.map(admission => (
                              <tr key={admission.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3" data-label="Patient">
                                  <div className="font-bold text-slate-800">{admission.patientName}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {admission.uniquePatientId}
                                    {serviceSeekerRecords.find(p => p.id === admission.serviceSeekerId)?.mulDartaNo && ` | ${serviceSeekerRecords.find(p => p.id === admission.serviceSeekerId)?.mulDartaNo}`}
                                  </div>
                                </td>
                                <td className="p-3" data-label="Ward/Bed">
                                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs border border-indigo-100">
                                    {admission.wardName} - {admission.bedNumber}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600" data-label="Date">{admission.admissionDate}</td>
                                <td className="p-3 text-slate-600 italic" data-label="Diagnosis">{admission.provisionalDiagnosis || '-'}</td>
                                <td className="p-3 text-right" data-label="Actions">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => setShowPatientDetails(admission)}
                                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                      title="View Details"
                                    >
                                      <Info size={16} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const patient = serviceSeekerRecords.find(p => p.id === admission.serviceSeekerId);
                                        if (patient) {
                                          setCurrentPatient(patient);
                                          setSearchId(patient.uniquePatientId);
                                          setIpdData(admission);
                                          setEditingRecordId(admission.id);
                                          setActiveTab('admission');
                                        }
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit / Discharge"
                                    >
                                      <FileText size={16} />
                                    </button>
                                    {currentUser?.role === 'admin' && (
                                      <button 
                                        onClick={() => handleDelete(admission)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Record"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'admission' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input 
                        label="भर्ना मिति (Admission Date)" 
                        type="text" 
                        value={ipdData.admissionDate}
                        onChange={(e) => setIpdData({...ipdData, admissionDate: e.target.value})}
                      />
                      <Input 
                        label="भर्ना समय (Time)" 
                        type="time" 
                        value={ipdData.admissionTime}
                        onChange={(e) => setIpdData({...ipdData, admissionTime: e.target.value})}
                      />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">वार्ड (Ward)</label>
                        <select 
                          value={ipdData.wardName}
                          onChange={(e) => setIpdData({...ipdData, wardName: e.target.value})}
                          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">वार्ड छान्नुहोस्</option>
                          {wards.map(w => (
                            <option key={w.id} value={w.name}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <Input 
                        label="बेड नम्बर (Bed No.)" 
                        value={ipdData.bedNumber}
                        onChange={(e) => setIpdData({...ipdData, bedNumber: e.target.value})}
                        placeholder="Ex: 101"
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                        <textarea
                          value={ipdData.chiefComplaints}
                          onChange={(e) => setIpdData({...ipdData, chiefComplaints: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                          placeholder="बिरामीको मुख्य समस्याहरू..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">हालको रोगको इतिहास (History of Present Illness)</label>
                        <textarea
                          value={ipdData.historyOfPresentIllness}
                          onChange={(e) => setIpdData({...ipdData, historyOfPresentIllness: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                          placeholder="रोगको विस्तृत इतिहास..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">प्रारम्भिक निदान (Provisional Diagnosis)</label>
                        <textarea
                          value={ipdData.provisionalDiagnosis}
                          onChange={(e) => setIpdData({...ipdData, provisionalDiagnosis: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[60px]"
                          placeholder="निदान..."
                        />
                      </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">अवस्था (Status)</label>
                            <select 
                                value={ipdData.status}
                                onChange={(e) => setIpdData({...ipdData, status: e.target.value as any})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="Admitted">Admitted (भर्ना)</option>
                                <option value="Discharged">Discharged (डिस्चार्ज)</option>
                                <option value="Referred">Referred (रिफर)</option>
                                <option value="LAMA">LAMA</option>
                                <option value="Death">Death (मृत्यु)</option>
                            </select>
                        </div>
                        {ipdData.status !== 'Admitted' && (
                            <Input 
                                label="डिस्चार्ज मिति (Discharge Date)" 
                                type="text" 
                                value={ipdData.dischargeDate || new NepaliDate().format('YYYY-MM-DD')}
                                onChange={(e) => setIpdData({...ipdData, dischargeDate: e.target.value})}
                            />
                        )}
                    </div>

                    {/* Medications Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Pill size={18} className="text-primary-600" /> औषधिहरू (Medications)
                      </h4>
                      <MedicationManager 
                        medications={ipdData.medications || []}
                        onChange={(meds) => setIpdData({...ipdData, medications: meds})}
                        label="भर्ना हुँदाको औषधि (Admission Medication)"
                      />
                    </div>

                    {ipdData.status !== 'Admitted' && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Pill size={18} className="text-orange-600" /> डिस्चार्ज औषधि (Discharge Medications)
                        </h4>
                        <MedicationManager 
                          medications={ipdData.dischargeMedications || []}
                          onChange={(meds) => setIpdData({...ipdData, dischargeMedications: meds})}
                          label="डिस्चार्ज हुँदाको औषधि (Discharge Medication)"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button 
                      onClick={handleSave}
                      className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 flex items-center gap-2 shadow-lg shadow-primary-200 transition-all font-bold"
                    >
                      <Save size={20} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'भर्ना गर्नुहोस्'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {patientHistory.length > 0 ? (
                    <div className="space-y-4">
                      {patientHistory.map(record => (
                        <div key={record.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-2">
                                <Calendar size={14} className="text-primary-600" /> {record.admissionDate}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${record.status === 'Admitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {record.status}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">Ward: {record.wardName} • Bed: {record.bedNumber}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setIpdData(record); setEditingRecordId(record.id); setActiveTab('admission'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FileText size={16} /></button>
                              <button onClick={() => onDeleteRecord(record.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Diagnosis</p>
                            <p className="text-sm text-slate-700">{record.provisionalDiagnosis}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <History size={48} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">कुनै इतिहास भेटिएन</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ward Settings Modal */}
      {showSettings && (
        <WardSettingsModal 
          initialWards={wards}
          activeAdmissions={activeAdmissions}
          onSave={handleSaveWards}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-primary-600 p-6 text-white flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{showPatientDetails.patientName}</h3>
                <p className="text-primary-100 text-sm">
                  {showPatientDetails.uniquePatientId}
                  {serviceSeekerRecords.find(p => p.id === showPatientDetails.serviceSeekerId)?.mulDartaNo && ` | Mul Darta No: ${serviceSeekerRecords.find(p => p.id === showPatientDetails.serviceSeekerId)?.mulDartaNo}`}
                </p>
              </div>
              <button onClick={() => setShowPatientDetails(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ward / Bed</p>
                  <p className="font-bold text-slate-700">{showPatientDetails.wardName} - {showPatientDetails.bedNumber}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Admission Date</p>
                  <p className="font-bold text-slate-700">{showPatientDetails.admissionDate}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Chief Complaints</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {showPatientDetails.chiefComplaints || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">History of Present Illness</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {showPatientDetails.historyOfPresentIllness || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Provisional Diagnosis</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {showPatientDetails.provisionalDiagnosis || 'N/A'}
                </p>
              </div>

              {showPatientDetails.medications && showPatientDetails.medications.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Pill size={12} className="text-primary-600" /> Current Medications
                  </p>
                  <div className="space-y-2">
                    {showPatientDetails.medications.map(m => (
                      <div key={m.id} className="text-xs p-3 bg-primary-50 rounded-xl border border-primary-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-primary-600">{m.route}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary-700">{m.dosage}</p>
                          <p className="text-[10px] text-primary-600">{m.frequency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showPatientDetails.dischargeMedications && showPatientDetails.dischargeMedications.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Pill size={12} className="text-orange-600" /> Discharge Medications
                  </p>
                  <div className="space-y-2">
                    {showPatientDetails.dischargeMedications.map(m => (
                      <div key={m.id} className="text-xs p-3 bg-orange-50 rounded-xl border border-orange-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-orange-600">{m.route}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-700">{m.dosage}</p>
                          <p className="text-[10px] text-orange-600">{m.frequency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 sticky bottom-0 bg-white pt-4">
                <button 
                  onClick={() => {
                    const patient = serviceSeekerRecords.find(r => r.id === showPatientDetails.serviceSeekerId);
                    if (patient) {
                      setCurrentPatient(patient);
                      setSearchId(patient.uniquePatientId);
                      setIpdData(showPatientDetails);
                      setEditingRecordId(showPatientDetails.id);
                      setActiveTab('admission');
                    }
                    setShowPatientDetails(null);
                  }}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100"
                >
                  View / Edit
                </button>
                {currentUser?.role === 'admin' && (
                  <button 
                    onClick={() => handleDelete(showPatientDetails)}
                    className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all"
                  >
                    Delete
                  </button>
                )}
                <button 
                  onClick={() => setShowPatientDetails(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MedicationManagerProps {
  medications: Medication[];
  onChange: (meds: Medication[]) => void;
  label: string;
}

const MedicationManager: React.FC<MedicationManagerProps> = ({ medications, onChange, label }) => {
  const addMedication = () => {
    const newMed: Medication = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      dosage: '',
      frequency: '',
      route: '',
      startDate: new NepaliDate().format('YYYY-MM-DD')
    };
    onChange([...medications, newMed]);
  };

  const removeMedication = (id: string) => {
    onChange(medications.filter(m => m.id !== id));
  };

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    onChange(medications.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  return (
    <div className="space-y-3">
      {medications.length > 0 ? (
        <div className="space-y-2">
          {medications.map((med, index) => (
            <div key={med.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
              <div className="sm:col-span-4">
                <input 
                  placeholder="औषधिको नाम (Medicine Name)"
                  value={med.name}
                  onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <input 
                  placeholder="मात्रा (Dosage)"
                  value={med.dosage}
                  onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <input 
                  placeholder="पटक (Freq)"
                  value={med.frequency}
                  onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <input 
                  placeholder="विधि (Route)"
                  value={med.route}
                  onChange={(e) => updateMedication(med.id, 'route', e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-1">
                <input 
                  type="text"
                  placeholder="मिति"
                  value={med.startDate}
                  onChange={(e) => updateMedication(med.id, 'startDate', e.target.value)}
                  className="w-full text-[10px] p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500"
                />
                <button 
                  onClick={() => removeMedication(med.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic py-2">कुनै औषधि थपिएको छैन।</p>
      )}
      <button 
        onClick={addMedication}
        className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-primary-50 transition-all"
      >
        <PlusCircle size={14} /> औषधि थप्नुहोस् (Add Medication)
      </button>
    </div>
  );
};

interface WardSettingsModalProps {
  initialWards: WardConfig[];
  activeAdmissions: IPDRecord[];
  onSave: (wards: WardConfig[]) => void;
  onClose: () => void;
}

const WardSettingsModal: React.FC<WardSettingsModalProps> = ({ initialWards, activeAdmissions, onSave, onClose }) => {
  const [wards, setWards] = useState<WardConfig[]>(initialWards);

  const addWard = () => {
    const newWard: WardConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      bedCount: 0
    };
    setWards([...wards, newWard]);
  };

  const removeWard = (ward: WardConfig) => {
    const isOccupied = activeAdmissions.some(a => a.wardName === ward.name);
    if (isOccupied) {
      alert(`यो वार्ड (${ward.name}) मा बिरामीहरू भर्ना भएका छन्, त्यसैले मेटाउन मिल्दैन।`);
      return;
    }
    setWards(wards.filter(w => w.id !== ward.id));
  };

  const updateWard = (id: string, field: keyof WardConfig, value: any) => {
    setWards(wards.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-primary-600" /> Ward & Bed Configuration
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {wards.map((ward, index) => (
            <div key={ward.id} className="flex gap-4 items-end p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex-1">
                <Input 
                  label={`Ward Name #${index + 1}`}
                  value={ward.name}
                  onChange={(e) => updateWard(ward.id, 'name', e.target.value)}
                  placeholder="Ex: General Ward"
                />
              </div>
              <div className="w-32">
                <Input 
                  label="Bed Count"
                  type="number"
                  value={ward.bedCount.toString()}
                  onChange={(e) => updateWard(ward.id, 'bedCount', parseInt(e.target.value) || 0)}
                />
              </div>
              <button 
                onClick={() => removeWard(ward)}
                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all mb-1"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          <button 
            onClick={addWard}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 font-bold"
          >
            <Plus size={20} /> Add New Ward
          </button>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
          <button 
            onClick={() => onSave(wards)}
            className="px-8 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
