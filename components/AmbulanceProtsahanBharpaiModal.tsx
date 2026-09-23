import React, { useState, useMemo, useEffect } from 'react';
import { Printer, Download, X, Settings2, FileText, Check, Calendar, Filter, User as UserIcon } from 'lucide-react';
import { FISCAL_YEARS } from '../constants';
import { AmbulanceRecord } from '../types';
import { getDriverMonthlyIncentive } from '../lib/ambulanceIncentiveUtils';

const NEPALI_MONTH_OPTIONS = [
  { value: '01', label: 'बैशाख (Baisakh)', name: 'बैशाख' },
  { value: '02', label: 'जेठ (Jestha)', name: 'जेठ' },
  { value: '03', label: 'असार (Ashadh)', name: 'असार' },
  { value: '04', label: 'साउन (Shrawan)', name: 'श्रावण' },
  { value: '05', label: 'भदौ (Bhadra)', name: 'भाद्र' },
  { value: '06', label: 'असोज (Ashwin)', name: 'असोज' },
  { value: '07', label: 'कार्तिक (Kartik)', name: 'कार्तिक' },
  { value: '08', label: 'मंसिर (Mangsir)', name: 'मंसिर' },
  { value: '09', label: 'पुष (Poush)', name: 'पुष' },
  { value: '10', label: 'माघ (Magh)', name: 'माघ' },
  { value: '11', label: 'फागुन (Falgun)', name: 'फागुन' },
  { value: '12', label: 'चैत्र (Chaitra)', name: 'चैत्र' },
];

const PRESET_PERIODS = [
  { value: '04,05', label: 'श्रावण र भाद्र (Shrawan & Bhadra)', text: 'श्रावण र भाद्र' },
  { value: '06,07', label: 'असोज र कार्तिक (Ashwin & Kartik)', text: 'असोज र कार्तिक' },
  { value: '08,09', label: 'मंसिर र पुष (Mangsir & Poush)', text: 'मंसिर र पुष' },
  { value: '10,11', label: 'माघ र फागुन (Magh & Falgun)', text: 'माघ र फागुन' },
  { value: '12,01', label: 'चैत्र र बैशाख (Chaitra & Baisakh)', text: 'चैत्र र बैशाख' },
  { value: '02,03', label: 'जेठ र असार (Jestha & Ashadh)', text: 'जेठ र असार' },
  { value: '04,05,06,07', label: 'प्रथम चौमासिक (श्रावण-कार्तिक)', text: 'प्रथम चौमासिक (श्रावण-कार्तिक)' },
  { value: '08,09,10,11', label: 'दोस्रो चौमासिक (मंसिर-फागुन)', text: 'दोस्रो चौमासिक (मंसिर-फागुन)' },
  { value: '12,01,02,03', label: 'तेस्रो चौमासिक (चैत्र-असार)', text: 'तेस्रो चौमासिक (चैत्र-असार)' },
  { value: 'all', label: 'वार्षिक / सबै महिना (All Months)', text: 'श्रावण देखि आषाढ' },
];

interface AmbulanceProtsahanBharpaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambulanceRecords?: AmbulanceRecord[];
  initialFiscalYear?: string;
  initialMonth?: string;
  initialDriver?: string;
  ambulanceDriverIncentivePercent?: number;
  useNepaliNumerals: boolean;
  toNepaliDigits: (num: any) => string;
  generalSettings?: any;
  currentUser?: any;
}

interface DriverBharpaiRow {
  id: string;
  sn: number;
  driverName: string;
  ambulanceNo: string;
  tripCount: number;
  totalDistance: number;
  totalFare: number;
  incentiveAmount: number;
  taxDeduction: number;
  netPaidAmount: number;
  remarks: string;
}

export const AmbulanceProtsahanBharpaiModal: React.FC<AmbulanceProtsahanBharpaiModalProps> = ({
  isOpen,
  onClose,
  ambulanceRecords = [],
  initialFiscalYear = '2081/082',
  initialMonth = '04',
  initialDriver = 'All',
  ambulanceDriverIncentivePercent = 15,
  useNepaliNumerals,
  toNepaliDigits,
  generalSettings,
  currentUser
}) => {
  // Modal internal filters
  const [selectedFy, setSelectedFy] = useState<string>(initialFiscalYear);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>(initialMonth);
  const [selectedDriver, setSelectedDriver] = useState<string>(initialDriver);
  const [taxPercent, setTaxPercent] = useState<number>(15); // Default 15% TDS
  const [decisionDate, setDecisionDate] = useState<string>('२०८१।०६।०२');
  const [periodText, setPeriodText] = useState<string>('श्रावण र भाद्र');
  const [customRemarks, setCustomRemarks] = useState<Record<string, string>>({});
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  // Effective incentive percent from Firebase settings or props
  const effectiveIncentivePercent = useMemo(() => {
    if (generalSettings?.ambulanceDriverIncentivePercent !== undefined) {
      return Number(generalSettings.ambulanceDriverIncentivePercent);
    }
    return Number(ambulanceDriverIncentivePercent) || 15;
  }, [generalSettings?.ambulanceDriverIncentivePercent, ambulanceDriverIncentivePercent]);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialFiscalYear) setSelectedFy(initialFiscalYear);
      if (initialMonth) {
        setSelectedPeriodValue(initialMonth);
        updatePeriodTextForValue(initialMonth);
      }
      if (initialDriver) setSelectedDriver(initialDriver);
    }
  }, [isOpen, initialFiscalYear, initialMonth, initialDriver]);

  const updatePeriodTextForValue = (val: string) => {
    const preset = PRESET_PERIODS.find(p => p.value === val);
    if (preset) {
      setPeriodText(preset.text);
      return;
    }
    const singleMonth = NEPALI_MONTH_OPTIONS.find(m => m.value === val);
    if (singleMonth) {
      setPeriodText(singleMonth.name);
      return;
    }
    if (val === 'all') {
      setPeriodText('श्रावण देखि आषाढ');
    }
  };

  const handlePeriodChange = (val: string) => {
    setSelectedPeriodValue(val);
    updatePeriodTextForValue(val);
  };

  const formatSafeNumber = (val: number | null | undefined, keepDecimalsIfAny = true): string => {
    if (val === null || val === undefined) return '';
    const num = Number(val);
    if (isNaN(num)) return '';
    if (keepDecimalsIfAny) {
      if (num % 1 === 0) return num.toString();
      return num.toFixed(2).replace(/\.?0+$/, '');
    }
    return num.toFixed(2);
  };

  // Driver options
  const driverOptions = useMemo(() => {
    const set = new Set<string>();
    if (generalSettings?.ambulanceDriverName?.trim()) {
      set.add(generalSettings.ambulanceDriverName.trim());
    }
    (ambulanceRecords || []).forEach(r => {
      if (r.driverName?.trim()) set.add(r.driverName.trim());
    });
    return Array.from(set).sort();
  }, [ambulanceRecords, generalSettings?.ambulanceDriverName]);

  // 1. Filter raw ambulance trips based on modal's filters
  const filteredTrips = useMemo(() => {
    const activeMonths = selectedPeriodValue === 'all'
      ? []
      : selectedPeriodValue.split(',').map(m => parseInt(m.trim()));

    return ambulanceRecords.filter(record => {
      // Fiscal Year match
      if (selectedFy && record.fiscalYear?.trim() !== selectedFy.trim()) {
        return false;
      }

      // Month match
      if (selectedPeriodValue !== 'all' && activeMonths.length > 0) {
        const dateStr = record.dateBs || '';
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length < 2) return false;
        const recordMonthParsed = parseInt(dateParts[1]);
        if (!activeMonths.includes(recordMonthParsed)) {
          return false;
        }
      }

      // Driver filter
      if (selectedDriver !== 'All') {
        if ((record.driverName || '').trim().toLowerCase() !== selectedDriver.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [ambulanceRecords, selectedFy, selectedPeriodValue, selectedDriver]);

  // 2. Aggregate per driver
  const bharpaiRows: DriverBharpaiRow[] = useMemo(() => {
    interface Accumulator {
      driverName: string;
      ambulanceNo: string;
      tripCount: number;
      totalDistance: number;
      totalFare: number;
      incentiveAmount: number;
    }

    const map = new Map<string, Accumulator>();

    filteredTrips.forEach(trip => {
      const driver = trip.driverName?.trim() || 'अज्ञात चालक';
      const fare = Number(trip.receivedAmount) || 0;
      const inc = fare * (effectiveIncentivePercent / 100);
      const dist = Number(trip.distanceKm) || 0;

      const existing = map.get(driver) || {
        driverName: driver,
        ambulanceNo: trip.ambulanceNo || '-',
        tripCount: 0,
        totalDistance: 0,
        totalFare: 0,
        incentiveAmount: 0
      };

      existing.tripCount += 1;
      existing.totalDistance += dist;
      existing.totalFare += fare;
      existing.incentiveAmount += inc;

      if (trip.ambulanceNo && (existing.ambulanceNo === '-' || !existing.ambulanceNo)) {
        existing.ambulanceNo = trip.ambulanceNo;
      }

      map.set(driver, existing);
    });

    const rows: DriverBharpaiRow[] = [];
    let snCounter = 1;

    Array.from(map.values())
      .sort((a, b) => b.incentiveAmount - a.incentiveAmount)
      .forEach(item => {
        const incAmt = item.incentiveAmount || 0;
        const taxAmt = (incAmt * (taxPercent / 100)) || 0;
        const netPaid = (incAmt - taxAmt) || 0;
        const rowId = `driver_${item.driverName}`;

        rows.push({
          id: rowId,
          sn: snCounter++,
          driverName: item.driverName,
          ambulanceNo: item.ambulanceNo,
          tripCount: item.tripCount,
          totalDistance: item.totalDistance,
          totalFare: item.totalFare,
          incentiveAmount: incAmt,
          taxDeduction: taxAmt,
          netPaidAmount: netPaid,
          remarks: customRemarks[rowId] ?? ''
        });
      });

    return rows;
  }, [filteredTrips, ambulanceDriverIncentivePercent, taxPercent, customRemarks]);

  // Grand Totals
  const grandTripCount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + r.tripCount, 0);
  }, [bharpaiRows]);

  const grandDistance = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + r.totalDistance, 0);
  }, [bharpaiRows]);

  const grandTotalFare = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + r.totalFare, 0);
  }, [bharpaiRows]);

  const grandIncentiveAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + r.incentiveAmount, 0);
  }, [bharpaiRows]);

  const grandTaxAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + r.taxDeduction, 0);
  }, [bharpaiRows]);

  const grandNetPaidAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + r.netPaidAmount, 0);
  }, [bharpaiRows]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (bharpaiRows.length === 0) return;

    const headers = [
      'क्र.सं.',
      'चालकको नाम',
      'एम्बुलेन्स नं.',
      'ट्रिप संख्या',
      'जम्मा दुरी (कि.मि.)',
      'जम्मा भाडा रकम',
      'प्रोत्साहन रकम',
      'करकट्टी',
      'जम्मा बुझेको रकम',
      'हस्ताक्षर',
      'कैफियत'
    ];

    const rows = bharpaiRows.map(r => [
      r.sn.toString(),
      r.driverName || '',
      r.ambulanceNo || '',
      r.tripCount.toString(),
      r.totalDistance.toFixed(2),
      r.totalFare.toFixed(2),
      r.incentiveAmount.toFixed(2),
      r.taxDeduction.toFixed(2),
      r.netPaidAmount.toFixed(2),
      '',
      r.remarks || ''
    ]);

    rows.push([
      'जम्मा',
      '',
      '',
      grandTripCount.toString(),
      grandDistance.toFixed(2),
      grandTotalFare.toFixed(2),
      grandIncentiveAmount.toFixed(2),
      grandTaxAmount.toFixed(2),
      grandNetPaidAmount.toFixed(2),
      '',
      ''
    ]);

    const headerTitle = `आ.व. ${selectedFy} मिति ${decisionDate} गतेको निर्णयानुसार भुक्तानी भएको ${periodText} महिनाको एम्बुलेन्स चालक प्रोत्साहन रकमको भरपाई`;

    const csvContent = '\uFEFF' + [
      `"${headerTitle}"`,
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ambulance_Driver_Protsahan_Bharpai_${selectedFy.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const displayFiscalYear = useNepaliNumerals ? toNepaliDigits(selectedFy) : selectedFy;
  const displayDecisionDate = useNepaliNumerals ? toNepaliDigits(decisionDate) : decisionDate;

  return (
    <>
      {/* Clean Print Style so Driver Bharpai renders fully and clearly in print preview */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: landscape;
                margin: 8mm;
              }
              body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .driver-bharpai-modal-overlay {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                display: block !important;
                inset: auto !important;
                z-index: auto !important;
              }
              .driver-bharpai-modal-container {
                position: static !important;
                max-height: none !important;
                max-width: 100% !important;
                width: 100% !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                overflow: visible !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .driver-bharpai-print-sheet {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                display: block !important;
                overflow: visible !important;
              }
            }
          `
        }}
      />

      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto driver-bharpai-modal-overlay">
        <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto driver-bharpai-modal-container">
          
          {/* Top Control Bar - Hide on print */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 border-b border-slate-200 bg-slate-50 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-nepali">
                  एम्बुलेन्स चालक प्रोत्साहन रकमको भरपाई (Driver Bharpai Preview)
                </h3>
                <p className="text-xs text-slate-500 font-nepali font-medium">
                  महिना र आ.व. अनुसार एम्बुलेन्स चालकहरूको प्रोत्साहन भुक्तानी र करकट्टी भरपाई।
                </p>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Fiscal Year Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-2xs">
                <Calendar size={13} className="text-amber-600" />
                <span className="text-slate-500 text-[11px] font-nepali">आ.व.:</span>
                <select
                  value={selectedFy}
                  onChange={(e) => setSelectedFy(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer font-mono"
                >
                  {FISCAL_YEARS.map(fy => (
                    <option key={fy.id} value={fy.value}>
                      {useNepaliNumerals ? toNepaliDigits(fy.label) : fy.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month / Period Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-2xs">
                <Filter size={13} className="text-emerald-600" />
                <span className="text-slate-500 text-[11px] font-nepali">महिना:</span>
                <select
                  value={selectedPeriodValue}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer font-nepali max-w-[160px]"
                >
                  <optgroup label="संयुक्त / चौमासिक अवधि">
                    {PRESET_PERIODS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="एकल महिना (Single Month)">
                    {NEPALI_MONTH_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Driver Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-2xs">
                <UserIcon size={13} className="text-blue-600" />
                <span className="text-slate-500 text-[11px] font-nepali">चालक:</span>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer font-nepali max-w-[130px]"
                >
                  <option value="All">सबै चालकहरू</option>
                  {driverOptions.map(dr => (
                    <option key={dr} value={dr}>{dr}</option>
                  ))}
                </select>
              </div>

              {/* Settings button */}
              <button
                type="button"
                onClick={() => setIsEditingSettings(!isEditingSettings)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isEditingSettings ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Settings2 size={14} />
                मिति/कर
              </button>

              {/* CSV Export */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Download size={14} className="text-emerald-600" />
                CSV
              </button>

              {/* Print Bharpai Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Printer size={15} />
                भरपाई प्रिन्ट गर्नुहोस्
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-all ml-1"
                title="बन्द गर्नुहोस्"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Optional Settings Panel - Hide on print */}
          {isEditingSettings && (
            <div className="p-4 bg-amber-50/40 border-b border-amber-100 flex flex-wrap items-center gap-4 text-xs print:hidden">
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-700 font-nepali">निर्णय मिति (Decision Date):</label>
                <input
                  type="text"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  placeholder="उदा: २०८१।०६।०२"
                  className="p-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500 font-nepali"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-700 font-nepali">महिना / अवधि व्यहोरा (Period Text):</label>
                <input
                  type="text"
                  value={periodText}
                  onChange={(e) => setPeriodText(e.target.value)}
                  placeholder="उदा: श्रावण र भाद्र"
                  className="p-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500 font-nepali w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-700 font-nepali">करकट्टी (TDS %):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-16 p-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500 text-right font-mono"
                />
                <span className="font-bold text-slate-600">%</span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="ml-auto px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 flex items-center gap-1 transition-all"
              >
                <Check size={13} />
                बन्द गर्नुहोस्
              </button>
            </div>
          )}

          {/* Driver Bharpai Document Print Sheet */}
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white print:p-0 print:overflow-visible driver-bharpai-print-sheet">
            <div className="max-w-5xl mx-auto space-y-4 print:w-full print:max-w-none">
              
              {/* Top Official Header */}
              <div className="text-center pt-2 pb-2">
                <h2 className="text-sm md:text-base font-bold font-nepali text-slate-950 tracking-normal leading-relaxed">
                  आ.व. {displayFiscalYear} मिति {displayDecisionDate} गतेको निर्णयानुसार भुक्तानी भएको {periodText} महिनाको एम्बुलेन्स चालक सेवा प्रोत्साहन रकमको भरपाई
                </h2>
              </div>

              {/* Driver Bharpai Table */}
              <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-950">
                <thead>
                  <tr className="bg-slate-100 font-nepali">
                    <th className="border-2 border-slate-950 p-2 text-center font-bold w-12">क्र.सं.</th>
                    <th className="border-2 border-slate-950 p-2 text-left font-bold min-w-[140px]">चालकको नाम</th>
                    <th className="border-2 border-slate-950 p-2 text-center font-bold w-28">एम्बुलेन्स नं.</th>
                    <th className="border-2 border-slate-950 p-2 text-center font-bold w-20">ट्रिप</th>
                    <th className="border-2 border-slate-950 p-2 text-right font-bold w-24">दुरी (कि.मि.)</th>
                    <th className="border-2 border-slate-950 p-2 text-right font-bold w-28">जम्मा भाडा</th>
                    <th className="border-2 border-slate-950 p-2 text-right font-bold w-28">प्रोत्साहन रकम</th>
                    <th className="border-2 border-slate-950 p-2 text-right font-bold w-24">करकट्टी</th>
                    <th className="border-2 border-slate-950 p-2 text-right font-bold w-32">जम्मा बुझेको रकम</th>
                    <th className="border-2 border-slate-950 p-2 text-center font-bold w-24">हस्ताक्षर</th>
                    <th className="border-2 border-slate-950 p-2 text-left font-bold min-w-[120px]">कैफियत</th>
                  </tr>
                </thead>
                <tbody>
                  {bharpaiRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="border border-slate-950 p-6 text-center text-slate-500 font-nepali">
                        चयन गरिएको आर्थिक वर्ष ({displayFiscalYear}) र महिना ({periodText}) मा कुनै एम्बुलेन्स चालक प्रोत्साहन रेकर्ड फेला परेन।
                      </td>
                    </tr>
                  ) : (
                    bharpaiRows.map((row) => {
                      const distFormatted = formatSafeNumber(row.totalDistance);
                      const fareFormatted = formatSafeNumber(row.totalFare);
                      const incFormatted = formatSafeNumber(row.incentiveAmount);
                      const taxFormatted = formatSafeNumber(row.taxDeduction);
                      const netPaidFormatted = formatSafeNumber(row.netPaidAmount);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="border border-slate-950 p-1.5 md:p-2 text-center font-bold font-nepali">
                            {toNepaliDigits(row.sn)}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 font-bold font-nepali text-slate-950">
                            {row.driverName}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-center font-mono font-medium">
                            {row.ambulanceNo}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-center font-mono font-bold">
                            {useNepaliNumerals ? toNepaliDigits(row.tripCount) : row.tripCount}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-medium">
                            {distFormatted ? (useNepaliNumerals ? toNepaliDigits(distFormatted) : distFormatted) : '०'}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-medium">
                            {useNepaliNumerals ? toNepaliDigits(fareFormatted || '0') : (fareFormatted || '0')}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-bold text-slate-950">
                            {useNepaliNumerals ? toNepaliDigits(incFormatted || '0') : (incFormatted || '0')}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-medium text-slate-900">
                            {useNepaliNumerals ? toNepaliDigits(taxFormatted || '0') : (taxFormatted || '0')}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-bold text-slate-950">
                            {useNepaliNumerals ? toNepaliDigits(netPaidFormatted || '0') : (netPaidFormatted || '0')}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-center">
                            {/* Signature Area */}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-xs font-nepali">
                            <span className="print:block hidden">{row.remarks}</span>
                            <input
                              type="text"
                              value={customRemarks[row.id] ?? row.remarks}
                              onChange={(e) => {
                                setCustomRemarks({
                                  ...customRemarks,
                                  [row.id]: e.target.value
                                });
                              }}
                              placeholder="कैफियत..."
                              className="w-full text-xs p-1 bg-transparent border-b border-transparent focus:border-amber-400 outline-none print:hidden font-nepali"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Grand Total Row */}
                  {bharpaiRows.length > 0 && (
                    <tr className="bg-slate-50 font-bold border-2 border-slate-950">
                      <td colSpan={3} className="border-2 border-slate-950 p-2 text-center font-black font-nepali text-slate-950">
                        जम्मा
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-center font-mono font-black text-slate-950">
                        {useNepaliNumerals ? toNepaliDigits(grandTripCount) : grandTripCount}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandDistance)) 
                          : formatSafeNumber(grandDistance)}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandTotalFare)) 
                          : formatSafeNumber(grandTotalFare)}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandIncentiveAmount)) 
                          : formatSafeNumber(grandIncentiveAmount)}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandTaxAmount)) 
                          : formatSafeNumber(grandTaxAmount)}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandNetPaidAmount)) 
                          : formatSafeNumber(grandNetPaidAmount)}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-center"></td>
                      <td className="border-2 border-slate-950 p-2 text-center"></td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Official Signatures Block */}
              <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs font-nepali font-bold text-slate-900 print:pt-14">
                <div className="space-y-1">
                  <div className="border-t-2 border-slate-950 pt-1.5 w-40 mx-auto"></div>
                  <p>तयार गर्ने</p>
                  <p className="text-[11px] font-normal text-slate-700">(कर्मचारी / स्वास्थ्य शाखा)</p>
                </div>
                <div className="space-y-1">
                  <div className="border-t-2 border-slate-950 pt-1.5 w-40 mx-auto"></div>
                  <p>जाँच गर्ने / लेखा</p>
                  <p className="text-[11px] font-normal text-slate-700">(लेखा अधिकृत)</p>
                </div>
                <div className="space-y-1">
                  <div className="border-t-2 border-slate-950 pt-1.5 w-40 mx-auto"></div>
                  <p>स्वीकृत गर्ने</p>
                  <p className="text-[11px] font-normal text-slate-700">(कार्यालय प्रमुख)</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
};
