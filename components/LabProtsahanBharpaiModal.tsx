import React, { useState, useMemo } from 'react';
import { Printer, Download, X, Settings2, FileText, Check } from 'lucide-react';

const NEPALI_MONTH_NAMES = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'
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
  billCount: number;
  netLabAmount: number;
  incentiveAmount: number;
}

interface LabProtsahanBharpaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiscalYear: string;
  selectedMonth: string;
  protsahanByReferrer: ReferrerSummaryItem[];
  protsahanRecipients: ProtsahanRecipient[];
  protsahanReportData: any[];
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
  selectedFiscalYear,
  selectedMonth,
  protsahanByReferrer,
  protsahanRecipients,
  protsahanReportData,
  useNepaliNumerals,
  toNepaliDigits,
  generalSettings,
  currentUser
}) => {
  const [taxPercent, setTaxPercent] = useState<number>(15); // Default 15% TDS as in official screenshot
  const [decisionDate, setDecisionDate] = useState<string>(() => {
    return '२०८१।०६।०२';
  });
  const [periodText, setPeriodText] = useState<string>(() => {
    if (selectedMonth === 'all') return 'श्रावण देखि आषाढ';
    const monthIndex = parseInt(selectedMonth) - 1;
    return NEPALI_MONTH_NAMES[monthIndex] || 'श्रावण र भाद्र';
  });
  const [customRemarks, setCustomRemarks] = useState<Record<string, string>>({});
  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  const parseStaffNames = (staffName?: string): string[] => {
    if (!staffName) return [];
    return staffName
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  // Build the complete list of rows
  const bharpaiRows: BharpaiRow[] = useMemo(() => {
    const rows: BharpaiRow[] = [];
    let snCounter = 1;

    // 1. Referrers
    protsahanByReferrer.forEach((ref) => {
      const grossAmt = ref.netLabAmount;
      const incAmt = ref.incentiveAmount;
      const taxAmt = incAmt * (taxPercent / 100);
      const netPaid = incAmt - taxAmt;
      const rowId = `ref_${ref.name}`;

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
      const totalForRecipient = protsahanReportData.reduce((sum, d) => {
        const share = d.recipientShares?.find((s: any) => s.id === recipient.id);
        return sum + (share ? share.shareAmount : 0);
      }, 0);

      const staffList = parseStaffNames(recipient.staffName);

      if (staffList.length > 0) {
        const perPersonIncentive = totalForRecipient / staffList.length;
        staffList.forEach((stName, idx) => {
          const incAmt = perPersonIncentive;
          const taxAmt = incAmt * (taxPercent / 100);
          const netPaid = incAmt - taxAmt;
          const rowId = `staff_${recipient.id}_${idx}_${stName}`;

          rows.push({
            id: rowId,
            sn: snCounter++,
            staffName: stName,
            role: recipient.nameNe,
            grossLabAmount: null, // Pooled recipients have no individual gross lab bill
            incentiveAmount: incAmt,
            taxDeduction: taxAmt,
            netPaidAmount: netPaid,
            remarks: customRemarks[rowId] ?? ''
          });
        });
      } else {
        // No staff name specified, show by role
        const incAmt = totalForRecipient;
        const taxAmt = incAmt * (taxPercent / 100);
        const netPaid = incAmt - taxAmt;
        const rowId = `role_${recipient.id}`;

        rows.push({
          id: rowId,
          sn: snCounter++,
          staffName: recipient.nameNe,
          role: recipient.nameNe,
          grossLabAmount: null,
          incentiveAmount: incAmt,
          taxDeduction: taxAmt,
          netPaidAmount: netPaid,
          remarks: customRemarks[rowId] ?? ''
        });
      }
    });

    return rows;
  }, [protsahanByReferrer, protsahanRecipients, protsahanReportData, taxPercent, customRemarks]);

  // Grand Totals
  const grandGrossAmount = useMemo(() => {
    return bharpaiRows.reduce((sum, r) => sum + (r.grossLabAmount || 0), 0);
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
      r.staffName,
      r.role,
      r.grossLabAmount !== null ? r.grossLabAmount.toFixed(2) : '',
      r.incentiveAmount.toFixed(2),
      r.taxDeduction.toFixed(2),
      r.netPaidAmount.toFixed(2),
      '',
      r.remarks || ''
    ]);

    // Grand total row
    rows.push([
      'जम्मा',
      '',
      '',
      grandGrossAmount.toFixed(2),
      grandIncentiveAmount.toFixed(2),
      grandTaxAmount.toFixed(2),
      grandNetPaidAmount.toFixed(2),
      '',
      ''
    ]);

    const headerTitle = `आ.व. ${selectedFiscalYear} मिति ${decisionDate} गतेको निर्णयानुसार भुक्तानी भएको ${periodText} महिनाको प्रयोगशाला प्रोत्साहन रकमको भरपाई`;

    const csvContent = '\uFEFF' + [
      `"${headerTitle}"`,
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Lab_Protsahan_Bharpai_${selectedFiscalYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const displayFiscalYear = useNepaliNumerals ? toNepaliDigits(selectedFiscalYear) : selectedFiscalYear;
  const displayDecisionDate = useNepaliNumerals ? toNepaliDigits(decisionDate) : decisionDate;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto print:fixed print:inset-0 print:m-0 print:p-0 print:border-none print:rounded-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        
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
                सरकारी भरपाई ढाँचा अनुसार सम्पूर्ण कर्मचारीहरूको प्रोत्साहन भुक्तानी र करकट्टी विवरण।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isEditingSettings ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Settings2 size={14} />
              मिति र कर दर सेटिङ
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Download size={14} className="text-emerald-600" />
              CSV / Excel
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer size={15} />
              भरपाई प्रिन्ट गर्नुहोस् (Print)
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
              <label className="font-bold text-slate-700 font-nepali">महिना / अवधि विवरण (Period):</label>
              <input
                type="text"
                value={periodText}
                onChange={(e) => setPeriodText(e.target.value)}
                placeholder="उदा: श्रावण र भाद्र"
                className="p-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 font-nepali"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700 font-nepali">करकट्टी प्रतिशत (TDS %):</label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value))}
                className="w-20 p-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
              />
              <span className="font-bold text-slate-600">%</span>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingSettings(false)}
              className="ml-auto px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 transition-all"
            >
              <Check size={13} />
              लागू गर्नुहोस्
            </button>
          </div>
        )}

        {/* Bharpai Document Print Sheet */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white print:p-0 print:overflow-visible">
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
                {bharpaiRows.map((row) => (
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
                      {row.grossLabAmount !== null 
                        ? (useNepaliNumerals ? toNepaliDigits(row.grossLabAmount % 1 === 0 ? row.grossLabAmount.toString() : row.grossLabAmount.toFixed(2)) : (row.grossLabAmount % 1 === 0 ? row.grossLabAmount.toString() : row.grossLabAmount.toFixed(2)))
                        : ''}
                    </td>
                    <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-bold text-slate-950">
                      {useNepaliNumerals 
                        ? toNepaliDigits(row.incentiveAmount % 1 === 0 ? row.incentiveAmount.toString() : row.incentiveAmount.toFixed(2).replace(/\.?0+$/, '')) 
                        : (row.incentiveAmount % 1 === 0 ? row.incentiveAmount.toString() : row.incentiveAmount.toFixed(2).replace(/\.?0+$/, ''))}
                    </td>
                    <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-medium text-slate-900">
                      {useNepaliNumerals 
                        ? toNepaliDigits(row.taxDeduction % 1 === 0 ? row.taxDeduction.toString() : row.taxDeduction.toFixed(2).replace(/\.?0+$/, '')) 
                        : (row.taxDeduction % 1 === 0 ? row.taxDeduction.toString() : row.taxDeduction.toFixed(2).replace(/\.?0+$/, ''))}
                    </td>
                    <td className="border border-slate-950 p-1.5 md:p-2 text-right font-mono font-bold text-slate-950">
                      {useNepaliNumerals 
                        ? toNepaliDigits(row.netPaidAmount % 1 === 0 ? row.netPaidAmount.toString() : row.netPaidAmount.toFixed(2).replace(/\.?0+$/, '')) 
                        : (row.netPaidAmount % 1 === 0 ? row.netPaidAmount.toString() : row.netPaidAmount.toFixed(2).replace(/\.?0+$/, ''))}
                    </td>
                    <td className="border border-slate-950 p-1.5 md:p-2 text-center">
                      {/* Signature area for physical sign */}
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
                ))}

                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold border-2 border-slate-950">
                  <td colSpan={3} className="border-2 border-slate-950 p-2 text-center font-black font-nepali text-slate-950">
                    जम्मा
                  </td>
                  <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                    {useNepaliNumerals ? toNepaliDigits(grandGrossAmount.toFixed(2).replace(/\.00$/, '')) : grandGrossAmount.toFixed(2).replace(/\.00$/, '')}
                  </td>
                  <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                    {useNepaliNumerals ? toNepaliDigits(grandIncentiveAmount.toFixed(2).replace(/\.?0+$/, '')) : grandIncentiveAmount.toFixed(2).replace(/\.?0+$/, '')}
                  </td>
                  <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                    {useNepaliNumerals ? toNepaliDigits(grandTaxAmount.toFixed(2).replace(/\.?0+$/, '')) : grandTaxAmount.toFixed(2).replace(/\.?0+$/, '')}
                  </td>
                  <td className="border-2 border-slate-950 p-2 text-right font-mono font-black text-slate-950">
                    {useNepaliNumerals ? toNepaliDigits(grandNetPaidAmount.toFixed(2).replace(/\.?0+$/, '')) : grandNetPaidAmount.toFixed(2).replace(/\.?0+$/, '')}
                  </td>
                  <td className="border-2 border-slate-950 p-2 text-center"></td>
                  <td className="border-2 border-slate-950 p-2 text-center"></td>
                </tr>
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
  );
};
