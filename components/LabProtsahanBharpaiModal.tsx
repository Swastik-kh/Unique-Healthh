import React, { useState, useMemo, useEffect } from 'react';
import { Printer, Download, X, Settings2, FileText, Check, Calendar, Filter } from 'lucide-react';
import { FISCAL_YEARS } from '../constants';
import { BillingRecord, User } from '../types';

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

interface ProtsahanRecipient {
  id: string;
  nameNe: string;
  nameEn: string;
  sharePercent: number;
  isSystemReferrer?: boolean;
  staffName?: string;
}

interface ReferrerSummaryItem {
  name: string;
  netLabAmount?: number;
  totalIncentive?: number;
  referrerShare?: number;
  incentiveAmount?: number;
}

interface LabProtsahanBharpaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  allBillingRecordsCombined?: BillingRecord[];
  initialFiscalYear?: string;
  initialMonth?: string;
  protsahanByReferrer?: ReferrerSummaryItem[];
  protsahanRecipients: ProtsahanRecipient[];
  protsahanReportData?: any[];
  labIncentivePercent?: number;
  users?: User[];
  getServiceCategory?: (serviceName: string, categoryFromItem?: string) => string;
  useNepaliNumerals: boolean;
  toNepaliDigits: (num: any) => string;
  generalSettings?: any;
  currentUser?: any;
}

interface BharpaiRow {
  id: string;
  sn: number;
  staffName: string;
  role: string;
  grossLabAmount: number | null;
  incentiveAmount: number;
  taxDeduction: number;
  netPaidAmount: number;
  remarks: string;
}

export const LabProtsahanBharpaiModal: React.FC<LabProtsahanBharpaiModalProps> = ({
  isOpen,
  onClose,
  allBillingRecordsCombined = [],
  initialFiscalYear = '2081/082',
  initialMonth = '04',
  protsahanRecipients = [],
  labIncentivePercent = 10,
  users = [],
  getServiceCategory = (_serviceName?: string, _categoryFromItem?: string) => 'Other',
  useNepaliNumerals,
  toNepaliDigits,
  generalSettings,
  currentUser
}) => {
  // Modal internal filters
  const [selectedFy, setSelectedFy] = useState<string>(initialFiscalYear);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>(initialMonth);
  const [taxPercent, setTaxPercent] = useState<number>(15); // Default 15% TDS as in official sample
  const [decisionDate, setDecisionDate] = useState<string>('२०८१।०६।०२');
  const [periodText, setPeriodText] = useState<string>('श्रावण र भाद्र');
  const [customRemarks, setCustomRemarks] = useState<Record<string, string>>({});
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialFiscalYear) setSelectedFy(initialFiscalYear);
      if (initialMonth) {
        setSelectedPeriodValue(initialMonth);
        updatePeriodTextForValue(initialMonth);
      }
    }
  }, [isOpen, initialFiscalYear, initialMonth]);

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

  const parseStaffNames = (staffName?: string): string[] => {
    if (!staffName) return [];
    return staffName
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
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

  // 1. Filter raw billing records based on modal's own FY and Month selection
  const filteredModalRecords = useMemo(() => {
    const activeMonths = selectedPeriodValue === 'all' 
      ? [] 
      : selectedPeriodValue.split(',').map(m => parseInt(m.trim()));

    return allBillingRecordsCombined.filter(record => {
      // Fiscal Year Match
      if (selectedFy && record.fiscalYear?.trim() !== selectedFy.trim()) {
        return false;
      }

      // Month Match
      if (selectedPeriodValue !== 'all' && activeMonths.length > 0) {
        const dateStr = record.billDate || '';
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length < 2) return false;
        const recordMonthParsed = parseInt(dateParts[1]);
        if (!activeMonths.includes(recordMonthParsed)) {
          return false;
        }
      }

      return true;
    });
  }, [allBillingRecordsCombined, selectedFy, selectedPeriodValue]);

  // 2. Compute Protsahan Report Data for the modal
  const modalProtsahanData = useMemo(() => {
    return filteredModalRecords.map(record => {
      let grossLabAmount = 0;
      record.items?.forEach(item => {
        if (item.isRefunded) return;
        const cat = getServiceCategory((item.serviceName || '').toLowerCase().trim(), item.category);
        if (cat === 'Lab') {
          grossLabAmount += item.total || 0;
        }
      });

      const billSubTotal = record.subTotal || 1;
      const billDiscount = record.discount || 0;
      const proRatedDiscount = (grossLabAmount / billSubTotal) * billDiscount;
      const netLabAmount = Math.max(0, grossLabAmount - proRatedDiscount);
      const totalIncentive = netLabAmount * (labIncentivePercent / 100);

      const recipientShares = protsahanRecipients.map(recipient => {
        const shareAmount = totalIncentive * (recipient.sharePercent / 100);
        return {
          id: recipient.id,
          nameNe: recipient.nameNe,
          nameEn: recipient.nameEn,
          staffName: recipient.staffName,
          sharePercent: recipient.sharePercent,
          shareAmount,
          isSystemReferrer: !!recipient.isSystemReferrer
        };
      });

      const referrerVal = record.referredBy;
      const referrerUser = users.find(u => u.id === referrerVal || u.username === referrerVal);
      const referrerName = referrerUser ? referrerUser.fullName : (referrerVal || '-');

      return {
        record,
        grossLabAmount,
        proRatedDiscount,
        netLabAmount,
        totalIncentive,
        referrerName,
        recipientShares,
        hasReferrer: !!referrerVal && referrerVal !== 'All' && referrerVal !== '-'
      };
    }).filter(d => d.grossLabAmount > 0);
  }, [filteredModalRecords, labIncentivePercent, protsahanRecipients, users, getServiceCategory]);

  // 3. Referrer Groupings for the modal
  const modalProtsahanByReferrer = useMemo(() => {
    const map = new Map<string, { netLabAmount: number; totalIncentive: number; referrerShare: number }>();
    modalProtsahanData.forEach(item => {
      const key = item.record.referredBy && item.record.referredBy !== 'All' && item.record.referredBy !== '-' ? item.referrerName : 'स्वतन्त्र (Self / direct)';
      const existing = map.get(key) || { netLabAmount: 0, totalIncentive: 0, referrerShare: 0 };
      
      const refShareObj = item.recipientShares.find(s => s.isSystemReferrer);
      const refShareAmount = refShareObj ? refShareObj.shareAmount : 0;

      map.set(key, {
        netLabAmount: existing.netLabAmount + item.netLabAmount,
        totalIncentive: existing.totalIncentive + item.totalIncentive,
        referrerShare: existing.referrerShare + refShareAmount
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [modalProtsahanData]);

  // 4. Build the complete Bharpai rows
  const bharpaiRows: BharpaiRow[] = useMemo(() => {
    const rows: BharpaiRow[] = [];
    let snCounter = 1;

    // 1. Referrers
    modalProtsahanByReferrer.forEach((ref) => {
      const grossAmt = typeof ref.netLabAmount === 'number' ? ref.netLabAmount : null;
      const incAmt = Number(ref.referrerShare ?? (ref as any).incentiveAmount ?? ref.totalIncentive ?? 0) || 0;
      const taxAmt = (incAmt * (taxPercent / 100)) || 0;
      const netPaid = (incAmt - taxAmt) || 0;
      const rowId = `ref_${ref.name || 'unnamed'}`;

      rows.push({
        id: rowId,
        sn: snCounter++,
        staffName: ref.name || 'अन्य सिफारिसकर्ता',
        role: 'सिफारिसकर्ता',
        grossLabAmount: grossAmt,
        incentiveAmount: incAmt,
        taxDeduction: taxAmt,
        netPaidAmount: netPaid,
        remarks: customRemarks[rowId] ?? ''
      });
    });

    // 2. Other pooled recipients (Lab Staff, Helper/Cleaner, etc.)
    const nonSystemRecipients = protsahanRecipients.filter(r => !r.isSystemReferrer);
    
    nonSystemRecipients.forEach(recipient => {
      const totalForRecipient = modalProtsahanData.reduce((sum, d) => {
        const share = d.recipientShares?.find((s: any) => s.id === recipient.id);
        return sum + (share && typeof share.shareAmount === 'number' ? share.shareAmount : 0);
      }, 0);

      const staffList = parseStaffNames(recipient.staffName);

      if (staffList.length > 0) {
        const perPersonIncentive = staffList.length > 0 ? (totalForRecipient / staffList.length) : 0;
        staffList.forEach((stName, idx) => {
          const incAmt = Number(perPersonIncentive) || 0;
          const taxAmt = (incAmt * (taxPercent / 100)) || 0;
          const netPaid = (incAmt - taxAmt) || 0;
          const rowId = `staff_${recipient.id}_${idx}_${stName}`;

          rows.push({
            id: rowId,
            sn: snCounter++,
            staffName: stName,
            role: recipient.nameNe || 'प्रयोगशालाकर्मी',
            grossLabAmount: null,
            incentiveAmount: incAmt,
            taxDeduction: taxAmt,
            netPaidAmount: netPaid,
            remarks: customRemarks[rowId] ?? ''
          });
        });
      } else {
        const incAmt = Number(totalForRecipient) || 0;
        const taxAmt = (incAmt * (taxPercent / 100)) || 0;
        const netPaid = (incAmt - taxAmt) || 0;
        const rowId = `role_${recipient.id}`;

        rows.push({
          id: rowId,
          sn: snCounter++,
          staffName: recipient.nameNe || 'प्रयोगशालाकर्मी',
          role: recipient.nameNe || 'प्रयोगशालाकर्मी',
          grossLabAmount: null,
          incentiveAmount: incAmt,
          taxDeduction: taxAmt,
          netPaidAmount: netPaid,
          remarks: customRemarks[rowId] ?? ''
        });
      }
    });

    return rows;
  }, [modalProtsahanByReferrer, protsahanRecipients, modalProtsahanData, taxPercent, customRemarks]);

  // Grand Totals
  const grandGrossAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + (Number(r.grossLabAmount) || 0), 0);
  }, [bharpaiRows]);

  const grandIncentiveAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + (Number(r.incentiveAmount) || 0), 0);
  }, [bharpaiRows]);

  const grandTaxAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + (Number(r.taxDeduction) || 0), 0);
  }, [bharpaiRows]);

  const grandNetPaidAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + (Number(r.netPaidAmount) || 0), 0);
  }, [bharpaiRows]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (bharpaiRows.length === 0) return;

    const headers = [
      'क्र.सं.',
      'कर्मचारीको नाम',
      'भूमिका',
      'जम्मा रकम',
      'प्रोत्साहन रकम',
      'करकट्टी',
      'जम्मा बुझेको रकम',
      'हस्ताक्षर',
      'कैफियत'
    ];

    const rows = bharpaiRows.map(r => [
      r.sn.toString(),
      r.staffName || '',
      r.role || '',
      r.grossLabAmount !== null ? (Number(r.grossLabAmount) || 0).toFixed(2) : '',
      (Number(r.incentiveAmount) || 0).toFixed(2),
      (Number(r.taxDeduction) || 0).toFixed(2),
      (Number(r.netPaidAmount) || 0).toFixed(2),
      '',
      r.remarks || ''
    ]);

    // Grand total row
    rows.push([
      'जम्मा',
      '',
      '',
      (grandGrossAmount || 0).toFixed(2),
      (grandIncentiveAmount || 0).toFixed(2),
      (grandTaxAmount || 0).toFixed(2),
      (grandNetPaidAmount || 0).toFixed(2),
      '',
      ''
    ]);

    const headerTitle = `आ.व. ${selectedFy} मिति ${decisionDate} गतेको निर्णयानुसार भुक्तानी भएको ${periodText} महिनाको प्रयोगशाला प्रोत्साहन रकमको भरपाई`;

    const csvContent = '\uFEFF' + [
      `"${headerTitle}"`,
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Lab_Protsahan_Bharpai_${selectedFy.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const displayFiscalYear = useNepaliNumerals ? toNepaliDigits(selectedFy) : selectedFy;
  const displayDecisionDate = useNepaliNumerals ? toNepaliDigits(decisionDate) : decisionDate;

  return (
    <>
      {/* Isolation Print Style so ONLY the Bharpai sheet prints */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body > *:not(#root) {
                display: none !important;
              }
              .print-bharpai-only {
                display: block !important;
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                min-height: 100vh !important;
                background: white !important;
                margin: 0 !important;
                padding: 1.5cm !important;
                z-index: 999999 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `
        }}
      />

      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:static print:bg-transparent print:backdrop-blur-none print:overflow-visible">
        <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto print:fixed print:inset-0 print:m-0 print:p-0 print:border-none print:rounded-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible print:w-full print:h-auto">
          
          {/* Top Control Bar - Hide on print */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 border-b border-slate-200 bg-slate-50 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 font-nepali">
                  प्रयोगशाला प्रोत्साहन रकमको भरपाई (Receipt / Bharpai Preview)
                </h3>
                <p className="text-xs text-slate-500 font-nepali font-medium">
                  महिना र आ.व. अनुसार कर्मचारीहरूको प्रोत्साहन भुक्तानी र करकट्टी भरपाई।
                </p>
              </div>
            </div>

            {/* Filter Controls Row Inside Bharpai Modal */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Fiscal Year Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-2xs">
                <Calendar size={13} className="text-indigo-600" />
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

              {/* Settings button */}
              <button
                type="button"
                onClick={() => setIsEditingSettings(!isEditingSettings)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isEditingSettings ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
            <div className="p-4 bg-indigo-50/40 border-b border-indigo-100 flex flex-wrap items-center gap-4 text-xs print:hidden">
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-700 font-nepali">निर्णय मिति (Decision Date):</label>
                <input
                  type="text"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  placeholder="उदा: २०८१।०६।०२"
                  className="p-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 font-nepali"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-700 font-nepali">महिना / अवधि व्यहोरा (Period Text):</label>
                <input
                  type="text"
                  value={periodText}
                  onChange={(e) => setPeriodText(e.target.value)}
                  placeholder="उदा: श्रावण र भाद्र"
                  className="p-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 font-nepali w-48"
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
                  className="w-16 p-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                />
                <span className="font-bold text-slate-600">%</span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="ml-auto px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 transition-all"
              >
                <Check size={13} />
                बन्द गर्नुहोस्
              </button>
            </div>
          )}

          {/* Bharpai Document Print Sheet */}
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white print:p-0 print:overflow-visible print-bharpai-only">
            <div className="max-w-5xl mx-auto space-y-4 print:w-full print:max-w-none">
              
              {/* Top Bharpai Official Header (Exact text matching screenshot) */}
              <div className="text-center pt-2 pb-2">
                <h2 className="text-sm md:text-base font-bold font-nepali text-slate-950 tracking-normal leading-relaxed">
                  आ.व. {displayFiscalYear} मिति {displayDecisionDate} गतेको निर्णयानुसार भुक्तानी भएको {periodText} महिनाको प्रयोगशाला प्रोत्साहन रकमको भरपाई
                </h2>
              </div>

              {/* Exact Official Bharpai Table */}
              <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-950">
                <thead>
                  <tr className="bg-slate-100 font-nepali">
                    <th className="border-2 border-slate-950 p-2 text-center font-bold w-12">क्र.सं.</th>
                    <th className="border-2 border-slate-950 p-2 text-left font-bold min-w-[140px]">कर्मचारीको नाम</th>
                    <th className="border-2 border-slate-950 p-2 text-center font-bold min-w-[110px]">भूमिका</th>
                    <th className="border-2 border-slate-950 p-2 text-right font-bold w-24">जम्मा रकम</th>
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
                      <td colSpan={9} className="border border-slate-950 p-6 text-center text-slate-500 font-nepali">
                        चयन गरिएको आर्थिक वर्ष ({displayFiscalYear}) र महिना ({periodText}) मा कुनै प्रयोगशाला प्रोत्साहन रेकर्ड फेला परेन।
                      </td>
                    </tr>
                  ) : (
                    bharpaiRows.map((row) => {
                      const grossFormatted = formatSafeNumber(row.grossLabAmount);
                      const incFormatted = formatSafeNumber(row.incentiveAmount);
                      const taxFormatted = formatSafeNumber(row.taxDeduction);
                      const netPaidFormatted = formatSafeNumber(row.netPaidAmount);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="border border-slate-950 p-1.5 md:p-2 text-center font-bold font-nepali">
                            {toNepaliDigits(row.sn)}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 font-bold font-nepali text-slate-950">
                            {row.staffName}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-center font-nepali">
                            {row.role}
                          </td>
                          <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-medium">
                            {grossFormatted ? (useNepaliNumerals ? toNepaliDigits(grossFormatted) : grossFormatted) : ''}
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
                              className="w-full text-xs p-1 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none print:hidden font-nepali"
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
                      <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandGrossAmount)) 
                          : formatSafeNumber(grandGrossAmount)}
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
