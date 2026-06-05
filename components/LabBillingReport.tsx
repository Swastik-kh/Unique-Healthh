import React, { useState, useMemo } from 'react';
import { Printer, FileSpreadsheet, Search, Filter, Calendar, ChevronDown, CheckCheck, Loader2, Landmark } from 'lucide-react';
import { BillingRecord, OrganizationSettings, User, ServiceItem, AmbulanceRecord } from '../types';
import { FISCAL_YEARS } from '../constants';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { LogoDisplay } from './LogoDisplay';

interface LabBillingReportProps {
  billingRecords: BillingRecord[];
  ambulanceRecords?: AmbulanceRecord[];
  currentFiscalYear: string;
  generalSettings: OrganizationSettings;
  currentUser?: User | null;
  users?: User[];
  serviceItems?: ServiceItem[];
}

const NEPALI_MONTH_OPTIONS = [
  { value: '01', label: 'बैशाख (Baishakh)' },
  { value: '02', label: 'जेठ (Jestha)' },
  { value: '03', label: 'असार (Ashad)' },
  { value: '04', label: 'साउन (Shrawan)' },
  { value: '05', label: 'भदौ (Bhadra)' },
  { value: '06', label: 'असोज (Ashwin)' },
  { value: '07', label: 'कार्तिक (Kartik)' },
  { value: '08', label: 'मंसिर (Mangsir)' },
  { value: '09', label: 'पुष (Poush)' },
  { value: '10', label: 'माघ (Magh)' },
  { value: '11', label: 'फागुन (Falgun)' },
  { value: '12', label: 'चैत्र (Chaitra)' },
];

const NEPALI_MONTH_NAMES = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'
];

export const LabBillingReport: React.FC<LabBillingReportProps> = ({
  billingRecords = [],
  ambulanceRecords = [],
  currentFiscalYear,
  generalSettings,
  currentUser,
  users = [],
  serviceItems = [],
}) => {
  // Determine current Nepali state
  const curNepaliDate = useMemo(() => {
    try {
      return new NepaliDate();
    } catch (e) {
      return null;
    }
  }, []);

  const preparerName = currentUser?.fullName || currentUser?.username || '-';
  const preparerDesignation = currentUser?.designation || '-';

  const adminUser = useMemo(() => {
    if (!users || users.length === 0) return null;
    // Find admin for current organization first
    const orgAdmin = users.find(u => (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') && u.organizationName === currentUser?.organizationName);
    if (orgAdmin) return orgAdmin;

    // Fallback to any ADMIN
    return users.find(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') || null;
  }, [users, currentUser]);

  const approverName = adminUser?.fullName || adminUser?.username || 'प्रशासक (Administrator)';
  const approverDesignation = adminUser?.designation || 'कार्यालय प्रमुख';

  const defaultMonth = useMemo(() => {
    if (curNepaliDate) {
      const m = curNepaliDate.getMonth() + 1;
      return m < 10 ? `0${m}` : `${m}`;
    }
    return '12'; // default to Chaitra
  }, [curNepaliDate]);

  // Filters state
  const [reportSource, setReportSource] = useState<'Sewa' | 'Ambulance'>('Sewa');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentFiscalYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [billingType, setBillingType] = useState<'All' | 'Direct' | 'Regular'>('Direct');
  const [selectedService, setSelectedService] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [useNepaliNumerals, setUseNepaliNumerals] = useState<boolean>(true);

  // Compute parent-child relationships and grouped options for service dropdown
  const testSubRelations = useMemo(() => {
    const parentMap = new Map<string, string>(); // child lower -> parent original
    const childrenMap = new Map<string, string[]>(); // parent original -> child originals (trimmed)
    const mainList: string[] = [];
    
    // Process serviceItems to extract parent/child relationships
    serviceItems.forEach(item => {
      const parentName = item.serviceName.trim();
      if (item.subTests && item.subTests.length > 0) {
        if (!mainList.includes(parentName)) {
          mainList.push(parentName);
        }
        const children = item.subTests.map(st => st.testName.trim());
        childrenMap.set(parentName, children);
        children.forEach(c => {
          parentMap.set(c.toLowerCase(), parentName);
        });
      }
    });

    // Extract all unique items ever billed in the system
    const billedSet = new Set<string>();
    billingRecords.forEach(record => {
      record.items?.forEach(item => {
        if (item.serviceName) {
          billedSet.add(item.serviceName.trim());
        }
      });
    });

    // Sort parent names so they display alphabetically
    const sortedMain = mainList.sort((a, b) => a.localeCompare(b));

    // For individual and sub-tests, we collect anything in billedSet or we collect child tests.
    // We prevent duplicate entries under individual lists if they are already parent groups.
    const individualSet = new Set<string>();
    
    // Add all from billedSet
    billedSet.forEach(s => {
      if (!childrenMap.has(s)) {
        individualSet.add(s);
      }
    });

    // Add any sub-tests or other items from serviceItems in database that are not packages
    serviceItems.forEach(item => {
      if (item.subTests && item.subTests.length > 0) {
        item.subTests.forEach(st => {
          individualSet.add(st.testName.trim());
        });
      } else {
        individualSet.add(item.serviceName.trim());
      }
    });

    const sortedIndividual = Array.from(individualSet).sort((a, b) => a.localeCompare(b));

    return { 
      parentOfService: parentMap, 
      childrenOfParent: childrenMap, 
      mainServices: sortedMain, 
      individualAndSubServices: sortedIndividual 
    };
  }, [serviceItems, serviceItems]);

  // Helper to get the gross amount for selected service in a record (before flat discount)
  const getRecordGrossAmountForSelectedService = (record: BillingRecord): number => {
    if (selectedService === 'All') {
      return record.subTotal || 0;
    }

    const selServiceLower = selectedService.toLowerCase().trim();
    let totalAmt = 0;

    record.items?.forEach((item) => {
      const itemLower = (item.serviceName || '').toLowerCase().trim();

      // A: Direct match
      if (itemLower === selServiceLower) {
        totalAmt += item.total || 0;
        return;
      }

      // B: Parent-to-Child match (We selected a parent package e.g. "CBC", item in bill is e.g. "HB")
      if (testSubRelations.childrenOfParent.has(selectedService)) {
        const children = testSubRelations.childrenOfParent.get(selectedService) || [];
        if (children.some(child => child.toLowerCase().trim() === itemLower)) {
          totalAmt += item.total || 0;
          return;
        }
      }

      // C: Child-to-Parent match (We selected a subtest e.g. "HB", item in bill is e.g. "CBC")
      const parentName = testSubRelations.parentOfService.get(itemLower);
      if (parentName && parentName.toLowerCase().trim() === selServiceLower) {
        // Look up standalone or subtest rate
        const parentServiceItem = serviceItems.find(si => si.serviceName.toLowerCase().trim() === itemLower);
        const subTestObj = parentServiceItem?.subTests?.find(st => st.testName.toLowerCase().trim() === selServiceLower);
        if (subTestObj && typeof subTestObj.price === 'number') {
          totalAmt += (subTestObj.price * (item.quantity || 1));
        } else {
          // Fallback if not specified: use parent item total
          totalAmt += item.total || 0;
        }
      }
    });

    return totalAmt;
  };

  // Helper to get the pro-rated discount for a selected service
  const getRecordDiscountForSelectedService = (record: BillingRecord): number => {
    const totalDiscount = record.discount || 0;
    if (totalDiscount <= 0) return 0;
    
    // Pro-rate the discount based on the gross portion of the selected service
    const grossPortion = getRecordGrossAmountForSelectedService(record);
    const billSubTotal = record.subTotal || 1;
    
    return (grossPortion / billSubTotal) * totalDiscount;
  };

  // Dynamic price calculation depending on the selected test or sub-test (Net amount)
  const getRecordAmountForSelectedService = (record: BillingRecord): number => {
    if (selectedService === 'All') {
      return record.grandTotal || 0;
    }
    
    const grossAmt = getRecordGrossAmountForSelectedService(record);
    const discountPortion = getRecordDiscountForSelectedService(record);
    
    return grossAmt - discountPortion;
  };
  
  // Custom wording for header
  const initialCustomTitle = useMemo(() => {
    const monthName = NEPALI_MONTH_NAMES[parseInt(selectedMonth) - 1] || 'चैत्र';
    const sourceLabel = reportSource === 'Sewa' ? 'सेवा बिलिङ' : 'एम्बुलेन्स सेवा';
    return `आ.व. ${selectedFiscalYear} ${monthName} महिनाको ${sourceLabel} आय विवरण`;
  }, [selectedFiscalYear, selectedMonth, reportSource]);

  const [reportTitleCustom, setReportTitleCustom] = useState<string>('');
  const activeReportTitle = reportTitleCustom || initialCustomTitle;

  // Sync custom title suggestion when month, fiscal year or reportSource changes
  React.useEffect(() => {
    const monthName = NEPALI_MONTH_NAMES[parseInt(selectedMonth) - 1] || 'चैत्र';
    const sourceLabel = reportSource === 'Sewa' ? 'सेवा बिलिङ' : 'एम्बुलेन्स सेवा';
    setReportTitleCustom(`आ.व. ${selectedFiscalYear} ${monthName} महिनाको ${sourceLabel} आय विवरण`);
  }, [selectedFiscalYear, selectedMonth, reportSource]);

  // Translate numeric helper
  const toNepaliDigits = (num: number | string): string => {
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return num.toString().replace(/[0-9]/g, (match) => nepaliDigits[parseInt(match)]);
  };

  const formatNumberValue = (num: number | string): string => {
    if (useNepaliNumerals) {
      return toNepaliDigits(num.toString());
    }
    return num.toString();
  };

  const formatRawDateToNepaliUi = (rawDate: string): string => {
    // rawDate is normally stored in YYYY-MM-DD or YYYY/MM/DD
    if (!rawDate) return '-';
    const parts = rawDate.split(/[-/]/);
    if (parts.length === 3) {
      const yr = parts[0];
      const mo = parseInt(parts[1]).toString();
      const dy = parseInt(parts[2]).toString();
      const output = `${dy}/${mo}/${yr}`;
      return useNepaliNumerals ? toNepaliDigits(output) : output;
    }
    return useNepaliNumerals ? toNepaliDigits(rawDate) : rawDate;
  };

  // Filtered Billing Records
  const filteredRecords = useMemo(() => {
    return billingRecords.filter((record) => {
      // 1. Fiscal Year Match (Check lowercase/trimmed comparisons)
      const fyMatch = record.fiscalYear?.trim() === selectedFiscalYear?.trim();
      if (!fyMatch) return false;

      // 2. Month Match
      const dateStr = record.billDate || '';
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length < 2) return false;
      const recordMonth = dateParts[1]; // e.g. "12" or "02"
      
      const targetMonthParsed = parseInt(selectedMonth);
      const recordMonthParsed = parseInt(recordMonth);
      if (targetMonthParsed !== recordMonthParsed) return false;

      // 3. Billing Type Filter
      const isDirect = !!record.isDirectBilling || 
                       record.serviceSeekerId?.startsWith('DIR-') || 
                       record.invoiceNumber?.startsWith('DB-');

      if (billingType === 'Direct') {
        if (!isDirect) return false;
      } else if (billingType === 'Regular') {
        if (isDirect) return false;
      }

      // 4. Search Query Match
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const pName = record.patientName?.toLowerCase() || '';
        const invNo = record.invoiceNumber?.toLowerCase() || '';
        const services = record.items?.map(i => i.serviceName.toLowerCase()).join(' ') || '';
        if (!pName.includes(query) && !invNo.includes(query) && !services.includes(query)) {
          return false;
        }
      }

      // 5. Individual Service/Test filter match with smart bidirectional mapping (e.g. CBC / HB / HCV)
      if (selectedService !== 'All') {
        const selServiceLower = selectedService.toLowerCase().trim();
        const hasService = record.items?.some((item) => {
          const itemLower = (item.serviceName || '').toLowerCase().trim();
          
          // A: Direct match
          if (itemLower === selServiceLower) return true;

          // B: Parent-to-Child match: If we selected CBC (parent), matches if the billed item is a subtest (e.g., HB)
          if (testSubRelations.childrenOfParent.has(selectedService)) {
            const children = testSubRelations.childrenOfParent.get(selectedService) || [];
            if (children.some(child => child.toLowerCase().trim() === itemLower)) {
              return true;
            }
          }

          // C: Child-to-Parent match: If we selected HB (sub-test), matches if the billed item is CBC (parent package)
          const parentName = testSubRelations.parentOfService.get(itemLower);
          if (parentName && parentName.toLowerCase().trim() === selServiceLower) {
            return true;
          }

          return false;
        });

        if (!hasService) return false;
      }

      return true;
    }).sort((a,b) => {
      // Sort by invoice number or date ascending for cleaner reporting
      return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
    });
  }, [billingRecords, selectedFiscalYear, selectedMonth, billingType, searchQuery, selectedService, testSubRelations]);

  // Filtered Ambulance Records
  const filteredAmbulanceRecords = useMemo(() => {
    return (ambulanceRecords || []).filter((record) => {
      // 1. Fiscal Year Match
      const fyMatch = record.fiscalYear?.trim() === selectedFiscalYear?.trim();
      if (!fyMatch) return false;

      // 2. Month Match
      const dateStr = record.dateBs || '';
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length < 2) return false;
      const recordMonth = dateParts[1];
      
      const targetMonthParsed = parseInt(selectedMonth);
      const recordMonthParsed = parseInt(recordMonth);
      if (targetMonthParsed !== recordMonthParsed) return false;

      // 3. Search Query Match
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const pName = record.patientName?.toLowerCase() || '';
        const drName = record.driverName?.toLowerCase() || '';
        const ambNo = record.ambulanceNo?.toLowerCase() || '';
        const dest = record.destination?.toLowerCase() || '';
        const start = record.startLocation?.toLowerCase() || '';
        if (!pName.includes(query) && !drName.includes(query) && !ambNo.includes(query) && !dest.includes(query) && !start.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      return (a.dateBs || '').localeCompare(b.dateBs || '');
    });
  }, [ambulanceRecords, selectedFiscalYear, selectedMonth, searchQuery]);

  // Totals calculations
  const totalAmountSum = useMemo(() => {
    if (reportSource === 'Sewa') {
      return filteredRecords.reduce((sum, r) => sum + getRecordAmountForSelectedService(r), 0);
    } else {
      return filteredAmbulanceRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0);
    }
  }, [reportSource, filteredRecords, filteredAmbulanceRecords, selectedService, serviceItems, testSubRelations]);

  const totalAmbulanceChargedSum = useMemo(() => {
    return filteredAmbulanceRecords.reduce((sum, r) => sum + (r.amountCharged || 0), 0);
  }, [filteredAmbulanceRecords]);

  // Export to CSV function
  const handleExportCSV = () => {
    if (reportSource === 'Sewa') {
      if (filteredRecords.length === 0) {
        alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
        return;
      }

      const headers = ["सि.न. (S.N.)", "सेवाग्राहीको नामथर (Seeker Name)", "विल नं. (Bill No.)", "मिति (Date)", "सेवाहरूको विवरण (Services)", "रकम (Amount)", "कैफियत (Remarks)"];
      
      const rows = filteredRecords.map((r, idx) => {
        const serial = (idx + 1).toString();
        const patient = r.patientName || '-';
        const billNo = r.invoiceNumber || '-';
        const date = r.billDate || '-';
        const services = selectedService !== 'All' ? selectedService : (r.items?.map(i => i.serviceName).join(', ') || '-');
        const amt = getRecordAmountForSelectedService(r).toString();
        const baseR = r.remarks || '';
        const dVal = getRecordDiscountForSelectedService(r);
        const dNote = dVal > 0 ? `रु. ${dVal.toFixed(2)} छुट` : '';
        const remarks = [baseR, dNote].filter(Boolean).join(', ') || '-';
        
        return [serial, patient, billNo, date, services, amt, remarks];
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Service_Billing_Report_${selectedFiscalYear}_Month_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredAmbulanceRecords.length === 0) {
        alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
        return;
      }

      const headers = ["सि.न. (S.N.)", "सेवाग्राहीको नामथर (Seeker Name)", "एम्बुलेन्स नं (Ambulance No)", "चालक (Driver)", "मिति (Date)", "प्रस्थान विन्दु (From)", "गन्तव्य विन्दु (To)", "दुरी (Distance KM)", "कूल शुल्क (Total Charged)", "प्राप्त रकम (Received Amount)", "कैफियत (Remarks)"];
      
      const rows = filteredAmbulanceRecords.map((r, idx) => {
        const serial = (idx + 1).toString();
        const patient = r.patientName || '-';
        const ambNo = r.ambulanceNo || '-';
        const driver = r.driverName || '-';
        const date = r.dateBs || '-';
        const fromLoc = r.startLocation || '-';
        const toLoc = r.destination || '-';
        const dist = r.distanceKm ? r.distanceKm.toString() : '-';
        const amtCharged = r.amountCharged ? r.amountCharged.toString() : '0';
        const amtRec = r.receivedAmount ? r.receivedAmount.toString() : '0';
        
        const dueAmt = (r.amountCharged || 0) - (r.receivedAmount || 0);
        const dueText = dueAmt > 0 ? `बाँकी: रु. ${dueAmt.toFixed(2)}` : '';
        const baseRemarks = r.remarks || '';
        const remarksCombined = [baseRemarks, dueText].filter(Boolean).join(', ') || '-';
        
        return [serial, patient, ambNo, driver, date, fromLoc, toLoc, dist, amtCharged, amtRec, remarksCombined];
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Ambulance_Sewa_Report_${selectedFiscalYear}_Month_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Title Panel - Hide on print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="text-emerald-600" size={24} />
            बिलिङ रिपोर्ट (Billing Report)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            प्रत्यक्ष र नियमित बिलहरूको मासिक तथा वार्षिक आय विवरण रिपोर्ट।
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Numerals */}
          <button
            onClick={() => setUseNepaliNumerals(!useNepaliNumerals)}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all outline-none duration-200 ${
              useNepaliNumerals 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {useNepaliNumerals ? <CheckCheck size={14} /> : null}
            नेपाली अंकमा (Nepali Numerals)
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white transition-all duration-200 flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} className="text-normal text-emerald-600" />
            CSV मा निर्यात
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5"
          >
            <Printer size={15} />
            प्रिन्ट गर्नुहोस् (Print)
          </button>
        </div>
      </div>

      {/* Filter panel - Hide on print */}
      <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end print:hidden">
        <div>
          <label className="block text-xs font-bold text-slate-100 mb-1.5 bg-emerald-700 text-white px-2 py-0.5 rounded-sm">रिपोर्ट प्रकार (Report Type)</label>
          <div className="relative">
            <select
              value={reportSource}
              onChange={(e) => setReportSource(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-white border-2 border-emerald-500 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer text-emerald-800"
            >
              <option value="Sewa">सेवा बिलिङ (Sewa Billing)</option>
              <option value="Ambulance">एम्बुलेन्स सेवा (Ambulance Sewa)</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">आर्थिक वर्ष (Fiscal Year)</label>
          <div className="relative">
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer"
            >
              {FISCAL_YEARS.map((fy) => (
                <option key={fy.id} value={fy.value}>
                  {fy.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">नेपाली महिना (Nepali Month)</label>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer"
            >
              {NEPALI_MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {reportSource === 'Sewa' ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">बिलिङ वर्ग (Billing Category)</label>
              <div className="relative">
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="All">सबै बिलिङहरू (All Bills)</option>
                  <option value="Direct">प्रत्यक्ष मात्र (Direct Billing Only)</option>
                  <option value="Regular">नियमित सेवा मात्र (Regular Booking Only)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">विशेष सेवा/टेस्ट (Specific Service/Test)</label>
              <div className="relative">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="All">सबै सेवा/टेस्टहरू (All Services/Tests)</option>
                  {testSubRelations.mainServices.length > 0 && (
                    <optgroup label="मुख्य टेस्ट प्याकेज/समूह (Main Test Packages)">
                      {testSubRelations.mainServices.map((srv) => (
                        <option key={`main-${srv}`} value={srv}>
                          {srv}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {testSubRelations.individualAndSubServices.length > 0 && (
                    <optgroup label="व्यक्तिगत टेस्ट / उप-परीक्षण (Individual & Subtests)">
                      {testSubRelations.individualAndSubServices.map((srv) => (
                        <option key={`indiv-${srv}`} value={srv}>
                          {srv}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </>
        ) : null}

        <div className={reportSource === 'Sewa' ? 'col-span-1' : 'sm:col-span-2'}>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">खोज्नुहोस् (Search Name/Details)</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={reportSource === 'Sewa' ? "नाम, विल नम्बर वा टेस्ट" : "नाम, चालक, नम्बर वा गन्तव्य"}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none pl-9"
            />
            <Search className="absolute left-2.5 top-3.5 text-slate-400" size={14} />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6 grid grid-cols-1 gap-2 border-t border-slate-200/80 pt-3.5 mt-2">
          <label className="block text-xs font-bold text-slate-600">रिपोर्टको मुख्य शीर्षक शब्द परिवर्तन वा संशोधन (Report Form Custom Headline Wordings)</label>
          <input
            type="text"
            value={reportTitleCustom}
            onChange={(e) => setReportTitleCustom(e.target.value)}
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl outline-none font-medium focus:ring-2 focus:ring-emerald-500"
            placeholder="उदा: आ.व. ०८२।८३ चैत्र महिनाको आय विवरण"
          />
        </div>
      </div>

      {/* Stats Summary Panel - Hide on print */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {reportSource === 'Sewa' ? 'जम्मा बिल संख्या (Total Invoices)' : 'जम्मा यात्रा संख्या (Total Trips)'}
          </p>
          <p className="text-2xl font-black mt-1 text-slate-800">
            {formatNumberValue(reportSource === 'Sewa' ? filteredRecords.length : filteredAmbulanceRecords.length)}
          </p>
        </div>

        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {reportSource === 'Sewa' ? 'जम्मा संकलित रकम (Total Collected)' : 'प्राप्त रकम (Total Received Amount)'}
          </p>
          <p className="text-2xl font-black mt-1 text-emerald-600">
            रु. {formatNumberValue(totalAmountSum.toFixed(2))}
          </p>
        </div>

        {reportSource === 'Sewa' ? (
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">बिल श्रेणी (Category Filters)</p>
            <p className="text-lg font-bold mt-1 text-slate-700">
              {billingType === 'All' ? 'सबै ल्याब बिलिङ' : billingType === 'Direct' ? 'प्रत्यक्ष बिल मात्र' : 'नियमित बिल मात्र'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">कुल चार्ज्ड रकम (Total Charged Amount)</p>
            <p className="text-2xl font-black mt-1 text-amber-600">
              रु. {formatNumberValue(totalAmbulanceChargedSum.toFixed(2))}
            </p>
          </div>
        )}
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-6 md:p-12 border border-slate-200 rounded-3xl shadow-xs print:shadow-none print:border-none print:p-0">
        
        {/* Government Style Header with Logo */}
        <div className="relative flex flex-col items-center mb-6 border-b-2 border-slate-950 pb-4">
          <div className="w-full grid grid-cols-[100px_1fr_100px] items-center gap-4">
            {/* Left side: Logo */}
            <div className="flex justify-start">
              <LogoDisplay settings={generalSettings} width={75} height={75} />
            </div>

            {/* Center: Headings 1, 2, 3, 4 */}
            <div className="text-center space-y-0.5">
              <h1 className="text-lg font-bold font-nepali tracking-wide leading-tight text-slate-950">
                {generalSettings?.orgNameNepali || 'चौदण्डीगढी नगरपालिका'}
              </h1>
              {generalSettings?.subTitleNepali && (
                <p className="text-xs font-bold font-nepali leading-tight text-slate-800">
                  {generalSettings.subTitleNepali}
                </p>
              )}
              {generalSettings?.subTitleNepali2 && (
                <p className="text-xs font-bold font-nepali leading-tight text-slate-800">
                  {generalSettings.subTitleNepali2}
                </p>
              )}
              {generalSettings?.subTitleNepali3 && (
                <p className="text-xs font-bold font-nepali leading-tight text-slate-800">
                  {generalSettings.subTitleNepali3}
                </p>
              )}
            </div>

            {/* Right side spacer to keep center balanced */}
            <div className="w-[100px]"></div>
          </div>
          
          <h2 className="text-base font-black font-nepali tracking-wider text-slate-950 mt-4 underline decoration-double decoration-1 underline-offset-4">
            {reportSource === 'Sewa' ? 'ल्याब / अन्य स्वास्थ्य सेवा' : 'एम्बुलेन्स सेवा'}
          </h2>
          <p className="text-sm font-bold font-nepali text-slate-800 mt-2.5">
            {activeReportTitle}
          </p>
        </div>

        {/* Report Spreadsheet Table */}
        <div className="overflow-x-auto">
          {reportSource === 'Sewa' ? (
            <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">
                    सि.न.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[150px]">
                    सेवाग्राहीको नामथर
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-24">
                    विल नं.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-28">
                    मिति
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali">
                    सेवाहरूको विवरण
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-28">
                    रकम
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali w-28">
                    कैफियत
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record, index) => {
                    const sNoStr = formatNumberValue(index + 1);
                    const clientName = record.patientName || '-';
                    const cleanBillNo = (record.invoiceNumber || '').replace('DB-', '').replace('DIR-', '');
                    const displayBillNo = useNepaliNumerals ? toNepaliDigits(cleanBillNo) : cleanBillNo;
                    const displayDate = formatRawDateToNepaliUi(record.billDate);
                    const servicesList = selectedService !== 'All' ? selectedService : (record.items?.map((item) => item.serviceName).join(', ') || '-');
                    const priceTotal = getRecordAmountForSelectedService(record);
                    const formattedPrice = formatNumberValue(priceTotal.toFixed(2));
                    const baseRemarks = record.remarks || '';
                    const discountVal = getRecordDiscountForSelectedService(record);
                    const discountNote = discountVal > 0 
                      ? `रु. ${useNepaliNumerals ? toNepaliDigits(discountVal.toFixed(2)) : discountVal.toFixed(2)} छुट` 
                      : '';
                    const clientRemarks = [baseRemarks, discountNote].filter(Boolean).join(', ') || '-';

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="border border-slate-950 p-2 text-center font-bold">
                          {sNoStr}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {clientName}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-medium">
                          {displayBillNo}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-medium">
                          {displayDate}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {servicesList}
                        </td>
                        <td className="border border-slate-950 p-2 text-right font-bold font-mono">
                          {formattedPrice}
                        </td>
                        <td className="border border-slate-950 p-2 text-slate-700 italic select-all">
                          {clientRemarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-slate-950 p-10 text-center text-slate-400 italic">
                      चयन गरिएको महिना र फिल्टर अनुसार कुनै आय विवरण रेकर्ड भेटिएन।
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">
                    कुल जम्मा रकम (Grand Total):
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmountSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">
                    सि.न.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[150px]">
                    सेवाग्राहीको नामथर
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-32">
                    एम्बुलेन्स नं / चालक
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-28">
                    मिति
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali">
                    यात्रा विवरण (From ➔ To)
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-24">
                    कूल शुल्क
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-24">
                    प्राप्त रकम
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali w-24">
                    कैफियत
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAmbulanceRecords.length > 0 ? (
                  filteredAmbulanceRecords.map((record, index) => {
                    const sNoStr = formatNumberValue(index + 1);
                    const clientName = record.patientName || '-';
                    const driverDetail = `${record.ambulanceNo || '-'} / ${record.driverName || '-'}`;
                    const displayDate = formatRawDateToNepaliUi(record.dateBs);
                    const travelDetail = `${record.startLocation || '-'} ➔ ${record.destination || '-'} (${record.distanceKm || 0} KM)`;
                    const formattedCharged = formatNumberValue((record.amountCharged || 0).toFixed(2));
                    const formattedReceived = formatNumberValue((record.receivedAmount || 0).toFixed(2));
                    const dueAmt = (record.amountCharged || 0) - (record.receivedAmount || 0);
                    const dueText = dueAmt > 0 
                      ? `बाँकी: रु. ${useNepaliNumerals ? toNepaliDigits(dueAmt.toFixed(2)) : dueAmt.toFixed(2)}` 
                      : '';
                    const baseRemarks = record.remarks || '';
                    const clientRemarks = [baseRemarks, dueText].filter(Boolean).join(', ') || '-';

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="border border-slate-950 p-2 text-center font-bold">
                          {sNoStr}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {clientName}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-medium">
                          {driverDetail}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-medium">
                          {displayDate}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium text-xs">
                          {travelDetail}
                        </td>
                        <td className="border border-slate-950 p-2 text-right font-bold font-mono">
                          {formattedCharged}
                        </td>
                        <td className="border border-slate-950 p-2 text-right font-bold font-mono">
                          {formattedReceived}
                        </td>
                        <td className="border border-slate-950 p-2 text-slate-700 italic select-all">
                          {clientRemarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="border border-slate-950 p-10 text-center text-slate-400 italic">
                      चयन गरिएको महिना र फिल्टर अनुसार कुनै एम्बुलेन्स सेवा रेकर्ड भेटिएन।
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">
                    कुल जम्मा रकम (Grand Total):
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmbulanceChargedSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmountSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-20 pt-10 text-xs md:text-sm">
          {/* Tayar Garne (Left) */}
          <div className="text-center w-64 pb-2 border-t-2 border-slate-900 pt-3">
            <p className="font-bold text-slate-900 font-nepali text-sm">{preparerName}</p>
            <p className="text-xs text-slate-600 font-nepali mt-0.5">{preparerDesignation}</p>
            <p className="text-xs font-bold font-nepali text-slate-800 mt-2">तयार गर्ने</p>
            <p className="text-[10px] text-slate-500 mt-1">मिति: {useNepaliNumerals && curNepaliDate ? toNepaliDigits(curNepaliDate.format('YYYY/MM/DD')) : (curNepaliDate?.format('YYYY-MM-DD') || '-')}</p>
          </div>

          {/* Pramanit Garne (Right) */}
          <div className="text-center w-64 pb-2 border-t-2 border-slate-900 pt-3">
            <p className="font-bold text-slate-900 font-nepali text-sm">{approverName}</p>
            <p className="text-xs text-slate-600 font-nepali mt-0.5">{approverDesignation}</p>
            <p className="text-xs font-bold font-nepali text-slate-800 mt-2">प्रमाणित गर्ने / स्वीकृत गर्ने</p>
            <p className="text-[10px] text-slate-500 mt-1">मिति: {useNepaliNumerals && curNepaliDate ? toNepaliDigits(curNepaliDate.format('YYYY/MM/DD')) : (curNepaliDate?.format('YYYY-MM-DD') || '-')}</p>
          </div>
        </div>

      </div>
    </div>
  );
};
