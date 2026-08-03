
import React, { useState, useMemo } from 'react';
import { Building2, Plus, Search, Trash2, Save, FileText, User, Calendar, MapPin, Phone, Briefcase, ClipboardList } from 'lucide-react';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { OrganizationSettings } from '../types/coreTypes';

interface GaunGharClinicRecord {
  id: string;
  fiscalYear: string;
  dateBs: string;
  patientName: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  phone: string;
  serviceType: string;
  treatmentGiven: string;
  remarks?: string;
  createdBy?: string;
  _orgName?: string;
}

interface GaunGharClinicProps {
  records: GaunGharClinicRecord[];
  onSaveRecord: (record: GaunGharClinicRecord) => void;
  onDeleteRecord: (id: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  generalSettings: OrganizationSettings;
}

export const GaunGharClinic: React.FC<GaunGharClinicProps> = ({
  records = [],
  onSaveRecord,
  onDeleteRecord,
  currentFiscalYear,
  currentUser,
  generalSettings,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<GaunGharClinicRecord>>({
    dateBs: new NepaliDate().format('YYYY-MM-DD'),
    patientName: '',
    age: '',
    gender: 'Male',
    address: '',
    phone: '',
    serviceType: '',
    treatmentGiven: '',
    remarks: '',
  });

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .filter(r => 
        r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone.includes(searchTerm) ||
        r.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const dateCompare = b.dateBs.localeCompare(a.dateBs);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      });
  }, [records, currentFiscalYear, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.dateBs) {
      alert("कृपया आवश्यक विवरणहरू भर्नुहोस्।");
      return;
    }

    const record: GaunGharClinicRecord = {
      id: formData.id || `GGC-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      dateBs: formData.dateBs!,
      patientName: formData.patientName!,
      age: formData.age || '',
      gender: formData.gender as any || 'Male',
      address: formData.address || '',
      phone: formData.phone || '',
      serviceType: formData.serviceType || '',
      treatmentGiven: formData.treatmentGiven || '',
      remarks: formData.remarks || '',
      createdBy: currentUser.username,
    };

    onSaveRecord(record);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      dateBs: new NepaliDate().format('YYYY-MM-DD'),
      patientName: '',
      age: '',
      gender: 'Male',
      address: '',
      phone: '',
      serviceType: '',
      treatmentGiven: '',
      remarks: '',
    });
  };

  const handleEdit = (record: GaunGharClinicRecord) => {
    setFormData(record);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">गाउँ घर क्लिनिक (Gaun Ghar Clinic)</h2>
            <p className="text-sm text-slate-500">गाउँ घर क्लिनिक सेवा विवरण प्रविष्टि र व्यवस्थापन</p>
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} /> नयाँ रेकर्ड थप्नुहोस्
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              {formData.id ? 'विवरण सम्पादन गर्नुहोस्' : 'नयाँ सेवा विवरण थप्नुहोस्'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500 transition-colors">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
            <Input
              label="मिति (BS)"
              value={formData.dateBs}
              onChange={e => setFormData({ ...formData, dateBs: e.target.value })}
              required
              icon={<Calendar size={16} />}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="बिरामीको नाम"
              value={formData.patientName}
              onChange={e => setFormData({ ...formData, patientName: e.target.value })}
              required
              icon={<User size={16} />}
            />
            <Input
              label="उमेर"
              value={formData.age}
              onChange={e => setFormData({ ...formData, age: e.target.value })}
              icon={<Calendar size={16} />}
            />
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block ml-1">लिंग</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      formData.gender === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {g === 'Male' ? 'पुरुष' : g === 'Female' ? 'महिला' : 'अन्य'}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="ठेगाना"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              icon={<MapPin size={16} />}
            />
            <Input
              label="फोन नं."
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone size={16} />}
            />
            <Input
              label="सेवाको प्रकार"
              value={formData.serviceType}
              onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
              icon={<Briefcase size={16} />}
              placeholder="उदा: जाँच, परामर्श, आदि"
            />
            <div className="md:col-span-2">
              <Input
                label="दिइएको उपचार/परामर्श"
                value={formData.treatmentGiven}
                onChange={e => setFormData({ ...formData, treatmentGiven: e.target.value })}
                icon={<FileText size={16} />}
              />
            </div>
            <Input
              label="कैफियत"
              value={formData.remarks}
              onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              icon={<FileText size={16} />}
            />

            <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                className="px-8 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"
              >
                <Save size={18} /> सुरक्षित गर्नुहोस्
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" />
            रेकर्ड सूची
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="नाम, फोन वा ठेगाना खोज्नुहोस्..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-nepali">मिति</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-nepali">नाम</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-nepali">उमेर/लिंग</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-nepali">ठेगाना/फोन</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-nepali">सेवा/उपचार</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-nepali">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-nepali">
                    कुनै रेकर्ड फेला परेन।
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 text-sm text-slate-600">{record.dateBs}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{record.patientName}</div>
                      {record._orgName && record._orgName !== generalSettings.orgNameNepali && (
                        <div className="text-[10px] text-blue-500 uppercase font-bold">{record._orgName}</div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {record.age} वर्ष / {record.gender === 'Male' ? 'पुरुष' : record.gender === 'Female' ? 'महिला' : 'अन्य'}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      <div>{record.address}</div>
                      <div className="text-xs text-slate-400">{record.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-800">{record.serviceType}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{record.treatmentGiven}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="सम्पादन गर्नुहोस्"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("के तपाईं यो रेकर्ड मेटाउन चाहनुहुन्छ?")) {
                              onDeleteRecord(record.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="मेटाउनुहोस्"
                        >
                          <Trash2 size={18} />
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
