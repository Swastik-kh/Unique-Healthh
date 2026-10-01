import React, { useState, useMemo, useEffect } from 'react';
import { Printer, Download, X, Settings2, FileText, Check, Calendar, Filter, Trash2, Plus, RotateCcw } from 'lucide-react';
import { FISCAL_YEARS, isAncPackageService } from '../constants';
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
  ancPackageIncentiveRate?: number;
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
  ancPackageIncentiveRate = 0,
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
  const [excludedRowIds, setExcludedRowIds] = useState<string[]>([]);
  const [ancRate, setAncRate] = useState<number>(() => {
    if (typeof ancPackageIncentiveRate === 'number' && ancPackageIncentiveRate > 0) {
      return ancPackageIncentiveRate;
    }
    const saved = localStorage.getItem('protsahan_anc_package_rate');
    return saved ? Number(saved) : 0;
  });

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialFiscalYear) setSelectedFy(initialFiscalYear);
      if (initialMonth) {
        setSelectedPeriodValue(initialMonth);
        updatePeriodTextForValue(initialMonth);
      }
      setExcludedRowIds([]);
      if (typeof ancPackageIncentiveRate === 'number' && ancPackageIncentiveRate > 0) {
        setAncRate(ancPackageIncentiveRate);
      } else {
        const saved = localStorage.getItem('protsahan_anc_package_rate');
        if (saved) setAncRate(Number(saved));
      }
    }
  }, [isOpen, initialFiscalYear, initialMonth, ancPackageIncentiveRate]);

  // Reset excluded staff when changing fiscal year or month/period
  useEffect(() => {
    setExcludedRowIds([]);
  }, [selectedFy, selectedPeriodValue]);

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
        const rawName = (item.serviceName || '').trim();
        const itemName = rawName.toLowerCase();
        const cat = getServiceCategory(itemName, item.category);

        if (cat === 'Lab' || isAncPackageService(rawName)) {
          const qty = Number(item.quantity) || 1;
          const isAnc = isAncPackageService(rawName);

          if (isAnc && ancRate > 0) {
            grossLabAmount += (qty * ancRate);
          } else {
            grossLabAmount += (Number(item.total) || 0);
          }
        }
      });

      const billSubTotal = record.subTotal || 0;
      const billDiscount = record.discount || 0;
      let proRatedDiscount = 0;
      if (billDiscount > 0 && billSubTotal > 0) {
        proRatedDiscount = Math.min(billDiscount, (grossLabAmount / Math.max(billSubTotal, grossLabAmount)) * billDiscount);
      }
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
  }, [filteredModalRecords, labIncentivePercent, protsahanRecipients, users, getServiceCategory, ancRate]);

  // 3. Referrer Groupings for the modal
  const modalProtsahanByReferrer = useMemo(() => {
    const map = new Map<string, { netLabAmount: number; totalIncentive: number; referrerShare: number; designation: string }>();
    modalProtsahanData.forEach(item => {
      const key = item.record.referredBy && item.record.referredBy !== 'All' && item.record.referredBy !== '-' ? item.referrerName : 'स्वतन्त्र (Self / direct)';
      const existing = map.get(key) || { netLabAmount: 0, totalIncentive: 0, referrerShare: 0, designation: '' };
      
      const refShareObj = item.recipientShares.find(s => s.isSystemReferrer);
      const refShareAmount = refShareObj ? refShareObj.shareAmount : 0;

      // Find user designation (pad)
      const referrerVal = item.record.referredBy;
      const referrerUser = users.find(u => u.id === referrerVal || u.username === referrerVal || u.fullName === referrerVal);
      const designation = referrerUser?.designation || existing.designation || 'सिफारिसकर्ता';

      map.set(key, {
        netLabAmount: existing.netLabAmount + item.netLabAmount,
        totalIncentive: existing.totalIncentive + item.totalIncentive,
        referrerShare: existing.referrerShare + refShareAmount,
        designation: designation
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [modalProtsahanData, users]);

  // 4. Build the complete raw Bharpai rows
  const rawBharpaiRows: BharpaiRow[] = useMemo(() => {
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
        role: ref.designation || 'सिफारिसकर्ता',
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

  // Filter out any employees/staff excluded by user and sequentially re-index SN
  const bharpaiRows: BharpaiRow[] = useMemo(() => {
    let snCounter = 1;
    return rawBharpaiRows
      .filter(r => !excludedRowIds.includes(r.id))
      .map(r => ({
        ...r,
        sn: snCounter++
      }));
  }, [rawBharpaiRows, excludedRowIds]);

  // List of excluded staff members for quick restoration
  const excludedRows = useMemo(() => {
    return rawBharpaiRows.filter(r => excludedRowIds.includes(r.id));
  }, [rawBharpaiRows, excludedRowIds]);

  const handleExcludeRow = (rowId: string) => {
    setExcludedRowIds(prev => prev.includes(rowId) ? prev : [...prev, rowId]);
  };

  const handleIncludeRow = (rowId: string) => {
    setExcludedRowIds(prev => prev.filter(id => id !== rowId));
  };

  const handleResetExcluded = () => {
    setExcludedRowIds([]);
  };

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
      {/* Clean Print Style so Bharpai renders fully and clearly in print/PDF preview */}
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
              .bharpai-modal-overlay {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                display: block !important;
                inset: auto !important;
                z-index: auto !important;
              }
              .bharpai-modal-container {
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
              .bharpai-print-sheet {
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

      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto bharpai-modal-overlay">
        <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto bharpai-modal-container">
          
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
                  महिना र आ.व. अनुसार कर्मचारीहरूको प्रोत्साहन भुक्तानी र करकट्टी भरपाई। (आवश्यकता अनुसार कुनै कर्मचारी हटाएर प्रिन्ट गर्न सकिन्छ)
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

              <div className="flex items-center gap-2 bg-purple-50/70 border border-purple-200 px-3 py-1 rounded-xl">
                <label className="font-bold text-purple-950 font-nepali text-xs">ANC दर (रू.):</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={ancRate || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAncRate(val);
                    localStorage.setItem('protsahan_anc_package_rate', val.toString());
                  }}
                  placeholder="0"
                  className="w-20 p-1 px-2 bg-white border border-purple-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-purple-500 text-right font-mono text-purple-900"
                  title="प्रोत्साहन प्रयोजनको लागि मात्र ANC Package को दर"
                />
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
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white print:p-0 print:overflow-visible bharpai-print-sheet font-nepali">
            <div className="max-w-5xl mx-auto space-y-4 print:w-full print:max-w-none">
              
              {/* Top Bharpai Official Header (Exact text matching screenshot) */}
              <div className="text-center pt-2 pb-2">
                <h2 className="text-sm md:text-base font-bold font-nepali text-slate-950 tracking-normal leading-relaxed">
                  आ.व. {displayFiscalYear} मिति {displayDecisionDate} गतेको निर्णयानुसार भुक्तानी भएको {periodText} महिनाको प्रयोगशाला प्रोत्साहन रकमको भरपाई
                </h2>
              </div>

              {/* Excluded Staff Restoration Banner - Hide on print */}
              {excludedRows.length > 0 && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 print:hidden text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-amber-900 font-nepali flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      भरपाईबाट हटाइएका कर्मचारी ({toNepaliDigits(excludedRows.length)} जना):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {excludedRows.map(row => (
                        <span
                          key={row.id}
                          className="inline-flex items-center gap-1.5 bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs font-nepali"
                        >
                          <span>{row.staffName} <span className="text-[11px] text-amber-700">({row.role})</span></span>
                          <button
                            type="button"
                            onClick={() => handleIncludeRow(row.id)}
                            title="पुनः भरपाईमा समावेश गर्नुहोस्"
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded px-1 py-0.5 transition-colors font-bold flex items-center gap-0.5 border border-emerald-200"
                          >
                            <Plus size={12} />
                            <span className="text-[10px]">थप्नुहोस्</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetExcluded}
                    className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-xl transition-all font-nepali flex items-center gap-1.5 ml-auto sm:ml-0"
                  >
                    <RotateCcw size={13} />
                    सबै पुनः समावेश गर्नुहोस् (Restore All)
                  </button>
                </div>
              )}

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
                    <th className="border-2 border-slate-950 p-2 text-center font-bold w-14 print:hidden">हटाउने</th>
                  </tr>
                </thead>
                <tbody>
                  {bharpaiRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border border-slate-950 p-6 text-center text-slate-500 font-nepali">
                        {excludedRows.length > 0 ? (
                          <div className="space-y-3 py-4">
                            <p className="font-bold text-amber-800 text-sm">सबै कर्मचारीहरूलाई भरपाईबाट हटाइएको छ।</p>
                            <button
                              type="button"
                              onClick={handleResetExcluded}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                            >
                              <RotateCcw size={14} />
                              सबै कर्मचारी पुनः समावेश गर्नुहोस्
                            </button>
                          </div>
                        ) : (
                          `चयन गरिएको आर्थिक वर्ष (${displayFiscalYear}) र महिना (${periodText}) मा कुनै प्रयोगशाला प्रोत्साहन रेकर्ड फेला परेन।`
                        )}
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
                          <td className={`border border-slate-950 p-1.5 md:p-2 text-right font-medium ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                            {grossFormatted ? (useNepaliNumerals ? toNepaliDigits(grossFormatted) : grossFormatted) : ''}
                          </td>
                          <td className={`border border-slate-950 p-1.5 md:p-2 text-right font-bold text-slate-950 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                            {useNepaliNumerals ? toNepaliDigits(incFormatted || '0') : (incFormatted || '0')}
                          </td>
                          <td className={`border border-slate-950 p-1.5 md:p-2 text-right font-medium text-slate-900 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                            {useNepaliNumerals ? toNepaliDigits(taxFormatted || '0') : (taxFormatted || '0')}
                          </td>
                          <td className={`border border-slate-950 p-1.5 md:p-2 text-right font-bold text-slate-950 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
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
                          <td className="border border-slate-950 p-1 md:p-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleExcludeRow(row.id)}
                              title={`${row.staffName} लाई भरपाईबाट हटाउनुहोस्`}
                              className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all group"
                            >
                              <Trash2 size={15} className="group-hover:scale-110 transition-transform" />
                            </button>
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
                      <td className={`border-2 border-slate-950 p-2 text-right font-black text-slate-950 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandGrossAmount)) 
                          : formatSafeNumber(grandGrossAmount)}
                      </td>
                      <td className={`border-2 border-slate-950 p-2 text-right font-black text-slate-950 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandIncentiveAmount)) 
                          : formatSafeNumber(grandIncentiveAmount)}
                      </td>
                      <td className={`border-2 border-slate-950 p-2 text-right font-black text-slate-950 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandTaxAmount)) 
                          : formatSafeNumber(grandTaxAmount)}
                      </td>
                      <td className={`border-2 border-slate-950 p-2 text-right font-black text-slate-950 ${useNepaliNumerals ? 'font-nepali' : 'font-mono'}`}>
                        {useNepaliNumerals 
                          ? toNepaliDigits(formatSafeNumber(grandNetPaidAmount)) 
                          : formatSafeNumber(grandNetPaidAmount)}
                      </td>
                      <td className="border-2 border-slate-950 p-2 text-center"></td>
                      <td className="border-2 border-slate-950 p-2 text-center"></td>
                      <td className="border-2 border-slate-950 p-2 text-center print:hidden"></td>
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
