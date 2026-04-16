
import React, { useState, useEffect, useMemo, useCallback } from 'react';
/* Added AlertTriangle to the imports */
import { Save, RotateCcw, Syringe, Calendar, FileDigit, User, Phone, MapPin, CalendarRange, Clock, CheckCircle2, Search, X, AlertCircle, Trash2, Pencil, Check, Info, AlertTriangle, Bone, History } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Option, User as UserType } from '../types/coreTypes'; // Corrected import path
import { RabiesPatient, VaccinationDose } from '../types/healthTypes'; // Corrected import path

// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface RabiesRegistrationProps {
  currentFiscalYear: string;
  patients: RabiesPatient[];
  onAddPatient: (patient: RabiesPatient) => void;
  // Fix: Renamed onUpdateRabiesPatient to onUpdatePatient
  onUpdatePatient: (patient: RabiesPatient) => void;
  onDeletePatient?: (patientId: string) => void; 
  currentUser: UserType; 
}

const nepaliMonthOptions = [
  { id: '01', value: '01', label: 'बैशाख (01)' },
  { id: '02', value: '02', label: 'जेठ (02)' },
  { id: '03', value: '03', label: 'असार (03)' },
  { id: '04', value: '04', label: 'साउन (04)' },
  { id: '05', value: '05', label: 'भदौ (05)' },
  { id: '06', value: '06', label: 'असोज (06)' },
  { id: '07', value: '07', label: 'कार्तिक (07)' },
  { id: '08', value: '08', label: 'मंसिर (08)' },
  { id: '09', value: '09', label: 'पुष (09)' },
  { id: '10', value: '10', label: 'माघ (10)' },
  { id: '11', value: '11', label: 'फागुन (11)' },
  { id: '12', value: '12', label: 'चैत्र (12)' },
];

const animalTypeOptions: Option[] = [
    { id: 'dog', value: 'Dog bite', label: 'कुकुरले टोकेको (Dog bite)' },
    { id: 'monkey', value: 'Monkey bite', label: 'बाँदरले टोकेको (Monkey bite)' },
    { id: 'cat', value: 'Cat bite', label: 'बिरालोले टोकेको (Cat bite)' },
    { id: 'cattle', value: 'Cattle bite', label: 'चौपायाले टोकेको (Cattle bite)' },
    { id: 'rodent', value: 'Rodent bite', label: 'मुसा/लोखर्के (Rodent bite)' },
    { id: 'jackal', value: 'Jackal bite', label: 'स्यालले टोकेको (Jackal bite)' },
    { id: 'tiger', value: 'Tiger bite', label: 'बाघले टोकेको (Tiger bite)' },
    { id: 'bear', value: 'Bear bite', label: 'भालुले टोकेको (Bear bite)' },
    { id: 'saliva', value: 'Saliva contact', label: 'र्‍याल लसपस (Saliva contact)' },
    { id: 'other', value: 'Other specify', label: 'अन्य (Other specify)' },
];

const whoCategoryOptions: Option[] = [
    { id: 'cat1', value: 'Category I', label: 'Category I (No skin break, licking on intact skin)' },
    { id: 'cat2', value: 'Category II', label: 'Category II (Minor scratches, nibbling without bleeding)' },
    { id: 'cat3', value: 'Category III', label: 'Category III (Transdermal bites, scratches, saliva on broken skin)' },
];

const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const convertAdToBsFull = (adDateStr: string) => {
    if (!adDateStr) return '';
    try {
        const ad = new Date(adDateStr);
        const nd = new NepaliDate(ad);
        return nd.format('YYYY-MM-DD');
    } catch (e) {
        return '';
    }
};

const formatAdDateToBsDisplay = (adDateStr: string) => {
    if (!adDateStr) return '';
    try {
        const ad = new Date(adDateStr);
        const nd = new NepaliDate(ad);
        return nd.format('MM-DD');
    } catch (e) {
        return adDateStr.split('-').slice(1).join('-');
    }
};

export const RabiesRegistration: React.FC<RabiesRegistrationProps> = ({ 
  currentFiscalYear, 
  patients = [], 
  onAddPatient, 
  // Fix: Renamed onUpdateRabiesPatient to onUpdatePatient
  onUpdatePatient,
  onDeletePatient,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalDateBs, setModalDateBs] = useState('');
  const [doseUpdateError, setDoseUpdateError] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const [selectedDoseInfo, setSelectedDoseInfo] = useState<{
      patient: RabiesPatient;
      doseIndex: number;
      dose: VaccinationDose;
  } | null>(null);

  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
  const getTodayDateAd = () => formatDateLocal(new Date());

  const generateRegNo = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    const maxNum = patients
      .filter(p => p.fiscalYear === currentFiscalYear && p.regNo.startsWith(`R-${fyClean}-`))
      .map(p => {
          const parts = p.regNo.split('-');
          return parts.length > 2 ? parseInt(parts[2]) : 0;
      })
      .reduce((max, num) => Math.max(max, num), 0);
    return `R-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState<RabiesPatient>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: '',
    regMonth: '',
    regDateBs: '',
    regDateAd: '',
    vaccineStartDateBs: '',
    vaccineStartDateAd: '',
    name: '',
    age: '',
    sex: '',
    address: '',
    phone: '',
    animalType: '',
    exposureCategory: '', 
    bodyPart: '', // Initialized new field
    exposureDateBs: '',
    regimen: 'Intradermal',
    schedule: [],
    hasPreviousVaccine: false,
    previousVaccineDateBs: ''
  });

  useEffect(() => {
    if (!editingPatientId) {
        const today = new NepaliDate();
        const todayBs = today.format('YYYY-MM-DD');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const todayAd = formatDateLocal(new Date());
        
        setFormData(prev => ({
          ...prev,
          regNo: generateRegNo(),
          regDateBs: todayBs,
          regMonth: month,
          regDateAd: todayAd,
          vaccineStartDateBs: todayBs,
          vaccineStartDateAd: todayAd,
          exposureDateBs: todayBs,
          hasPreviousVaccine: false,
          previousVaccineDateBs: ''
        }));
    }
  }, [currentFiscalYear, patients.length, editingPatientId]);

  const handleRegDateBsChange = (val: string) => {
    let month = formData.regMonth;
    let adDateStr = formData.regDateAd;
    if (val) {
        try {
            const parts = val.split(/[-/]/);
            if (parts.length === 3) {
                const [y, m, d] = parts.map(Number);
                month = String(m).padStart(2, '0');
                const nd = new NepaliDate(y, m - 1, d);
                adDateStr = formatDateLocal(nd.toJsDate());
            }
        } catch (e) {
            console.error("Date conversion error", e);
        }
    }
    setFormData(prev => {
        const updated = {
            ...prev,
            regDateBs: val,
            regMonth: month,
            regDateAd: adDateStr,
            // Automatically set start date same as reg date by default for new entries
            vaccineStartDateBs: prev.vaccineStartDateBs || val,
            vaccineStartDateAd: prev.vaccineStartDateAd || adDateStr
        };
        if (!editingPatientId) {
            updated.schedule = calculateSchedule(updated.vaccineStartDateAd || adDateStr, updated.vaccineStartDateBs || val, prev.regimen);
        }
        return updated;
    });
  };

  const handleVaccineStartDateChange = (val: string) => {
      let adDateStr = '';
      if (val) {
          try {
              const parts = val.split(/[-/]/);
              const [y, m, d] = parts.map(Number);
              const nd = new NepaliDate(y, m - 1, d);
              adDateStr = formatDateLocal(nd.toJsDate());
          } catch (e) {}
      }
      setFormData(prev => {
          const updated = {
              ...prev,
              vaccineStartDateBs: val,
              vaccineStartDateAd: adDateStr
          };
          if (!editingPatientId) {
              updated.schedule = calculateSchedule(adDateStr, val, prev.regimen);
          }
          return updated;
      });
  };

  // MODIFIED: Calculate schedule logic for D7 to be 4 days after D3
  const calculateSchedule = (startDateAd: string, startDateBs: string, regimen: string): VaccinationDose[] => {
      if (!startDateAd || !startDateBs) return [];
      const startAd = new Date(startDateAd);
      const schedule: VaccinationDose[] = [];

      // Helper to convert AD Date object to BS date string
      const adDateToBsString = (adDate: Date) => {
          try {
              return new NepaliDate(adDate).format('YYYY-MM-DD');
          } catch (e) {
              console.error("Error converting AD Date object to BS string:", e);
              return ''; // Fallback
          }
      };

      // Day 0
      const d0DateAd = formatDateLocal(startAd);
      schedule.push({
          day: 0,
          date: d0DateAd,
          dateBs: adDateToBsString(startAd), // <-- ADDED dateBs
          status: 'Pending'
      });

      // Day 3
      const d3DateAdObj = new Date(startAd);
      d3DateAdObj.setDate(startAd.getDate() + 3);
      const d3DateAd = formatDateLocal(d3DateAdObj);
      schedule.push({
          day: 3,
          date: d3DateAd,
          dateBs: adDateToBsString(d3DateAdObj), // <-- ADDED dateBs
          status: 'Pending'
      });

      // Day 7 (4 days after D3)
      const d7DateAdObj = new Date(d3DateAdObj); // IMPORTANT: Base D7 on D3 date
      d7DateAdObj.setDate(d3DateAdObj.getDate() + 4); // Add 4 days to D3 date
      const d7DateAd = formatDateLocal(d7DateAdObj);
      schedule.push({
          day: 7,
          date: d7DateAd,
          dateBs: adDateToBsString(d7DateAdObj), // <-- ADDED dateBs
          status: 'Pending'
      });

      // For Intramuscular, add D14 and D28 (based on D0 start as per previous logic)
      if (regimen === 'Intramuscular') {
          // Day 14
          const d14DateAdObj = new Date(startAd);
          d14DateAdObj.setDate(startAd.getDate() + 14);
          const d14DateAd = formatDateLocal(d14DateAdObj);
          schedule.push({
              day: 14,
              date: d14DateAd,
              dateBs: adDateToBsString(d14DateAdObj), // <-- ADDED dateBs
              status: 'Pending'
          });

          // Day 28
          const d28DateAdObj = new Date(startAd);
          d28DateAdObj.setDate(startAd.getDate() + 28);
          const d28DateAd = formatDateLocal(d28DateAdObj);
          schedule.push({
              day: 28,
              date: d28DateAd,
              dateBs: adDateToBsString(d28DateAdObj), // <-- ADDED dateBs
              status: 'Pending'
          });
      }

      return schedule.sort((a, b) => a.day - b.day); // Ensure schedule is ordered by day
  };

  const calculatePreviousVaccineGap = useMemo(() => {
      if (!formData.hasPreviousVaccine || !formData.previousVaccineDateBs || !formData.vaccineStartDateBs) return null;
      try {
          // Convert both BS dates to AD using nepali-date-converter to ensure correct diff
          const prevDate = new NepaliDate(formData.previousVaccineDateBs).toJsDate();
          const currDate = new NepaliDate(formData.vaccineStartDateBs).toJsDate();
          
          // Difference in milliseconds
          const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const diffMonths = Math.floor(diffDays / 30);
          
          return { days: diffDays, months: diffMonths };
      } catch (e) {
          return null;
      }
  }, [formData.hasPreviousVaccine, formData.previousVaccineDateBs, formData.vaccineStartDateBs]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.regDateBs || !formData.exposureCategory) {
          alert("कृपया आवश्यक विवरणहरू भर्नुहोस् (नाम, मिति र WHO Category अनिवार्य छन्)");
          return;
      }

      if (editingPatientId) {
          onUpdatePatient({
              ...formData,
              id: editingPatientId
          });
          alert('बिरामीको विवरण सफलतापूर्वक अपडेट भयो');
          handleReset();
      } else {
          const newPatient = {
              ...formData,
              id: Date.now().toString(),
              // Ensure that when newPatient is created, the schedule is also calculated with BS dates
              schedule: calculateSchedule(formData.vaccineStartDateAd || formData.regDateAd, formData.vaccineStartDateBs || formData.regDateBs, formData.regimen)
          };
          onAddPatient(newPatient);
          handleReset();
          alert('बिरामी सफलतापूर्वक दर्ता भयो');
      }
  };

  const handleEditPatient = (p: RabiesPatient) => {
      setEditingPatientId(p.id);
      setFormData({ ...p });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    const today = new NepaliDate();
    const todayAd = formatDateLocal(new Date());
    setEditingPatientId(null);
    setFormData({
        id: '',
        fiscalYear: currentFiscalYear,
        regNo: generateRegNo(),
        regMonth: String(today.getMonth() + 1).padStart(2, '0'),
        regDateBs: today.format('YYYY-MM-DD'),
        regDateAd: todayAd,
        vaccineStartDateBs: today.format('YYYY-MM-DD'),
        vaccineStartDateAd: todayAd,
        name: '', age: '', sex: '', address: '', phone: '',
        animalType: '', exposureCategory: '', bodyPart: '', // Reset new field
        exposureDateBs: today.format('YYYY-MM-DD'),
        regimen: 'Intradermal',
        schedule: [],
        hasPreviousVaccine: false,
        previousVaccineDateBs: ''
    });
  };

  const handleDeleteClick = (pId: string, pName: string) => {
      if (!pId) return;
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं "${pName}" को विवरण हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
          if (onDeletePatient) onDeletePatient(pId);
      }
  };

  const confirmDoseUpdate = () => {
      if (!selectedDoseInfo) return;
      setDoseUpdateError(null);
      
      if (!modalDateBs) {
          setDoseUpdateError("कृपया खोप लगाएको मिति छान्नुहोस्");
          return;
      }

      const { patient, doseIndex, dose } = selectedDoseInfo;
      let givenDateAd = '';
      try {
          const parts = modalDateBs.split(/[-/]/);
          const [y, m, d] = parts.map(Number);
          const nd = new NepaliDate(y, m - 1, d);
          givenDateAd = formatDateLocal(nd.toJsDate());
      } catch (e) {
          setDoseUpdateError("मिति ढाँचा मिलेन");
          return;
      }
      
      // Allow Day 0 (D0) to be before scheduled date (Reg Date) even for non-admins
      if (!isAdmin && dose.day !== 0 && givenDateAd < dose.date) {
          const scheduledBs = convertAdToBsFull(dose.date);
          setDoseUpdateError(`यो खोपको निर्धारित मिति ${scheduledBs} हो। तोकिएको मिति भन्दा अगाडि खोप लगाएको विवरण राख्न मिल्दैन।`);
          return;
      }

      const todayAd = formatDateLocal(new Date());
      if (givenDateAd > todayAd) {
          setDoseUpdateError("आजको मिति भन्दा पछिको विवरण राख्न मिल्दैन।");
          return;
      }

      const updatedSchedule = [...patient.schedule];
      updatedSchedule[doseIndex] = {
          ...updatedSchedule[doseIndex],
          status: 'Given',
          dateBs: modalDateBs, // <--- UPDATED AS PER REQUEST: Set dateBs to the given date (Actual Date)
          givenDate: modalDateBs 
      };

      // NEW LOGIC: Update D7 schedule if D3 is given
      if (dose.day === 3) {
          try {
              // Convert given date (modalDateBs) to Date object
              // nepali-date-converter parses YYYY-MM-DD correctly
              const d3GivenDate = new NepaliDate(modalDateBs).toJsDate();
              
              // Calculate D7 Date = D3 Given Date + 4 Days
              const d7Date = new Date(d3GivenDate);
              d7Date.setDate(d7Date.getDate() + 4);
              
              const d7DateAdStr = formatDateLocal(d7Date);
              const d7DateBsStr = new NepaliDate(d7Date).format('YYYY-MM-DD');

              // Find D7 index
              const d7Index = updatedSchedule.findIndex(d => d.day === 7);
              if (d7Index !== -1) {
                  updatedSchedule[d7Index] = {
                      ...updatedSchedule[d7Index],
                      date: d7DateAdStr,
                      dateBs: d7DateBsStr
                      // Keep status as pending (or whatever it was)
                  };
              }
          } catch (e) {
              console.error("Error recalculating D7 date:", e);
          }
      }

      onUpdatePatient({ ...patient, schedule: updatedSchedule });
      setSelectedDoseInfo(null);
  };

  const handleDoseClick = (p: RabiesPatient, idx: number, dose: VaccinationDose) => {
      setSelectedDoseInfo({ patient: p, doseIndex: idx, dose });
      setDoseUpdateError(null);
      
      if (dose.status === 'Given' && dose.givenDate) {
          setModalDateBs(dose.givenDate);
      } else {
          try {
              const today = new NepaliDate();
              const todayAdStr = formatDateLocal(new Date());
              
              if (todayAdStr < dose.date) {
                  setModalDateBs(convertAdToBsFull(dose.date));
              } else {
                  setModalDateBs(today.format('YYYY-MM-DD'));
              }
          } catch (e) {
              setModalDateBs('');
          }
      }
  };

  const filteredPatients = useMemo(() => {
    return patients
      .filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.regNo.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by ID (which is timestamp-based) in descending order to show newest first
        return parseInt(b.id) - parseInt(a.id);
      });
  }, [patients, searchTerm]);

  const todayAd = getTodayDateAd();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Syringe size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">
                    {editingPatientId ? 'विवरण सच्याउनुहोस् (Edit Details)' : 'रेबिज खोप दर्ता (Rabies Registration)'}
                </h2>
                <p className="text-sm text-slate-500 font-nepali">नयाँ बिरामी दर्ता र खोप तालिका व्यवस्थापन</p>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          {editingPatientId && (
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          )}
          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-3 bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center gap-4">
                  <div className="bg-white p-2 rounded border border-indigo-200">
                      <FileDigit size={20} className="text-indigo-600" />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide">दर्ता नम्बर (Reg No)</label>
                      <input value={formData.regNo} readOnly className="bg-transparent font-mono text-lg font-bold text-slate-800 p-0 outline-none w-full" />
                  </div>
                  <div className="ml-auto text-right">
                      <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide">आर्थिक वर्ष</label>
                      <div className="font-nepali font-medium text-slate-700">{currentFiscalYear}</div>
                  </div>
              </div>

              <div className="grid grid-cols-2 md:col-span-1 gap-4">
                 <NepaliDatePicker label="दर्ता मिति (BS)" value={formData.regDateBs} onChange={handleRegDateBsChange} required disabled={!!editingPatientId && !isAdmin} />
                 <NepaliDatePicker label="खोप सुरु मिति (D0)" value={formData.vaccineStartDateBs || ''} onChange={handleVaccineStartDateChange} required disabled={!!editingPatientId && !isAdmin} />
              </div>

              <Select label="दर्ता महिना" value={formData.regMonth} onChange={e => setFormData({...formData, regMonth: e.target.value})} options={nepaliMonthOptions} icon={<CalendarRange size={16} />} />
              <Input label="अंग्रेजी मिति (AD)" value={formData.regDateAd} readOnly className="bg-slate-50 text-slate-500" icon={<Calendar size={16} />} />

              <Input label="बिरामीको नाम" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Full Name" icon={<User size={16} />} />

              <div className="grid grid-cols-2 gap-4">
                  <Input label="उमेर" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required placeholder="Yr" type="number" />
                  <Select label="लिङ्ग" value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} options={[{id: 'm', value: 'Male', label: 'पुरुष'}, {id: 'f', value: 'Female', label: 'महिला'}, {id: 'o', value: 'Other', label: 'अन्य'}]} required />
              </div>

              <Input label="सम्पर्क नं" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required placeholder="98XXXXXXXX" icon={<Phone size={16} />} />

              <div className="md:col-span-1">
                  <Input label="ठेगाना" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required placeholder="Municipality-Ward" icon={<MapPin size={16} />} />
              </div>

              <NepaliDatePicker label="टोकेको मिति (Bite Date)" value={formData.exposureDateBs} onChange={val => setFormData({...formData, exposureDateBs: val})} required />

              <Select label="टोक्ने जनावर" value={formData.animalType} onChange={e => setFormData({...formData, animalType: e.target.value})} options={animalTypeOptions} required />
              <Select label="WHO Category (Exposure)" value={formData.exposureCategory} onChange={e => setFormData({...formData, exposureCategory: e.target.value})} options={whoCategoryOptions} required icon={<AlertTriangle size={16} />} />
              {/* NEW FIELD: Body Part */}
              <Input label="टोकेको भाग / ठाउँ (Body Part)" value={formData.bodyPart} onChange={e => setFormData({...formData, bodyPart: e.target.value})} placeholder="e.g. हात, खुट्टा, अनुहार" icon={<Bone size={16} />} />

              {/* SECTION: PREVIOUS VACCINATION HISTORY */}
              <div className="md:col-span-3 mt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 font-nepali mb-3 flex items-center gap-2"><History size={18} className="text-orange-600"/> विगतको खोप विवरण (Previous Vaccination History)</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                      <Select 
                          label="के यसअघि रेबिज खोप लगाउनुभएको छ?"
                          options={[{id: 'yes', value: 'yes', label: 'छ (Yes)'}, {id: 'no', value: 'no', label: 'छैन (No)'}]}
                          value={formData.hasPreviousVaccine ? 'yes' : 'no'}
                          onChange={e => setFormData({...formData, hasPreviousVaccine: e.target.value === 'yes'})}
                      />
                      {formData.hasPreviousVaccine && (
                          <div className="space-y-2">
                              <NepaliDatePicker 
                                  label="अन्तिम खोप लगाएको मिति (BS)"
                                  value={formData.previousVaccineDateBs || ''}
                                  onChange={val => setFormData({...formData, previousVaccineDateBs: val})}
                              />
                              {calculatePreviousVaccineGap && (
                                  <div className={`text-xs p-2 rounded flex items-start gap-2 ${calculatePreviousVaccineGap.months < 3 ? 'bg-orange-100 text-orange-800' : 'bg-green-50 text-green-800'}`}>
                                      <Info size={14} className="mt-0.5 shrink-0" />
                                      <div>
                                          <strong>समयावधि:</strong> {calculatePreviousVaccineGap.months} महिना {calculatePreviousVaccineGap.days % 30} दिन अगाडि
                                          {calculatePreviousVaccineGap.months < 3 && <div className="font-bold mt-1">⚠️ ३ महिना भन्दा कम समय भएकोले बुस्टर मात्र दिन सकिन्छ (Check Protocol)</div>}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>

              <div className="md:col-span-3 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2" onClick={handleReset}><RotateCcw size={18} /> {editingPatientId ? 'रद्द गर्नुहोस्' : 'रिसेट'}</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-100 transition-all font-bold text-sm"><Save size={16}/> {editingPatientId ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस्'}</button>
              </div>
          </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-700 font-nepali">बिरामी फलोअप सूची (Follow-up List)</h3>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{filteredPatients.length} Patients</span>
              </div>
              <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="नाम वा दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                      <th className="px-6 py-3">दर्ता नं</th>
                      <th className="px-6 py-3">बिरामी / जनावर / Category</th>
                      <th className="px-6 py-3">खोप तालिका (Follow-up) [BS Month-Day]</th>
                      <th className="px-6 py-3 text-right">कार्य (Action)</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic font-nepali">डाटा फेला परेन</td></tr>
                  ) : (
                      filteredPatients.map(p => (
                          <tr key={p.id} className={`hover:bg-slate-50 ${editingPatientId === p.id ? 'bg-indigo-50/30' : ''}`}>
                              <td className="px-6 py-4 font-mono font-medium text-indigo-600">{p.regNo}</td>
                              <td className="px-6 py-4">
                                  <div className="font-medium text-slate-800">{p.name}</div>
                                  
                                  {/* Age and Address Display */}
                                  <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap gap-1">
                                     <span>{p.age} बर्ष ({p.sex.charAt(0)})</span>
                                     <span className="text-slate-300">|</span>
                                     <span>{p.address}</span>
                                  </div>

                                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                                    <span className="bg-slate-100 px-1 rounded">{p.animalType}</span>
                                    {p.exposureDateBs && <span className="bg-slate-100 px-1 rounded text-slate-600 font-medium">Bite: {p.exposureDateBs}</span>}
                                    <span className={`px-1 rounded font-bold border ${
                                        p.exposureCategory === 'Category III' ? 'bg-red-50 text-red-700 border-red-200' :
                                        p.exposureCategory === 'Category II' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                      {p.exposureCategory}
                                    </span>
                                  </div>
                                  {p.hasPreviousVaccine && (
                                      <div className="mt-1 text-[10px] text-orange-700 flex items-center gap-1 font-bold">
                                          <History size={10} /> Prev. Vaccine: Yes ({p.previousVaccineDateBs})
                                      </div>
                                  )}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1">
                                      {(p.schedule || []).map((dose, idx) => {
                                          const isOverdue = dose.status === 'Pending' && new Date(dose.date) < new Date(todayAd);
                                          // Display scheduled date OR actual given date if administered
                                          // For display in button: Use dateBs if present (either scheduled or actual)
                                          // If it's the actual given date, it's already in dose.dateBs from the update logic
                                          
                                          // Helper to get day/month string
                                          const displayDate = dose.dateBs ? dose.dateBs.split('-').slice(1).join('-') : 'N/A';

                                          return (
                                              <button
                                                  key={idx}
                                                  type="button"
                                                  onClick={() => handleDoseClick(p, idx, dose)}
                                                  disabled={dose.status === 'Given' && !isAdmin}
                                                  className={`
                                                      px-2 py-1 rounded text-[10px] font-bold border
                                                      ${dose.status === 'Given'
                                                          ? 'bg-green-100 text-green-700 border-green-200'
                                                          : isOverdue
                                                              ? 'bg-red-100 text-red-700 border-red-200 animate-pulse'
                                                              : 'bg-blue-50 text-blue-700 border-blue-200'
                                                      }
                                                      ${(dose.status === 'Given' && !isAdmin) ? 'opacity-70 cursor-not-allowed' : ''}
                                                  `}
                                              >
                                                  D{dose.day} ({displayDate})
                                                  {dose.status === 'Given' && <Check size={10} className="inline-block ml-1" />}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => handleEditPatient(p)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50 transition-colors" title="Edit Patient"><Pencil size={18}/></button>
                                      {isAdmin && (
                                          <button onClick={() => handleDeleteClick(p.id, p.name)} className="text-red-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors" title="Delete Patient"><Trash2 size={18}/></button>
                                      )}
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
      {selectedDoseInfo && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-24">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDoseInfo(null)}></div>
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                      <div className="flex items-center gap-2">
                          <Syringe size={20} className="text-indigo-600"/>
                          <h3 className="font-bold text-slate-800 font-nepali text-sm">खोप स्थिति अपडेट (Update Dose Status)</h3>
                      </div>
                      <button type="button" onClick={() => setSelectedDoseInfo(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="text-center">
                          <h4 className="text-lg font-bold text-slate-800">{selectedDoseInfo.patient.name}</h4>
                          <p className="text-sm text-slate-600">खोप: <span className="font-bold text-indigo-700">D{selectedDoseInfo.dose.day}</span></p>
                          <p className="text-xs text-slate-500">निर्धारित मिति (Scheduled): {convertAdToBsFull(selectedDoseInfo.dose.date)}</p>
                      </div>
                      
                      {doseUpdateError && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-red-700 text-xs flex items-start gap-2 animate-pulse">
                              <AlertCircle size={16} className="mt-0.5 shrink-0" />
                              <span>{doseUpdateError}</span>
                          </div>
                      )}

                      {/* FIX: Corrected value prop from modalGivenDateBs to modalDateBs */}
                      <NepaliDatePicker 
                          label="खोप दिएको मिति (Given Date - BS)" 
                          value={modalDateBs} 
                          onChange={setModalDateBs} 
                          required
                          disabled={selectedDoseInfo.dose.status === 'Given' && !isAdmin}
                      />
                      
                      {selectedDoseInfo.dose.status === 'Given' && (
                          <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center font-nepali text-green-700">
                              <CheckCircle2 size={20} className="mx-auto mb-1" />
                              <span className="font-bold">खोप लगाइसकियो (Locked)</span>
                              {isAdmin && <p className="text-xs mt-1">एडमिनले मात्र सम्पादन गर्न सक्छ (Only Admin can edit)</p>}
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                      <button type="button" onClick={() => setSelectedDoseInfo(null)} className="flex-1 py-2 text-slate-600 font-medium font-nepali hover:bg-slate-200 rounded-lg transition-colors text-sm">बन्द (Close)</button>
                      {(selectedDoseInfo.dose.status !== 'Given' || isAdmin) && (
                          <button type="button" onClick={confirmDoseUpdate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-sm font-nepali hover:bg-indigo-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                              <Check size={16} />
                              सुरक्षित गर्नुहोस्
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
