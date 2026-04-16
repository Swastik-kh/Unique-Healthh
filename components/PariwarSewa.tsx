import React, { useState } from 'react';
import { PariwarSewaRecord, ServiceSeekerRecord } from '../types';
import { Plus, Search, Edit2, Trash2, Calendar, User, Activity } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface PariwarSewaProps {
  records: PariwarSewaRecord[];
  serviceSeekers: ServiceSeekerRecord[];
  onSave: (record: PariwarSewaRecord) => void;
  onDelete: (id: string) => void;
  currentFiscalYear: string;
}

export const PariwarSewa: React.FC<PariwarSewaProps> = ({
  records,
  serviceSeekers,
  onSave,
  onDelete,
  currentFiscalYear
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PariwarSewaRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [formData, setFormData] = useState<Partial<PariwarSewaRecord>>({
    dateBs: new NepaliDate().format('YYYY-MM-DD'),
    patientId: '',
    tempMethod: '',
    userType: '',
    quantity: 0,
    permMethod: '',
    institutionType: '',
    location: '',
    postPartumFP: '',
    remarks: ''
  });

  const handlePatientSelect = (patientId: string) => {
    const patient = serviceSeekers.find(p => p.id === patientId);
    if (patient) {
      setFormData(prev => ({
        ...prev,
        serviceSeekerId: patient.id,
        patientName: patient.name,
        patientId: patient.uniquePatientId || patient.registrationNumber || '',
        age: patient.age,
        address: patient.address,
        phone: patient.phone
      }));
      setPatientSearchInput(patient.name);
      setShowPatientDropdown(false);
    }
  };

  const filteredPatients = serviceSeekers.filter(p => 
    p.name.toLowerCase().includes(patientSearchInput.toLowerCase()) ||
    (p.uniquePatientId && p.uniquePatientId.toLowerCase().includes(patientSearchInput.toLowerCase())) ||
    (p.registrationNumber && p.registrationNumber.toLowerCase().includes(patientSearchInput.toLowerCase())) ||
    (p.phone && p.phone.includes(patientSearchInput))
  ).slice(0, 10); // Limit to 10 for performance

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceSeekerId) {
      alert('कृपया सेवाग्राही छान्नुहोस्');
      return;
    }

    const record: PariwarSewaRecord = {
      id: editingRecord?.id || `PS-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      dateBs: formData.dateBs || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: formData.serviceSeekerId,
      patientName: formData.patientName || '',
      patientId: formData.patientId || '',
      age: formData.age || '',
      address: formData.address || '',
      phone: formData.phone || '',
      tempMethod: formData.tempMethod,
      userType: formData.userType,
      quantity: formData.quantity,
      permMethod: formData.permMethod,
      institutionType: formData.institutionType,
      location: formData.location,
      postPartumFP: formData.postPartumFP,
      remarks: formData.remarks
    };

    onSave(record);
    setIsFormOpen(false);
    setEditingRecord(null);
    setPatientSearchInput('');
    setFormData({
      dateBs: new NepaliDate().format('YYYY-MM-DD'),
      patientId: '',
      tempMethod: '',
      userType: '',
      quantity: 0,
      permMethod: '',
      institutionType: '',
      location: '',
      postPartumFP: '',
      remarks: ''
    });
  };

  const handleEdit = (record: PariwarSewaRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setPatientSearchInput(record.patientName);
    setIsFormOpen(true);
  };

  const filteredRecords = records.filter(r => 
    r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.patientId && r.patientId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    r.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-nepali">परिवार नियोजन सेवा (Pariwar Sewa)</h2>
          <p className="text-sm text-gray-500">अस्थायी, स्थायी र सुत्केरी पछाडिको प. नि. सेवा रेकर्ड</p>
        </div>
        <button
          onClick={() => {
            setEditingRecord(null);
            setPatientSearchInput('');
            setFormData({
              dateBs: new NepaliDate().format('YYYY-MM-DD'),
              patientId: '',
              tempMethod: '',
              userType: '',
              quantity: 0,
              permMethod: '',
              institutionType: '',
              location: '',
              postPartumFP: '',
              remarks: ''
            });
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          <span>नयाँ रेकर्ड थप्नुहोस्</span>
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">मिति (B.S.)</label>
                <input
                  type="text"
                  required
                  value={formData.dateBs || ''}
                  onChange={e => setFormData({...formData, dateBs: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-gray-700">सेवाग्राही खोज्नुहोस् (नाम, ID वा दर्ता नं.)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="खोज्न यहाँ टाइप गर्नुहोस्..."
                    value={patientSearchInput}
                    onChange={e => {
                      setPatientSearchInput(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {showPatientDropdown && patientSearchInput && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map(patient => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => handlePatientSelect(patient.id)}
                            className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="font-bold text-gray-800">{patient.name}</div>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>ID: {patient.uniquePatientId || patient.registrationNumber || 'N/A'}</span>
                              <span>{patient.phone}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">कुनै सेवाग्राही भेटिएन</div>
                      )}
                    </div>
                  )}
                </div>
                {formData.serviceSeekerId && (
                  <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1">
                    <Activity size={10} /> सेवाग्राही छानिएको छ
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">नाम</label>
                <input
                  type="text"
                  readOnly
                  value={formData.patientName || ''}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Patient ID / दर्ता नं.</label>
                <input
                  type="text"
                  readOnly
                  value={formData.patientId || ''}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">१. अस्थायी साधन (Temporary Methods)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">साधनको प्रकार</label>
                  <select
                    value={formData.tempMethod || ''}
                    onChange={e => setFormData({...formData, tempMethod: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">छान्नुहोस्...</option>
                    <option value="Condom">कण्डम (Condom)</option>
                    <option value="Pills">पिल्स (Pills)</option>
                    <option value="Depo">डिपो (Depo)</option>
                    <option value="IUCD">आई.यु.सी.डी. (IUCD)</option>
                    <option value="Implant 5 yrs">इम्प्लान्ट ५ वर्ष अवधिको</option>
                    <option value="Implant 3 yrs">इम्प्लान्ट ३ वर्ष अवधिको</option>
                    <option value="Sayana Press">सायना प्रेस (Sayana Press)</option>
                    <option value="Emergency Contraceptive">आकस्मिक गर्भनिरोधक चक्की</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">प्रयोगकर्ताको प्रकार</label>
                  <select
                    value={formData.userType || ''}
                    onChange={e => setFormData({...formData, userType: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">छान्नुहोस्...</option>
                    <option value="New">नयाँ (New)</option>
                    <option value="Current">हाल अपनाई रहेका (Current)</option>
                    <option value="Discontinued">सेवामा नियमित नभएका (Discontinued)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">साधन वितरण परिमाण (Quantity)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity || ''}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">२. स्थायी साधन (Permanent Methods)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">साधनको प्रकार</label>
                  <select
                    value={formData.permMethod || ''}
                    onChange={e => setFormData({...formData, permMethod: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">छान्नुहोस्...</option>
                    <option value="Minilap - Female">मिनिल्याप (Minilap - Female)</option>
                    <option value="Vasectomy - Male">भ्यासेक्टोमी (Vasectomy - Male)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">संस्थाको प्रकार</label>
                  <select
                    value={formData.institutionType || ''}
                    onChange={e => setFormData({...formData, institutionType: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">छान्नुहोस्...</option>
                    <option value="Government">सरकारी (Government)</option>
                    <option value="Non-Government">गैर सरकारी (Non-Government)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">स्थान</label>
                  <select
                    value={formData.location || ''}
                    onChange={e => setFormData({...formData, location: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">छान्नुहोस्...</option>
                    <option value="Health Facility">स्वास्थ्य संस्था (Health Facility)</option>
                    <option value="Camp">शिविर (Camp)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">३. सुत्केरी पछाडि प. नि. सेवा (Post-partum FP)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">समय अवधि</label>
                  <select
                    value={formData.postPartumFP || ''}
                    onChange={e => setFormData({...formData, postPartumFP: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">छान्नुहोस्...</option>
                    <option value="Within 48 hrs">सुत्केरी भएको ४८ घण्टा भित्र</option>
                    <option value="48 hrs to 1 yr">४८ घण्टा देखि एक वर्ष भित्र</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">कैफियत (Remarks)</label>
                  <input
                    type="text"
                    value={formData.remarks || ''}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingRecord(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingRecord ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="नाम, ID वा फोन नम्बर खोज्नुहोस्..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="p-4 font-medium">मिति</th>
                <th className="p-4 font-medium">सेवाग्राही</th>
                <th className="p-4 font-medium">अस्थायी साधन</th>
                <th className="p-4 font-medium">स्थायी साधन</th>
                <th className="p-4 font-medium">सुत्केरी पछाडि</th>
                <th className="p-4 font-medium text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm text-gray-800">{record.dateBs}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{record.patientName}</div>
                    <div className="text-xs text-gray-500">
                      {record.patientId && <span className="font-bold text-primary-600 mr-1">ID: {record.patientId}</span>}
                      {record.phone} | {record.age}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {record.tempMethod ? (
                      <div>
                        <span className="font-medium">{record.tempMethod}</span>
                        {record.userType && <span className="text-xs ml-2 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{record.userType}</span>}
                        {record.quantity ? <span className="text-xs ml-2 text-gray-500">Qty: {record.quantity}</span> : null}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {record.permMethod ? (
                      <div>
                        <span className="font-medium">{record.permMethod}</span>
                        {record.institutionType && <span className="text-xs ml-2 text-gray-500">({record.institutionType})</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {record.postPartumFP || '-'}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(record)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="सम्पादन"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('के तपाईं यो रेकर्ड हटाउन निश्चित हुनुहुन्छ?')) {
                          onDelete(record.id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="हटाउनुहोस्"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    कुनै रेकर्ड भेटिएन
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
