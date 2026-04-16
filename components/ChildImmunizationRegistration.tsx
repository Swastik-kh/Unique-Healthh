
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Baby, Calendar, FileDigit, User, Phone, MapPin, Plus, Edit, Trash2, Search, UsersRound, Weight, Droplets, CheckCircle2, AlertTriangle, Info, Code, CalendarClock, MapPinned, X } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Option, OrganizationSettings } from '../types/coreTypes';
import { ChildImmunizationRecord, ChildImmunizationVaccine } from '../types/healthTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ChildImmunizationRegistrationProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
  generalSettings: OrganizationSettings;
  onAddRecord: (record: ChildImmunizationRecord) => void;
  onUpdateRecord: (record: ChildImmunizationRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

const genderOptions: Option[] = [
  { id: 'male', value: 'Male', label: 'पुरुष (Male)' },
  { id: 'female', value: 'Female', label: 'महिला (Female)' },
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

const jatCodeOptions: Option[] = [
  { id: '01', value: '01', label: '०१' },
  { id: '02', value: '02', label: '०२' },
  { id: '03', value: '03', label: '०३' },
  { id: '04', value: '04', label: '०४' },
  { id: '05', value: '05', label: '०५' },
  { id: '06', value: '06', label: '०६' },
];

export const NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE = [
    { name: 'BCG (जन्ममा)', relativeDays: 0, base: 'dob' },
    { name: 'DPT-HepB-Hib-1 (६ हप्ता)', relativeDays: 42, base: 'dob' },
    { name: 'OPV-1 (६ हप्ता)', relativeDays: 42, base: 'dob' },
    { name: 'PCV-1 (६ हप्ता)', relativeDays: 42, base: 'dob' },
    { name: 'Rota-1 (६ हप्ता)', relativeDays: 42, base: 'dob' },
    { name: 'DPT-HepB-Hib-2 (१० हप्ता)', relativeDays: 28, base: 'DPT-HepB-Hib-1 (६ हप्ता)' },
    { name: 'OPV-2 (१० हप्ता)', relativeDays: 28, base: 'OPV-1 (६ हप्ता)' },
    { name: 'Rota-2 (१० हप्ता)', relativeDays: 28, base: 'Rota-1 (६ हप्ता)' },
    { name: 'PCV-2 (१० हप्ता)', relativeDays: 28, base: 'PCV-1 (६ हप्ता)' },
    { name: 'FIPV (१४ हप्ता)', relativeDays: 28, base: 'DPT-HepB-Hib-2 (१० हप्ता)' },
    { name: 'DPT-HepB-Hib-3 (१४ हप्ता)', relativeDays: 28, base: 'DPT-HepB-Hib-2 (१० हप्ता)' },
    { name: 'OPV-3 (१४ हप्ता)', relativeDays: 28, base: 'OPV-2 (६ हप्ता)' },
    { name: 'MR-1 (९ महिना)', relativeDays: 270, base: 'dob' },
    { name: 'JE (९ महिना)', relativeDays: 270, base: 'dob' }, 
    { name: 'PCV-3 (९ महिना)', relativeDays: 270, base: 'dob' }, 
    { name: 'MR-2 (१५ महिना)', relativeDays: 450, base: 'dob' },
    { name: 'Typhoid (१५ महिना)', relativeDays: 450, base: 'dob' },
    { name: 'HPV (१४ वर्ष)', relativeDays: 5110, base: 'dob', femaleOnly: true }, 
];

const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    }
    return new Date();
};

const toLocalISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calculateImmunizationDate = (
    dobAd: string,
    relativeDays: number,
    baseName: string,
    allVaccines: ChildImmunizationVaccine[] = []
): { bs: string; ad: string; } => {
    try {
        let actualBaseAdDate = parseDateLocal(dobAd);
        
        if (baseName !== 'dob') {
            const baseVaccine = allVaccines.find(v => v.name === baseName);
            if (baseVaccine && baseVaccine.givenDateAd) {
                actualBaseAdDate = parseDateLocal(baseVaccine.givenDateAd);
            } else {
                return { bs: "N/A", ad: "N/A" };
            }
        }

        const scheduledAdDate = new Date(actualBaseAdDate);
        scheduledAdDate.setDate(actualBaseAdDate.getDate() + relativeDays);
        const scheduledAdDateString = toLocalISO(scheduledAdDate);

        // FIX: Corrected month index for NepaliDate constructor by passing the Date object directly
        let scheduledNepaliDate = new NepaliDate(scheduledAdDate);
        
        return {
            bs: scheduledNepaliDate.format('YYYY-MM-DD'),
            ad: scheduledAdDateString,
        };
    } catch (e) {
        console.error("Error calculating immunization date:", e); // Added error logging
        return { bs: "Error", ad: "Error" };
    }
};

export const ChildImmunizationRegistration: React.FC<ChildImmunizationRegistrationProps> = ({
  currentFiscalYear,
  records,
  generalSettings,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedVaccineForUpdate, setSelectedVaccineForUpdate] = useState<{ record: ChildImmunizationRecord; vaccineIndex: number; } | null>(null);
  const [modalGivenDateBs, setModalGivenDateBs] = useState('');

  const centerOptions: Option[] = (generalSettings.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c }));

  const getTodayAd = () => toLocalISO(new Date());
  const getTodayBs = () => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  };

  const generateRegNo = (fy: string, recordsList: ChildImmunizationRecord[]) => {
    const fyClean = fy.replace('/', '');
    const maxNum = recordsList
      .filter(p => p.fiscalYear === fy && p.regNo.startsWith(`CIP-${fyClean}-`))
      .map(p => parseInt(p.regNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    return `CIP-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState<ChildImmunizationRecord>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: generateRegNo(currentFiscalYear, records),
    childName: '',
    gender: 'Male',
    dobBs: getTodayBs(),
    dobAd: getTodayAd(),
    jatCode: '',
    motherName: '',
    fatherName: '',
    address: '',
    phone: '',
    birthWeightKg: undefined,
    vaccines: [],
    remarks: '',
    vaccinationCenter: centerOptions[0]?.value || '',
  });

  useEffect(() => {
    if (!editingRecordId) {
        setFormData(prev => ({
            ...prev,
            fiscalYear: currentFiscalYear,
            regNo: generateRegNo(currentFiscalYear, records),
            dobBs: getTodayBs(),
            dobAd: getTodayAd(),
            jatCode: '',
            vaccines: [],
            vaccinationCenter: centerOptions[0]?.value || '',
        }));
    }
  }, [currentFiscalYear, records, editingRecordId, centerOptions[0]?.value]);

  useEffect(() => {
    if (formData.dobBs && !editingRecordId) {
        try {
            const filteredTemplate = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(v => {
                if (v.name.includes('HPV') && formData.gender === 'Male') return false;
                return true;
            });

            const newSchedule: ChildImmunizationVaccine[] = filteredTemplate.map(vaccine => {
                const { bs: scheduledDateBs, ad: scheduledDateAdString } = calculateImmunizationDate(
                    formData.dobAd,
                    vaccine.relativeDays,
                    vaccine.base,
                    []
                );

                return {
                    name: vaccine.name,
                    scheduledDateAd: scheduledDateAdString,
                    scheduledDateBs: scheduledDateBs,
                    givenDateAd: null, 
                    givenDateBs: null, 
                    status: 'Pending',
                } as ChildImmunizationVaccine;
            });
            setFormData(prev => ({ ...prev, vaccines: newSchedule }));
        } catch (e) {
            setValidationError("Error calculating schedule.");
        }
    }
  }, [formData.dobBs, formData.dobAd, formData.gender, editingRecordId]);

  const handleDOBBsChange = (dateBs: string) => {
    let dateAd = '';
    if (dateBs) {
      try {
        const nd = new NepaliDate(dateBs);
        dateAd = toLocalISO(nd.toJsDate());
      } catch (e) {}
    }
    setFormData(prev => ({ ...prev, dobBs: dateBs, dobAd: dateAd }));
  };

  const recalculateFutureDoses = useCallback((
    currentVaccines: ChildImmunizationVaccine[], 
    givenDoseName: string, 
    givenDateAd: string,
    givenDateBs: string,
    childDobAd: string,
    childGender: string
  ): ChildImmunizationVaccine[] => {
    const updatedVaccinesMap = new Map<string, ChildImmunizationVaccine>();
    currentVaccines.forEach(v => updatedVaccinesMap.set(v.name, v));
    
    if (givenDoseName) {
        const justGivenVaccine = updatedVaccinesMap.get(givenDoseName);
        if (justGivenVaccine) {
            updatedVaccinesMap.set(givenDoseName, { 
                ...justGivenVaccine, 
                givenDateAd, 
                givenDateBs, 
                status: 'Given'
            });
        }
    }

    const finalVaccinesOrdered: ChildImmunizationVaccine[] = [];

    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(templateVaccine => {
        if (templateVaccine.name.includes('HPV') && childGender === 'Male') return;

        const existingVaccineInMap = updatedVaccinesMap.get(templateVaccine.name);

        if (existingVaccineInMap && existingVaccineInMap.status === 'Given') {
            finalVaccinesOrdered.push(existingVaccineInMap);
        } else {
            const { bs: newScheduledDateBs, ad: newScheduledDateAd } = calculateImmunizationDate(
                childDobAd,
                templateVaccine.relativeDays,
                templateVaccine.base,
                Array.from(updatedVaccinesMap.values())
            );

            if (existingVaccineInMap) {
                finalVaccinesOrdered.push({
                    ...existingVaccineInMap,
                    scheduledDateAd: newScheduledDateAd,
                    scheduledDateBs: newScheduledDateBs,
                });
            } else {
                // This branch handles cases where a vaccine is in the template but not in existing vaccines
                finalVaccinesOrdered.push({
                    name: templateVaccine.name,
                    scheduledDateAd: newScheduledDateAd,
                    scheduledDateBs: newScheduledDateBs,
                    givenDateAd: null, givenDateBs: null,
                    status: 'Pending',
                });
            }
        }
    });

    return finalVaccinesOrdered;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.childName.trim() || !formData.dobBs.trim() || !formData.jatCode?.trim() || !formData.vaccinationCenter) {
      setValidationError("कृपया सबै तारा चिन्हित (*) विवरणहरू भर्नुहोस्।");
      return;
    }

    // Sanitize optional fields to null if they are undefined
    const sanitizedData = {
      ...formData,
      birthWeightKg: formData.birthWeightKg || null,
      remarks: formData.remarks || null,
      vaccinationCenter: formData.vaccinationCenter || null,
      jatCode: formData.jatCode || null,
    };

    const recordToSave: ChildImmunizationRecord = {
      ...sanitizedData,
      id: editingRecordId || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };

    if (editingRecordId) onUpdateRecord(recordToSave);
    else onAddRecord(recordToSave);
    
    setSuccessMessage('रेकर्ड सफलतापूर्वक सुरक्षित भयो!');
    handleReset();
    // NEW: Clear filters after successful save to ensure new/updated record is visible
    setSearchTerm('');
    // setFilterCenter(''); // No filterCenter state in this file directly
    // setFilterDay(''); // No filterDay state in this file directly
  };

  const handleEditRecord = (record: ChildImmunizationRecord) => {
    setEditingRecordId(record.id);
    const loadedRecord = { 
        ...record,
        vaccines: record.vaccines.map(v => ({
            ...v,
            givenDateAd: v.givenDateAd || null,
            givenDateBs: v.givenDateBs || null,
        }))
    };
    const reEvaluatedVaccines = recalculateFutureDoses(loadedRecord.vaccines, "", "", "", loadedRecord.dobAd, loadedRecord.gender);
    setFormData({ ...loadedRecord, vaccines: reEvaluatedVaccines });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setEditingRecordId(null);
    setFormData(prev => ({
      ...prev,
      id: '',
      regNo: generateRegNo(currentFiscalYear, records),
      childName: '',
      gender: 'Male',
      dobBs: getTodayBs(),
      dobAd: getTodayAd(),
      jatCode: '',
      motherName: '',
      fatherName: '',
      address: '',
      phone: '',
      birthWeightKg: undefined,
      vaccines: [],
      remarks: '',
      vaccinationCenter: centerOptions[0]?.value || '',
    }));
    setValidationError(null);
    setSuccessMessage(null); // Clear success message on reset
  };

  const handleDeleteRecord = (recordId: string, childName: string) => {
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${childName} को रेकर्ड हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
      onDeleteRecord(recordId);
      setSuccessMessage(`${childName} को रेकर्ड सफलतापूर्वक हटाइयो।`);
    }
  };

  const handleUpdateDoseStatus = () => {
    if (!selectedVaccineForUpdate) return;
    const { record, vaccineIndex } = selectedVaccineForUpdate;
    const currentVaccine = record.vaccines[vaccineIndex];

    if (!modalGivenDateBs.trim()) {
        alert("कृपया खोप दिएको मिति भर्नुहोस्।");
        return;
    }
    
    const nd = new NepaliDate(modalGivenDateBs);
    const givenDateAd = toLocalISO(nd.toJsDate());

    const finalVaccines = recalculateFutureDoses(record.vaccines, currentVaccine.name, givenDateAd, modalGivenDateBs, record.dobAd, record.gender);
    onUpdateRecord({ ...record, vaccines: finalVaccines });
    setSelectedVaccineForUpdate(null);
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .filter(r => 
        r.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.jatCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vaccinationCenter?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [records, currentFiscalYear, searchTerm]);

  return (
    <div className="space-y-6">
      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 no-print">
          <AlertTriangle size={24} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">त्रुटि</h3>
            <p className="text-red-700 text-sm mt-1">{validationError}</p>
          </div>
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print">
          <CheckCircle2 size={24} className="text-green-500" />
          <div className="flex-1">
            <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो</h3>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={20} /></button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border shadow-sm no-print">
        <div className="flex items-center gap-2 mb-6 text-green-800 bg-green-50 p-3 rounded-lg border border-green-100">
            <Baby size={20} />
            <span className="font-semibold font-nepali">बच्चाको विवरण र खोप दर्ता</span>
        </div>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
          <Input label="दर्ता नम्बर" value={formData.regNo} readOnly className="bg-slate-50 font-bold text-green-700" icon={<FileDigit size={16} />} />
          <NepaliDatePicker label="जन्म मिति *" value={formData.dobBs} onChange={handleDOBBsChange} required />
          <Input label="बच्चाको नाम *" value={formData.childName} onChange={e => setFormData({...formData, childName: e.target.value})} required icon={<User size={16} />} />
          
          <Select label="खोप केन्द्र *" options={centerOptions} value={formData.vaccinationCenter || ''} onChange={e => setFormData({...formData, vaccinationCenter: e.target.value})} placeholder="-- केन्द्र छान्नुहोस् --" icon={<MapPinned size={16} />} />
          <Select label="लिङ्ग *" options={genderOptions} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})} />
          <Select label="जातीय कोड *" options={jatCodeOptions} value={formData.jatCode || ''} onChange={e => setFormData({...formData, jatCode: e.target.value})} placeholder="-- छान्नुहोस् --" icon={<Code size={16} />} />
          
          <Input label="आमाको नाम *" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} required icon={<User size={16} />} />
          <Input label="बुबाको नाम *" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} required icon={<User size={16} />} />
          <Input label="ठेगाना *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
          <Input label="फोन नं *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required icon={<Phone size={16} />} />
          
          <div className="md:col-span-3 pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={handleReset} className="px-6 py-2 bg-slate-100 rounded-lg text-sm font-bold">रिसेट</button>
            <button type="submit" className="px-8 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md">सुरक्षित गर्नुहोस्</button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 font-nepali">खोप तालिका विवरण</h3>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="नाम, दर्ता नं वा केन्द्र..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b">
              <tr>
                <th className="px-6 py-3">दर्ता नं / केन्द्र</th>
                <th className="px-6 py-3">बच्चाको विवरण</th>
                <th className="px-6 py-3">खोपको स्थिति</th>
                <th className="px-6 py-3 text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-green-700">{record.regNo}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1"><MapPinned size={10}/> {record.vaccinationCenter}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{record.childName}</div>
                    <div className="text-[10px] text-slate-400">{record.dobBs} | {record.motherName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                        {record.vaccines.map((v, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedVaccineForUpdate({ record, vaccineIndex: idx })}
                                className={`group relative cursor-pointer px-2 py-1 rounded text-[10px] font-bold border flex flex-col items-center min-w-[80px] transition-all
                                    ${v.status === 'Given' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400'}`}
                            >
                                <span className="mb-0.5">{v.name}</span>
                                <div className="flex flex-col text-[8px] font-normal leading-tight">
                                    <span className="flex items-center gap-0.5 opacity-70"><CalendarClock size={8}/> {v.scheduledDateBs}</span>
                                    {v.givenDateBs && <span className="flex items-center gap-0.5 text-green-700 font-bold"><CheckCircle2 size={8}/> {v.givenDateBs}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditRecord(record)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteRecord(record.id, record.childName)} className="text-red-600 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVaccineForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedVaccineForUpdate(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b bg-blue-50 text-blue-800 flex justify-between items-center">
                    <h3 className="font-bold font-nepali">खोप स्थिति अपडेट</h3>
                    <button onClick={() => setSelectedVaccineForUpdate(null)}><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-center bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-bold text-slate-800">{selectedVaccineForUpdate.record.childName}</h4>
                        <p className="text-xs font-bold text-blue-600 mt-1">{selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].name}</p>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs border-b pb-1">
                            <span className="text-slate-500">निर्धारित मिति (Scheduled):</span>
                            <span className="font-bold">{selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].scheduledDateBs}</span>
                        </div>
                        <NepaliDatePicker 
                            label="लगाएको वास्तविक मिति (Administered) *" 
                            value={modalGivenDateBs} 
                            onChange={setModalGivenDateBs} 
                            required
                        />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex gap-3">
                    <button onClick={() => setSelectedVaccineForUpdate(null)} className="flex-1 py-2 text-slate-600 font-bold border rounded-lg">रद्द</button>
                    <button onClick={handleUpdateDoseStatus} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm">सुरक्षित गर्नुहोस्</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};