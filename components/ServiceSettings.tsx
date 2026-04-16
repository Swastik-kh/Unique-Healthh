import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Save, X, Settings, FlaskConical, Stethoscope, Activity, Scan, Pill, Waves, Accessibility, Siren } from 'lucide-react';
import { ServiceItem } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';

interface ServiceSettingsProps {
  serviceItems: ServiceItem[];
  onSaveServiceItem: (item: ServiceItem) => void;
  onDeleteServiceItem: (id: string) => void;
  currentFiscalYear: string;
}

const SERVICE_CATEGORIES = [
  { id: 'OPD', value: 'OPD', label: 'OPD Service' },
  { id: 'Lab', value: 'Lab', label: 'Lab Investigation' },
  { id: 'X-Ray', value: 'X-Ray', label: 'X-Ray Service' },
  { id: 'USG', value: 'USG', label: 'USG Service' },
  { id: 'ECG', value: 'ECG', label: 'ECG Service' },
  { id: 'Emergency', value: 'Emergency', label: 'Emergency Service' },
  { id: 'Pharmacy', value: 'Pharmacy', label: 'Pharmacy / Dispensary' },
  { id: 'Physiotherapy', value: 'Physiotherapy', label: 'Physiotherapy' },
  { id: 'TB', value: 'TB', label: 'TB Service' },
  { id: 'Leprosy', value: 'Leprosy', label: 'Leprosy Service' },
  { id: 'Other', value: 'Other', label: 'Other Services' },
];

export const ServiceSettings: React.FC<ServiceSettingsProps> = ({
  serviceItems,
  onSaveServiceItem,
  onDeleteServiceItem,
  currentFiscalYear
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ServiceItem, 'id' | 'fiscalYear'>>({
    serviceName: '',
    category: 'OPD',
    rate: 0,
    valueRange: '',
    unit: '',
    subTests: []
  });

  const resetForm = () => {
    setFormData({
      serviceName: '',
      category: 'OPD',
      rate: 0,
      valueRange: '',
      unit: '',
      subTests: []
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: ServiceItem) => {
    setFormData({
      serviceName: item.serviceName,
      category: item.category,
      rate: item.rate,
      valueRange: item.valueRange || '',
      unit: item.unit || '',
      subTests: item.subTests || []
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem: ServiceItem = {
      id: editingId || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      ...formData
    };

    onSaveServiceItem(newItem);
    resetForm();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Lab': return <FlaskConical size={16} className="text-purple-600" />;
      case 'OPD': return <Stethoscope size={16} className="text-blue-600" />;
      case 'X-Ray': return <Scan size={16} className="text-slate-600" />;
      case 'USG': return <Waves size={16} className="text-cyan-600" />;
      case 'ECG': return <Activity size={16} className="text-red-600" />;
      case 'Pharmacy': return <Pill size={16} className="text-green-600" />;
      case 'Physiotherapy': return <Accessibility size={16} className="text-orange-600" />;
      case 'Emergency': return <Siren size={16} className="text-red-500" />;
      case 'TB': return <Activity size={16} className="text-amber-600" />;
      case 'Leprosy': return <Activity size={16} className="text-emerald-600" />;
      default: return <Settings size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
            <Settings className="text-primary-600" />
            सेवा सेटिङ (Service Settings)
          </h2>
          <p className="text-sm text-slate-500">सेवाहरूको नाम, दर र अन्य विवरण व्यवस्थापन गर्नुहोस्</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18} /> नयाँ सेवा थप्नुहोस्
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="font-bold text-slate-800">{editingId ? 'सेवा सम्पादन' : 'नयाँ सेवा थप्नुहोस्'}</h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input 
                label="सेवाको नाम (Service Name)" 
                value={formData.serviceName} 
                onChange={e => setFormData({...formData, serviceName: e.target.value})} 
                required 
                placeholder="Ex: CBC Test, OPD Ticket"
                autoFocus
              />
            </div>
            
            <Select 
              label="सेवाको प्रकार (Category)" 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              options={SERVICE_CATEGORIES}
              required 
            />

            <Input 
              label="दर (Rate)" 
              type="number"
              value={formData.rate} 
              onChange={e => setFormData({...formData, rate: parseFloat(e.target.value) || 0})} 
              required 
              placeholder="0.00"
            />

            {formData.category === 'Lab' && (
              <div className="md:col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100 grid md:grid-cols-2 gap-4">
                {(!formData.subTests || formData.subTests.length === 0) && (
                  <>
                    <Input 
                      label="Value Range (For Lab Reports)" 
                      value={formData.valueRange || ''} 
                      onChange={e => setFormData({...formData, valueRange: e.target.value})} 
                      placeholder="Ex: 4.0 - 11.0"
                    />
                    <Input 
                      label="Unit (For Lab Reports)" 
                      value={formData.unit || ''} 
                      onChange={e => setFormData({...formData, unit: e.target.value})} 
                      placeholder="Ex: x 10^9/L, mg/dL"
                    />
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sub-tests</label>
                  {formData.subTests?.map((subTest, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                      <Input 
                        label=""
                        value={subTest.testName} 
                        onChange={e => {
                          const newSubTests = [...(formData.subTests || [])];
                          newSubTests[index].testName = e.target.value;
                          setFormData({...formData, subTests: newSubTests});
                        }}
                        placeholder="Sub-test Name"
                      />
                      <Input 
                        label=""
                        value={subTest.valueRange || ''} 
                        onChange={e => {
                          const newSubTests = [...(formData.subTests || [])];
                          newSubTests[index].valueRange = e.target.value;
                          setFormData({...formData, subTests: newSubTests});
                        }}
                        placeholder="Value Range"
                      />
                      <Input 
                        label=""
                        type="number"
                        value={subTest.price} 
                        onChange={e => {
                          const newSubTests = [...(formData.subTests || [])];
                          newSubTests[index].price = parseFloat(e.target.value) || 0;
                          setFormData({...formData, subTests: newSubTests});
                        }}
                        placeholder="Price"
                      />
                      <div className="flex gap-2">
                        <Input 
                          label=""
                          value={subTest.unit || ''} 
                          onChange={e => {
                            const newSubTests = [...(formData.subTests || [])];
                            newSubTests[index].unit = e.target.value;
                            setFormData({...formData, subTests: newSubTests});
                          }}
                          placeholder="Unit"
                        />
                        <button type="button" onClick={() => {
                          const newSubTests = formData.subTests?.filter((_, i) => i !== index);
                          setFormData({...formData, subTests: newSubTests});
                        }} className="text-red-500"><Trash2 size={20}/></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormData({...formData, subTests: [...(formData.subTests || []), { id: Date.now().toString(), testName: '', valueRange: '', unit: '' }]})} className="text-primary-600 text-sm flex items-center gap-1"><Plus size={16}/> Add Sub-test</button>
                </div>
                <p className="md:col-span-2 text-xs text-purple-600">Note: These details will appear on lab reports.</p>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">रद्द</button>
              <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 text-sm shadow-sm flex items-center gap-2">
                <Save size={16} /> {editingId ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-700 font-nepali">सेवाहरूको सूची</h3>
            <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded-full">Total: {serviceItems.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b text-slate-600">
              <tr>
                <th className="px-6 py-4">S.N.</th>
                <th className="px-6 py-4">Service Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Rate (Rs.)</th>
                <th className="px-6 py-4">Value Range</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceItems.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">कुनै सेवा थपिएको छैन।</td></tr>
              ) : (
                serviceItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{item.serviceName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {getCategoryIcon(item.category)}
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">{item.rate.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">{item.valueRange || '-'}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">{item.unit || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => { if(window.confirm('के तपाईं यो सेवा हटाउन चाहनुहुन्छ?')) onDeleteServiceItem(item.id); }} 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
