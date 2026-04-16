import React, { useState } from 'react';
import { Baby, Plus, X, Pencil, Trash2, Activity, Clock, Heart, Thermometer, Droplets } from 'lucide-react';
import { PrasutiRecord, GarbhawotiRecord, Option, ServiceSeekerRecord, PartographEntry } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';

interface PrasutiSewaProps {
  garbhawotiRecords: GarbhawotiRecord[];
  prasutiRecords: PrasutiRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  onSaveRecord: (record: PrasutiRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
}

const initialFormData: Omit<PrasutiRecord, 'id' | 'fiscalYear'> = {
  garbhawotiId: '',
  name: '',
  deliveryDate: '',
  deliveryPlace: '',
  deliveredBy: '',
  deliveryOutcome: 'Live birth',
  newbornGender: 'Male',
  newbornWeight: 0,
  complications: '',
  birthTime: '',
  transportAllowanceEligible: false,
  transportAllowanceReceived: false,
  incentiveAllowanceEligible: false,
  incentiveAllowanceReceived: false,
  partograph: [],
};

const initialPartographEntry: PartographEntry = {
  id: '',
  time: '',
  fetalHeartRate: 0,
  amnioticFluid: 'I',
  moulding: '0',
  cervicalDilation: 0,
  descentOfHead: 0,
  contractionsPer10Min: 0,
  contractionDuration: 0,
  maternalPulse: 0,
  maternalBp: '',
  maternalTemp: 0,
};

const complicationOptions: Option[] = [
  { id: '1', value: 'None', label: 'कुनै पनि छैन' },
  { id: '2', value: 'Postpartum Hemorrhage', label: 'सुत्केरीपछिको रक्तश्राव' },
  { id: '3', value: 'Eclampsia', label: 'एक्लाम्पसिया' },
  { id: '4', value: 'Sepsis', label: 'सेप्सिस' },
  { id: '5', value: 'Obstructed Labor', label: 'अवरुद्ध प्रसव' },
  { id: '6', value: 'Other', label: 'अन्य' },
];

export const PrasutiSewa: React.FC<PrasutiSewaProps> = ({ garbhawotiRecords = [], prasutiRecords = [], serviceSeekerRecords = [], onSaveRecord, onDeleteRecord, currentFiscalYear }) => {
  const [showForm, setShowForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PrasutiRecord, 'id' | 'fiscalYear'> & { id?: string }>(initialFormData);
  const [showPartographForm, setShowPartographForm] = useState(false);
  const [partographEntry, setPartographEntry] = useState<PartographEntry>(initialPartographEntry);
  const [editingPartographIndex, setEditingPartographIndex] = useState<number | null>(null);

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
      // Try to find if she has a Garbhawoti record
      const garbhawoti = garbhawotiRecords.find(g => g.name === patient.name);
      
      setFormData({
        ...initialFormData,
        garbhawotiId: garbhawoti?.id || 'other',
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

  const handleEdit = (record: PrasutiRecord) => {
    setIsEditing(record.id);
    setFormData(record);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(null);
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'garbhawotiId') {
      if (value === 'other') {
        setFormData(prev => ({ ...prev, garbhawotiId: 'other', name: '' }));
      } else {
        const selectedGarbhawoti = garbhawotiRecords.find(r => r.id === value);
        setFormData(prev => ({ ...prev, garbhawotiId: value, name: selectedGarbhawoti?.name || '' }));
      }
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' 
          ? parseFloat(value) || 0 
          : type === 'checkbox' 
            ? (e.target as HTMLInputElement).checked 
            : value 
      }));
    }
  };

  const handlePartographChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setPartographEntry(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddPartographEntry = () => {
    const newEntry = { ...partographEntry, id: Date.now().toString() };
    if (editingPartographIndex !== null) {
      const newPartograph = [...(formData.partograph || [])];
      newPartograph[editingPartographIndex] = newEntry;
      setFormData(prev => ({ ...prev, partograph: newPartograph }));
      setEditingPartographIndex(null);
    } else {
      setFormData(prev => ({ ...prev, partograph: [...(prev.partograph || []), newEntry] }));
    }
    setPartographEntry(initialPartographEntry);
    setShowPartographForm(false);
  };

  const removePartographEntry = (index: number) => {
    const newPartograph = [...(formData.partograph || [])];
    newPartograph.splice(index, 1);
    setFormData(prev => ({ ...prev, partograph: newPartograph }));
  };

  const editPartographEntry = (index: number) => {
    setPartographEntry((formData.partograph || [])[index]);
    setEditingPartographIndex(index);
    setShowPartographForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordToSave: PrasutiRecord = {
      ...formData,
      id: isEditing || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };
    onSaveRecord(recordToSave);
    handleCloseForm();
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('के तपाईं यो रेकर्ड हटाउन निश्चित हुनुहुन्छ?')) {
      onDeleteRecord(id);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
            <Baby size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रसूति सेवा</h2>
            <p className="text-sm text-slate-500">Delivery Service Records</p>
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
                    <th className="p-3">प्रसूति मिति</th>
                    <th className="p-3">प्रसूति स्थान</th>
                    <th className="p-3">नतिजा</th>
                    <th className="p-3">शिशुको लिङ्ग</th>
                    <th className="p-3">तौल (kg)</th>
                    <th className="p-3 text-right">कार्य</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {(prasutiRecords || []).filter(r => r.fiscalYear === currentFiscalYear).map(record => (
                    <tr key={record.id}>
                        <td className="p-3 font-medium">{record.name}</td>
                        <td className="p-3">{record.deliveryDate}</td>
                        <td className="p-3">{record.deliveryPlace}</td>
                        <td className="p-3">{record.deliveryOutcome}</td>
                        <td className="p-3">{record.newbornGender}</td>
                        <td className="p-3">{record.newbornWeight}</td>
                        <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
                 {prasutiRecords.filter(r => r.fiscalYear === currentFiscalYear).length === 0 && (
                    <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-500 italic">कुनै रेकर्ड भेटिएन।</td>
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
            <h3 className="text-2xl font-bold text-slate-800 font-nepali">
              {isEditing ? 'रेकर्ड सम्पादन गर्नुहोस्' : 'नयाँ प्रसूति रेकर्ड'}
            </h3>
            <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <Select
                      label="गर्भवती रेकर्ड"
                      name="garbhawotiId"
                      value={formData.garbhawotiId}
                      onChange={handleChange}
                      options={[
                        { id: 'other', value: 'other', label: 'अन्य (सूचीमा नभएको)' },
                        ...garbhawotiRecords.map(r => ({ id: r.id, value: r.id, label: r.name }))
                      ]}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="सुत्केरीको नाम"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={formData.garbhawotiId !== 'other'}
                    />
                  </div>

                  <NepaliDatePicker
                    label="प्रसूति मिति"
                    value={formData.deliveryDate}
                    onChange={(val) => handleDateChange('deliveryDate', val)}
                    required
                  />

                  <Input
                    label="प्रसूति समय"
                    name="birthTime"
                    type="time"
                    value={formData.birthTime}
                    onChange={handleChange}
                  />

                  <Select
                    label="प्रसूति स्थान"
                    name="deliveryPlace"
                    value={formData.deliveryPlace}
                    onChange={handleChange}
                    options={[
                      { id: '1', value: 'Health Facility', label: 'स्वास्थ्य संस्था' },
                      { id: '2', value: 'Home', label: 'घर' },
                      { id: '3', value: 'On the way', label: 'बाटोमा' },
                    ]}
                    required
                  />

                  <Input
                    label="प्रसूति गराउने व्यक्ति"
                    name="deliveredBy"
                    value={formData.deliveredBy}
                    onChange={handleChange}
                    required
                  />

                  <Select
                    label="प्रसूति नतिजा"
                    name="deliveryOutcome"
                    value={formData.deliveryOutcome}
                    onChange={handleChange}
                    options={[
                      { id: '1', value: 'Live birth', label: 'जीवित जन्म' },
                      { id: '2', value: 'Still birth', label: 'मृत जन्म' },
                    ]}
                  />

                  <Select
                    label="शिशुको लिङ्ग"
                    name="newbornGender"
                    value={formData.newbornGender}
                    onChange={handleChange}
                    options={[
                      { id: '1', value: 'Male', label: 'छोरा' },
                      { id: '2', value: 'Female', label: 'छोरी' },
                      { id: '3', value: 'Other', label: 'अन्य' },
                    ]}
                  />

                  <Input
                    label="शिशुको तौल (kg)"
                    name="newbornWeight"
                    type="number"
                    step="0.1"
                    value={formData.newbornWeight}
                    onChange={handleChange}
                    required
                  />

                  <Select
                    label="जटिलता"
                    name="complications"
                    value={formData.complications}
                    onChange={handleChange}
                    options={complicationOptions}
                  />
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">यातायात खर्च</h4>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="transportAllowanceEligible"
                          checked={formData.transportAllowanceEligible}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm font-medium">योग्य</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="transportAllowanceReceived"
                          checked={formData.transportAllowanceReceived}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm font-medium">प्राप्त</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">प्रोत्साहन भत्ता</h4>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="incentiveAllowanceEligible"
                          checked={formData.incentiveAllowanceEligible}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm font-medium">योग्य</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="incentiveAllowanceReceived"
                          checked={formData.incentiveAllowanceReceived}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm font-medium">प्राप्त</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Partograph Section */}
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Activity size={18} className="text-primary-600" />
                      पार्टोग्राफ (Partograph)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setPartographEntry(initialPartographEntry);
                        setEditingPartographIndex(null);
                        setShowPartographForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-semibold hover:bg-teal-100 transition-colors border border-teal-200"
                    >
                      <Plus size={16} /> नयाँ प्रविष्टि थप्नुहोस्
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                          <th className="p-2">समय</th>
                          <th className="p-2">FHR</th>
                          <th className="p-2">Dilation</th>
                          <th className="p-2">Descent</th>
                          <th className="p-2">BP/Pulse</th>
                          <th className="p-2 text-right">कार्य</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(formData.partograph || []).map((entry, index) => (
                          <tr key={entry.id || index}>
                            <td className="p-2 font-medium">{entry.time}</td>
                            <td className="p-2">{entry.fetalHeartRate}</td>
                            <td className="p-2">{entry.cervicalDilation} cm</td>
                            <td className="p-2">{entry.descentOfHead}/5</td>
                            <td className="p-2">{entry.maternalBp} | {entry.maternalPulse}</td>
                            <td className="p-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => editPartographEntry(index)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removePartographEntry(index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {(!formData.partograph || formData.partograph.length === 0) && (
                          <tr>
                            <td colSpan={6} className="text-center p-4 text-slate-400 italic">कुनै प्रविष्टि छैन।</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4 border-t border-slate-100 pt-6 sticky bottom-0 bg-white pb-4">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all"
                  >
                    {isEditing ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'रेकर्ड सुरक्षित गर्नुहोस्'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPartographForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-primary-600" />
                        पार्टोग्राफ प्रविष्टि (Partograph Entry)
                    </h4>
                    <button onClick={() => setShowPartographForm(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                    <Input label="समय (Time)" name="time" type="time" value={partographEntry.time} onChange={handlePartographChange} required />
                    <Input label="Fetal Heart Rate (bpm)" name="fetalHeartRate" type="number" value={partographEntry.fetalHeartRate} onChange={handlePartographChange} icon={<Heart size={16} />} />
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Amniotic Fluid</label>
                        <select name="amnioticFluid" value={partographEntry.amnioticFluid} onChange={handlePartographChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500">
                            <option value="I">Intact (I)</option>
                            <option value="C">Clear (C)</option>
                            <option value="M">Meconium (M)</option>
                            <option value="B">Bloody (B)</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Moulding</label>
                        <select name="moulding" value={partographEntry.moulding} onChange={handlePartographChange} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500">
                            <option value="0">0</option>
                            <option value="+">+</option>
                            <option value="++">++</option>
                            <option value="+++">+++</option>
                        </select>
                    </div>

                    <Input label="Cervical Dilation (cm)" name="cervicalDilation" type="number" max={10} min={0} value={partographEntry.cervicalDilation} onChange={handlePartographChange} />
                    <Input label="Descent of Head (/5)" name="descentOfHead" type="number" max={5} min={0} value={partographEntry.descentOfHead} onChange={handlePartographChange} />
                    
                    <Input label="Contractions in 10 min" name="contractionsPer10Min" type="number" value={partographEntry.contractionsPer10Min} onChange={handlePartographChange} />
                    <Input label="Duration of Contraction (sec)" name="contractionDuration" type="number" value={partographEntry.contractionDuration} onChange={handlePartographChange} icon={<Clock size={16} />} />
                    
                    <Input label="Maternal BP" name="maternalBp" placeholder="120/80" value={partographEntry.maternalBp} onChange={handlePartographChange} />
                    <Input label="Maternal Pulse (bpm)" name="maternalPulse" type="number" value={partographEntry.maternalPulse} onChange={handlePartographChange} />
                    <Input label="Maternal Temp (°C)" name="maternalTemp" type="number" step="0.1" value={partographEntry.maternalTemp} onChange={handlePartographChange} icon={<Thermometer size={16} />} />
                    
                    <div className="md:col-span-2 grid grid-cols-3 gap-3">
                        <Input label="Urine Protein" name="urineProtein" value={partographEntry.urineProtein} onChange={handlePartographChange} />
                        <Input label="Urine Acetone" name="urineAcetone" value={partographEntry.urineAcetone} onChange={handlePartographChange} />
                        <Input label="Urine Volume" name="urineVolume" value={partographEntry.urineVolume} onChange={handlePartographChange} />
                    </div>

                    <div className="md:col-span-2">
                        <Input label="Drugs & Fluids" name="drugsAndFluids" value={partographEntry.drugsAndFluids} onChange={handlePartographChange} icon={<Droplets size={16} />} />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowPartographForm(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">रद्द</button>
                    <button type="button" onClick={handleAddPartographEntry} className="px-6 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all">
                        {editingPartographIndex !== null ? 'अपडेट गर्नुहोस्' : 'थप्नुहोस्'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
