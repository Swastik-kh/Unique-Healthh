import React, { useState, useEffect, useMemo } from 'react';
import { Syringe, Plus, Search, Calendar, Users, MapPin, Printer, Save, Trash2, Info, ChevronRight, Filter, Download } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, push, set, remove, get } from 'firebase/database';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { toNepaliNumber } from './nepaliUtils';

interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  centers: string[];
  ageGroups: string[];
  fiscalYear: string;
}

interface AbhiyanRecord {
  id: string;
  campaignId: string;
  centerName: string;
  beneficiaryName: string;
  age: string;
  ageGroup: string;
  gender: 'Male' | 'Female' | 'Other';
  date: string;
  fiscalYear: string;
}

export const KhopAbhiyan: React.FC<{ 
  currentFiscalYear: string; 
  activeOrgName: string; 
  generalSettings?: any; 
  currentUser?: any;
  allUsers?: any[];
}> = ({ 
  currentFiscalYear, 
  activeOrgName, 
  generalSettings,
  currentUser,
  allUsers = []
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'report' | 'manage'>('records');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [records, setRecords] = useState<AbhiyanRecord[]>([]);
  
  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [centers, setCenters] = useState<string[]>(['']);
  const [ageGroups, setAgeGroups] = useState<string[]>(['']);

  // Record Form State
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [age, setAge] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [recordDate, setRecordDate] = useState('');

  // Report Filter State
  const [reportCampaignId, setReportCampaignId] = useState('all');
  const [reportCenter, setReportCenter] = useState('all');
  const [reportType, setReportType] = useState<'statistical' | 'detail'>('statistical');

  useEffect(() => {
    const campaignsRef = ref(db, `orgData/${activeOrgName}/khop_campaigns`);
    const recordsRef = ref(db, `orgData/${activeOrgName}/khop_records`);

    const unsubCampaigns = onValue(campaignsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        setCampaigns(list.filter(c => c.fiscalYear === currentFiscalYear));
      } else {
        setCampaigns([]);
      }
    });

    const unsubRecords = onValue(recordsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        setRecords(list.filter(r => r.fiscalYear === currentFiscalYear));
      } else {
        setRecords([]);
      }
    });

    return () => {
      unsubCampaigns();
      unsubRecords();
    };
  }, [activeOrgName, currentFiscalYear]);

  const handleAddCenter = () => setCenters([...centers, '']);
  const handleRemoveCenter = (index: number) => {
    const newCenters = centers.filter((_, i) => i !== index);
    setCenters(newCenters.length ? newCenters : ['']);
  };
  const handleCenterChange = (index: number, value: string) => {
    const newCenters = [...centers];
    newCenters[index] = value;
    setCenters(newCenters);
  };

  const handleAddAgeGroup = () => setAgeGroups([...ageGroups, '']);
  const handleRemoveAgeGroup = (index: number) => {
    const newGroups = ageGroups.filter((_, i) => i !== index);
    setAgeGroups(newGroups.length ? newGroups : ['']);
  };
  const handleAgeGroupChange = (index: number, value: string) => {
    const newGroups = [...ageGroups];
    newGroups[index] = value;
    setAgeGroups(newGroups);
  };

  const saveCampaign = async () => {
    if (!campaignName || !startDate || !endDate) return alert('सबै क्षेत्रहरू भर्नुहोस्');
    const validCenters = centers.filter(c => c.trim() !== '');
    if (validCenters.length === 0) return alert('कमसेकम एउटा खोप केन्द्र थप्नुहोस्');
    
    const validAgeGroups = ageGroups.filter(g => g.trim() !== '');
    if (validAgeGroups.length === 0) return alert('कमसेकम एउटा उमेर समूह थप्नुहोस्');

    const campaignsRef = ref(db, `orgData/${activeOrgName}/khop_campaigns`);
    const newCampaignRef = push(campaignsRef);
    await set(newCampaignRef, {
      name: campaignName,
      startDate,
      endDate,
      centers: validCenters,
      ageGroups: validAgeGroups,
      fiscalYear: currentFiscalYear
    });

    setCampaignName('');
    setStartDate('');
    setEndDate('');
    setCenters(['']);
    setAgeGroups(['']);
    alert('अभियान सुरक्षित गरियो');
  };

  const deleteCampaign = async (id: string) => {
    if (window.confirm('के तपाइँ यो अभियान हटाउन चाहनुहुन्छ? यससँग सम्बन्धित सबै रेकर्डहरू पनि हट्नेछन्।')) {
      await remove(ref(db, `orgData/${activeOrgName}/khop_campaigns/${id}`));
      // Also delete records associated with this campaign
      const campaignRecords = records.filter(r => r.campaignId === id);
      for (const r of campaignRecords) {
        await remove(ref(db, `orgData/${activeOrgName}/khop_records/${r.id}`));
      }
    }
  };

  const saveRecord = async () => {
    if (!selectedCampaignId || !selectedCenter || !beneficiaryName || !age || !recordDate || !selectedAgeGroup) {
      return alert('सबै क्षेत्रहरू भर्नुहोस्');
    }

    const recordsRef = ref(db, `orgData/${activeOrgName}/khop_records`);
    const newRecordRef = push(recordsRef);
    await set(newRecordRef, {
      campaignId: selectedCampaignId,
      centerName: selectedCenter,
      beneficiaryName,
      age,
      ageGroup: selectedAgeGroup,
      gender,
      date: recordDate,
      fiscalYear: currentFiscalYear
    });

    setBeneficiaryName('');
    setAge('');
    setSelectedAgeGroup('');
    setGender('Male');
    alert('रेकर्ड सुरक्षित गरियो');
  };

  const deleteRecord = async (id: string) => {
    if (window.confirm('के तपाइँ यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
      await remove(ref(db, `orgData/${activeOrgName}/khop_records/${id}`));
    }
  };

  const selectedCampaign = useMemo(() => 
    campaigns.find(c => c.id === selectedCampaignId), 
  [selectedCampaignId, campaigns]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchCampaign = reportCampaignId === 'all' || r.campaignId === reportCampaignId;
      const matchCenter = reportCenter === 'all' || r.centerName === reportCenter;
      return matchCampaign && matchCenter;
    });
  }, [records, reportCampaignId, reportCenter]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <Syringe size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">खोप अभियान (Campaign)</h2>
            <p className="text-sm text-slate-500">राष्ट्रिय/स्थानीय खोप अभियान व्यवस्थापन</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'records' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Calendar size={18} /> रेकर्ड प्रविष्टि
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Users size={18} /> रिपोर्ट
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'manage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Plus size={18} /> अभियान थप/परिमार्जन
          </button>
        </div>
      </div>

      {activeTab === 'manage' && (
        <div className="grid gap-6 no-print">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 font-nepali mb-6 flex items-center gap-2 border-b pb-2">
              <Plus size={18} className="text-indigo-600" /> नयाँ अभियान थप्नुहोस्
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">अभियानको नाम</label>
                <input 
                  type="text" 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="उदा: दादुरा-रुबेला अभियान"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <NepaliDatePicker 
                label="शुरु मिति" 
                value={startDate} 
                onChange={setStartDate} 
              />
              <NepaliDatePicker 
                label="अन्त्य मिति" 
                value={endDate} 
                onChange={setEndDate} 
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase block">खोप केन्द्रहरू (Vaccination Centers)</label>
                <div className="space-y-3">
                  {centers.map((center, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        value={center}
                        onChange={(e) => handleCenterChange(index, e.target.value)}
                        placeholder={`केन्द्र ${index + 1}`}
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <button 
                        onClick={() => handleRemoveCenter(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleAddCenter}
                  className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> अर्को केन्द्र थप्नुहोस्
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase block">उमेर समूह (Age Groups)</label>
                <div className="space-y-3">
                  {ageGroups.map((group, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        value={group}
                        onChange={(e) => handleAgeGroupChange(index, e.target.value)}
                        placeholder="उदा: ६-११ महिना"
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                      <button 
                        onClick={() => handleRemoveAgeGroup(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleAddAgeGroup}
                  className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> अर्को समूह थप्नुहोस्
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={saveCampaign}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
              >
                <Save size={18} /> अभियान सुरक्षित गर्नुहोस्
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 font-nepali mb-6 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" /> सुचिकृत अभियानहरू
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400 italic">कुनै अभियान भेटिएन।</div>
              ) : (
                campaigns.map(c => (
                  <div key={c.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 relative group">
                    <button 
                      onClick={() => deleteCampaign(c.id)}
                      className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <h4 className="font-bold text-indigo-700 mb-2">{c.name}</h4>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>अवधि: {toNepaliNumber(c.startDate)} देखि {toNepaliNumber(c.endDate)}</p>
                      <p>केन्द्रहरू: {c.centers?.length || 0}</p>
                      <p>उमेर समूह: {c.ageGroups?.join(', ') || '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="grid gap-6 no-print">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 font-nepali mb-6 flex items-center gap-2 border-b pb-2">
              <Plus size={18} className="text-indigo-600" /> नयाँ रेकर्ड थप्नुहोस्
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">अभियान छान्नुहोस्</label>
                <select 
                  value={selectedCampaignId}
                  onChange={(e) => {
                    setSelectedCampaignId(e.target.value);
                    setSelectedCenter('');
                    setSelectedAgeGroup('');
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="">अभियान छान्नुहोस्</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">खोप केन्द्र</label>
                <select 
                  value={selectedCenter}
                  onChange={(e) => setSelectedCenter(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                  disabled={!selectedCampaignId}
                >
                  <option value="">केन्द्र छान्नुहोस्</option>
                  {selectedCampaign?.centers.map(center => <option key={center} value={center}>{center}</option>)}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">सेवाग्राहीको नाम</label>
                <input 
                  type="text" 
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="नाम"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">उमेर समूह</label>
                <select 
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                  disabled={!selectedCampaignId}
                >
                  <option value="">समूह छान्नुहोस्</option>
                  {selectedCampaign?.ageGroups.map(group => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">उमेर (Age)</label>
                <input 
                  type="text" 
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="उदा: ५ बर्ष"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">लिङ्ग (Gender)</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="Male">पुरुष (Male)</option>
                  <option value="Female">महिला (Female)</option>
                  <option value="Other">अन्य (Other)</option>
                </select>
              </div>
              <NepaliDatePicker 
                label="खोप लगाएको मिति" 
                value={recordDate} 
                onChange={setRecordDate} 
              />
              <div className="flex justify-end md:col-span-2">
                <button 
                  onClick={saveRecord}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
                >
                  <Save size={18} /> रेकर्ड थप्नुहोस्
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 font-nepali mb-6 flex items-center gap-2 border-b pb-2">
              <Users size={18} className="text-indigo-600" /> हालैका रेकर्डहरू
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">मिति</th>
                    <th className="p-3">नाम</th>
                    <th className="p-3 text-center">उमेर समूह</th>
                    <th className="p-3 text-center">उमेर/लिङ्ग</th>
                    <th className="p-3">अभियान/केन्द्र</th>
                    <th className="p-3 text-right">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.slice(0, 20).map(r => {
                    const campaign = campaigns.find(c => c.id === r.campaignId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">{toNepaliNumber(r.date)}</td>
                        <td className="p-3 font-bold">{r.beneficiaryName}</td>
                        <td className="p-3 text-center">
                          <span className="text-indigo-700 font-bold">{r.ageGroup}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {r.age} / {r.gender === 'Male' ? 'पु' : r.gender === 'Female' ? 'म' : 'अ'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-xs">
                            <p className="font-bold text-indigo-700">{campaign?.name || 'Unknown'}</p>
                            <p className="text-slate-400">{r.centerName}</p>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => deleteRecord(r.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-300 italic">कुनै रेकर्ड भेटिएन।</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-print">
            <h3 className="font-bold text-slate-800 font-nepali mb-6 flex items-center gap-2 border-b pb-2">
              <Filter size={18} className="text-indigo-600" /> रिपोर्ट फिल्टर
            </h3>
            <div className="grid md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">अभियान</label>
                <select 
                  value={reportCampaignId}
                  onChange={(e) => {
                    setReportCampaignId(e.target.value);
                    setReportCenter('all');
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                >
                  <option value="all">सबै अभियानहरू</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">खोप केन्द्र</label>
                <select 
                  value={reportCenter}
                  onChange={(e) => setReportCenter(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                  disabled={reportCampaignId === 'all'}
                >
                  <option value="all">सबै केन्द्रहरू</option>
                  {campaigns.find(c => c.id === reportCampaignId)?.centers.map(center => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md"
                >
                  <Printer size={18} /> प्रिन्ट गर्नुहोस्
                </button>
              </div>
            </div>

            <div className="mt-6 flex bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setReportType('statistical')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'statistical' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                सांख्यिकीय रिपोर्ट
              </button>
              <button
                onClick={() => setReportType('detail')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'detail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                विस्तृत रिपोर्ट
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
            {/* Professional Report Header for Print */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-300 pb-6">
              <div className="flex justify-between items-start">
                <div className="w-24 h-24">
                  <img 
                    src={generalSettings?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center px-4">
                  <h1 className="text-2xl font-black text-slate-900 mb-1">{generalSettings?.orgNameNepali || activeOrgName}</h1>
                  <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali || ''}</p>
                  <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali2 || ''}</p>
                  <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali3 || ''}</p>
                  <p className="text-xs font-bold text-slate-600 mb-0.5">{generalSettings?.subTitleNepali4 || ''}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">{generalSettings?.address || ''}</p>
                </div>
                <div className="w-24 h-24 flex justify-end">
                  {generalSettings?.provinceLogoUrl && (
                    <img 
                      src={generalSettings.provinceLogoUrl} 
                      alt="Province Logo" 
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <h2 className="text-xl font-bold text-indigo-700 text-center mb-4">
                  {reportCampaignId === 'all' 
                    ? `खोप अभियान ${reportType === 'statistical' ? 'सांख्यिकीय' : 'विस्तृत'} रिपोर्ट`
                    : campaigns.find(c => c.id === reportCampaignId)?.name || 'खोप अभियान रिपोर्ट'} ({toNepaliNumber(currentFiscalYear)})
                </h2>
                
                <div className="flex justify-between items-end mb-2">
                  <div>
                    {reportCampaignId !== 'all' && (() => {
                      const campaign = campaigns.find(c => c.id === reportCampaignId);
                      return campaign ? (
                        <p className="text-sm font-bold text-slate-600">
                          सञ्चालन मिति: {toNepaliNumber(campaign.startDate)} देखि {toNepaliNumber(campaign.endDate)} सम्म
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    मिति: {toNepaliNumber(new NepaliDate().format('YYYY/MM/DD'))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 print:hidden">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                {reportType === 'statistical' ? 'सांख्यिकीय रिपोर्ट (Statistical)' : 'विस्तृत रिपोर्ट (Detailed)'}
                <span className="text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">{toNepaliNumber(filteredRecords.length)} रेकर्डहरू</span>
              </h3>
            </div>

            {reportType === 'statistical' ? (
              (() => {
                const selectedReportCampaign = campaigns.find(c => c.id === reportCampaignId);
                const displayCenters = reportCampaignId === 'all' 
                  ? Array.from(new Set(records.map(r => r.centerName)))
                  : (reportCenter === 'all' ? selectedReportCampaign?.centers || [] : [reportCenter]);
                
                const displayAgeGroups = reportCampaignId === 'all'
                  ? Array.from(new Set(records.map(r => r.ageGroup)))
                  : (selectedReportCampaign?.ageGroups || []);

                if (displayAgeGroups.length === 0) {
                  return <div className="p-12 text-center text-slate-400 italic">डाटा उपलब्ध छैन। अभियान छान्नुहोस्।</div>;
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th rowSpan={2} className="p-2 border border-slate-300 text-center w-12">क्र.सं.</th>
                          <th rowSpan={2} className="p-2 border border-slate-300">खोप केन्द्रको नाम</th>
                          {displayAgeGroups.map(group => (
                            <th key={group} colSpan={3} className="p-2 border border-slate-300 text-center">{group}</th>
                          ))}
                          <th rowSpan={2} className="p-2 border border-slate-300 text-center bg-slate-200">जम्मा (Total)</th>
                        </tr>
                        <tr className="bg-slate-50 text-slate-600">
                          {displayAgeGroups.map(group => (
                            <React.Fragment key={group}>
                              <th className="p-1 border border-slate-300 text-center w-10">पु</th>
                              <th className="p-1 border border-slate-300 text-center w-10">म</th>
                              <th className="p-1 border border-slate-300 text-center w-10 bg-slate-100">ज</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayCenters.map((center, idx) => {
                          let centerTotal = 0;
                          return (
                            <tr key={center} className="hover:bg-slate-50">
                              <td className="p-2 border border-slate-200 text-center">{toNepaliNumber(idx + 1)}</td>
                              <td className="p-2 border border-slate-200 font-bold">{center}</td>
                              {displayAgeGroups.map(group => {
                                const m = filteredRecords.filter(r => r.centerName === center && r.ageGroup === group && r.gender === 'Male').length;
                                const f = filteredRecords.filter(r => r.centerName === center && r.ageGroup === group && r.gender === 'Female').length;
                                const t = m + f;
                                centerTotal += t;
                                return (
                                  <React.Fragment key={group}>
                                    <td className="p-2 border border-slate-200 text-center">{toNepaliNumber(m)}</td>
                                    <td className="p-2 border border-slate-200 text-center">{toNepaliNumber(f)}</td>
                                    <td className="p-2 border border-slate-200 text-center bg-slate-50 font-bold">{toNepaliNumber(t)}</td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="p-2 border border-slate-200 text-center font-black bg-slate-100">{toNepaliNumber(centerTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-black">
                        <tr>
                          <td colSpan={2} className="p-2 border border-slate-300 text-right">कुल जम्मा (Grand Total):</td>
                          {displayAgeGroups.map(group => {
                            const m = filteredRecords.filter(r => r.ageGroup === group && r.gender === 'Male').length;
                            const f = filteredRecords.filter(r => r.ageGroup === group && r.gender === 'Female').length;
                            const t = m + f;
                            return (
                              <React.Fragment key={group}>
                                <td className="p-2 border border-slate-300 text-center">{toNepaliNumber(m)}</td>
                                <td className="p-2 border border-slate-300 text-center">{toNepaliNumber(f)}</td>
                                <td className="p-2 border border-slate-300 text-center bg-slate-200">{toNepaliNumber(t)}</td>
                              </React.Fragment>
                            );
                          })}
                          <td className="p-2 border border-slate-300 text-center bg-indigo-100 text-indigo-700">{toNepaliNumber(filteredRecords.length)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 border border-slate-300 text-center w-12">क्र.सं.</th>
                      <th className="p-2 border border-slate-300">मिति</th>
                      <th className="p-2 border border-slate-300">सेवाग्राहीको नाम</th>
                      <th className="p-2 border border-slate-300 text-center">उमेर समूह</th>
                      <th className="p-2 border border-slate-300 text-center">उमेर</th>
                      <th className="p-2 border border-slate-300 text-center">लिङ्ग</th>
                      <th className="p-2 border border-slate-300">अभियान</th>
                      <th className="p-2 border border-slate-300">खोप केन्द्र</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2 border border-slate-200 text-center">{toNepaliNumber(idx + 1)}</td>
                        <td className="p-2 border border-slate-200">{toNepaliNumber(r.date)}</td>
                        <td className="p-2 border border-slate-200 font-bold">{r.beneficiaryName}</td>
                        <td className="p-2 border border-slate-200 text-center">{r.ageGroup}</td>
                        <td className="p-2 border border-slate-200 text-center">{r.age}</td>
                        <td className="p-2 border border-slate-200 text-center">{r.gender === 'Male' ? 'पुरुष' : r.gender === 'Female' ? 'महिला' : 'अन्य'}</td>
                        <td className="p-2 border border-slate-200 text-[10px]">{campaigns.find(c => c.id === r.campaignId)?.name || '-'}</td>
                        <td className="p-2 border border-slate-200 text-[10px] font-bold">{r.centerName}</td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 italic">डाटा उपलब्ध छैन। फिल्टर परिवर्तन गरी हेर्नुहोस्।</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="hidden print:block mt-32">
              {(() => {
                const orgUsers = allUsers.filter(u => u.organizationName === currentUser?.organizationName);
                
                // Preparer from settings
                const preparerId = generalSettings?.khopReportPreparerUserId;
                const preparer = allUsers.find(u => u.id === preparerId) || currentUser;
                
                // Certifier: First ADMIN/SUPER_ADMIN in organization
                const certifier = orgUsers.find(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') || 
                                  orgUsers[0] || 
                                  currentUser;
                
                const nepDate = new NepaliDate();
                const formattedNepDate = toNepaliNumber(nepDate.format('YYYY/MM/DD'));

                const certifierName = certifier?.fullName || certifier?.name || '................................';
                const certifierDesignation = certifier?.designation || (certifier?.role === 'ADMIN' || certifier?.role === 'SUPER_ADMIN' ? 'प्रशासक' : '................................');

                const preparerName = preparer?.fullName || preparer?.name || '................................';
                const preparerDesignation = preparer?.designation || '................................';

                return (
                  <div className="flex justify-between px-4">
                    <div className="text-center w-64">
                      <div className="border-t border-slate-900 pt-2">
                        <p className="text-sm font-bold">तयार गर्ने</p>
                        <p className="text-xs mt-1 font-bold">नाम: {preparerName}</p>
                        <p className="text-xs font-bold">पद: {preparerDesignation}</p>
                        <p className="text-xs font-bold">मिति: {formattedNepDate}</p>
                      </div>
                    </div>
                    <div className="text-center w-64">
                      <div className="border-t border-slate-900 pt-2">
                        <p className="text-sm font-bold">प्रमाणित गर्ने</p>
                        <p className="text-xs mt-1 font-bold">नाम: {certifierName}</p>
                        <p className="text-xs font-bold">पद: {certifierDesignation}</p>
                        <p className="text-xs font-bold">मिति: {formattedNepDate}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

