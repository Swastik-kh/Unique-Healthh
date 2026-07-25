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
  Info
} from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord, BillingRecord, User as AppUser, OrganizationSettings } from '../types/coreTypes';
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
}

export const OnlineReport: React.FC<OnlineReportProps> = ({
  currentFiscalYear,
  currentUser,
  generalSettings,
  serviceSeekerRecords = [],
  opdRecords = [],
  billingRecords = []
}) => {
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [searchedPasscode, setSearchedPasscode] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState<boolean>(false);

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

  // Find matching billing record by passcode or invoice number
  const matchedBill = useMemo(() => {
    if (!searchedPasscode) return null;
    const cleanSearch = searchedPasscode.trim().toLowerCase();
    if (!cleanSearch) return null;

    return billingRecords.find(b => {
      const explicitPasscode = b.passcode ? b.passcode.toLowerCase() : '';
      const effectivePasscode = getEffectivePasscode(b).toLowerCase();
      const invoiceNo = (b.invoiceNumber || '').toLowerCase();
      const manualInvoiceNo = (b.manualInvoiceNumber || '').toLowerCase();

      return explicitPasscode === cleanSearch || 
             effectivePasscode === cleanSearch || 
             invoiceNo === cleanSearch || 
             manualInvoiceNo === cleanSearch;
    }) || null;
  }, [searchedPasscode, billingRecords]);

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

  const handlePrint = () => {
    window.print();
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
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>पासकोड: {searchedPasscode} (Verified)</span>
                </span>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm"
                >
                  <Printer size={16} />
                  <span>रिपोर्ट प्रिन्ट गर्नुहोस् (Print Report)</span>
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
            <div ref={reportPrintRef} className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 shadow-lg space-y-8 font-nepali">
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
        </div>
      )}
    </div>
  );
};
