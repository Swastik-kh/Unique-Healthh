import React, { useState, useRef, useMemo } from 'react';
import { Search, Save, Printer, Plus, Trash2, FileText, User, Calendar, Stethoscope, Activity, Pill, FlaskConical, History, X } from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord, PrescriptionItem, ServiceItem, LabReport, OrganizationSettings } from '../types/coreTypes';
import { XRayRecord, ECGRecord, USGRecord, PhysiotherapyRecord, TBPatient } from '../types';
import { InventoryItem } from '../types/inventoryTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';
import { PrescriptionPrint } from './PrescriptionPrint';
import { MedicineSlipPrint } from './MedicineSlipPrint';

interface OPDSewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  opdRecords?: OPDRecord[];
  tbPatients?: TBPatient[];
  onUpdateTbPatient?: (patient: TBPatient) => void;
  onSaveRecord: (record: OPDRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  generalSettings: OrganizationSettings;
  serviceItems?: ServiceItem[];
  inventoryItems?: InventoryItem[];
  labReports?: LabReport[];
  xrayRecords?: XRayRecord[];
  ecgRecords?: ECGRecord[];
  usgRecords?: USGRecord[];
  physiotherapyRecords?: PhysiotherapyRecord[];
  onSaveLabReport?: (record: LabReport) => void;
  onSaveXRayRecord?: (record: XRayRecord) => void;
  onSaveECGRecord?: (record: ECGRecord) => void;
  onSaveUSGRecord?: (record: USGRecord) => void;
  onSavePhysiotherapyRecord?: (record: PhysiotherapyRecord) => void;
}

const initialPrescriptionItem: PrescriptionItem = {
  id: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export const OPDSewa: React.FC<OPDSewaProps> = ({ 
  serviceSeekerRecords = [], 
  opdRecords = [], 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser,
  generalSettings,
  serviceItems = [],
  inventoryItems = [],
  labReports = [],
  xrayRecords = [],
  ecgRecords = [],
  usgRecords = [],
  physiotherapyRecords = [],
  onSaveLabReport,
  onSaveXRayRecord,
  onSaveECGRecord,
  onSaveUSGRecord,
  onSavePhysiotherapyRecord
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'reports'>('form');
  const [opdData, setOpdData] = useState<Partial<OPDRecord>>({
    chiefComplaints: '',
    diagnosis: '',
    investigation: '',
    prescriptions: [],
    advice: '',
    nextVisitDate: ''
  });
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem>(initialPrescriptionItem);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const medicineSuggestions = useMemo(() => {
    const fromInventory = inventoryItems.map(i => i.itemName);
    const fromRecords = opdRecords.flatMap(r => r.prescriptions?.map(p => p.medicineName) || []);
    return Array.from(new Set([...fromInventory, ...fromRecords])).filter(Boolean).sort();
  }, [inventoryItems, opdRecords]);
  
  // Investigation Search State
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [showInvestigationResults, setShowInvestigationResults] = useState(false);
  
  // Patient Reports
  const patientReports = useMemo(() => {
    if (!currentPatient) return [];
    
    const labs = labReports.filter(r => r.serviceSeekerId === currentPatient.id).map(r => ({ ...r, type: 'Lab' as const, date: r.reportDate }));
    const xrays = xrayRecords.filter(r => r.serviceSeekerId === currentPatient.id).map(r => ({ ...r, type: 'X-Ray' as const, date: r.dateBs }));
    const ecgs = ecgRecords.filter(r => r.serviceSeekerId === currentPatient.id).map(r => ({ ...r, type: 'ECG' as const, date: r.dateBs }));
    const usgs = usgRecords.filter(r => r.serviceSeekerId === currentPatient.id).map(r => ({ ...r, type: 'USG' as const, date: r.dateBs }));
    const physios = physiotherapyRecords.filter(r => r.serviceSeekerId === currentPatient.id).map(r => ({ ...r, type: 'Physio' as const, date: r.dateBs }));

    return [...labs, ...xrays, ...ecgs, ...usgs, ...physios].sort((a, b) => b.date.localeCompare(a.date));
  }, [currentPatient, labReports, xrayRecords, ecgRecords, usgRecords, physiotherapyRecords]);

  const unviewedCount = useMemo(() => {
    return patientReports.filter((r: any) => !r.isViewedByDoctor).length;
  }, [patientReports]);

  const printRef = useRef<HTMLDivElement>(null);
  const medicineSlipPrintRef = useRef<HTMLDivElement>(null);
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Prescription-${currentPatient?.uniquePatientId}`,
  });

  const handlePrintMedicineSlip = useReactToPrint({
    contentRef: medicineSlipPrintRef,
    documentTitle: `MedicineSlip-${currentPatient?.uniquePatientId}`,
  });

  const handlePrintReport = useReactToPrint({
    contentRef: reportPrintRef,
    documentTitle: `Report-${selectedReport?.patientName}`,
  });

  const todayNepaliDate = useMemo(() => new NepaliDate().format('YYYY-MM-DD'), []);

  const todaysOPDRecords = useMemo(() => {
    return opdRecords
      .filter(r => r.visitDate === todayNepaliDate && r.fiscalYear === currentFiscalYear)
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [opdRecords, todayNepaliDate, currentFiscalYear]);

  const handleSelectAndPrint = (record: OPDRecord) => {
    const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
    if (patient) {
      setCurrentPatient(patient);
      setOpdData(record);
      setPrescriptionItems(record.prescriptions || []);
      setEditingRecordId(record.id);
      // Wait for state to update then print
      setTimeout(() => {
        handlePrint();
      }, 100);
    }
  };

  const markAsViewed = (report: any) => {
    if (report.isViewedByDoctor) return;

    const updatedReport = { ...report, isViewedByDoctor: true };
    // Remove the 'type' and 'date' helper properties before saving
    const { type, date, ...cleanReport } = updatedReport;

    switch (report.type) {
      case 'Lab':
        onSaveLabReport?.(cleanReport as LabReport);
        break;
      case 'X-Ray':
        onSaveXRayRecord?.(cleanReport as XRayRecord);
        break;
      case 'ECG':
        onSaveECGRecord?.(cleanReport as ECGRecord);
        break;
      case 'USG':
        onSaveUSGRecord?.(cleanReport as USGRecord);
        break;
      case 'Physio':
        onSavePhysiotherapyRecord?.(cleanReport as PhysiotherapyRecord);
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = r.uniquePatientId.toLowerCase().includes(query) || 
                      r.uniquePatientId.replace(/[^0-9]/g, '').includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      const regMatch = r.registrationNumber.includes(query);
      return idMatch || nameMatch || regMatch;
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
    setCurrentPatient(patient);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchId('');
    setActiveTab('form');
    // Reset form for new visit
    setOpdData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: ''
    });
    setPrescriptionItems([]);
    setEditingRecordId(null);
  };

  const handleRestore = () => {
    if (!currentPatient) return;
    
    // Filter records for this patient
    const patientRecords = opdRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId);
    
    if (patientRecords.length === 0) {
      alert('यो बिरामीको कुनै पुरानो रेकर्ड भेटिएन।');
      return;
    }

    // Sort by date descending (assuming ID is timestamp based or use visitDate)
    const sortedRecords = [...patientRecords].sort((a, b) => {
        // Sort by ID descending (newest first) as ID is timestamp
        return b.id.localeCompare(a.id);
    });

    const latestRecord = sortedRecords[0];

    setOpdData({
      chiefComplaints: latestRecord.chiefComplaints,
      diagnosis: latestRecord.diagnosis,
      investigation: latestRecord.investigation,
      prescriptions: latestRecord.prescriptions || [],
      advice: latestRecord.advice,
      nextVisitDate: latestRecord.nextVisitDate
    });
    setPrescriptionItems(latestRecord.prescriptions || []);
    setEditingRecordId(latestRecord.id);
    alert(`पुरानो रेकर्ड (मिति: ${latestRecord.visitDate}) रिस्टोर गरियो। अब सेभ गर्दा यो रेकर्ड अपडेट हुनेछ।`);
  };

  const handleAddPrescription = () => {
    if (!currentPrescription.medicineName) return;
    const newItem = { ...currentPrescription, id: Date.now().toString() };
    setPrescriptionItems([...prescriptionItems, newItem]);
    setCurrentPrescription(initialPrescriptionItem);
    setShowPrescriptionForm(false);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptionItems(prescriptionItems.filter(item => item.id !== id));
  };

  const handleAddInvestigation = (service: ServiceItem) => {
    const currentInv = opdData.investigation || '';
    const separator = currentInv ? '\n' : '';
    
    let investigationText = '';
    if (service.subTests && service.subTests.length > 0) {
      investigationText = service.subTests.map(t => t.testName).join(', ');
    } else {
      investigationText = service.serviceName;
    }
    
    setOpdData({
      ...opdData,
      investigation: `${currentInv}${separator}${investigationText}`
    });
    setInvestigationSearch('');
    setShowInvestigationResults(false);
  };

  const handleSave = () => {
    if (!currentPatient) return;

    // If editing, use existing ID, else generate new
    const recordId = editingRecordId || Date.now().toString();
    
    // If editing, keep original date, else use today
    const visitDate = editingRecordId 
      ? (opdRecords.find(r => r.id === editingRecordId)?.visitDate || new NepaliDate().format('YYYY-MM-DD'))
      : new NepaliDate().format('YYYY-MM-DD');

    const newRecord: OPDRecord = {
      id: recordId,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      visitDate: visitDate,
      chiefComplaints: opdData.chiefComplaints || '',
      diagnosis: opdData.diagnosis || '',
      investigation: opdData.investigation || '',
      prescriptions: prescriptionItems,
      advice: opdData.advice,
      nextVisitDate: opdData.nextVisitDate
    };

    onSaveRecord(newRecord);
    alert(editingRecordId ? 'OPD रेकर्ड अपडेट गरियो।' : 'OPD रेकर्ड सुरक्षित गरियो।');
    
    // Clear form
    setOpdData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: ''
    });
    setPrescriptionItems([]);
    setEditingRecordId(null);
  };

  const filteredServices = serviceItems?.filter(item => 
    item.serviceName.toLowerCase().includes(investigationSearch.toLowerCase())
  ) || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Main Content Area */}
      <div className="xl:col-span-3 space-y-6">
        {/* Search Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
            <Stethoscope className="text-primary-600" />
            ओ.पी.डी. सेवा (OPD Service)
          </h2>
          <form onSubmit={handleSearch} className="flex gap-4 relative">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="बिरामी ID, नाम वा दर्ता नं. राख्नुहोस्"
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
      </div>

      {currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient Info & History */}
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
            
            {/* Previous Visits could go here */}
          </div>

          {/* Right Column: OPD Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-6 mb-6 border-b border-slate-200">
                <button 
                  onClick={() => setActiveTab('form')}
                  className={`pb-3 px-1 font-bold text-sm transition-all relative ${activeTab === 'form' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  OPD परीक्षण फारम
                </button>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className={`pb-3 px-1 font-bold text-sm transition-all relative flex items-center gap-2 ${activeTab === 'reports' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FlaskConical size={16} />
                  रिपोर्टहरू (Reports)
                  {unviewedCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{unviewedCount}</span>
                  )}
                </button>
                <div className="ml-auto text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                   {new NepaliDate().format('YYYY-MM-DD')}
                </div>
              </div>

              {activeTab === 'form' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                  <textarea
                    value={opdData.chiefComplaints}
                    onChange={(e) => setOpdData({...opdData, chiefComplaints: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
                    placeholder="बिरामीको मुख्य समस्याहरू लेख्नुहोस्..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">निदान (Diagnosis)</label>
                    <textarea
                      value={opdData.diagnosis}
                      onChange={(e) => setOpdData({...opdData, diagnosis: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
                      placeholder="सम्भावित रोगको पहिचान..."
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">जाँच (Investigation)</label>
                    
                    {/* Investigation Search */}
                    <div className="relative mb-2">
                       <input
                         type="text"
                         value={investigationSearch}
                         onChange={(e) => {
                           setInvestigationSearch(e.target.value);
                           setShowInvestigationResults(true);
                         }}
                         placeholder="Search Service / Investigation..."
                         className="w-full p-2 pl-8 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                       />
                       <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       
                       {showInvestigationResults && investigationSearch && (
                         <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                           {filteredServices.length > 0 ? (
                             filteredServices.map(service => (
                               <div 
                                 key={service.id}
                                 onClick={() => handleAddInvestigation(service)}
                                 className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                               >
                                 <div className="font-medium text-slate-700">{service.serviceName}</div>
                                 <div className="text-xs text-slate-500">{service.category}</div>
                               </div>
                             ))
                           ) : (
                             <div className="p-2 text-xs text-slate-500 text-center">No services found</div>
                           )}
                         </div>
                       )}
                    </div>

                    <textarea
                      value={opdData.investigation}
                      onChange={(e) => setOpdData({...opdData, investigation: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
                      placeholder="Lab Test, X-Ray, USG आदि..."
                    />
                  </div>
                </div>

                {/* Prescription Section */}
                <div className="border rounded-xl p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <Pill size={18} className="text-primary-600" /> औषधि सिफारिस (Prescription)
                    </h4>
                    <button 
                      onClick={() => setShowPrescriptionForm(true)}
                      className="text-sm bg-white border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={16} /> औषधि थप्नुहोस्
                    </button>
                  </div>

                  {showPrescriptionForm && (
                    <div className="bg-white p-4 rounded-lg border border-primary-100 mb-4 shadow-sm animate-in zoom-in-95">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                          <Input 
                            label="औषधिको नाम" 
                            value={currentPrescription.medicineName} 
                            onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})}
                            placeholder="Ex: Paracetamol"
                            autoFocus
                            list="medicine-list"
                          />
                          <datalist id="medicine-list">
                            {medicineSuggestions.map((med, idx) => (
                              <option key={idx} value={med} />
                            ))}
                          </datalist>
                        </div>
                        <Input 
                          label="मात्रा (Dosage)" 
                          value={currentPrescription.dosage} 
                          onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})}
                          placeholder="Ex: 500mg"
                        />
                        <Input 
                          label="पटक (Frequency)" 
                          value={currentPrescription.frequency} 
                          onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})}
                          placeholder="Ex: 1-0-1 (बिहान-दिउँसो-बेलुका)"
                        />
                        <Input 
                          label="अवधि (Duration)" 
                          value={currentPrescription.duration} 
                          onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})}
                          placeholder="Ex: 5 days"
                        />
                        <div className="md:col-span-2">
                          <Input 
                            label="निर्देशन (Instructions)" 
                            value={currentPrescription.instructions} 
                            onChange={e => setCurrentPrescription({...currentPrescription, instructions: e.target.value})}
                            placeholder="Ex: खाना पछि"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPrescriptionForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm">रद्द</button>
                        <button onClick={handleAddPrescription} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">थप्नुहोस्</button>
                      </div>
                    </div>
                  )}

                  {prescriptionItems.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">औषधि</th>
                            <th className="p-3">मात्रा</th>
                            <th className="p-3">पटक</th>
                            <th className="p-3">अवधि</th>
                            <th className="p-3">निर्देशन</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescriptionItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="p-3 font-medium">{item.medicineName}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">{item.frequency}</td>
                              <td className="p-3">{item.duration}</td>
                              <td className="p-3 text-slate-500">{item.instructions}</td>
                              <td className="p-3">
                                <button onClick={() => handleRemovePrescription(item.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                      कुनै औषधि थपिएको छैन
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">सल्लाह / सुझाव (Advice)</label>
                  <textarea
                    value={opdData.advice}
                    onChange={(e) => setOpdData({...opdData, advice: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[60px]"
                    placeholder="बिरामीलाई दिइने सल्लाह..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button 
                    onClick={handleRestore}
                    className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-2 shadow-sm font-medium border border-amber-200"
                    title="Restore Previous Record"
                  >
                    <History size={18} /> Restore Previous
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 shadow-sm"
                  >
                    <Printer size={18} /> प्रिन्ट (Print)
                  </button>
                  <button 
                    onClick={handlePrintMedicineSlip}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm font-medium"
                  >
                    <Pill size={18} /> औषधि पुर्जा
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium"
                  >
                    <Save size={18} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                  </button>
                </div>
              </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-4 animate-in fade-in">
                  {patientReports.length > 0 ? (
                    <div className="grid gap-4">
                      {patientReports.map((report: any) => (
                        <div key={report.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-800">{report.date}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${report.type === 'Lab' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {report.type}
                                </span>
                                {report.type === 'Lab' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${report.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {report.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {report.type === 'Lab' ? `Invoice: #${report.invoiceNumber}` : `Type: ${Array.isArray(report.xrayType) ? report.xrayType.join(', ') : report.xrayType || report.ecgType || (Array.isArray(report.usgType) ? report.usgType.join(', ') : report.usgType) || report.treatmentType}`}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedReport(report);
                                markAsViewed(report);
                                setTimeout(() => handlePrintReport(), 100);
                              }}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1 text-xs font-bold"
                            >
                              <Printer size={14} /> Print / View
                            </button>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-3 text-sm">
                            {report.type === 'Lab' ? (
                              <>
                                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Test Results</p>
                                <div className="space-y-1">
                                  {report.tests?.slice(0, 3).map((test: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span>{test.testName}</span>
                                      <span className="font-mono font-bold">{test.result} {test.unit}</span>
                                    </div>
                                  ))}
                                  {(report.tests?.length || 0) > 3 && (
                                    <p className="text-[10px] text-slate-400 italic mt-1">+ {(report.tests?.length || 0) - 3} more tests</p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Result / Findings</p>
                                <p className="text-xs text-slate-700 line-clamp-3">{report.result || report.diagnosis || 'No result recorded'}</p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <FlaskConical size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">कुनै रिपोर्ट भेटिएन (No Reports Found)</p>
                      <p className="text-xs text-slate-400 mt-1">यो बिरामीको लागि कुनै ल्याब रिपोर्ट उपलब्ध छैन।</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div style={{ display: "none" }}>
        {/* Report Print Template */}
        <div ref={reportPrintRef} className="p-8 bg-white text-slate-900 print:block">
            {selectedReport && (
                <div>
                    <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                        <h1 className="text-2xl font-bold">{currentUser?.organizationName}</h1>
                        <h2 className="text-lg font-bold mt-1">{selectedReport.type} Report</h2>
                        <p className="text-sm text-slate-600">Date: {selectedReport.date}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div><strong>Patient:</strong> {selectedReport.patientName}</div>
                        <div><strong>Age/Sex:</strong> {selectedReport.age}/{selectedReport.gender || selectedReport.sex}</div>
                        <div><strong>ID:</strong> {selectedReport.uniquePatientId || selectedReport.serviceSeekerId} {currentPatient?.mulDartaNo && `| Mul Darta No: ${currentPatient.mulDartaNo}`}</div>
                        <div><strong>Referred By:</strong> {selectedReport.referredBy || 'Self'}</div>
                    </div>

                    {selectedReport.type === 'Lab' ? (
                      <table className="w-full text-sm border-collapse border border-slate-300">
                          <thead className="bg-slate-100">
                              <tr>
                                  <th className="border border-slate-300 p-2 text-left">Test Name</th>
                                  <th className="border border-slate-300 p-2 text-center">Result</th>
                                  <th className="border border-slate-300 p-2 text-center">Unit</th>
                                  <th className="border border-slate-300 p-2 text-center">Reference Range</th>
                              </tr>
                          </thead>
                          <tbody>
                              {selectedReport.tests?.map((test: any, i: number) => (
                                  <tr key={i}>
                                      <td className="border border-slate-300 p-2">{test.testName}</td>
                                      <td className="border border-slate-300 p-2 text-center font-bold">{test.result}</td>
                                      <td className="border border-slate-300 p-2 text-center">{test.unit}</td>
                                      <td className="border border-slate-300 p-2 text-center">{test.range || test.normalRange}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    ) : (
                      <div className="border border-slate-300 rounded p-4 min-h-[200px]">
                        <h3 className="font-bold border-b pb-2 mb-2">
                          {Array.isArray(selectedReport.xrayType) ? selectedReport.xrayType.join(', ') : selectedReport.xrayType || selectedReport.ecgType || (Array.isArray(selectedReport.usgType) ? selectedReport.usgType.join(', ') : selectedReport.usgType) || selectedReport.treatmentType} Findings
                        </h3>
                        <p className="whitespace-pre-wrap">{selectedReport.result || selectedReport.diagnosis}</p>
                        {selectedReport.remarks && (
                          <div className="mt-4 pt-4 border-t border-dashed">
                            <strong>Remarks:</strong> {selectedReport.remarks}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
                        <div>Printed: {new Date().toLocaleString()}</div>
                        <div>Authorized Signature</div>
                    </div>
                </div>
            )}
        </div>
        <div ref={printRef} className="print:block">
          {currentPatient && (
            <PrescriptionPrint 
              record={currentPatient} 
              generalSettings={generalSettings} 
              opdRecord={opdData as OPDRecord} 
            />
          )}
        </div>
        <div ref={medicineSlipPrintRef} className="print:block">
          {currentPatient && (
            <MedicineSlipPrint 
              record={currentPatient} 
              generalSettings={generalSettings} 
              opdRecord={opdData as OPDRecord} 
            />
          )}
        </div>
      </div>
      </div>

      {/* Sidebar: Today's Patients */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-6">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <History size={18} className="text-primary-600" />
            आजका बिरामीहरू ({todaysOPDRecords.length})
          </h3>
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
            {todaysOPDRecords.map(record => {
              const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
              const isSelected = editingRecordId === record.id;
              
              return (
                <div 
                  key={record.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                    isSelected 
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' 
                      : 'border-slate-100 hover:border-primary-200 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    if (patient) selectPatient(patient);
                    setOpdData(record);
                    setPrescriptionItems(record.prescriptions || []);
                    setEditingRecordId(record.id);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{patient?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{record.uniquePatientId}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAndPrint(record);
                        }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded-md transition-colors shadow-sm border border-transparent hover:border-slate-200"
                        title="Print Card"
                      >
                        <Printer size={14} />
                      </button>
                      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('के तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                              onDeleteRecord(record.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors shadow-sm border border-transparent hover:border-slate-200"
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {todaysOPDRecords.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User size={20} className="text-slate-300" />
                </div>
                <p className="text-slate-400 text-sm italic">आज कुनै बिरामी छैनन्</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
