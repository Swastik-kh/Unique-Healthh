
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Droplets, Calendar, FileDigit, User, Phone, MapPin, Plus, Edit, Trash2, Search, UsersRound, Baby, CheckCircle2, AlertTriangle, Info, Clock, Check, X } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { EnglishDatePicker } from './EnglishDatePicker';
import { Option } from '../types/coreTypes'; // Corrected import path
import { GarbhawatiPatient } from '../types/healthTypes'; // Corrected import path
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface GarbhawatiTDRegistrationProps {
  currentFiscalYear: string;
  patients: GarbhawatiPatient[];
  onAddPatient: (patient: GarbhawatiPatient) => void;
  onUpdatePatient: (patient: GarbhawatiPatient) => void;
  onDeletePatient: (patientId: string) => void;
}

const gravidaOptions: Option[] = [
  { id: '1', value: '1', label: 'Gravida 1' },
  { id: '2', value: '2', label: 'Gravida 2' },
  { id: '3', value: '3', label: 'Gravida 3' },
  { id: '4+', value: '4', label: 'Gravida 4+' },
];

export const GarbhawatiTDRegistration: React.FC<GarbhawatiTDRegistrationProps> = ({
  currentFiscalYear,
  patients,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDoseForUpdate, setSelectedDoseForUpdate] = useState<{ patient: GarbhawatiPatient; doseType: 'td1' | 'td2' | 'tdBooster'; } | null>(null);
  const [modalGivenDateBs, setModalGivenDateBs] = useState('');

  const getTodayAd = () => new Date().toISOString().split('T')[0];
  const getTodayBs = () => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  };

  const generateRegNo = (fy: string, patientsList: GarbhawatiPatient[]) => {
    const fyClean = fy.replace('/', '');
    const maxNum = patientsList
      .filter(p => p.fiscalYear === fy && p.regNo.startsWith(`GTD-${fyClean}-`))
      .map(p => parseInt(p.regNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    return `GTD-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState<GarbhawatiPatient>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: generateRegNo(currentFiscalYear, patients),
    name: '',
    age: '',
    address: '',
    phone: '',
    gravida: 1,
    lmpBs: getTodayBs(),
    lmpAd: getTodayAd(),
    eddBs: '',
    eddAd: '',
    td1DateBs: null, // Initialize as null
    td1DateAd: null, // Initialize as null
    td2DateBs: null, // Initialize as null
    td2DateAd: null, // Initialize as null
    tdBoosterDateBs: null, // Initialize as null
    tdBoosterDateAd: null, // Initialize as null
    remarks: '',
  });

  useEffect(() => {
    if (!editingPatientId) {
        setFormData(prev => ({
            ...prev,
            fiscalYear: currentFiscalYear,
            regNo: generateRegNo(currentFiscalYear, patients),
            lmpBs: getTodayBs(),
            lmpAd: getTodayAd(),
            eddBs: '', // Reset EDD for new entry
            eddAd: '',
            td1DateBs: null, // Reset to null
            td1DateAd: null, // Reset to null
            td2DateBs: null, // Reset to null
            td2DateAd: null, // Reset to null
            tdBoosterDateBs: null, // Reset to null
            tdBoosterDateAd: null, // Reset to null
        }));
    }
  }, [currentFiscalYear, patients, editingPatientId]);

  // Effect to calculate EDD based on LMP
  useEffect(() => {
    if (formData.lmpBs) {
      try {
        const lmpAdDate = new NepaliDate(formData.lmpBs).toJsDate();
        // Add 280 days (40 weeks) for EDD
        const eddAdDate = new Date(lmpAdDate.getTime() + (280 * 24 * 60 * 60 * 1000));
        setFormData(prev => ({
          ...prev,
          eddAd: eddAdDate.toISOString().split('T')[0],
          eddBs: new NepaliDate(eddAdDate).format('YYYY-MM-DD'),
        }));
      } catch (e) {
        console.error("Error calculating EDD:", e);
        setFormData(prev => ({ ...prev, eddAd: '', eddBs: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, eddAd: '', eddBs: '' }));
    }
  }, [formData.lmpBs]);


  const handleLMPBsChange = (dateBs: string) => {
    let dateAd = '';
    if (dateBs) {
      try {
        const nd = new NepaliDate(dateBs);
        dateAd = nd.toJsDate().toISOString().split('T')[0];
      } catch (e) {
        console.error("Invalid BS date for LMP conversion:", e);
      }
    }
    setFormData(prev => ({ ...prev, lmpBs: dateBs, lmpAd: dateAd }));
  };

  const validateForm = () => {
    setValidationError(null);
    if (!formData.name.trim()) return "बिरामीको नाम आवश्यक छ।";
    if (!formData.lmpBs.trim()) return "LMP मिति आवश्यक छ।";
    if (!formData.address.trim()) return "ठेगाना आवश्यक छ।";
    if (!formData.phone.trim()) return "फोन नम्बर आवश्यक छ।";
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
    // Ensure that when loading an existing patient, undefined values are converted to null
    // to match the form's state initialization.
    setFormData({ 
        ...patient,
        td1DateBs: patient.td1DateBs || null,
        td1DateAd: patient.td1DateAd || null,
        td2DateBs: patient.td2DateBs || null,
        td2DateAd: patient.td2DateAd || null,
        tdBoosterDateBs: patient.tdBoosterDateBs || null,
        tdBoosterDateAd: patient.tdBoosterDateAd || null,
        remarks: patient.remarks || null,
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
    setFormData(prev => ({
      ...prev,
      id: '',
      regNo: generateRegNo(currentFiscalYear, patients),
      name: '',
      age: '',
      address: '',
      phone: '',
      gravida: 1,
      lmpBs: getTodayBs(),
      lmpAd: getTodayAd(),
      eddBs: '',
      eddAd: '',
      td1DateBs: null, // Reset to null
      td1DateAd: null, // Reset to null
      td2DateBs: null, // Reset to null
      td2DateAd: null, // Reset to null
      tdBoosterDateBs: null, // Reset to null
      tdBoosterDateAd: null, // Reset to null
      remarks: '',
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

    const updatedPatient = { ...patient, [`${doseType}DateBs`]: modalGivenDateBs, [`${doseType}DateAd`]: givenDateAd };
    onUpdatePatient(updatedPatient);
    setSuccessMessage(`${doseType.toUpperCase()} खोप सफलतापूर्वक अपडेट भयो!`);
    setSelectedDoseForUpdate(null);
  };

  const filteredPatients = useMemo(() => {
    return patients
      .filter(p => p.fiscalYear === currentFiscalYear)
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [patients, currentFiscalYear, searchTerm]);

  // Helper to get estimated TD dates (based on LMP, 4 weeks after TD1, 6 months after TD2)
  const getEstimatedTDDate = (patient: GarbhawatiPatient, doseType: 'td1' | 'td2' | 'tdBooster') => {
    if (!patient.lmpAd) return { bs: 'N/A', ad: 'N/A' };

    try {
        const lmpAdDate = new Date(patient.lmpAd);
        let estimatedAdDate: Date | null = null;

        if (doseType === 'td1') {
            // TD1 is usually given early in pregnancy, we can just use a slightly offset LMP or let it be manual
            // For now, no auto-calc based on weeks, user will mark given
            return { bs: 'N/A', ad: 'N/A' }; 
        } else if (doseType === 'td2') {
            if (!patient.td1DateAd) return { bs: 'N/A', ad: 'N/A' };
            estimatedAdDate = new Date(patient.td1DateAd);
            estimatedAdDate.setDate(estimatedAdDate.getDate() + (4 * 7)); // 4 weeks after TD1
        } else if (doseType === 'tdBooster') {
            if (!patient.td2DateAd) return { bs: 'N/A', ad: 'N/A' };
            estimatedAdDate = new Date(patient.td2DateAd);
            estimatedAdDate.setMonth(estimatedAdDate.getMonth() + 6); // 6 months after TD2
        }

        if (estimatedAdDate) {
            return {
                ad: estimatedAdDate.toISOString().split('T')[0],
                bs: new NepaliDate(estimatedAdDate).format('YYYY-MM-DD'),
            };
        }
    } catch (e) {
        console.error("Error calculating estimated TD dates:", e);
    }
    return { bs: 'N/A', ad: 'N/A' };
  };

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

      {/* Registration Form */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-purple-800 bg-purple-50 p-3 rounded-lg border border-purple-100">
            <UsersRound size={20} />
            <span className="font-semibold font-nepali">बिरामीको विवरण (Patient Details)</span>
        </div>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <Input label="आर्थिक वर्ष" value={formData.fiscalYear} readOnly className="bg-slate-100 text-slate-600 font-medium cursor-not-allowed" icon={<Calendar size={16} />} />
            <Input label="दर्ता नम्बर (Reg No)" value={formData.regNo} readOnly className="font-mono font-bold text-purple-600" icon={<FileDigit size={16} />} />
            <NepaliDatePicker label="LMP मिति (BS) *" value={formData.lmpBs} onChange={handleLMPBsChange} required />
          </div>

          <Input label="बिरामीको नाम (Patient Name) *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required icon={<User size={16} />} />
          <Input label="उमेर (Age) *" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required type="number" icon={<Clock size={16} />} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="LMP (AD)" value={formData.lmpAd} readOnly className="bg-slate-100 text-slate-500 text-xs cursor-not-allowed" icon={<Calendar size={16} />} />
            <Input label="EDD (BS)" value={formData.eddBs} readOnly className="bg-slate-100 text-slate-500 text-xs cursor-not-allowed" icon={<Calendar size={16} />} />
          </div>

          <Select label="Gravida (गर्भावस्था संख्या)" options={gravidaOptions} value={formData.gravida.toString()} onChange={e => setFormData({...formData, gravida: parseInt(e.target.value)})} />
          
          <Input label="ठेगाना (Address) *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
          <Input label="फोन नं (Phone) *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required icon={<Phone size={16} />} />

          <Input label="कैफियत (Remarks)" value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="lg:col-span-3" />

          <div className="lg:col-span-3 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
              <RotateCcw size={18} /><span>रिसेट (Reset)</span>
            </button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium">
              <Save size={18} /><span>{editingPatientId ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस्'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Patient List & TD Schedule */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-700 font-nepali">गर्भवती महिलाहरूको सूची ({filteredPatients.length})</h3>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="नाम वा दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Reg No</th>
                <th className="px-6 py-3">Patient Details</th>
                <th className="px-6 py-3">LMP / EDD (BS)</th>
                <th className="px-6 py-3">TD1 / TD2 / Booster</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    {searchTerm ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै गर्भवती बिरामी दर्ता भएको छैन (No pregnant patients registered)'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-purple-600 whitespace-nowrap">{patient.regNo}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{patient.name} ({patient.age} वर्ष)</div>
                      <div className="text-xs text-slate-500">{patient.address}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-nepali">
                        LMP: {patient.lmpBs}
                        <div className="text-xs text-slate-500">EDD: {patient.eddBs}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                            {/* TD1 */}
                            <button 
                                type="button" 
                                onClick={() => setSelectedDoseForUpdate({ patient, doseType: 'td1' })}
                                className={`px-2 py-1 rounded text-[10px] font-bold border 
                                    ${patient.td1DateBs ? 'bg-green-100 text-green-700 border-green-200' :
                                    'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                            >
                                TD1 ({patient.td1DateBs ? patient.td1DateBs.slice(5) : 'Pending'})
                            </button>
                            {/* TD2 */}
                            <button 
                                type="button" 
                                onClick={() => setSelectedDoseForUpdate({ patient, doseType: 'td2' })}
                                disabled={!patient.td1DateBs} // Disable TD2 if TD1 not given
                                className={`px-2 py-1 rounded text-[10px] font-bold border 
                                    ${patient.td2DateBs ? 'bg-green-100 text-green-700 border-green-200' :
                                    !patient.td1DateBs ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                    'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                            >
                                TD2 ({patient.td2DateBs ? patient.td2DateBs.slice(5) : 'Pending'})
                            </button>
                            {/* TD Booster */}
                            <button 
                                type="button" 
                                onClick={() => setSelectedDoseForUpdate({ patient, doseType: 'tdBooster' })}
                                disabled={!patient.td2DateBs} // Disable Booster if TD2 not given
                                className={`px-2 py-1 rounded text-[10px] font-bold border 
                                    ${patient.tdBoosterDateBs ? 'bg-green-100 text-green-700 border-green-200' :
                                    !patient.td2DateBs ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                    'bg-purple-50 text-purple-700 border-purple-200'
                                    }`}
                            >
                                TD Booster ({patient.tdBoosterDateBs ? patient.tdBoosterDateBs.slice(5) : 'Pending'})
                            </button>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditPatient(patient)} className="text-primary-400 hover:text-primary-600 p-1"><Edit size={18} /></button>
                        <button onClick={() => handleDeletePatient(patient.id, patient.name)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-24">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDoseForUpdate(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-50/50">
                    <div className="flex items-center gap-2">
                        <Droplets size={20} className="text-purple-600"/>
                        <h3 className="font-bold text-slate-800 font-nepali text-sm">खोप स्थिति अपडेट (Update Dose Status)</h3>
                    </div>
                    {/* Added X icon for closing vaccine update modal */}
                    <button type="button" onClick={() => setSelectedDoseForUpdate(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <h4 className="text-lg font-bold text-slate-800">{selectedDoseForUpdate.patient.name}</h4>
                        <p className="text-sm text-slate-600">खोप: <span className="font-bold text-purple-700">{selectedDoseForUpdate.doseType.toUpperCase().replace('TD', 'TD ')}</span></p>
                        {selectedDoseForUpdate.patient.lmpBs && <p className="text-xs text-slate-500">LMP (BS): {selectedDoseForUpdate.patient.lmpBs}</p>}
                        {selectedDoseForUpdate.patient.eddBs && <p className="text-xs text-slate-500">EDD (BS): {selectedDoseForUpdate.patient.eddBs}</p>}
                    </div>
                    
                    <NepaliDatePicker 
                        label="खोप दिएको मिति (Given Date - BS)" 
                        value={modalGivenDateBs} 
                        onChange={setModalGivenDateBs} 
                        required
                        disabled={!!selectedDoseForUpdate.patient[`${selectedDoseForUpdate.doseType}DateBs`]} // Disable if already given
                    />
                    
                    {!!selectedDoseForUpdate.patient[`${selectedDoseForUpdate.doseType}DateBs`] && (
                        <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center font-nepali text-green-700">
                            <CheckCircle2 size={20} className="mx-auto mb-1" />
                            <span className="font-bold">खोप लगाइसकियो (Locked)</span>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button type="button" onClick={() => setSelectedDoseForUpdate(null)} className="flex-1 py-2 text-slate-600 font-medium font-nepali hover:bg-slate-200 rounded-lg transition-colors text-sm">बन्द (Close)</button>
                    {!selectedDoseForUpdate.patient[`${selectedDoseForUpdate.doseType}DateBs`] && (
                        <button type="button" onClick={handleUpdateDoseStatus} className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-sm font-nepali hover:bg-purple-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
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