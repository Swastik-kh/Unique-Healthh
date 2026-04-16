import React, { useState, useMemo } from 'react';
import { PhysiotherapyRecord, ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord } from '../types';
import { Plus, Search, Edit2, Trash2, Activity, AlertCircle, FileText, Accessibility } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface PhysiotherapySewaProps {
  records: PhysiotherapyRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  emergencyRecords: EmergencyRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  onSave: (record: PhysiotherapyRecord) => void;
  onDelete: (id: string) => void;
  currentFiscalYear: string;
}

export const PhysiotherapySewa: React.FC<PhysiotherapySewaProps> = ({
  records,
  serviceSeekerRecords,
  opdRecords,
  emergencyRecords,
  cbimnciRecords,
  onSave,
  onDelete,
  currentFiscalYear
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PhysiotherapyRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [formData, setFormData] = useState<Partial<PhysiotherapyRecord>>({
    dateBs: new NepaliDate().format('YYYY-MM-DD'),
    diagnosis: '',
    treatmentType: '',
    sessionNumber: 1,
    referredBy: '',
    remarks: ''
  });

  const [referralInfo, setReferralInfo] = useState<{ source: string; investigation: string } | null>(null);

  const handlePatientSelect = (patient: ServiceSeekerRecord) => {
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

    // Check for referrals in OPD, Emergency, CBIMNCI
    const opdRef = opdRecords.find(r => r.serviceSeekerId === patient.id && (r.investigation?.toLowerCase().includes('physio') || r.investigation?.toLowerCase().includes('physiotherapy')));
    const erRef = emergencyRecords.find(r => r.serviceSeekerId === patient.id && (r.investigation?.toLowerCase().includes('physio') || r.investigation?.toLowerCase().includes('physiotherapy')));
    const cbimnciRef = cbimnciRecords.find(r => r.serviceSeekerId === patient.id && (r.investigation?.toLowerCase().includes('physio') || r.investigation?.toLowerCase().includes('physiotherapy')));

    if (opdRef) {
      setReferralInfo({ source: 'OPD', investigation: opdRef.investigation });
      setFormData(prev => ({ ...prev, referredBy: 'OPD' }));
    } else if (erRef) {
      setReferralInfo({ source: 'Emergency', investigation: erRef.investigation });
      setFormData(prev => ({ ...prev, referredBy: 'Emergency' }));
    } else if (cbimnciRef) {
      setReferralInfo({ source: 'CBIMNCI', investigation: cbimnciRef.investigation });
      setFormData(prev => ({ ...prev, referredBy: 'CBIMNCI' }));
    } else {
      setReferralInfo(null);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!patientSearchInput) return [];
    return serviceSeekerRecords.filter(p => 
      p.name.toLowerCase().includes(patientSearchInput.toLowerCase()) ||
      (p.uniquePatientId && p.uniquePatientId.toLowerCase().includes(patientSearchInput.toLowerCase())) ||
      (p.registrationNumber && p.registrationNumber.toLowerCase().includes(patientSearchInput.toLowerCase())) ||
      (p.phone && p.phone.includes(patientSearchInput))
    ).slice(0, 10);
  }, [patientSearchInput, serviceSeekerRecords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceSeekerId) {
      alert('कृपया सेवाग्राही छान्नुहोस्');
      return;
    }

    const record: PhysiotherapyRecord = {
      id: editingRecord?.id || `PHYS-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      dateBs: formData.dateBs || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: formData.serviceSeekerId,
      patientName: formData.patientName || '',
      patientId: formData.patientId || '',
      age: formData.age || '',
      address: formData.address || '',
      phone: formData.phone || '',
      diagnosis: formData.diagnosis || '',
      treatmentType: formData.treatmentType || '',
      sessionNumber: formData.sessionNumber || 1,
      referredBy: formData.referredBy,
      remarks: formData.remarks
    };

    onSave(record);
    setIsFormOpen(false);
    setEditingRecord(null);
    setPatientSearchInput('');
    setReferralInfo(null);
    setFormData({
      dateBs: new NepaliDate().format('YYYY-MM-DD'),
      diagnosis: '',
      treatmentType: '',
      sessionNumber: 1,
      referredBy: '',
      remarks: ''
    });
  };

  const handleEdit = (record: PhysiotherapyRecord) => {
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
          <h2 className="text-2xl font-bold text-gray-800 font-nepali">फिजियोथेरापी सेवा (Physiotherapy Service)</h2>
          <p className="text-sm text-gray-500">फिजियोथेरापी रेकर्डिङ र व्यवस्थापन</p>
        </div>
        <button
          onClick={() => {
            setEditingRecord(null);
            setPatientSearchInput('');
            setReferralInfo(null);
            setFormData({
              dateBs: new NepaliDate().format('YYYY-MM-DD'),
              diagnosis: '',
              treatmentType: '',
              sessionNumber: 1,
              referredBy: '',
              remarks: ''
            });
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          <span>नयाँ फिजियोथेरापी थप्नुहोस्</span>
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            onClick={() => handlePatientSelect(patient)}
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">उमेर (Age)</label>
                <input
                  type="text"
                  readOnly
                  value={formData.age || ''}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ठेगाना (Address)</label>
                <input
                  type="text"
                  readOnly
                  value={formData.address || ''}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {referralInfo && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-amber-600 mt-1 shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">फिजियोथेरापी सिफारिस भेटियो!</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    यो सेवाग्राहीलाई <strong>{referralInfo.source}</strong> बाट फिजियोथेरापीको लागि सिफारिस गरिएको छ।
                  </p>
                  <p className="text-xs text-amber-600 mt-1 italic">
                    जाँच विवरण: {referralInfo.investigation}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">निदान (Diagnosis)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा: Back Pain, Stroke Rehab"
                  value={formData.diagnosis || ''}
                  onChange={e => setFormData({...formData, diagnosis: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">उपचार प्रकार (Treatment Type)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा: Exercise, Modality, Massage"
                  value={formData.treatmentType || ''}
                  onChange={e => setFormData({...formData, treatmentType: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">सेसन नम्बर (Session Number)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.sessionNumber || 1}
                  onChange={e => setFormData({...formData, sessionNumber: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">सिफारिस गर्ने (Referred By)</label>
                <input
                  type="text"
                  value={formData.referredBy || ''}
                  onChange={e => setFormData({...formData, referredBy: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="उदा: OPD, Emergency, Doctor Name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">कैफियत (Remarks)</label>
                <textarea
                  rows={3}
                  value={formData.remarks || ''}
                  onChange={e => setFormData({...formData, remarks: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingRecord(null);
                  setReferralInfo(null);
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
                <th className="p-4 font-medium">उमेर/ठेगाना</th>
                <th className="p-4 font-medium">निदान/उपचार</th>
                <th className="p-4 font-medium">सेसन</th>
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
                      {record.phone}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-800">{record.age}</div>
                    <div className="text-xs text-gray-500">{record.address}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-800 font-medium">{record.diagnosis}</div>
                    <div className="text-xs text-gray-500">{record.treatmentType}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    Session: {record.sessionNumber}
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
