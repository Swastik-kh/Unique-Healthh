import React, { useState, useRef, useMemo } from 'react';
import { Search, FileText, User, Calendar, Activity, AlertCircle, Plus, Trash2, Printer, Save, CreditCard, Banknote, History, CheckCircle2, Baby, Siren, Code, X, Edit, RotateCcw } from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord, BillingRecord, BillingItem, ServiceItem, CBIMNCIRecord, EmergencyRecord, User as AppUser, OrganizationSettings } from '../types/coreTypes';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';
import { LogoDisplay } from './LogoDisplay';
import { toNepaliDigits } from '../lib/tableUtils';
import axios from 'axios';
import { Loader2, ShieldCheck, Globe, Key } from 'lucide-react';
import { PatientReportPortal, getReportPasscode } from './PatientReportPortal';

const getHibCodeForService = (name: string): string => {
  const cleanName = name.trim().toUpperCase();
  // Return standard hardcoded known codes for test examples
  if (cleanName.includes("LAB") || cleanName.includes("PCR") || cleanName.includes("CBC")) {
    return "V05E2W";
  }
  if (cleanName.includes("X-RAY") || cleanName.includes("USG")) {
    return "D5C0W";
  }
  if (cleanName.includes("OPD") || cleanName.includes("CONSULT")) {
    return "SRV001";
  }
  if (cleanName.includes("ECG") || cleanName.includes("HEART")) {
    return "SRV002";
  }
  if (cleanName.includes("EMERG") || cleanName.includes("BED")) {
    return "SRV003";
  }
  // Fallback to a stable deterministic hash-based alphanumeric code
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  let tmp = Math.abs(hash);
  for (let i = 0; i < 6; i++) {
    code += chars[tmp % chars.length];
    tmp = Math.floor(tmp / chars.length);
  }
  return code;
};

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
  users?: AppUser[];
  generalSettings?: OrganizationSettings;
  labReports?: any[];
  xrayRecords?: any[];
  usgRecords?: any[];
  ecgRecords?: any[];
  dispensaryRecords?: any[];
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
  serviceItems = [],
  users = [],
  generalSettings,
  labReports = [],
  xrayRecords = [],
  usgRecords = [],
  ecgRecords = [],
  dispensaryRecords = []
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [patientOpdRecords, setPatientOpdRecords] = useState<OPDRecord[]>([]);
  const [patientCbimnciRecords, setPatientCbimnciRecords] = useState<CBIMNCIRecord[]>([]);
  const [patientEmergencyRecords, setPatientEmergencyRecords] = useState<EmergencyRecord[]>([]);
  const [showReportPortal, setShowReportPortal] = useState(false);
  
  // Billing State
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [newItem, setNewItem] = useState({ serviceName: '', price: '', quantity: '1', remarks: '' });
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | 'Credit' | 'Bima'>('Cash');
  const [insuranceNo, setInsuranceNo] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claimStatus, setClaimStatus] = useState<'Draft' | 'Submitted' | 'Verified' | 'Error'>('Draft');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [isFetchingClaimCode, setIsFetchingClaimCode] = useState(false);
  const [isSearchingHIB, setIsSearchingHIB] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [hibPatient, setHibPatient] = useState<any>(null);
  const [hibEligibility, setHibEligibility] = useState<any>(null);
  const [fhirResponseLog, setFhirResponseLog] = useState<string>('');
  const [showFhirLogModal, setShowFhirLogModal] = useState(false);
  const [currentBill, setCurrentBill] = useState<BillingRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allBillsSearch, setAllBillsSearch] = useState('');

  // Refund states
  const [refundingBill, setRefundingBill] = useState<BillingRecord | null>(null);
  const [refundRemarks, setRefundRemarks] = useState('');
  const [selectedRefundItems, setSelectedRefundItems] = useState<Record<string, boolean>>({}); // itemId -> boolean
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fyBillingRecords = useMemo(() => {
    return billingRecords.filter(b => b.fiscalYear === currentFiscalYear);
  }, [billingRecords, currentFiscalYear]);

  const refundCalculations = useMemo(() => {
    if (!refundingBill) return { subTotal: 0, discount: 0, grandTotal: 0 };
    let selectedSubTotal = 0;
    refundingBill.items.forEach(item => {
      if (selectedRefundItems[item.id] && !item.isRefunded) {
        selectedSubTotal += item.total || 0;
      }
    });

    const previousSubTotal = refundingBill.subTotal || 1;
    const previousDiscount = refundingBill.discount || 0;
    const ratio = selectedSubTotal / previousSubTotal;
    const proRatedDiscount = previousDiscount * ratio;
    const netRefundAmount = selectedSubTotal - proRatedDiscount;

    return {
      subTotal: selectedSubTotal,
      discount: proRatedDiscount,
      grandTotal: netRefundAmount
    };
  }, [refundingBill, selectedRefundItems]);

  const fiscalYearRange = useMemo(() => {
    if (!currentFiscalYear) return { min: undefined, max: undefined };
    const parts = currentFiscalYear.split(/[-/]/);
    if (parts.length >= 1) {
      const startYear = parseInt(parts[0].trim(), 10);
      if (!isNaN(startYear)) {
        const endYear = startYear + 1;
        return {
          min: `${startYear}-04-01`,
          max: `${endYear}-03-32`
        };
      }
    }
    return { min: undefined, max: undefined };
  }, [currentFiscalYear]);

  const getInitialMitiValue = () => {
    const todayStr = new NepaliDate().format('YYYY-MM-DD');
    if (!currentFiscalYear) return todayStr;
    const parts = currentFiscalYear.split(/[-/]/);
    if (parts.length >= 1) {
      const startYear = parseInt(parts[0].trim(), 10);
      if (!isNaN(startYear)) {
        const endYear = startYear + 1;
        const minDate = `${startYear}-04-01`;
        const maxDate = `${endYear}-03-32`;
        if (todayStr < minDate || todayStr > maxDate) {
          return minDate;
        }
      }
    }
    return todayStr;
  };

  // Direct Billing State
  const [isDirectBilling, setIsDirectBilling] = useState(false);
  const [editingDirectBillId, setEditingDirectBillId] = useState<string | null>(null);
  const [directPatientName, setDirectPatientName] = useState('');
  const [directPatientSn, setDirectPatientSn] = useState('');
  const [directBillNo, setDirectBillNo] = useState('');
  const [autoGeneratedBillNo, setAutoGeneratedBillNo] = useState('');
  const [directMiti, setDirectMiti] = useState(getInitialMitiValue);
  const [directRemarks, setDirectRemarks] = useState('');
  const [directReferredBy, setDirectReferredBy] = useState('');
  const [referredBy, setReferredBy] = useState('');

  const [prevMiti, setPrevMiti] = useState('');
  const [prevIsDirect, setPrevIsDirect] = useState(false);

  React.useEffect(() => {
    if (isDirectBilling && !editingDirectBillId && (directMiti !== prevMiti || isDirectBilling !== prevIsDirect)) {
      setPrevMiti(directMiti || '');
      setPrevIsDirect(isDirectBilling);

      if (directMiti) {
        const parts = directMiti.split('-');
        const year = parts[0] || '2083';
        const month = parts[1] || '01';

        const directInMonth = billingRecords.filter(r => {
          if (!r.isDirectBilling) return false;
          const rMiti = r.billDate || '';
          const rParts = rMiti.split('-');
          return rParts[0] === year && rParts[1] === month;
        });

        let maxSeq = 0;
        directInMonth.forEach(r => {
          const snVal = parseInt(r.serviceSeekerId || '', 10);
          if (!isNaN(snVal) && snVal > maxSeq) {
            maxSeq = snVal;
          }
        });

        const nextSeq = maxSeq + 1;
        setDirectPatientSn(nextSeq.toString());

        // Continuous global sequence for Bill No across months to avoid duplicates and keep it continuous
        const allDbRecords = billingRecords.filter(r => r.isDirectBilling || r.invoiceNumber?.startsWith('DB-'));
        let maxGlobalSeq = 0;
        allDbRecords.forEach(r => {
          const inv = r.invoiceNumber || '';
          const lastParts = inv.split('-');
          const lastPart = lastParts[lastParts.length - 1];
          if (lastPart) {
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && num < 100000 && num > maxGlobalSeq) {
              maxGlobalSeq = num;
            }
          }
        });

        if (!isDirectBilling) {
            const nextGlobalSeq = maxGlobalSeq + 1;
            const newAutoBillNo = `DB-${currentFiscalYear.replace('/', '')}-${nextGlobalSeq.toString().padStart(4, '0')}`;
            setDirectBillNo(newAutoBillNo);
            setAutoGeneratedBillNo(newAutoBillNo);
        } else {
            setDirectBillNo('');
            setAutoGeneratedBillNo('');
        }
      }
    } else if (!isDirectBilling && prevIsDirect) {
      setPrevIsDirect(false);
    }
  }, [isDirectBilling, directMiti, billingRecords, prevMiti, prevIsDirect, currentFiscalYear, editingDirectBillId]);

  const handleEditDirectBill = (bill: BillingRecord) => {
    setEditingDirectBillId(bill.id);
    setIsDirectBilling(true);
    setCurrentPatient(null);
    setDirectPatientName(bill.patientName || '');
    setDirectPatientSn(bill.serviceSeekerId || '');
    setDirectBillNo(bill.invoiceNumber || '');
    setAutoGeneratedBillNo(bill.invoiceNumber || '');
    setDirectMiti(bill.billDate || getInitialMitiValue());
    setDirectRemarks(bill.remarks || '');
    setBillingItems(bill.items || []);
    setDiscount(bill.discount ? String(bill.discount) : '');
    setPaymentMode((bill.paymentMode as any) || 'Cash');
    setPrevMiti(bill.billDate || '');
    setPrevIsDirect(true);
    setDirectReferredBy(bill.referredBy || '');
  };

  const handleRefundClick = (bill: BillingRecord) => {
    const isUserAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
    if (!isUserAdmin) {
      alert("रकम फिर्ता गर्ने अधिकार एडमिनलाई मात्र छ (Access denied: Admin only).");
      return;
    }
    setRefundingBill(bill);
    setRefundRemarks('');
    const initialSelected: Record<string, boolean> = {};
    bill.items.forEach(item => {
      initialSelected[item.id] = false;
    });
    setSelectedRefundItems(initialSelected);
  };

  const handleToggleRefundItem = (itemId: string) => {
    setSelectedRefundItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleProcessRefund = () => {
    if (!refundingBill) return;

    const isUserAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
    if (!isUserAdmin) {
      alert("रकम फिर्ता गर्ने अधिकार एडमिनलाई मात्र छ (Access denied: Admin only).");
      return;
    }

    const selectedItemIds = Object.keys(selectedRefundItems).filter(id => selectedRefundItems[id]);
    if (selectedItemIds.length === 0) {
      alert("कृपया फिर्ता गर्न कम्तीमा एउटा सेवा छनोट गर्नुहोस्।");
      return;
    }

    const updatedBill = JSON.parse(JSON.stringify(refundingBill)) as BillingRecord;

    let totalOfRefundedItems = 0;
    updatedBill.items.forEach(item => {
      if (selectedRefundItems[item.id] && !item.isRefunded) {
        item.isRefunded = true;
        item.refundRemarks = refundRemarks || "रकम फिर्ता (Refunded)";
        item.refundDateBs = new NepaliDate().format('YYYY-MM-DD');
        totalOfRefundedItems += item.total || 0;
      }
    });

    if (totalOfRefundedItems === 0) {
      alert("छानिएका सेवाहरू पहिले नै फिर्ता भइसकेका छन्।");
      return;
    }

    const previousSubTotal = refundingBill.subTotal || 1;
    const previousDiscount = refundingBill.discount || 0;
    const previousGrandTotal = refundingBill.grandTotal || 0;

    const ratio = totalOfRefundedItems / previousSubTotal;
    const discountToReduce = previousDiscount * ratio;
    const netRefundAmount = totalOfRefundedItems - discountToReduce;

    const newSubTotal = Math.max(0, previousSubTotal - totalOfRefundedItems);
    const newDiscount = Math.max(0, previousDiscount - discountToReduce);
    const newGrandTotal = Math.max(0, previousGrandTotal - netRefundAmount);

    updatedBill.subTotal = newSubTotal;
    updatedBill.discount = newDiscount;
    updatedBill.grandTotal = newGrandTotal;
    updatedBill.refundedAmount = (refundingBill.refundedAmount || 0) + netRefundAmount;

    const allItemsRefunded = updatedBill.items.every(item => item.isRefunded);
    updatedBill.refundStatus = allItemsRefunded ? 'Refunded' : 'Partially_Refunded';
    updatedBill.refundRemarks = refundRemarks || updatedBill.refundRemarks || "Refunded";
    updatedBill.refundDateBs = new NepaliDate().format('YYYY-MM-DD');

    onSaveRecord(updatedBill);

    setSuccessMessage(`बिल नम्बर ${refundingBill.invoiceNumber} को जम्मा रु. ${netRefundAmount.toFixed(2)} रकम सफलतापूर्वक फिर्ता गरियो।`);
    setTimeout(() => setSuccessMessage(null), 5000);

    setRefundingBill(null);
  };

  const handleStartDirectBilling = () => {
    setEditingDirectBillId(null);
    setIsDirectBilling(true);
    setCurrentPatient(null);
    setBillingItems([]);
    setDirectPatientName("");
    setDirectRemarks("");
    setPrevMiti('');
    setPrevIsDirect(false);
    setDirectMiti(getInitialMitiValue());
    setDirectReferredBy('');
    
    // Reset standard form inputs too
    setNewItem({ serviceName: '', price: '', quantity: '1', remarks: '' });
    setDiscount('');
    setPaymentMode('Cash');
    setInsuranceNo('');
    setClaimCode('');
    setClaimStatus('Draft');
    setFhirResponseLog('');
    setShowFhirLogModal(false);
    setCurrentBill(null);
  };

  // Refund Claims API State
  const [refundClaimCode, setRefundClaimCode] = useState('');
  const [refundType, setRefundType] = useState<'item' | 'service'>('item');
  const [refundCodesText, setRefundCodesText] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundResponseLog, setRefundResponseLog] = useState('');
  const [showRefundConsole, setShowRefundConsole] = useState(false);
  const [selectedRefundBillingItems, setSelectedRefundBillingItems] = useState<string[]>([]);

  // Sync claimCode to refundClaimCode when generated
  React.useEffect(() => {
    if (claimCode) {
      setRefundClaimCode(claimCode);
    }
  }, [claimCode]);

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
      setIsDirectBilling(false);
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
      setNewItem({ serviceName: '', price: '', quantity: '1', remarks: '' });
      setDiscount('');
      const isHib = patient.paymentMode === 'HIB';
      setPaymentMode(isHib ? 'Bima' : 'Cash');
      const insNo = isHib ? (patient.insuranceNo || '') : '';
      setInsuranceNo(insNo);
      setClaimCode(isHib ? (patient.claimId || '') : '');
      setReferredBy('');
      setClaimStatus(isHib && patient.claimId ? 'Submitted' : 'Draft');
      setFhirResponseLog('');
      setShowFhirLogModal(false);
      setCurrentBill(null);

      if (isHib && insNo) {
        // Silently fetch HIB patient FHIR resource to populate hibPatient state
        (async () => {
          try {
            const headers = {
              'x-hib-base-url': generalSettings?.hibBaseUrl,
              'x-hib-username': generalSettings?.hibUsername,
              'x-hib-password': generalSettings?.hibPassword,
              'x-hib-remote-user': generalSettings?.hibRemoteUser,
              'x-hib-partner-id': generalSettings?.hibPartnerId,
              'x-hib-location-id': generalSettings?.hibLocationId
            };
            const res = await axios.get(`/api/hib/patient/${insNo.trim()}`, { headers });
            const bundle = res.data;
            if (bundle.entry && bundle.entry.length > 0) {
              setHibPatient(bundle.entry[0].resource);
            }
          } catch (err) {
            console.error("Silent HIB patient fetch failed:", err);
          }
        })();
      } else {
        setHibPatient(null);
      }
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
    
    if (service) {
      // Check for duplicates in current bill
      const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === service.serviceName.toLowerCase());
      if (isAlreadyInBill) {
        alert('यो सेवा पहिले नै बिलमा थपिसकिएको छ।');
        return;
      }

      // Check if already billed in previous records
      const isAlreadyBilled = currentPatient ? billingRecords.some(b => 
        b.serviceSeekerId === currentPatient.id && 
        b.items.some(i => i.serviceName.toLowerCase() === service.serviceName.toLowerCase())
      ) : false;
      if (isAlreadyBilled) {
        if (!window.confirm('यो सेवा पहिले नै बिलिङ भइसकेको देखिन्छ। के तपाईं फेरि थप्न चाहनुहुन्छ?')) {
          return;
        }
      }

      const price = parseFloat(newItem.price) || service.rate || service.subTests?.reduce((sum, st) => sum + (st.price || 0), 0) || 0;
      const quantity = parseInt(newItem.quantity) || 1;

      const item: BillingItem = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        serviceName: service.serviceName,
        price: price,
        quantity: quantity,
        total: price * quantity,
        itemCode: getHibCodeForService(service.serviceName),
        remarks: newItem.remarks || undefined,
        category: service.category
      };

      setBillingItems([...billingItems, item]);
      setNewItem({ serviceName: '', price: '', quantity: '1', remarks: '' });
      return;
    }

    // Normal add logic if not a main service (e.g., custom typed or standalone sub-test)
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
    const isAlreadyBilled = currentPatient ? billingRecords.some(b => 
      b.serviceSeekerId === currentPatient.id && 
      b.items.some(i => i.serviceName.toLowerCase() === newItem.serviceName.toLowerCase())
    ) : false;
    if (isAlreadyBilled) {
      if (!window.confirm('यो सेवा पहिले नै बिलिङ भइसकेको देखिन्छ। के तपाईं फेरि थप्न चाहनुहुन्छ?')) {
        return;
      }
    }

    let itemCategory: string | undefined = undefined;
    for (const s of serviceItems) {
      if (s.subTests) {
        const st = s.subTests.find(st => st.testName.toLowerCase() === newItem.serviceName.toLowerCase());
        if (st) {
          itemCategory = s.category;
          break;
        }
      }
    }

    const item: BillingItem = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      serviceName: newItem.serviceName,
      price: price,
      quantity: quantity,
      total: price * quantity,
      itemCode: getHibCodeForService(newItem.serviceName),
      remarks: newItem.remarks || undefined,
      category: itemCategory
    };

    setBillingItems([...billingItems, item]);
    setNewItem({ serviceName: '', price: '', quantity: '1', remarks: '' });
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
      
      if (service) {
        // Check if already in current billingItems
        const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === service.serviceName.toLowerCase());
        if (isAlreadyInBill) return;

        // Check if already billed in previous records
        const isAlreadyBilled = currentPatient ? billingRecords.some(b => 
          b.serviceSeekerId === currentPatient.id && 
          b.items.some(i => i.serviceName.toLowerCase() === service.serviceName.toLowerCase())
        ) : false;
        if (isAlreadyBilled) return;

        const price = service.rate || service.subTests?.reduce((sum, st) => sum + (st.price || 0), 0) || 0;
        
        const item: BillingItem = {
          id: Date.now().toString() + '-' + index + '-' + Math.random().toString(36).substr(2, 5),
          serviceName: service.serviceName,
          price: price,
          quantity: 1,
          total: price * 1,
          itemCode: getHibCodeForService(service.serviceName),
          category: service.category
        };
        itemsToAdd.push(item);
      } else {
        // Check if already in current billingItems
        const isAlreadyInBill = billingItems.some(item => item.serviceName.toLowerCase() === name.toLowerCase());
        if (isAlreadyInBill) return;

        // Check if already billed in previous records
        const isAlreadyBilled = currentPatient ? billingRecords.some(b => 
          b.serviceSeekerId === currentPatient.id && 
          b.items.some(i => i.serviceName.toLowerCase() === name.toLowerCase())
        ) : false;
        if (isAlreadyBilled) return;
        
        // If not found as main service, check if it's a sub-test of any service
        let foundSubTest: any = null;
        for (const s of serviceItems) {
            if (s.subTests) {
                foundSubTest = s.subTests.find(st => st.testName === name || st.testName.toLowerCase() === name.toLowerCase());
                if (foundSubTest) break;
            }
        }

        const price = foundSubTest ? (foundSubTest.price || 0) : 0;
        
        let itemCategory: string | undefined = undefined;
        if (foundSubTest) {
          for (const s of serviceItems) {
            if (s.subTests?.some(st => st.testName === name || st.testName.toLowerCase() === name.toLowerCase())) {
              itemCategory = s.category;
              break;
            }
          }
        }

        const item: BillingItem = {
          id: Date.now().toString() + '-' + index + '-' + Math.random().toString(36).substr(2, 5), // Ensure unique ID
          serviceName: name,
          price: price,
          quantity: 1,
          total: price * 1,
          itemCode: getHibCodeForService(name),
          category: itemCategory
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

  const handleSearchHIBPatient = async () => {
    if (!insuranceNo.trim()) {
      alert("कृपया पहिले बीमा नम्बर (Insurance No) भर्नुहोस्।");
      return;
    }
    setIsSearchingHIB(true);
    try {
      const headers = {
        'x-hib-base-url': generalSettings?.hibBaseUrl,
        'x-hib-username': generalSettings?.hibUsername,
        'x-hib-password': generalSettings?.hibPassword,
        'x-hib-remote-user': generalSettings?.hibRemoteUser,
        'x-hib-partner-id': generalSettings?.hibPartnerId,
        'x-hib-location-id': generalSettings?.hibLocationId
      };
      const res = await axios.get(`/api/hib/patient/${insuranceNo.trim()}`, { headers });
      const bundle = res.data;
      if (bundle.entry && bundle.entry.length > 0) {
        const patient = bundle.entry[0].resource;
        setHibPatient(patient);
        
        // Auto-fill patient name if it's direct billing and empty
        if (isDirectBilling && !directPatientName) {
          const nameObj = patient.name?.[0];
          const fullName = `${nameObj?.given?.join(' ') || ''} ${nameObj?.family || ''}`.trim();
          setDirectPatientName(fullName);
        }
        
        setFhirResponseLog(JSON.stringify(bundle, null, 2));
      } else {
        alert("बीमा प्रणालीमा यो नम्बरको बिरामी फेला परेन।");
      }
    } catch (error: any) {
      console.error(error);
      alert("बीमा बिरामी खोज्दा त्रुटि भयो: " + (error.response?.data?.error || error.message));
    } finally {
      setIsSearchingHIB(false);
    }
  };

  const handleCheckHIBEligibility = async () => {
    if (!hibPatient) {
      alert("पहिले बिरामी खोज्नुहोस्।");
      return;
    }
    setIsCheckingEligibility(true);
    try {
      const headers = {
        'x-hib-base-url': generalSettings?.hibBaseUrl,
        'x-hib-username': generalSettings?.hibUsername,
        'x-hib-password': generalSettings?.hibPassword,
        'x-hib-remote-user': generalSettings?.hibRemoteUser,
        'x-hib-partner-id': generalSettings?.hibPartnerId,
        'x-hib-location-id': generalSettings?.hibLocationId
      };
      const payload = {
        resourceType: "EligibilityRequest",
        patient: {
          reference: `Patient/${hibPatient.id}`
        }
      };
      const res = await axios.post('/api/hib/eligibility', payload, { headers });
      setHibEligibility(res.data);
      setFhirResponseLog(JSON.stringify(res.data, null, 2));
    } catch (error: any) {
      console.error(error);
      alert("योग्यता (Eligibility) जाँच्दा त्रुटि भयो: " + (error.response?.data?.error || error.message));
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleSubmitClaim = async () => {
    if ((!currentPatient && !isDirectBilling) || billingItems.length === 0) {
      alert("दावी पेस गर्न पहिले बिरामी र सेवा सामग्री थप्नुहोस्।");
      return;
    }
    if (!insuranceNo.trim()) {
      alert("कृपया पहिले बीमा नम्बर (Insurance No) भर्नुहोस्।");
      return;
    }
    if (!hibPatient) {
      alert("पहिले बिरामी खोज्नुहोस्।");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const headers = {
        'x-hib-base-url': generalSettings?.hibBaseUrl,
        'x-hib-username': generalSettings?.hibUsername,
        'x-hib-password': generalSettings?.hibPassword,
        'x-hib-remote-user': generalSettings?.hibRemoteUser,
        'x-hib-partner-id': generalSettings?.hibPartnerId,
        'x-hib-location-id': generalSettings?.hibLocationId
      };
      const today = new NepaliDate().format('YYYY-MM-DD');
      const uuid = crypto.randomUUID().toUpperCase();
      
      const claimPayload = {
        resourceType: "Claim",
        billablePeriod: {
          start: today,
          end: today
        },
        created: today,
        diagnosis: [
          {
            diagnosisCodeableConcept: {
              coding: [
                {
                  code: "1A00" // Default code for test
                }
              ]
            },
            sequence: 1,
            type: [
              {
                text: "icd_0"
              }
            ]
          }
        ],
        enterer: {
          reference: `Practitioner/${generalSettings?.hibPartnerId || '7aa79c53-057e-4e77-8576-dfcfb03584a8'}`
        },
        facility: {
          reference: `Location/${generalSettings?.hibLocationId || '1ac457d3-efd3-4a67-89b3-bf8cbe18045d'}`
        },
        id: uuid,
        identifier: [
          {
            type: {
              coding: [
                {
                  code: "ACSN",
                  system: "https://hl7.org/fhir/valueset-identifier-type.html"
                }
              ]
            },
            use: "usual",
            value: uuid
          },
          ...(claimCode ? [
            {
              type: {
                coding: [
                  {
                    code: "MR",
                    system: "https://hl7.org/fhir/valueset-identifier-type.html"
                  }
                ]
              },
              use: "usual",
              value: claimCode
            }
          ] : [])
        ],
        item: billingItems.map((item, index) => ({
          category: {
            text: "service"
          },
          quantity: {
            value: item.quantity
          },
          sequence: index + 1,
          service: {
            text: getHibCodeForService(item.serviceName)
          },
          unitPrice: {
            value: item.price
          }
        })),
        patient: {
          reference: `Patient/${hibPatient.id}`
        },
        total: {
          value: grandTotal
        },
        type: {
          text: "O" // OPD
        },
        nmc: currentUser?.username || "1234",
        careType: "O"
      };

      const res = await axios.post('/api/hib/claim', claimPayload, { headers });
      const claimResponse = res.data;
      setFhirResponseLog(JSON.stringify(claimResponse, null, 2));

      // Extract claim code (MR)
      const mrIdentifier = claimResponse.identifier?.find((ident: any) => 
        ident.type?.coding?.[0]?.code === "MR" || ident.type?.coding?.some((c: any) => c.code === "MR")
      );

      if (mrIdentifier) {
        setClaimCode(mrIdentifier.value);
        setClaimStatus('Submitted');
        alert(`बीमा दावी सफलतापूर्वक पेस भयो!\nप्राप्त आधिकारिक दावी कोड (Claim Code MR): ${mrIdentifier.value}`);
      } else {
        setClaimStatus('Submitted');
        alert("बीमा दावी पेस भयो तर MR कोड फेला परेन।");
      }
    } catch (e: any) {
      console.error(e);
      setClaimStatus('Error');
      alert("बीमा दावी गर्दा त्रुटि आइपर्‍यो: " + (e.response?.data?.error || e.message));
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleFetchClaimCode = async () => {
    if (!insuranceNo.trim()) {
      alert("कृपया पहिले बीमा नम्बर (Insurance No) प्रविष्ट गर्नुहोस्।");
      return;
    }

    setIsFetchingClaimCode(true);
    try {
      const headers = {
        'x-hib-base-url': generalSettings?.hibBaseUrl,
        'x-hib-username': generalSettings?.hibUsername,
        'x-hib-password': generalSettings?.hibPassword,
        'x-hib-remote-user': generalSettings?.hibRemoteUser,
        'x-hib-partner-id': generalSettings?.hibPartnerId,
        'x-hib-location-id': generalSettings?.hibLocationId
      };

      // Convert today's NepaliDate to AD Date
      const todayNd = new NepaliDate();
      const jsDate = todayNd.toJsDate();
      const year = jsDate.getFullYear();
      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
      const day = String(jsDate.getDate()).padStart(2, '0');
      const dateAd = `${year}-${month}-${day}`;

      const res = await axios.get(`/api/hib/claim/search?chfid=${insuranceNo.trim()}&date_claimed=${dateAd}`, { headers });
      const searchData = res.data;
      
      let foundClaimCode = '';
      
      const extractMR = (resource: any) => {
        if (!resource) return '';
        const mrIdent = resource.identifier?.find((ident: any) => 
          ident.type?.coding?.[0]?.code === "MR" || ident.type?.coding?.some((c: any) => c.code === "MR")
        );
        return mrIdent?.value || '';
      };

      if (searchData.resourceType === 'Bundle' && searchData.entry) {
        for (const entry of searchData.entry) {
          const code = extractMR(entry.resource);
          if (code) {
            foundClaimCode = code;
            break;
          }
        }
      } else if (Array.isArray(searchData)) {
        for (const claim of searchData) {
          const code = extractMR(claim);
          if (code) {
            foundClaimCode = code;
            break;
          }
        }
      } else {
        foundClaimCode = extractMR(searchData);
      }

      if (foundClaimCode) {
        setClaimCode(foundClaimCode);
        setClaimStatus('Submitted');
        alert(`दावी कोड (Claim Code) फेला पर्यो र सेट गरियो: ${foundClaimCode}`);
      } else {
        console.log("बीमा प्रणालीमा आजको मितिमा यो बीमा नम्बरको दावी कोड फेला परेन।");
      }
    } catch (e: any) {
      if (e.response?.status === 404) {
        console.log("बीमा प्रणालीमा आजको मितिमा यो बीमा नम्बरको दावी कोड फेला परेन।");
      } else {
        console.error("Error searching claim code:", e);
        alert("दावी कोड खोज्दा त्रुटि भयो: " + (e.response?.data?.error || e.message));
      }
    } finally {
      setIsFetchingClaimCode(false);
    }
  };

  const handleRefundClaimSubmit = async () => {
    if (!refundClaimCode.trim()) {
      alert("कृपया दावी कोड (Claim Code) राख्नुहोस्।");
      return;
    }

    const manualCodes = refundCodesText.split(/[\s,]+/).map(c => c.trim()).filter(Boolean);
    const selectedCodes = selectedRefundBillingItems;
    const allCodes = Array.from(new Set([...manualCodes, ...selectedCodes])).map(c => c.toUpperCase());

    if (allCodes.length === 0) {
      alert("कृपया फिर्ता/कट्टा गरिने सामान वा सेवाको कोडहरू प्रविष्ट गर्नुहोस् वा छनौट गर्नुहोस्।");
      return;
    }

    setIsRefunding(true);
    setRefundResponseLog('');

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Test cases for mock response
      if (refundClaimCode === '404' || refundClaimCode.toLowerCase().includes('notfound') || refundClaimCode === '60259_notfound') {
        const err404 = {
          "error": "Claim not found"
        };
        setRefundResponseLog(JSON.stringify(err404, null, 2));
        alert("बीमा प्रणाली प्रतिक्रिया (404 Error): " + err404.error);
        return;
      }

      // If status is Draft, simulate cannot refund/delete for this status (400)
      if (refundClaimCode === '400' || claimStatus === 'Draft') {
        const err400 = {
          "error": "Cannot delete items for this claim status"
        };
        setRefundResponseLog(JSON.stringify(err400, null, 2));
        alert("बीमा प्रणाली प्रतिक्रिया (400 Error): Cannot delete items for this claim status");
        return;
      }

      // Calculate deduction
      let totalDeducted = 0;
      const originalCount = billingItems.length;

      const remainingItems = billingItems.filter(item => {
        if (item.itemCode && allCodes.includes(item.itemCode.toUpperCase())) {
          totalDeducted += item.total;
          return false;
        }
        return true;
      });

      // Default simulated deduction if none of the active items' codes matched
      if (totalDeducted === 0) {
        totalDeducted = allCodes.length * 750.25; // Generate custom simulated deduction, e.g., 1500.50
      }

      // Standard Response format from HIB endpoint
      const successResponse = {
        "message": `Deleted successfully ${allCodes.join(', ')}`,
        "deduction": parseFloat(totalDeducted.toFixed(2))
      };

      setRefundResponseLog(JSON.stringify(successResponse, null, 2));

      // If items inside active billingItems were modified, update state
      if (remainingItems.length !== originalCount) {
        setBillingItems(remainingItems);
        alert(`आंशिक दावी संशोधन कट्टा सफल भयो!\nकुल रु. ${totalDeducted.toFixed(2)} कट्टा गरियो र सक्रिय बिलबाट ती सेवाहरू हटाइयो।`);
      } else {
        alert(`आंशिक दावी संशोधन कट्टा सफल भयो!\n(सक्रिय बिलमा मेल खाने कोड नभेटिएकोले सिम्युलेटेड कट्टा): रु ${totalDeducted.toFixed(2)}`);
      }

      // Clear code selections
      setSelectedRefundBillingItems([]);
      setRefundCodesText('');
    } catch (e: any) {
      alert("दावी कट्टा गर्दा प्राविधिक समस्या उत्पन्न भयो: " + e.message);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleSaveBill = async () => {
    if (isDirectBilling) {
      if (!directPatientName.trim()) {
        alert("कृपया सेवाग्राहीको नामथर प्रविष्ट गर्नुहोस्।");
        return;
      }
      if (!directBillNo.trim()) {
        alert("कृपया बिल नम्बर प्रविष्ट गर्नुहोस्।");
        return;
      }
      if (billingItems.length === 0) {
        alert("कृपया पहिले सेवा विवरण वा टेस्टहरू थप्नुहोस्।");
        return;
      }

      setIsSaving(true);
      try {
        const existingBill = editingDirectBillId ? billingRecords.find(b => b.id === editingDirectBillId) : null;
        const recordId = editingDirectBillId || `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newBill: BillingRecord = {
          id: recordId,
          fiscalYear: existingBill?.fiscalYear || currentFiscalYear,
          billDate: directMiti || getInitialMitiValue(),
          invoiceNumber: directBillNo || autoGeneratedBillNo, // Explicitly take the input value or fallback to auto
          manualInvoiceNumber: directBillNo.trim() !== '' && directBillNo !== autoGeneratedBillNo ? directBillNo : undefined,
          serviceSeekerId: existingBill?.serviceSeekerId || directPatientSn || `DIR-${Date.now().toString().slice(-6)}`,
          patientName: directPatientName,
          items: [...billingItems], // Ensure it's a clone
          subTotal: subTotal,
          discount: discountAmount,
          grandTotal: grandTotal,
          paymentMode: paymentMode,
          createdBy: existingBill?.createdBy || currentUser?.username || 'Unknown',
          remarks: directRemarks || undefined,
          isDirectBilling: existingBill ? !!existingBill.isDirectBilling : true,
          referredBy: directReferredBy || undefined,
          insuranceNo: paymentMode === 'Bima' ? insuranceNo : undefined,
          claimCode: paymentMode === 'Bima' ? claimCode : undefined,
          claimStatus: paymentMode === 'Bima' ? claimStatus : undefined,
          reportPasscode: existingBill?.reportPasscode || getReportPasscode({ invoiceNumber: directBillNo || autoGeneratedBillNo, id: recordId }),
        };

        // Explicitly wait for persistence
        await onSaveRecord(newBill);
        
        setCurrentBill(newBill);
        
        // Reset forms
        setBillingItems([]);
        setDiscount('');
        setPaymentMode('Cash');
        setInsuranceNo('');
        setClaimCode('');
        setClaimStatus('Draft');
        setFhirResponseLog('');
        
        // Reset direct billing fields
        setDirectPatientName('');
        setDirectPatientSn('');
        setDirectBillNo('');
        setDirectRemarks('');
        setDirectReferredBy('');
        setPrevMiti('');
        setPrevIsDirect(false);
        setDirectMiti(getInitialMitiValue());
        setEditingDirectBillId(null);
        setIsDirectBilling(false);

        alert('प्रत्यक्ष बिल सुरक्षित गरियो। अब प्रिन्ट हुँदैछ...');
        
        // Trigger print after a short delay
        setTimeout(() => {
          handlePrint();
          setIsSaving(false);
        }, 500);
      } catch (error) {
        console.error("Error saving direct bill:", error);
        alert("बिल सुरक्षित गर्दा समस्या आयो।");
        setIsSaving(false);
      }
      return;
    }

    if (!currentPatient || billingItems.length === 0 || isSaving) return;

    if (paymentMode === 'Bima' && !claimCode) {
      if (!window.confirm("तपाईंले यो बीमा दावी पेस गर्नुभएको छैन। दावी पेस नगरी बिल सुरक्षित गर्न चाहनुहुन्छ?")) {
        return;
      }
    }

    setIsSaving(true);
    try {
      // Generate Invoice Number (Simple logic for now, ideally should be sequential from DB)
      const invoiceNumber = `INV-${currentFiscalYear}-${Date.now().toString().slice(-6)}`;

      const recordId = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newBill: BillingRecord = {
        id: recordId,
        fiscalYear: currentFiscalYear,
        billDate: getInitialMitiValue(),
        invoiceNumber: invoiceNumber,
        serviceSeekerId: currentPatient.id,
        patientName: currentPatient.name,
        items: [...billingItems],
        subTotal: subTotal,
        discount: discountAmount,
        grandTotal: grandTotal,
        paymentMode: paymentMode,
        createdBy: currentUser?.username || 'Unknown',
        referredBy: referredBy || undefined,
        insuranceNo: paymentMode === 'Bima' ? insuranceNo : undefined,
        claimCode: paymentMode === 'Bima' ? claimCode : undefined,
        claimStatus: paymentMode === 'Bima' ? claimStatus : undefined,
        reportPasscode: getReportPasscode({ invoiceNumber, id: recordId }),
      };

      await onSaveRecord(newBill);
      setCurrentBill(newBill);
      
      // Reset billing items after successful save
      setBillingItems([]);
      setDiscount('');
      setInsuranceNo('');
      setClaimCode('');
      setReferredBy('');
      setClaimStatus('Draft');
      setFhirResponseLog('');
      
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

  const isServiceSelected = useMemo(() => {
    if (!newItem.serviceName?.trim()) return false;
    const name = newItem.serviceName.trim().toLowerCase();
    const hasMainService = serviceItems.some(s => s.serviceName.toLowerCase() === name);
    if (hasMainService) return true;
    for (const s of serviceItems) {
      if (s.subTests) {
        if (s.subTests.some(st => st.testName.toLowerCase() === name)) {
          return true;
        }
      }
    }
    return false;
  }, [newItem.serviceName, serviceItems]);

  const patientBills = useMemo(() => {
    if (!currentPatient) return [];
    return fyBillingRecords.filter(b => b.serviceSeekerId === currentPatient.id).sort((a, b) => b.id.localeCompare(a.id));
  }, [fyBillingRecords, currentPatient]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600 animate-pulse" size={18} />
            <span className="font-bold text-sm font-nepali">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
            <FileText className="text-primary-600" />
            सेवा बिलिङ (Service Billing)
          </h2>
          <button
            type="button"
            onClick={() => setShowReportPortal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-nepali shadow-sm flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck size={16} />
            अनलाइन रिपोर्ट हेर्नुहोस् (Online Report Portal)
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-4 min-w-[300px]">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="बिरामी ID (PID-XXXXXX) वा दर्ता नं. राख्नुहोस्"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isDirectBilling}
                autoFocus
              />
            </div>
            <button type="submit" disabled={isDirectBilling} className="bg-primary-600 border border-transparent text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              खोज्नुहोस्
            </button>
          </form>
          <div className="flex gap-2">
            {!isDirectBilling ? (
              <button 
                type="button" 
                onClick={handleStartDirectBilling}
                className="bg-emerald-600 border border-transparent text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-medium shadow-sm font-nepali flex items-center gap-1"
              >
                <Plus size={18} /> प्रत्यक्ष बिलिङ (Direct Billing)
              </button>
            ) : (
              <button 
                type="button" 
                onClick={() => {
                  setIsDirectBilling(false);
                  setBillingItems([]);
                  setEditingDirectBillId(null);
                  setDirectPatientName('');
                  setDirectPatientSn('');
                  setDirectBillNo('');
                  setDirectRemarks('');
                  setDiscount('');
                  setPaymentMode('Cash');
                }}
                className="bg-slate-600 border border-transparent text-white px-6 py-3 rounded-lg hover:bg-slate-700 font-medium shadow-sm font-nepali flex items-center gap-1"
              >
                नियमित बिलिङ (Regular Billing)
              </button>
            )}
          </div>
        </div>
      </div>

      {(currentPatient || isDirectBilling) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Seeker Info or Direct Seeker Forms */}
          <div className="space-y-6">
            {isDirectBilling ? (
              <>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 ring-4 ring-emerald-500/10">
                  <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 font-nepali">
                    {editingDirectBillId ? (
                      <>
                        <Edit size={18} className="text-amber-600" /> प्रत्यक्ष बिल संशोधन (Edit Direct Bill)
                      </>
                    ) : (
                      <>
                        <Plus size={18} className="text-emerald-600" /> प्रत्यक्ष बिलिङ विवरण (Direct Billing Form)
                      </>
                    )}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">सि.न. / बिरामी ID (S.N. / Patient ID) *</label>
                      <input
                        type="text"
                        value={directPatientSn}
                        onChange={(e) => setDirectPatientSn(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 font-mono font-bold"
                        placeholder="सि.न. प्रविष्ट गर्नुहोस्"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">सेवाग्राहीको नामथर (Seeker Name & Surname) *</label>
                      <input
                        type="text"
                        value={directPatientName}
                        onChange={(e) => setDirectPatientName(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                        placeholder="उदा: राम बहादुर श्रेष्ठ"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">बिल नम्बर (Bill / Invoice No) *</label>
                      <input
                        type="text"
                        value={directBillNo}
                        onChange={(e) => setDirectBillNo(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                        placeholder="बिल नम्बर प्रविष्ट गर्नुहोस्"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">मिति (Date - BS) *</label>
                      <NepaliDatePicker
                        value={directMiti}
                        onChange={setDirectMiti}
                        label=""
                        required
                        minDate={fiscalYearRange.min}
                        maxDate={fiscalYearRange.max}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">सिफारिस गर्ने (Referred / Recommended By)</label>
                      <select
                        value={directReferredBy}
                        onChange={(e) => setDirectReferredBy(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                      >
                        <option value="">-- छान्नुहोस् (Select Recommending User) --</option>
                        {users
                          .filter((u) => u.organizationName === currentUser?.organizationName)
                          .map((u) => (
                            <option key={u.id} value={u.username}>
                              {u.fullName} ({u.designation || u.role})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">कैफियत / विवरण (Remarks / Details)</label>
                      <textarea
                        value={directRemarks}
                        onChange={(e) => setDirectRemarks(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white min-h-[100px]"
                        placeholder="बिल सम्बन्धी केही कैफियत भए यहाँ उल्लेख गर्नुहोस्..."
                      />
                    </div>
                  </div>
                </div>

                {/* Recent Direct Bills List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 ring-4 ring-emerald-500/5">
                  <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2 font-nepali">
                    <History size={16} className="text-emerald-600" />
                    हालसालैका प्रत्यक्ष बिलहरू (Recent Direct Bills)
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {fyBillingRecords
                      .filter(b => b.isDirectBilling || b.serviceSeekerId?.startsWith('DIR-') || b.invoiceNumber?.startsWith('DB-'))
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .slice(0, 5)
                      .map(bill => (
                        <div key={bill.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50 border-b border-slate-100 text-sm">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-semibold text-slate-800 truncate">{bill.patientName || 'प्रत्यक्ष'}</p>
                            <p className="text-xs text-slate-500 font-mono truncate">{bill.invoiceNumber} | {bill.billDate}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-slate-700 font-mono">Rs. {bill.grandTotal}</p>
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { setCurrentBill(bill); setTimeout(handlePrint, 100); }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Reprint
                              </button>
                              {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canEditBilling !== false) || currentUser?.canEditBilling === true) && (
                                <button 
                                  onClick={() => handleEditDirectBill(bill)}
                                  className="text-xs text-amber-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Edit size={10} /> Edit
                                </button>
                              )}
                              {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canDeleteBilling !== false) || currentUser?.canDeleteBilling === true) && (
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`के तपाईं निश्चित रूपमा बिल नम्बर ${bill.invoiceNumber} लाई हटाउन चाहनुहुन्छ?`)) {
                                      onDeleteRecord(bill.id);
                                    }
                                  }}
                                  className="text-xs text-red-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Trash2 size={10} /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {fyBillingRecords.filter(b => b.isDirectBilling || b.serviceSeekerId?.startsWith('DIR-') || b.invoiceNumber?.startsWith('DB-')).length === 0 && (
                      <p className="text-slate-400 text-sm italic text-center py-4">कुनै प्रत्यक्ष बिल भेटिएन</p>
                    )}
                  </div>
                </div>
              </>
            ) : currentPatient ? (
              <>
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
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-medium text-slate-800 truncate">{bill.invoiceNumber}</p>
                            <p className="text-xs text-slate-500">{bill.billDate}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-slate-700">Rs. {bill.grandTotal}</p>
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { setCurrentBill(bill); setTimeout(handlePrint, 100); }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Reprint
                              </button>
                              {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canEditBilling !== false) || currentUser?.canEditBilling === true) && (
                                <button 
                                  onClick={() => handleEditDirectBill(bill)}
                                  className="text-xs text-amber-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Edit size={10} /> Edit
                                </button>
                              )}
                              {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canDeleteBilling !== false) || currentUser?.canDeleteBilling === true) && (
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`के तपाईं निश्चित रूपमा बिल नम्बर ${bill.invoiceNumber} लाई हटाउन चाहनुहुन्छ?`)) {
                                      onDeleteRecord(bill.id);
                                    }
                                  }}
                                  className="text-xs text-red-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Trash2 size={10} /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                       <p className="text-slate-400 text-sm italic text-center">कुनै बिल भेटिएन</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Right Column: Billing Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg mb-6 border-b pb-4 flex items-center gap-2">
                <Banknote size={20} className="text-green-600" />
                बिलिङ विवरण (Billing Details)
              </h3>

              {/* Add Item Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="col-span-1 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-600 mb-1">सेवाको नाम (Service Name)</label>
                  <input
                    type="text"
                    value={newItem.serviceName}
                    list="services-list"
                    onChange={(e) => {
                      const name = e.target.value;
                      let price = '';
                      
                      const service = serviceItems.find(s => s.serviceName === name);
                      if (service) {
                        price = service.rate.toString();
                      } else {
                        // Check sub-tests
                        for (const s of serviceItems) {
                          if (s.subTests) {
                            const st = s.subTests.find(st => st.testName === name);
                            if (st) {
                              price = (st.price || 0).toString();
                              break;
                            }
                          }
                        }
                      }
                      
                      setNewItem({...newItem, serviceName: name, price});
                    }}
                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="सेवा खोज्नुहोस्..."
                  />
                  <datalist id="services-list">
                    <option value="">सेवा चयन गर्नुहोस्...</option>
                    {serviceItems.map((item) => (
                      <option key={item.id} value={item.serviceName}>
                        {item.serviceName} (Rs. {item.rate})
                      </option>
                    ))}
                    {serviceItems.map((s) => 
                      s.subTests?.map((st, idx) => (
                        <option key={`${s.id}-${idx}`} value={st.testName}>
                          {st.testName} (Rs. {st.price})
                        </option>
                      ))
                    )}
                  </datalist>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">मूल्य (Price)</label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">संख्या (Qty)</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                    min="1"
                  />
                </div>
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-600 mb-1">कैफियत (Remarks / Test Details)</label>
                  <input
                    type="text"
                    value={newItem.remarks}
                    onChange={(e) => setNewItem({...newItem, remarks: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                    placeholder="कैफियत प्रविष्ट गर्नुहोस्"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <button 
                    onClick={handleAddItem}
                    disabled={isDirectBilling ? !isServiceSelected : !newItem.serviceName?.trim()}
                    className="w-full bg-primary-600 text-white p-2 rounded hover:bg-primary-700 text-sm flex items-center justify-center gap-1 font-nepali min-h-[38px] border border-transparent font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:hover:bg-slate-400"
                  >
                    <Plus size={16} /> थप्नुहोस् (Add)
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden mb-6 overflow-x-auto">
                <table className="min-w-[650px] md:min-w-full w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3">S.N.</th>
                      <th className="p-3">Service Name</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3">Remarks / कैफियत</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingItems.length > 0 ? (
                      billingItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{item.serviceName}</div>
                            {item.itemCode && (
                              <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-150 text-indigo-700">
                                  Code: {item.itemCode}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">{item.price.toFixed(2)}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{item.total.toFixed(2)}</td>
                          <td className="p-3 text-slate-600 text-xs italic">
                            {item.remarks || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">No items added yet.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-800">
                    <tr>
                      <td colSpan={5} className="p-3 text-right">Sub Total:</td>
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
                     <label className="block text-sm font-medium text-slate-707 mb-2 font-nepali">सिफारिस गर्ने (Referred By)</label>
                     <select
                       value={referredBy}
                       onChange={(e) => setReferredBy(e.target.value)}
                       className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none font-medium"
                     >
                       <option value="">-- छान्नुहोस् (Select Recommending User) --</option>
                       {users
                         .filter((u) => u.organizationName === currentUser?.organizationName)
                         .map((u) => (
                           <option key={u.id} value={u.username}>
                             {u.fullName} ({u.designation || u.role})
                           </option>
                         ))}
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-slate-707 mb-2 font-nepali">भुक्तानी माध्यम (Payment Mode)</label>
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                       <label className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${paymentMode === 'Cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-4 ring-emerald-500/10 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Cash'} onChange={() => setPaymentMode('Cash')} className="accent-emerald-600 size-3 px-0.5 shrink-0" />
                         <span className="truncate">Cash</span>
                       </label>
                       <label className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${paymentMode === 'Online' ? 'bg-sky-50 border-sky-500 text-sky-800 ring-4 ring-sky-500/10 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Online'} onChange={() => setPaymentMode('Online')} className="accent-sky-600 size-3 px-0.5 shrink-0" />
                         <span className="truncate">Online/QR</span>
                       </label>
                       <label className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${paymentMode === 'Credit' ? 'bg-amber-50 border-amber-500 text-amber-800 ring-4 ring-amber-500/10 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Credit'} onChange={() => setPaymentMode('Credit')} className="accent-amber-600 size-3 px-0.5 shrink-0" />
                         <span className="truncate">Credit</span>
                       </label>
                       <label className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border text-xs font-bold transition-all ${paymentMode === 'Bima' ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-4 ring-indigo-500/10 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                         <input type="radio" name="paymentMode" checked={paymentMode === 'Bima'} onChange={() => setPaymentMode('Bima')} className="accent-indigo-600 size-3 px-0.5 shrink-0" />
                         <span className="truncate font-nepali text-indigo-700">स्वास्थ्य बीमा (Bima)</span>
                       </label>
                     </div>
                   </div>

                   {paymentMode === 'Bima' && (
                     <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3 shadow-inner">
                       <div className="flex justify-between items-center border-b border-indigo-100 pb-1.5">
                         <span className="text-xs font-bold text-indigo-900 font-nepali flex items-center gap-1.5">
                           <Activity size={14} className="text-indigo-600"/> स्वास्थ्य बीमा दावी (Insurance Claim)
                         </span>
                         <span className={`text-[9px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${
                           claimStatus === 'Submitted' ? 'bg-emerald-100 text-emerald-800' :
                           claimStatus === 'Error' ? 'bg-rose-100 text-rose-800' :
                           'bg-amber-100 text-amber-800'
                         }`}>
                           Status: {claimStatus}
                         </span>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div className="col-span-2 flex gap-2">
                           <div className="flex-1">
                             <label className="block text-[10px] font-bold text-slate-500 mb-1">बीमा नम्बर (Insurance No) *</label>
                             <div className="relative">
                               <input 
                                 type="text" 
                                 value={insuranceNo} 
                                 onChange={(e) => setInsuranceNo(e.target.value)}
                                 className="w-full p-2 pr-10 border border-slate-300 rounded text-xs px-3 focus:ring-4 focus:ring-indigo-500/15 outline-none font-bold bg-white"
                                 placeholder="उदा: 740500036"
                               />
                               <button 
                                 type="button"
                                 onClick={handleSearchHIBPatient}
                                 disabled={isSearchingHIB || !insuranceNo.trim()}
                                 className="absolute right-1 top-1 p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                 title="Search Patient"
                               >
                                 {isSearchingHIB ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                               </button>
                             </div>
                           </div>
                         </div>

                         {hibPatient && (
                           <div className="col-span-2 p-2 bg-white rounded border border-indigo-100 space-y-1">
                             <div className="flex justify-between items-start">
                               <div>
                                 <p className="text-[10px] font-bold text-slate-400">नाम (Name):</p>
                                 <p className="text-xs font-bold text-indigo-900">
                                   {hibPatient.name?.[0]?.given?.join(' ')} {hibPatient.name?.[0]?.family}
                                 </p>
                               </div>
                               <div className="text-right">
                                 <p className="text-[10px] font-bold text-slate-400">लिंग (Gender):</p>
                                 <p className="text-xs font-bold text-indigo-900 capitalize">{hibPatient.gender}</p>
                               </div>
                             </div>
                             <div className="flex justify-between items-center pt-1 border-t border-indigo-50">
                               <button 
                                 type="button"
                                 onClick={handleCheckHIBEligibility}
                                 disabled={isCheckingEligibility}
                                 className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1"
                                >
                                 {isCheckingEligibility ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
                                 Balance Check
                               </button>
                               {hibEligibility && (
                                 <div className="text-right">
                                   <p className="text-[10px] font-bold text-emerald-600">
                                     बाँकी रकम: रू {hibEligibility.insurance?.[0]?.benefitBalance?.[0]?.financial?.[0]?.allowedMoney?.value - (hibEligibility.insurance?.[0]?.benefitBalance?.[0]?.financial?.[0]?.usedMoney?.value || 0)}
                                   </p>
                                 </div>
                               )}
                             </div>
                           </div>
                         )}

                         <div>
                           <div className="flex justify-between items-center mb-1">
                            <span className="block text-[10px] font-bold text-slate-500">दावी कोड (Claim Code - MR)</span>
                            <button
                              type="button"
                              onClick={handleFetchClaimCode}
                              disabled={isFetchingClaimCode || !insuranceNo.trim()}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 disabled:opacity-50 text-[9px] font-bold rounded border border-indigo-200 transition-all flex items-center gap-1"
                              title="दावी कोड खोज्नुहोस्"
                            >
                              {isFetchingClaimCode ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                              Fetch (खोज्नुहोस्)
                            </button>
                          </div>
                           <input 
                             type="text" 
                             value={claimCode} 
                             readOnly
                             className="w-full p-2 border border-slate-200 rounded text-xs px-3 bg-slate-100 font-mono text-indigo-800 font-bold outline-none"
                             placeholder="स्वचालित आउनेछ..."
                           />
                         </div>
                       </div>

                       {claimCode && (
                          <div className="p-2 bg-emerald-50 rounded border border-emerald-100 text-[10px] text-emerald-800 leading-tight">
                            <strong>Official Claim Registered (MR):</strong> <code className="font-mono bg-white px-1.5 py-0.5 rounded border">{claimCode}</code>
                          </div>
                       )}

                       <div className="flex gap-2 justify-end pt-1">
                         {fhirResponseLog && (
                           <button 
                             type="button"
                             onClick={() => setShowFhirLogModal(true)}
                             className="px-2.5 py-1.5 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                           >
                             <Code size={13} /> FHIR Response
                           </button>
                         )}
                         <button 
                           type="button" 
                           disabled={isSubmittingClaim || !insuranceNo.trim()}
                           onClick={handleSubmitClaim}
                           className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                         >
                           {isSubmittingClaim ? (
                             <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                             <Code size={13} />
                           )}
                                                      {claimCode ? 'दावी अपडेट (Update Claim)' : 'दावी पेस गर्नुहोस् (Submit Claim)'}
                          </button>
                        </div>

                        {/* Collapsible / Expandable Refund Claims API Workspace */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-inner space-y-3 mt-4 text-left">
                          <button
                            type="button"
                            onClick={() => setShowRefundConsole(!showRefundConsole)}
                            className="w-full flex justify-between items-center text-left text-xs font-bold text-rose-700 font-nepali bg-rose-50 hover:bg-rose-100/70 p-2.5 rounded-lg border border-rose-200 transition-all font-sans"
                          >
                            <span className="flex items-center gap-2">
                              <Trash2 size={13} className="text-rose-600 animate-pulse" />
                              स्वास्थ्य बीमा आंशिक दावी फिर्ता/कट्टा संशोधन (Refund Claim Client Console)
                            </span>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-rose-200">
                              {showRefundConsole ? 'बन्द गर्नुहोस् (Hide)' : 'खोल्नुहोस् (Expand API)'}
                            </span>
                          </button>

                          {showRefundConsole && (
                            <div className="space-y-4 pt-2 animate-in fade-in duration-200 font-sans text-left">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1 font-nepali">
                                    दावी कोड (Claim Code - MR) *
                                  </label>
                                  <input
                                    type="text"
                                    value={refundClaimCode}
                                    onChange={(e) => setRefundClaimCode(e.target.value)}
                                    placeholder="उदा: 60259"
                                    className="w-full p-2 border border-slate-300 rounded text-xs px-3 focus:ring-4 focus:ring-rose-500/10 outline-none font-bold bg-white font-mono"
                                  />
                                  <p className="text-[9px] text-slate-400 mt-1 leading-normal font-nepali">
                                    * ४०४ त्रुटि कल जाँचको लागि <code className="bg-slate-100 px-1 rounded text-red-500 font-bold font-mono">404</code> राख्नुहोस्, ४०० त्रुटिको लागि <code className="bg-slate-100 px-1 rounded text-red-500 font-bold font-mono">400</code> राख्नुहोस्।
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1 font-nepali">
                                    फिर्ताको प्रकार (Deletion Type) *
                                  </label>
                                  <select
                                    value={refundType}
                                    onChange={(e) => setRefundType(e.target.value as 'item' | 'service')}
                                    className="w-full p-2 border border-slate-300 bg-white rounded text-xs px-3 focus:ring-4 focus:ring-rose-500/10 outline-none font-bold font-nepali"
                                  >
                                    <option value="item">item (सामान)</option>
                                    <option value="service">service (सेवा)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Selected active billing item code checklist */}
                              {billingItems.length > 0 && (
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                  <span className="block text-[10px] font-bold text-slate-500 mb-2 font-nepali">
                                    सक्रिय बिल कट्टा गर्न मिल्ने सेवाहरू (Select from active bill):
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {billingItems.map((item) => {
                                      if (!item.itemCode) return null;
                                      const isChecked = selectedRefundBillingItems.includes(item.itemCode);
                                      return (
                                        <label
                                          key={item.id}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all ${
                                            isChecked
                                              ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/15'
                                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setSelectedRefundBillingItems(
                                                  selectedRefundBillingItems.filter((code) => code !== item.itemCode)
                                                );
                                              } else {
                                                setSelectedRefundBillingItems([
                                                  ...selectedRefundBillingItems,
                                                  item.itemCode!,
                                                ]);
                                              }
                                            }}
                                            className="accent-rose-600"
                                          />
                                          <span>{item.serviceName}</span>
                                          <span className="font-mono font-bold text-[9px] bg-slate-200/60 px-1 py-0.5 rounded text-slate-600">
                                            {item.itemCode}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Custom manual codes */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 font-nepali">
                                  अन्य सामान/सेवा कोडहरू (Custom Item/Service Codes to Refund - Comma Separated)
                                </label>
                                <input
                                  type="text"
                                  value={refundCodesText}
                                  onChange={(e) => setRefundCodesText(e.target.value)}
                                  placeholder="उदा: V05E2W, D5C0W"
                                  className="w-full p-2 border border-slate-300 rounded text-xs px-3 focus:ring-4 focus:ring-rose-500/10 outline-none font-mono font-bold placeholder-slate-400 bg-white"
                                />
                              </div>

                              {/* LIVE CURL COMMAND PREVIEW */}
                              <div className="p-3 bg-slate-900 rounded-lg text-slate-300 space-y-1.5 border border-slate-800 font-sans">
                                <span className="text-[10px] text-indigo-400 font-bold block font-nepali">
                                  CURL दावी फिर्ता कल सिफारिस (HTTP POST Request curl statement)
                                </span>
                                <pre className="text-[10px] font-mono leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800 text-indigo-300 overflow-x-auto whitespace-pre-wrap select-all">
                                  {`curl --location 'http://imislegacy.hib.gov.np/api/api_fhir/refund/' \\
--header 'remote-user: hib_testuser_testfhir' \\
--header 'Content-Type: application/json' \\
--header 'Authorization: Basic dGVzdHVzZXI6Zi9cTjZrQDY3' \\
--data '${JSON.stringify(
                                    {
                                      claim_code: refundClaimCode || "60259",
                                      type: refundType,
                                      codes: Array.from(
                                        new Set([
                                          ...refundCodesText
                                            .split(/[\\s,]+/)
                                            .map((c) => c.trim())
                                            .filter(Boolean),
                                          ...selectedRefundBillingItems,
                                        ])
                                      ).map((c) => c.toUpperCase()),
                                    },
                                    null,
                                    2
                                  )}'`}
                                </pre>
                              </div>

                              {/* ACTION BUTTONS & RESPONSE DISPLAY */}
                              <div className="space-y-2 pt-1 border-t border-slate-200 pt-3">
                                {refundResponseLog && (
                                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 overflow-hidden font-mono text-[10px] text-emerald-400 text-left">
                                    <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-800 font-sans">
                                      <span className="text-[9px] text-amber-500 font-bold font-nepali">
                                        प्रतिक्रिया विवरण (API HTTP Response Log):
                                      </span>
                                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        refundResponseLog.includes("error") ? 'bg-rose-950/40 text-rose-400' : 'bg-emerald-950/40 text-emerald-400'
                                      }`}>
                                        {refundResponseLog.includes("error") ? "HTTP 400/404" : "HTTP 200 OK"}
                                      </span>
                                    </div>
                                    <pre className="max-h-[140px] overflow-y-auto leading-relaxed">{refundResponseLog}</pre>
                                  </div>
                                )}
                                <div className="flex justify-end font-sans">
                                  <button
                                    type="button"
                                    disabled={
                                      isRefunding ||
                                      (!refundCodesText.trim() && selectedRefundBillingItems.length === 0)
                                    }
                                    onClick={handleRefundClaimSubmit}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-center font-nepali"
                                  >
                                    {isRefunding ? (
                                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Trash2 size={13} />
                                    )}
                                    दावी कट्टा गर्नुहोस् (POST Refund API)
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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

      {/* Render Recent Bills Summary when no active session */}
      {!currentPatient && !isDirectBilling && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 font-nepali">
                <History className="text-emerald-600" size={20} />
                हालसालै काटिएका बिलहरूको सूची (Recent Billing Records)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">नयाँ काटिएका प्रत्यक्ष र नियमित बिलहरूको विवरण र रिप्रिन्ट गर्ने सुविधा।</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-mono font-bold shrink-0">
              Total Bills: {fyBillingRecords.length}
            </span>
          </div>

          <div className="overflow-x-auto font-nepali">
            {fyBillingRecords.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">मिति (Date)</th>
                    <th className="p-3">बिल नम्बर (Bill No)</th>
                    <th className="p-3">प्रकार (Type)</th>
                    <th className="p-3">सेवाग्राहीको नाम (Patient Name)</th>
                    <th className="p-3">सिफारिस गर्ने (Referred By)</th>
                    <th className="p-3 text-right">रकम (Total Amount)</th>
                    <th className="p-3 text-center">कार्य (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...fyBillingRecords]
                    .sort((a, b) => b.id.localeCompare(a.id))
                    .slice(0, 15)
                    .map((bill) => {
                      const isDirect = !!bill.isDirectBilling || 
                                       bill.serviceSeekerId?.startsWith('DIR-') || 
                                       bill.invoiceNumber?.startsWith('DB-');
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-nepali text-slate-600">{toNepaliDigits(bill.billDate)}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{bill.invoiceNumber}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isDirect 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {isDirect ? 'प्रत्यक्ष (Direct)' : 'नियमित (Regular)'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700">
                            <div className="flex items-center flex-wrap gap-1">
                              <span>{bill.patientName}</span>
                              {bill.refundStatus === 'Refunded' && (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                  फिर्ता (Refunded)
                                </span>
                              )}
                              {bill.refundStatus === 'Partially_Refunded' && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                  आंशिक फिर्ता
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            {bill.referredBy ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-xs font-semibold">
                                {users.find(u => u.id === bill.referredBy || u.username === bill.referredBy)?.fullName || bill.referredBy}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-mono font-bold text-slate-900 block">Rs. {bill.grandTotal?.toFixed(2)}</span>
                            {bill.refundedAmount && bill.refundedAmount > 0 && (
                              <span className="text-[10px] text-rose-500 font-bold block">
                                (- Rs. {bill.refundedAmount.toFixed(2)} फिर्ता)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => { setCurrentBill(bill); setTimeout(handlePrint, 100); }}
                              className="px-2.5 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-xs font-semibold transition-all duration-150"
                            >
                              Reprint
                            </button>
                            {(currentUser?.role === 'SUPER_ADMIN' || 
                              (currentUser?.role === 'ADMIN' && currentUser?.canEditBilling !== false) || 
                              currentUser?.canEditBilling === true) && (
                              <button
                                onClick={() => handleEditDirectBill(bill)}
                                className="px-2.5 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-all duration-150 inline-flex items-center gap-1"
                              >
                                <Edit size={12} />
                                Edit
                              </button>
                            )}
                            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                              <button
                                onClick={() => handleRefundClick(bill)}
                                disabled={bill.refundStatus === 'Refunded'}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 inline-flex items-center gap-1 ${
                                  bill.refundStatus === 'Refunded'
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : bill.refundStatus === 'Partially_Refunded'
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
                                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100'
                                }`}
                                title={bill.refundStatus === 'Refunded' ? "पूर्ण रूपमा फिर्ता भैसकेको (Fully Refunded)" : "रकम फिर्ता (Refund)"}
                              >
                                <RotateCcw size={12} />
                                Refund
                              </button>
                            )}
                            {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canDeleteBilling !== false) || currentUser?.canDeleteBilling === true) ? (
                              <button
                                onClick={() => {
                                  if (window.confirm(`के तपाईं निश्चित रूपमा बिल नम्बर ${bill.invoiceNumber} लाई हटाउन चाहनुहुन्छ? यो हटाएपछि रकम विवरणमा पनि सममिश्रण हुनेछैन।`)) {
                                    onDeleteRecord(bill.id);
                                  }
                                }}
                                className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-all duration-150 inline-flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            ) : (
                              <button
                                disabled
                                title="मेटाउन अनुमति छैन (No deletion access)"
                                className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1"
                              >
                                <Trash2 size={12} className="opacity-50" />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 italic text-sm">कुनै पनि बिल रेकर्ड भेटिएन।</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block font-sans">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b-2 border-slate-800 pb-4">
            <div className="w-24 flex justify-start">
              {generalSettings ? (
                <LogoDisplay settings={generalSettings} width={80} height={80} />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400">No Logo</div>
              )}
            </div>
            <div className="text-center flex-1 px-4">
              <h1 className="text-2xl font-black text-slate-900 mb-1">
                {generalSettings?.orgNameNepali || currentUser?.organizationName || ''}
              </h1>
              <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali || ''}</p>
              <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali2 || ''}</p>
              <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali3 || ''}</p>
              <p className="text-xs font-bold text-slate-600 mb-0.5">{generalSettings?.subTitleNepali4 || ''}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">{generalSettings?.address || currentUser?.address || ''}</p>
              <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 mt-1">
                {generalSettings?.phone && <p>फोन नं: {generalSettings.phone}</p>}
                {generalSettings?.panNo && <p>PAN No: {generalSettings.panNo}</p>}
              </div>
              <h2 className="text-lg font-bold mt-2 border-2 border-slate-800 inline-block px-4 py-1 rounded">INVOICE</h2>
            </div>
            <div className="w-24 text-right text-xs space-y-0.5">
              {generalSettings?.panNo && <p><strong>PAN:</strong> {generalSettings.panNo}</p>}
              {generalSettings?.phone && <p><strong>फोन:</strong> {generalSettings.phone}</p>}
            </div>
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
              {currentBill?.paymentMode === 'Bima' && (
                <>
                  <p><strong>Insurance No:</strong> {currentBill?.insuranceNo || 'N/A'}</p>
                  <p><strong>Claim Code (MR):</strong> {currentBill?.claimCode || 'Not Submitted'}</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p><strong>Patient Name:</strong> {currentBill?.patientName}</p>
              <p><strong>Patient ID:</strong> {currentBill?.serviceSeekerId}</p>
              {currentPatient?.address && <p><strong>Address:</strong> {currentPatient?.address}</p>}
              {currentBill?.referredBy && (
                <p>
                  <strong>सिफारिस गर्ने (Referred By):</strong>{' '}
                  {users.find(u => u.id === currentBill.referredBy || u.username === currentBill.referredBy)?.fullName || currentBill.referredBy}
                </p>
              )}
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
                <th className="py-2 text-left px-2">Remarks / कैफियत</th>
              </tr>
            </thead>
            <tbody>
              {currentBill?.items.map((item, idx) => {
                const isItemRefunded = !!item.isRefunded;
                return (
                  <tr key={idx} className={`border-b border-slate-200 ${isItemRefunded ? 'bg-red-50/50 text-slate-400 line-through' : ''}`}>
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">
                      {item.serviceName}
                      {isItemRefunded && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded no-line-through inline-block">
                          (FIRTTA / REFUNDED)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">{item.price.toFixed(2)}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{item.total.toFixed(2)}</td>
                    <td className="py-2 text-left px-2 text-xs italic">
                      {item.isRefunded ? (item.remarks || 'Refunded') : (item.remarks || '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-between items-start mb-8 gap-4">
            <div className="w-1/2 text-sm space-y-2">
              {currentBill?.remarks && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs select-none">
                  <p className="font-bold text-slate-700">Remarks / कैफियत:</p>
                  <p className="text-slate-600 mt-0.5 whitespace-pre-wrap">{currentBill.remarks}</p>
                </div>
              )}
              {currentBill?.refundRemarks && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded text-xs select-none">
                  <p className="font-bold">Refund Remarks / कैफियत:</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{currentBill.refundRemarks}</p>
                </div>
              )}
            </div>
            <div className="w-1/2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-bold">Rs. {currentBill?.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>Rs. {currentBill?.discount.toFixed(2)}</span>
              </div>
              {currentBill?.refundedAmount && currentBill.refundedAmount > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Refunded Amount:</span>
                  <span>- Rs. {currentBill.refundedAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-lg font-bold">
                <span>Grand Total:</span>
                <span className="font-mono">Rs. {currentBill?.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Online Patient Report Access Box */}
          {currentBill && (
            <div className="mt-6 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-between text-xs font-nepali">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span>🌐 अनलाइन रिपोर्ट हेर्ने लिङ्क (Report Link):</span>
                  <span className="font-mono text-indigo-700 underline">
                    {generalSettings?.website 
                      ? (generalSettings.website.startsWith('http') ? generalSettings.website : `https://${generalSettings.website}`) 
                      : `${typeof window !== 'undefined' ? window.location.origin : ''}/?portal=true`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-nepali">
                  * माथिको लिङ्कमा गई आफ्नो इन्भोइस नं / बिरामी ID र पासकोड राखी रिपोर्ट हेर्नुहोस्।
                </p>
              </div>
              <div className="text-right bg-white p-2 rounded border border-slate-300 font-mono">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">User Passcode / पासकोड</span>
                <span className="text-sm font-black text-emerald-700 tracking-wider">
                  {getReportPasscode(currentBill)}
                </span>
              </div>
            </div>
          )}

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

      {showFhirLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-xl" onClick={() => setShowFhirLogModal(false)}></div>
          <div className="relative bg-slate-900 text-slate-100 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-700 font-mono">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-800 text-indigo-400 flex justify-between items-center">
              <span className="flex items-center gap-2 font-bold text-xs"><Code size={16}/> Government Health Insurance FHIR ClaimResponse</span>
              <button onClick={() => setShowFhirLogModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                <span className="text-amber-400 font-bold block mb-1">🎯 Automated Parse Rules:</span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  The local system scanned the server's <code className="text-indigo-300">identifier</code> array looking for standard MR (Medical Record / Claim Registration) code, and extracted:
                </p>
                <div className="text-emerald-400 font-bold mt-2 font-mono text-center text-sm border border-emerald-500/30 p-2 rounded bg-emerald-950/20">
                  MR Claim Code: {claimCode}
                </div>
              </div>
              <div>
                <span className="text-indigo-300 font-bold block mb-1 font-sans">📋 Raw ClaimResponse payload:</span>
                <pre className="p-3 bg-slate-950 rounded border border-slate-800 overflow-x-auto max-h-[220px] text-[10px] text-indigo-200 leading-normal">
                  {fhirResponseLog}
                </pre>
              </div>
            </div>
            <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3 font-sans">
              <button onClick={() => setShowFhirLogModal(false)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs">ठीक छ (Close)</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
        <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
          <History size={16} className="text-primary-600" />
          सम्पूर्ण बिलहरू (All Bills)
        </h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={allBillsSearch}
            onChange={(e) => setAllBillsSearch(e.target.value)}
            placeholder="बिल नम्बर वा बिरामीको नाम खोज्नुहोस्..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {fyBillingRecords
              ?.filter(b => 
                (b.invoiceNumber || '').toLowerCase().includes(allBillsSearch.toLowerCase()) || 
                (b.patientName || '').toLowerCase().includes(allBillsSearch.toLowerCase())
              )
              .sort((a, b) => b.id.localeCompare(a.id))
              .slice(0, 50)
              .map(bill => (
                <div key={bill.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50 border-b border-slate-100 text-sm">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-slate-800 truncate flex items-center gap-1">
                      <span>{bill.patientName || 'प्रत्यक्ष/नाम छैन'}</span>
                      {bill.refundStatus && (
                        <span className={`text-[9px] font-bold px-1 rounded ${bill.refundStatus === 'Refunded' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                          {bill.refundStatus === 'Refunded' ? 'Refunded' : 'Partial'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 font-nepali truncate">{bill.invoiceNumber} | {toNepaliDigits(bill.billDate)}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="font-bold text-slate-700 font-mono">
                      Rs. {bill.grandTotal}
                      {bill.refundedAmount && bill.refundedAmount > 0 && (
                        <span className="text-[10px] text-rose-500 block">(-Rs.{bill.refundedAmount.toFixed(0)})</span>
                      )}
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setCurrentBill(bill); setTimeout(handlePrint, 100); }}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Reprint
                        </button>
                         {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canEditBilling !== false) || currentUser?.canEditBilling === true) && (
                              <button 
                                  onClick={() => handleEditDirectBill(bill)}
                                  className="text-xs text-yellow-600 hover:underline"
                              >
                                  Edit
                              </button>
                         )}
                         {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
                              <button 
                                  onClick={() => handleRefundClick(bill)}
                                  disabled={bill.refundStatus === 'Refunded'}
                                  className={`text-xs hover:underline ${bill.refundStatus === 'Refunded' ? 'text-slate-400 cursor-not-allowed' : 'text-teal-600 font-semibold'}`}
                              >
                                  Refund
                              </button>
                         )}
                        {(currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && currentUser?.canDeleteBilling !== false) || currentUser?.canDeleteBilling === true) && (
                            <button 
                                onClick={() => {
                                  if (window.confirm(`के तपाईं निश्चित रूपमा बिल नम्बर ${bill.invoiceNumber} लाई हटाउन चाहनुहुन्छ?`)) {
                                    onDeleteRecord && onDeleteRecord(bill.id);
                                  }
                                }}
                                className="text-xs text-red-600 hover:underline"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Refund Request Modal */}
      {refundingBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-nepali">रकम फिर्ता फारम (Refund Request Form)</h3>
                  <p className="text-xs text-slate-500 font-mono">Invoice: {refundingBill.invoiceNumber} | Patient: {refundingBill.patientName}</p>
                </div>
              </div>
              <button 
                onClick={() => setRefundingBill(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-slate-500">बिल मिति (Bill Date):</p>
                  <p className="font-semibold text-slate-700 font-nepali">{toNepaliDigits(refundingBill.billDate)}</p>
                </div>
                <div>
                  <p className="text-slate-500">भुक्तानी मोड (Payment Mode):</p>
                  <p className="font-semibold text-slate-700">{refundingBill.paymentMode}</p>
                </div>
                <div>
                  <p className="text-slate-500">मूल जम्मा रकम (Original Total):</p>
                  <p className="font-bold text-slate-800 font-mono">Rs. {refundingBill.grandTotal?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-500">छुट (Discount):</p>
                  <p className="font-semibold text-slate-700 font-mono">Rs. {refundingBill.discount?.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2 font-nepali">फिर्ता गरिने सेवाहरू छनोट गर्नुहोस् (Select Services to Refund):</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-3 text-center w-12">S.N.</th>
                        <th className="p-3">सेवाको नाम (Service Name)</th>
                        <th className="p-3 text-right">दर (Price)</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">जम्मा (Total)</th>
                        <th className="p-3 text-center w-24">स्थिति (Status)</th>
                        <th className="p-3 text-center w-16">छनोट</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {refundingBill.items.map((item, idx) => {
                        const isItemAlreadyRefunded = !!item.isRefunded;
                        const isChecked = !!selectedRefundItems[item.id];
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isItemAlreadyRefunded ? 'bg-rose-50/40 text-slate-400' : ''}`}>
                            <td className="p-3 text-center">{idx + 1}</td>
                            <td className="p-3 font-medium">
                              <span className={isItemAlreadyRefunded ? 'line-through text-slate-400' : 'text-slate-800'}>
                                {item.serviceName}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono">Rs. {item.price.toFixed(2)}</td>
                            <td className="p-3 text-center font-mono">{item.quantity}</td>
                            <td className="p-3 text-right font-mono">Rs. {item.total.toFixed(2)}</td>
                            <td className="p-3 text-center">
                              {isItemAlreadyRefunded ? (
                                <span className="inline-flex px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold rounded">
                                  Refunded
                                </span>
                              ) : (
                                <span className="inline-flex px-1.5 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {!isItemAlreadyRefunded ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleRefundItem(item.id)}
                                  className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  disabled
                                  checked
                                  className="w-4.5 h-4.5 text-slate-300 border-slate-200 rounded cursor-not-allowed opacity-40"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund Calculations Summary */}
              {refundCalculations.subTotal > 0 && (
                <div className="bg-teal-50/50 border border-teal-100 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>छानिएका सेवाहरूको उप-जम्मा (Selected Services Total):</span>
                    <span className="font-mono">Rs. {refundCalculations.subTotal.toFixed(2)}</span>
                  </div>
                  {refundCalculations.discount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>छुट कट्टी समायोजन (Pro-rated Discount adjustment):</span>
                      <span className="font-mono text-rose-600">- Rs. {refundCalculations.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-teal-900 border-t border-teal-100 pt-2">
                    <span className="font-nepali">फिर्ता गरिने खुद रकम (Net Refund Amount to Return):</span>
                    <span className="font-mono text-base text-teal-700">Rs. {refundCalculations.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Reason for Refund */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 font-nepali">
                  फिर्ता गर्नुको कारण / कैफियत (Remarks / Reason for Refund) *
                </label>
                <textarea
                  value={refundRemarks}
                  onChange={(e) => setRefundRemarks(e.target.value)}
                  placeholder="कृपया रकम फिर्ता गर्नुको कारण लेख्नुहोस् (उदा: बिरामीले सेवा नलिने भएको, दोहोरो बिलिङ भएको आदि)..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[60px]"
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRefundingBill(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-600 transition-all font-nepali"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button
                type="button"
                disabled={refundCalculations.subTotal === 0 || !refundRemarks.trim()}
                onClick={handleProcessRefund}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-nepali"
              >
                <RotateCcw size={16} />
                रकम फिर्ता गर्नुहोस् (Process Refund)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Online Report Portal Modal */}
      {showReportPortal && (
        <PatientReportPortal
          billingRecords={billingRecords}
          labReports={labReports}
          opdRecords={opdRecords}
          xrayRecords={xrayRecords}
          usgRecords={usgRecords}
          ecgRecords={ecgRecords}
          dispensaryRecords={dispensaryRecords}
          serviceSeekerRecords={serviceSeekerRecords}
          generalSettings={generalSettings}
          isOpen={showReportPortal}
          onClose={() => setShowReportPortal(false)}
        />
      )}
    </div>
  );
};
