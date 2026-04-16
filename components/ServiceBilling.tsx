import React, { useState, useRef, useMemo } from 'react';
import { Search, FileText, User, Calendar, Activity, AlertCircle, Plus, Trash2, Printer, Save, CreditCard, Banknote, History, CheckCircle2, Baby, Siren } from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord, BillingRecord, BillingItem, ServiceItem, CBIMNCIRecord, EmergencyRecord } from '../types/coreTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface ServiceBillingProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  cbimnciRecords?: CBIMNCIRecord[];
  emergencyRecords?: EmergencyRecord[];
  currentFiscalYear: string;
  billingRecords: BillingRecord[];
  onSaveRecord: (record: BillingRecord) => void;
  onDeleteRecord: (id: string) => void;
  currentUser: any;
  serviceItems: ServiceItem[];
}

export const ServiceBilling: React.FC<ServiceBillingProps> = ({ 
  serviceSeekerRecords = [], 
  opdRecords = [], 
  cbimnciRecords = [],
  emergencyRecords = [],
  currentFiscalYear,
  billingRecords = [],
  onSaveRecord,
  onDeleteRecord,
  currentUser,
  serviceItems = []
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [patientOpdRecords, setPatientOpdRecords] = useState<OPDRecord[]>([]);
  const [patientCbimnciRecords, setPatientCbimnciRecords] = useState<CBIMNCIRecord[]>([]);
  const [patientEmergencyRecords, setPatientEmergencyRecords] = useState<EmergencyRecord[]>([]);
  
  // Billing State
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [newItem, setNewItem] = useState({ serviceName: '', price: '', quantity: '1' });
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | 'Credit'>('Cash');
  const [currentBill, setCurrentBill] = useState<BillingRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    let patient = serviceSeekerRecords.find(r => r.uniquePatientId.toLowerCase() === query);
    
    if (!patient) {
       patient = serviceSeekerRecords.find(r => r.uniquePatientId.replace(/[^0-9]/g, '') === query);
    }

    if (!patient) {
        patient = serviceSeekerRecords.find(r => r.registrationNumber === query && r.fiscalYear === currentFiscalYear);
    }

    if (patient) {
      setCurrentPatient(patient);
      const records = opdRecords.filter(r => r.uniquePatientId === patient.uniquePatientId);
      records.sort((a, b) => b.visitDate.localeCompare(a.visitDate));
      setPatientOpdRecords(records);

      const cbimnci = cbimnciRecords.filter(r => r.uniquePatientId === patient.uniquePatientId);
      cbimnci.sort((a, b) => b.visitDate.localeCompare(a.visitDate));
      setPatientCbimnciRecords(cbimnci);

      const emergency = emergencyRecords.filter(r => r.uniquePatientId === patient.uniquePatientId);
      emergency.sort((a, b) => b.visitDate.localeCompare(a.visitDate));
      setPatientEmergencyRecords(emergency);
      
      // Reset billing form
      setBillingItems([]);
      setNewItem({ serviceName: '', price: '', quantity: '1' });
      setDiscount('');
      setPaymentMode('Cash');
      setCurrentBill(null);
    } else {
      alert('बिरामी भेटिएन (Patient not found)');
      setCurrentPatient(null);
      setPatientOpdRecords([]);
    }
  };

  const handleAddItem = () => {
    if (!newItem.serviceName) return;
    
    // Find service in settings to check for sub-tests
    const service = serviceItems.find(s => s.serviceName.toLowerCase() === newItem.serviceName.toLowerCase());
    
    if (service && service.subTests && service.subTests.length > 0) {
      const itemsToAdd: BillingItem[] = [];
      
      service.subTests.forEach((subTest, subIndex) => {
        const subItemName = subTest.testName;
        
        // Check for duplicates in current bill
        const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === subItemName.toLowerCase());
        if (isAlreadyInBill) return;

        // Check if already billed in previous records
        const isAlreadyBilled = billingRecords.some(b => 
          b.serviceSeekerId === currentPatient?.id && 
          b.items.some(i => i.serviceName.toLowerCase() === subItemName.toLowerCase())
        );
        if (isAlreadyBilled) return;

        const item: BillingItem = {
          id: Date.now().toString() + '-' + subIndex + '-' + Math.random().toString(36).substr(2, 5),
          serviceName: subItemName,
          price: subTest.price || 0,
          quantity: 1,
          total: (subTest.price || 0) * 1
        };
        itemsToAdd.push(item);
      });

      if (itemsToAdd.length > 0) {
        setBillingItems([...billingItems, ...itemsToAdd]);
        setNewItem({ serviceName: '', price: '', quantity: '1' });
      } else {
        alert('यी उप-परीक्षणहरू पहिले नै बिलमा थपिसकिएका छन्।');
      }
      return;
    }

    // Normal add logic if not a main service with sub-tests
    if (!newItem.price) return;
    const price = parseFloat(newItem.price);
    const quantity = parseInt(newItem.quantity);
    
    if (isNaN(price) || isNaN(quantity) || quantity < 1) return;

    // Check for duplicates in current bill
    const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === newItem.serviceName.toLowerCase());
    if (isAlreadyInBill) {
      alert('यो सेवा पहिले नै बिलमा थपिसकिएको छ।');
      return;
    }

    // Check if already billed in previous records
    const isAlreadyBilled = billingRecords.some(b => 
      b.serviceSeekerId === currentPatient?.id && 
      b.items.some(i => i.serviceName.toLowerCase() === newItem.serviceName.toLowerCase())
    );
    if (isAlreadyBilled) {
      if (!window.confirm('यो सेवा पहिले नै बिलिङ भइसकेको देखिन्छ। के तपाईं फेरि थप्न चाहनुहुन्छ?')) {
        return;
      }
    }

    const item: BillingItem = {
      id: Date.now().toString(),
      serviceName: newItem.serviceName,
      price: price,
      quantity: quantity,
      total: price * quantity
    };

    setBillingItems([...billingItems, item]);
    setNewItem({ serviceName: '', price: '', quantity: '1' });
  };

  const handleCopyToBill = (investigation: string) => {
    if (!investigation) return;

    const itemsToAdd: BillingItem[] = [];
    // Split by newline or comma
    const serviceNames = investigation.split(/[\n,]/).map(s => s.trim()).filter(s => s);

    serviceNames.forEach((name, index) => {
      // Find service in settings to get rate and sub-tests
      const service = serviceItems.find(s => s.serviceName === name) || 
                      serviceItems.find(s => s.serviceName.toLowerCase() === name.toLowerCase());
      
      if (service && service.subTests && service.subTests.length > 0) {
        // Add sub-tests as individual items
        service.subTests.forEach((subTest, subIndex) => {
          const subItemName = subTest.testName; // Changed from `${service.serviceName} - ${subTest.testName}`
          
          // Check if already in current billingItems
          const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === subItemName.toLowerCase());
          if (isAlreadyInBill) return;

          // Check if already billed in previous records
          const isAlreadyBilled = billingRecords.some(b => 
            b.serviceSeekerId === currentPatient?.id && 
            b.items.some(i => i.serviceName.toLowerCase() === subItemName.toLowerCase())
          );
          if (isAlreadyBilled) return;
          
          const item: BillingItem = {
            id: Date.now().toString() + '-' + index + '-' + subIndex + '-' + Math.random().toString(36).substr(2, 5),
            serviceName: subItemName,
            price: subTest.price || 0,
            quantity: 1,
            total: (subTest.price || 0) * 1
          };
          itemsToAdd.push(item);
        });
      } else {
        // Check if already in current billingItems
        const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === name.toLowerCase());
        if (isAlreadyInBill) return;

        // Check if already billed in previous records
        const isAlreadyBilled = billingRecords.some(b => 
          b.serviceSeekerId === currentPatient?.id && 
          b.items.some(i => i.serviceName.toLowerCase() === name.toLowerCase())
        );
        if (isAlreadyBilled) return;
        
        // If not found as main service, check if it's a sub-test of any service
        let foundSubTest: any = null;
        for (const s of serviceItems) {
            if (s.subTests) {
                foundSubTest = s.subTests.find(st => st.testName === name || st.testName.toLowerCase() === name.toLowerCase());
                if (foundSubTest) break;
            }
        }

        const price = foundSubTest ? (foundSubTest.price || 0) : (service ? service.rate : 0);
        
        const item: BillingItem = {
          id: Date.now().toString() + '-' + index + '-' + Math.random().toString(36).substr(2, 5), // Ensure unique ID
          serviceName: name,
          price: price,
          quantity: 1,
          total: price * 1
        };
        itemsToAdd.push(item);
      }
    });

    if (itemsToAdd.length === 0) {
      alert('यी जाँचहरू पहिले नै बिलमा थपिसकिएका छन् वा बिलिङ भइसकेका छन्।');
      return;
    }

    setBillingItems(prev => [...prev, ...itemsToAdd]);
  };

  const handleRemoveItem = (id: string) => {
    setBillingItems(billingItems.filter(item => item.id !== id));
  };

  const subTotal = billingItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subTotal - discountAmount);

  const handleSaveBill = async () => {
    if (!currentPatient || billingItems.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      // Generate Invoice Number (Simple logic for now, ideally should be sequential from DB)
      const invoiceNumber = `INV-${currentFiscalYear}-${Date.now().toString().slice(-6)}`;

      const newBill: BillingRecord = {
        id: Date.now().toString(),
        fiscalYear: currentFiscalYear,
        billDate: new NepaliDate().format('YYYY-MM-DD'),
        invoiceNumber: invoiceNumber,
        serviceSeekerId: currentPatient.id,
        patientName: currentPatient.name,
        items: billingItems,
        subTotal: subTotal,
        discount: discountAmount,
        grandTotal: grandTotal,
        paymentMode: paymentMode,
        createdBy: currentUser?.username || 'Unknown'
      };

      await onSaveRecord(newBill);
      setCurrentBill(newBill);
      
      // Reset billing items after successful save
      setBillingItems([]);
      setDiscount('');
      
      alert('बिल सुरक्षित गरियो। अब प्रिन्ट हुँदैछ...');
      
      // Trigger print after a short delay to allow state to update
      setTimeout(() => {
        handlePrint();
        setIsSaving(false);
      }, 500);
    } catch (error) {
      console.error("Error saving bill:", error);
      alert("बिल सुरक्षित गर्दा समस्या आयो।");
      setIsSaving(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${currentBill?.invoiceNumber || 'New'}`,
  });

  const patientBills = useMemo(() => {
    if (!currentPatient) return [];
    return billingRecords.filter(b => b.serviceSeekerId === currentPatient.id).sort((a, b) => b.id.localeCompare(a.id));
  }, [billingRecords, currentPatient]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <FileText className="text-primary-600" />
          सेवा बिलिङ (Service Billing)
        </h2>
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
      </div>

      {currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Patient Info & OPD History */}
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

            {/* OPD Investigations List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                सिफारिस गरिएका जाँचहरू (OPD)
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {patientOpdRecords.length > 0 ? (
                  patientOpdRecords.map((record) => {
                    const isBilled = record.investigation ? (() => {
                      const serviceNames = record.investigation.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(s => s);
                      return serviceNames.length > 0 && serviceNames.every(name => 
                        billingRecords.some(b => 
                          b.serviceSeekerId === currentPatient?.id && 
                          b.items.some(i => i.serviceName.toLowerCase() === name)
                        )
                      );
                    })() : false;

                    return record.investigation ? (
                      <div key={record.id} className="border border-slate-100 rounded p-3 bg-slate-50 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-500">{record.visitDate}</span>
                          {isBilled ? (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                              <CheckCircle2 size={10} /> Billed
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleCopyToBill(record.investigation)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                            >
                              Copy to Bill
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{record.investigation}</p>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-slate-400 text-sm italic text-center">कुनै OPD रेकर्ड छैन</p>
                )}
              </div>
            </div>

            {/* CBIMNCI Investigations List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <Baby size={16} className="text-green-600" />
                सिफारिस गरिएका जाँचहरू (CBIMNCI)
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {patientCbimnciRecords.length > 0 ? (
                  patientCbimnciRecords.map((record) => {
                    const isBilled = record.investigation ? (() => {
                      const serviceNames = record.investigation.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(s => s);
                      return serviceNames.length > 0 && serviceNames.every(name => 
                        billingRecords.some(b => 
                          b.serviceSeekerId === currentPatient?.id && 
                          b.items.some(i => i.serviceName.toLowerCase() === name)
                        )
                      );
                    })() : false;

                    return record.investigation ? (
                      <div key={record.id} className="border border-slate-100 rounded p-3 bg-slate-50 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-500">{record.visitDate}</span>
                          {isBilled ? (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                              <CheckCircle2 size={10} /> Billed
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleCopyToBill(record.investigation)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                            >
                              Copy to Bill
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{record.investigation}</p>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-slate-400 text-sm italic text-center">कुनै CBIMNCI रेकर्ड छैन</p>
                )}
              </div>
            </div>

            {/* Emergency Investigations List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <Siren size={16} className="text-red-600" />
                सिफारिस गरिएका जाँचहरू (Emergency)
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {patientEmergencyRecords.length > 0 ? (
                  patientEmergencyRecords.map((record) => {
                    const isBilled = record.investigation ? (() => {
                      const serviceNames = record.investigation.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(s => s);
                      return serviceNames.length > 0 && serviceNames.every(name => 
                        billingRecords.some(b => 
                          b.serviceSeekerId === currentPatient?.id && 
                          b.items.some(i => i.serviceName.toLowerCase() === name)
                        )
                      );
                    })() : false;

                    return record.investigation ? (
                      <div key={record.id} className="border border-slate-100 rounded p-3 bg-slate-50 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-500">{record.visitDate}</span>
                          {isBilled ? (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                              <CheckCircle2 size={10} /> Billed
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleCopyToBill(record.investigation)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                            >
                              Copy to Bill
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{record.investigation}</p>
                      </div>
                    ) : null;
                  })
                ) : (
                  <p className="text-slate-400 text-sm italic text-center">कुनै Emergency रेकर्ड छैन</p>
                )}
              </div>
            </div>
            
            {/* Previous Bills */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <History size={16} className="text-green-600" />
                पुराना बिलहरू (History)
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {patientBills.length > 0 ? (
                  patientBills.map(bill => (
                    <div key={bill.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 text-sm">
                      <div>
                         <p className="font-medium">{bill.invoiceNumber}</p>
                         <p className="text-xs text-slate-500">{bill.billDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-700">Rs. {bill.grandTotal}</p>
                        <button 
                          onClick={() => { setCurrentBill(bill); setTimeout(handlePrint, 100); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Reprint
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                   <p className="text-slate-400 text-sm italic text-center">कुनै बिल भेटिएन</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Billing Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg mb-6 border-b pb-4 flex items-center gap-2">
                <Banknote size={20} className="text-green-600" />
                बिलिङ विवरण (Billing Details)
              </h3>

              {/* Add Item Form */}
              <div className="grid grid-cols-12 gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="col-span-5">
                  <label className="block text-xs font-medium text-slate-600 mb-1">सेवाको नाम (Service Name)</label>
                  <input
                    type="text"
                    value={newItem.serviceName}
                    onChange={(e) => {
                      const name = e.target.value;
                      let price = newItem.price;
                      
                      const service = serviceItems.find(s => s.serviceName.toLowerCase() === name.toLowerCase());
                      if (service) {
                        price = service.rate.toString();
                      } else {
                        // Check sub-tests
                        for (const s of serviceItems) {
                          if (s.subTests) {
                            const st = s.subTests.find(st => st.testName.toLowerCase() === name.toLowerCase());
                            if (st) {
                              price = (st.price || 0).toString();
                              break;
                            }
                          }
                        }
                      }
                      
                      setNewItem({...newItem, serviceName: name, price});
                    }}
                    className="w-full p-2 border border-slate-300 rounded text-sm"
                    placeholder="Ex: CBC, X-Ray Chest"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">मूल्य (Price)</label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">संख्या (Qty)</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded text-sm"
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={handleAddItem}
                    className="w-full bg-primary-600 text-white p-2 rounded hover:bg-primary-700 text-sm flex items-center justify-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">S.N.</th>
                      <th className="p-3">Service Name</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingItems.length > 0 ? (
                      billingItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3 font-medium">{item.serviceName}</td>
                          <td className="p-3 text-right">{item.price.toFixed(2)}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{item.total.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">No items added yet.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-800">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">Sub Total:</td>
                      <td className="p-3 text-right">{subTotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary & Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="w-full md:w-1/2 space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">भुक्तानी माध्यम (Payment Mode)</label>
                     <div className="flex gap-4">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Cash'} onChange={() => setPaymentMode('Cash')} />
                         <span>Cash</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Online'} onChange={() => setPaymentMode('Online')} />
                         <span>Online / QR</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Credit'} onChange={() => setPaymentMode('Credit')} />
                         <span>Credit</span>
                       </label>
                     </div>
                   </div>
                </div>

                <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Sub Total:</span>
                    <span className="font-bold">Rs. {subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Discount:</span>
                    <input 
                      type="number" 
                      value={discount} 
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 p-1 text-right border border-slate-300 rounded text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-lg font-bold text-primary-700">
                    <span>Grand Total:</span>
                    <span>Rs. {grandTotal.toFixed(2)}</span>
                  </div>
                  
                  <button 
                    onClick={handleSaveBill}
                    disabled={billingItems.length === 0 || isSaving}
                    className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={20} /> Save & Print
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block font-sans">
          {/* Header */}
          <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-bold uppercase">{currentUser?.organizationName || 'Health Institution'}</h1>
            <p className="text-sm text-slate-600">{currentUser?.address || 'Address'}</p>
            <h2 className="text-lg font-bold mt-2 border-2 border-slate-800 inline-block px-4 py-1 rounded">INVOICE</h2>
          </div>

          {/* Bill Info */}
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <p><strong>Invoice No:</strong> {currentBill?.invoiceNumber}</p>
              <p><strong>मिति (Date):</strong> {(() => {
                const dateStr = currentBill?.billDate || '';
                const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
                return dateStr.replace(/[0-9]/g, (digit) => nepaliDigits[parseInt(digit)]);
              })()}</p>
              <p><strong>Payment Mode:</strong> {currentBill?.paymentMode}</p>
            </div>
            <div className="text-right">
              <p><strong>Patient Name:</strong> {currentBill?.patientName}</p>
              <p><strong>Patient ID:</strong> {currentPatient?.uniquePatientId} {currentPatient?.mulDartaNo && `| Mul Darta No: ${currentPatient.mulDartaNo}`}</p>
              <p><strong>Address:</strong> {currentPatient?.address}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800">
                <th className="py-2 text-left">S.N.</th>
                <th className="py-2 text-left">Service Name</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {currentBill?.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2">{item.serviceName}</td>
                  <td className="py-2 text-right">{item.price.toFixed(2)}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-bold">Rs. {currentBill?.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>Rs. {currentBill?.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-lg font-bold">
                <span>Grand Total:</span>
                <span>Rs. {currentBill?.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
            <div>
              <p>Printed By: {currentUser?.username}</p>
              <p>Printed On: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p>Thank you for your visit.</p>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-slate-300 w-32 mb-1"></div>
              <p>Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
