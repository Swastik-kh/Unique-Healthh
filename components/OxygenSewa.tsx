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
    issuedBy: currentUser?.fullName || currentUser?.username || '',
    invoiceNo: `OXY-INV-${Date.now().toString().slice(-6)}`,
    serviceFee: 1000,
    returnCondition: '',
    remarks: ''
  });

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningDist, setReturningDist] = useState<OxygenDistributionRecord | null>(null);
  const [returnConditionForm, setReturnConditionForm] = useState('Empty (खाली)');
  const [returnDateForm, setReturnDateForm] = useState(new NepaliDate().format('YYYY-MM-DD'));

  // Invoice Print Modal State
  const [printingDist, setPrintingDist] = useState<OxygenDistributionRecord | null>(null);

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
        (d.patientPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.invoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase());
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

  // Available Cylinders for Distribution (Only Full / available, excluding empty or currently in use)
  const availableCylindersForDist = useMemo(() => {
    return cylinders.filter(c => {
      if (editingDist && editingDist.cylinderNo === c.cylinderNo) return true;
      const status = c.status || '';
      const isFull = status.includes('Full') || status.includes('भरिएको');
      const isEmpty = status.includes('Empty') || status.includes('खाली');
      const isInUse = status.includes('In Use') || status.includes('प्रयोगमा');
      const isMaint = status.includes('Maintenance') || status.includes('मर्मतमा');
      return isFull && !isEmpty && !isInUse && !isMaint;
    });
  }, [cylinders, editingDist]);

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
      issuedBy: distForm.issuedBy || currentUser?.fullName || currentUser?.username || 'Admin',
      invoiceNo: distForm.invoiceNo || `OXY-INV-${Date.now().toString().slice(-6)}`,
      serviceFee: distForm.serviceFee !== undefined ? Number(distForm.serviceFee) : 1000,
      returnCondition: distForm.returnCondition || '',
      remarks: distForm.remarks || '',
      _orgName: activeOrgName
    };

    const success = await onSaveDistribution(record);
    if (success) {
      // Automatically update corresponding cylinder status and location
      const targetCylinder = cylinders.find(c => c.cylinderNo === record.cylinderNo);
      if (targetCylinder) {
        let newCylStatus = targetCylinder.status;
        let newLocation = targetCylinder.location;
        if (record.status.includes('Issued') || record.status.includes('वितरण गरिएको')) {
          newCylStatus = 'In Use (प्रयोगमा)';
          newLocation = `वितरित - ${record.patientName} (${record.wardOrDept})`;
        } else if (record.status.includes('Returned') || record.status.includes('फिर्ता आएको')) {
          newCylStatus = record.returnCondition || 'Empty (खाली)';
          newLocation = 'मुख्य स्टोर';
        }
        await onSaveCylinder({
          ...targetCylinder,
          status: newCylStatus,
          location: newLocation
        });
      }

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
        issuedBy: currentUser?.fullName || currentUser?.username || '',
        invoiceNo: `OXY-INV-${Date.now().toString().slice(-6)}`,
        serviceFee: 1000,
        returnCondition: '',
        remarks: ''
      });
    }
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningDist) return;

    const updated: OxygenDistributionRecord = {
      ...returningDist,
      status: 'Returned (फिर्ता आएको)',
      returnDateBs: returnDateForm,
      returnCondition: returnConditionForm
    };

    const success = await onSaveDistribution(updated);
    if (success) {
      const targetCylinder = cylinders.find(c => c.cylinderNo === returningDist.cylinderNo);
      if (targetCylinder) {
        await onSaveCylinder({
          ...targetCylinder,
          status: returnConditionForm,
          location: 'मुख्य स्टोर'
        });
      }
      setIsReturnModalOpen(false);
      setReturningDist(null);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto font-nepali">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-cyan-500/25 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-500/20 border border-cyan-400/30 rounded-2xl text-cyan-300 shadow-inner">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide flex items-center gap-2">
              अक्सिजन सेवा व्यवस्थापन (Oxygen Service)
            </h1>
            <p className="text-cyan-200/80 text-sm mt-0.5">
              अक्सिजन सिलिन्डर स्थिति रेकर्ड, वितरण लग, इनभ्वाइस तथा सेवा शुल्क व्यवस्थापन प्रणाली
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/10 p-1 rounded-xl border border-white/15">
            <button
              onClick={() => { setActiveTab('status'); setSearchTerm(''); setStatusFilter('all'); }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${activeTab === 'status' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200 hover:text-white'}`}
            >
              सिलिन्डर स्थिति (Cylinders)
            </button>
            <button
              onClick={() => { setActiveTab('distribution'); setSearchTerm(''); setStatusFilter('all'); }}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer ${activeTab === 'distribution' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-200 hover:text-white'}`}
            >
              वितरण लग (Distribution Log)
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:hidden">
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'status' ? "सिलिन्डर नम्बर वा स्थान खोज्नुहोस्..." : "बिरामी, इनभ्वाइस वा सिलिन्डर खोज्नुहोस्..."}
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
                  wardOrDept: 'आपतकालीन (Emergency)',
                  issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
                  returnDateBs: '',
                  status: 'Issued (वितरण गरिएको)',
                  issuedBy: currentUser?.fullName || currentUser?.username || '',
                  invoiceNo: `OXY-INV-${Date.now().toString().slice(-6)}`,
                  serviceFee: 1000,
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
                  <th className="p-3">टिप्पणी</th>
                  <th className="p-3 text-center print:hidden">कार्य</th>
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
                      <td className="p-3 text-center print:hidden">
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
                  <th className="p-3">इनभ्वाइस नं.</th>
                  <th className="p-3">वितरण मिति (BS)</th>
                  <th className="p-3">सिलिन्डर नम्बर</th>
                  <th className="p-3">बिरामीको नाम</th>
                  <th className="p-3">सम्पर्क नं.</th>
                  <th className="p-3">वार्ड / विभाग</th>
                  <th className="p-3 text-center">सेवा शुल्क (रु)</th>
                  <th className="p-3">स्थिति</th>
                  <th className="p-3">फिर्ता मिति</th>
                  <th className="p-3">वितरण गर्ने</th>
                  <th className="p-3 text-center print:hidden">कार्य / इनभ्वाइस</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-slate-400">
                      कुनै अक्सिजन वितरण लग फेला परेन।
                    </td>
                  </tr>
                ) : (
                  filteredDistributions.map((dist, idx) => (
                    <tr key={dist.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-900 text-xs">{dist.invoiceNo || `OXY-${dist.id.slice(-6)}`}</td>
                      <td className="p-3 font-mono text-slate-700 text-xs">{dist.issuedDateBs}</td>
                      <td className="p-3 font-bold text-cyan-900 font-mono">{dist.cylinderNo}</td>
                      <td className="p-3 font-semibold text-slate-800">{dist.patientName}</td>
                      <td className="p-3 font-mono text-slate-600 text-xs">{dist.patientPhone || '-'}</td>
                      <td className="p-3 text-slate-700">{dist.wardOrDept}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">Rs. {dist.serviceFee ?? 1000}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 w-fit ${
                            dist.status?.includes('Issued') || dist.status?.includes('वितरण गरिएको') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {dist.status}
                          </span>
                          {dist.returnCondition && (
                            <span className="text-[11px] text-slate-600 font-medium">
                              अवस्था: <span className="font-bold text-cyan-900">{dist.returnCondition}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 text-xs">{dist.returnDateBs || '-'}</td>
                      <td className="p-3 text-slate-600 text-xs">{dist.issuedBy || '-'}</td>
                      <td className="p-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setPrintingDist(dist)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                            title="इनभ्वाइस प्रिन्ट गर्नुहोस्"
                          >
                            <Printer size={13} /> बिल प्रिन्ट
                          </button>
                          {(dist.status?.includes('Issued') || dist.status?.includes('वितरण गरिएको')) && (
                            <button
                              onClick={() => {
                                setReturningDist(dist);
                                setReturnConditionForm('Empty (खाली)');
                                setReturnDateForm(new NepaliDate().format('YYYY-MM-DD'));
                                setIsReturnModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors"
                              title="फिर्ता भयो भनी चिन्ह लगाउनुहोस्"
                            >
                              फिर्ता भयो
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingDist(dist);
                              setDistForm({
                                ...dist,
                                serviceFee: dist.serviceFee ?? 1000,
                                issuedBy: dist.issuedBy || currentUser?.fullName || currentUser?.username || ''
                              });
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
                <Activity size={20} /> {editingCylinder ? 'सिलिन्डर विवरण सम्पादन गर्नुहोस्' : 'नयाँ सिलिन्डर थप्नुहोस्'}
              </h3>
              <button onClick={() => setIsCylinderModalOpen(false)} className="text-cyan-200 hover:text-white cursor-pointer">
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <NepaliDatePicker
                  label="पछिल्लो भरिएको मिति (BS)"
                  value={cylinderForm.lastRefilledDateBs || ''}
                  onChange={(val) => setCylinderForm({ ...cylinderForm, lastRefilledDateBs: val })}
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
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
              <button onClick={() => setIsDistModalOpen(false)} className="text-cyan-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDistSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">इनभ्वाइस नम्बर (Invoice No) *</label>
                  <input
                    type="text"
                    required
                    value={distForm.invoiceNo || ''}
                    onChange={(e) => setDistForm({ ...distForm, invoiceNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono font-bold text-indigo-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">सिलिन्डर नम्बर (Cylinder No) *</label>
                  <select
                    value={distForm.cylinderNo || ''}
                    onChange={(e) => setDistForm({ ...distForm, cylinderNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white font-mono"
                  >
                    <option value="">-- सिलिन्डर छान्नुहोस् --</option>
                    {availableCylindersForDist.map(c => (
                      <option key={c.id} value={c.cylinderNo}>
                        {c.cylinderNo} ({c.size} - {c.status})
                      </option>
                    ))}
                  </select>
                </div>
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

              {distForm.status === 'Returned (फिर्ता आएको)' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">फिर्ता हुँदा सिलिन्डरको अवस्था (Return Condition) *</label>
                  <select
                    value={distForm.returnCondition || 'Empty (खाली)'}
                    onChange={(e) => setDistForm({ ...distForm, returnCondition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white font-bold text-emerald-800"
                  >
                    <option value="Full (भरिएको)">Full (भरिएको)</option>
                    <option value="Empty (खाली)">Empty (खाली)</option>
                    <option value="In Use (प्रयोगमा)">In Use (प्रयोगमा)</option>
                    <option value="Maintenance (मर्मतमा)">Maintenance (मर्मतमा)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <NepaliDatePicker
                  label="वितरण मिति (BS) *"
                  required
                  value={distForm.issuedDateBs || ''}
                  onChange={(val) => setDistForm({ ...distForm, issuedDateBs: val })}
                />
                <NepaliDatePicker
                  label="फिर्ता मिति (BS)"
                  value={distForm.returnDateBs || ''}
                  onChange={(val) => setDistForm({ ...distForm, returnDateBs: val })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">सेवा शुल्क (रु.) *</label>
                  <input
                    type="number"
                    required
                    value={distForm.serviceFee ?? 1000}
                    onChange={(e) => setDistForm({ ...distForm, serviceFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">वितरण गर्ने कर्मचारी *</label>
                  <input
                    type="text"
                    required
                    value={distForm.issuedBy || currentUser?.fullName || currentUser?.username || ''}
                    onChange={(e) => setDistForm({ ...distForm, issuedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {printingDist && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
            {/* Modal Header controls (Hidden during print) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Printer size={20} /> अक्सिजन सेवा इनभ्वाइस / बिल प्रिन्ट
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={16} /> प्रिन्ट गर्नुहोस्
                </button>
                <button onClick={() => setPrintingDist(null)} className="text-slate-300 hover:text-white cursor-pointer p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Invoice Body */}
            <div className="p-8 space-y-6 print:p-6 text-slate-800 bg-white">
              {/* Organization Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                <div className="w-20">
                  <LogoDisplay settings={generalSettings} width={75} height={75} />
                </div>
                <div className="text-center flex-1 px-4">
                  <h2 className="text-xl font-black text-slate-900 tracking-wide font-nepali">
                    {generalSettings?.organizationName || activeOrgName || 'स्वास्थ्य संस्था'}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">{generalSettings?.address || 'नेपाल'}</p>
                  <p className="text-xs text-cyan-800 font-bold mt-1">अक्सिजन सिलिन्डर वितरण तथा सेवा शुल्क इनभ्वाइस</p>
                </div>
                <div className="text-right text-xs font-mono text-slate-600">
                  <p className="font-bold">आर्थिक वर्ष: {currentFiscalYear}</p>
                  <p className="text-indigo-900 font-black text-sm mt-1">बिल नं: {printingDist.invoiceNo || 'N/A'}</p>
                </div>
              </div>

              {/* Patient & Distribution Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">बिरामीको विवरण:</p>
                  <p className="font-bold text-slate-900 text-base mt-1">{printingDist.patientName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">सम्पर्क नं: <span className="font-mono">{printingDist.patientPhone || 'उपलब्ध छैन'}</span></p>
                  <p className="text-xs text-slate-600 mt-0.5">वार्ड / विभाग: <span className="font-semibold">{printingDist.wardOrDept}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase">वितरण विवरण:</p>
                  <p className="text-xs text-slate-700 mt-1">वितरण मिति (BS): <span className="font-mono font-bold">{printingDist.issuedDateBs}</span></p>
                  <p className="text-xs text-slate-700 mt-0.5">फिर्ता मिति (BS): <span className="font-mono">{printingDist.returnDateBs || 'हाल फिर्ता भएको छैन'}</span></p>
                  <p className="text-xs text-slate-700 mt-0.5">वितरण गर्ने: <span className="font-semibold">{printingDist.issuedBy || 'Admin'}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 text-xs font-bold">
                    <th className="p-2.5 text-center w-12">क्र.सं.</th>
                    <th className="p-2.5 text-left">विवरण (Description)</th>
                    <th className="p-2.5 text-center">सिलिन्डर नम्बर</th>
                    <th className="p-2.5 text-center">स्थिति</th>
                    <th className="p-2.5 text-right">रकम (रु.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 text-center font-mono text-xs">1</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">अक्सिजन सिलिन्डर वितरण तथा सेवा शुल्क</p>
                      <p className="text-xs text-slate-500">Oxygen Cylinder Rental & Refill Service Fee</p>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-cyan-900">{printingDist.cylinderNo}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-bold">
                        {printingDist.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">Rs. {printingDist.serviceFee ?? 1000}.00</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-bold bg-slate-50">
                    <td colSpan={4} className="p-3 text-right">जम्मा सेवा शुल्क (Total Fee):</td>
                    <td className="p-3 text-right font-mono text-base text-slate-900">Rs. {printingDist.serviceFee ?? 1000}.00</td>
                  </tr>
                </tfoot>
              </table>

              {/* Remarks */}
              {printingDist.remarks && (
                <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold">विशेष टिप्पणी:</span> {printingDist.remarks}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-xs">
                <div className="text-center border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">बुझिलιє/बिरामीको सही</p>
                  <p className="text-slate-500 mt-0.5">Patient / Receiver Signature</p>
                </div>
                <div className="text-center border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">अधिकृत कर्मचारीको सही</p>
                  <p className="text-slate-500 mt-0.5">Authorized Staff Signature ({printingDist.issuedBy || 'Admin'})</p>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions (Hidden during print) */}
            <div className="bg-slate-100 px-6 py-3 flex justify-end gap-3 border-t border-slate-200 print:hidden">
              <button
                onClick={() => setPrintingDist(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              >
                बन्द गर्नुहोस्
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer size={16} /> बिल प्रिन्ट गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && returningDist && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-cyan-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle2 size={20} /> सिलिन्डर फिर्ता दर्ता (Return Cylinder)
              </h3>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-cyan-200 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConfirmReturn} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p>सिलिन्डर नं: <span className="font-mono font-bold text-cyan-900">{returningDist.cylinderNo}</span></p>
                <p>बिरामी: <span className="font-semibold text-slate-800">{returningDist.patientName}</span></p>
                <p>वार्ड/विभाग: <span className="font-semibold text-slate-700">{returningDist.wardOrDept}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">फिर्ता हुँदा सिलिन्डरको अवस्था (Return Condition) *</label>
                <select
                  value={returnConditionForm}
                  onChange={(e) => setReturnConditionForm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white font-bold text-emerald-800"
                >
                  <option value="Empty (खाली)">Empty (खाली)</option>
                  <option value="Full (भरिएको)">Full (भरिएको)</option>
                  <option value="Maintenance (मर्मतमा)">Maintenance (मर्मतमा)</option>
                  <option value="In Use (प्रयोगमा)">In Use (प्रयोगमा)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">यसले मुख्य सिलिन्डर सूचीमा सोही अनुसार स्थिति (Status) अपडेट गर्नेछ र स्थान मुख्य स्टोरमा फिर्ता गर्नेछ।</p>
              </div>

              <NepaliDatePicker
                label="फिर्ता मिति (BS) *"
                required
                value={returnDateForm}
                onChange={(val) => setReturnDateForm(val)}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  फिर्ता सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
