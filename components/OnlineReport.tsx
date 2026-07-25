import React, { useState, useMemo, useRef } from 'react';
import { 
  KeyRound, 
  Search, 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Calendar, 
  ShieldCheck, 
  ArrowLeft,
  Building2,
  Receipt,
  Sparkles,
  Download,
  Info,
  FlaskConical
} from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord, BillingRecord, User as AppUser, OrganizationSettings, LabReport } from '../types/coreTypes';
import { LogoDisplay } from './LogoDisplay';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface OnlineReportProps {
  currentFiscalYear: string;
  currentUser: AppUser | null;
  generalSettings?: OrganizationSettings;
  serviceSeekerRecords?: ServiceSeekerRecord[];
  opdRecords?: OPDRecord[];
  billingRecords?: BillingRecord[];
  labReports?: LabReport[];
}

export const OnlineReport: React.FC<OnlineReportProps> = ({
  currentFiscalYear,
  currentUser,
  generalSettings,
  serviceSeekerRecords = [],
  opdRecords = [],
  billingRecords = [],
  labReports = []
}) => {
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [searchedPasscode, setSearchedPasscode] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);
  const [printTarget, setPrintTarget] = useState<'all' | 'lab'>('all');

  const reportPrintRef = useRef<HTMLDivElement>(null);

  const toNepaliDigits = (num: number | string | undefined | null) => {
    if (num === undefined || num === null) return '०';
    const numStr = String(num);
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return numStr.replace(/[0-9]/g, (d) => nepaliDigits[parseInt(d, 10)]);
  };

  // Generate deterministic passcode for older bills if not explicitly set
  const getEffectivePasscode = (bill: BillingRecord): string => {
    if (bill.passcode) return bill.passcode;
    const seed = bill.id + (bill.invoiceNumber || '');
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < seed.length; i++) {
      h1 = (h1 * 31 + seed.charCodeAt(i)) % 1000000;
      h2 = (h2 * 37 + seed.charCodeAt(i)) % 24;
    }
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const l1 = letters[h2 % 24];
    const l2 = letters[(h2 + 7) % 24];
    const digits = String(h1).padStart(6, '0');
    return `${l1}${l2}${digits}`;
  };

  // Find matching billing record by passcode or invoice number or lab report
  const matchedBill = useMemo(() => {
    if (!searchedPasscode) return null;
    const cleanSearch = searchedPasscode.trim().toLowerCase();
    if (!cleanSearch) return null;

    const billMatch = billingRecords.find(b => {
      const explicitPasscode = b.passcode ? b.passcode.toLowerCase() : '';
      const effectivePasscode = getEffectivePasscode(b).toLowerCase();
      const invoiceNo = (b.invoiceNumber || '').toLowerCase();
      const manualInvoiceNo = (b.manualInvoiceNumber || '').toLowerCase();

      return explicitPasscode === cleanSearch || 
             effectivePasscode === cleanSearch || 
             invoiceNo === cleanSearch || 
             manualInvoiceNo === cleanSearch;
    });

    if (billMatch) return billMatch;

    // Search by lab report barcode or ID
    const labMatch = labReports.find(r => 
      (r.barcodeId && r.barcodeId.toLowerCase() === cleanSearch) ||
      (r.id && r.id.toLowerCase() === cleanSearch) ||
      (r.invoiceNumber && r.invoiceNumber.toLowerCase() === cleanSearch)
    );

    if (labMatch) {
      if (labMatch.invoiceNumber) {
        const found = billingRecords.find(b => 
          (b.invoiceNumber || '').toLowerCase() === labMatch.invoiceNumber?.toLowerCase()
        );
        if (found) return found;
      }
      if (labMatch.serviceSeekerId) {
        const found = billingRecords.find(b => 
          (b.serviceSeekerId || '').toLowerCase() === labMatch.serviceSeekerId?.toLowerCase()
        );
        if (found) return found;
      }
    }

    return null;
  }, [searchedPasscode, billingRecords, labReports]);

  // Associated patient record if found
  const matchedPatient = useMemo(() => {
    if (!matchedBill) return null;
    return serviceSeekerRecords.find(p => p.id === matchedBill.serviceSeekerId || p.uniquePatientId === matchedBill.serviceSeekerId) || null;
  }, [matchedBill, serviceSeekerRecords]);

  // Associated OPD record if found
  const matchedOpdRecords = useMemo(() => {
    if (!matchedBill) return [];
    return opdRecords.filter(o => o.uniquePatientId === matchedBill.serviceSeekerId || o.serviceSeekerId === matchedBill.serviceSeekerId);
  }, [matchedBill, opdRecords]);

  // Associated Lab Reports (Prepared / Completed / Pending)
  const matchedLabReports = useMemo(() => {
    if (!matchedBill) return [];
    return labReports.filter(r => {
      const invMatch = r.invoiceNumber && matchedBill.invoiceNumber && 
        r.invoiceNumber.toLowerCase().trim() === matchedBill.invoiceNumber.toLowerCase().trim();
      const manualInvMatch = r.invoiceNumber && matchedBill.manualInvoiceNumber && 
        r.invoiceNumber.toLowerCase().trim() === matchedBill.manualInvoiceNumber.toLowerCase().trim();
      const seekerMatch = r.serviceSeekerId && matchedBill.serviceSeekerId && 
        r.serviceSeekerId.toLowerCase().trim() === matchedBill.serviceSeekerId.toLowerCase().trim();
      return invMatch || manualInvMatch || seekerMatch;
    });
  }, [matchedBill, labReports]);

  const hasLabItemsInBill = useMemo(() => {
    if (!matchedBill) return false;
    return matchedBill.items?.some(item => {
      const name = (item.serviceName || '').toLowerCase();
      return name.includes('lab') || name.includes('blood') || name.includes('test') || name.includes('urine') || name.includes('stool') || name.includes('cbc') || name.includes('tf') || name.includes('sugar');
    });
  }, [matchedBill]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) return;
    setSearchedPasscode(passcodeInput.trim());
    setSearchAttempted(true);
  };

  const handleResetSearch = () => {
    setPasscodeInput('');
    setSearchedPasscode(null);
    setSearchAttempted(false);
  };

  const handlePrintFull = () => {
    setPrintTarget('all');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintLabOnly = () => {
    setPrintTarget('lab');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-[85vh] p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-nepali">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden no-print">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-white/20">
              <ShieldCheck size={14} className="text-cyan-300" />
              <span>सुरक्षित अनलाइन रिपोर्ट पोर्टल (Secured Online Report Portal)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              अनलाइन रिपोर्ट खोज तथा प्रिन्ट (Online Report Verification)
            </h1>
            <p className="text-blue-100 text-xs md:text-sm max-w-2xl">
              तपाईंको बिलिङ इनभ्वाइस वा रसिदमा दिइएको ८-अङ्की पासकोड (८-Digit Unique Passcode) प्रविष्ट गरी रिपोर्ट प्राप्त गर्नुहोस्।
            </p>
          </div>
        </div>
      </div>

      {/* Main Search Interface Section */}
      {!searchedPasscode && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-12 shadow-lg max-w-2xl mx-auto text-center space-y-8 no-print">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
            <KeyRound size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              पासकोड प्रविष्ट गर्नुहोस् (Enter Online Passcode)
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              सेवा बिलिङ गर्दा रसिदको पुछारमा छापिएको ८-अङ्की पासकोड यहाँ राख्नुहोस्
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative max-w-md mx-auto">
              <KeyRound size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value.toUpperCase())}
                placeholder="उदा: 84AB2910 वा इनभ्वाइस नम्..."
                maxLength={20}
                className="w-full pl-12 pr-4 py-4 border-2 border-blue-200 rounded-2xl text-center text-lg font-mono font-black tracking-widest text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all uppercase placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="submit"
                disabled={!passcodeInput.trim()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base active:scale-95 w-full sm:w-auto"
              >
                <Search size={18} />
                <span>रिपोर्ट खोज्नुहोस् (Find Report)</span>
              </button>
            </div>
          </form>

          {/* Quick list of generated bill passcodes for reference / testing */}
          {billingRecords.length > 0 && (
            <div className="pt-6 border-t border-slate-100 text-left">
              <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <Info size={14} className="text-blue-500" />
                <span>उपलब्ध पासकोडहरू (Sample Bill Passcodes):</span>
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {billingRecords.slice(0, 8).map(b => {
                  const code = getEffectivePasscode(b);
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setPasscodeInput(code);
                        setSearchedPasscode(code);
                        setSearchAttempted(true);
                      }}
                      className="font-mono bg-white hover:bg-blue-50 hover:border-blue-300 text-blue-700 px-2.5 py-1 rounded-lg border border-slate-200 font-bold transition-all shadow-2xs"
                    >
                      {code} <span className="text-[10px] text-slate-400 font-sans">({b.patientName || 'Direct'})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results View */}
      {searchedPasscode && (
        <div className="space-y-6">
          {/* Top Bar with Return & Print Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
            <button
              onClick={handleResetSearch}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeft size={16} />
              <span>पुनः अर्को पासकोड खोज्नुहोस् (Search Another Passcode)</span>
            </button>

            {matchedBill && (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>पासकोड: {searchedPasscode} (Verified)</span>
                </span>
                
                {matchedLabReports.length > 0 && (
                  <button
                    onClick={handlePrintLabOnly}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 text-xs sm:text-sm"
                  >
                    <FlaskConical size={16} />
                    <span>प्रयोगशाला रिपोर्ट प्रिन्ट (Print Lab Report)</span>
                  </button>
                )}

                <button
                  onClick={handlePrintFull}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl border border-slate-300 transition-all active:scale-95 text-xs sm:text-sm"
                >
                  <Printer size={16} />
                  <span>रसिद / बिल प्रिन्ट (Print Invoice)</span>
                </button>
              </div>
            )}
          </div>

          {/* Not Found View */}
          {!matchedBill && searchAttempted && (
            <div className="bg-white rounded-3xl border border-rose-200 p-8 md:p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                रिपोर्ट फेला परेन (Report Not Found)
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                तपाईंले प्रविष्ट गर्नुभएको पासकोड <strong className="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{searchedPasscode}</strong> सँग मेल खाने कुनै पनि इनभ्वाइस वा रिपोर्ट फेला परेन।
              </p>
              <p className="text-xs text-slate-400">
                कृपया बिल रसिदमा भएको पासकोड राम्ररी जाँचेर पुनः प्रविष्ट गर्नुहोस्।
              </p>
              <div className="pt-4">
                <button
                  onClick={handleResetSearch}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
                >
                  पुनः प्रयास गर्नुहोस् (Try Again)
                </button>
              </div>
            </div>
          )}

          {/* Found Report Display Card (Printable) */}
          {matchedBill && (
            <div ref={reportPrintRef} className={`bg-white rounded-3xl border border-slate-200 p-6 md:p-10 shadow-lg space-y-8 font-nepali ${printTarget === 'lab' ? 'no-print' : ''}`}>
              {/* Header Header Info */}
              <div className="border-b border-slate-200 pb-6">
                <LogoDisplay
                  organizationName={generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था'}
                  address={generalSettings?.address || 'पालिका, नेपाल'}
                  phone={generalSettings?.phone}
                  email={generalSettings?.email}
                />
                <div className="mt-4 text-center">
                  <span className="inline-block bg-blue-50 text-blue-800 border border-blue-200 font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wider">
                    आधिकारिक अनलाइन सेवा तथा बिलिङ प्रतिवेदन (Official Online Service Report)
                  </span>
                </div>
              </div>

              {/* Invoice & Patient Meta Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">बिरामीको नाम (Patient Name):</span>
                    <span className="font-black text-slate-800">{matchedBill.patientName || 'प्रत्यक्ष (Direct)'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">बिरामी दर्ता नम्. / ID:</span>
                    <span className="font-mono font-bold text-slate-700">{matchedPatient?.uniquePatientId || matchedBill.serviceSeekerId}</span>
                  </div>
                  {matchedPatient && (
                    <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500 font-bold">उमेर / लिङ्ग (Age/Gender):</span>
                      <span className="font-medium text-slate-700">{matchedPatient.age} / {matchedPatient.gender}</span>
                    </div>
                  )}
                  {matchedPatient?.address && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">ठेगाना (Address):</span>
                      <span className="font-medium text-slate-700">{matchedPatient.address}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">इनभ्वाइस नम्बर (Invoice No):</span>
                    <span className="font-mono font-bold text-slate-800">{matchedBill.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">बिल मिति (Bill Date - BS):</span>
                    <span className="font-bold text-slate-800">{toNepaliDigits(matchedBill.billDate)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-bold">भुक्तानी मोड (Payment Mode):</span>
                    <span className="font-bold text-slate-800">{matchedBill.paymentMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">रिपोर्ट पासकोड (Passcode):</span>
                    <span className="font-mono font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded text-xs tracking-wider">
                      {searchedPasscode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Items Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Receipt size={18} className="text-blue-600" />
                  <span>प्रविष्ट सेवा तथा जाँच विवरण (Billed Services & Investigations)</span>
                </h3>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase border-b border-slate-200">
                        <th className="p-3 text-center w-12">क्र.सं.</th>
                        <th className="p-3">सेवा / जाँचको नाम (Service / Investigation Name)</th>
                        <th className="p-3 text-right">दर (Rate)</th>
                        <th className="p-3 text-center">परिमाण (Qty)</th>
                        <th className="p-3 text-right">जम्मा (Total)</th>
                        <th className="p-3">कैफियत</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {matchedBill.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-center font-bold text-slate-400">{toNepaliDigits(idx + 1)}</td>
                          <td className="p-3 font-bold text-slate-800">{item.serviceName}</td>
                          <td className="p-3 text-right font-mono">रु. {item.price.toFixed(2)}</td>
                          <td className="p-3 text-center font-bold">{toNepaliDigits(item.quantity)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">रु. {item.total.toFixed(2)}</td>
                          <td className="p-3 text-xs text-slate-500">{item.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Laboratory Service Prepared Report Section (प्रयोगशाला सेवाको तयार भएको रिपोर्ट) */}
              {matchedLabReports.length > 0 ? (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200">
                    <h3 className="font-bold text-blue-900 text-base flex items-center gap-2">
                      <FlaskConical size={20} className="text-blue-600" />
                      <span>प्रयोगशाला सेवा नतिजा प्रतिवेदन (Laboratory Test Results Report)</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {matchedLabReports.some(r => r.status === 'Completed') ? (
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>रिपोर्ट तयार भएको (Completed)</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-300">
                          प्रक्रियामा (In Progress)
                        </span>
                      )}
                    </div>
                  </div>

                  {matchedLabReports.map((report, rIdx) => {
                    const validTests = report.tests?.filter(
                      t => (t.result && t.result.trim() !== '') || (t.remarks && t.remarks.trim() !== '')
                    ) || [];

                    return (
                      <div key={rIdx} className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-2">
                          <div>
                            <span className="font-bold text-slate-700">रिपोर्ट ID:</span> <span className="font-mono">{report.id}</span>
                            {report.barcodeId && (
                              <span className="ml-3 font-bold text-slate-700">बारकोड: <span className="font-mono text-blue-700">{report.barcodeId}</span></span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-700">जाँच मिति:</span> <span>{toNepaliDigits(report.reportDate)}</span>
                            <button
                              onClick={handlePrintLabOnly}
                              className="no-print flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition-all shadow-xs ml-2"
                            >
                              <Printer size={13} />
                              <span>प्रिन्ट (Print)</span>
                            </button>
                          </div>
                        </div>

                        {validTests.length > 0 ? (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase border-b border-slate-200">
                                  <th className="p-2.5 text-center w-10">क्र.सं.</th>
                                  <th className="p-2.5">जाँचको नाम (Test Name)</th>
                                  <th className="p-2.5 font-bold text-blue-900">नतिजा (Result)</th>
                                  <th className="p-2.5">इकाई (Unit)</th>
                                  <th className="p-2.5">सामान्य दर (Reference Range)</th>
                                  <th className="p-2.5">कैफियत (Remarks)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                {validTests.map((test, tIdx) => (
                                  <tr key={tIdx} className="hover:bg-blue-50/30">
                                    <td className="p-2.5 text-center text-slate-400 font-bold">{toNepaliDigits(tIdx + 1)}</td>
                                    <td className="p-2.5 font-bold text-slate-900">{test.testName}</td>
                                    <td className="p-2.5 font-black text-blue-800 bg-blue-50/50">{test.result || '-'}</td>
                                    <td className="p-2.5 text-slate-600 text-xs font-mono">{test.unit || '-'}</td>
                                    <td className="p-2.5 text-slate-600 text-xs font-mono">{test.normalRange || '-'}</td>
                                    <td className="p-2.5 text-slate-500 text-xs italic">{test.remarks || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl">
                            यस प्रयोगशाला प्रतिवेदनको नतिजा प्रविष्ट गर्ने क्रममा छ (Test results are currently being prepared).
                          </div>
                        )}

                        {report.createdBy && (
                          <div className="text-[11px] text-slate-400 text-right italic">
                            परीक्षण गर्ने स्वास्थ्यकर्मी / Lab Technician: {report.createdBy}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : hasLabItemsInBill ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-3">
                  <FlaskConical size={20} className="text-amber-600 shrink-0" />
                  <div>
                    <strong className="block font-bold text-amber-900 mb-0.5">प्रयोगशाला रिपोर्ट प्रक्रियामा छ (Laboratory Report Pending)</strong>
                    <p className="text-[11px] text-amber-700">
                      यस इनभ्वाइसमा प्रयोगशाला सेवाका जाँचहरू समावेश छन्। प्रयोगशालाबाट नतिजा तयार भएपछि अनलाइन रिपोर्ट यहाँ स्वतः देखिनेछ।
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Totals & Financial Breakdown */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-6">
                <div className="w-full sm:w-1/2 space-y-3 text-xs text-slate-600">
                  {matchedBill.remarks && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <strong className="block font-bold text-slate-700 mb-1">कैफियत / टिप्पणी (Remarks):</strong>
                      <p>{matchedBill.remarks}</p>
                    </div>
                  )}
                  {matchedBill.insuranceNo && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
                      <strong className="block font-bold mb-0.5">स्वास्थ्य बीमा विवरण (Health Insurance):</strong>
                      <p>बीमा नम्: {matchedBill.insuranceNo} {matchedBill.claimCode && `| Claim Code: ${matchedBill.claimCode}`}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-1/2 space-y-2 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>सब-टोटल (Sub Total):</span>
                    <span className="font-mono font-bold">रु. {matchedBill.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>छुट (Discount):</span>
                    <span className="font-mono font-bold text-rose-600">- रु. {matchedBill.discount.toFixed(2)}</span>
                  </div>
                  {matchedBill.refundedAmount && matchedBill.refundedAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>फिर्ता रकम (Refunded):</span>
                      <span className="font-mono font-bold">- रु. {matchedBill.refundedAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-black text-slate-800">
                    <span>कुल जम्मा (Grand Total):</span>
                    <span className="font-mono text-blue-700">रु. {matchedBill.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Online Report Instruction Box */}
              <div className="p-3.5 bg-blue-50/80 border border-dashed border-blue-300 rounded-2xl text-center font-nepali my-4">
                <p className="text-xs font-bold text-slate-700">
                  अनलाइन प्रतिवेदन कोड (Online Report Passcode):{' '}
                  <span className="font-mono text-blue-900 text-sm font-black px-2.5 py-0.5 bg-white border border-blue-200 rounded-md tracking-widest inline-block shadow-xs">
                    {searchedPasscode || matchedBill.passcode || 'N/A'}
                  </span>
                </p>
                <p className="text-xs font-medium text-slate-700 mt-1.5">
                  अनलाइन रिपोर्ट हेर्न <span className="font-bold text-blue-800">smartinventoryy.com</span> लिङ्क खोली User Name: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200 text-slate-800">12345</span>, Password: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200 text-slate-800">12345</span> राखी आफ्नो पासकोड राख्नुहोस्।
                </p>
              </div>

              {/* Official Seal / Signature Footer */}
              <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
                <div>
                  <p className="font-semibold">प्रविष्टि गर्ने / Printed By: {matchedBill.createdBy || currentUser?.username || 'प्रणाली'}</p>
                  <p>जारी मिति: {toNepaliDigits(matchedBill.billDate)}</p>
                </div>
                <div className="text-center">
                  <p className="italic text-slate-400">कम्प्युटरबाट जनरेट गरिएको आधिकारिक अनलाइन रिपोर्ट।</p>
                </div>
                <div className="text-right">
                  <div className="h-10 border-b border-slate-400 w-36 mb-1 ml-auto"></div>
                  <p className="font-bold text-slate-700">अधिकृत दस्तखत (Authorized Signature)</p>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Printable Template for Exact Laboratory Report Format */}
          {matchedLabReports.length > 0 && (
            <div className={`printable-area ${printTarget === 'lab' ? 'block' : 'hidden print:block'} font-sans bg-white text-slate-900 p-8`}>
              {matchedLabReports.map((report, rIdx) => {
                const validTests = report.tests?.filter(
                  test => (test.result && test.result.trim() !== '') || (test.remarks && test.remarks.trim() !== '')
                ) || [];

                return (
                  <div key={rIdx} className={rIdx > 0 ? "page-break-before pt-8 border-t border-slate-300 print:border-none" : ""}>
                    {/* Header */}
                    <div className="mb-8 border-b-2 border-slate-800 pb-6">
                      <div className="flex justify-between items-start">
                        <div className="w-24 h-24">
                          <img 
                            src={generalSettings?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 text-center px-4">
                          <h1 className="text-2xl font-black text-slate-900 mb-1">{generalSettings?.orgNameNepali || ''}</h1>
                          {generalSettings?.subTitleNepali && <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings.subTitleNepali}</p>}
                          {generalSettings?.subTitleNepali2 && <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings.subTitleNepali2}</p>}
                          {generalSettings?.subTitleNepali3 && <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings.subTitleNepali3}</p>}
                          {generalSettings?.subTitleNepali4 && <p className="text-xs font-bold text-slate-600 mb-0.5">{generalSettings.subTitleNepali4}</p>}
                          <p className="text-xs font-bold text-slate-500 mt-1">{generalSettings?.address || ''}</p>
                          <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 mt-1">
                            {generalSettings?.phone && <p>फोन नं: {generalSettings.phone}</p>}
                            {generalSettings?.panNo && <p>PAN No: {generalSettings.panNo}</p>}
                          </div>
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
                      <div className="text-center mt-4">
                        <h2 className="text-lg font-bold border-2 border-slate-800 inline-block px-6 py-1 rounded-md uppercase tracking-wider">
                          Laboratory Report
                        </h2>
                      </div>
                    </div>

                    {/* Patient Details */}
                    <div className="flex justify-between mb-6 text-sm border-b border-slate-200 pb-4">
                      <div className="space-y-1">
                        <p><strong>Patient Name:</strong> {report.patientName || matchedBill?.patientName || '-'}</p>
                        <p><strong>Age/Gender:</strong> {report.age || matchedPatient?.age || '-'} / {report.gender || matchedPatient?.gender || '-'}</p>
                        <p><strong>Patient ID:</strong> {matchedPatient?.uniquePatientId || matchedBill?.serviceSeekerId || report.serviceSeekerId || '-'}</p>
                        {report.referredBy && (
                          <p><strong>Referred By:</strong> {report.referredBy}</p>
                        )}
                      </div>
                      <div className="space-y-1 text-right">
                        <p><strong>Report Date:</strong> {toNepaliDigits(report.reportDate)}</p>
                        <p><strong>Report ID:</strong> <span className="font-mono">{report.id}</span></p>
                        {(report.invoiceNumber || matchedBill?.invoiceNumber) && (
                          <p><strong>Invoice No:</strong> <span className="font-mono">{report.invoiceNumber || matchedBill?.invoiceNumber}</span></p>
                        )}
                        {report.barcodeId && (
                          <p><strong>Barcode:</strong> <span className="font-mono">{report.barcodeId}</span></p>
                        )}
                      </div>
                    </div>

                    {/* Test Results Table */}
                    <table className="w-full mb-6 text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-800 bg-slate-50 font-bold">
                          <th className="py-2.5 px-4 text-left">Test Name</th>
                          <th className="py-2.5 px-4 text-left">Result</th>
                          <th className="py-2.5 px-4 text-left">Unit</th>
                          <th className="py-2.5 px-4 text-left">Reference Range</th>
                          <th className="py-2.5 px-4 text-left">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validTests.map((test, idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="py-2 px-4 font-medium">{test.testName}</td>
                            <td className="py-2 px-4 font-bold text-slate-900">{test.result || '-'}</td>
                            <td className="py-2 px-4 text-slate-600 font-mono text-xs">{test.unit || '-'}</td>
                            <td className="py-2 px-4 text-slate-600 font-mono text-xs">{test.normalRange || '-'}</td>
                            <td className="py-2 px-4 text-slate-600 italic text-xs">{test.remarks || '-'}</td>
                          </tr>
                        ))}
                        {validTests.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                              प्रयोगशाला नतिजा प्रविष्ट भइरहेको छ (Test results are currently being prepared).
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
                      <div>
                        <p>Prepared By: {report.createdBy || 'Lab Technician'}</p>
                        <p>Printed On: {new Date().toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="h-8 border-b border-slate-300 w-32 mb-1 ml-auto"></div>
                        <p>Lab Technician / Pathologist</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
