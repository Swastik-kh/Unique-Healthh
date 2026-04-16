import React, { useState } from 'react';
import { UttarPrasutiRecord, PrasutiRecord, ServiceSeekerRecord } from '../types/coreTypes';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Input } from './Input';
import { 
  Activity, Scale, Thermometer, Baby, Droplets, Circle, User, Stethoscope, Calendar, UserCircle, Plus, X, Pencil, Trash2 
} from 'lucide-react';

interface UttarPrasutiSewaProps {
  currentFiscalYear: string;
  prasutiRecords: PrasutiRecord[];
  uttarPrasutiRecords: UttarPrasutiRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  onSave: (record: UttarPrasutiRecord) => void;
  onDelete: (id: string) => void;
}

const initialFormData: Omit<UttarPrasutiRecord, 'id'> = {
  fiscalYear: '',
  prasutiId: '',
  name: '',
  visitDate: '',
  findings: '',
  remarks: '',
  motherBp: '',
  motherWeight: undefined,
  motherTemp: '',
  motherBreastfeeding: '',
  motherLochia: '',
  motherUterineInvolution: '',
  motherGeneralCondition: '',
  babyWeight: undefined,
  babyTemp: '',
  babyBreastfeeding: '',
  babyUmbilicalCord: '',
  babyGeneralCondition: ''
};

export const UttarPrasutiSewa: React.FC<UttarPrasutiSewaProps> = ({ 
  currentFiscalYear, prasutiRecords, uttarPrasutiRecords, serviceSeekerRecords, onSave, onDelete 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<UttarPrasutiRecord, 'id'>>({
    ...initialFormData,
    fiscalYear: currentFiscalYear
  });

  const handleAddNew = () => {
    setShowSearch(true);
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    const patient = serviceSeekerRecords.find(
      (p) => 
        (p.uniquePatientId && p.uniquePatientId.trim() === query) || 
        (p.mulDartaNo && p.mulDartaNo.trim() === query) ||
        (p.registrationNumber && p.registrationNumber.trim() === query)
    );

    if (patient) {
      setIsEditing(null);
      // Try to find if she has a Prasuti record
      const prasuti = prasutiRecords.find(p => p.name === patient.name);
      
      setFormData({
        ...initialFormData,
        fiscalYear: currentFiscalYear,
        prasutiId: prasuti?.id || '',
        name: patient.name,
      });
      setShowSearch(false);
      setShowForm(true);
      setSearchQuery('');
      setSearchError('');
    } else {
      setSearchError('बिरामी फेला परेन। कृपया सही ID वा दर्ता नम्बर प्रविष्ट गर्नुहोस्।');
    }
  };

  const handleEdit = (record: UttarPrasutiRecord) => {
    setIsEditing(record.id);
    setFormData(record);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, id: isEditing || Date.now().toString() });
    handleCloseForm();
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">उत्तर प्रसूति सेवा</h2>
            <p className="text-sm text-slate-500">Post-Natal Service Records</p>
          </div>
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700">
          <Plus size={18} /> नयाँ रेकर्ड थप्नुहोस्
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                    <th className="p-3">नाम</th>
                    <th className="p-3">भेट मिति</th>
                    <th className="p-3">आमाको BP</th>
                    <th className="p-3">आमाको तौल</th>
                    <th className="p-3">शिशुको तौल</th>
                    <th className="p-3 text-right">कार्य</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {(uttarPrasutiRecords || []).filter(r => r.fiscalYear === currentFiscalYear).map(record => (
                    <tr key={record.id}>
                        <td className="p-3 font-medium">{record.name}</td>
                        <td className="p-3">{record.visitDate}</td>
                        <td className="p-3">{record.motherBp}</td>
                        <td className="p-3">{record.motherWeight} kg</td>
                        <td className="p-3">{record.babyWeight} kg</td>
                        <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Pencil size={16} /></button>
                                <button onClick={() => onDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                 {uttarPrasutiRecords.filter(r => r.fiscalYear === currentFiscalYear).length === 0 && (
                    <tr>
                        <td colSpan={6} className="text-center p-8 text-slate-500 italic">कुनै रेकर्ड भेटिएन।</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {showSearch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">बिरामी खोज्नुहोस्</h3>
              <button onClick={() => { setShowSearch(false); setSearchError(''); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <Input 
                label="मुल दर्ता नं. वा Patient ID" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="ID प्रविष्ट गर्नुहोस्..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              {searchError && <p className="text-red-500 text-sm">{searchError}</p>}
              <button onClick={handleSearch} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700">
                खोज्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-2xl font-bold text-slate-800 font-nepali">{isEditing ? 'रेकर्ड सम्पादन गर्नुहोस्' : 'नयाँ उत्तर प्रसूति रेकर्ड'}</h3>
            <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">प्रसूति छान्नुहोस् (वैकल्पिक)</label>
                    <select
                      value={formData.prasutiId || ''}
                      onChange={(e) => {
                        const prasuti = prasutiRecords.find(p => p.id === e.target.value);
                        setFormData({ ...formData, prasutiId: e.target.value || undefined, name: prasuti?.name || formData.name });
                      }}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="">छान्नुहोस्</option>
                      {prasutiRecords.map(p => <option key={p.id} value={p.id}>{p.name} ({p.deliveryDate})</option>)}
                    </select>
                  </div>
                  <Input label="नाम" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  <NepaliDatePicker label="मिति" value={formData.visitDate} onChange={(value) => handleDateChange('visitDate', value)} />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <User size={18} className="text-primary-500" /> आमाको स्वास्थ्य रेकर्ड (Mother's Health Record)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label="BP" icon={<Activity size={16} />} value={formData.motherBp || ''} onChange={(e) => setFormData({ ...formData, motherBp: e.target.value })} />
                    <Input label="तौल (Weight)" icon={<Scale size={16} />} type="number" value={formData.motherWeight || ''} onChange={(e) => setFormData({ ...formData, motherWeight: parseFloat(e.target.value) || undefined })} />
                    <Input label="तापक्रम (Temp)" icon={<Thermometer size={16} />} value={formData.motherTemp || ''} onChange={(e) => setFormData({ ...formData, motherTemp: e.target.value })} />
                    <Input label="स्तनपान" icon={<Baby size={16} />} value={formData.motherBreastfeeding || ''} onChange={(e) => setFormData({ ...formData, motherBreastfeeding: e.target.value })} />
                    <Input label="लोचिया" icon={<Droplets size={16} />} value={formData.motherLochia || ''} onChange={(e) => setFormData({ ...formData, motherLochia: e.target.value })} />
                    <Input label="Uterine Involution" icon={<Circle size={16} />} value={formData.motherUterineInvolution || ''} onChange={(e) => setFormData({ ...formData, motherUterineInvolution: e.target.value })} />
                    <Input label="सामान्य स्थिति" icon={<UserCircle size={16} />} value={formData.motherGeneralCondition || ''} onChange={(e) => setFormData({ ...formData, motherGeneralCondition: e.target.value })} />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Baby size={18} className="text-primary-500" /> शिशुको स्वास्थ्य रेकर्ड (Baby's Health Record)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input label="तौल (Weight)" icon={<Scale size={16} />} type="number" value={formData.babyWeight || ''} onChange={(e) => setFormData({ ...formData, babyWeight: parseFloat(e.target.value) || undefined })} />
                    <Input label="तापक्रम (Temp)" icon={<Thermometer size={16} />} value={formData.babyTemp || ''} onChange={(e) => setFormData({ ...formData, babyTemp: e.target.value })} />
                    <Input label="स्तनपान" icon={<Baby size={16} />} value={formData.babyBreastfeeding || ''} onChange={(e) => setFormData({ ...formData, babyBreastfeeding: e.target.value })} />
                    <Input label="नाल (Umbilical Cord)" icon={<Circle size={16} />} value={formData.babyUmbilicalCord || ''} onChange={(e) => setFormData({ ...formData, babyUmbilicalCord: e.target.value })} />
                    <Input label="सामान्य स्थिति" icon={<UserCircle size={16} />} value={formData.babyGeneralCondition || ''} onChange={(e) => setFormData({ ...formData, babyGeneralCondition: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">निष्कर्ष (Findings)</label>
                    <textarea value={formData.findings} onChange={(e) => setFormData({ ...formData, findings: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm h-24" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">कैफियत (Remarks)</label>
                    <textarea value={formData.remarks || ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm h-24" />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 sticky bottom-0 bg-white pb-4">
                  <button type="button" onClick={handleCloseForm} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">रद्द</button>
                  <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium shadow-sm hover:bg-primary-700">सुरक्षित गर्नुहोस्</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
