import React, { useState, useMemo } from 'react';
import { OxygenCylinderRecord, OxygenDistributionRecord, User, OrganizationSettings } from '../types';
import { Plus, Search, Edit2, Trash2, Calendar, User as UserIcon, Phone, MapPin, Activity, CheckCircle2, X, Eye, Tag, AlertCircle, RefreshCw, Printer, Wrench } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { LogoDisplay } from './LogoDisplay';
import { FISCAL_YEARS } from '../constants';
import { toNepaliNumber } from './nepaliUtils';

const NEPALI_MONTH_OPTIONS = [
  { value: 'all', label: 'सबै महिना (All Months)', name: 'वार्षिक / सबै महिना' },
  { value: '04', label: 'श्रावण (Shrawan)', name: 'श्रावण' },
  { value: '05', label: 'भाद्र (Bhadra)', name: 'भाद्र' },
  { value: '06', label: 'असोज (Ashwin)', name: 'असोज' },
  { value: '07', label: 'कार्तिक (Kartik)', name: 'कार्तिक' },
  { value: '08', label: 'मंसिर (Mangsir)', name: 'मंसिर' },
  { value: '09', label: 'पुष (Poush)', name: 'पुष' },
  { value: '10', label: 'माघ (Magh)', name: 'माघ' },
  { value: '11', label: 'फागुन (Falgun)', name: 'फागुन' },
  { value: '12', label: 'चैत्र (Chaitra)', name: 'चैत्र' },
  { value: '01', label: 'बैशाख (Baisakh)', name: 'बैशाख' },
  { value: '02', label: 'जेठ (Jestha)', name: 'जेठ' },
  { value: '03', label: 'असार (Ashadh)', name: 'असार' },
];

const extractFyFromDate = (dateBs?: string): string => {
  if (!dateBs) return '';
  const cleaned = dateBs.replace(/\//g, '-');
  const parts = cleaned.split('-');
  if (parts.length >= 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(y) && !isNaN(m)) {
      if (m >= 4) {
        return `${y}/${(y + 1).toString().slice(-3)}`;
      } else {
        return `${y - 1}/${y.toString().slice(-3)}`;
      }
    }
  }
  return '';
};

const extractMonthFromDate = (dateBs?: string): string => {
  if (!dateBs) return '';
  const cleaned = dateBs.replace(/\//g, '-');
  const parts = cleaned.split('-');
  if (parts.length >= 2) {
    let m = parts[1].trim();
    if (m.length === 1) m = '0' + m;
    return m;
  }
  return '';
};

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
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentFiscalYear || '2081/082');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

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
    wardOrDept: '',
    issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
    returnDateBs: '',
    status: 'Issued (वितरण गरिएको)',
    issuedBy: currentUser?.fullName || currentUser?.username || '',
    invoiceNo: `OXY-INV-${Date.now().toString().slice(-6)}`,
    serviceFee: 1000,
    receivedAmount: 1000,
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

  // Log Print Modal State
  const [isLogPrintModalOpen, setIsLogPrintModalOpen] = useState(false);

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

      // Fiscal Year matching
      let matchesFy = true;
      if (selectedFiscalYear !== 'all') {
        const recordFy = (d as any).fiscalYear || extractFyFromDate(d.issuedDateBs);
        if (recordFy) {
          const normRecordFy = recordFy.replace(/\//g, '-');
          const normSelectedFy = selectedFiscalYear.replace(/\//g, '-');
          matchesFy = normRecordFy === normSelectedFy;
        }
      }

      // Month matching based on issuedDateBs (वितरण गरिएको मिति)
      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const recordMonth = extractMonthFromDate(d.issuedDateBs);
        matchesMonth = recordMonth === selectedMonth;
      }

      return matchesSearch && matchesStatus && matchesFy && matchesMonth;
    });
  }, [distributionRecords, searchTerm, statusFilter, selectedFiscalYear, selectedMonth]);

  // Statistics
  const stats = useMemo(() => {
    const total = cylinders.length;
    const totalList = cylinders.map(c => c.cylinderNo).filter(Boolean);

    const fullCylinders = cylinders.filter(c => c.status?.includes('Full') || c.status?.includes('भरिएको'));
    const full = fullCylinders.length;
    const fullList = fullCylinders.map(c => c.cylinderNo).filter(Boolean);

    const emptyCylinders = cylinders.filter(c => c.status?.includes('Empty') || c.status?.includes('खाली'));
    const empty = emptyCylinders.length;
    const emptyList = emptyCylinders.map(c => c.cylinderNo).filter(Boolean);

    const inUseCylinders = cylinders.filter(c => c.status?.includes('In Use') || c.status?.includes('प्रयोगमा'));
    const inUse = inUseCylinders.length;
    const inUseList = inUseCylinders.map(c => c.cylinderNo).filter(Boolean);

    const maintenanceCylinders = cylinders.filter(c => c.status?.includes('Maintenance') || c.status?.includes('मर्मतमा'));
    const maintenance = maintenanceCylinders.length;
    const maintenanceList = maintenanceCylinders.map(c => c.cylinderNo).filter(Boolean);

    const activeIssuedRecords = distributionRecords.filter(d => d.status?.includes('Issued') || d.status?.includes('वितरण गरिएको'));
    const activeIssued = activeIssuedRecords.length;
    const activeIssuedList = Array.from(new Set(activeIssuedRecords.map(d => d.cylinderNo).filter(Boolean)));

    return { 
      total, totalList,
      full, fullList,
      empty, emptyList,
      inUse, inUseList,
      maintenance, maintenanceList,
      activeIssued, activeIssuedList 
    };
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
      wardOrDept: distForm.wardOrDept || '',
      issuedDateBs: distForm.issuedDateBs || new NepaliDate().format('YYYY-MM-DD'),
      returnDateBs: distForm.returnDateBs || '',
      status: distForm.status || 'Issued (वितरण गरिएको)',
      issuedBy: distForm.issuedBy || currentUser?.fullName || currentUser?.username || 'Admin',
      invoiceNo: distForm.invoiceNo || `OXY-INV-${Date.now().toString().slice(-6)}`,
      serviceFee: distForm.serviceFee !== undefined ? Number(distForm.serviceFee) : 1000,
      receivedAmount: distForm.receivedAmount !== undefined ? Number(distForm.receivedAmount) : (distForm.serviceFee !== undefined ? Number(distForm.serviceFee) : 1000),
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
          newLocation = `वितरित - ${record.patientName}${record.wardOrDept ? ` (${record.wardOrDept})` : ''}`;
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
        wardOrDept: '',
        issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
        returnDateBs: '',
        status: 'Issued (वितरण गरिएको)',
        issuedBy: currentUser?.fullName || currentUser?.username || '',
        invoiceNo: `OXY-INV-${Date.now().toString().slice(-6)}`,
        serviceFee: 1000,
        receivedAmount: 1000,
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

  const handlePrintInvoice = () => {
    document.body.classList.add('printing-oxygen-invoice');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-oxygen-invoice');
    }, 1500);
  };

  const handlePrintLog = () => {
    document.body.classList.add('printing-oxygen-log');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-oxygen-log');
    }, 1500);
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
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">जम्मा सिलिन्डर</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
            {stats.totalList.length > 0 ? (
              stats.totalList.map(no => (
                <span key={no} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-bold">
                  {no}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-400">-</span>
            )}
          </div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase">भरिएको (Full)</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">{stats.full}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex flex-wrap gap-1">
            {stats.fullList.length > 0 ? (
              stats.fullList.map(no => (
                <span key={no} className="px-1.5 py-0.5 bg-emerald-100/90 text-emerald-800 border border-emerald-200 rounded text-[11px] font-mono font-bold">
                  {no}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-emerald-600/60">-</span>
            )}
          </div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase">खाली (Empty)</span>
            <div className="text-2xl font-black text-rose-800 mt-1">{stats.empty}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex flex-wrap gap-1">
            {stats.emptyList.length > 0 ? (
              stats.emptyList.map(no => (
                <span key={no} className="px-1.5 py-0.5 bg-rose-100/90 text-rose-800 border border-rose-200 rounded text-[11px] font-mono font-bold">
                  {no}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-rose-600/60">-</span>
            )}
          </div>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase">प्रयोगमा (In Use)</span>
            <div className="text-2xl font-black text-blue-800 mt-1">{stats.inUse}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex flex-wrap gap-1">
            {stats.inUseList.length > 0 ? (
              stats.inUseList.map(no => (
                <span key={no} className="px-1.5 py-0.5 bg-blue-100/90 text-blue-800 border border-blue-200 rounded text-[11px] font-mono font-bold">
                  {no}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-blue-600/60">-</span>
            )}
          </div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase">मर्मतमा (Maint.)</span>
            <div className="text-2xl font-black text-amber-800 mt-1">{stats.maintenance}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex flex-wrap gap-1">
            {stats.maintenanceList.length > 0 ? (
              stats.maintenanceList.map(no => (
                <span key={no} className="px-1.5 py-0.5 bg-amber-100/90 text-amber-800 border border-amber-200 rounded text-[11px] font-mono font-bold">
                  {no}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-amber-600/60">-</span>
            )}
          </div>
        </div>

        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase">हाल वितरण गरिएको</span>
            <div className="text-2xl font-black text-indigo-800 mt-1">{stats.activeIssued}</div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-indigo-200/60 flex flex-wrap gap-1">
            {stats.activeIssuedList.length > 0 ? (
              stats.activeIssuedList.map(no => (
                <span key={no} className="px-1.5 py-0.5 bg-indigo-100/90 text-indigo-800 border border-indigo-200 rounded text-[11px] font-mono font-bold">
                  {no}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-indigo-600/60">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 md:max-w-xs min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'status' ? "सिलिन्डर नम्बर वा स्थान खोज्नुहोस्..." : "बिरामी, इनभ्वाइस वा सिलिन्डर खोज्नुहोस्..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Fiscal Year Filter (For Distribution Tab) */}
          {activeTab === 'distribution' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-600 font-nepali">आ.व.:</span>
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none font-mono cursor-pointer"
              >
                <option value="all">सबै आ.व. (All FY)</option>
                {FISCAL_YEARS.map(fy => (
                  <option key={fy.id} value={fy.value}>{fy.label} ({fy.value})</option>
                ))}
              </select>
            </div>
          )}

          {/* Nepali Month Filter (For Distribution Tab) */}
          {activeTab === 'distribution' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-600 font-nepali">महिना:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none font-nepali cursor-pointer"
              >
                {NEPALI_MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
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

          {activeTab === 'distribution' && (selectedFiscalYear !== 'all' || selectedMonth !== 'all' || statusFilter !== 'all' || searchTerm !== '') && (
            <button
              onClick={() => {
                setSelectedFiscalYear('all');
                setSelectedMonth('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-2 rounded-lg transition-colors font-nepali flex items-center gap-1 cursor-pointer"
              title="सबै फिल्टर रिसेट गर्नुहोस्"
            >
              <RefreshCw size={13} /> रिसेट
            </button>
          )}
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsLogPrintModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
                title="अक्सिजन सिलिन्डर वितरण लग रिपोर्ट प्रिन्ट गर्नुहोस्"
              >
                <Printer size={18} /> वितरण लग रिपोर्ट प्रिन्ट
              </button>
              <button
                onClick={() => {
                  setEditingDist(null);
                  setDistForm({
                    cylinderNo: '',
                    patientName: '',
                    patientPhone: '',
                    wardOrDept: '',
                    issuedDateBs: new NepaliDate().format('YYYY-MM-DD'),
                    returnDateBs: '',
                    status: 'Issued (वितरण गरिएको)',
                    issuedBy: currentUser?.fullName || currentUser?.username || '',
                    invoiceNo: `OXY-INV-${Date.now().toString().slice(-6)}`,
                    serviceFee: 1000,
                    receivedAmount: 1000,
                    remarks: ''
                  });
                  setIsDistModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={18} /> सिलिन्डर वितरण रेकर्ड गर्नुहोस्
              </button>
            </div>
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
                  <th className="p-3">ठेगाना</th>
                  <th className="p-3 text-center">सेवा शुल्क (रु)</th>
                  <th className="p-3 text-center text-emerald-800">प्राप्त रकम (रु)</th>
                  <th className="p-3">स्थिति</th>
                  <th className="p-3">फिर्ता मिति</th>
                  <th className="p-3">वितरण गर्ने</th>
                  <th className="p-3 text-center print:hidden">कार्य / इनभ्वाइस</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-400">
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
                      <td className="p-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/30">Rs. {dist.receivedAmount ?? dist.serviceFee ?? 1000}</td>
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
                                receivedAmount: dist.receivedAmount ?? dist.serviceFee ?? 1000,
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
              {filteredDistributions.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
                    <td colSpan={7} className="p-3 text-right">कुल जम्मा (Total Sum):</td>
                    <td className="p-3 text-center font-mono font-black text-slate-900">
                      Rs. {filteredDistributions.reduce((sum, d) => sum + (d.serviceFee ?? 1000), 0)}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-emerald-900 bg-emerald-100/50">
                      Rs. {filteredDistributions.reduce((sum, d) => sum + (d.receivedAmount ?? d.serviceFee ?? 1000), 0)}
                    </td>
                    <td colSpan={5} className="p-3"></td>
                  </tr>
                </tfoot>
              )}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">ठेगाना (Address)</label>
                  <input
                    type="text"
                    placeholder="उदा. वडा नं. ३, काठमाडौँ"
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
                    onChange={(e) => {
                      const fee = Number(e.target.value);
                      setDistForm({
                        ...distForm,
                        serviceFee: fee,
                        receivedAmount: distForm.receivedAmount !== undefined ? distForm.receivedAmount : fee
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">प्राप्त रकम (रु.) *</label>
                  <input
                    type="number"
                    required
                    value={distForm.receivedAmount ?? distForm.serviceFee ?? 1000}
                    onChange={(e) => setDistForm({ ...distForm, receivedAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-emerald-900"
                  />
                </div>
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[99999] overflow-y-auto p-4 md:p-6 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden mx-auto my-4 md:my-8 print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
            {/* Modal Header controls (Hidden during print) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Printer size={20} /> अक्सिजन सेवा इनभ्वाइस / बिल प्रिन्ट
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={16} /> प्रिन्ट गर्नुहोस्
                </button>
                <button 
                  type="button"
                  onClick={() => setPrintingDist(null)} 
                  className="text-slate-300 hover:text-white cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Invoice Body */}
            <div id="printable-oxygen-invoice" className="p-8 space-y-5 print:p-0 text-slate-800 bg-white">
              {/* Organization Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
                <div className="w-20 shrink-0">
                  <LogoDisplay settings={generalSettings} width={75} height={75} />
                </div>
                <div className="text-center flex-1 px-4 font-nepali">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {generalSettings?.orgNameNepali || generalSettings?.organizationName || activeOrgName || 'स्वास्थ्य संस्था'}
                  </h2>
                  {generalSettings?.subTitleNepali && (
                    <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{generalSettings.subTitleNepali}</p>
                  )}
                  {generalSettings?.subTitleNepali2 && (
                    <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{generalSettings.subTitleNepali2}</p>
                  )}
                  {generalSettings?.subTitleNepali3 && (
                    <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{generalSettings.subTitleNepali3}</p>
                  )}
                  {generalSettings?.subTitleNepali4 && (
                    <p className="text-xs font-bold text-slate-600 leading-tight mt-0.5">{generalSettings.subTitleNepali4}</p>
                  )}
                  {!generalSettings?.subTitleNepali && !generalSettings?.subTitleNepali2 && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{generalSettings?.address || 'नेपाल'}</p>
                  )}
                  <p className="text-xs text-cyan-800 font-bold mt-1.5 uppercase tracking-wider">अक्सिजन सिलिन्डर वितरण तथा सेवा शुल्क इनभ्वाइस</p>
                </div>
                <div className="w-20 shrink-0 flex justify-end">
                  {generalSettings?.provinceLogoUrl && !generalSettings?.disableProvinceLogo && !generalSettings?.hideProvinceLogo ? (
                    <img 
                      src={generalSettings.provinceLogoUrl} 
                      alt="Province Logo" 
                      className="w-14 h-14 object-contain"
                    />
                  ) : null}
                </div>
              </div>

              {/* Line Muni (Below Header Line): Fiscal Year on Left & Invoice No on Right */}
              <div className="flex items-center justify-between text-xs text-slate-700 border-b border-slate-200 pb-2 px-1">
                <div className="font-bold text-slate-800">
                  <span className="font-nepali">आर्थिक वर्ष: </span>
                  <span className="text-slate-900 font-black">{toNepaliNumber(currentFiscalYear)}</span>
                </div>
                <div className="font-black text-indigo-950 text-sm">
                  <span className="font-nepali text-slate-700 font-bold text-xs">बिल नं: </span>
                  <span className="tracking-wide">{toNepaliNumber(printingDist.invoiceNo || 'N/A')}</span>
                </div>
              </div>

              {/* Patient & Distribution Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">बिरामीको विवरण:</p>
                  <p className="font-bold text-slate-900 text-base mt-1">{printingDist.patientName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">सम्पर्क नं: <span>{printingDist.patientPhone ? toNepaliNumber(printingDist.patientPhone) : 'उपलब्ध छैन'}</span></p>
                  <p className="text-xs text-slate-600 mt-0.5">ठेगाना: <span className="font-semibold">{toNepaliNumber(printingDist.wardOrDept)}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase">वितरण विवरण:</p>
                  <p className="text-xs text-slate-700 mt-1">वितरण मिति (BS): <span className="font-bold">{toNepaliNumber(printingDist.issuedDateBs)}</span></p>
                  <p className="text-xs text-slate-700 mt-0.5">फिर्ता मिति (BS): <span>{printingDist.returnDateBs ? toNepaliNumber(printingDist.returnDateBs) : 'हाल फिर्ता भएको छैन'}</span></p>
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
                    <td className="p-3 text-center text-xs">{toNepaliNumber(1)}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">अक्सिजन सिलिन्डर वितरण तथा सेवा शुल्क</p>
                      <p className="text-xs text-slate-500">Oxygen Cylinder Rental & Refill Service Fee</p>
                    </td>
                    <td className="p-3 text-center font-bold text-cyan-900">{toNepaliNumber(printingDist.cylinderNo)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-bold">
                        {printingDist.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">रु. {toNepaliNumber(printingDist.serviceFee ?? 1000)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-bold bg-slate-50">
                    <td colSpan={4} className="p-3 text-right">जम्मा सेवा शुल्क (Total Fee):</td>
                    <td className="p-3 text-right text-base text-slate-900 font-black">रु. {toNepaliNumber(printingDist.serviceFee ?? 1000)}</td>
                  </tr>
                  <tr className="border-t border-slate-300 font-bold bg-emerald-50/60 text-emerald-950">
                    <td colSpan={4} className="p-2.5 text-right">जम्मा प्राप्त रकम (Received Amount):</td>
                    <td className="p-2.5 text-right text-base text-emerald-900 font-black">
                      रु. {toNepaliNumber(printingDist.receivedAmount ?? printingDist.serviceFee ?? 1000)}
                    </td>
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
                type="button"
                onClick={handlePrintInvoice}
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
                <p>ठेगाना: <span className="font-semibold text-slate-700">{returningDist.wardOrDept}</span></p>
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

      {/* Distribution Log Report Print Modal */}
      {isLogPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[99999] overflow-y-auto p-4 md:p-6 print:p-0 print:bg-white print:static oxygen-log-modal-overlay">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden mx-auto my-4 md:my-8 print:shadow-none print:border-none print:w-full print:max-w-none print:my-0">
            {/* Control Bar (Hidden during print) */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden font-nepali">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-cyan-400" />
                <h3 className="font-bold text-base md:text-lg">अक्सिजन सिलिन्डर वितरण लग प्रतिवेदन प्रिन्ट</h3>
              </div>

              {/* Filter controls inside print preview bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-300 font-bold">आ.व.:</span>
                  <select
                    value={selectedFiscalYear}
                    onChange={(e) => setSelectedFiscalYear(e.target.value)}
                    className="bg-transparent text-cyan-200 font-bold font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="all">सबै आ.व. (All FY)</option>
                    {FISCAL_YEARS.map(fy => (
                      <option key={fy.id} value={fy.value} className="bg-slate-900 text-white">{fy.label} ({fy.value})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-slate-300 font-bold">महिना:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-cyan-200 font-bold focus:outline-none cursor-pointer"
                  >
                    {NEPALI_MONTH_OPTIONS.map(m => (
                      <option key={m.value} value={m.value} className="bg-slate-900 text-white">{m.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handlePrintLog}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm ml-2"
                >
                  <Printer size={16} /> लग प्रिन्ट गर्नुहोस्
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogPrintModalOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Report Body */}
            <div id="printable-oxygen-log" className="p-8 md:p-10 space-y-6 print:p-0 text-slate-900 bg-white font-nepali">
              {/* Organization Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
                <div className="w-20 shrink-0">
                  <LogoDisplay settings={generalSettings} width={75} height={75} />
                </div>
                <div className="text-center flex-1 px-4">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                    {generalSettings?.orgNameNepali || generalSettings?.organizationName || activeOrgName || 'स्वास्थ्य संस्था'}
                  </h2>
                  {generalSettings?.subTitleNepali && (
                    <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{generalSettings.subTitleNepali}</p>
                  )}
                  {generalSettings?.subTitleNepali2 && (
                    <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{generalSettings.subTitleNepali2}</p>
                  )}
                  {generalSettings?.subTitleNepali3 && (
                    <p className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{generalSettings.subTitleNepali3}</p>
                  )}
                  {generalSettings?.subTitleNepali4 && (
                    <p className="text-xs font-bold text-slate-600 leading-tight mt-0.5">{generalSettings.subTitleNepali4}</p>
                  )}
                  {!generalSettings?.subTitleNepali && !generalSettings?.subTitleNepali2 && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{generalSettings?.address || 'नेपाल'}</p>
                  )}
                  <h3 className="text-sm md:text-base font-black text-cyan-900 mt-2 uppercase tracking-wide">
                    अक्सिजन सिलिन्डर वितरण लग प्रतिवेदन {selectedMonth !== 'all' ? `- ${NEPALI_MONTH_OPTIONS.find(m => m.value === selectedMonth)?.name} महिना` : ''} {selectedFiscalYear !== 'all' ? `(आ.व. ${toNepaliNumber(selectedFiscalYear)})` : ''}
                  </h3>
                </div>
                <div className="w-20 shrink-0"></div>
              </div>

              {/* Meta Row */}
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-300">
                <div>आर्थिक वर्ष: <span className="text-cyan-950 font-black">{selectedFiscalYear === 'all' ? 'सबै आ.व.' : toNepaliNumber(selectedFiscalYear)}</span></div>
                <div>मासिक अवधि: <span className="text-cyan-950 font-black">{NEPALI_MONTH_OPTIONS.find(m => m.value === selectedMonth)?.name || 'सबै महिना'}</span></div>
                <div>जम्मा वितरण संख्या: <span className="text-cyan-950 font-black">{toNepaliNumber(filteredDistributions.length)} वटा</span></div>
                <div>प्रतिवेदन तयार मिति: <span className="text-slate-900">{toNepaliNumber(new NepaliDate().format('YYYY-MM-DD'))}</span></div>
              </div>

              {/* Summary Cards Row inside Report */}
              <div className="grid grid-cols-3 gap-3 text-xs text-center">
                <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl">
                  <span className="block text-[10px] text-slate-600 font-bold uppercase">जम्मा सेवा शुल्क</span>
                  <span className="block text-sm font-black text-slate-900 mt-0.5">
                    रु. {toNepaliNumber(filteredDistributions.reduce((sum, d) => sum + (d.serviceFee ?? 1000), 0))}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl">
                  <span className="block text-[10px] text-emerald-800 font-bold uppercase">जम्मा प्राप्त रकम (Received Amount)</span>
                  <span className="block text-sm font-black text-emerald-900 mt-0.5">
                    रु. {toNepaliNumber(filteredDistributions.reduce((sum, d) => sum + (d.receivedAmount ?? d.serviceFee ?? 1000), 0))}
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl">
                  <span className="block text-[10px] text-amber-800 font-bold uppercase">फिर्ता हुन बाँकी सिलिन्डर</span>
                  <span className="block text-sm font-black text-amber-900 mt-0.5">
                    {toNepaliNumber(filteredDistributions.filter(d => d.status?.includes('Issued') || d.status?.includes('वितरण')).length)} वटा
                  </span>
                </div>
              </div>

              {/* Report Table */}
              <table className="w-full border-collapse border-2 border-slate-900 text-xs text-slate-900">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-900 p-2 text-center w-10">क्र.सं.</th>
                    <th className="border border-slate-900 p-2 text-center w-28">इनभ्वाइस नं.</th>
                    <th className="border border-slate-900 p-2 text-center w-24">वितरण मिति</th>
                    <th className="border border-slate-900 p-2 text-center w-24">सिलिन्डर नं.</th>
                    <th className="border border-slate-900 p-2 text-left">बिरामीको नाम र फोन</th>
                    <th className="border border-slate-900 p-2 text-left">ठेगाना</th>
                    <th className="border border-slate-900 p-2 text-right w-24">सेवा शुल्क</th>
                    <th className="border border-slate-900 p-2 text-right w-28 text-emerald-900">प्राप्त रकम</th>
                    <th className="border border-slate-900 p-2 text-center w-24">स्थिति</th>
                    <th className="border border-slate-900 p-2 text-center w-24">फिर्ता मिति</th>
                    <th className="border border-slate-900 p-2 text-left w-24">वितरण गर्ने</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistributions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="border border-slate-900 p-6 text-center text-slate-400">
                        कुनै वितरण रेकर्ड फेला परेन।
                      </td>
                    </tr>
                  ) : (
                    filteredDistributions.map((d, i) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="border border-slate-900 p-1.5 text-center">{toNepaliNumber(i + 1)}</td>
                        <td className="border border-slate-900 p-1.5 text-center font-bold">{toNepaliNumber(d.invoiceNo || 'N/A')}</td>
                        <td className="border border-slate-900 p-1.5 text-center">{toNepaliNumber(d.issuedDateBs)}</td>
                        <td className="border border-slate-900 p-1.5 text-center font-bold text-cyan-950">{toNepaliNumber(d.cylinderNo)}</td>
                        <td className="border border-slate-900 p-1.5 font-bold">
                          {d.patientName}
                          {d.patientPhone && <span className="block text-[10px] text-slate-600 font-normal">फोन: {toNepaliNumber(d.patientPhone)}</span>}
                        </td>
                        <td className="border border-slate-900 p-1.5">{toNepaliNumber(d.wardOrDept)}</td>
                        <td className="border border-slate-900 p-1.5 text-right font-bold">रु. {toNepaliNumber(d.serviceFee ?? 1000)}</td>
                        <td className="border border-slate-900 p-1.5 text-right font-black text-emerald-900 bg-emerald-50/40">
                          रु. {toNepaliNumber(d.receivedAmount ?? d.serviceFee ?? 1000)}
                        </td>
                        <td className="border border-slate-900 p-1.5 text-center font-bold">
                          {d.status}
                        </td>
                        <td className="border border-slate-900 p-1.5 text-center">{d.returnDateBs ? toNepaliNumber(d.returnDateBs) : '-'}</td>
                        <td className="border border-slate-900 p-1.5">{d.issuedBy || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={6} className="border border-slate-900 p-2 text-right font-black">कुल जम्मा (Grand Total):</td>
                    <td className="border border-slate-900 p-2 text-right font-black">
                      रु. {toNepaliNumber(filteredDistributions.reduce((sum, d) => sum + (d.serviceFee ?? 1000), 0))}
                    </td>
                    <td className="border border-slate-900 p-2 text-right font-black text-emerald-900 bg-emerald-100/60">
                      रु. {toNepaliNumber(filteredDistributions.reduce((sum, d) => sum + (d.receivedAmount ?? d.serviceFee ?? 1000), 0))}
                    </td>
                    <td colSpan={3} className="border border-slate-900 p-2"></td>
                  </tr>
                </tfoot>
              </table>

              {/* Signature Block */}
              <div className="grid grid-cols-2 gap-12 pt-10 text-xs">
                <div className="text-center border-t border-slate-800 pt-1.5">
                  <p className="font-bold text-slate-900">तयार गर्ने कर्मचारीको सही</p>
                  <p className="text-slate-600 mt-0.5">({currentUser?.fullName || currentUser?.username || 'फाँटवाला'})</p>
                </div>
                <div className="text-center border-t border-slate-800 pt-1.5">
                  <p className="font-bold text-slate-900">प्रमाणित गर्ने / प्रमुखको सही</p>
                  <p className="text-slate-600 mt-0.5">(कार्यालय प्रमुख / शाखा प्रमुख)</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-slate-100 px-6 py-3 flex justify-end gap-3 border-t border-slate-200 print:hidden font-nepali">
              <button
                onClick={() => setIsLogPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                बन्द गर्नुहोस्
              </button>
              <button
                type="button"
                onClick={handlePrintLog}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Printer size={16} /> लग प्रिन्ट गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Print Style */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body.printing-oxygen-log *,
              body.printing-oxygen-invoice * {
                visibility: hidden;
              }
              
              body.printing-oxygen-log #printable-oxygen-log,
              body.printing-oxygen-log #printable-oxygen-log * {
                visibility: visible !important;
              }

              body.printing-oxygen-log #printable-oxygen-log {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 16px !important;
                background: white !important;
                color: black !important;
              }

              body.printing-oxygen-invoice #printable-oxygen-invoice,
              body.printing-oxygen-invoice #printable-oxygen-invoice * {
                visibility: visible !important;
              }

              body.printing-oxygen-invoice #printable-oxygen-invoice {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 16px !important;
                background: white !important;
                color: black !important;
              }

              .print\\:hidden {
                display: none !important;
              }
            }
          `
        }}
      />
    </div>
  );
};
