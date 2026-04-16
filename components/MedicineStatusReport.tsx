
import React, { useMemo, useState } from 'react';
import { TBPatient, InventoryItem } from '../types';
import { Option } from '../types/coreTypes';
import { SearchableSelect } from './SearchableSelect';
import { calculatePatientRequirements, MedicineRequirement, fuzzyMatch, getCombinedStandardNames } from '../lib/medicineUtils';
import { Pill, Package, AlertTriangle, CheckCircle, Info, Database, User, Trash2, LayoutDashboard, ClipboardList, Settings, X, Plus, Trash, Search, Edit3 } from 'lucide-react';

interface MedicineStatusReportProps {
  patients: TBPatient[];
  inventory: InventoryItem[];
  onDeletePatient?: (id: string) => void;
  medicineMappings?: Record<string, string[]>;
  onUpdateMappings?: (mappings: Record<string, string[]>) => void;
  customStandardMedicineNames?: string[];
  onUpdateCustomStandardNames?: (names: string[]) => void;
  serviceType?: 'TB' | 'Leprosy';
}

export const MedicineStatusReport: React.FC<MedicineStatusReportProps> = ({ 
  patients, 
  inventory, 
  onDeletePatient,
  medicineMappings = {},
  onUpdateMappings,
  customStandardMedicineNames = [],
  onUpdateCustomStandardNames,
  serviceType
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'management'>('summary');
  const [showMappingSettings, setShowMappingSettings] = useState(false);
  const [newMapping, setNewMapping] = useState({ standardName: '', keyword: '' });
  const [newStandardName, setNewStandardName] = useState('');
  const [showAddStandardName, setShowAddStandardName] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');

  const standardMedicineNames = useMemo(() => {
    const allNames = getCombinedStandardNames(customStandardMedicineNames);
    if (!serviceType) return allNames;
    
    if (serviceType === 'TB') {
      return allNames.filter(name => 
        name.includes('HR') || 
        name.includes('Adult') || 
        name.includes('Child') || 
        name.includes('Levofloxacin')
      );
    } else {
      return allNames.filter(name => 
        name.includes('Dapsone') || 
        name.includes('Clofazimine') || 
        name.includes('Rifampicin')
      );
    }
  }, [customStandardMedicineNames, serviceType]);

  const activePatients = useMemo(() => 
    patients.filter(p => (p.status === 'Active' || !p.status) && (!serviceType || p.serviceType === serviceType)), 
    [patients, serviceType]
  );

  const inventoryOptions = useMemo(() => {
    // Get unique item names from inventory
    const uniqueNames = Array.from(new Set(inventory.map(item => item.itemName)));
    return uniqueNames.map(name => ({
      id: name,
      label: name,
      value: name
    })).sort((a: Option, b: Option) => a.label.localeCompare(b.label));
  }, [inventory]);

  const handleDelete = (id: string, name: string) => {
    if (onDeletePatient && window.confirm(`${name} को सम्पूर्ण विवरण हटाउन चाहनुहुन्छ?`)) {
      onDeletePatient(id);
    }
  };

  const patientRequirements = useMemo(() => {
    return patients
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.patientId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? (p.status === 'Active' || !p.status) : p.status === statusFilter);
        const matchesService = !serviceType || p.serviceType === serviceType;
        return matchesSearch && matchesStatus && matchesService;
      })
      .map(patient => ({
        patient,
        requirements: calculatePatientRequirements(patient, inventory, medicineMappings)
      }));
  }, [patients, inventory, medicineMappings, searchTerm, statusFilter, serviceType]);

  const aggregateRequirements = useMemo(() => {
    const aggregate: Record<string, { totalNeeded: number, totalRemaining: number, stock: number }> = {};
    
    // Initialize with all standard names to ensure they all show up in the summary
    standardMedicineNames.forEach(name => {
      const stock = inventory
        .filter(item => fuzzyMatch(item.itemName, name, medicineMappings))
        .reduce((sum, item) => sum + item.currentQuantity, 0);
        
      aggregate[name] = { totalNeeded: 0, totalRemaining: 0, stock };
    });
    
    // Add requirements from patients (only active ones for the aggregate summary)
    patientRequirements.forEach(({ patient, requirements }) => {
      if (patient.status !== 'Active' && patient.status) return;
      
      requirements.forEach(req => {
        if (aggregate[req.itemName]) {
          aggregate[req.itemName].totalNeeded += req.totalNeeded;
          aggregate[req.itemName].totalRemaining += req.remainingNeeded;
        } else {
          // For any non-standard names that might be returned by calculatePatientRequirements
          if (!aggregate[req.itemName]) {
            aggregate[req.itemName] = { 
              totalNeeded: req.totalNeeded, 
              totalRemaining: req.remainingNeeded, 
              stock: req.availableStock 
            };
          } else {
            aggregate[req.itemName].totalNeeded += req.totalNeeded;
            aggregate[req.itemName].totalRemaining += req.remainingNeeded;
          }
        }
      });
    });
    
    return aggregate;
  }, [standardMedicineNames, inventory, medicineMappings, patientRequirements]);

  const handleAddMapping = () => {
    if (!newMapping.standardName || !newMapping.keyword || !onUpdateMappings) return;
    
    const currentVariations = medicineMappings[newMapping.standardName] || [];
    if (currentVariations.includes(newMapping.keyword)) return;
    
    const updatedMappings = {
      ...medicineMappings,
      [newMapping.standardName]: [...currentVariations, newMapping.keyword]
    };
    
    onUpdateMappings(updatedMappings);
    setNewMapping({ ...newMapping, keyword: '' });
  };

  const handleAddStandardName = () => {
    if (!newStandardName.trim() || !onUpdateCustomStandardNames) return;
    
    if (standardMedicineNames.includes(newStandardName.trim())) {
      alert('यो नाम पहिले नै सूचीमा छ।');
      return;
    }
    
    const updatedNames = [...customStandardMedicineNames, newStandardName.trim()];
    onUpdateCustomStandardNames(updatedNames);
    setNewMapping({ ...newMapping, standardName: newStandardName.trim() });
    setNewStandardName('');
    setShowAddStandardName(false);
  };

  const handleRemoveStandardName = (name: string) => {
    if (!onUpdateCustomStandardNames || !window.confirm(`के तपाईं "${name}" लाई मानक नामको सूचीबाट हटाउन चाहनुहुन्छ?`)) return;
    
    const updatedNames = customStandardMedicineNames.filter(n => n !== name);
    onUpdateCustomStandardNames(updatedNames);
    
    // Also clean up mappings if any
    if (medicineMappings[name] && onUpdateMappings) {
      const updatedMappings = { ...medicineMappings };
      delete updatedMappings[name];
      onUpdateMappings(updatedMappings);
    }
  };

  const handleRemoveMapping = (standardName: string, keyword: string) => {
    if (!onUpdateMappings) return;
    
    const updatedVariations = (medicineMappings[standardName] || []).filter(k => k !== keyword);
    const updatedMappings = { ...medicineMappings };
    
    if (updatedVariations.length === 0) {
      delete updatedMappings[standardName];
    } else {
      updatedMappings[standardName] = updatedVariations;
    }
    
    onUpdateMappings(updatedMappings);
  };

  return (
    <div className="space-y-6 p-4 relative">
      {/* Tab Navigation */}
      <div className="flex justify-between items-center border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={18} />
            औषधि मौज्दात र आवश्यकता सारांश (Medicine Stock & Requirement Summary)
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'management'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClipboardList size={18} />
            औषधि व्यवस्थापन (Medicine Management)
          </button>
        </div>
        
        <button 
          onClick={() => setShowMappingSettings(!showMappingSettings)}
          className={`p-2 rounded-lg transition-all ${showMappingSettings ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          title="Medicine Mapping Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Mapping Settings UI */}
      {showMappingSettings && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings size={18} className="text-blue-600" />
              औषधि म्यापिङ सेटिङ (Medicine Name Mapping)
            </h4>
            <button onClick={() => setShowMappingSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>
          
          <p className="text-xs text-slate-500 mb-6">
            विभिन्न गोदामहरूमा फरक-फरक नामले चिनिने औषधिहरूलाई एउटै मानक नाममा मिलान गर्नुहोस्। 
            उदाहरणका लागि: 'RHZE' वा '4FDC' लाई 'HRZE (Adult)' मा म्याप गर्न सकिन्छ।
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-lg border border-slate-100">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase">मानक नाम (Standard Name)</label>
                <button 
                  onClick={() => setShowAddStandardName(!showAddStandardName)}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  {showAddStandardName ? 'सूचीबाट छान्नुहोस्' : 'नयाँ थप्नुहोस्'}
                </button>
              </div>
              {showAddStandardName ? (
                <div className="flex gap-1">
                  <input 
                    type="text"
                    value={newStandardName}
                    onChange={(e) => setNewStandardName(e.target.value)}
                    placeholder="नयाँ मानक नाम..."
                    className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                  <button 
                    onClick={handleAddStandardName}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                  >
                    <CheckCircle size={18} />
                  </button>
                </div>
              ) : (
                <select 
                  value={newMapping.standardName}
                  onChange={(e) => setNewMapping({...newMapping, standardName: e.target.value})}
                  className="w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">छनोट गर्नुहोस्</option>
                  {standardMedicineNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">स्टकको नाम/किबोर्ड (Stock Keyword)</label>
              <SearchableSelect
                options={inventoryOptions}
                value={newMapping.keyword}
                onChange={(val) => setNewMapping({...newMapping, keyword: val})}
                placeholder="e.g. RHZE, 4FDC"
                className="!py-1.5"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleAddMapping}
                disabled={!newMapping.standardName || !newMapping.keyword}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} /> थप्नुहोस्
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-600 border-b pb-1">हालका म्यापिङहरू (Current Mappings)</h5>
            {Object.entries(medicineMappings).length === 0 && customStandardMedicineNames.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">कुनै म्यापिङ सेट गरिएको छैन।</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Custom Standard Names (even if no mapping yet) */}
                {customStandardMedicineNames.map(name => (
                  <div key={name} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm relative group">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-2 flex justify-between items-center">
                      {name}
                      <button 
                        onClick={() => handleRemoveStandardName(name)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash size={12} />
                      </button>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(medicineMappings[name] || []).map(keyword => (
                        <span key={keyword} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                          {keyword}
                          <button onClick={() => handleRemoveMapping(name, keyword)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                        </span>
                      ))}
                      {(!medicineMappings[name] || medicineMappings[name].length === 0) && (
                        <span className="text-[10px] text-slate-400 italic">कुनै म्यापिङ छैन</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Default Standard Names with Mappings */}
                {Object.entries(medicineMappings)
                  .filter(([name]) => !customStandardMedicineNames.includes(name))
                  .map(([standardName, keywords]) => (
                  <div key={standardName} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-2">{standardName}</p>
                    <div className="flex flex-wrap gap-1">
                      {(keywords as string[]).map(keyword => (
                        <span key={keyword} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                          {keyword}
                          <button onClick={() => handleRemoveMapping(standardName, keyword)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'summary' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <Pill size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">सक्रिय बिरामी (Active Patients)</p>
                  <p className="text-2xl font-bold">{activePatients.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">कुल औषधि प्रकार (Medicine Types)</p>
                  <p className="text-2xl font-bold">{Object.keys(aggregateRequirements).length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">स्टक कम भएका औषधि (Low Stock)</p>
                  <p className="text-2xl font-bold">
                    {Object.values(aggregateRequirements).filter((a: any) => a.stock < a.totalRemaining).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Aggregate Stock View */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Database size={18} />
                कुल मौज्दात र आवश्यकता (Total Stock vs Requirement)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                    <th className="px-6 py-3 font-medium">औषधिको नाम (Medicine)</th>
                    <th className="px-6 py-3 font-medium">कुल आवश्यकता (Total Course)</th>
                    <th className="px-6 py-3 font-medium">बाँकी आवश्यकता (Remaining)</th>
                    <th className="px-6 py-3 font-medium">हालको मौज्दात (Current Stock)</th>
                    <th className="px-6 py-3 font-medium">अवस्था (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(aggregateRequirements).map(([name, data]: [string, any]) => {
                    const isShortage = data.stock < data.totalRemaining;
                    return (
                      <tr key={name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{name}</td>
                        <td className="px-6 py-4 text-gray-600">{data.totalNeeded}</td>
                        <td className="px-6 py-4 text-gray-600 font-semibold">{data.totalRemaining}</td>
                        <td className="px-6 py-4 text-gray-600">{data.stock}</td>
                        <td className="px-6 py-4">
                          {isShortage ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle size={12} />
                              अपुग (Shortage: {data.totalRemaining - data.stock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle size={12} />
                              पर्याप्त (Sufficient)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Patient-wise Detail View */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <User size={18} />
                बिरामी अनुसार औषधि विवरण (Patient-wise Requirement)
              </h3>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="खोज्नुहोस् (नाम वा ID)..." 
                    className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500/20 outline-none" 
                  />
                </div>
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border text-xs bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="All">सबै (All)</option>
                  <option value="Active">सक्रिय (Active)</option>
                  <option value="Completed">पूरा भएको (Completed)</option>
                  <option value="Transfer Out">ट्रान्सफर (Transfer Out)</option>
                  <option value="Died">मृत्यु (Died)</option>
                  <option value="Loss to Follow-up">सम्पर्क विच्छेद (Loss to Follow-up)</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                    <th className="px-6 py-3 font-medium">बिरामीको नाम (Patient)</th>
                    <th className="px-6 py-3 font-medium">सेवा (Service)</th>
                    <th className="px-6 py-3 font-medium">तौल (Weight)</th>
                    <th className="px-6 py-3 font-medium">अवस्था (Status)</th>
                    <th className="px-6 py-3 font-medium">दैनिक मात्रा (Daily Dose)</th>
                    <th className="px-6 py-3 font-medium">बाँकी औषधि (Remaining)</th>
                    <th className="px-6 py-3 font-medium text-right">कार्य (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patientRequirements.map(({ patient, requirements }) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{patient.name}</div>
                        <div className="text-xs text-gray-500">ID: {patient.patientId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${patient.serviceType === 'TB' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {patient.serviceType} {patient.leprosyType ? `(${patient.leprosyType})` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{patient.weight || '-'} kg</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            (patient.status === 'Active' || !patient.status) ? 'bg-green-50 text-green-700 border-green-200' : 
                            patient.status === 'Transfer Out' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            patient.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                            {patient.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(patient.status === 'Active' || !patient.status) ? requirements.map(r => (
                          <div key={r.itemName} className="text-sm">
                            {r.itemName}: <span className="font-semibold">{r.dailyQuantity}</span>
                          </div>
                        )) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        {(patient.status === 'Active' || !patient.status) ? requirements.map(r => {
                          const futureNeeded = Math.max(0, r.remainingNeeded - r.dailyQuantity);
                          const todayNeeded = r.remainingNeeded > 0 ? r.dailyQuantity : 0;
                          
                          return (
                            <div key={r.itemName} className="text-sm mb-1 last:mb-0">
                              <div className="font-medium text-gray-700">{r.itemName}:</div>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-blue-600 font-bold">{todayNeeded} (आज)</span>
                                <span className="text-gray-400">+</span>
                                <span className="text-gray-600">{futureNeeded} (बाँकी)</span>
                                <span className="text-gray-400">=</span>
                                <span className="font-bold text-gray-900">{r.remainingNeeded}</span>
                              </div>
                            </div>
                          );
                        }) : (
                          <span className="text-slate-300 font-nepali">सक्रिय छैन (Not Active)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(patient.id, patient.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Patient"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
        <Info className="text-blue-600 shrink-0" size={20} />
        <p className="text-sm text-blue-800">
          <strong>नोट:</strong> यो गणना बिरामीको तौल र उपचारको अवस्था (Completed Schedule) को आधारमा गरिएको हो। 
          मौज्दात गणना गर्दा सबै गोदामहरूको डाटालाई औषधि नामको आधारमा मिलान (Fuzzy Match) गरिएको छ।
        </p>
      </div>
    </div>
  );
};
