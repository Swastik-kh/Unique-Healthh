import React, { useState, useMemo } from 'react';
import { Search, Save, Plus, Trash2, User, Heart, Settings, Calendar } from 'lucide-react';
import { ServiceSeekerRecord, FamilyPlanningRecord } from '../types/coreTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface PariwarNiyojanSewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  familyPlanningRecords?: FamilyPlanningRecord[];
  onSaveRecord: (record: FamilyPlanningRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
}

const temporaryMethods = [
  'कण्डम (Condom)',
  'पिल्स (Pills)',
  'डिपो (Depo)',
  'आई.यु.सी.डी. (IUCD)',
  'इम्प्लान्ट (५ वर्ष अवधिको) (Implant 5 yrs)',
  'इम्प्लान्ट (३ वर्ष अवधिको) (Implant 3 yrs)',
  'सायना प्रेस (Sayana Press)',
  'आकस्मिक गर्भनिरोधक चक्की (Emergency Contraceptive)'
];

const permanentMethods = [
  'मिनिल्याप (Minilap - Female)',
  'भ्यासेक्टोमी (Vasectomy - Male)'
];

export const PariwarNiyojanSewa: React.FC<PariwarNiyojanSewaProps> = ({ 
  serviceSeekerRecords = [], 
  familyPlanningRecords = [], 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  
  const [formData, setFormData] = useState<Partial<FamilyPlanningRecord>>({
    methodType: 'Temporary',
    methodName: temporaryMethods[0],
    userType: 'New',
    quantityDistributed: 1,
    isPostPartum: false,
    postPartumTiming: 'Within 48 hours'
  });

  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');

  const handleSearch = () => {
    const patient = serviceSeekerRecords.find(p => p.uniquePatientId === searchId || p.registrationNumber === searchId);
    if (patient) {
      setCurrentPatient(patient);
    } else {
      alert('बिरामी फेला परेन। कृपया सही दर्ता नम्बर वा बिरामी ID राख्नुहोस्।');
      setCurrentPatient(null);
    }
  };

  const handleSave = () => {
    if (!currentPatient) {
      alert('कृपया पहिले बिरामी खोज्नुहोस्।');
      return;
    }

    const newRecord: FamilyPlanningRecord = {
      id: `fp-${Date.now()}`,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      fiscalYear: currentFiscalYear,
      visitDate: (() => { try { return new NepaliDate().format('YYYY-MM-DD'); } catch(e) { return ''; } })(),
      methodType: formData.methodType as 'Temporary' | 'Permanent',
      methodName: formData.methodName || '',
      userType: formData.userType,
      quantityDistributed: formData.quantityDistributed,
      institutionType: formData.institutionType,
      locationType: formData.locationType,
      isPostPartum: formData.isPostPartum,
      postPartumTiming: formData.postPartumTiming,
      remarks: formData.remarks
    };

    onSaveRecord(newRecord);
    alert('परिवार नियोजन सेवा रेकर्ड सफलतापूर्वक सुरक्षित गरियो।');
    
    // Reset form
    setFormData({
      methodType: 'Temporary',
      methodName: temporaryMethods[0],
      userType: 'New',
      quantityDistributed: 1,
      isPostPartum: false,
      postPartumTiming: 'Within 48 hours'
    });
    setCurrentPatient(null);
    setSearchId('');
  };

  const patientHistory = useMemo(() => {
    if (!currentPatient) return [];
    return familyPlanningRecords.filter(r => r.serviceSeekerId === currentPatient.id).sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [currentPatient, familyPlanningRecords]);

  const allHistory = useMemo(() => {
    return [...familyPlanningRecords].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [familyPlanningRecords]);

  const getPatientDetails = (id: string) => {
    return serviceSeekerRecords.find(p => p.id === id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 font-nepali flex items-center gap-2">
          <Heart className="text-primary-600" />
          परिवार नियोजन सेवा (Family Planning)
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'register' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            नयाँ दर्ता
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'history' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            सबै रेकर्डहरू
          </button>
        </div>
      </div>

      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Search size={20} className="text-slate-400" />
                बिरामी खोज्नुहोस्
              </h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="दर्ता नम्बर वा बिरामी ID राख्नुहोस्..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold transition-colors"
                >
                  खोज्नुहोस्
                </button>
              </div>

              {currentPatient && (
                <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100 flex items-start gap-4">
                  <div className="p-3 bg-white rounded-full shadow-sm text-primary-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{currentPatient.name}</h4>
                    <div className="text-sm text-slate-600 mt-1 grid grid-cols-2 gap-x-8 gap-y-1">
                      <p>ID: <span className="font-medium">{currentPatient.uniquePatientId}</span></p>
                      <p>उमेर: <span className="font-medium">{currentPatient.ageYears} वर्ष {currentPatient.ageMonths} महिना</span></p>
                      <p>लिङ्ग: <span className="font-medium">{currentPatient.gender === 'Male' ? 'पुरुष' : currentPatient.gender === 'Female' ? 'महिला' : 'अन्य'}</span></p>
                      <p>ठेगाना: <span className="font-medium">{currentPatient.address}</span></p>
                      <p>फोन: <span className="font-medium">{currentPatient.phone}</span></p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {currentPatient && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                  <Settings size={20} className="text-primary-600" />
                  सेवा विवरण (Service Details)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">साधनको प्रकार (Method Type)</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="methodType"
                          value="Temporary"
                          checked={formData.methodType === 'Temporary'}
                          onChange={(e) => setFormData({ ...formData, methodType: 'Temporary', methodName: temporaryMethods[0] })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium">अस्थायी (Temporary)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="methodType"
                          value="Permanent"
                          checked={formData.methodType === 'Permanent'}
                          onChange={(e) => setFormData({ ...formData, methodType: 'Permanent', methodName: permanentMethods[0] })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium">स्थायी (Permanent)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">साधनको नाम (Method Name)</label>
                    <select
                      value={formData.methodName}
                      onChange={(e) => setFormData({ ...formData, methodName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    >
                      {(formData.methodType === 'Temporary' ? temporaryMethods : permanentMethods).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {formData.methodType === 'Temporary' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">प्रयोगकर्ताको प्रकार (User Type)</label>
                        <select
                          value={formData.userType}
                          onChange={(e) => setFormData({ ...formData, userType: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        >
                          <option value="New">नयाँ प्रयोगकर्ता (New)</option>
                          <option value="Current">हाल अपनाई रहेका (Current)</option>
                          <option value="Discontinued">सेवामा नियमित नभएका (Discontinued)</option>
                        </select>
                      </div>
                      <div>
                        <Input
                          label="साधन वितरण परिमाण (Quantity)"
                          type="number"
                          min="1"
                          value={formData.quantityDistributed || ''}
                          onChange={(e) => setFormData({ ...formData, quantityDistributed: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </>
                  )}

                  {formData.methodType === 'Permanent' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">संस्थाको प्रकार (Institution Type)</label>
                        <select
                          value={formData.institutionType || 'Government'}
                          onChange={(e) => setFormData({ ...formData, institutionType: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        >
                          <option value="Government">सरकारी (Government)</option>
                          <option value="Non-Government">गैर सरकारी (Non-Government)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">स्थान (Location)</label>
                        <select
                          value={formData.locationType || 'Health Facility'}
                          onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        >
                          <option value="Health Facility">स्वास्थ्य संस्था (Health Facility)</option>
                          <option value="Camp">शिविर (Camp)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={formData.isPostPartum}
                      onChange={(e) => setFormData({ ...formData, isPostPartum: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-bold text-slate-700">सुत्केरी पछाडि प. नि. सेवा अपनाएको हो? (Post-partum FP)</span>
                  </label>

                  {formData.isPostPartum && (
                    <div className="ml-6">
                      <label className="block text-sm font-bold text-slate-700 mb-2">समय अवधि (Timing)</label>
                      <select
                        value={formData.postPartumTiming}
                        onChange={(e) => setFormData({ ...formData, postPartumTiming: e.target.value as any })}
                        className="w-full md:w-1/2 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      >
                        <option value="Within 48 hours">सुत्केरी भएको ४८ घण्टा भित्र (Within 48 hrs)</option>
                        <option value="48 hours to 1 year">४८ घण्टा देखि एक वर्ष भित्र (48 hrs to 1 yr)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <Input
                    label="कैफियत (Remarks)"
                    value={formData.remarks || ''}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold transition-colors"
                  >
                    <Save size={18} />
                    रेकर्ड सेभ गर्नुहोस्
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                बिरामीको अघिल्लो रेकर्ड
              </h3>
              
              {!currentPatient ? (
                <div className="text-center text-slate-500 py-8">
                  कृपया रेकर्ड हेर्न बिरामी खोज्नुहोस्
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  कुनै अघिल्लो रेकर्ड फेला परेन
                </div>
              ) : (
                <div className="space-y-4">
                  {patientHistory.map(record => (
                    <div key={record.id} className="p-4 border border-slate-100 bg-slate-50 rounded-lg relative group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar size={14} />
                          {record.visitDate}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${record.methodType === 'Temporary' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {record.methodType === 'Temporary' ? 'अस्थायी' : 'स्थायी'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{record.methodName}</p>
                      {record.methodType === 'Temporary' && (
                        <p className="text-sm text-slate-600 mt-1">
                          प्रयोगकर्ता: {record.userType === 'New' ? 'नयाँ' : record.userType === 'Current' ? 'हालको' : 'नियमित नभएका'} | परिमाण: {record.quantityDistributed}
                        </p>
                      )}
                      {record.isPostPartum && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">सुत्केरी पछाडि: {record.postPartumTiming === 'Within 48 hours' ? '४८ घण्टा भित्र' : '४८ घण्टा - १ वर्ष'}</p>
                      )}
                      
                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <button
                          onClick={() => {
                            if(window.confirm('के तपाई यो रेकर्ड मेटाउन निश्चित हुनुहुन्छ?')) {
                              onDeleteRecord(record.id);
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="मेटाउनुहोस्"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">मिति</th>
                  <th className="p-4 font-bold">बिरामीको नाम</th>
                  <th className="p-4 font-bold">प्रकार</th>
                  <th className="p-4 font-bold">साधनको नाम</th>
                  <th className="p-4 font-bold">प्रयोगकर्ता/स्थान</th>
                  <th className="p-4 font-bold">सुत्केरी पछाडि</th>
                  {currentUser?.role === 'SUPER_ADMIN' && <th className="p-4 font-bold text-right">कार्य</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allHistory.map(record => {
                  const patient = getPatientDetails(record.serviceSeekerId);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="p-4">{record.visitDate}</td>
                      <td className="p-4 font-medium text-slate-800">
                        {patient?.name || 'Unknown'}
                        <div className="text-xs text-slate-500 font-normal">{patient?.uniquePatientId}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.methodType === 'Temporary' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {record.methodType === 'Temporary' ? 'अस्थायी' : 'स्थायी'}
                        </span>
                      </td>
                      <td className="p-4">{record.methodName}</td>
                      <td className="p-4">
                        {record.methodType === 'Temporary' ? (
                          <span>{record.userType === 'New' ? 'नयाँ' : record.userType === 'Current' ? 'हालको' : 'नियमित नभएका'} ({record.quantityDistributed})</span>
                        ) : (
                          <span>{record.institutionType === 'Government' ? 'सरकारी' : 'गैर सरकारी'} - {record.locationType === 'Health Facility' ? 'स्वास्थ्य संस्था' : 'शिविर'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {record.isPostPartum ? (
                          <span className="text-amber-600 font-medium text-xs">
                            {record.postPartumTiming === 'Within 48 hours' ? '४८ घण्टा भित्र' : '४८ घण्टा - १ वर्ष'}
                          </span>
                        ) : '-'}
                      </td>
                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              if(window.confirm('के तपाई यो रेकर्ड मेटाउन निश्चित हुनुहुन्छ?')) {
                                onDeleteRecord(record.id);
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {allHistory.length === 0 && (
                  <tr>
                    <td colSpan={currentUser?.role === 'SUPER_ADMIN' ? 7 : 6} className="p-8 text-center text-slate-500">
                      कुनै रेकर्ड फेला परेन
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
