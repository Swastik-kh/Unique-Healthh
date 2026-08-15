import React, { useState, useMemo } from 'react';
import { AmbulanceOdometerRecord, AmbulanceRecord, AmbulanceExpenseRecord, User, OrganizationSettings } from '../types';
import { 
  Plus, Search, Edit2, Trash2, Calendar, User as UserIcon, Truck, 
  AlertCircle, FileText, Gauge, Printer, Download, Sparkles, TrendingUp, 
  CheckCircle2, Fuel, RefreshCw, Compass, ArrowRight, ShieldAlert, X
} from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { LogoDisplay } from './LogoDisplay';
import { toNepaliDigits } from '../lib/tableUtils';
import { FISCAL_YEARS } from '../constants';

export const NEPALI_FY_MONTHS = [
  { id: '04', monthIndex: 4, name: 'साउन (Shrawan)', shortName: 'साउन' },
  { id: '05', monthIndex: 5, name: 'भदौ (Bhadra)', shortName: 'भदौ' },
  { id: '06', monthIndex: 6, name: 'असोज (Ashoj)', shortName: 'असोज' },
  { id: '07', monthIndex: 7, name: 'कात्तिक (Kartik)', shortName: 'कात्तिक' },
  { id: '08', monthIndex: 8, name: 'मंसिर (Mangsir)', shortName: 'मंसिर' },
  { id: '09', monthIndex: 9, name: 'पुस (Poush)', shortName: 'पुस' },
  { id: '10', monthIndex: 10, name: 'माघ (Magh)', shortName: 'माघ' },
  { id: '11', monthIndex: 11, name: 'फागुन (Falgun)', shortName: 'फागुन' },
  { id: '12', monthIndex: 12, name: 'चैत (Chaitra)', shortName: 'चैत' },
  { id: '01', monthIndex: 1, name: 'बैशाख (Baisakh)', shortName: 'बैशाख' },
  { id: '02', monthIndex: 2, name: 'जेठ (Jestha)', shortName: 'जेठ' },
  { id: '03', monthIndex: 3, name: 'असार (Ashadh)', shortName: 'असार' }
];

interface AmbulanceOdometerViewProps {
  odometerRecords?: AmbulanceOdometerRecord[];
  tripRecords?: AmbulanceRecord[];
  expenseRecords?: AmbulanceExpenseRecord[];
  currentFiscalYear: string;
  generalSettings?: OrganizationSettings;
  currentUser?: User | null;
  users: User[];
  onSaveOdometer?: (record: AmbulanceOdometerRecord) => void;
  onDeleteOdometer?: (id: string) => void;
}

export const AmbulanceOdometerView: React.FC<AmbulanceOdometerViewProps> = ({
  odometerRecords = [],
  tripRecords = [],
  expenseRecords = [],
  currentFiscalYear,
  generalSettings,
  currentUser,
  users,
  onSaveOdometer,
  onDeleteOdometer
}) => {
  // State for Filters
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentFiscalYear || '2081/082');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // State for Modal Form
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AmbulanceOdometerRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    fiscalYear: string;
    month: string;
    ambulanceNo: string;
    driverName: string;
    startOdometer: string;
    endOdometer: string;
    fuelLiters: string;
    remarks: string;
  }>({
    fiscalYear: currentFiscalYear || '2081/082',
    month: '04',
    ambulanceNo: generalSettings?.ambulanceNo || '',
    driverName: generalSettings?.ambulanceDriverName || '',
    startOdometer: '',
    endOdometer: '',
    fuelLiters: '',
    remarks: ''
  });

  const canDelete = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.canDeleteAmbulance === true;

  // All unique vehicle numbers across settings, odometer, trips, expenses
  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    if (generalSettings?.ambulanceNo) set.add(generalSettings.ambulanceNo);
    odometerRecords.forEach(r => { if (r.ambulanceNo) set.add(r.ambulanceNo); });
    tripRecords.forEach(r => { if (r.ambulanceNo) set.add(r.ambulanceNo); });
    expenseRecords.forEach(r => { if (r.ambulanceNo) set.add(r.ambulanceNo); });
    return Array.from(set);
  }, [generalSettings, odometerRecords, tripRecords, expenseRecords]);

  // All unique driver names
  const driverOptions = useMemo(() => {
    const set = new Set<string>();
    if (generalSettings?.ambulanceDriverName) set.add(generalSettings.ambulanceDriverName);
    odometerRecords.forEach(r => { if (r.driverName) set.add(r.driverName); });
    tripRecords.forEach(r => { if (r.driverName) set.add(r.driverName); });
    users.forEach(u => { if (u.role === 'STAFF' || u.fullName) set.add(u.fullName); });
    return Array.from(set);
  }, [generalSettings, odometerRecords, tripRecords, users]);

  // Find previous month's end odometer for auto-fill suggestion
  const getPreviousMonthEndOdometer = (monthId: string, vehicleNo: string, fy: string): number | null => {
    if (!vehicleNo) return null;
    const currentMonthIdx = NEPALI_FY_MONTHS.findIndex(m => m.id === monthId);
    if (currentMonthIdx === -1) return null;

    let targetFy = fy;
    let targetMonthId = '';

    if (currentMonthIdx > 0) {
      targetMonthId = NEPALI_FY_MONTHS[currentMonthIdx - 1].id;
    } else {
      // Month is Shrawan (04), look at Ashadh (03) of previous FY
      targetMonthId = '03';
      const fyIdx = FISCAL_YEARS.findIndex(f => f.value === fy);
      if (fyIdx > 0) {
        targetFy = FISCAL_YEARS[fyIdx - 1].value;
      } else {
        return null;
      }
    }

    const prevRec = odometerRecords.find(r => 
      r.fiscalYear === targetFy && 
      r.month === targetMonthId && 
      r.ambulanceNo?.trim().toLowerCase() === vehicleNo.trim().toLowerCase()
    );

    if (prevRec && prevRec.endOdometer !== undefined) {
      return prevRec.endOdometer;
    }
    return null;
  };

  // Open Add Modal
  const handleOpenAdd = (defaultMonth?: string) => {
    const targetMonth = defaultMonth || '04';
    const targetVehicle = selectedVehicle || generalSettings?.ambulanceNo || (vehicleOptions[0] || '');
    const targetDriver = selectedDriver || generalSettings?.ambulanceDriverName || (driverOptions[0] || '');
    const autoStartOdo = getPreviousMonthEndOdometer(targetMonth, targetVehicle, selectedFiscalYear);

    setEditingRecord(null);
    setFormData({
      fiscalYear: selectedFiscalYear,
      month: targetMonth,
      ambulanceNo: targetVehicle,
      driverName: targetDriver,
      startOdometer: autoStartOdo !== null ? String(autoStartOdo) : '',
      endOdometer: '',
      fuelLiters: '',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: AmbulanceOdometerRecord) => {
    setEditingRecord(rec);
    setFormData({
      fiscalYear: rec.fiscalYear || selectedFiscalYear,
      month: rec.month,
      ambulanceNo: rec.ambulanceNo || '',
      driverName: rec.driverName || '',
      startOdometer: rec.startOdometer !== undefined ? String(rec.startOdometer) : '',
      endOdometer: rec.endOdometer !== undefined ? String(rec.endOdometer) : '',
      fuelLiters: rec.fuelLiters !== undefined ? String(rec.fuelLiters) : '',
      remarks: rec.remarks || ''
    });
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fiscalYear || !formData.month) {
      alert('कृपया आर्थिक वर्ष र महिना छान्नुहोस्।');
      return;
    }

    const start = parseFloat(formData.startOdometer);
    const end = parseFloat(formData.endOdometer);

    if (isNaN(start) || isNaN(end)) {
      alert('कृपया महिनाको सुरु र अन्तिम ओडोमिटर कि.मि. प्रविष्ट गर्नुहोस्।');
      return;
    }

    if (end < start) {
      if (!confirm(`अन्तिम ओडोमिटर (${end}) सुरु ओडोमिटर (${start}) भन्दा कम छ। के तपाईं निश्चित हुनुहुन्छ?`)) {
        return;
      }
    }

    const distance = Math.max(0, end - start);
    const fuel = formData.fuelLiters ? parseFloat(formData.fuelLiters) : undefined;

    const record: AmbulanceOdometerRecord = {
      id: editingRecord?.id || `ODO-${formData.fiscalYear.replace(/[^a-zA-Z0-9]/g, '')}-${formData.month}-${Date.now()}`,
      fiscalYear: formData.fiscalYear,
      month: formData.month,
      ambulanceNo: formData.ambulanceNo || '',
      driverName: formData.driverName || '',
      startOdometer: start,
      endOdometer: end,
      totalDistanceKm: distance,
      fuelLiters: !isNaN(fuel as number) ? fuel : undefined,
      remarks: formData.remarks || '',
      recordedAt: editingRecord?.recordedAt || new NepaliDate().format('YYYY-MM-DD HH:mm:ss'),
      recordedBy: currentUser?.fullName || currentUser?.username || 'User'
    };

    onSaveOdometer?.(record);
    setIsModalOpen(false);
  };

  // Monthly breakdown calculation for the selected Fiscal Year
  const monthlyOdometerReport = useMemo(() => {
    return NEPALI_FY_MONTHS.map(m => {
      // 1. Find saved odometer record for this month & filters
      const matchingOdo = odometerRecords.find(r => {
        if (r.fiscalYear !== selectedFiscalYear) return false;
        if (r.month !== m.id && Number(r.month) !== Number(m.id)) return false;
        if (selectedVehicle && r.ambulanceNo && r.ambulanceNo.trim().toLowerCase() !== selectedVehicle.trim().toLowerCase()) return false;
        if (selectedDriver && r.driverName && r.driverName.trim().toLowerCase() !== selectedDriver.trim().toLowerCase()) return false;
        return true;
      });

      // 2. Cross-reference with Trip records in this month
      const tripsInMonth = tripRecords.filter(t => {
        if (t.fiscalYear && t.fiscalYear !== selectedFiscalYear) return false;
        if (selectedVehicle && t.ambulanceNo && t.ambulanceNo.trim().toLowerCase() !== selectedVehicle.trim().toLowerCase()) return false;
        if (selectedDriver && t.driverName && t.driverName.trim().toLowerCase() !== selectedDriver.trim().toLowerCase()) return false;
        const dateParts = (t.dateBs || '').split(/[-/]/);
        if (dateParts.length >= 2) {
          const tripMonth = dateParts[1].padStart(2, '0');
          return tripMonth === m.id;
        }
        return false;
      });

      const tripsDistance = tripsInMonth.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);
      const tripsCount = tripsInMonth.length;
      const tripsIncome = tripsInMonth.reduce((sum, t) => sum + (Number(t.amountCharged) || 0), 0);

      // 3. Cross-reference with Fuel Expenses in this month
      const fuelExpensesInMonth = expenseRecords.filter(e => {
        if (e.fiscalYear && e.fiscalYear !== selectedFiscalYear) return false;
        if (e.expenseCategory !== 'fuel') return false;
        if (selectedVehicle && e.ambulanceNo && e.ambulanceNo.trim().toLowerCase() !== selectedVehicle.trim().toLowerCase()) return false;
        if (selectedDriver && e.driverName && e.driverName.trim().toLowerCase() !== selectedDriver.trim().toLowerCase()) return false;
        const dateParts = (e.dateBs || '').split(/[-/]/);
        if (dateParts.length >= 2) {
          const expMonth = dateParts[1].padStart(2, '0');
          return expMonth === m.id;
        }
        return false;
      });

      const expenseFuelLiters = fuelExpensesInMonth.reduce((sum, e) => sum + (Number(e.fuelLiters) || 0), 0);
      const expenseFuelCost = fuelExpensesInMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Total fuel: prefer recorded fuel on odometer record, else sum from fuel expenses
      const totalFuelLiters = matchingOdo?.fuelLiters !== undefined && matchingOdo.fuelLiters > 0 
        ? matchingOdo.fuelLiters 
        : expenseFuelLiters;

      const odoDistance = matchingOdo 
        ? (matchingOdo.totalDistanceKm !== undefined ? matchingOdo.totalDistanceKm : (matchingOdo.endOdometer - matchingOdo.startOdometer))
        : 0;

      const mileage = totalFuelLiters > 0 && odoDistance > 0 ? (odoDistance / totalFuelLiters) : 0;
      const variance = matchingOdo ? (odoDistance - tripsDistance) : 0;

      return {
        monthInfo: m,
        record: matchingOdo,
        startOdometer: matchingOdo?.startOdometer,
        endOdometer: matchingOdo?.endOdometer,
        distanceKm: odoDistance,
        tripsDistance,
        tripsCount,
        tripsIncome,
        fuelLiters: totalFuelLiters,
        fuelCost: expenseFuelCost,
        mileage,
        variance,
        isRecorded: !!matchingOdo
      };
    });
  }, [odometerRecords, tripRecords, expenseRecords, selectedFiscalYear, selectedVehicle, selectedDriver]);

  // Overall Annual Stats
  const annualSummary = useMemo(() => {
    const recordedMonths = monthlyOdometerReport.filter(m => m.isRecorded);
    const totalDistance = recordedMonths.reduce((sum, m) => sum + m.distanceKm, 0);
    const totalTripsDistance = monthlyOdometerReport.reduce((sum, m) => sum + m.tripsDistance, 0);
    const totalFuel = recordedMonths.reduce((sum, m) => sum + m.fuelLiters, 0);
    const totalTripsCount = monthlyOdometerReport.reduce((sum, m) => sum + m.tripsCount, 0);
    const totalIncome = monthlyOdometerReport.reduce((sum, m) => sum + m.tripsIncome, 0);
    const totalFuelCost = monthlyOdometerReport.reduce((sum, m) => sum + m.fuelCost, 0);

    const startOdos = recordedMonths.map(m => m.startOdometer).filter(v => v !== undefined) as number[];
    const endOdos = recordedMonths.map(m => m.endOdometer).filter(v => v !== undefined) as number[];

    const openingOdometer = startOdos.length > 0 ? startOdos[0] : undefined;
    const latestClosingOdometer = endOdos.length > 0 ? endOdos[endOdos.length - 1] : undefined;

    const avgMileage = totalFuel > 0 && totalDistance > 0 ? (totalDistance / totalFuel) : 0;

    return {
      recordedCount: recordedMonths.length,
      totalDistance,
      totalTripsDistance,
      totalFuel,
      totalTripsCount,
      totalIncome,
      totalFuelCost,
      openingOdometer,
      latestClosingOdometer,
      avgMileage
    };
  }, [monthlyOdometerReport]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "क्र.सं.",
      "महिना",
      "आर्थिक वर्ष",
      "एम्बुलेन्स नं.",
      "चालकको नाम",
      "सुरु ओडोमिटर (KM)",
      "अन्तिम ओडोमिटर (KM)",
      "ओडोमिटर कुल दूरी (KM)",
      "लगबुक यात्रा दूरी (KM)",
      "अन्तर/फरक (KM)",
      "इन्धन खपत (Liters)",
      "माइलेज (KM/L)",
      "कैफियत"
    ];

    const rows = monthlyOdometerReport.map((m, idx) => [
      idx + 1,
      `"${m.monthInfo.name}"`,
      `"${selectedFiscalYear}"`,
      `"${m.record?.ambulanceNo || selectedVehicle || generalSettings?.ambulanceNo || '-'}"`,
      `"${m.record?.driverName || selectedDriver || '-'}"`,
      m.startOdometer !== undefined ? m.startOdometer.toFixed(1) : "-",
      m.endOdometer !== undefined ? m.endOdometer.toFixed(1) : "-",
      m.isRecorded ? m.distanceKm.toFixed(1) : "-",
      m.tripsDistance.toFixed(1),
      m.isRecorded ? m.variance.toFixed(1) : "-",
      m.fuelLiters > 0 ? m.fuelLiters.toFixed(1) : "-",
      m.mileage > 0 ? m.mileage.toFixed(2) : "-",
      `"${m.record?.remarks || '-'}"`
    ]);

    // Add summary row
    rows.push([
      "कुल जम्मा",
      "१२ महिना",
      `"${selectedFiscalYear}"`,
      "-",
      "-",
      annualSummary.openingOdometer !== undefined ? annualSummary.openingOdometer.toFixed(1) : "-",
      annualSummary.latestClosingOdometer !== undefined ? annualSummary.latestClosingOdometer.toFixed(1) : "-",
      annualSummary.totalDistance.toFixed(1),
      annualSummary.totalTripsDistance.toFixed(1),
      (annualSummary.totalDistance - annualSummary.totalTripsDistance).toFixed(1),
      annualSummary.totalFuel.toFixed(1),
      annualSummary.avgMileage.toFixed(2),
      "-"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ambulance_Odometer_Report_${selectedFiscalYear.replace(/[/\\?%*:|"<>]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Bar (Hidden on Print) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 print:hidden space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-100">
              <Gauge size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-nepali flex items-center gap-2">
                एम्बुलेन्स ओडोमिटर रेकर्ड तथा मासिक प्रतिवेदन
              </h3>
              <p className="text-xs text-slate-500 font-nepali">
                प्रत्येक महिनाको सुरु र अन्तिम ओडोमिटर प्रविष्टि, तय दूरी, इन्धन खपत तथा वार्षिक कार्यप्रगति विवरण
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOpenAdd()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow hover:shadow-md transition-all font-nepali active:scale-95"
            >
              <Plus size={16} />
              <span>नयाँ ओडोमिटर प्रविष्टि</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all font-nepali"
              title="प्रिन्ट गर्नुहोस्"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">प्रिन्ट</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all font-nepali"
              title="Excel/CSV डाउनलोड गर्नुहोस्"
            >
              <Download size={16} />
              <span className="hidden sm:inline">CSV Export</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          {/* Fiscal Year Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 font-nepali flex items-center gap-1">
              <Calendar size={13} className="text-indigo-600" />
              आर्थिक वर्ष (Fiscal Year)
            </label>
            <select
              value={selectedFiscalYear}
              onChange={e => setSelectedFiscalYear(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {FISCAL_YEARS.map(fy => (
                <option key={fy.id} value={fy.value}>{fy.label} ({fy.value})</option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 font-nepali flex items-center gap-1">
              <Truck size={13} className="text-indigo-600" />
              एम्बुलेन्स नं. (Vehicle No)
            </label>
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">सबै एम्बुलेन्स (All Vehicles)</option>
              {vehicleOptions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Driver Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 font-nepali flex items-center gap-1">
              <UserIcon size={13} className="text-indigo-600" />
              चालक (Driver)
            </label>
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">सबै चालक (All Drivers)</option>
              {driverOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedVehicle || selectedDriver || selectedFiscalYear !== currentFiscalYear) && (
            <button
              onClick={() => {
                setSelectedFiscalYear(currentFiscalYear || '2081/082');
                setSelectedVehicle('');
                setSelectedDriver('');
              }}
              className="flex items-center justify-center gap-1.5 p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all font-nepali border border-rose-200"
            >
              <RefreshCw size={13} />
              <span>फिल्टर हटाउनुहोस्</span>
            </button>
          )}
        </div>
      </div>

      {/* Annual Summary KPI Cards (Screen View) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
        {/* Card 1: Annual Distance */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-2xl text-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-100 text-xs font-nepali font-semibold">
            <span>कुल तय दूरी</span>
            <Gauge size={16} />
          </div>
          <p className="text-2xl font-black font-nepali tracking-tight">
            {toNepaliDigits(annualSummary.totalDistance.toFixed(1))} <span className="text-xs font-normal">कि.मि.</span>
          </p>
          <p className="text-[10px] text-indigo-100 font-nepali">
            {toNepaliDigits(annualSummary.recordedCount)} / १२ महिना रेकर्ड भएको
          </p>
        </div>

        {/* Card 2: Opening & Closing Odometer */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-nepali font-semibold">
            <span>सुरु ➔ अन्तिम ओडोमिटर</span>
            <Compass size={16} className="text-indigo-600" />
          </div>
          <p className="text-base font-black font-nepali text-slate-800">
            {annualSummary.openingOdometer !== undefined ? toNepaliDigits(annualSummary.openingOdometer.toFixed(1)) : '-'}
            <span className="text-slate-400 mx-1">➔</span>
            {annualSummary.latestClosingOdometer !== undefined ? toNepaliDigits(annualSummary.latestClosingOdometer.toFixed(1)) : '-'}
          </p>
          <p className="text-[10px] text-slate-400 font-nepali">
            आ.व. {toNepaliDigits(selectedFiscalYear)} को रिडिङ
          </p>
        </div>

        {/* Card 3: Total Fuel Consumed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-nepali font-semibold">
            <span>कुल इन्धन खपत</span>
            <Fuel size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black font-nepali text-amber-600">
            {toNepaliDigits(annualSummary.totalFuel.toFixed(1))} <span className="text-xs font-normal">लिटर</span>
          </p>
          <p className="text-[10px] text-slate-400 font-nepali">
            इन्धन खर्च: रु. {toNepaliDigits(annualSummary.totalFuelCost.toFixed(2))}
          </p>
        </div>

        {/* Card 4: Average Fuel Efficiency */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-nepali font-semibold">
            <span>औसत माइलेज दर</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-nepali text-emerald-600">
            {annualSummary.avgMileage > 0 ? toNepaliDigits(annualSummary.avgMileage.toFixed(2)) : '-'} <span className="text-xs font-normal">KM/L</span>
          </p>
          <p className="text-[10px] text-slate-400 font-nepali">
            प्रति लिटर तय हुने दूरी
          </p>
        </div>

        {/* Card 5: Trip Logs Comparison */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-nepali font-semibold">
            <span>लगबुक यात्रा दूरी</span>
            <FileText size={16} className="text-rose-500" />
          </div>
          <p className="text-xl font-black font-nepali text-rose-600">
            {toNepaliDigits(annualSummary.totalTripsDistance.toFixed(1))} <span className="text-xs font-normal">कि.मि.</span>
          </p>
          <p className="text-[10px] text-slate-400 font-nepali">
            {toNepaliDigits(annualSummary.totalTripsCount)} पटक यात्रा सम्पन्न
          </p>
        </div>
      </div>

      {/* Main Table & Print Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
        
        {/* Formal Printable Header (Visible only when Printing) */}
        <div className="hidden print:block text-center space-y-2 p-6 border-b-2 border-slate-900 mb-6">
          <div className="flex justify-center mb-2">
            <LogoDisplay logoUrl={generalSettings?.logoUrl} altText="Logo" />
          </div>
          <h1 className="text-2xl font-bold text-slate-950 font-nepali leading-tight">
            {generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था'}
          </h1>
          <h2 className="text-sm font-semibold text-slate-700 font-nepali">
            {generalSettings?.subTitleNepali || 'एम्बुलेन्स सञ्चालन तथा व्यवस्थापन शाखा'}
          </h2>
          <p className="text-xs text-slate-600 font-nepali">
            {generalSettings?.address || ''} {generalSettings?.phone ? `• फोन: ${generalSettings.phone}` : ''}
          </p>
          <div className="pt-2">
            <h3 className="inline-block border-2 border-slate-950 px-6 py-1 rounded-md text-base font-black font-nepali bg-slate-50">
              एम्बुलेन्स मासिक ओडोमिटर तथा सञ्चालन प्रतिवेदन
            </h3>
          </div>
          
          <div className="flex justify-between items-center text-xs font-nepali pt-3 px-2 text-slate-800">
            <div>
              <span className="font-bold">आर्थिक वर्ष: </span>{toNepaliDigits(selectedFiscalYear)}
            </div>
            <div>
              <span className="font-bold">एम्बुलेन्स / गाडी नं.: </span>
              {selectedVehicle || generalSettings?.ambulanceNo || 'सबै'}
            </div>
            <div>
              <span className="font-bold">चालकको नाम: </span>
              {selectedDriver || generalSettings?.ambulanceDriverName || 'सबै'}
            </div>
            <div>
              <span className="font-bold">प्रतिवेदन मिति: </span>
              {toNepaliDigits(new NepaliDate().format('YYYY-MM-DD'))}
            </div>
          </div>
        </div>

        {/* Screen Table Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Gauge className="text-indigo-600 size-5" />
            <h4 className="font-bold text-slate-800 font-nepali text-sm sm:text-base">
              मासिक ओडोमिटर विवरण तालिका (आ.व. {toNepaliDigits(selectedFiscalYear)})
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-nepali bg-white px-3 py-1 rounded-lg border border-slate-200">
            कुल रेकर्ड: {toNepaliDigits(annualSummary.recordedCount)} / १२ महिना
          </span>
        </div>

        {/* 12-Month Detailed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] font-nepali">
                <th className="p-2.5 text-center border-r border-slate-200 w-10">क्र.सं.</th>
                <th className="p-2.5 border-r border-slate-200 min-w-[110px]">महिना</th>
                <th className="p-2.5 border-r border-slate-200 text-center min-w-[100px]">गाडी नं.</th>
                <th className="p-2.5 border-r border-slate-200 min-w-[120px]">चालकको नाम</th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[110px]">सुरु ओडोमिटर (KM)</th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[110px]">अन्तिम ओडोमिटर (KM)</th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[110px] bg-indigo-50/50 text-indigo-900 font-black">
                  ओडोमिटर दूरी (KM)
                </th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[105px] text-slate-600">
                  लगबुक दूरी (KM)
                </th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px]">अन्तर (KM)</th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px]">इन्धन (Ltr)</th>
                <th className="p-2.5 border-r border-slate-200 text-right min-w-[85px]">माइलेज</th>
                <th className="p-2.5 border-r border-slate-200 min-w-[120px]">कैफियत</th>
                <th className="p-2.5 text-center min-w-[90px] print:hidden">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {monthlyOdometerReport.map((row, idx) => {
                const hasRecord = row.isRecorded;
                return (
                  <tr 
                    key={row.monthInfo.id} 
                    className={`transition-colors ${hasRecord ? 'hover:bg-slate-50' : 'bg-slate-50/40 text-slate-400 hover:bg-slate-100/60'}`}
                  >
                    {/* S.N. */}
                    <td className="p-2.5 text-center border-r border-slate-200 font-nepali font-semibold">
                      {toNepaliDigits(idx + 1)}
                    </td>

                    {/* Month Name */}
                    <td className="p-2.5 border-r border-slate-200 font-nepali font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${hasRecord ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <span>{row.monthInfo.name}</span>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="p-2.5 border-r border-slate-200 text-center font-nepali text-slate-700">
                      {row.record?.ambulanceNo || selectedVehicle || generalSettings?.ambulanceNo || '-'}
                    </td>

                    {/* Driver */}
                    <td className="p-2.5 border-r border-slate-200 font-nepali text-slate-700">
                      {row.record?.driverName || selectedDriver || generalSettings?.ambulanceDriverName || '-'}
                    </td>

                    {/* Start Odometer */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali font-semibold text-slate-800">
                      {row.startOdometer !== undefined ? toNepaliDigits(row.startOdometer.toFixed(1)) : '-'}
                    </td>

                    {/* End Odometer */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali font-semibold text-slate-800">
                      {row.endOdometer !== undefined ? toNepaliDigits(row.endOdometer.toFixed(1)) : '-'}
                    </td>

                    {/* Odometer Distance */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali font-black bg-indigo-50/30 text-indigo-950">
                      {hasRecord ? `${toNepaliDigits(row.distanceKm.toFixed(1))} KM` : '-'}
                    </td>

                    {/* Logbook Trips Distance */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali font-medium text-slate-600">
                      {row.tripsDistance > 0 ? `${toNepaliDigits(row.tripsDistance.toFixed(1))} KM` : '-'}
                      {row.tripsCount > 0 && (
                        <span className="text-[10px] text-slate-400 block">({toNepaliDigits(row.tripsCount)} यात्रा)</span>
                      )}
                    </td>

                    {/* Variance */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali text-[11px]">
                      {hasRecord ? (
                        row.variance === 0 ? (
                          <span className="text-emerald-600 font-bold">०.० (बराबर)</span>
                        ) : row.variance > 0 ? (
                          <span className="text-amber-700 font-bold">+{toNepaliDigits(row.variance.toFixed(1))}</span>
                        ) : (
                          <span className="text-rose-600 font-bold">{toNepaliDigits(row.variance.toFixed(1))}</span>
                        )
                      ) : '-'}
                    </td>

                    {/* Fuel */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali font-semibold text-amber-700">
                      {row.fuelLiters > 0 ? `${toNepaliDigits(row.fuelLiters.toFixed(1))} L` : '-'}
                    </td>

                    {/* Mileage */}
                    <td className="p-2.5 border-r border-slate-200 text-right font-nepali font-bold text-emerald-700">
                      {row.mileage > 0 ? `${toNepaliDigits(row.mileage.toFixed(2))}` : '-'}
                    </td>

                    {/* Remarks */}
                    <td className="p-2.5 border-r border-slate-200 text-slate-500 italic font-nepali text-[11px]">
                      {row.record?.remarks || '-'}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center print:hidden">
                      {hasRecord ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(row.record!)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Edit2 size={15} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`${row.monthInfo.name} महिनाको ओडोमिटर रेकर्ड हटाउन निश्चित हुनुहुन्छ?`)) {
                                  onDeleteOdometer?.(row.record!.id);
                                }
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="हटाउनुहोस्"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenAdd(row.monthInfo.id)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all font-nepali flex items-center justify-center gap-1 mx-auto"
                        >
                          <Plus size={12} />
                          <span>प्रविष्टि</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total Footer Row */}
              <tr className="bg-slate-150 font-black text-slate-950 border-t-2 border-slate-800 text-xs">
                <td colSpan={4} className="p-2.5 text-right font-nepali border-r border-slate-300">
                  कुल वार्षिक जम्मा (Annual Grand Total):
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300">
                  {annualSummary.openingOdometer !== undefined ? toNepaliDigits(annualSummary.openingOdometer.toFixed(1)) : '-'}
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300">
                  {annualSummary.latestClosingOdometer !== undefined ? toNepaliDigits(annualSummary.latestClosingOdometer.toFixed(1)) : '-'}
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300 bg-indigo-100 text-indigo-950 font-black">
                  {toNepaliDigits(annualSummary.totalDistance.toFixed(1))} KM
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300 text-slate-800">
                  {toNepaliDigits(annualSummary.totalTripsDistance.toFixed(1))} KM
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300 text-slate-800">
                  {toNepaliDigits((annualSummary.totalDistance - annualSummary.totalTripsDistance).toFixed(1))} KM
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300 text-amber-850">
                  {toNepaliDigits(annualSummary.totalFuel.toFixed(1))} L
                </td>
                <td className="p-2.5 text-right font-nepali border-r border-slate-300 text-emerald-850">
                  {annualSummary.avgMileage > 0 ? toNepaliDigits(annualSummary.avgMileage.toFixed(2)) : '-'}
                </td>
                <td className="p-2.5 border-r border-slate-300"></td>
                <td className="p-2.5 print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Printable Signatures Block */}
        <div className="hidden print:grid grid-cols-3 gap-8 mt-16 pt-8 text-center text-xs font-nepali border-t border-slate-400">
          <div className="space-y-1">
            <div className="w-36 mx-auto border-b border-dashed border-slate-900 h-10"></div>
            <p className="font-bold text-slate-950">{selectedDriver || generalSettings?.ambulanceDriverName || 'एम्बुलेन्स चालक'}</p>
            <p className="text-[10px] text-slate-600">एम्बुलेन्स चालक</p>
            <p className="text-[10px] text-slate-500">मिति: ........................</p>
          </div>
          <div className="space-y-1">
            <div className="w-36 mx-auto border-b border-dashed border-slate-900 h-10"></div>
            <p className="font-bold text-slate-950">स्वास्थ्य शाखा प्रमुख</p>
            <p className="text-[10px] text-slate-600">जाँच तथा रुजु गर्ने</p>
            <p className="text-[10px] text-slate-500">मिति: ........................</p>
          </div>
          <div className="space-y-1">
            <div className="w-36 mx-auto border-b border-dashed border-slate-900 h-10"></div>
            <p className="font-bold text-slate-950">{currentUser?.fullName || 'प्रमुख प्रशासकीय अधिकृत'}</p>
            <p className="text-[10px] text-slate-600">स्वीकृत गर्ने अधिकारी</p>
            <p className="text-[10px] text-slate-500">मिति: ........................</p>
          </div>
        </div>
      </div>

      {/* Modal Form for Add/Edit Odometer Record */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Gauge size={22} className="text-indigo-200" />
                <div>
                  <h3 className="font-bold text-base font-nepali">
                    {editingRecord ? 'ओडोमिटर रेकर्ड सम्पादन गर्नुहोस्' : 'नयाँ मासिक ओडोमिटर प्रविष्टि'}
                  </h3>
                  <p className="text-xs text-indigo-100 font-nepali">
                    महिनाको सुरु र अन्तिम ओडोमिटर कि.मि. सेट गर्नुहोस्
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Fiscal Year */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-nepali flex items-center gap-1">
                    आर्थिक वर्ष *
                  </label>
                  <select
                    value={formData.fiscalYear}
                    onChange={e => {
                      const newFy = e.target.value;
                      const autoStart = getPreviousMonthEndOdometer(formData.month, formData.ambulanceNo, newFy);
                      setFormData(prev => ({
                        ...prev,
                        fiscalYear: newFy,
                        startOdometer: autoStart !== null ? String(autoStart) : prev.startOdometer
                      }));
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {FISCAL_YEARS.map(fy => (
                      <option key={fy.id} value={fy.value}>{fy.label} ({fy.value})</option>
                    ))}
                  </select>
                </div>

                {/* Month */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-nepali flex items-center gap-1">
                    महिना (Month) *
                  </label>
                  <select
                    value={formData.month}
                    onChange={e => {
                      const newMonth = e.target.value;
                      const autoStart = getPreviousMonthEndOdometer(newMonth, formData.ambulanceNo, formData.fiscalYear);
                      setFormData(prev => ({
                        ...prev,
                        month: newMonth,
                        startOdometer: autoStart !== null ? String(autoStart) : prev.startOdometer
                      }));
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    {NEPALI_FY_MONTHS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-nepali">
                    एम्बुलेन्स / गाडी नं.
                  </label>
                  <input
                    type="text"
                    placeholder="जस्तै: बा १ झ ९४८८"
                    value={formData.ambulanceNo}
                    onChange={e => {
                      const newVeh = e.target.value;
                      const autoStart = getPreviousMonthEndOdometer(formData.month, newVeh, formData.fiscalYear);
                      setFormData(prev => ({
                        ...prev,
                        ambulanceNo: newVeh,
                        startOdometer: autoStart !== null ? String(autoStart) : prev.startOdometer
                      }));
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-nepali">
                    चालकको नाम (Driver)
                  </label>
                  <input
                    type="text"
                    placeholder="चालकको नाम"
                    value={formData.driverName}
                    onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Start & End Odometer */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-900 font-nepali flex items-center gap-1.5">
                    <Gauge size={14} className="text-indigo-600" />
                    ओडोमिटर रिडिङ (कि.मि.)
                  </span>

                  {/* Auto-fill Button */}
                  {(() => {
                    const prevEnd = getPreviousMonthEndOdometer(formData.month, formData.ambulanceNo, formData.fiscalYear);
                    if (prevEnd !== null && String(prevEnd) !== formData.startOdometer) {
                      return (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, startOdometer: String(prevEnd) }))}
                          className="text-[10px] bg-white text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1 font-nepali"
                        >
                          <Sparkles size={11} className="text-amber-500" />
                          <span>अघिल्लो महिनाबाट तान्नुहोस् ({toNepaliDigits(prevEnd.toFixed(1))})</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 font-nepali">
                      सुरु ओडोमिटर (Opening KM) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="जस्तै: 10450"
                      value={formData.startOdometer}
                      onChange={e => setFormData({ ...formData, startOdometer: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 font-nepali">
                      अन्तिम ओडोमिटर (Closing KM) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="जस्तै: 11200"
                      value={formData.endOdometer}
                      onChange={e => setFormData({ ...formData, endOdometer: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Live Distance Calculation Banner */}
                {formData.startOdometer && formData.endOdometer && !isNaN(parseFloat(formData.startOdometer)) && !isNaN(parseFloat(formData.endOdometer)) && (
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl flex items-center justify-between text-xs font-nepali font-bold">
                    <span>यस महिनाको तय दूरी (Total Distance):</span>
                    <span className="text-sm font-mono text-amber-300">
                      {toNepaliDigits((parseFloat(formData.endOdometer) - parseFloat(formData.startOdometer)).toFixed(1))} कि.मि.
                    </span>
                  </div>
                )}
              </div>

              {/* Fuel Liters (Optional) & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-nepali flex items-center gap-1">
                    <Fuel size={13} className="text-amber-600" />
                    महिनाको कुल इन्धन (Liters)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="वैकल्पिक (Optional)"
                    value={formData.fuelLiters}
                    onChange={e => setFormData({ ...formData, fuelLiters: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-nepali">
                    कैफियत (Remarks)
                  </label>
                  <input
                    type="text"
                    placeholder="थप विवरण वा टिप्पणी"
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all font-nepali"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all font-nepali active:scale-95"
                >
                  {editingRecord ? 'सुरक्षित गर्नुहोस् (Update)' : 'रेकर्ड राख्नुहोस् (Save Record)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
