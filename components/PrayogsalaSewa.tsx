import React, { useState, useRef, useMemo } from 'react';
import { Search, FileText, User, Activity, Save, Printer, History, FlaskConical, Trash2, CheckCircle2, Beaker } from 'lucide-react';
import Barcode from 'react-barcode';
import { ServiceSeekerRecord, BillingRecord, ServiceItem, LabReport, LabTestResult, OrganizationSettings } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface PrayogsalaSewaProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  billingRecords: BillingRecord[];
  serviceItems: ServiceItem[];
  labReports: LabReport[];
  onSaveRecord: (record: LabReport) => void;
  onDeleteRecord: (id: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  generalSettings: OrganizationSettings;
}

interface PendingTest extends LabTestResult {
  invoiceNumber: string;
}

export const PrayogsalaSewa: React.FC<PrayogsalaSewaProps> = ({
  serviceSeekerRecords = [],
  billingRecords = [],
  serviceItems = [],
  labReports = [],
  onSaveRecord,
  onDeleteRecord,
  currentFiscalYear,
  currentUser,
  generalSettings
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [pendingTests, setPendingTests] = useState<PendingTest[]>([]);
  const [currentReport, setCurrentReport] = useState<LabReport | null>(null);
  const [currentBarcodeReport, setCurrentBarcodeReport] = useState<LabReport | null>(null);
  const [activeTab, setActiveTab] = useState<'sample' | 'result'>('sample');
  const [viewMode, setViewMode] = useState<'search' | 'dashboard'>('dashboard');
  const [activeSubMenu, setActiveSubMenu] = useState<'collection' | 'entry'>('collection');
  
  const printRef = useRef<HTMLDivElement>(null);
  const barcodePrintRef = useRef<HTMLDivElement>(null);

  const handlePrintBarcode = useReactToPrint({
    contentRef: barcodePrintRef,
    documentTitle: `Barcode-${currentBarcodeReport?.barcodeId || 'New'}`,
  });

  const handleCollectInvoiceSamples = (invoiceNumber: string) => {
    if (!currentPatient) return;

    // Generate a unique barcode ID for the entire invoice
    const barcodeId = `BC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const collectionDate = new NepaliDate().format('YYYY-MM-DD HH:mm');
    const collectedBy = currentUser?.username || 'System';

    const updatedTests = pendingTests.map(t => t.invoiceNumber === invoiceNumber ? { 
      ...t, 
      sampleCollected: true, 
      sampleCollectedDate: collectionDate,
      sampleCollectedBy: collectedBy,
      barcodeId: barcodeId
    } : t);
    
    setPendingTests(updatedTests);

    // Save to database
    const invoiceTests = updatedTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
    
    const existingReport = labReports.find(r => 
      r.serviceSeekerId === currentPatient.id && 
      r.invoiceNumber === invoiceNumber
    );

    const reportToSave: LabReport = {
      id: existingReport?.id || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: existingReport?.reportDate || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      invoiceNumber: invoiceNumber,
      tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
      status: existingReport?.status === 'Completed' ? 'Completed' : 'Sample Collected',
      createdBy: existingReport?.createdBy || currentUser?.username || 'Unknown',
      barcodeId: barcodeId
    };

    onSaveRecord(reportToSave);
    
    // Set current barcode report and print
    setCurrentBarcodeReport(reportToSave);
    setTimeout(() => {
      if (barcodePrintRef.current) {
        handlePrintBarcode();
      }
    }, 300);

    alert(`Invoice ${invoiceNumber} को सबै नमुना संकलन गरियो र बारकोड प्रिन्टको लागि तयार छ।`);
    setActiveTab('result');
  };

  const handleCollectSample = (id: string) => {
    if (!currentPatient) return;

    const testToCollect = pendingTests.find(t => t.id === id);
    if (!testToCollect) return;

    const invoiceNumber = testToCollect.invoiceNumber;
    
    // Check if a barcode already exists for this invoice in existing reports
    const existingReport = labReports.find(r => 
      r.serviceSeekerId === currentPatient.id && 
      r.invoiceNumber === invoiceNumber
    );

    const barcodeId = existingReport?.barcodeId || `BC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const updatedTests = pendingTests.map(t => t.id === id ? { 
      ...t, 
      sampleCollected: true, 
      sampleCollectedDate: new NepaliDate().format('YYYY-MM-DD HH:mm'),
      sampleCollectedBy: currentUser?.username || 'System',
      barcodeId: barcodeId
    } : t);
    
    setPendingTests(updatedTests);

    // Auto-save to database immediately
    const invoiceTests = updatedTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
    
    const reportToSave: LabReport = {
      id: existingReport?.id || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: existingReport?.reportDate || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      invoiceNumber: invoiceNumber,
      tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
      status: existingReport?.status === 'Completed' ? 'Completed' : 'Sample Collected',
      createdBy: existingReport?.createdBy || currentUser?.username || 'Unknown',
      barcodeId: barcodeId
    };

    onSaveRecord(reportToSave);
    
    // Set current barcode report and print
    setCurrentBarcodeReport(reportToSave);
    setTimeout(() => {
      if (barcodePrintRef.current) {
        handlePrintBarcode();
      }
    }, 300);

    alert('नमुना सफलतापूर्वक संकलन गरियो।');

    // Check if all samples for this invoice are collected, if so, switch to result tab
    const allInvoiceTests = updatedTests.filter(t => t.invoiceNumber === invoiceNumber);
    const allCollected = allInvoiceTests.every(t => t.sampleCollected);
    if (allCollected) {
      setActiveTab('result');
    }
  };

  const handleSaveCollection = (invoiceNumber: string) => {
    if (!currentPatient) return;

    const invoiceTests = pendingTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
    
    if (invoiceTests.length === 0) {
      alert("कृपया कम्तिमा एउटा नमुना संकलन गर्नुहोस् (Please collect at least one sample)");
      return;
    }

    // Check if a report already exists for this invoice
    const existingReport = labReports.find(r => 
      r.serviceSeekerId === currentPatient.id && 
      r.invoiceNumber === invoiceNumber
    );

    const reportToSave: LabReport = {
      id: existingReport?.id || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: existingReport?.reportDate || new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      invoiceNumber: invoiceNumber,
      tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
      status: existingReport?.status === 'Completed' ? 'Completed' : 'Sample Collected',
      createdBy: existingReport?.createdBy || currentUser?.username || 'Unknown'
    };

    onSaveRecord(reportToSave);
    alert(`Invoice ${invoiceNumber} को नमुना संकलन सुरक्षित गरियो।`);
    loadPendingTests(currentPatient.id);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = serviceSeekerRecords.find(p => p.uniquePatientId === searchId || p.mulDartaNo === searchId);
    if (patient) {
      setCurrentPatient(patient);
      loadPendingTests(patient.id);
    } else {
      alert('बिरामी फेला परेन (Patient not found)');
    }
  };

  const loadPendingTests = (patientId: string) => {
    const labServices = serviceItems.filter(s => s.category === 'Lab');
    const labServiceNames = new Set(labServices.map(s => s.serviceName.trim().toLowerCase()));
    const labSubTestNames = new Set(labServices.flatMap(s => s.subTests || []).map(st => st.testName.trim().toLowerCase()));

    const patientBills = billingRecords.filter(b => b.serviceSeekerId === patientId);
    const tests: PendingTest[] = [];

    patientBills.forEach(bill => {
      const existingReport = labReports.find(r => r.invoiceNumber === bill.invoiceNumber && r.serviceSeekerId === patientId);
      
      bill.items.forEach(item => {
        const itemName = item.serviceName.trim().toLowerCase();
        const isLabService = labServiceNames.has(itemName);
        const isLabSubTest = labSubTestNames.has(itemName);

        if (isLabService || isLabSubTest) {
          const existingTest = existingReport?.tests?.find(t => t.testName.trim().toLowerCase() === itemName);
          
          tests.push({
            id: existingTest?.id || `${bill.invoiceNumber}-${item.serviceName}-${Date.now()}`,
            testName: item.serviceName,
            unit: existingTest?.unit || '',
            normalRange: existingTest?.normalRange || '',
            result: existingTest?.result || '',
            remarks: existingTest?.remarks || '',
            sampleCollected: existingTest?.sampleCollected || false,
            sampleCollectedDate: existingTest?.sampleCollectedDate || '',
            sampleCollectedBy: existingTest?.sampleCollectedBy || '',
            invoiceNumber: bill.invoiceNumber,
            barcodeId: existingTest?.barcodeId || existingReport?.barcodeId || ''
          });
        }
      });
    });

    setPendingTests(tests);
  };

  const handleResultChange = (id: string, field: keyof LabTestResult, value: string) => {
    setPendingTests(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveReport = (invoiceNumber: string) => {
    if (!currentPatient) return;

    const invoiceTests = pendingTests.filter(t => t.invoiceNumber === invoiceNumber && t.sampleCollected);
    
    // Check if any result or remark is entered
    const hasAnyData = invoiceTests.some(t => 
      (t.result && t.result.trim() !== '') || 
      (t.remarks && t.remarks.trim() !== '')
    );

    if (!hasAnyData) {
      if (!window.confirm("तपाईंले कुनै पनि नतिजा वा कैफियत भर्नुभएको छैन। के तपाईं खाली रिपोर्ट सुरक्षित गर्न चाहनुहुन्छ? (You haven't entered any results or remarks. Do you want to save an empty report?)")) {
        return;
      }
    }

    const existingReport = labReports.find(r => 
      r.serviceSeekerId === currentPatient.id && 
      r.invoiceNumber === invoiceNumber
    );

    const newReport: LabReport = {
      id: existingReport?.id || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      invoiceNumber: invoiceNumber,
      tests: invoiceTests.map(({ invoiceNumber, ...rest }) => rest),
      status: 'Completed',
      createdBy: currentUser?.username || 'Unknown',
      barcodeId: existingReport?.barcodeId || invoiceTests[0]?.barcodeId || ''
    };

    onSaveRecord(newReport);
    setCurrentReport(newReport);
    
    if (window.confirm('रिपोर्ट सुरक्षित गरियो। के तपाइँ यसलाई प्रिन्ट गर्न चाहनुहुन्छ? (Report saved. Do you want to print it?)')) {
      setTimeout(() => {
        if (printRef.current) {
          handlePrint();
        }
      }, 300);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `LabReport-${currentReport?.id || 'New'}`,
  });

  const patientReports = useMemo(() => {
    if (!currentPatient) return [];
    return labReports.filter(r => r.serviceSeekerId === currentPatient.id).sort((a, b) => b.id.localeCompare(a.id));
  }, [labReports, currentPatient]);

  const groupedPendingTests = useMemo(() => {
    const groups: Record<string, PendingTest[]> = {};
    pendingTests.forEach(t => {
      if (!groups[t.invoiceNumber]) groups[t.invoiceNumber] = [];
      groups[t.invoiceNumber].push(t);
    });
    return groups;
  }, [pendingTests]);

  // Global Pending Tasks Logic
  const globalPendingTasks = useMemo(() => {
    const labServices = serviceItems.filter(s => s.category === 'Lab');
    const labServiceNames = new Set(labServices.map(s => s.serviceName.trim().toLowerCase()));
    const labSubTestNames = new Set(labServices.flatMap(s => s.subTests || []).map(st => st.testName.trim().toLowerCase()));

    const pendingSamples: any[] = [];
    const pendingResults: any[] = [];

    // Process all billing records to find lab items
    billingRecords.forEach(bill => {
      const patient = serviceSeekerRecords.find(p => p.id === bill.serviceSeekerId);
      if (!patient) return;

      const labItems = bill.items.filter(item => {
        const itemName = item.serviceName.trim().toLowerCase();
        return labServiceNames.has(itemName) || labSubTestNames.has(itemName);
      });

      if (labItems.length === 0) return;

      const existingReport = labReports.find(r => r.invoiceNumber === bill.invoiceNumber && r.serviceSeekerId === bill.serviceSeekerId);

      labItems.forEach(item => {
        const itemName = item.serviceName.trim().toLowerCase();
        const existingTest = existingReport?.tests?.find(t => t.testName.trim().toLowerCase() === itemName);

        const taskData = {
          patientId: patient.id,
          patientName: patient.name,
          patientPID: patient.uniquePatientId,
          testName: item.serviceName,
          invoiceNumber: bill.invoiceNumber,
          date: bill.date,
          status: existingTest?.sampleCollected ? (existingReport?.status === 'Completed' ? 'Completed' : 'Sample Collected') : 'Pending Sample',
          barcodeId: existingTest?.barcodeId || ''
        };

        if (!existingTest?.sampleCollected) {
          pendingSamples.push(taskData);
        } else if (existingReport?.status !== 'Completed') {
          pendingResults.push(taskData);
        }
      });
    });

    return { pendingSamples, pendingResults };
  }, [billingRecords, serviceSeekerRecords, labReports, serviceItems]);

  const handleSelectPatientFromDashboard = (patientId: string) => {
    const patient = serviceSeekerRecords.find(p => p.id === patientId);
    if (patient) {
      setCurrentPatient(patient);
      loadPendingTests(patient.id);
      setViewMode('search');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header & Navigation */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
            <FlaskConical className="text-primary-600" />
            प्रयोगशाला सेवा (Lab Service)
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => { setViewMode('dashboard'); setActiveSubMenu('collection'); }}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'dashboard' && activeSubMenu === 'collection' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              नमुना संकलन
            </button>
            <button 
              onClick={() => { setViewMode('dashboard'); setActiveSubMenu('entry'); }}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'dashboard' && activeSubMenu === 'entry' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              रिपोर्ट प्रविष्टि
            </button>
            <button 
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'search' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Patient Search
            </button>
          </div>
        </div>

        {viewMode === 'search' ? (
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="बिरामी ID (PID-XXXXXX) वा दर्ता नं. राख्नुहोस्"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <button type="submit" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-sm">
              खोज्नुहोस्
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                  <Beaker size={18} /> Pending Samples
                </h3>
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {globalPendingTasks.pendingSamples.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {globalPendingTasks.pendingSamples.length > 0 ? (
                  globalPendingTasks.pendingSamples.map((task, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleSelectPatientFromDashboard(task.patientId)}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-400 cursor-pointer transition-all hover:shadow-md group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-blue-600">{task.patientName}</p>
                          <p className="text-xs text-slate-500">{task.patientPID} | Inv: {task.invoiceNumber}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{task.date}</p>
                      </div>
                      <p className="text-xs mt-1 text-slate-600 font-medium">{task.testName}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-slate-400 italic text-sm">No pending samples</p>
                )}
              </div>
            </div>

            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-green-800 flex items-center gap-2">
                  <Activity size={18} /> Pending Results
                </h3>
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                  {globalPendingTasks.pendingResults.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {globalPendingTasks.pendingResults.length > 0 ? (
                  globalPendingTasks.pendingResults.map((task, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleSelectPatientFromDashboard(task.patientId)}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:border-green-400 cursor-pointer transition-all hover:shadow-md group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-green-600">{task.patientName}</p>
                          <p className="text-xs text-slate-500">{task.patientPID} | Barcode: {task.barcodeId}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{task.date}</p>
                      </div>
                      <p className="text-xs mt-1 text-slate-600 font-medium">{task.testName}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-slate-400 italic text-sm">No pending results</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'search' && currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient Info & History */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <User size={18} /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">नाम:</span> <span className="font-medium">{currentPatient.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ID:</span> <span className="font-mono bg-slate-100 px-2 rounded">{currentPatient.uniquePatientId} {currentPatient.mulDartaNo && `| ${currentPatient.mulDartaNo}`}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">उमेर/लिङ्ग:</span> <span>{currentPatient.age} / {currentPatient.gender}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ठेगाना:</span> <span>{currentPatient.address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">फोन:</span> <span>{currentPatient.phone}</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <History size={16} className="text-green-600" />
                पुराना रिपोर्टहरू (History)
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {patientReports.length > 0 ? (
                  patientReports.map(report => (
                    <div key={report.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 text-sm">
                      <div>
                         <p className="font-medium">{report.reportDate}</p>
                         <p className="text-xs text-slate-500">{report.tests?.length || 0} Tests {report.invoiceNumber && `(Inv: ${report.invoiceNumber})`}</p>
                      </div>
                      <div className="text-right space-x-2">
                        <button 
                          onClick={() => { setCurrentReport(report); setTimeout(handlePrint, 100); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Print
                        </button>
                        <button 
                          onClick={() => {
                             if(confirm('Are you sure you want to delete this report?')) {
                               onDeleteRecord(report.id);
                             }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                   <p className="text-slate-400 text-sm italic text-center">कुनै रिपोर्ट भेटिएन</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Lab Report Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b">
                <button 
                  onClick={() => setActiveSubMenu('collection')}
                  className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeSubMenu === 'collection' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Beaker size={18} /> नमुना संकलन (Sample Collection)
                </button>
                <button 
                  onClick={() => setActiveSubMenu('entry')}
                  className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeSubMenu === 'entry' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Activity size={18} /> रिपोर्ट प्रविष्टि (Result Entry)
                </button>
              </div>

              <div className="p-6">
                {activeSubMenu === 'collection' ? (
                  <div className="space-y-8">
                    {/* Sample Collection Content */}
                    {Object.keys(groupedPendingTests).length > 0 ? (
                      (Object.entries(groupedPendingTests) as [string, PendingTest[]][]).map(([invoiceNumber, tests]) => (
                        <div key={invoiceNumber} className="space-y-4 border-l-4 border-primary-500 pl-4 py-2">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-primary-600" />
                            Invoice: {invoiceNumber}
                          </h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                  <th className="p-3">Test Name</th>
                                  <th className="p-3">Invoice</th>
                                  <th className="p-3">Barcode ID</th>
                                  <th className="p-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {tests.map((test) => (
                                  <tr key={test.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">{test.testName}</td>
                                    <td className="p-3 text-xs text-slate-500">{test.invoiceNumber}</td>
                                    <td className="p-3 text-xs font-mono text-slate-600">{test.barcodeId || '-'}</td>
                                    <td className="p-3 text-center">
                                      {!test.sampleCollected ? (
                                        <button 
                                          onClick={() => handleCollectSample(test.id)}
                                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
                                        >
                                          Collect
                                        </button>
                                      ) : (
                                        <span className="text-green-600 flex items-center gap-1 text-xs font-bold justify-center">
                                          <CheckCircle2 size={14} /> Collected
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-slate-400 italic text-sm">कुनै नमुना संकलन बाँकी छैन।</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Result Entry Content */}
                    {Object.keys(groupedPendingTests).length > 0 ? (
                      (Object.entries(groupedPendingTests) as [string, PendingTest[]][]).map(([invoiceNumber, tests]) => (
                        <div key={invoiceNumber} className="space-y-4 border-l-4 border-green-500 pl-4 py-2">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-green-600" />
                            Invoice: {invoiceNumber}
                          </h4>
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold">
                                <tr>
                                  <th className="p-3">Test Name</th>
                                  <th className="p-3">Result</th>
                                  <th className="p-3">Unit</th>
                                  <th className="p-3">Normal Range</th>
                                  <th className="p-3">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {tests.filter(t => t.sampleCollected).map((test) => (
                                  <tr key={test.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium">{test.testName}</td>
                                    <td className="p-3"><input type="text" value={test.result} onChange={(e) => handleResultChange(test.id, 'result', e.target.value)} className="w-full p-2 border rounded" placeholder="Result" /></td>
                                    <td className="p-3"><input type="text" value={test.unit} onChange={(e) => handleResultChange(test.id, 'unit', e.target.value)} className="w-full p-2 border rounded" placeholder="Unit" /></td>
                                    <td className="p-3 text-slate-500 text-xs">{test.normalRange}</td>
                                    <td className="p-3"><input type="text" value={test.remarks} onChange={(e) => handleResultChange(test.id, 'remarks', e.target.value)} className="w-full p-2 border rounded" placeholder="Remarks" /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => handleSaveReport(invoiceNumber)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm flex items-center gap-2">
                              <Save size={16} /> Save Report
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-slate-400 italic text-sm">कुनै नतिजा प्रविष्टि बाँकी छैन।</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Templates */}
      <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
        {/* Barcode Print Template */}
        <div ref={barcodePrintRef} className="p-4 bg-white text-black print:block w-[200px] text-center font-mono">
          <div className="border-2 border-black p-2 rounded">
            <p className="text-xs font-bold mb-1">{generalSettings?.orgNameEnglish || 'LAB'}</p>
            <div className="mb-1">
              <Barcode value={currentBarcodeReport?.barcodeId || '000000'} width={1.5} height={30} displayValue={false} />
            </div>
            <p className="text-sm font-bold tracking-widest">{currentBarcodeReport?.barcodeId}</p>
            <div className="mt-2 text-[10px] text-left">
              <p>Name: {currentPatient?.name}</p>
              <p>ID: {currentPatient?.uniquePatientId}</p>
              <p>Inv: {currentBarcodeReport?.invoiceNumber}</p>
              <p>Date: {currentBarcodeReport?.reportDate}</p>
            </div>
          </div>
        </div>

        {/* Lab Report Print Template */}
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block font-sans">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
            <img 
              src={generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'} 
              style={{ width: '80px', height: '80px' }} 
              alt="Logo" 
              referrerPolicy="no-referrer"
            />
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold">{generalSettings?.orgNameNepali || generalSettings?.orgNameEnglish || 'आधारभूत नगर अस्पताल'}</h1>
              <p className="text-sm font-medium">{generalSettings?.subTitleNepali || ''}</p>
              <p className="text-sm font-medium">{generalSettings?.subTitleNepali2 || ''}</p>
              <p className="text-sm font-medium">{generalSettings?.subTitleNepali3 || ''}</p>
              <p className="text-sm font-medium">{generalSettings?.address || ''}</p>
              <h2 className="text-lg font-bold mt-2 border-2 border-slate-800 inline-block px-4 py-1 rounded uppercase">Laboratory Report</h2>
            </div>
            <div className="text-right text-xs space-y-1">
              <p>PAN No: {generalSettings?.panNo || 'N/A'}</p>
              <p>Phone: {generalSettings?.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="flex justify-between mb-6 text-sm border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p><strong>Patient Name:</strong> {currentReport?.patientName}</p>
              <p><strong>Age/Gender:</strong> {currentReport?.age} / {currentReport?.gender}</p>
              <p><strong>Patient ID:</strong> {currentPatient?.uniquePatientId} {currentPatient?.mulDartaNo && `| Mul Darta No: ${currentPatient.mulDartaNo}`}</p>
            </div>
            <div className="space-y-1 text-right">
              <p><strong>Report Date:</strong> {currentReport?.reportDate}</p>
              <p><strong>Report ID:</strong> {currentReport?.id}</p>
              {currentReport?.invoiceNumber && <p><strong>Invoice No:</strong> {currentReport.invoiceNumber}</p>}
            </div>
          </div>

          {/* Results Table */}
          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-50">
                <th className="py-2 px-4 text-left">Test Name</th>
                <th className="py-2 px-4 text-left">Result</th>
                <th className="py-2 px-4 text-left">Unit</th>
                <th className="py-2 px-4 text-left">Reference Range</th>
                <th className="py-2 px-4 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentReport?.tests
                ?.filter(test => (test.result && test.result.trim() !== '') || (test.remarks && test.remarks.trim() !== ''))
                .map((test, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-2 px-4 font-medium">{test.testName}</td>
                  <td className="py-2 px-4 font-bold">{test.result}</td>
                  <td className="py-2 px-4 text-slate-600">{test.unit}</td>
                  <td className="py-2 px-4 text-slate-600">{test.normalRange}</td>
                  <td className="py-2 px-4 text-slate-600 italic">{test.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
            <div>
              <p>Prepared By: {currentReport?.createdBy}</p>
              <p>Printed On: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-slate-300 w-32 mb-1"></div>
              <p>Lab Technician / Pathologist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
