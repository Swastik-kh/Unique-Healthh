import React, { useState, useMemo } from 'react';
import { OxygenCylinderRecord, OxygenDistributionRecord, User, OrganizationSettings } from '../types';
import { Plus, Search, Edit2, Trash2, Calendar, User as UserIcon, Phone, MapPin, Activity, CheckCircle2, X, Eye, Tag, AlertCircle, RefreshCw, Printer, Wrench } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { LogoDisplay } from './LogoDisplay';

interface OxygenSewaProps {
  cylinders: OxygenCylinderRecord[];
  distributionRecords: OxygenDistributionRecord[];
  currentUser?: User | null;
  onSaveCylinder: (record: OxygenCylinderRecord) => Promise<boolean>;
  onDeleteCylinder: (id: string) => void;
  onSaveDistribution: (record: OxygenDistributionRecord) => Promise<boolean>;
  onDeleteDistribution: (id: string) => void;
  currentFiscalYear: string;
  generalSettings?: OrganizationSettings;
  activeOrgName: string;
}

export const OxygenSewa: React.FC<OxygenSewaProps> = ({
  cylinders = [],
  distributionRecords = [],
  currentUser,
  onSaveCylinder,
  onDeleteCylinder,
  onSaveDistribution,
  onDeleteDistribution,
  currentFiscalYear,
  generalSettings,
  activeOrgName
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'distribution'>('status');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Cylinder Modal State
  const [isCylinderModalOpen, setIsCylinderModalOpen] = useState(false);
  const [editingCylinder, setEditingCylinder] = useState<OxygenCylinderRecord | null>(null);
  const [cylinderForm, setCylinderForm] = useState<Partial<OxygenCylinderRecord>>({
    cylinderNo: '',
    size: 'Jumbo',
    status: 'Full (भरिएको)',
    location: 'मुख्य स्टोर',
    lastRefilledDateBs: new NepaliDate().format('YYYY-MM-DD'),
    pressurePsi: 1500,
    remarks: ''
  });

  // Distribution Modal State
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [editingDist, setEditingDist] = useState<OxygenDistributionRecord | null>(null);
  const [distForm, setDistForm] = useState<Partial<OxygenDistributionRecord>>({
    cylinderNo: '',
    patientName: '',
    patientPhone: '',
    wardOrDept: 'आपतकालीन (Emergency)',
    issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
    returnDateBs: '',
    status: 'Issued (वितरण गरिएको)',
    issuedBy: currentUser?.name || '',
    remarks: ''
  });

  // Filtered Cylinders
  const filteredCylinders = useMemo(() => {
    return cylinders.filter(c => {
      const matchesSearch = 
        (c.cylinderNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.remarks || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cylinders, searchTerm, statusFilter]);

  // Filtered Distributions
  const filteredDistributions = useMemo(() => {
    return distributionRecords.filter(d => {
      const matchesSearch = 
        (d.cylinderNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.wardOrDept || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.patientPhone || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [distributionRecords, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = cylinders.length;
    const full = cylinders.filter(c => c.status?.includes('Full') || c.status?.includes('भरिएको')).length;
    const empty = cylinders.filter(c => c.status?.includes('Empty') || c.status?.includes('खाली')).length;
    const inUse = cylinders.filter(c => c.status?.includes('In Use') || c.status?.includes('प्रयोगमा')).length;
    const maintenance = cylinders.filter(c => c.status?.includes('Maintenance') || c.status?.includes('मर्मतमा')).length;
    const activeIssued = distributionRecords.filter(d => d.status?.includes('Issued') || d.status?.includes('वितरण गरिएको')).length;
    return { total, full, empty, inUse, maintenance, activeIssued };
  }, [cylinders, distributionRecords]);

  // Handle Cylinder Save
  const handleSaveCylinderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cylinderForm.cylinderNo?.trim()) {
      alert('कृपया सिलिन्डर नम्बर (Cylinder No) प्रविष्ट गर्नुहोस्।');
      return;
    }
    const record: OxygenCylinderRecord = {
      id: editingCylinder ? editingCylinder.id : 'cyl_' + Date.now(),
      cylinderNo: cylinderForm.cylinderNo.trim(),
      size: cylinderForm.size || 'Jumbo',
      status: cylinderForm.status || 'Full (भरिएको)',
      location: cylinderForm.location || 'मुख्य स्टोर',
      lastRefilledDateBs: cylinderForm.lastRefilledDateBs || new NepaliDate().format('YYYY-MM-DD'),
      pressurePsi: Number(cylinderForm.pressurePsi) || 0,
      remarks: cylinderForm.remarks || '',
      _orgName: activeOrgName
    };

    const success = await onSaveCylinder(record);
    if (success) {
      setIsCylinderModalOpen(false);
      setEditingCylinder(null);
      setCylinderForm({
        cylinderNo: '',
        size: 'Jumbo',
        status: 'Full (भरिएको)',
        location: 'मुख्य स्टोर',
        lastRefilledDateBs: new NepaliDate().format('YYYY-MM-DD'),
        pressurePsi: 1500,
        remarks: ''
      });
    }
  };

  // Handle Distribution Save
  const handleSaveDistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distForm.cylinderNo?.trim() || !distForm.patientName?.trim()) {
      alert('कृपया सिलिन्डर नम्बर र बिरामीको नाम प्रविष्ट गर्नुहोस्।');
      return;
    }
    const record: OxygenDistributionRecord = {
      id: editingDist ? editingDist.id : 'dist_' + Date.now(),
      cylinderId: distForm.cylinderId || '',
      cylinderNo: distForm.cylinderNo.trim(),
      patientName: distForm.patientName.trim(),
      patientPhone: distForm.patientPhone || '',
      wardOrDept: distForm.wardOrDept || 'आपतकालीन',
      issuedDateBs: distForm.issuedDateBs || new NepaliDate().format('YYYY-MM-DD'),
      returnDateBs: distForm.returnDateBs || '',
      status: distForm.status || 'Issued (वितरण गरिएको)',
      issuedBy: distForm.issuedBy || currentUser?.name || 'Admin',
      remarks: distForm.remarks || '',
      _orgName: activeOrgName
    };

    const success = await onSaveDistribution(record);
    if (success) {
      setIsDistModalOpen(false);
      setEditingDist(null);
      setDistForm({
        cylinderNo: '',
        patientName: '',
        patientPhone: '',
        wardOrDept: 'आपतकालीन (Emergency)',
        issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
        returnDateBs: '',
        status: 'Issued (वितरण गरिएको)',
        issuedBy: currentUser?.name || '',
        remarks: ''
      });
    }
  };

  const handleMarkAsReturned = async (dist: OxygenDistributionRecord) => {
    const today = new NepaliDate().format('YYYY-MM-DD');
    const updated: OxygenDistributionRecord = {
      ...dist,
      status: 'Returned (फिर्ता आएको)',
      returnDateBs: today
    };
    await onSaveDistribution(updated);
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto font-nepali">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-cyan-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-500/20 border border-cyan-400/30 rounded-2xl text-cyan-300 shadow-inner">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide flex items-center gap-2">
              अक्सिजन सेवा व्यवस्थापन (Oxygen Service)
            </h1>
            <p className="text-cyan-200/80 text-sm mt-0.5">
              अक्सिजन सिलिन्डर स्थिति रेकर्ड र वितरण लग व्यवस्थापन प्रणाली
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/10 p-1 rounded-xl border border-white/15">
            <button
              onClick={() => { setActiveTab('status'); setSearchTerm(''); setStatusFilter('all'); }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'status' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200 hover:text-white'}`}
            >
              सिलिन्डर स्थिति (Cylinders)
            </button>
            <button
              onClick={() => { setActiveTab('distribution'); setSearchTerm(''); setStatusFilter('all'); }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'distribution' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200 hover:text-white'}`}
            >
              वितरण लग (Distribution Log)
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-cyan-300 transition-all">
          <span className="text-xs font-bold text-slate-500 uppercase">जम्मा सिलिन्डर</span>
          <span className="text-2xl font-black text-slate-800 mt-2">{stats.total}</span>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-700 uppercase">भरिएको (Full)</span>
          <span className="text-2xl font-black text-emerald-800 mt-2">{stats.full}</span>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-rose-700 uppercase">खाली (Empty)</span>
          <span className="text-2xl font-black text-rose-800 mt-2">{stats.empty}</span>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-700 uppercase">प्रयोगमा (In Use)</span>
          <span className="text-2xl font-black text-blue-800 mt-2">{stats.inUse}</span>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-700 uppercase">मर्मतमा (Maint.)</span>
          <span className="text-2xl font-black text-amber-800 mt-2">{stats.maintenance}</span>
        </div>
        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-indigo-700 uppercase">हाल वितरण गरिएको</span>
          <span className="text-2xl font-black text-indigo-800 mt-2">{stats.activeIssued}</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'status' ? "सिलिन्डर नम्बर वा स्थान खोज्नुहोस्..." : "बिरामी वा सिलिन्डर खोज्नुहोस्..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
          >
            <option value="all">सबै स्थिति (All Status)</option>
            {activeTab === 'status' ? (
              <>
                <option value="Full (भरिएको)">Full (भरिएको)</option>
                <option value="Empty (खाली)">Empty (खाली)</option>
                <option value="In Use (प्रयोगमा)">In Use (प्रयोगमा)</option>
                <option value="Maintenance (मर्मतमा)">Maintenance (मर्मतमा)</option>
              </>
            ) : (
              <>
                <option value="Issued (वितरण गरिएको)">Issued (वितरण गरिएको)</option>
                <option value="Returned (फिर्ता आएको)">Returned (फिर्ता आएको)</option>
              </>
            )}
          </select>
        </div>

        <div>
          {activeTab === 'status' ? (
            <button
              onClick={() => {
                setEditingCylinder(null);
                setCylinderForm({
                  cylinderNo: '',
                  size: 'Jumbo',
                  status: 'Full (भरिएको)',
                  location: 'मुख्य स्टोर',
                  lastRefilledDateBs: new NepaliDate().format('YYYY-MM-DD'),
                  pressurePsi: 1500,
                  remarks: ''
                });
                setIsCylinderModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={18} /> नयाँ सिलिन्डर थप्नुहोस्
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingDist(null);
                setDistForm({
                  cylinderNo: '',
                  patientName: '',
                  patientPhone: '',
                  wardOrDept: 'आपतकालीन',
                  issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
                  returnDateBs: '',
                  status: 'Issued (वितरण गरिएको)',
                  issuedBy: currentUser?.name || 'Admin',
                  remarks: ''
                });
                setIsDistModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={18} /> सिलिन्डर वितरण रेकर्ड गर्नुहोस्
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'status' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <th className="p-3 text-center">क्र.सं.</th>
                  <th className="p-3">सिलिन्डर नम्बर</th>
                  <th className="p-3">साइज (Size)</th>
                  <th className="p-3">स्थिति (Status)</th>
                  <th className="p-3">हालको स्थान</th>
                  <th className="p-3">पछिल्लो भरिएको मिति (BS)</th>
                  <th className="p-3 text-center">प्रेसर (PSI)</th>
                  <th className="p-3">सकैयता / टिप्पणी</th>
                  <th className="p-3 text-center">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCylinders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      कुनै सिलिन्डर रेकर्ड फेला परेन।
                    </td>
                  </tr>
                ) : (
                  filteredCylinders.map((cyl, idx) => (
                    <tr key={cyl.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-bold text-cyan-900 font-mono">{cyl.cylinderNo}</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">{cyl.size}</span></td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          cyl.status?.includes('Full') || cyl.status?.includes('भरिएको') ? 'bg-emerald-100 text-emerald-800' :
                          cyl.status?.includes('Empty') || cyl.status?.includes('खाली') ? 'bg-rose-100 text-rose-800' :
                          cyl.status?.includes('In Use') || cyl.status?.includes('प्रयोगमा') ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {cyl.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{cyl.location}</td>
                      <td className="p-3 text-slate-600 font-mono text-xs">{cyl.lastRefilledDateBs || '-'}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">{cyl.pressurePsi !== undefined ? `${cyl.pressurePsi} PSI` : '-'}</td>
                      <td className="p-3 text-slate-500 text-xs">{cyl.remarks || '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCylinder(cyl);
                              setCylinderForm(cyl);
                              setIsCylinderModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`के तपाईँ सिलिन्डर "${cyl.cylinderNo}" मेटाउन चाहनुहुन्छ?`)) {
                                onDeleteCylinder(cyl.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="मेटाउनुहोस्"
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
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-xs font-bold border-b border-slate-200">
                  <th className="p-3 text-center">क्र.सं.</th>
                  <th className="p-3">वितरण मिति (BS)</th>
                  <th className="p-3">सिलिन्डर नम्बर</th>
                  <th className="p-3">बिरामीको नाम</th>
                  <th className="p-3">सम्पर्क नं.</th>
                  <th className="p-3">वार्ड / विभाग</th>
                  <th className="p-3">स्थिति</th>
                  <th className="p-3">फिर्ता मिति</th>
                  <th className="p-3">वितरण गर्ने</th>
                  <th className="p-3 text-center">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      कुनै अक्सिजन वितरण लग फेला परेन।
                    </td>
                  </tr>
                ) : (
                  filteredDistributions.map((dist, idx) => (
                    <tr key={dist.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-700 text-xs">{dist.issuedDateBs}</td>
                      <td className="p-3 font-bold text-cyan-900 font-mono">{dist.cylinderNo}</td>
                      <td className="p-3 font-semibold text-slate-800">{dist.patientName}</td>
                      <td className="p-3 font-mono text-slate-600 text-xs">{dist.patientPhone || '-'}</td>
                      <td className="p-3 text-slate-700">{dist.wardOrDept}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          dist.status?.includes('Issued') || dist.status?.includes('वितरण गरिएको') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {dist.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-xs">{dist.returnDateBs || '-'}</td>
                      <td className="p-3 text-slate-600 text-xs">{dist.issuedBy || '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(dist.status?.includes('Issued') || dist.status?.includes('वितरण गरिएको')) && (
                            <button
                              onClick={() => handleMarkAsReturned(dist)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors"
                              title="फिर्ता भयो भनी चिन्ह लगाउनुहोस्"
                            >
                              फिर्ता भयो
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingDist(dist);
                              setDistForm(dist);
                              setIsDistModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`के तपाईँ यो वितरण रेकर्ड मेटाउन चाहनुहुन्छ?`)) {
                                onDeleteDistribution(dist.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="मेटाउनुहोस्"
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
      )}

      {/* Cylinder Modal */}
      {isCylinderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-cyan-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Activity size={20} /> {editingCylinder ? 'सिलिन्डर विवरण सम्पादन गर्नुहोस्' : 'न नयाँ सिलिन्डर थप्नुहोस्'}
              </h3>
              <button onClick={() => setIsCylinderModalOpen(false)} className="text-cyan-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCylinderSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">सिलिन्डर नम्बर (Cylinder No) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. CYL-001"
                  value={cylinderForm.cylinderNo || ''}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, cylinderNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">साइज (Size)</label>
                  <select
                    value={cylinderForm.size || 'Jumbo'}
                    onChange={(e) => setCylinderForm({ ...cylinderForm, size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
                  >
                    <option value="Jumbo">Jumbo (ठूलो)</option>
                    <option value="Medium">Medium (मध्यम)</option>
                    <option value="Small">Small (सानो)</option>
                    <option value="D-Type">D-Type</option>
                    <option value="B-Type">B-Type</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">स्थिति (Status)</label>
                  <select
                    value={cylinderForm.status || 'Full (भरिएको)'}
                    onChange={(e) => setCylinderForm({ ...cylinderForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
                  >
                    <option value="Full (भरिएको)">Full (भरिएको)</option>
                    <option value="Empty (खाली)">Empty (खाली)</option>
                    <option value="In Use (प्रयोगमा)">In Use (प्रयोगमा)</option>
                    <option value="Maintenance (मर्मतमा)">Maintenance (मर्मतमा)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">हालको स्थान (Location)</label>
                  <input
                    type="text"
                    placeholder="उदा. मुख्य स्टोर, इमर्जेन्सी"
                    value={cylinderForm.location || ''}
                    onChange={(e) => setCylinderForm({ ...cylinderForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">प्रेसर PSI (Pressure)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={cylinderForm.pressurePsi ?? 1500}
                    onChange={(e) => setCylinderForm({ ...cylinderForm, pressurePsi: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">पछिल्लो भरिएको मिति (BS)</label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={cylinderForm.lastRefilledDateBs || ''}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, lastRefilledDateBs: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">टिप्पणी / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="थप विवरण..."
                  value={cylinderForm.remarks || ''}
                  onChange={(e) => setCylinderForm({ ...cylinderForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCylinderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
                >
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {isDistModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-cyan-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Activity size={20} /> {editingDist ? 'वितरण रेकर्ड सम्पादन गर्नुहोस्' : 'अक्सिजन सिलिन्डर वितरण रेकर्ड'}
              </h3>
              <button onClick={() => setIsDistModalOpen(false)} className="text-cyan-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDistSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">सिलिन्डर नम्बर (Cylinder No) *</label>
                <select
                  value={distForm.cylinderNo || ''}
                  onChange={(e) => setDistForm({ ...distForm, cylinderNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white font-mono"
                >
                  <option value="">-- सिलिन्डर छान्नुहोस् --</option>
                  {cylinders.map(c => (
                    <option key={c.id} value={c.cylinderNo}>
                      {c.cylinderNo} ({c.size} - {c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">बिरामीको नाम *</label>
                  <input
                    type="text"
                    required
                    placeholder="बिरामीको नाम"
                    value={distForm.patientName || ''}
                    onChange={(e) => setDistForm({ ...distForm, patientName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">सम्पर्क नम्बर</label>
                  <input
                    type="text"
                    placeholder="मोबाइल नं."
                    value={distForm.patientPhone || ''}
                    onChange={(e) => setDistForm({ ...distForm, patientPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">वार्ड / विभाग</label>
                  <input
                    type="text"
                    placeholder="उदा. इमर्जेन्सी / वार्ड ३"
                    value={distForm.wardOrDept || ''}
                    onChange={(e) => setDistForm({ ...distForm, wardOrDept: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">स्थिति (Status)</label>
                  <select
                    value={distForm.status || 'Issued (वितरण गरिएको)'}
                    onChange={(e) => setDistForm({ ...distForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
                  >
                    <option value="Issued (वितरण गरिएको)">Issued (वितरण गरिएको)</option>
                    <option value="Returned (फिर्ता आएको)">Returned (फिर्ता आएको)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">वितरण मिति (BS)</label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={distForm.issuedDateBs || ''}
                    onChange={(e) => setDistForm({ ...distForm, issuedDateBs: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">फिर्ता मिति (BS)</label>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={distForm.returnDateBs || ''}
                    onChange={(e) => setDistForm({ ...distForm, returnDateBs: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">वितरण गर्ने कर्मचारी</label>
                <input
                  type="text"
                  value={distForm.issuedBy || ''}
                  onChange={(e) => setDistForm({ ...distForm, issuedBy: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">टिप्पणी / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="थप विवरण..."
                  value={distForm.remarks || ''}
                  onChange={(e) => setDistForm({ ...distForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDistModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
                >
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
