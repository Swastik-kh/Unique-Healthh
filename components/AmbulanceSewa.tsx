import React, { useState, useMemo } from 'react';
import { AmbulanceRecord, ServiceSeekerRecord, User, OrganizationSettings } from '../types';
import { Plus, Search, Edit2, Trash2, Calendar, User as UserIcon, Phone, MapPin, Truck, AlertCircle, FileText, Info } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';

interface AmbulanceSewaProps {
  records: AmbulanceRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  currentUser?: User | null;
  onSave: (record: AmbulanceRecord) => void;
  onDelete: (id: string) => void;
  currentFiscalYear: string;
  generalSettings?: OrganizationSettings;
}

export const AmbulanceSewa: React.FC<AmbulanceSewaProps> = ({
  records = [],
  serviceSeekerRecords = [],
  currentUser,
  onSave,
  onDelete,
  currentFiscalYear,
  generalSettings
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AmbulanceRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [formData, setFormData] = useState<Partial<AmbulanceRecord>>({
    dateBs: new NepaliDate().format('YYYY-MM-DD'),
    patientName: '',
    age: '',
    address: '',
    phone: '',
    driverName: '',
    ambulanceNo: '',
    startLocation: '',
    destination: '',
    distanceKm: undefined,
    amountCharged: 0,
    receivedAmount: 0,
    remarks: ''
  });

  const handlePatientSelect = (patient: ServiceSeekerRecord) => {
    setFormData(prev => ({
      ...prev,
      serviceSeekerId: patient.id,
      patientName: patient.name,
      age: patient.age,
      address: patient.address,
      phone: patient.phone
    }));
    setPatientSearchInput(patient.name);
    setShowPatientDropdown(false);
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
    if (!formData.patientName) {
      alert('कृपया सेवाग्राही/बिरामीको नाम प्रविष्ट गर्नुहोस्');
      return;
    }

    const record: AmbulanceRecord = {
      id: editingRecord?.id || `AMB-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      dateBs: formData.dateBs || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: formData.serviceSeekerId,
      patientName: formData.patientName || '',
      age: formData.age || '',
      address: formData.address || '',
      phone: formData.phone || '',
      driverName: formData.driverName || '',
      ambulanceNo: formData.ambulanceNo || '',
      startLocation: formData.startLocation || '',
      destination: formData.destination || '',
      distanceKm: formData.distanceKm ? Number(formData.distanceKm) : undefined,
      amountCharged: Number(formData.amountCharged) || 0,
      receivedAmount: Number(formData.receivedAmount) || 0,
      remarks: formData.remarks || ''
    };

    onSave(record);
    setIsFormOpen(false);
    setEditingRecord(null);
    setPatientSearchInput('');
    setFormData({
      dateBs: new NepaliDate().format('YYYY-MM-DD'),
      patientName: '',
      age: '',
      address: '',
      phone: '',
      driverName: '',
      ambulanceNo: '',
      startLocation: '',
      destination: '',
      distanceKm: undefined,
      amountCharged: 0,
      receivedAmount: 0,
      remarks: ''
    });
  };

  const handleEdit = (record: AmbulanceRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setPatientSearchInput(record.patientName);
    setIsFormOpen(true);
  };

  const filteredRecords = records.filter(r => 
    r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.ambulanceNo && r.ambulanceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.driverName && r.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.destination && r.destination.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.phone && r.phone.includes(searchTerm))
  );

  const canDelete = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const configuredRoutes = useMemo(() => {
    if (!generalSettings?.ambulanceRoutes) return [];
    return generalSettings.ambulanceRoutes.map(route => {
      const parts = route.split('|');
      return {
        from: parts[0] || '',
        to: parts[1] || '',
        rate: Number(parts[2]) || 0
      };
    }).filter(r => r.from || r.to);
  }, [generalSettings?.ambulanceRoutes]);

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 font-nepali flex items-center gap-2">
              <Truck className="text-rose-600 size-7" />
              एम्बुलेन्स सेवा (Ambulance Service)
            </h2>
            <p className="text-sm text-slate-500">एम्बुलेन्स सेवा प्रयोगको विवरण तथा बिलिङ रेकर्ड</p>
          </div>
          <button
            onClick={() => {
              setEditingRecord(null);
              setPatientSearchInput('');
              setFormData({
                dateBs: new NepaliDate().format('YYYY-MM-DD'),
                patientName: '',
                age: '',
                address: '',
                phone: '',
                driverName: generalSettings?.ambulanceDriverName || '',
                ambulanceNo: generalSettings?.ambulanceNo || '',
                startLocation: '',
                destination: '',
                distanceKm: undefined,
                amountCharged: 0,
                receivedAmount: 0,
                remarks: ''
              });
              setIsFormOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl hover:bg-rose-700 transition-all shadow-sm font-medium hover:scale-[1.02]"
          >
            <Plus size={20} />
            <span className="font-nepali text-sm">नयाँ रेकर्ड थप्नुहोस्न्</span>
          </button>
        </div>

        {isFormOpen && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 ring-4 ring-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 font-nepali border-b pb-3 border-slate-100">
              {editingRecord ? 'रेकर्ड परिमार्जन गर्नुहोस्' : 'नयाँ एम्बुलेन्स यात्रा विबरण प्रविष्टि'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Date Selection */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <NepaliDatePicker
                    label="मिति (B.S.) *"
                    required
                    value={formData.dateBs || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, dateBs: val }))}
                  />
                </div>

                {/* Patient / Seeker Name Selector with Search */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-600 font-nepali">सेवाग्राही खोज्नुहोस् / नाम प्रविष्ट गर्नुहोस् *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="सेवाग्राहीको नाम लेख्नुहोस् वा खोज्नुहोस्..."
                      value={patientSearchInput}
                      onChange={e => {
                        setPatientSearchInput(e.target.value);
                        setFormData({...formData, patientName: e.target.value});
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                    />
                  </div>
                  {showPatientDropdown && filteredPatients.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredPatients.map(patient => (
                        <div
                          key={patient.id}
                          onClick={() => handlePatientSelect(patient)}
                          className="p-3 text-sm hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{patient.name}</p>
                            <p className="text-xs text-slate-500">ID: {patient.uniquePatientId || 'N/A'} • {patient.address || 'N/A'}</p>
                          </div>
                          <span className="text-[10px] bg-slate-100 font-bold px-2 py-1 rounded text-slate-600">दर्ता भएको</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showPatientDropdown && patientSearchInput && (
                    <div className="absolute z-20 w-full mt-1">
                      <button
                        type="button"
                        onClick={() => setShowPatientDropdown(false)}
                        className="w-full p-2 bg-slate-50 hover:bg-slate-100 text-xs text-slate-500 font-semibold border border-slate-200 rounded-lg shadow-sm"
                      >
                        ड्रपडाउन बन्द गर्नुहोस् (Close Selections)
                      </button>
                    </div>
                  )}
                </div>

                {/* Patient Age */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">उमेर (Age)</label>
                  <input
                    type="text"
                    placeholder="जस्तै: 32 Years / 15 Months"
                    value={formData.age || ''}
                    onChange={e => setFormData({...formData, age: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                  />
                </div>

                {/* Patient Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">ठेगाना (Address)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="ठेगाना लेख्नुहोस्"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">सम्पर्क नम्बर (Phone)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      placeholder="फोन नम्बर प्रविष्ट गर्नुहोस्"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Driver Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">चालकको नाम (Driver Name) *</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="चालकको पुरा नाम"
                      value={formData.driverName || ''}
                      onChange={e => setFormData({...formData, driverName: e.target.value})}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Ambulance Vehicle-No */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">एम्बुलेन्स नं. (Ambulance Vehicle No.) *</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="जस्तै: बा १ झ ९४८८"
                      value={formData.ambulanceNo || ''}
                      onChange={e => setFormData({...formData, ambulanceNo: e.target.value})}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {/* Route Pre-selector if configured */}
                {configuredRoutes.length > 0 && (
                  <div className="space-y-1.5 lg:col-span-3 bg-rose-50/50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Truck size={14} className="text-rose-600" />
                        पूर्व-सुरक्षित एम्बुलेन्स मार्ग छान्नुहोस् (Choose Configured Route)
                      </h4>
                      <p className="text-[11px] text-rose-700/80">नियमित मार्गको भाडा र विवरण स्वचालित भर्न यहाँबाट मार्ग चयन गर्नुहोस्</p>
                    </div>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [fromLoc, toLoc, rate] = val.split('|');
                          setFormData(prev => ({
                            ...prev,
                            startLocation: fromLoc,
                            destination: toLoc,
                            amountCharged: Number(rate) || 0,
                            receivedAmount: Number(rate) || 0
                          }));
                        }
                      }}
                      className="text-xs p-2.5 bg-white border border-rose-300 rounded-xl text-rose-900 font-bold focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none w-full sm:w-64 cursor-pointer"
                    >
                      <option value="">-- मार्ग छनौट गर्नुहोस् (Select Route) --</option>
                      {configuredRoutes.map((r, i) => (
                        <option key={i} value={`${r.from}|${r.to}|${r.rate}`}>
                          {r.from} ➔ {r.to} (रु. {r.rate})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Starting Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कहाँबाट (From) *</label>
                  <input
                    type="text"
                    required
                    placeholder="प्रस्थान विन्दु"
                    value={formData.startLocation || ''}
                    onChange={e => setFormData({...formData, startLocation: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                  />
                </div>

                {/* Destination Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कहाँसम्म (To) *</label>
                  <input
                    type="text"
                    required
                    placeholder="गन्तव्य विन्दु"
                    value={formData.destination || ''}
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                  />
                </div>

                {/* Distance in KM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">दुरी कि.मी. (Distance KM)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="दुरी (किलोमिटरमा)"
                    value={formData.distanceKm === undefined ? '' : formData.distanceKm}
                    onChange={e => setFormData({...formData, distanceKm: e.target.value === '' ? undefined : Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-mono"
                  />
                </div>

                {/* Amount Charged */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कूल शुल्क रु. (Total Charged Amount) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="जस्तै: 1500"
                    value={formData.amountCharged || ''}
                    onChange={e => setFormData({...formData, amountCharged: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-mono font-bold text-red-600"
                  />
                </div>

                {/* Received/Paid Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">प्राप्त रकम रु. (Received Amount) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="जस्तै: 1500"
                    value={formData.receivedAmount || ''}
                    onChange={e => setFormData({...formData, receivedAmount: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-mono font-bold text-emerald-600"
                  />
                </div>

                {/* Remarks/Kaifiyat */}
                <div className="space-y-1.5 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कैफियत (Remarks / Notes)</label>
                  <input
                    type="text"
                    placeholder="कैफियत प्रविष्ट गर्नुहोस्..."
                    value={formData.remarks || ''}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingRecord(null);
                    setPatientSearchInput('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm font-semibold"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  {editingRecord ? 'सुरक्षित गर्नुहोस् (Update)' : 'रेकर्ड राख्नुहोस् (Save Record)'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters and List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
              <FileText className="text-slate-500 size-5" />
              यात्रा विबरण सूची (Travel Logs List)
            </h3>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="खोज्नुहोस् (नाम, एम्बुलेन्स नं, चालक वा गन्तव्य...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4 font-nepali">मिति (Date)</th>
                  <th className="p-4 font-nepali">बिरामीको नाम (Patient Name)</th>
                  <th className="p-4 font-nepali">चालक र सवारी (Driver/Vehicle)</th>
                  <th className="p-4 font-nepali">प्रस्थान-गन्तव्य (From - To)</th>
                  <th className="p-4 font-nepali">दुरी (Dist.)</th>
                  <th className="p-4 font-nepali text-right">कूल शुल्क</th>
                  <th className="p-4 font-nepali text-right">प्राप्त रकम</th>
                  <th className="p-4 font-nepali text-center">कैफियत / स्थिति</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      <div className="max-w-[300px] mx-auto flex flex-col items-center gap-3">
                        <AlertCircle className="text-slate-300 size-10" />
                        <p className="text-sm font-semibold">कुनै पनि एम्बुलेन्स यात्रा विवरण फेला परेन।</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map(record => {
                    const due = (record.amountCharged || 0) - (record.receivedAmount || 0);
                    const isFullyPaid = due <= 0;

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 whitespace-nowrap text-sm font-mono text-slate-600 font-semibold">{record.dateBs}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 text-sm">{record.patientName}</p>
                          <p className="text-xs text-slate-400">
                            {[record.age && `उमेर: ${record.age}`, record.phone && `फोन: ${record.phone}`].filter(Boolean).join(' • ')}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-700 text-sm">{record.driverName}</p>
                          <p className="text-xs bg-slate-100 text-slate-600 font-bold font-mono px-1.5 py-0.5 rounded w-max">{record.ambulanceNo}</p>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-bold text-rose-600">{record.startLocation}</span>
                            <span>➔</span>
                            <span className="font-bold text-emerald-600">{record.destination}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-mono text-slate-600 font-bold whitespace-nowrap">
                          {record.distanceKm ? `${record.distanceKm} KM` : '-'}
                        </td>
                        <td className="p-4 text-sm font-mono font-bold text-slate-700 text-right whitespace-nowrap">
                          रु. {record.amountCharged?.toFixed(2)}
                        </td>
                        <td className="p-4 text-sm font-mono font-bold text-emerald-600 text-right whitespace-nowrap">
                          रु. {record.receivedAmount?.toFixed(2)}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1.5">
                            {isFullyPaid ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">Paid</span>
                            ) : (
                              <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-100">Due: रु. {due.toFixed(2)}</span>
                            )}
                            {record.remarks && (
                              <p className="text-[11px] text-slate-500 italic max-w-[150px] truncate" title={record.remarks}>{record.remarks}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-all"
                              title="सम्पादन गर्नुहोस्"
                            >
                              <Edit2 size={16} />
                            </button>
                            {canDelete ? (
                              <button
                                onClick={() => {
                                  if (window.confirm('के तपाईं निश्चित रूपमा यो एम्बुलेन्स यात्रा विवरण हटाउन चाहनुहुन्छ?')) {
                                    onDelete(record.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                                title="मेटाउनुहोस्"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="p-1.5 text-slate-200 cursor-not-allowed"
                                title="हटाउने अधिकार छैन"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
