
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Droplets, Calendar, FileDigit, User as UserIcon, Phone, MapPin, Plus, Edit, Trash2, Search, UsersRound, Baby, CheckCircle2, AlertTriangle, Info, Clock, Check, X, MapPinned, Printer, UserPlus } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { EnglishDatePicker } from './EnglishDatePicker';
import { Option, OrganizationSettings, User } from '../types/coreTypes'; // Corrected import path
import { GarbhawatiPatient } from '../types/healthTypes'; // Corrected import path
import { matchRegNo } from './nepaliUtils';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface GarbhawatiTDRegistrationProps {
  currentFiscalYear: string;
  patients: GarbhawatiPatient[];
  generalSettings: OrganizationSettings;
  onAddPatient: (patient: GarbhawatiPatient) => void;
  onUpdatePatient: (patient: GarbhawatiPatient) => void;
  onDeletePatient: (patientId: string) => void;
  currentUser?: User | null;
}

const gravidaOptions: Option[] = [
  { id: '1', value: '1', label: 'Gravida 1' },
  { id: '2', value: '2', label: 'Gravida 2' },
  { id: '3', value: '3', label: 'Gravida 3' },
  { id: '4+', value: '4', label: 'Gravida 4+' },
];

const previousTdOptions: Option[] = [
  { id: '0', value: '0', label: '० (छैन)' },
  { id: '1', value: '1', label: '१ पटक' },
  { id: '2', value: '2', label: '२ पटक' },
  { id: '3+', value: '3+', label: '३ वा सो भन्दा बढी' },
];

export const GarbhawatiTDRegistration: React.FC<GarbhawatiTDRegistrationProps> = ({
  currentFiscalYear,
  patients,
  generalSettings,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  currentUser
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDoseForUpdate, setSelectedDoseForUpdate] = useState<{ patient: GarbhawatiPatient; doseType: 'td1' | 'td2' | 'tdBooster'; } | null>(null);
  const [selectedPatientForCard, setSelectedPatientForCard] = useState<GarbhawatiPatient | null>(null);
  const [filterMode, setFilterMode] = useState<'default' | 'today' | 'completed' | 'pending' | 'all_fy'>('default');
  const [modalGivenDateBs, setModalGivenDateBs] = useState('');
  const [modalVaccinatedElsewhere, setModalVaccinatedElsewhere] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const getTodayBs = () => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  };

  const todayBs = getTodayBs();

  const isVaccinatedToday = (p: GarbhawatiPatient) => {
    return (
      p.td1DateBs === todayBs ||
      p.td2DateBs === todayBs ||
      p.tdBoosterDateBs === todayBs
    );
  };

  const isCompletedTd = (p: GarbhawatiPatient) => {
    const hasTd2 = Boolean(p.td2DateBs || p.td2VaccinatedElsewhere);
    const hasBooster = Boolean(p.tdBoosterDateBs || p.tdBoosterVaccinatedElsewhere);
    return hasTd2 || hasBooster;
  };

  const stats = useMemo(() => {
    const all = patients || [];
    const thisFyPatients = all.filter(p => p.fiscalYear === currentFiscalYear);
    const todayCount = all.filter(p => isVaccinatedToday(p)).length;
    const completedCount = all.filter(p => isCompletedTd(p)).length;
    const pendingCount = all.length - completedCount;
    return {
      total: all.length,
      thisFy: thisFyPatients.length,
      todayVaccinatedCount: todayCount,
      completed: completedCount,
      pending: pendingCount
    };
  }, [patients, currentFiscalYear, todayBs]);

  const handlePrintCard = (patient: GarbhawatiPatient) => {
    const printContent = document.getElementById('garbhawati-td-card-print');
    if (!printContent) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>गर्भवती महिला TD खोप कार्ड - ${patient.name}</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
            body { font-family: 'Poppins', sans-serif; margin: 0; padding: 10px; color: #1e293b; -webkit-print-color-adjust: exact; }
            .print-container { width: 100%; max-width: 800px; margin: 0 auto; background: white; padding: 16px; border: 2px solid #7c3aed; border-radius: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .text-purple { color: #7c3aed; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.parent.document.body.removeChild(iframe); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  useEffect(() => {
    if (selectedDoseForUpdate) {
      const { patient, doseType } = selectedDoseForUpdate;
      setModalGivenDateBs(patient[`${doseType}DateBs`] || getTodayBs());
      setModalVaccinatedElsewhere(!!patient[`${doseType}VaccinatedElsewhere`]);
    } else {
      setModalGivenDateBs('');
      setModalVaccinatedElsewhere(false);
    }
  }, [selectedDoseForUpdate]);

  const generateRegNo = (fy: string, patientsList: GarbhawatiPatient[]) => {
    try {
      const fyClean = fy.replace('/', '');
      const maxNum = (patientsList || [])
        .filter(p => p && p.fiscalYear === fy && typeof p.regNo === 'string' && p.regNo.startsWith(`GTD-${fyClean}-`))
        .map(p => {
          const parts = p.regNo.split('-');
          return parts.length >= 3 ? parseInt(parts[2]) : 0;
        })
        .filter(n => !isNaN(n))
        .reduce((max, num) => Math.max(max, num), 0);
      return `GTD-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
    } catch (e) {
      console.error("Error generating reg no:", e);
      return `GTD-${fy.replace('/', '')}-001`;
    }
  };

  const centerOptions = useMemo(() => {
    return (generalSettings?.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c }));
  }, [generalSettings]);

  const [formData, setFormData] = useState<GarbhawatiPatient>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: generateRegNo(currentFiscalYear, patients),
    name: '',
    age: '',
    address: '',
    phone: '',
    gravida: 1,
    previousTdCount: '0',
    td1DateBs: null, // Initialize as null
    td1DateAd: null, // Initialize as null
    td2DateBs: null, // Initialize as null
    td2DateAd: null, // Initialize as null
    tdBoosterDateBs: null, // Initialize as null
    tdBoosterDateAd: null, // Initialize as null
    remarks: '',
    vaccinationCenter: centerOptions[0]?.value || '',
  });

  useEffect(() => {
    if (!editingPatientId) {
        setFormData(prev => ({
            ...prev,
            fiscalYear: currentFiscalYear,
            regNo: generateRegNo(currentFiscalYear, patients),
            previousTdCount: '0',
            td1DateBs: null, // Reset to null
            td1DateAd: null, // Reset to null
            td2DateBs: null, // Reset to null
            td2DateAd: null, // Reset to null
            tdBoosterDateBs: null, // Reset to null
            tdBoosterDateAd: null, // Reset to null
            vaccinationCenter: prev.vaccinationCenter || centerOptions[0]?.value || '',
        }));
    }
  }, [currentFiscalYear, patients, editingPatientId, centerOptions]);

  const validateForm = () => {
    setValidationError(null);
    if (!formData.name.trim()) return "बिरामीको नाम आवश्यक छ।";
    if (!formData.address.trim()) return "ठेगाना आवश्यक छ।";
    if (!formData.vaccinationCenter) return "खोप केन्द्र आवश्यक छ।";
    if (formData.phone && formData.phone.trim() !== '') {
      const trimmedPhone = formData.phone.trim();
      if (!/^\d{10}$/.test(trimmedPhone)) {
        return "फोन नम्बर राखिएको खण्डमा ठ्याक्कै १० अंकको हुनुपर्छ। (उदा: 9841234567)";
      }
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);

    // Sanitize data before saving: convert undefined date fields to null
    const sanitizedData = {
      ...formData,
      td1DateBs: formData.td1DateBs || null,
      td1DateAd: formData.td1DateAd || null,
      td2DateBs: formData.td2DateBs || null,
      td2DateAd: formData.td2DateAd || null,
      tdBoosterDateBs: formData.tdBoosterDateBs || null,
      tdBoosterDateAd: formData.tdBoosterDateAd || null,
      remarks: formData.remarks || null, // Also sanitize remarks if it can be undefined
      vaccinationCenter: formData.vaccinationCenter || null,
    };

    const patientToSave: GarbhawatiPatient = {
      ...sanitizedData, // Use sanitized data
      id: editingPatientId || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };

    if (editingPatientId) {
      onUpdatePatient(patientToSave);
      setSuccessMessage('गर्भवती बिरामीको रेकर्ड सफलतापूर्वक अपडेट भयो!');
    } else {
      onAddPatient(patientToSave);
      setSuccessMessage('गर्भवती बिरामीको रेकर्ड सफलतापूर्वक दर्ता भयो!');
    }
    handleReset();
  };

  const handleEditPatient = (patient: GarbhawatiPatient) => {
    setEditingPatientId(patient.id);
    setIsFormOpen(true);
    // Ensure that when loading an existing patient, undefined values are converted to null
    // to match the form's state initialization.
    setFormData({ 
        ...patient,
        previousTdCount: patient.previousTdCount || '0',
        td1DateBs: patient.td1DateBs || null,
        td1DateAd: patient.td1DateAd || null,
        td2DateBs: patient.td2DateBs || null,
        td2DateAd: patient.td2DateAd || null,
        tdBoosterDateBs: patient.tdBoosterDateBs || null,
        tdBoosterDateAd: patient.tdBoosterDateAd || null,
        remarks: patient.remarks || null,
        vaccinationCenter: patient.vaccinationCenter || centerOptions[0]?.value || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePatient = (patientId: string, patientName: string) => {
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${patientName} को रेकर्ड हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
      onDeletePatient(patientId);
      setSuccessMessage(`${patientName} को रेकर्ड सफलतापूर्वक हटाइयो।`);
    }
  };

  const handleReset = () => {
    setEditingPatientId(null);
    setIsFormOpen(false);
    setFormData(prev => ({
      ...prev,
      id: '',
      regNo: generateRegNo(currentFiscalYear, patients),
      name: '',
      age: '',
      address: '',
      phone: '',
      gravida: 1,
      previousTdCount: '0',
      td1DateBs: null, // Reset to null
      td1DateAd: null, // Reset to null
      td2DateBs: null, // Reset to null
      td2DateAd: null, // Reset to null
      tdBoosterDateBs: null, // Reset to null
      tdBoosterDateAd: null, // Reset to null
      remarks: '',
      vaccinationCenter: centerOptions[0]?.value || '',
    }));
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleUpdateDoseStatus = () => {
    if (!selectedDoseForUpdate) return;
    const { patient, doseType } = selectedDoseForUpdate;

    if (!modalGivenDateBs.trim()) {
        alert("कृपया खोप दिएको मिति भर्नुहोस्।");
        return;
    }
    
    let givenDateAd = '';
    try {
        const nd = new NepaliDate(modalGivenDateBs);
        givenDateAd = nd.toJsDate().toISOString().split('T')[0];
    } catch (e) {
        alert("अमान्य मिति ढाँचा।");
        return;
    }

    const updatedPatient = { 
      ...patient, 
      [`${doseType}DateBs`]: modalGivenDateBs, 
      [`${doseType}DateAd`]: givenDateAd,
      [`${doseType}VaccinatedElsewhere`]: modalVaccinatedElsewhere
    };
    onUpdatePatient(updatedPatient);
    setSuccessMessage(`${doseType.toUpperCase()} खोप सफलतापूर्वक अपडेट भयो!`);
    setSelectedDoseForUpdate(null);
  };

  const filteredPatients = useMemo(() => {
    const query = (searchTerm || '').trim().toLowerCase();
    return (patients || [])
      .filter(p => {
        if (!p) return false;
        if (filterMode === 'today') return isVaccinatedToday(p);
        if (filterMode === 'completed') return isCompletedTd(p);
        if (filterMode === 'pending') return !isCompletedTd(p);
        if (filterMode === 'all_fy') return true;

        if (!query) {
          if (!p.fiscalYear || p.fiscalYear === currentFiscalYear) return true;
          return !isCompletedTd(p);
        }
        return true;
      })
      .filter(p => {
        if (filterCenter && p.vaccinationCenter !== filterCenter) return false;
        if (!query) return true;
        return (
          (p.name || '').toLowerCase().includes(query) || 
          matchRegNo(p.regNo, query) ||
          (p.address || '').toLowerCase().includes(query) ||
          (p.vaccinationCenter || '').toLowerCase().includes(query) ||
          (p.phone || '').includes(query)
        );
      })
      .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }, [patients, currentFiscalYear, searchTerm, filterCenter, filterMode, todayBs]);



  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <Droplets size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">गर्भवती महिला TD खोप दर्ता</h2>
            <p className="text-sm text-slate-500">गर्भवती महिलाहरूको खोप तालिकाको विवरण दर्ता र ट्र्याकिङ</p>
          </div>
        </div>
      </div>

      {/* Attractive Dashboard for Garbhawati TD Registration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 no-print">
        <div 
          onClick={() => setFilterMode(filterMode === 'all_fy' ? 'default' : 'all_fy')}
          className={`bg-gradient-to-br from-purple-600 to-indigo-700 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-between overflow-hidden relative group cursor-pointer transition-all ${
            filterMode === 'all_fy' ? 'ring-4 ring-purple-300 scale-102 shadow-lg' : 'hover:scale-102 hover:shadow-md'
          }`}
          title="सबै आर्थिक वर्षका सबै गर्भवती महिलाको सूची हेर्न थिच्नुहोस्"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <UsersRound size={100} />
          </div>
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <UsersRound size={20} />
            </div>
            <span className="text-[10px] bg-white/30 text-white font-bold px-2 py-0.5 rounded-full font-nepali">
              {filterMode === 'all_fy' ? '✓ देखाउँदै' : 'क्लिक गर्नुहोस्'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-purple-100 text-xs font-bold font-nepali">कुल दर्ता संख्या</p>
            <h3 className="text-2xl font-black mt-0.5 font-mono">{stats.total}</h3>
          </div>
        </div>

        <div 
          onClick={() => setFilterMode('default')}
          className={`bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-between overflow-hidden relative group cursor-pointer transition-all ${
            filterMode === 'default' ? 'ring-4 ring-teal-300 scale-102 shadow-lg' : 'hover:scale-102 hover:shadow-md'
          }`}
          title="चालु आ.व. तथा अघिल्ला आ.व. का बाँकी खोप रहेका बिरामी"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Calendar size={100} />
          </div>
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] bg-white/30 text-white font-bold px-2 py-0.5 rounded-full font-nepali">
              {filterMode === 'default' ? '✓ देखाउँदै' : 'क्लिक गर्नुहोस्'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-teal-100 text-xs font-bold font-nepali">चालु आ.व. ({currentFiscalYear})</p>
            <h3 className="text-2xl font-black mt-0.5 font-mono">{stats.thisFy}</h3>
          </div>
        </div>

        <div 
          onClick={() => setFilterMode(filterMode === 'today' ? 'default' : 'today')}
          className={`bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-between overflow-hidden relative group cursor-pointer transition-all ${
            filterMode === 'today' ? 'ring-4 ring-emerald-300 scale-102 shadow-lg' : 'hover:scale-102 hover:shadow-md'
          }`}
          title="आज खोप लगाएका गर्भवती महिलाहरूको विवरण हेर्न थिच्नुहोस्"
        >
          <div className="absolute -right-4 -bottom-4 opacity-15 group-hover:scale-110 transition-transform duration-500">
            <Droplets size={100} />
          </div>
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm flex items-center gap-1.5">
              <Droplets size={20} />
            </div>
            <span className="text-[10px] bg-white/30 text-white font-bold px-2 py-0.5 rounded-full font-nepali">
              {filterMode === 'today' ? '✓ देखाउँदै' : 'क्लिक गर्नुहोस्'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-emerald-100 text-xs font-bold font-nepali flex items-center gap-1">
              आज खोप लगाएका <span className="text-[10px] font-mono opacity-80">({todayBs})</span>
            </p>
            <h3 className="text-2xl font-black mt-0.5 font-mono flex items-center gap-2">
              {stats.todayVaccinatedCount}
              {stats.todayVaccinatedCount > 0 && <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-200 animate-ping" />}
            </h3>
          </div>
        </div>

        <div 
          onClick={() => setFilterMode(filterMode === 'completed' ? 'default' : 'completed')}
          className={`bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-between overflow-hidden relative group cursor-pointer transition-all ${
            filterMode === 'completed' ? 'ring-4 ring-indigo-300 scale-102 shadow-lg' : 'hover:scale-102 hover:shadow-md'
          }`}
          title="पूर्ण TD खोप पाएका (TD2 वा Booster) महिलाहरूको सूची"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <CheckCircle2 size={100} />
          </div>
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] bg-white/30 text-white font-bold px-2 py-0.5 rounded-full font-nepali">
              {filterMode === 'completed' ? '✓ देखाउँदै' : 'क्लिक गर्नुहोस्'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-indigo-100 text-xs font-bold font-nepali">पूर्ण खोप (TD2/Booster)</p>
            <h3 className="text-2xl font-black mt-0.5 font-mono">{stats.completed}</h3>
          </div>
        </div>

        <div 
          onClick={() => setFilterMode(filterMode === 'pending' ? 'default' : 'pending')}
          className={`bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl shadow-sm text-white flex flex-col justify-between overflow-hidden relative group cursor-pointer transition-all ${
            filterMode === 'pending' ? 'ring-4 ring-amber-300 scale-102 shadow-lg' : 'hover:scale-102 hover:shadow-md'
          }`}
          title="आंशिक वा बाँकी खोप रहेका महिलाहरूको सूची"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={100} />
          </div>
          <div className="flex justify-between items-start">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[10px] bg-white/30 text-white font-bold px-2 py-0.5 rounded-full font-nepali">
              {filterMode === 'pending' ? '✓ देखाउँदै' : 'क्लिक गर्नुहोस्'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-amber-100 text-xs font-bold font-nepali">आंशिक/बाँकी खोप</p>
            <h3 className="text-2xl font-black mt-0.5 font-mono">{stats.pending}</h3>
          </div>
        </div>
      </div>

      {/* Messages */}
      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle size={24} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">त्रुटि (Validation Error)</h3>
            <p className="text-red-700 text-sm mt-1">{validationError}</p>
          </div>
          {/* Added X icon for closing validation error */}
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 size={24} className="text-green-500" />
          <div className="flex-1">
            <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
          {/* Added X icon for closing success message */}
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={20} /></button>
        </div>
      )}

      <div className="flex justify-center no-print">
        {!isFormOpen && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-3 bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-purple-700 hover:scale-105 transition-all animate-in zoom-in duration-300 font-nepali cursor-pointer"
          >
            <UserPlus size={24} /> गर्भवती महिला दर्ता गर्नुहोस् (नयाँ फारम)
          </button>
        )}
      </div>

      {/* Registration Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-xl no-print animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-600"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-purple-800">
              <div className="bg-purple-100 p-2 rounded-xl">
                <UsersRound size={24} />
              </div>
              <div>
                <h3 className="font-bold text-xl font-nepali">{editingPatientId ? 'गर्भवती बिरामीको विवरण परिमार्जन गर्नुहोस्' : 'नयाँ गर्भवती महिलाको विवरण र TD खोप दर्ता'}</h3>
                <p className="text-xs text-slate-500">तारा चिन्हित (*) विवरणहरू अनिवार्य छन्</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => { handleReset(); setIsFormOpen(false); }}
              className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="बन्द गर्नुहोस्"
            >
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <Input label="आर्थिक वर्ष" value={formData.fiscalYear} readOnly className="bg-slate-100 text-slate-600 font-medium cursor-not-allowed" icon={<Calendar size={16} />} />
              <Input label="दर्ता नम्बर (Reg No)" value={formData.regNo} readOnly className="font-mono font-bold text-purple-600" icon={<FileDigit size={16} />} />
            </div>

            <Input label="बिरामीको नाम (Patient Name) *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required icon={<UserIcon size={16} />} />
            <Input label="उमेर (Age) *" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required type="number" icon={<Clock size={16} />} />
            
            <Select label="Gravida (गर्भावस्था संख्या)" options={gravidaOptions} value={formData.gravida.toString()} onChange={e => setFormData({...formData, gravida: parseInt(e.target.value)})} />
            
            <Select label="यस अघि TD खोप लिएको पटक" options={previousTdOptions} value={formData.previousTdCount || '0'} onChange={e => setFormData({...formData, previousTdCount: e.target.value})} />

            <Input label="ठेगाना (Address) *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
            <Input label="फोन नं (Phone)" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} icon={<Phone size={16} />} placeholder="१० अंकको फोन नं (ऐच्छिक)" />

            <Select label="खोप केन्द्र (Vaccination Center) *" options={centerOptions} value={formData.vaccinationCenter || ''} onChange={e => setFormData({...formData, vaccinationCenter: e.target.value})} placeholder="-- केन्द्र छान्नुहोस् --" icon={<MapPinned size={16} />} />

            <Input label="कैफियत (Remarks)" value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="lg:col-span-2" />

            <div className="lg:col-span-3 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
                <RotateCcw size={18} /><span>रिसेट (Reset)</span>
              </button>
              <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium">
                <Save size={18} /><span>{editingPatientId ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस्'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient List & TD Schedule */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="sticky -top-4 md:-top-8 z-30 px-6 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-xl shadow-sm">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-700 font-nepali">गर्भवती महिलाहरूको सूची ({filteredPatients.length})</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all bg-white font-nepali text-slate-700"
            >
              <option value="">सबै खोप केन्द्र (All Centers)</option>
              {centerOptions.map(c => (
                <option key={c.id} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="नाम वा दर्ता नं खोज्नुहोस्..." 
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all font-nepali" 
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                  title="खोज हटाउनुहोस्"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Reg No</th>
                <th className="px-6 py-3">Patient Details</th>
                <th className="px-6 py-3">यस अघि TD खोप (Previous TD)</th>
                <th className="px-6 py-3">TD1 / TD2 / Booster</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    {searchTerm || filterCenter ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै गर्भवती बिरामी दर्ता भएको छैन (No pregnant patients registered)'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-purple-600 whitespace-nowrap">{patient.regNo}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{patient.name} ({patient.age} वर्ष)</div>
                      <div className="text-xs text-slate-500">{patient.address}</div>
                      {patient.vaccinationCenter && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><MapPinned size={10} className="text-purple-500"/> {patient.vaccinationCenter}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-nepali">
                        <span className="font-medium">पटक: {patient.previousTdCount || '०'}</span>
                        <div className="text-xs text-slate-500">Gravida: {patient.gravida}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                            {/* TD1 */}
                            <button 
                                type="button" 
                                onClick={() => setSelectedDoseForUpdate({ patient, doseType: 'td1' })}
                                className={`px-2 py-1 rounded text-[10px] font-bold border flex flex-col items-center cursor-pointer transition-all hover:scale-105
                                    ${patient.td1DateBs ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' :
                                    'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                    }`}
                                title={patient.td1DateBs ? (isSuperAdmin ? `TD1 मिति: ${patient.td1DateBs} (सुपर एड्मिन: क्लिक गरी सम्पादन/नलागेको/अन्यत्र बनाउनुहोस्)` : `TD1 मिति: ${patient.td1DateBs}`) : 'TD1 खोप लगाउनुहोस्'}
                            >
                                <span>TD1 ({patient.td1DateBs ? patient.td1DateBs.slice(5) : 'Pending'})</span>
                                {patient.td1VaccinatedElsewhere && <span className="text-[8px] text-amber-800 bg-amber-50 px-0.5 rounded border border-amber-100 font-nepali">अन्यत्र</span>}
                            </button>
                            {/* TD2 */}
                            <button 
                                type="button" 
                                onClick={() => setSelectedDoseForUpdate({ patient, doseType: 'td2' })}
                                disabled={!isSuperAdmin && !patient.td1DateBs} // Allow super admin to edit
                                className={`px-2 py-1 rounded text-[10px] font-bold border flex flex-col items-center transition-all
                                    ${patient.td2DateBs ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 cursor-pointer hover:scale-105' :
                                    !patient.td1DateBs && !isSuperAdmin ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                    'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer hover:scale-105'
                                    }`}
                                title={patient.td2DateBs ? (isSuperAdmin ? `TD2 मिति: ${patient.td2DateBs} (सुपर एड्मिन: क्लिक गरी सम्पादन/नलागेको/अन्यत्र बनाउनुहोस्)` : `TD2 मिति: ${patient.td2DateBs}`) : 'TD2 खोप लगाउनुहोस्'}
                            >
                                <span>TD2 ({patient.td2DateBs ? patient.td2DateBs.slice(5) : 'Pending'})</span>
                                {patient.td2VaccinatedElsewhere && <span className="text-[8px] text-amber-800 bg-amber-50 px-0.5 rounded border border-amber-100 font-nepali">अन्यत्र</span>}
                            </button>
                            {/* TD Booster */}
                            <button 
                                type="button" 
                                onClick={() => setSelectedDoseForUpdate({ patient, doseType: 'tdBooster' })}
                                disabled={!isSuperAdmin && !patient.td2DateBs} // Allow super admin to edit
                                className={`px-2 py-1 rounded text-[10px] font-bold border flex flex-col items-center transition-all
                                    ${patient.tdBoosterDateBs ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 cursor-pointer hover:scale-105' :
                                    !patient.td2DateBs && !isSuperAdmin ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                    'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer hover:scale-105'
                                    }`}
                                title={patient.tdBoosterDateBs ? (isSuperAdmin ? `TD Booster मिति: ${patient.tdBoosterDateBs} (सुपर एड्मिन: क्लिक गरी सम्पादन/नलागेको/अन्यत्र बनाउनुहोस्)` : `TD Booster मिति: ${patient.tdBoosterDateBs}`) : 'TD Booster खोप लगाउनुहोस्'}
                            >
                                <span>TD Booster ({patient.tdBoosterDateBs ? patient.tdBoosterDateBs.slice(5) : 'Pending'})</span>
                                {patient.tdBoosterVaccinatedElsewhere && <span className="text-[8px] text-amber-800 bg-amber-50 px-0.5 rounded border border-amber-100 font-nepali">अन्यत्र</span>}
                            </button>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <button 
                            type="button" 
                            onClick={() => setSelectedPatientForCard(patient)}
                            className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-xs font-bold font-nepali border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="खोप कार्ड हेर्नुहोस्"
                        >
                            <Printer size={13} /> कार्ड
                        </button>
                        <button onClick={() => handleEditPatient(patient)} className="text-primary-400 hover:text-primary-600 p-1" title="सम्पादन"><Edit size={18} /></button>
                        <button onClick={() => handleDeletePatient(patient.id, patient.name)} className="text-red-400 hover:text-red-600 p-1" title="मेटाउनुहोस्"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dose Update Modal */}
      {selectedDoseForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDoseForUpdate(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <Droplets size={20} className="text-purple-600"/>
                        <h3 className="font-bold text-slate-800 font-nepali text-sm">
                          {!!selectedDoseForUpdate.patient[`${selectedDoseForUpdate.doseType}DateBs`]
                            ? 'खोप विवरण सम्पादन (Edit TD Dose Details)'
                            : 'खोप स्थिति अपडेट (Update Dose Status)'}
                        </h3>
                    </div>
                    {/* Added X icon for closing vaccine update modal */}
                    <button type="button" onClick={() => setSelectedDoseForUpdate(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="text-center">
                        <h4 className="text-lg font-bold text-slate-800">{selectedDoseForUpdate.patient.name}</h4>
                        <p className="text-sm text-slate-600">खोप: <span className="font-bold text-purple-700">{selectedDoseForUpdate.doseType.toUpperCase().replace('TD', 'TD ')}</span></p>
                        <p className="text-xs text-slate-500 font-nepali mt-1">यस अघि TD लिएको पटक: {selectedDoseForUpdate.patient.previousTdCount || '०'} | Gravida: {selectedDoseForUpdate.patient.gravida}</p>
                    </div>
                    
                    <NepaliDatePicker 
                        label="खोप दिएको मिति (Given Date - BS)" 
                        value={modalGivenDateBs} 
                        onChange={setModalGivenDateBs} 
                        required
                    />
                    
                    <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="modal-td-elsewhere"
                          checked={modalVaccinatedElsewhere}
                          onChange={(e) => setModalVaccinatedElsewhere(e.target.checked)}
                          className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                        />
                        <label 
                          htmlFor="modal-td-elsewhere" 
                          className="text-xs font-bold text-slate-700 font-nepali cursor-pointer select-none"
                        >
                          अन्यत्र लगाएको (Vaccinated Elsewhere)
                        </label>
                    </div>
                    
                    {!!selectedDoseForUpdate.patient[`${selectedDoseForUpdate.doseType}DateBs`] && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="bg-green-50 border border-green-100 p-2.5 rounded-lg text-center font-nepali text-green-700 text-xs flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={16} />
                                <span className="font-bold">खोपको विवरण सुरक्षित छ (Vaccinated)</span>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => {
                                    if (window.confirm("के तपाईं यो खोपको विवरण हटाउन चाहनुहुन्छ?")) {
                                        const { patient, doseType } = selectedDoseForUpdate;
                                        const updatedPatient = { 
                                          ...patient, 
                                          [`${doseType}DateBs`]: null, 
                                          [`${doseType}DateAd`]: null,
                                          [`${doseType}VaccinatedElsewhere`]: false
                                        };
                                        onUpdatePatient(updatedPatient);
                                        setSuccessMessage(`${doseType.toUpperCase()} खोपको विवरण हटाइयो।`);
                                        setSelectedDoseForUpdate(null);
                                    }
                                }} 
                                className="w-full py-2 px-3 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg font-bold font-nepali transition-all text-xs flex items-center justify-center gap-1.5"
                            >
                                <Trash2 size={14} />
                                खोप विवरण हटाउनुहोस् (Clear Vaccine)
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 shrink-0">
                    <button type="button" onClick={() => setSelectedDoseForUpdate(null)} className="flex-1 py-2 text-slate-600 font-medium font-nepali hover:bg-slate-200 rounded-lg transition-colors text-sm">बन्द (Close)</button>
                    <button type="button" onClick={handleUpdateDoseStatus} className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-sm font-nepali hover:bg-purple-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                        <Check size={16} />
                        सुरक्षित गर्नुहोस्
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Patient Card Modal */}
      {selectedPatientForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPatientForCard(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-700 text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Droplets size={22} className="text-white"/>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base font-nepali">गर्भवती महिला TD खोप कार्ड (Immunization Card)</h3>
                            <p className="text-xs text-purple-200 font-nepali">{selectedPatientForCard.name} ({selectedPatientForCard.regNo})</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={() => handlePrintCard(selectedPatientForCard)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-800 hover:bg-purple-50 rounded-lg text-xs font-bold shadow-sm transition-all font-nepali cursor-pointer"
                        >
                            <Printer size={15} /> प्रिन्ट कार्ड
                        </button>
                        <button type="button" onClick={() => setSelectedPatientForCard(null)} className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"><X size={20}/></button>
                    </div>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50">
                    <div id="garbhawati-td-card-print" className="bg-white border-2 border-purple-700 p-5 rounded-xl shadow-sm text-slate-900 font-nepali space-y-4">
                        {/* Header */}
                        <div className="text-center border-b-2 border-purple-700 pb-3">
                            <h2 className="text-base sm:text-lg font-extrabold text-purple-950">{generalSettings?.hospitalName || 'स्वास्थ्य संस्था'}</h2>
                            {generalSettings?.hospitalSubtitle && <p className="text-xs font-medium text-slate-600">{generalSettings.hospitalSubtitle}</p>}
                            <h3 className="text-sm font-bold text-purple-800 mt-1 uppercase tracking-wide">गर्भवती महिला TD खोप दर्ता तथा खोप कार्ड</h3>
                            <p className="text-[11px] text-slate-500">आर्थिक वर्ष: <span className="font-bold font-mono">{selectedPatientForCard.fiscalYear}</span></p>
                        </div>

                        {/* Patient Info Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 p-3 text-xs border border-purple-200 bg-purple-50/30 rounded-lg">
                            <div className="space-y-1">
                                <div className="flex justify-between border-b border-purple-100 pb-1">
                                    <span className="text-slate-500">दर्ता नम्बर (Reg No):</span>
                                    <span className="font-bold text-purple-900 font-mono">{selectedPatientForCard.regNo}</span>
                                </div>
                                <div className="flex justify-between border-b border-purple-100 pb-1">
                                    <span className="text-slate-500">गर्भवतीको नाम:</span>
                                    <span className="font-bold text-slate-900">{selectedPatientForCard.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-purple-100 pb-1">
                                    <span className="text-slate-500">उमेर:</span>
                                    <span className="font-bold text-slate-800">{selectedPatientForCard.age} वर्ष</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ठेगाना:</span>
                                    <span className="font-bold text-slate-800 truncate max-w-[160px]">{selectedPatientForCard.address}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between border-b border-purple-100 pb-1">
                                    <span className="text-slate-500">सम्पर्क फोन:</span>
                                    <span className="font-bold font-mono text-slate-800">{selectedPatientForCard.phone || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-purple-100 pb-1">
                                    <span className="text-slate-500">गर्भावस्था क्रम (Gravida):</span>
                                    <span className="font-bold text-slate-900">{selectedPatientForCard.gravida}</span>
                                </div>
                                <div className="flex justify-between border-b border-purple-100 pb-1">
                                    <span className="text-slate-500">यसअघि TD खोप पटक:</span>
                                    <span className="font-bold text-slate-900">{selectedPatientForCard.previousTdCount || '०'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">खोप केन्द्र:</span>
                                    <span className="font-bold text-purple-700 truncate max-w-[160px]">{selectedPatientForCard.vaccinationCenter || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vaccine Doses Table */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">खोप तालिका तथा विवरण (TD Immunization Status)</h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                        <tr>
                                            <th className="p-2 text-center w-12">सि.न.</th>
                                            <th className="p-2 text-left">खोपको नाम (Vaccine Dose)</th>
                                            <th className="p-2 text-center">दिएको मिति (BS)</th>
                                            <th className="p-2 text-center">स्थिति (Status)</th>
                                            <th className="p-2 text-left">कैफियत / स्थान</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[
                                            { name: 'TD 1', date: selectedPatientForCard.td1DateBs, elsewhere: selectedPatientForCard.td1VaccinatedElsewhere },
                                            { name: 'TD 2', date: selectedPatientForCard.td2DateBs, elsewhere: selectedPatientForCard.td2VaccinatedElsewhere },
                                            { name: 'TD Booster', date: selectedPatientForCard.tdBoosterDateBs, elsewhere: selectedPatientForCard.tdBoosterVaccinatedElsewhere },
                                        ].map((dose, idx) => {
                                            const isGiven = !!dose.date;
                                            return (
                                                <tr key={idx} className={isGiven ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                                                    <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                                                    <td className="p-2 font-bold text-slate-900">{dose.name}</td>
                                                    <td className="p-2 text-center font-mono font-medium text-slate-800">{dose.date || '-'}</td>
                                                    <td className="p-2 text-center">
                                                        {isGiven ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                <CheckCircle2 size={12} /> लगाएको (Given)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                <Clock size={12} /> बाँकी (Pending)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-slate-600 text-[11px]">
                                                        {dose.elsewhere ? 'अन्यत्र लगाएको (Vaccinated Elsewhere)' : isGiven ? 'नियमित खोप केन्द्र' : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-8 flex justify-between items-end text-xs text-slate-700">
                            <div className="text-center">
                                <div className="border-t border-slate-400 pt-1 w-36 mx-auto">खोपकर्ताको सही</div>
                            </div>
                            <div className="text-center">
                                <div className="border-t border-slate-400 pt-1 w-36 mx-auto">स्वास्थ्य संस्था प्रमुख / छाप</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 shrink-0">
                    <button type="button" onClick={() => setSelectedPatientForCard(null)} className="flex-1 py-2 text-slate-600 font-medium font-nepali hover:bg-slate-200 rounded-lg transition-colors text-sm">बन्द (Close)</button>
                    <button type="button" onClick={() => handlePrintCard(selectedPatientForCard)} className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-sm font-nepali hover:bg-purple-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                        <Printer size={16} />
                        प्रिन्ट गर्नुहोस्
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};