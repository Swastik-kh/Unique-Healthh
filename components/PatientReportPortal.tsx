import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Lock, FileText, CheckCircle2, ShieldCheck, Printer, ArrowLeft, Activity, User, Calendar, FlaskConical, Stethoscope, Pill, AlertCircle, Sparkles, Building2, Eye, RefreshCw, X } from 'lucide-react';
import { BillingRecord, LabReport, OPDRecord, XRayRecord, USGRecord, ECGRecord, DispensaryRecord, ServiceSeekerRecord, OrganizationSettings } from '../types';
import { LogoDisplay } from './LogoDisplay';
import { useReactToPrint } from 'react-to-print';

export const getReportPasscode = (bill: { reportPasscode?: string; invoiceNumber?: string; id?: string; serviceSeekerId?: string } | null | undefined): string => {
  if (!bill) return '123456';
  if (bill.reportPasscode) return bill.reportPasscode;
  const seed = (bill.invoiceNumber || bill.id || bill.serviceSeekerId || '123456') + '_HEALTH_PASS';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const code = (Math.abs(hash) % 900000 + 100000).toString();
  return code;
};

interface PatientReportPortalProps {
  billingRecords: BillingRecord[];
  labReports?: LabReport[];
  opdRecords?: OPDRecord[];
  xrayRecords?: XRayRecord[];
  usgRecords?: USGRecord[];
  ecgRecords?: ECGRecord[];
  dispensaryRecords?: DispensaryRecord[];
  serviceSeekerRecords?: ServiceSeekerRecord[];
  generalSettings?: OrganizationSettings;
  isOpen?: boolean;
  onClose?: () => void;
  initialInvoiceNo?: string;
  initialPasscode?: string;
}

export const PatientReportPortal: React.FC<PatientReportPortalProps> = ({
  billingRecords = [],
  labReports = [],
  opdRecords = [],
  xrayRecords = [],
  usgRecords = [],
  ecgRecords = [],
  dispensaryRecords = [],
  serviceSeekerRecords = [],
  generalSettings,
  isOpen = true,
  onClose,
  initialInvoiceNo = '',
  initialPasscode = ''
}) => {
  const [invoiceInput, setInvoiceInput] = useState(initialInvoiceNo);
  const [passcodeInput, setPasscodeInput] = useState(initialPasscode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authenticatedBill, setAuthenticatedBill] = useState<BillingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const printReportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printReportRef,
    documentTitle: `Patient_Report_${authenticatedBill?.invoiceNumber || 'Online'}`,
  });

  // Auto verify if initial props are passed
  useEffect(() => {
    if (initialPasscode || initialInvoiceNo) {
      verifyAndFetch(initialInvoiceNo, initialPasscode);
    }
  }, [initialInvoiceNo, initialPasscode, billingRecords]);

  const verifyAndFetch = (inv: string, pass: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const cleanInv = inv.trim().toLowerCase();
      const cleanPass = pass.trim();

      if (!cleanPass) {
        setErrorMsg('कृपया ६-अङ्की युजर पासकोड हाल्नुहोस्।');
        setIsLoading(false);
        return;
      }

      // Search matching bill purely by passcode
      const matchedBill = billingRecords.find(b => {
        const expectedPass = getReportPasscode(b);
        const passMatch = expectedPass === cleanPass || (b.reportPasscode && b.reportPasscode === cleanPass);
        if (!passMatch) return false;

        if (cleanInv) {
          const invMatch = (b.invoiceNumber || '').toLowerCase() === cleanInv ||
                           (b.serviceSeekerId || '').toLowerCase() === cleanInv ||
                           (b.manualInvoiceNumber || '').toLowerCase() === cleanInv ||
                           (b.id || '').toLowerCase() === cleanInv;
          return invMatch;
        }

        return true;
      });

      if (matchedBill) {
        setAuthenticatedBill(matchedBill);
        setErrorMsg(null);
      } else {
        setAuthenticatedBill(null);
        setErrorMsg('गलत पासकोड! कृपया आफ्नो बिलमा छापिएको पासकोड पुनः हेरी प्रयास गर्नुहोस्।');
      }
      setIsLoading(false);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAndFetch(invoiceInput, passcodeInput);
  };

  // Matched Patient Details & Reports
  const matchedPatient = useMemo(() => {
    if (!authenticatedBill) return null;
    return serviceSeekerRecords.find(s => 
      s.id === authenticatedBill.serviceSeekerId || 
      s.uniquePatientId === authenticatedBill.serviceSeekerId ||
      s.registrationNumber === authenticatedBill.serviceSeekerId
    ) || null;
  }, [authenticatedBill, serviceSeekerRecords]);

  const patientLabReports = useMemo(() => {
    if (!authenticatedBill) return [];
    return labReports.filter(lr => 
      lr.invoiceNumber === authenticatedBill.invoiceNumber ||
      lr.serviceSeekerId === authenticatedBill.serviceSeekerId ||
      (matchedPatient && lr.serviceSeekerId === matchedPatient.id)
    );
  }, [authenticatedBill, labReports, matchedPatient]);

  const patientOpdRecords = useMemo(() => {
    if (!authenticatedBill) return [];
    return opdRecords.filter(opd => 
      opd.uniquePatientId === authenticatedBill.serviceSeekerId ||
      (matchedPatient && opd.uniquePatientId === matchedPatient.uniquePatientId)
    );
  }, [authenticatedBill, opdRecords, matchedPatient]);

  const patientXrayRecords = useMemo(() => {
    if (!authenticatedBill) return [];
    return xrayRecords.filter(r => 
      r.serviceSeekerId === authenticatedBill.serviceSeekerId ||
      (matchedPatient && r.serviceSeekerId === matchedPatient.id)
    );
  }, [authenticatedBill, xrayRecords, matchedPatient]);

  const patientUsgRecords = useMemo(() => {
    if (!authenticatedBill) return [];
    return usgRecords.filter(r => 
      r.serviceSeekerId === authenticatedBill.serviceSeekerId ||
      (matchedPatient && r.serviceSeekerId === matchedPatient.id)
    );
  }, [authenticatedBill, usgRecords, matchedPatient]);

  const patientEcgRecords = useMemo(() => {
    if (!authenticatedBill) return [];
    return ecgRecords.filter(r => 
      r.serviceSeekerId === authenticatedBill.serviceSeekerId ||
      (matchedPatient && r.serviceSeekerId === matchedPatient.id)
    );
  }, [authenticatedBill, ecgRecords, matchedPatient]);

  const patientDispensaryRecords = useMemo(() => {
    if (!authenticatedBill) return [];
    return dispensaryRecords.filter(r => 
      r.invoiceNumber === authenticatedBill.invoiceNumber ||
      r.serviceSeekerId === authenticatedBill.serviceSeekerId ||
      (matchedPatient && r.serviceSeekerId === matchedPatient.id)
    );
  }, [authenticatedBill, dispensaryRecords, matchedPatient]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="relative bg-white text-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Bar Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold font-nepali text-white flex items-center gap-2">
                अनलाइन बिरामी रिपोर्ट पोर्टल (Online Patient Report Portal)
              </h2>
              <p className="text-xs text-slate-400 font-nepali">
                युजर पासकोड (User Passcode) हालेर आफ्नो मेडिकल तथा प्रयोगशाला रिपोर्ट हेर्नुहोस्
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="बन्द गर्नुहोस्"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

          {!authenticatedBill ? (
            /* Login / Search Form */
            <div className="max-w-md mx-auto my-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                  <Lock size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-nepali">सुरक्षित रिपोर्ट लगइन</h3>
                <p className="text-xs text-slate-500 font-nepali leading-relaxed">
                  तपाईंको सेवासम्बन्धी बिलमा छापिएको **६-अङ्की युजर पासकोड** प्रयोग गर्नुहोस्।
                </p>
              </div>

              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-nepali flex items-start gap-2 animate-in shake">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 font-nepali">
                    युजर पासकोड (User Passcode) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                    <input
                      type="text"
                      required
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="६-अङ्की पासकोड हाल्नुहोस् (उदा: 582019)"
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono tracking-widest font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 font-nepali">
                    इन्भोइस / बिल नम्बर (वैकल्पिक / Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={invoiceInput}
                      onChange={(e) => setInvoiceInput(e.target.value)}
                      placeholder="इन्भोइस नं (ऐच्छिक)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm font-nepali shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>प्रमाणित हुँदैछ...</span>
                    </>
                  ) : (
                    <>
                      <Eye size={18} />
                      <span>रिपोर्ट हेर्नुहोस् (View Report)</span>
                    </>
                  )}
                </button>
              </form>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-nepali text-center space-y-1">
                <p className="font-bold text-slate-700">💡 पासकोड कहाँ पाइन्छ?</p>
                <p>पासकोड तपाईंको सेवासम्बन्धी बिल (Service Invoice) को पुछारमा उल्लेख गरिएको हुन्छ।</p>
              </div>

              {onClose && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-slate-500 hover:text-indigo-600 font-bold font-nepali transition-colors inline-flex items-center gap-1"
                  >
                    ← कर्मचारी लगइन पृष्ठमा जानुहोस् (Staff Login)
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Verified Report Display */
            <div className="space-y-6">

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setAuthenticatedBill(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all font-nepali"
                >
                  <ArrowLeft size={16} /> फरक बिल खोज्नुहोस्
                </button>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full font-nepali flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" /> प्रमाणित बिरामी रिपोर्ट
                  </span>
                  <button
                    onClick={() => handlePrint()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md font-nepali"
                  >
                    <Printer size={16} /> रिपोर्ट प्रिन्ट / PDF डाउनलोड
                  </button>
                </div>
              </div>

              {/* Printable Area Wrapper */}
              <div ref={printReportRef} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 print:p-6 print:shadow-none print:border-none">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
                  <div className="w-24">
                    {generalSettings ? (
                      <LogoDisplay settings={generalSettings} width={80} height={80} />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400 font-bold">Logo</div>
                    )}
                  </div>
                  <div className="text-center flex-1 px-4">
                    <h1 className="text-2xl font-black text-slate-900 mb-1">
                      {generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था (Health Facility)'}
                    </h1>
                    <p className="text-sm font-bold text-slate-700">{generalSettings?.subTitleNepali || ''}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{generalSettings?.address || ''} {generalSettings?.phone ? `| फोन: ${generalSettings.phone}` : ''}</p>
                    <h2 className="text-base font-bold mt-2 border-2 border-slate-800 inline-block px-4 py-0.5 rounded-full uppercase tracking-wide bg-slate-50">
                      PATIENT MEDICAL & DIAGNOSTIC REPORT
                    </h2>
                  </div>
                  <div className="w-24 text-right text-[11px] font-mono">
                    <p><strong>Ref No:</strong> {authenticatedBill.invoiceNumber}</p>
                    <p><strong>Date:</strong> {authenticatedBill.billDate}</p>
                  </div>
                </div>

                {/* Patient Summary Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-nepali">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">बिरामीको नाम (Patient Name):</span>
                    <span className="font-bold text-slate-900 text-sm">{authenticatedBill.patientName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">बिरामी ID (Patient ID):</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">{authenticatedBill.serviceSeekerId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">इन्भोइस नम्बर (Invoice No):</span>
                    <span className="font-bold text-indigo-700 font-mono text-sm">{authenticatedBill.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">उमेर/लिङ्ग (Age/Gender):</span>
                    <span className="font-bold text-slate-800">
                      {matchedPatient ? `${matchedPatient.age || '-'} / ${matchedPatient.gender || '-'}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">ठेगाना (Address):</span>
                    <span className="font-bold text-slate-800">{matchedPatient?.address || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">सम्पर्क नं (Contact No):</span>
                    <span className="font-bold text-slate-800">{matchedPatient?.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">भुक्तानी किसिम (Payment):</span>
                    <span className="font-bold text-slate-800">{authenticatedBill.paymentMode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">पासकोड (Passcode):</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">{getReportPasscode(authenticatedBill)}</span>
                  </div>
                </div>

                {/* 1. Lab Reports Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 font-nepali flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FlaskConical className="text-indigo-600" size={18} />
                    प्रयोगशाला परीक्षण रिपोर्टहरू (Laboratory Test Results)
                  </h3>

                  {patientLabReports.length > 0 ? (
                    <div className="space-y-4">
                      {patientLabReports.map((report, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                          <div className="flex justify-between items-center text-xs border-b pb-2 font-bold text-slate-700">
                            <span>परीक्षण: {report.testName || 'Lab Test'}</span>
                            <span className="text-slate-500">मिति: {report.reportDate || authenticatedBill.billDate}</span>
                          </div>

                          {report.subTests && report.subTests.length > 0 ? (
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                                  <th className="p-2">परीक्षण नाम (Parameter)</th>
                                  <th className="p-2 text-center">नतिजा (Result)</th>
                                  <th className="p-2">इकाइ (Unit)</th>
                                  <th className="p-2">सामान्य मान (Ref Range)</th>
                                  <th className="p-2 text-center">अवस्था (Status)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.subTests.map((st, sidx) => (
                                  <tr key={sidx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="p-2 font-semibold text-slate-800">{st.testName}</td>
                                    <td className="p-2 text-center font-bold font-mono text-indigo-700">{st.resultValue || '-'}</td>
                                    <td className="p-2 text-slate-500">{st.unit || '-'}</td>
                                    <td className="p-2 text-slate-500 font-mono">{st.valueRange || '-'}</td>
                                    <td className="p-2 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.isAbnormal ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {st.isAbnormal ? 'Abnormal' : 'Normal'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded text-xs text-slate-700">
                              <p><strong>नतिजा (Result):</strong> {report.resultSummary || 'सम्पन्न भयो (Completed)'}</p>
                            </div>
                          )}

                          {report.doctorRemarks && (
                            <p className="text-xs text-slate-600 italic bg-amber-50 p-2 rounded border border-amber-100">
                              <strong>चिकित्सकको राय:</strong> {report.doctorRemarks}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-nepali">
                      यस बिलसँग सम्बन्धित कुनै प्रयोगशाला परीक्षण रिपोर्ट भेटिएन।
                    </div>
                  )}
                </div>

                {/* 2. OPD / Prescriptions Section */}
                {patientOpdRecords.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 font-nepali flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Stethoscope className="text-teal-600" size={18} />
                      ओपिडी परामर्श तथा प्रेस्क्रिप्सन (OPD Consultation & Clinical Summary)
                    </h3>
                    <div className="space-y-3">
                      {patientOpdRecords.map((opd, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white text-xs space-y-2">
                          <div className="flex justify-between font-bold text-slate-800 border-b pb-1.5">
                            <span>भिजिट मिति: {opd.visitDate}</span>
                            <span>चिकित्सक: {opd.assignedDoctor || 'Medical Officer'}</span>
                          </div>
                          {opd.chiefComplaints && <p><strong>मुख्य समस्या:</strong> {opd.chiefComplaints}</p>}
                          {opd.diagnosis && <p><strong>रोगको निदान (Diagnosis):</strong> {opd.diagnosis}</p>}
                          {opd.prescribedMedicines && opd.prescribedMedicines.length > 0 && (
                            <div className="mt-2">
                              <span className="font-bold text-slate-700 block mb-1">सिफारिस गरिएका औषधिहरू:</span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                                {opd.prescribedMedicines.map((m, midx) => (
                                  <li key={midx}>
                                    {m.medicineName} - {m.dosage} ({m.frequency} x {m.durationDays} दिन)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Diagnostic / Radiology Services */}
                {(patientXrayRecords.length > 0 || patientUsgRecords.length > 0 || patientEcgRecords.length > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 font-nepali flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Activity className="text-purple-600" size={18} />
                      रेडियोलोजी तथा अन्य जाँच रिपोर्टहरू (Radiology & Diagnostics)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {patientXrayRecords.map((x, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                          <span className="font-bold text-purple-800 block">🩻 X-Ray Report</span>
                          <p><strong>जाँच:</strong> {x.bodyPart || 'X-Ray'}</p>
                          <p><strong>निष्कर्ष:</strong> {x.findings || 'Normal'}</p>
                        </div>
                      ))}
                      {patientUsgRecords.map((u, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                          <span className="font-bold text-blue-800 block">🔊 USG (भिडियो X-Ray)</span>
                          <p><strong>भाग:</strong> {u.scanType || 'Abdomen'}</p>
                          <p><strong>निष्कर्ष:</strong> {u.impression || 'Normal'}</p>
                        </div>
                      ))}
                      {patientEcgRecords.map((e, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                          <span className="font-bold text-emerald-800 block">📈 ECG Report</span>
                          <p><strong>लय (Rhythm):</strong> {e.rhythm || 'Normal Sinus'}</p>
                          <p><strong>निष्कर्ष:</strong> {e.findings || 'Normal'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Billing Summary Items */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 font-nepali flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FileText className="text-slate-700" size={18} />
                    सेवा तथा बिल विवरण (Billed Services)
                  </h3>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2">क्र.सं.</th>
                        <th className="p-2">सेवाको नाम</th>
                        <th className="p-2 text-right">दर (रु.)</th>
                        <th className="p-2 text-center">परिमाण</th>
                        <th className="p-2 text-right">जम्मा (रु.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authenticatedBill.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-medium">{item.serviceName}</td>
                          <td className="p-2 text-right font-mono">{item.price.toFixed(2)}</td>
                          <td className="p-2 text-center font-mono">{item.quantity}</td>
                          <td className="p-2 text-right font-mono font-bold">{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end text-xs font-bold space-x-6 pt-2">
                    <span>Subtotal: Rs. {authenticatedBill.subTotal.toFixed(2)}</span>
                    <span>Discount: Rs. {authenticatedBill.discount.toFixed(2)}</span>
                    <span className="text-indigo-700 font-mono text-sm">Grand Total: Rs. {authenticatedBill.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer Signature Notice */}
                <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-[11px] text-slate-500 font-nepali">
                  <div>
                    <p>प्रमाणित गरिएको मिति: {new Date().toLocaleDateString('ne-NP')}</p>
                    <p className="text-[10px]">यो कम्प्युटर जनरेटेड अनलाइन डिजिटल रिपोर्ट हो।</p>
                  </div>
                  <div className="text-center border-t border-slate-400 pt-1 px-8">
                    <p className="font-bold text-slate-800">अधिकृत हस्ताक्षर (Authorized Signatory)</p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
