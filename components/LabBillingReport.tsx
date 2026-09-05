import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Printer, FileSpreadsheet, Search, Filter, Calendar, ChevronDown, CheckCheck, Loader2, Landmark, AlertCircle, Plus, Trash2, GripVertical, ChevronUp, RotateCcw } from 'lucide-react';
import { BillingRecord, OrganizationSettings, User, ServiceItem, AmbulanceRecord, AmbulanceExpenseRecord, ServiceSeekerRecord } from '../types';
import { FISCAL_YEARS } from '../constants';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { LogoDisplay } from './LogoDisplay';

const COMMON_LAB_KWS = new Set([
  'cbc', 'complete blood count', 'hb', 'hemoglobin', 'wbc', 'total count', 'differential count', 'dc', 'tc', 'platelet', 'platelets', 'esr', 'blood group', 'blood grouping', 'rh factor', 'sugar', 'blood sugar', 'rbs', 'fbs', 'ppbs', 'urine', 'urine me', 'urine re', 'urine re/me', 'urine re & me', 'stool', 'stool me', 'stool re', 'lipid profile', 'cholesterol', 'tg', 'ldl', 'hdl', 'vldl', 'urea', 'blood urea', 'creatinine', 'serum creatinine', 'uric acid', 'serum uric acid', 'lft', 'liver function test', 'rft', 'renal function test', 'bilirubin', 's. bilirubin', 'serum bilirubin', 'sgot', 'sgpt', 'alkaline phosphatase', 'widal', 'widal test', 'typhoid', 'malaria', 'hcv', 'hbsag', 'hiv', 'hiv 1/2', 'calcium', 's. calcium', 'serum calcium', 'pregnancy test', 'upt', 'semen', 'semen analysis', 'mantoux', 'mantoux test', 'mt', 'crp', 'c-reactive protein', 'ra factor', 'aso', 'aso titer', 'tft', 'thyroid function test', 't3', 't4', 'tsh', 'vdrl', 'hba1c', 'urine sugar', 'urine protein', 'albumin', 'urine albumin', 'ketone', 'sodium', 'potassium', 'chloride', 'electrolytes', 's. electrolytes', 'culture', 'urine culture', 'blood culture', 'stool culture', 'gram stain', 'afb', 'afb stain'
]);

const normalizeCategory = (cat: string): string => {
  if (!cat) return '';
  const c = cat.trim().toLowerCase();
  
  // Normalized mappings using includes for better robustness
  if (['lab', 'laboratory', 'prayogsala', 'ल्याब', 'प्रयोगशाला'].some(k => c.includes(k))) return 'Lab';
  if (['x-ray', 'xray', 'एक्स-रे', 'एक्सरे'].some(k => c.includes(k))) return 'X-Ray';
  if (['usg', 'video x-ray', 'भिडियो', 'ultrasound'].some(k => c.includes(k))) return 'USG';
  if (['ecg', 'ईसीजी', 'मुटुको जाँच', 'electrocardiogram'].some(k => c.includes(k))) return 'ECG';
  if (['opd', 'ओपिडी', 'ticket', 'टिकट', 'दस्तुर', 'दर्ता'].some(k => c.includes(k))) return 'OPD';
  if (['emergency', 'इमर्जेन्सी', 'आकस्मिक'].some(k => c.includes(k))) return 'Emergency';
  if (['pharmacy', 'dispensary', 'फार्मेसी', 'डिस्पेन्सरी'].some(k => c.includes(k))) return 'Pharmacy';
  if (['physiotherapy', 'फिजियोथेरापी'].some(k => c.includes(k))) return 'Physiotherapy';
  if (['tb', 'क्षयरोग', 'tuberculosis', 'dots', 'afb'].some(k => c.includes(k))) return 'TB';
  if (['leprosy', 'कुष्ठरोग'].some(k => c.includes(k))) return 'Leprosy';
  
  return cat.trim();
};

interface LabBillingReportProps {
  billingRecords: BillingRecord[];
  ambulanceRecords?: AmbulanceRecord[];
  ambulanceExpenseRecords?: AmbulanceExpenseRecord[];
  currentFiscalYear: string;
  generalSettings: OrganizationSettings;
  currentUser?: User | null;
  users?: User[];
  serviceItems?: ServiceItem[];
  serviceSeekerRecords?: ServiceSeekerRecord[];
}

const NEPALI_MONTH_OPTIONS = [
  { value: 'all', label: 'सबै महिना (All Months)' },
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
  ambulanceExpenseRecords = [],
  currentFiscalYear,
  generalSettings,
  currentUser,
  users = [],
  serviceItems = [],
  serviceSeekerRecords = [],
}) => {
  // Determine current Nepali state
  const curNepaliDate = useMemo(() => {
    try {
      return new NepaliDate();
    } catch (e) {
      return null;
    }
  }, []);

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
  const [reportSource, setReportSource] = useState<'Sewa' | 'Ambulance' | 'Protsahan' | 'AmbulanceProtsahan'>('Sewa');
  const [ambulanceReportType, setAmbulanceReportType] = useState<'income' | 'expense'>('income');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(currentFiscalYear);

  React.useEffect(() => {
    setSelectedFiscalYear(currentFiscalYear);
  }, [currentFiscalYear]);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [billingType, setBillingType] = useState<'All' | 'Direct' | 'Regular'>('Direct');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAmbulanceExpenseCategory, setSelectedAmbulanceExpenseCategory] = useState<string>('All');
  const [selectedAmbulanceDriver, setSelectedAmbulanceDriver] = useState<string>('All');
  const [selectedService, setSelectedService] = useState<string>('All');
  const [selectedReferredBy, setSelectedReferredBy] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [useNepaliNumerals, setUseNepaliNumerals] = useState<boolean>(true);

  // Ambulance Driver Incentive percentage state
  const [ambulanceDriverIncentivePercent, setAmbulanceDriverIncentivePercent] = useState<number>(() => {
    const saved = localStorage.getItem('protsahan_ambulance_driver_percent');
    return saved ? Number(saved) : 15;
  });
  const [isDriverSettingsEditing, setIsDriverSettingsEditing] = useState<boolean>(false);
  const [tempDriverIncentivePercent, setTempDriverIncentivePercent] = useState<number>(15);

  const getRecordAgeGender = (record: BillingRecord) => {
    let age = record.age;
    let gender = record.gender;
    if (!age || !gender) {
      const seeker = serviceSeekerRecords.find(s => s.id === record.serviceSeekerId || s.uniquePatientId === record.serviceSeekerId);
      if (seeker) {
        if (!age) age = seeker.age;
        if (!gender) gender = seeker.gender;
      }
    }
    const ageStr = age ? formatNumberValue(age) : '';
    const genderStr = gender || '';
    if (ageStr && genderStr) return `${ageStr} / ${genderStr}`;
    return ageStr || genderStr || '-';
  };

  // Protsahan settings
  interface ProtsahanRecipient {
    id: string;
    nameNe: string;
    nameEn: string;
    sharePercent: number;
    isSystemReferrer?: boolean;
  }

  const [labIncentivePercent, setLabIncentivePercent] = useState<number>(() => {
    const saved = localStorage.getItem('protsahan_lab_incentive_percent');
    return saved ? Number(saved) : 10;
  });

  const [protsahanRecipients, setProtsahanRecipients] = useState<ProtsahanRecipient[]>(() => {
    const saved = localStorage.getItem('protsahan_recipients');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing protsahan_recipients", e);
      }
    }
    return [
      { id: 'referrer', nameNe: 'सिफारिसकर्ता', nameEn: 'Referrer', sharePercent: 40, isSystemReferrer: true },
      { id: 'lab_staff', nameNe: 'प्रयोगशालाकर्मी', nameEn: 'Lab Staff', sharePercent: 40 },
      { id: 'helper', nameNe: 'सहयोगी/सफाईकर्मी', nameEn: 'Helper/Cleaner', sharePercent: 20 }
    ];
  });

  const [isSettingsEditing, setIsSettingsEditing] = useState<boolean>(false);
  const [tempIncentivePercent, setTempIncentivePercent] = useState<number>(10);
  const [tempRecipients, setTempRecipients] = useState<ProtsahanRecipient[]>([]);

  // Drag and drop ordering for Referrer Summary table
  const [customReferrerOrder, setCustomReferrerOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lab_referrer_custom_order');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (customReferrerOrder.length > 0) {
        localStorage.setItem('lab_referrer_custom_order', JSON.stringify(customReferrerOrder));
      } else {
        localStorage.removeItem('lab_referrer_custom_order');
      }
    } catch (e) {
      console.error('Failed to save referrer custom order to localStorage', e);
    }
  }, [customReferrerOrder]);

  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  const handleSaveProtsahanSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const sum = tempRecipients.reduce((s, r) => s + r.sharePercent, 0);
    if (Math.abs(sum - 100) > 0.01) {
      alert("प्रोत्साहनका बाँडफाँड प्रतिशतहरूको जोड १००% हुनुपर्दछ। (Total share allocation must sum to exactly 100%)");
      return;
    }

    const hasReferrer = tempRecipients.some(r => r.isSystemReferrer);
    if (!hasReferrer) {
      alert("कम्तिमा एउटा सिफारिसकर्ता (Referrer) सिस्टम रेसिपिएन्ट हुनुपर्दछ।");
      return;
    }

    setLabIncentivePercent(tempIncentivePercent);
    setProtsahanRecipients(tempRecipients);

    localStorage.setItem('protsahan_lab_incentive_percent', String(tempIncentivePercent));
    localStorage.setItem('protsahan_recipients', JSON.stringify(tempRecipients));

    setIsSettingsEditing(false);
  };

  const preparerName = useMemo(() => {
      let userId: string | undefined;
      if (reportSource === 'Sewa') {
        userId = generalSettings.sewaBillingUserId;
      } else if (reportSource === 'Ambulance' || reportSource === 'AmbulanceProtsahan') {
        userId = generalSettings.ambulanceSewaUserId;
      }
      
      const assignedUser = users.find(u => u.id === userId);
      return assignedUser ? assignedUser.fullName : (currentUser?.fullName || currentUser?.username || '-');
  }, [reportSource, generalSettings, users, currentUser]);

  const preparerDesignation = useMemo(() => {
      let userId: string | undefined;
      if (reportSource === 'Sewa') {
        userId = generalSettings.sewaBillingUserId;
      } else if (reportSource === 'Ambulance' || reportSource === 'AmbulanceProtsahan') {
        userId = generalSettings.ambulanceSewaUserId;
      }
      
      const assignedUser = users.find(u => u.id === userId);
      return assignedUser ? assignedUser.designation : (currentUser?.designation || '-');
  }, [reportSource, generalSettings, users, currentUser]);

  // Map service name and sub-tests to their high-level category
  const serviceCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    serviceItems.forEach(item => {
      const cat = normalizeCategory(item.category);
      map.set(item.serviceName.trim().toLowerCase(), cat);
      if (item.subTests && item.subTests.length > 0) {
        item.subTests.forEach(sub => {
          map.set(sub.testName.trim().toLowerCase(), cat);
        });
      }
    });
    
    // Explicit mappings for registration/muldarta fees
    const virtualCategories = ['OPD', 'Emergency', 'IPD', 'Vaccination', 'Lab', 'X-Ray', 'USG', 'ECG', 'Pharmacy', 'Physiotherapy', 'TB', 'Leprosy', 'Other'];
    virtualCategories.forEach(cat => {
      map.set(`${cat.toLowerCase()} दर्ता शुल्क`, normalizeCategory(cat));
    });
    map.set('opd ticket', 'OPD');
    map.set('opd registration fee', 'OPD');
    map.set('emergency ticket', 'Emergency');
    
    return map;
  }, [serviceItems]);

  // Combine real billing records with virtual billing records created from Muldarta (ServiceSeekerRecord)
  const allBillingRecordsCombined = useMemo(() => {
    const virtualRecords: BillingRecord[] = (serviceSeekerRecords || [])
      .map(r => {
        const sType = r.serviceType || 'OPD';
        const serviceName = sType === 'OPD' ? 'OPD दर्ता शुल्क' : (sType === 'Emergency' ? 'Emergency दर्ता शुल्क' : `${sType} दर्ता शुल्क`);
        return {
          id: `muldarta-${r.id}`,
          fiscalYear: r.fiscalYear || currentFiscalYear,
          billDate: r.date || '',
          invoiceNumber: r.mulDartaNo ? `MD-${r.mulDartaNo}` : (r.registrationNumber ? `REG-${r.registrationNumber}` : `MD-${r.id.substring(0, 8)}`),
          serviceSeekerId: r.uniquePatientId || r.id,
          patientName: r.name,
          subTotal: r.serviceFee || 0,
          discount: 0,
          grandTotal: r.serviceFee || 0,
          paymentMode: 'Cash' as const,
          isDirectBilling: true,
          items: [
            {
              id: `item-${r.id}`,
              serviceName,
              price: r.serviceFee || 0,
              quantity: 1,
              total: r.serviceFee || 0
            }
          ]
        };
      });

    return [...billingRecords, ...virtualRecords];
  }, [billingRecords, serviceSeekerRecords, currentFiscalYear]);

  const hasSourceAccess = (source: 'Sewa' | 'Ambulance' | 'Protsahan' | 'AmbulanceProtsahan') => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    if (source === 'Protsahan') {
      return currentUser.allowedMenus?.includes('report_billing_sewa') || false;
    }
    if (source === 'AmbulanceProtsahan') {
      return currentUser.allowedMenus?.includes('report_billing_ambulance_driver') || false;
    }
    const key = source === 'Sewa' ? 'report_billing_sewa' : 'report_billing_ambulance';
    return currentUser.allowedMenus?.includes(key) || false;
  };

  const hasAnyBillingReportAccess = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return (
      currentUser.allowedMenus?.includes('report_billing_sewa') ||
      currentUser.allowedMenus?.includes('report_billing_ambulance') ||
      currentUser.allowedMenus?.includes('report_billing_ambulance_driver')
    );
  }, [currentUser]);

  // Adjust report source if current is not allowed
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      if (!hasSourceAccess(reportSource)) {
        const sources: ('Sewa' | 'Ambulance' | 'Protsahan' | 'AmbulanceProtsahan')[] = ['Sewa', 'Ambulance', 'Protsahan', 'AmbulanceProtsahan'];
        const firstAllowed = sources.find(s => hasSourceAccess(s));
        if (firstAllowed) {
          setReportSource(firstAllowed);
        }
      }
    }
  }, [currentUser, reportSource]);

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
    allBillingRecordsCombined.forEach(record => {
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
  }, [serviceItems, allBillingRecordsCombined]);

  // Robust, normalized helper to get category of any service or sub-test with keywords fallback
  const getServiceCategory = useCallback((serviceNameLower: string, categoryOnItem?: string): string => {
    const itemLower = serviceNameLower.trim().toLowerCase();
    
    // 1. Try mapping by service name first
    let itemCategory = serviceCategoryMap.get(itemLower);
    if (!itemCategory) {
      const parentName = testSubRelations.parentOfService.get(itemLower);
      if (parentName) {
        itemCategory = serviceCategoryMap.get(parentName.toLowerCase().trim());
      }
    }
    
    // 2. If no category found from map/parent, try falling back to category field on the item itself
    if (!itemCategory && categoryOnItem) {
      itemCategory = normalizeCategory(categoryOnItem);
    }
    
    if (!itemCategory) {
      if (
        COMMON_LAB_KWS.has(itemLower) || 
        itemLower.includes('exam') || 
        itemLower.includes('test') || 
        itemLower.includes('जाँच') || 
        itemLower.includes('रगत') || 
        itemLower.includes('पिसाब') || 
        itemLower.includes('दिशा') ||
        itemLower.includes('urine') ||
        itemLower.includes('blood') ||
        itemLower.includes('stool') ||
        itemLower.includes('sputum') ||
        itemLower.includes('culture') ||
        itemLower.includes('widal') ||
        itemLower.includes('typhoid') ||
        itemLower.includes('malaria') ||
        itemLower.includes('hbsag') ||
        itemLower.includes('hiv') ||
        itemLower.includes('pregnancy') ||
        itemLower.includes('upt')
      ) {
        itemCategory = 'Lab';
      } else if (itemLower.includes('xray') || itemLower.includes('x-ray') || itemLower.includes('एक्स-रे') || itemLower.includes('एक्सरे')) {
        itemCategory = 'X-Ray';
      } else if (itemLower.includes('usg') || itemLower.includes('ultrasound') || itemLower.includes('भिडियो एक्सरे') || itemLower.includes('भिडियो एक्स-रे')) {
        itemCategory = 'USG';
      } else if (itemLower.includes('ecg') || itemLower.includes('ईसीजी') || itemLower.includes('electrocardiogram')) {
        itemCategory = 'ECG';
      } else if (itemLower.includes('opd') || itemLower.includes('ओपिडी') || itemLower.includes('ticket') || itemLower.includes('टिकट') || itemLower.includes('दस्तुर') || itemLower.includes('दर्ता')) {
        itemCategory = 'OPD';
      } else if (itemLower.includes('emergency') || itemLower.includes('इमर्जेन्सी') || itemLower.includes('आकस्मिक')) {
        itemCategory = 'Emergency';
      } else if (itemLower.includes('tb') || itemLower.includes('dots') || itemLower.includes('क्षयरोग') || itemLower.includes('afb')) {
        itemCategory = 'TB';
      } else if (itemLower.includes('leprosy') || itemLower.includes('कुष्ठरोग')) {
        itemCategory = 'Leprosy';
      }
    }
    
    return itemCategory || 'Other';
  }, [serviceCategoryMap, testSubRelations]);

  // Helper to get the gross amount for selected service or category in a record (before flat discount)
  const getRecordGrossAmountForSelectedService = (record: BillingRecord): number => {
    if (selectedCategory === 'All' && selectedService === 'All') {
      return record.subTotal || 0;
    }

    let totalAmt = 0;

    record.items?.forEach((item) => {
      if (item.isRefunded) {
        return;
      }
      const itemLower = (item.serviceName || '').toLowerCase().trim();

      // 1. Category Filter check
      if (selectedCategory !== 'All') {
        const itemCategory = getServiceCategory(itemLower, item.category);
        if (itemCategory !== selectedCategory) {
          // Skip if category does not match
          return;
        }
      }

      // 2. Specific Service filter check
      if (selectedService !== 'All') {
        const selServiceLower = selectedService.toLowerCase().trim();

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
        return;
      }

      // If specific service is 'All' but matches category
      totalAmt += item.total || 0;
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

  // Dynamic price calculation depending on the selected test, category or sub-test (Net amount)
  const getRecordAmountForSelectedService = (record: BillingRecord): number => {
    if (selectedCategory === 'All' && selectedService === 'All') {
      return record.grandTotal || 0;
    }
    
    const grossAmt = getRecordGrossAmountForSelectedService(record);
    const discountPortion = getRecordDiscountForSelectedService(record);
    
    return grossAmt - discountPortion;
  };
  
   const categorySuffix = useMemo(() => {
    if (reportSource !== 'Sewa') return '';
    if (selectedService !== 'All') {
      return `${selectedService} सेवा`;
    }
    switch (selectedCategory) {
      case 'Lab': return 'ल्याब (Lab Investigation)';
      case 'X-Ray': return 'एक्स-रे (X-Ray)';
      case 'USG': return 'USG (भिडियो एक्स-रे) सेवा';
      case 'ECG': return 'ECG (मुटुको जाँच) सेवा';
      case 'OPD': return 'OPD सेवा';
      case 'Emergency': return 'इमर्जेन्सी सेवा';
      case 'Pharmacy': return 'डिस्पेन्सरी / फार्मेसी सेवा';
      case 'Physiotherapy': return 'फिजियोथेरापी सेवा';
      case 'TB': return 'क्षयरोग (TB) सेवा';
      case 'Leprosy': return 'कुष्ठरोग (Leprosy) सेवा';
      case 'Other': return 'अन्य सेवाहरू';
      default: return 'सेवा बिलिङ';
    }
  }, [reportSource, selectedCategory, selectedService]);
  
  // Custom wording for header
  const initialCustomTitle = useMemo(() => {
    const isAllMonths = selectedMonth === 'all';
    const monthName = isAllMonths ? '' : (NEPALI_MONTH_NAMES[parseInt(selectedMonth) - 1] || 'चैत्र');
    const periodText = isAllMonths ? 'वार्षिक' : `${monthName} महिनाको`;
    
    if (reportSource === 'Protsahan') {
      return `आ.व. ${selectedFiscalYear} ${periodText} प्रयोगशाला (ल्याब) सेवा प्रोत्साहन (Incentive) विवरण`;
    } else if (reportSource === 'AmbulanceProtsahan') {
      const driverSuffix = selectedAmbulanceDriver !== 'All' ? ` - चालक: ${selectedAmbulanceDriver}` : '';
      return `आ.व. ${selectedFiscalYear} ${periodText} एम्बुलेन्स चालक सेवा प्रोत्साहन (Driver Incentive) विवरण${driverSuffix}`;
    } else if (reportSource === 'Sewa') {
      return `आ.व. ${selectedFiscalYear} ${periodText} ${categorySuffix} आय विवरण`;
    } else {
      let suffix = ambulanceReportType === 'expense' ? 'खर्च विवरण' : 'आय विवरण';
      if (ambulanceReportType === 'expense' && selectedAmbulanceExpenseCategory !== 'All') {
        const catLabels: {[key: string]: string} = {
          fuel: 'इन्धन',
          maintenance: 'मर्मत संभार',
          driver_allowance: 'चालक भत्ता',
          other: 'अन्य'
        };
        suffix = `${catLabels[selectedAmbulanceExpenseCategory] || ''} खर्च विवरण`;
      }
      return `आ.व. ${selectedFiscalYear} ${periodText} एम्बुलेन्स सेवा ${suffix}`;
    }

  }, [selectedFiscalYear, selectedMonth, reportSource, ambulanceReportType, categorySuffix, selectedAmbulanceExpenseCategory, selectedAmbulanceDriver]);

  const [reportTitleCustom, setReportTitleCustom] = useState<string>('');
  const activeReportTitle = reportTitleCustom || initialCustomTitle;

  // Sync custom title suggestion when month, fiscal year, reportSource, ambulanceReportType, or category/service changes
  React.useEffect(() => {
    const isAllMonths = selectedMonth === 'all';
    const monthName = isAllMonths ? '' : (NEPALI_MONTH_NAMES[parseInt(selectedMonth) - 1] || 'चैत्र');
    const periodText = isAllMonths ? 'वार्षिक' : `${monthName} महिनाको`;
    
    if (reportSource === 'Protsahan') {
      setReportTitleCustom(`आ.व. ${selectedFiscalYear} ${periodText} प्रयोगशाला (ल्याब) सेवा प्रोत्साहन (Incentive) विवरण`);
    } else if (reportSource === 'AmbulanceProtsahan') {
      const driverSuffix = selectedAmbulanceDriver !== 'All' ? ` - चालक: ${selectedAmbulanceDriver}` : '';
      setReportTitleCustom(`आ.व. ${selectedFiscalYear} ${periodText} एम्बुलेन्स चालक सेवा प्रोत्साहन (Driver Incentive) विवरण${driverSuffix}`);
    } else if (reportSource === 'Sewa') {
      setReportTitleCustom(`आ.व. ${selectedFiscalYear} ${periodText} ${categorySuffix} आय विवरण`);
    } else {
      let suffix = ambulanceReportType === 'expense' ? 'खर्च विवरण' : 'आय विवरण';
      if (ambulanceReportType === 'expense' && selectedAmbulanceExpenseCategory !== 'All') {
        const catLabels: {[key: string]: string} = {
          fuel: 'इन्धन',
          maintenance: 'मर्मत संभार',
          driver_allowance: 'चालक भत्ता',
          other: 'अन्य'
        };
        suffix = `${catLabels[selectedAmbulanceExpenseCategory] || ''} खर्च विवरण`;
      }
      setReportTitleCustom(`आ.व. ${selectedFiscalYear} ${periodText} एम्बुलेन्स सेवा ${suffix}`);
    }

  }, [selectedFiscalYear, selectedMonth, reportSource, ambulanceReportType, categorySuffix, selectedAmbulanceExpenseCategory, selectedAmbulanceDriver]);

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
    return allBillingRecordsCombined.filter((record) => {
      // 1. Fiscal Year Match (Check lowercase/trimmed comparisons)
      const fyMatch = record.fiscalYear?.trim() === selectedFiscalYear?.trim();
      if (!fyMatch) return false;

      // 2. Month Match
      if (selectedMonth !== 'all') {
        const dateStr = record.billDate || '';
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length < 2) return false;
        const recordMonth = dateParts[1]; // e.g. "12" or "02"
        
        const targetMonthParsed = parseInt(selectedMonth);
        const recordMonthParsed = parseInt(recordMonth);
        if (targetMonthParsed !== recordMonthParsed) return false;
      }

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

      // 4.5. Service Category filter match
      if (selectedCategory !== 'All') {
        const hasCategory = record.items?.some((item) => {
          const itemLower = (item.serviceName || '').toLowerCase().trim();
          const itemCategory = getServiceCategory(itemLower, item.category);
          return itemCategory === selectedCategory;
        });

        if (!hasCategory) return false;
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

      // 5.5. Referred By User filter match
      if (selectedReferredBy !== 'All') {
        const refMatch = record.referredBy === selectedReferredBy;
        if (!refMatch) return false;
      }

      return true;
    }).sort((a,b) => {
      // Sort by invoice number or date ascending for cleaner reporting
      return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
    });
  }, [allBillingRecordsCombined, selectedFiscalYear, selectedMonth, billingType, searchQuery, selectedCategory, selectedService, selectedReferredBy, testSubRelations, serviceCategoryMap, getServiceCategory]);

  // Filtered Ambulance Records
  const filteredAmbulanceRecords = useMemo(() => {
    return (ambulanceRecords || []).filter((record) => {
      // 1. Fiscal Year Match
      const fyMatch = record.fiscalYear?.trim() === selectedFiscalYear?.trim();
      if (!fyMatch) return false;

      // 2. Month Match
      if (selectedMonth !== 'all') {
        const dateStr = record.dateBs || '';
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length < 2) return false;
        const recordMonth = dateParts[1];
        
        const targetMonthParsed = parseInt(selectedMonth);
        const recordMonthParsed = parseInt(recordMonth);
        if (targetMonthParsed !== recordMonthParsed) return false;
      }

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

  // Filtered Ambulance Expenses
  const filteredAmbulanceExpenses = useMemo(() => {
    return (ambulanceExpenseRecords || []).filter((record) => {
      // 1. Fiscal Year Match
      const fyMatch = record.fiscalYear?.trim() === selectedFiscalYear?.trim();
      if (!fyMatch) return false;

      // 2. Month Match
      if (selectedMonth !== 'all') {
        const dateStr = record.dateBs || '';
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length < 2) return false;
        const recordMonth = dateParts[1];
        
        const targetMonthParsed = parseInt(selectedMonth);
        const recordMonthParsed = parseInt(recordMonth);
        if (targetMonthParsed !== recordMonthParsed) return false;
      }

      // 3. Search Query Match
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const cat = record.expenseCategory?.toLowerCase() || '';
        const remarks = record.remarks?.toLowerCase() || '';
        const paidTo = record.paidTo?.toLowerCase() || '';
        const dName = record.driverName?.toLowerCase() || '';
        const bNo = record.billNo?.toLowerCase() || '';
        if (!cat.includes(query) && !remarks.includes(query) && !paidTo.includes(query) && !dName.includes(query) && !bNo.includes(query)) {
          return false;
        }
      }

      // 4. Expense Category Filter
      if (selectedAmbulanceExpenseCategory !== 'All') {
        const recordCategory = (record.expenseCategory || 'other').toLowerCase().trim();
        const selectedCategory = selectedAmbulanceExpenseCategory.toLowerCase().trim();
        if (recordCategory !== selectedCategory) {
          return false;
        }
      }

      return true;
    }).sort((a,b) => {
      return (a.dateBs || '').localeCompare(b.dateBs || '');
    });
  }, [ambulanceExpenseRecords, selectedFiscalYear, selectedMonth, searchQuery, selectedAmbulanceExpenseCategory]);

  // Driver options list
  const ambulanceDriverOptions = useMemo(() => {
    const set = new Set<string>();
    if (generalSettings?.ambulanceDriverName?.trim()) {
      set.add(generalSettings.ambulanceDriverName.trim());
    }
    (ambulanceRecords || []).forEach(r => {
      if (r.driverName?.trim()) set.add(r.driverName.trim());
    });
    return Array.from(set).sort();
  }, [ambulanceRecords, generalSettings?.ambulanceDriverName]);

  // Filtered trips for Ambulance Driver Protsahan
  const filteredAmbulanceDriverTrips = useMemo(() => {
    return (ambulanceRecords || []).filter((record) => {
      // 1. Fiscal Year Match
      const fyMatch = record.fiscalYear?.trim() === selectedFiscalYear?.trim();
      if (!fyMatch) return false;

      // 2. Month Match
      if (selectedMonth !== 'all') {
        const dateStr = record.dateBs || '';
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length < 2) return false;
        const recordMonth = dateParts[1];
        
        const targetMonthParsed = parseInt(selectedMonth);
        const recordMonthParsed = parseInt(recordMonth);
        if (targetMonthParsed !== recordMonthParsed) return false;
      }

      // 3. Driver Filter
      if (selectedAmbulanceDriver !== 'All') {
        if ((record.driverName || '').trim().toLowerCase() !== selectedAmbulanceDriver.trim().toLowerCase()) {
          return false;
        }
      }

      // 4. Search Query Match
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const pName = record.patientName?.toLowerCase() || '';
        const drName = record.driverName?.toLowerCase() || '';
        const ambNo = record.ambulanceNo?.toLowerCase() || '';
        const dest = record.destination?.toLowerCase() || '';
        const start = record.startLocation?.toLowerCase() || '';
        const bill = record.billNo?.toLowerCase() || '';
        if (!pName.includes(query) && !drName.includes(query) && !ambNo.includes(query) && !dest.includes(query) && !start.includes(query) && !bill.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      return (a.dateBs || '').localeCompare(b.dateBs || '');
    });
  }, [ambulanceRecords, selectedFiscalYear, selectedMonth, selectedAmbulanceDriver, searchQuery]);

  // Trip-level driver incentive calculated items
  const ambulanceDriverTripData = useMemo(() => {
    return filteredAmbulanceDriverTrips.map(trip => {
      const fareAmount = trip.receivedAmount || 0;
      const incentiveAmount = fareAmount * (ambulanceDriverIncentivePercent / 100);
      return {
        trip,
        fareAmount,
        incentiveAmount
      };
    });
  }, [filteredAmbulanceDriverTrips, ambulanceDriverIncentivePercent]);

  // Grouped Summary by Driver
  const ambulanceDriverSummary = useMemo(() => {
    interface DriverSummaryAccumulator {
      driverName: string;
      ambulanceNo: string;
      tripCount: number;
      totalDistance: number;
      totalFare: number;
      totalIncentive: number;
    }
    const map = new Map<string, DriverSummaryAccumulator>();

    ambulanceDriverTripData.forEach(({ trip, fareAmount, incentiveAmount }) => {
      const driver = trip.driverName?.trim() || 'अज्ञात चालक';
      const existing = map.get(driver) || {
        driverName: driver,
        ambulanceNo: trip.ambulanceNo || '-',
        tripCount: 0,
        totalDistance: 0,
        totalFare: 0,
        totalIncentive: 0,
      };
      existing.tripCount += 1;
      existing.totalDistance += Number(trip.distanceKm) || 0;
      existing.totalFare += fareAmount;
      existing.totalIncentive += incentiveAmount;
      if (trip.ambulanceNo && (existing.ambulanceNo === '-' || !existing.ambulanceNo)) {
        existing.ambulanceNo = trip.ambulanceNo;
      }
      map.set(driver, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalIncentive - a.totalIncentive);
  }, [ambulanceDriverTripData]);

  // Totals calculations
  const totalAmountSum = useMemo(() => {
    if (reportSource === 'Sewa') {
      return filteredRecords.reduce((sum, r) => sum + getRecordAmountForSelectedService(r), 0);
    } else if (reportSource === 'AmbulanceProtsahan') {
      return ambulanceDriverTripData.reduce((sum, d) => sum + d.incentiveAmount, 0);
    } else {
      if (ambulanceReportType === 'expense') {
        return filteredAmbulanceExpenses.reduce((sum, r) => sum + (r.amount || 0), 0);
      } else {
        return filteredAmbulanceRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0);
      }
    }
  }, [reportSource, ambulanceReportType, filteredRecords, filteredAmbulanceRecords, filteredAmbulanceExpenses, ambulanceDriverTripData, selectedCategory, selectedService, serviceItems, testSubRelations, serviceCategoryMap]);

  const totalAmbulanceDriverFareSum = useMemo(() => {
    return ambulanceDriverTripData.reduce((sum, d) => sum + d.fareAmount, 0);
  }, [ambulanceDriverTripData]);

  const totalAmbulanceChargedSum = useMemo(() => {
    return filteredAmbulanceRecords.reduce((sum, r) => sum + (r.amountCharged || 0), 0);
  }, [filteredAmbulanceRecords]);

  const referrerRecipient = useMemo(() => {
    return protsahanRecipients.find(r => r.isSystemReferrer);
  }, [protsahanRecipients]);

  // Protsahan Report Data calculations
  const protsahanReportData = useMemo(() => {
    return filteredRecords.map(record => {
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
    }).filter(d => d.grossLabAmount > 0); // Only keep records that have lab services
  }, [filteredRecords, labIncentivePercent, protsahanRecipients, users, getServiceCategory]);

  const protsahanByReferrerRaw = useMemo(() => {
    const map = new Map<string, { netLabAmount: number; totalIncentive: number; referrerShare: number }>();
    protsahanReportData.forEach(item => {
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
  }, [protsahanReportData]);

  const protsahanByReferrer = useMemo(() => {
    if (customReferrerOrder.length === 0) return protsahanByReferrerRaw;

    const orderMap = new Map<string, number>();
    customReferrerOrder.forEach((name, idx) => orderMap.set(name, idx));

    const sorted = [...protsahanByReferrerRaw];
    sorted.sort((a, b) => {
      const orderA = orderMap.has(a.name) ? orderMap.get(a.name)! : 99999;
      const orderB = orderMap.has(b.name) ? orderMap.get(b.name)! : 99999;
      return orderA - orderB;
    });
    return sorted;
  }, [protsahanByReferrerRaw, customReferrerOrder]);

  const handleReorderReferrer = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const currentList = [...protsahanByReferrer];
    if (fromIndex >= currentList.length || toIndex >= currentList.length) return;

    const [movedItem] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, movedItem);

    setCustomReferrerOrder(currentList.map(item => item.name));
  }, [protsahanByReferrer]);

  const handleMoveReferrerUp = (index: number) => {
    if (index > 0) {
      handleReorderReferrer(index, index - 1);
    }
  };

  const handleMoveReferrerDown = (index: number) => {
    if (index < protsahanByReferrer.length - 1) {
      handleReorderReferrer(index, index + 1);
    }
  };

  const handleResetReferrerOrder = () => {
    setCustomReferrerOrder([]);
  };

  const renderPrintPageHeaderRow = (colSpan: number, subTitleText?: string) => {
    const isAllMonths = selectedMonth === 'all';
    const monthName = isAllMonths ? 'वार्षिक (सबै महिना)' : `${NEPALI_MONTH_NAMES[parseInt(selectedMonth) - 1] || 'चैत्र'} महिना`;
    const displayFiscalYear = useNepaliNumerals ? toNepaliDigits(selectedFiscalYear) : selectedFiscalYear;
    const title = subTitleText || activeReportTitle;

    return (
      <tr className="bg-slate-100 text-slate-900 border-2 border-slate-950 font-nepali">
        <th colSpan={colSpan} className="border-2 border-slate-950 px-3 py-1.5 text-xs font-bold tracking-wide">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-slate-800">
            <span className="text-left font-semibold whitespace-nowrap">
              आ.व.: <strong className="text-slate-950 font-mono font-black">{displayFiscalYear}</strong>
            </span>
            <span className="text-center font-black text-slate-950 text-xs md:text-sm">
              {title}
            </span>
            <span className="text-right font-semibold whitespace-nowrap">
              महिना: <strong className="text-slate-950 font-black">{monthName}</strong>
            </span>
          </div>
        </th>
      </tr>
    );
  };

  // Export to CSV function
  const handleExportCSV = () => {
    if (reportSource === 'AmbulanceProtsahan') {
      if (ambulanceDriverTripData.length === 0) {
        alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
        return;
      }

      const headers = [
        "सि.न. (S.N.)",
        "मिति (Date)",
        "सेवाग्राहीको नामथर (Seeker Name)",
        "बिल नं. (Bill No.)",
        "चालकको नाम (Driver Name)",
        "एम्बुलेन्स नं (Ambulance No)",
        "प्रस्थान विन्दु (From)",
        "गन्तव्य विन्दु (To)",
        "दुरी (Distance KM)",
        "प्राप्त भाडा रकम (Fare Amount)",
        `चालक प्रोत्साहन (${ambulanceDriverIncentivePercent}%)`,
        "कैफियत (Remarks)"
      ];

      const rows = ambulanceDriverTripData.map((item, idx) => {
        const serial = (idx + 1).toString();
        const date = item.trip.dateBs || '-';
        const patient = item.trip.patientName || '-';
        const billNo = item.trip.billNo || '-';
        const driver = item.trip.driverName || '-';
        const ambNo = item.trip.ambulanceNo || '-';
        const start = item.trip.startLocation || '-';
        const dest = item.trip.destination || '-';
        const dist = item.trip.distanceKm ? item.trip.distanceKm.toString() : '-';
        const fare = item.fareAmount.toFixed(2);
        const incentive = item.incentiveAmount.toFixed(2);
        const remarks = item.trip.remarks || '-';

        return [serial, date, patient, billNo, driver, ambNo, start, dest, dist, fare, incentive, remarks];
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Ambulance_Driver_Incentive_Report_${selectedFiscalYear}_Month_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (reportSource === 'Protsahan') {
      if (protsahanReportData.length === 0) {
        alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
        return;
      }

      const headers = [
        "सि.न. (S.N.)", 
        "सेवाग्राहीको नामथर (Seeker Name)", 
        "विल नं. (Bill No.)", 
        "मिति (Date)", 
        "ल्याब खुद रकम (Lab Net Amount)", 
        "कुल प्रोत्साहन (Total Incentive)", 
        "सिफारिस गर्ने (Referred By)",
        ...protsahanRecipients.map(recipient => `${recipient.nameNe} हिस्सा (${recipient.sharePercent}%)`)
      ];

      const rows = protsahanReportData.map((r, idx) => {
        const serial = (idx + 1).toString();
        const patient = r.record.patientName || '-';
        const billNo = (r.record.invoiceNumber || '').replace('DB-', '').replace('DIR-', '');
        const date = r.record.billDate || '-';
        const netAmt = r.netLabAmount.toFixed(2);
        const totalInc = r.totalIncentive.toFixed(2);
        const referrer = r.referrerName;
        
        const recipientSharesRow = r.recipientShares.map(share => share.shareAmount.toFixed(2));

        return [serial, patient, billNo, date, netAmt, totalInc, referrer, ...recipientSharesRow];
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Lab_Incentive_Protsahan_Report_${selectedFiscalYear}_Month_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (reportSource === 'Sewa') {
      if (filteredRecords.length === 0) {
        alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
        return;
      }

      const headers = ["सि.न. (S.N.)", "सेवाग्राहीको नामथर (Seeker Name)", "उमेर/लिङ्ग (Age/Gender)", "विल नं. (Bill No.)", "मिति (Date)", "सेवाहरूको विवरण (Services)", "सिफारिस गर्ने (Referred By)", "रकम (Amount)", "कैफियत (Remarks)"];
      
      const rows = filteredRecords.map((r, idx) => {
        const serial = (idx + 1).toString();
        const patient = r.patientName || '-';
        const ageGender = getRecordAgeGender(r);
        const billNo = r.invoiceNumber || '-';
        const date = r.billDate || '-';
        const filteredItemsForExportList = selectedCategory === 'All'
          ? r.items
          : r.items?.filter(item => getServiceCategory((item.serviceName || '').toLowerCase().trim(), item.category) === selectedCategory);
        const services = selectedService !== 'All' ? selectedService : (() => {
          if (!filteredItemsForExportList || filteredItemsForExportList.length === 0) return '-';
          const mappedNames = filteredItemsForExportList.map(item => {
            const nameLower = (item.serviceName || '').trim().toLowerCase();
            const parentName = testSubRelations.parentOfService.get(nameLower);
            return parentName || item.serviceName;
          });
          const uniqueNames = Array.from(new Set(mappedNames));
          return uniqueNames.join(', ');
        })();
        const referrerVal = r.referredBy;
        const referrerUser = users.find(u => u.id === referrerVal || u.username === referrerVal);
        const referrerName = referrerUser ? referrerUser.fullName : (referrerVal || '-');
        const amt = getRecordAmountForSelectedService(r).toString();
        const baseR = r.remarks || '';
        const dVal = getRecordDiscountForSelectedService(r);
        const dNote = dVal > 0 ? `रु. ${dVal.toFixed(2)} छुट` : '';
        const remarks = [baseR, dNote].filter(Boolean).join(', ') || '-';
        
        return [serial, patient, ageGender, billNo, date, services, referrerName, amt, remarks];
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
      if (ambulanceReportType === 'expense') {
        if (filteredAmbulanceExpenses.length === 0) {
          alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
          return;
        }

        const headers = ["सि.न. (S.N.)", "मिति (Date)", "खर्च वर्ग (Category)", "रकम (Amount)", "बील नम्बर (Bill No.)", "प्यान/भ्याट नं (PAN/VAT No.)", "भुक्तानी प्राप्त गर्ने (Paid To)", "चालकको नाम (Driver)", "कैफियत (Remarks)"];
        
        const getCategoryLabel = (cat: string) => {
          switch (cat) {
            case 'fuel': return 'इन्धन';
            case 'maintenance': return 'मर्मत संभार';
            case 'driver_allowance': return 'चालक भत्ता';
            default: return 'अन्य';
          }
        };

        const rows = filteredAmbulanceExpenses.map((r, idx) => {
          const serial = (idx + 1).toString();
          const date = r.dateBs || '-';
          const category = getCategoryLabel(r.expenseCategory || 'other');
          const amount = r.amount ? r.amount.toString() : '0';
          const billNo = r.billNo || '-';
          const panVatNo = r.panVatNo || '-';
          const paidTo = r.paidTo || '-';
          const driver = r.driverName || '-';
          const remarks = r.remarks || '-';
          
          return [serial, date, category, amount, billNo, panVatNo, paidTo, driver, remarks];
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Ambulance_Expense_Report_${selectedFiscalYear}_Month_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        if (filteredAmbulanceRecords.length === 0) {
          alert("निर्यात गर्नको लागि कुनै रेकर्डहरू फेला परेनन्।");
          return;
        }

        const headers = ["सि.न. (S.N.)", "सेवाग्राहीको नामथर (Seeker Name)", "बिल नम्बर (Bill No.)", "एम्बुलेन्स नं (Ambulance No)", "चालक (Driver)", "मिति (Date)", "प्रस्थान विन्दु (From)", "गन्तव्य विन्दु (To)", "दुरी (Distance KM)", "कूल शुल्क (Total Charged)", "प्राप्त रकम (Received Amount)", "छुट/बक्यौता (Discount/Due)", "कैफियत (Remarks)"];
        
        const rows = filteredAmbulanceRecords.map((r, idx) => {
          const serial = (idx + 1).toString();
          const patient = r.patientName || '-';
          const billNo = r.billNo || '-';
          const ambNo = r.ambulanceNo || '-';
          const driver = r.driverName || '-';
          const date = r.dateBs || '-';
          const fromLoc = r.startLocation || '-';
          const toLoc = r.destination || '-';
          const dist = r.distanceKm ? r.distanceKm.toString() : '-';
          const amtCharged = r.amountCharged ? r.amountCharged.toString() : '0';
          const amtRec = r.receivedAmount ? r.receivedAmount.toString() : '0';
          
          let discountDueText = '-';
          const isDue = (r.amountCharged || 0) - (r.receivedAmount || 0) > 0 && !r.isDiscounted;
          if (isDue) {
            discountDueText = `बक्यौता: रु. ${((r.amountCharged || 0) - (r.receivedAmount || 0)).toFixed(2)}`;
          } else if (r.isDiscounted) {
            const parts = [`छुट: ${r.discountRecommendedBy || 'स्वयम'}`];
            if (r.discountAmount) parts.push(`रु. ${r.discountAmount}`);
            if (r.discountPercentage) parts.push(`${r.discountPercentage}%`);
            discountDueText = parts.join(', ');
          }

          const baseRemarks = r.remarks || '';
          const remarksCombined = baseRemarks.trim() ? baseRemarks : '-';
          
          return [serial, patient, billNo, ambNo, driver, date, fromLoc, toLoc, dist, amtCharged, amtRec, discountDueText, remarksCombined];
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
    }
  };

  if (!hasAnyBillingReportAccess) {
    return (
      <div className="w-full space-y-6">
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
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-lg mx-auto text-center space-y-5 my-12">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800 font-nepali">अनुमति अस्वीकृत (Access Denied)</h3>
            <p className="text-slate-500 text-xs font-nepali leading-relaxed">
              तपाईंसँग बिलिङ रिपोर्टअन्तर्गत कुनै पनी सेवा (सेवा बिलिङ रिपोर्ट वा एम्बुलेन्स सेवा रिपोर्ट) को पहुँच अनुमति छैन। कृपया एडमिन वा स्वास्थ्य शाखासँग सम्पर्क गरी आवश्यक अनुमति प्राप्त गर्नुहोस्।
            </p>
          </div>
          <div className="pt-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
              PERMISSION_REQUIRED: BILLING_REPORT_SUB_MODULES
            </span>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-4 items-end print:hidden">
        <div>
          <label className="block text-xs font-bold text-slate-100 mb-1.5 bg-emerald-700 text-white px-2 py-0.5 rounded-sm">रिपोर्ट प्रकार (Report Type)</label>
          <div className="relative">
            <select
              value={reportSource}
              onChange={(e) => setReportSource(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-white border-2 border-emerald-500 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer text-emerald-800"
            >
              {hasSourceAccess('Sewa') && <option value="Sewa">सेवा बिलिङ (Sewa Billing)</option>}
              {hasSourceAccess('Ambulance') && <option value="Ambulance">एम्बुलेन्स सेवा (Ambulance Sewa)</option>}
              {hasSourceAccess('Protsahan') && <option value="Protsahan">प्रयोगशाला प्रोत्साहन (Lab Protsahan)</option>}
              {hasSourceAccess('AmbulanceProtsahan') && <option value="AmbulanceProtsahan">एम्बुलेन्स चालक प्रोत्साहन (Driver Incentive)</option>}
            </select>
            <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {reportSource === 'AmbulanceProtsahan' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 font-nepali">चालक छान्नुहोस् (Select Driver)</label>
            <div className="relative">
              <select
                value={selectedAmbulanceDriver}
                onChange={(e) => setSelectedAmbulanceDriver(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer"
              >
                <option value="All">सबै चालकहरू (All Drivers)</option>
                {ambulanceDriverOptions.map((dr) => (
                  <option key={dr} value={dr}>
                    {dr}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        )}

        {reportSource === 'Ambulance' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-100 mb-1.5 bg-emerald-600 text-white px-2 py-0.5 rounded-sm">कारोबार प्रकार (Trans. Type)</label>
              <div className="relative">
                <select
                  value={ambulanceReportType}
                  onChange={(e) => setAmbulanceReportType(e.target.value as 'income' | 'expense')}
                  className="w-full text-xs p-2.5 bg-white border-2 border-emerald-500 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer text-emerald-800"
                >
                  <option value="income">आम्दानी विवरण (Income)</option>
                  <option value="expense">खर्च विवरण (Expenses)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            {ambulanceReportType === 'expense' && (
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1.5">खर्च वर्ग (Expense Category)</label>
                 <div className="relative">
                   <select
                     value={selectedAmbulanceExpenseCategory}
                     onChange={(e) => setSelectedAmbulanceExpenseCategory(e.target.value)}
                     className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer"
                   >
                     <option value="All">सबै खर्च (All)</option>
                     <option value="fuel">इन्धन</option>
                     <option value="maintenance">मर्मत संभार</option>
                     <option value="driver_allowance">चालक भत्ता</option>
                     <option value="other">अन्य</option>
                   </select>
                   <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
                 </div>
               </div>
            )}
          </>
        )}

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

        {(reportSource === 'Sewa' || reportSource === 'Protsahan') ? (
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
              <label className="block text-xs font-bold text-slate-600 mb-1.5">सेवा प्रकार (Service Category)</label>
              <div className="relative">
                <select
                  value={reportSource === 'Protsahan' ? 'Lab' : selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedService('All'); // Reset specific service filter when category changes
                  }}
                  disabled={reportSource === 'Protsahan'}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="All">सबै सेवा प्रकार (All Categories)</option>
                  <option value="Lab">ल्याब (Lab Investigation)</option>
                  <option value="X-Ray">एक्स-रे (X-Ray)</option>
                  <option value="USG">USG (भिडियो एक्स-रे)</option>
                  <option value="ECG">ECG (मुटुको जाँच)</option>
                  <option value="OPD">OPD सेवा</option>
                  <option value="Emergency">इमर्जेन्सी सेवा</option>
                  <option value="Pharmacy">डिस्पेन्सरी / फार्मेसी</option>
                  <option value="Physiotherapy">फिजियोथेरापी</option>
                  <option value="TB">क्षयरोग (TB)</option>
                  <option value="Leprosy">कुष्ठरोग (Leprosy)</option>
                  <option value="Other">अन्य सेवाहरू (Others)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">विशेष सेवा/टेस्ट (Specific Service/Test)</label>
              <div className="relative">
                <select
                  value={reportSource === 'Protsahan' ? 'All' : selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  disabled={reportSource === 'Protsahan'}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="All">सबै सेवा/टेस्टहरू (All Services/Tests)</option>
                  {testSubRelations.mainServices.length > 0 && (
                    <optgroup label="मुख्य टेस्ट प्याकेज/समूह (Main Test Packages)">
                      {testSubRelations.mainServices
                        .filter(srv => selectedCategory === 'All' || getServiceCategory(srv.toLowerCase().trim()) === selectedCategory)
                        .map((srv) => (
                          <option key={`main-${srv}`} value={srv}>
                            {srv}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {testSubRelations.individualAndSubServices.length > 0 && (
                    <optgroup label="व्यक्तिगत टेस्ट / उप-परीक्षण (Individual & Subtests)">
                      {testSubRelations.individualAndSubServices
                        .filter(srv => {
                          if (selectedCategory === 'All') return true;
                          return getServiceCategory(srv.toLowerCase().trim()) === selectedCategory;
                        })
                        .map((srv) => (
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

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">सिफारिस गर्ने (Referred By)</label>
              <div className="relative">
                <select
                  value={selectedReferredBy}
                  onChange={(e) => setSelectedReferredBy(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none appearance-none pr-8 cursor-pointer text-slate-700"
                >
                  <option value="All">सबै सिफारिसकर्ता (All Referrers)</option>
                  {users
                    .filter((u) => u.organizationName === currentUser?.organizationName)
                    .map((u) => (
                      <option key={u.id} value={u.username}>
                        {u.fullName} ({u.designation || u.role})
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </>
        ) : null}

        <div className={(reportSource === 'Sewa' || reportSource === 'Protsahan') ? 'col-span-1' : 'col-span-1 sm:col-span-2'}>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">खोज्नुहोस् (Search Name/Details)</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={reportSource === 'Sewa' ? "नाम, विल नम्बर वा टेस्ट" : reportSource === 'Protsahan' ? "बिरामीको नाम वा बिल नम्बर" : (ambulanceReportType === 'expense' ? "श्रेणी, विवरण, भुक्तानी प्राप्त गर्ने वा चालक" : "नाम, चालक, नम्बर वा गन्तव्य")}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none pl-9"
            />
            <Search className="absolute left-2.5 top-3.5 text-slate-400" size={14} />
          </div>
        </div>
      </div>

      {reportSource === 'AmbulanceProtsahan' && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-6 print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 font-nepali flex items-center gap-2">
                एम्बुलेन्स चालक प्रोत्साहन दर सेटिङ (Ambulance Driver Incentive Settings)
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                एम्बुलेन्स यात्राको कुल प्राप्त भाडा रकमको आधारमा चालक प्रोत्साहन प्रतिशत यहाँ निर्धारण गर्नुहोस्।
              </p>
            </div>
            {!isDriverSettingsEditing && (
              <button
                onClick={() => {
                  setTempDriverIncentivePercent(ambulanceDriverIncentivePercent);
                  setIsDriverSettingsEditing(true);
                }}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-all"
              >
                दर परिमार्जन गर्नुहोस् (Edit Incentive %)
              </button>
            )}
          </div>

          {isDriverSettingsEditing ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              setAmbulanceDriverIncentivePercent(tempDriverIncentivePercent);
              localStorage.setItem('protsahan_ambulance_driver_percent', tempDriverIncentivePercent.toString());
              setIsDriverSettingsEditing(false);
            }} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-nepali">चालक प्रोत्साहन दर % (Driver Incentive % of Fare):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={tempDriverIncentivePercent}
                  onChange={(e) => setTempDriverIncentivePercent(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsDriverSettingsEditing(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  रद्द (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all"
                >
                  बचत गर्नुहोस् (Save)
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[140px] bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl text-center">
                <span className="block text-[10px] text-emerald-800 font-bold tracking-wider uppercase font-nepali">चालक प्रोत्साहन दर</span>
                <span className="block text-xl font-extrabold text-emerald-700 font-mono mt-1">{toNepaliDigits(ambulanceDriverIncentivePercent)}%</span>
                <span className="text-[10px] text-slate-500 font-nepali font-medium">यात्रा भाडा रकमको</span>
              </div>
            </div>
          )}
        </div>
      )}

      {reportSource === 'Protsahan' && (
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mb-6 print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 font-nepali flex items-center gap-2">
                प्रोत्साहन दर र बाँडफाँड सेटिङहरू (Incentive Distribution Settings)
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                ल्याब सेवाको बिल रकमको आधारमा कुल प्रोत्साहन र त्यसको बाँडफाँड प्राप्तकर्ताहरू र प्रतिशत यहाँ निर्धारण गर्नुहोस्।
              </p>
            </div>
            {!isSettingsEditing && (
              <button
                onClick={() => {
                  setTempIncentivePercent(labIncentivePercent);
                  setTempRecipients([...protsahanRecipients]);
                  setIsSettingsEditing(true);
                }}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-all"
              >
                दर र प्राप्तकर्ता परिमार्जन गर्नुहोस् (Edit Settings)
              </button>
            )}
          </div>

          {isSettingsEditing ? (
            <form onSubmit={handleSaveProtsahanSettings} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-5">
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-nepali">कुल प्रोत्साहन दर % (Total Incentive % of Lab Bill):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={tempIncentivePercent}
                  onChange={(e) => setTempIncentivePercent(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-800 font-nepali">
                    प्रोत्साहन प्राप्तकर्ताहरू र बाँडफाँड प्रतिशत (Recipients & Share Percentages):
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setTempRecipients([
                        ...tempRecipients,
                        {
                          id: 'recipient_' + Date.now(),
                          nameNe: '',
                          nameEn: '',
                          sharePercent: 0
                        }
                      ]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Plus size={12} />
                    नयाँ थप्नुहोस् (Add Recipient)
                  </button>
                </div>

                <div className="space-y-3">
                  {tempRecipients.map((recipient, index) => (
                    <div key={recipient.id} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 font-nepali">प्राप्तकर्ताको नाम (नेपाली):</label>
                        <input
                          type="text"
                          value={recipient.nameNe}
                          onChange={(e) => {
                            const updated = [...tempRecipients];
                            updated[index] = { ...recipient, nameNe: e.target.value };
                            setTempRecipients(updated);
                          }}
                          placeholder="उदा: प्रयोगशालाकर्मी, सहयोगी"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none font-medium focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 font-nepali">Recipient Name (English):</label>
                        <input
                          type="text"
                          value={recipient.nameEn}
                          onChange={(e) => {
                            const updated = [...tempRecipients];
                            updated[index] = { ...recipient, nameEn: e.target.value };
                            setTempRecipients(updated);
                          }}
                          placeholder="e.g. Lab Staff, Helper"
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none font-medium focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 font-nepali">बाँडफाँड हिस्सा % (Share %):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={recipient.sharePercent}
                          onChange={(e) => {
                            const updated = [...tempRecipients];
                            updated[index] = { ...recipient, sharePercent: Number(e.target.value) };
                            setTempRecipients(updated);
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                          required
                        />
                      </div>
                      <div className="flex items-end justify-end md:self-end h-9 pb-1">
                        {recipient.isSystemReferrer ? (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 font-nepali" title="यो सिफारिसकर्ताको नाम बिल अनुसार परिवर्तन हुन्छ">
                            सिस्टम (System)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTempRecipients(tempRecipients.filter(r => r.id !== recipient.id));
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                            title="हटाउनुहोस् (Delete)"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-t border-slate-100 pt-4 mt-2">
                <span className="text-xs text-slate-600 font-medium">
                  बाँडफाँड हिस्साको जोड: <strong className={Math.abs(tempRecipients.reduce((s, r) => s + r.sharePercent, 0) - 100) < 0.01 ? "text-emerald-600 text-sm font-black" : "text-rose-600 text-sm font-black"}>
                    {tempRecipients.reduce((s, r) => s + r.sharePercent, 0).toFixed(1)}%
                  </strong> (१००% हुनुपर्छ)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsEditing(false)}
                    className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    रद्द (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    बचत गर्नुहोस् (Save)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[140px] bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl text-center">
                <span className="block text-[10px] text-emerald-800 font-bold tracking-wider uppercase font-nepali">कुल प्रोत्साहन दर (Total Incentive)</span>
                <span className="block text-xl font-extrabold text-emerald-700 font-mono mt-1">{toNepaliDigits(labIncentivePercent)}%</span>
                <span className="text-[10px] text-slate-500 font-nepali font-medium">ल्याब बिलको रकम</span>
              </div>
              {protsahanRecipients.map(recipient => (
                <div key={recipient.id} className="flex-1 min-w-[140px] bg-sky-50/50 border border-sky-100 p-3 rounded-2xl text-center">
                  <span className="block text-[10px] text-sky-800 font-bold tracking-wider uppercase font-nepali">{recipient.nameNe} हिस्सा</span>
                  <span className="block text-xl font-extrabold text-sky-700 font-mono mt-1">{toNepaliDigits(recipient.sharePercent)}%</span>
                  <span className="text-[10px] text-slate-500 font-nepali font-medium">कुल प्रोत्साहनको हिस्सा</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Summary Panel - Hide on print */}
      {reportSource !== 'Protsahan' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden mb-6">
          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              {reportSource === 'Sewa' ? 'जम्मा बिल संख्या (Total Invoices)' : (ambulanceReportType === 'expense' ? 'जम्मा खर्च रेकर्ड संख्या (Total Expenses)' : 'जम्मा यात्रा संख्या (Total Trips)')}
            </p>
            <p className="text-2xl font-black mt-1 text-slate-800">
              {formatNumberValue(reportSource === 'Sewa' ? filteredRecords.length : (ambulanceReportType === 'expense' ? filteredAmbulanceExpenses.length : filteredAmbulanceRecords.length))}
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              {reportSource === 'Sewa' ? 'जम्मा संकलित रकम (Total Collected)' : (ambulanceReportType === 'expense' ? 'जम्मा खर्च रकम (Total Expenses)' : 'प्राप्त रकम (Total Received Amount)')}
            </p>
            <p className="text-2xl font-black mt-1 text-emerald-600">
              रु. {formatNumberValue(totalAmountSum.toFixed(2))}
            </p>
          </div>

          {reportSource === 'Sewa' ? (
            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">बिल श्रेणी (Category Filters)</p>
              <p className="text-lg font-bold mt-1 text-slate-700">
                {billingType === 'All' ? 'सबै बिलिङ' : billingType === 'Direct' ? 'प्रत्यक्ष बिल मात्र' : 'नियमित बिल मात्र'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {ambulanceReportType === 'expense' ? 'औसत प्रति खर्च (Avg Expense)' : 'कुल चार्ज्ड रकम (Total Charged Amount)'}
              </p>
              <p className="text-2xl font-black mt-1 text-amber-600">
                {ambulanceReportType === 'expense' ? (
                  `रु. ${formatNumberValue((filteredAmbulanceExpenses.length > 0 ? (totalAmountSum / filteredAmbulanceExpenses.length) : 0).toFixed(2))}`
                ) : (
                  `रु. ${formatNumberValue(totalAmbulanceChargedSum.toFixed(2))}`
                )}
              </p>
            </div>
          )}
        </div>
      )}

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
            {reportSource === 'Protsahan' ? 'प्रयोगशाला (ल्याब) सेवा प्रोत्साहन विवरण' : reportSource === 'AmbulanceProtsahan' ? 'एम्बुलेन्स चालक सेवा प्रोत्साहन (Driver Incentive) विवरण' : reportSource === 'Sewa' ? (categorySuffix === 'सेवा बिलिङ' ? 'ल्याब / अन्य स्वास्थ्य सेवा' : categorySuffix) : 'एम्बुलेन्स सेवा'}
          </h2>
          <p className="text-sm font-bold font-nepali text-slate-800 mt-2.5">
            {activeReportTitle}
          </p>
        </div>

        {/* Report Spreadsheet Table */}
        <div className="overflow-x-auto">
          {reportSource === 'Protsahan' ? (
            <div className="space-y-8">
              {/* Protsahan Overview Panel inside the printable area */}
              <div className="flex flex-wrap gap-4 mb-4 print:gap-2">
                <div className="flex-1 min-w-[140px] bg-slate-50 border border-slate-300 p-3 rounded-xl text-center">
                  <span className="block text-[10px] text-slate-700 font-bold tracking-wide uppercase font-nepali">कुल ल्याब खुद बिक्री</span>
                  <span className="block text-sm font-black text-slate-800 font-mono mt-0.5">
                    रू. {toNepaliDigits(protsahanReportData.reduce((s, d) => s + d.netLabAmount, 0).toFixed(2))}
                  </span>
                </div>
                <div className="flex-1 min-w-[140px] bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl text-center">
                  <span className="block text-[10px] text-emerald-800 font-bold tracking-wide uppercase font-nepali">कुल प्रोत्साहन ({toNepaliDigits(labIncentivePercent)}%)</span>
                  <span className="block text-sm font-black text-emerald-700 font-mono mt-0.5">
                    रू. {toNepaliDigits(protsahanReportData.reduce((s, d) => s + d.totalIncentive, 0).toFixed(2))}
                  </span>
                </div>
                {protsahanRecipients.map(recipient => {
                  const totalForRecipient = protsahanReportData.reduce((sum, d) => {
                    const share = d.recipientShares.find(s => s.id === recipient.id);
                    return sum + (share ? share.shareAmount : 0);
                  }, 0);
                  return (
                    <div key={recipient.id} className="flex-1 min-w-[140px] bg-sky-50/50 border border-sky-200 p-3 rounded-xl text-center">
                      <span className="block text-[10px] text-sky-800 font-bold tracking-wide uppercase font-nepali">{recipient.nameNe} हिस्सा ({toNepaliDigits(recipient.sharePercent)}%)</span>
                      <span className="block text-sm font-black text-sky-700 font-mono mt-0.5">
                        रू. {toNepaliDigits(totalForRecipient.toFixed(2))}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 1. Referrer-wise Incentive Allocation Summary */}
              <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs md:text-sm font-black text-slate-900 font-nepali">
                    १. सिफारिसकर्ता अनुसारको प्रोत्साहन बाँडफाँड सारांश (Referrer-wise Incentive Allocation Summary)
                  </h3>
                  {customReferrerOrder.length > 0 && (
                    <button
                      onClick={handleResetReferrerOrder}
                      type="button"
                      className="print:hidden text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                      title="मूल क्रम कायम गर्नुहोस्"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>मूल क्रम बनाउनुहोस् (Reset Order)</span>
                    </button>
                  )}
                </div>

                {protsahanByReferrer.length > 1 && (
                  <div className="text-[11px] text-slate-500 font-nepali mb-2 print:hidden flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <GripVertical className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>सिफारिसकर्ताको नाम अगाडिको निसान समातेर वा ड्र्याग (Drag & Drop) गरी वा <b>क्रम (▲/▼)</b> बटन थची लहरको क्रम परिवर्तन गर्न सकिन्छ।</span>
                  </div>
                )}

                <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
                  <thead>
                    {renderPrintPageHeaderRow(6, '१. सिफारिसकर्ता अनुसारको प्रोत्साहन बाँडफाँड सारांश')}
                    <tr className="bg-slate-100">
                      <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">सि.न.</th>
                      <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali">सिफारिसकर्ताको नाम (Referrer Name)</th>
                      <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-36">खुद ल्याब रकम</th>
                      <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-36">जम्मा प्रोत्साहन</th>
                      <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-36">सिफारिस हिस्सा ({toNepaliDigits(referrerRecipient?.sharePercent || 0)}%)</th>
                      <th className="border-2 border-slate-950 p-1 text-center font-bold tracking-wide w-16 print:hidden font-nepali">क्रम</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protsahanByReferrer.length > 0 ? (
                      protsahanByReferrer.map((item, index) => {
                        const isDragging = draggedRowIndex === index;
                        const isOver = dragOverRowIndex === index && draggedRowIndex !== index;

                        return (
                          <tr
                            key={item.name}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedRowIndex(index);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverRowIndex !== index) {
                                setDragOverRowIndex(index);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverRowIndex === index) setDragOverRowIndex(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                              handleReorderReferrer(fromIdx, index);
                              setDraggedRowIndex(null);
                              setDragOverRowIndex(null);
                            }}
                            onDragEnd={() => {
                              setDraggedRowIndex(null);
                              setDragOverRowIndex(null);
                            }}
                            className={`transition-colors select-none ${
                              isDragging ? 'opacity-40 bg-indigo-100/70 border-2 border-dashed border-indigo-400' :
                              isOver ? 'bg-sky-100 border-t-2 border-t-indigo-600' :
                              'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="border border-slate-950 p-2 text-center font-bold">{toNepaliDigits(index + 1)}</td>
                            <td className="border border-slate-950 p-2 font-semibold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span
                                  title="Drag to reorder"
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 print:hidden p-0.5 rounded hover:bg-slate-100 transition-colors"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </span>
                                <span>{item.name}</span>
                              </div>
                            </td>
                            <td className="border border-slate-950 p-2 text-right font-mono font-medium">रू. {toNepaliDigits(item.netLabAmount.toFixed(2))}</td>
                            <td className="border border-slate-950 p-2 text-right font-mono font-medium text-emerald-700">रू. {toNepaliDigits(item.totalIncentive.toFixed(2))}</td>
                            <td className="border border-slate-950 p-2 text-right font-mono font-bold text-sky-700">रू. {toNepaliDigits(item.referrerShare.toFixed(2))}</td>
                            <td className="border border-slate-950 p-1 text-center print:hidden">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMoveReferrerUp(index)}
                                  className="p-1 text-slate-500 hover:text-indigo-700 disabled:opacity-20 disabled:hover:text-slate-500 rounded hover:bg-slate-100 transition-colors"
                                  title="माथि सार्नुहोस्"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === protsahanByReferrer.length - 1}
                                  onClick={() => handleMoveReferrerDown(index)}
                                  className="p-1 text-slate-500 hover:text-indigo-700 disabled:opacity-20 disabled:hover:text-slate-500 rounded hover:bg-slate-100 transition-colors"
                                  title="तल सार्नुहोस्"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-slate-950 p-10 text-center text-slate-400 italic font-nepali">
                          प्रोत्साहन गणनाको लागि कुनै रेकर्ड फेला परेन।
                        </td>
                      </tr>
                    )}
                    {protsahanByReferrer.length > 0 && (
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={2} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">कुल जम्मा (Total Sum):</td>
                        <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                          रू. {toNepaliDigits(protsahanByReferrer.reduce((s, i) => s + i.netLabAmount, 0).toFixed(2))}
                        </td>
                        <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono text-emerald-800">
                          रू. {toNepaliDigits(protsahanByReferrer.reduce((s, i) => s + i.totalIncentive, 0).toFixed(2))}
                        </td>
                        <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono text-sky-800">
                          रू. {toNepaliDigits(protsahanByReferrer.reduce((s, i) => s + i.referrerShare, 0).toFixed(2))}
                        </td>
                        <td className="border-2 border-slate-950 p-2.5 print:hidden"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. Detailed Incentive Calculation Log */}
              <div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 font-nepali mb-2">
                  २. प्रत्येक बिलको प्रोत्साहन बाँडफाँडको विस्तृत विवरण (Detailed Incentive Calculation Log)
                </h3>
                <table className="w-full border-collapse border-2 border-slate-950 text-xs text-slate-900">
                  <thead>
                    {renderPrintPageHeaderRow(7 + protsahanRecipients.length, '२. प्रत्येक बिलको प्रोत्साहन बाँडफाँडको विस्तृत विवरण')}
                    <tr className="bg-slate-100">
                      <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">सि.न.</th>
                      <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[120px]">बिरामीको नाम</th>
                      <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-20">विल नं.</th>
                      <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-20">मिति</th>
                      <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-24">ल्याब खुद रकम</th>
                      <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-24">कुल प्रोत्साहन ({toNepaliDigits(labIncentivePercent)}%)</th>
                      <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[110px]">सिफारिसकर्ता</th>
                      {protsahanRecipients.map(recipient => (
                        <th key={recipient.id} className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali min-w-[80px]">
                          {recipient.nameNe} ({toNepaliDigits(recipient.sharePercent)}%)
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {protsahanReportData.length > 0 ? (
                      protsahanReportData.map((item, index) => {
                        const cleanBillNo = (item.record.invoiceNumber || '').replace('DB-', '').replace('DIR-', '');
                        const displayBillNo = useNepaliNumerals ? toNepaliDigits(cleanBillNo) : cleanBillNo;
                        const displayDate = formatRawDateToNepaliUi(item.record.billDate);

                        return (
                          <tr key={item.record.id} className="hover:bg-slate-50/50">
                            <td className="border border-slate-950 p-2 text-center font-bold">{toNepaliDigits(index + 1)}</td>
                            <td className="border border-slate-950 p-2 font-medium">{item.record.patientName || '-'}</td>
                            <td className="border border-slate-950 p-2 text-center font-mono">{displayBillNo}</td>
                            <td className="border border-slate-950 p-2 text-center">{displayDate}</td>
                            <td className="border border-slate-950 p-2 text-right font-mono font-medium">रू. {toNepaliDigits(item.netLabAmount.toFixed(2))}</td>
                            <td className="border border-slate-950 p-2 text-right font-mono font-medium text-emerald-700">रू. {toNepaliDigits(item.totalIncentive.toFixed(2))}</td>
                            <td className="border border-slate-950 p-2 text-slate-800">{item.referrerName}</td>
                            {item.recipientShares.map(share => (
                              <td key={share.id} className="border border-slate-950 p-2 text-right font-mono font-medium text-slate-800">
                                रू. {toNepaliDigits(share.shareAmount.toFixed(2))}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7 + protsahanRecipients.length} className="border border-slate-950 p-10 text-center text-slate-400 italic font-nepali">
                          प्रोत्साहन गणनाको लागि कुनै विस्तृत रेकर्ड फेला परेन।
                        </td>
                      </tr>
                    )}
                    {protsahanReportData.length > 0 && (
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={4} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">कुल जम्मा (Total Sum):</td>
                        <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                          रू. {toNepaliDigits(protsahanReportData.reduce((s, i) => s + i.netLabAmount, 0).toFixed(2))}
                        </td>
                        <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono text-emerald-800">
                          रू. {toNepaliDigits(protsahanReportData.reduce((s, i) => s + i.totalIncentive, 0).toFixed(2))}
                        </td>
                        <td className="border-2 border-slate-950 p-2.5"></td>
                        {protsahanRecipients.map(recipient => {
                          const totalForRecipient = protsahanReportData.reduce((sum, d) => {
                            const share = d.recipientShares.find(s => s.id === recipient.id);
                            return sum + (share ? share.shareAmount : 0);
                          }, 0);
                          return (
                            <td key={recipient.id} className="border-2 border-slate-950 p-2.5 text-right font-black font-mono text-slate-800">
                              रू. {toNepaliDigits(totalForRecipient.toFixed(2))}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : reportSource === 'Sewa' ? (
            <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
              <thead>
                {renderPrintPageHeaderRow(9)}
                <tr className="bg-slate-50">
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">
                    सि.न.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[150px]">
                    सेवाग्राहीको नामथर
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-28">
                    उमेर/लिङ्ग
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
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali w-36">
                    सिफारिस गर्ने
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
                    const ageGenderStr = getRecordAgeGender(record);
                    const cleanBillNo = (record.invoiceNumber || '').replace('DB-', '').replace('DIR-', '');
                    const displayBillNo = useNepaliNumerals ? toNepaliDigits(cleanBillNo) : cleanBillNo;
                    const displayDate = formatRawDateToNepaliUi(record.billDate);
                    const filteredItemsForList = selectedCategory === 'All'
                      ? record.items
                      : record.items?.filter(item => getServiceCategory((item.serviceName || '').toLowerCase().trim(), item.category) === selectedCategory);
                    const servicesList = selectedService !== 'All' 
                      ? selectedService 
                      : (() => {
                          if (!filteredItemsForList || filteredItemsForList.length === 0) return '-';
                          const mappedNames = filteredItemsForList.map(item => {
                            const nameLower = (item.serviceName || '').trim().toLowerCase();
                            const parentName = testSubRelations.parentOfService.get(nameLower);
                            return parentName || item.serviceName;
                          });
                          const uniqueNames = Array.from(new Set(mappedNames));
                          return uniqueNames.join(', ');
                        })();
                    const referrerVal = record.referredBy;
                    const referrerUser = users.find(u => u.id === referrerVal || u.username === referrerVal);
                    const referrerName = referrerUser ? referrerUser.fullName : (referrerVal || '-');
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
                        <td className="border border-slate-950 p-2 text-center font-medium">
                          {ageGenderStr}
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
                        <td className="border border-slate-950 p-2 font-medium">
                          {referrerName}
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
                    <td colSpan={8} className="border border-slate-950 p-10 text-center text-slate-400 italic">
                      चयन गरिएको महिना र फिल्टर अनुसार कुनै आय विवरण रेकर्ड भेटिएन।
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={6} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">
                    कुल जम्मा रकम (Grand Total):
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmountSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
                </tr>
              </tbody>
            </table>
          ) : ambulanceReportType === 'expense' ? (
            <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
              <thead>
                {renderPrintPageHeaderRow(9)}
                <tr className="bg-slate-50">
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">
                    सि.न.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-28">
                    मिति (B.S.)
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[150px]">
                    खर्च वर्ग (Category)
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-32">
                    बील नम्बर (Bill No.)
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-28">
                    प्यान/भ्याट नं.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali">
                    भुक्तानी प्राप्त गर्ने (Paid To)
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali">
                    चालकको नाम
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-28">
                    कुल खर्च रकम
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali">
                    कैफियत / विवरण
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAmbulanceExpenses.length > 0 ? (
                  filteredAmbulanceExpenses.map((record, index) => {
                    const sNoStr = formatNumberValue(index + 1);
                    const displayDate = formatRawDateToNepaliUi(record.dateBs);
                    const categoryLabel = (() => {
                      switch (record.expenseCategory) {
                        case 'fuel': return 'इन्धन (Fuel)';
                        case 'maintenance': return 'मर्मत संभार (Maintenance)';
                        case 'driver_allowance': return 'चालक भत्ता (Driver Allowance)';
                        default: return 'अन्य (Other)';
                      }
                    })();
                    const billNo = record.billNo ? formatNumberValue(record.billNo) : '-';
                    const panVatNo = record.panVatNo ? formatNumberValue(record.panVatNo) : '-';
                    const paidTo = record.paidTo || '-';
                    const driverName = record.driverName || '-';
                    const formattedAmount = formatNumberValue((record.amount || 0).toFixed(2));
                    const remarks = record.remarks || '-';

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="border border-slate-950 p-2 text-center font-bold">
                          {sNoStr}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-medium">
                          {displayDate}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {categoryLabel}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-bold font-mono">
                          {billNo}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-mono font-medium">
                          {panVatNo}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {paidTo}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {driverName}
                        </td>
                        <td className="border border-slate-950 p-2 text-right font-bold font-mono">
                          {formattedAmount}
                        </td>
                        <td className="border border-slate-950 p-2 text-slate-700 italic select-all">
                          {remarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="border border-slate-950 p-10 text-center text-slate-400 italic">
                      चयन गरिएको महिना र फिल्टर अनुसार कुनै एम्बुलेन्स खर्च विवरण रेकर्ड भेटिएन।
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={7} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">
                    कुल जम्मा सिफारिस/खर्च रकम (Grand Total):
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmountSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
                </tr>
              </tbody>
            </table>
          ) : reportSource === 'Ambulance' ? (
            <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
              <thead>
                {renderPrintPageHeaderRow(10)}
                <tr className="bg-slate-50">
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">
                    सि.न.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[150px]">
                    सेवाग्राहीको नामथर
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-24">
                    बिल नं.
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
                    छुट/बक्यौता
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
                    const displayBillNo = record.billNo ? (useNepaliNumerals ? toNepaliDigits(record.billNo) : record.billNo) : '-';
                    const driverDetail = `${record.ambulanceNo ? formatNumberValue(record.ambulanceNo) : '-'} / ${record.driverName || '-'}`;
                    const displayDate = formatRawDateToNepaliUi(record.dateBs);
                    const odoText = (record.startOdometer !== undefined && record.endOdometer !== undefined)
                      ? ` [Odo: ${formatNumberValue(record.startOdometer)} ➔ ${formatNumberValue(record.endOdometer)}]`
                      : '';
                    const travelDetail = `${record.startLocation || '-'} ➔ ${record.destination || '-'} (${formatNumberValue(record.distanceKm || 0)} KM)${odoText}`;
                    const formattedCharged = formatNumberValue((record.amountCharged || 0).toFixed(2));
                    const formattedReceived = formatNumberValue((record.receivedAmount || 0).toFixed(2));
                    const baseRemarks = record.remarks || '';
                    const clientRemarks = baseRemarks.trim() ? baseRemarks : '-';
                    const isDue = (record.amountCharged || 0) - (record.receivedAmount || 0) > 0 && !record.isDiscounted;
                    const dueAmount = (record.amountCharged || 0) - (record.receivedAmount || 0);

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="border border-slate-950 p-2 text-center font-bold">
                          {sNoStr}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {clientName}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-bold font-mono">
                          {displayBillNo}
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
                        <td className="border border-slate-950 p-2 text-left font-bold text-xs">
                          {isDue && (
                            <div className="text-amber-700">बक्यौता: रु. {formatNumberValue(dueAmount.toFixed(2))}</div>
                          )}
                          {record.isDiscounted && (
                            <div className="text-indigo-700 italic font-normal text-[10px]">
                              छुट: {record.discountRecommendedBy || 'स्वयम'}
                              {record.discountAmount ? `, रु. ${formatNumberValue(record.discountAmount)}` : ''}
                              {record.discountPercentage ? `, ${formatNumberValue(record.discountPercentage)}%` : ''}
                            </div>
                          )}
                          {!isDue && !record.isDiscounted && '-'}
                        </td>
                        <td className="border border-slate-950 p-2 text-slate-700 italic select-all">
                          {clientRemarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="border border-slate-950 p-10 text-center text-slate-400 italic font-nepali">
                      चयन गरिएको महिना र फिल्टर अनुसार कुनै एम्बुलेन्स सेवा रेकर्ड भेटिएन।
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={6} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">
                    कुल जम्मा रकम (Grand Total):
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmbulanceChargedSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmountSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse border-2 border-slate-950 text-xs md:text-sm text-slate-900">
              <thead>
                {renderPrintPageHeaderRow(11)}
                <tr className="bg-slate-50">
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide w-12 font-nepali">
                    सि.न.
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali min-w-[150px]">
                    सेवाग्राहीको नामथर
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-center font-bold tracking-wide font-nepali w-24">
                    बिल नं.
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
                  <th className="border-2 border-slate-950 p-2 text-right font-bold tracking-wide font-nepali w-24 text-emerald-800">
                    प्रोत्साहन ({toNepaliDigits(ambulanceDriverIncentivePercent)}%)
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali w-24">
                    छुट/बक्यौता
                  </th>
                  <th className="border-2 border-slate-950 p-2 text-left font-bold tracking-wide font-nepali w-24">
                    कैफियत
                  </th>
                </tr>
              </thead>
              <tbody>
                {ambulanceDriverTripData.length > 0 ? (
                  ambulanceDriverTripData.map((item, index) => {
                    const record = item.trip;
                    const sNoStr = formatNumberValue(index + 1);
                    const clientName = record.patientName || '-';
                    const displayBillNo = record.billNo ? (useNepaliNumerals ? toNepaliDigits(record.billNo) : record.billNo) : '-';
                    const driverDetail = `${record.ambulanceNo ? formatNumberValue(record.ambulanceNo) : '-'} / ${record.driverName || '-'}`;
                    const displayDate = formatRawDateToNepaliUi(record.dateBs);
                    const odoText = (record.startOdometer !== undefined && record.endOdometer !== undefined)
                      ? ` [Odo: ${formatNumberValue(record.startOdometer)} ➔ ${formatNumberValue(record.endOdometer)}]`
                      : '';
                    const travelDetail = `${record.startLocation || '-'} ➔ ${record.destination || '-'} (${formatNumberValue(record.distanceKm || 0)} KM)${odoText}`;
                    const formattedCharged = formatNumberValue((record.amountCharged || 0).toFixed(2));
                    const formattedReceived = formatNumberValue(item.fareAmount.toFixed(2));
                    const formattedIncentive = formatNumberValue(item.incentiveAmount.toFixed(2));
                    const baseRemarks = record.remarks || '';
                    const clientRemarks = baseRemarks.trim() ? baseRemarks : '-';
                    const isDue = (record.amountCharged || 0) - (record.receivedAmount || 0) > 0 && !record.isDiscounted;
                    const dueAmount = (record.amountCharged || 0) - (record.receivedAmount || 0);

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="border border-slate-950 p-2 text-center font-bold">
                          {sNoStr}
                        </td>
                        <td className="border border-slate-950 p-2 font-medium">
                          {clientName}
                        </td>
                        <td className="border border-slate-950 p-2 text-center font-bold font-mono">
                          {displayBillNo}
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
                        <td className="border border-slate-950 p-2 text-right font-bold font-mono text-emerald-800 bg-emerald-50/30">
                          {formattedIncentive}
                        </td>
                        <td className="border border-slate-950 p-2 text-left font-bold text-xs">
                          {isDue && (
                            <div className="text-amber-700">बक्यौता: रु. {formatNumberValue(dueAmount.toFixed(2))}</div>
                          )}
                          {record.isDiscounted && (
                            <div className="text-indigo-700 italic font-normal text-[10px]">
                              छुट: {record.discountRecommendedBy || 'स्वयम'}
                              {record.discountAmount ? `, रु. ${formatNumberValue(record.discountAmount)}` : ''}
                              {record.discountPercentage ? `, ${formatNumberValue(record.discountPercentage)}%` : ''}
                            </div>
                          )}
                          {!isDue && !record.isDiscounted && '-'}
                        </td>
                        <td className="border border-slate-950 p-2 text-slate-700 italic select-all">
                          {clientRemarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="border border-slate-950 p-10 text-center text-slate-400 italic font-nepali">
                      चयन गरिएको महिना र फिल्टर अनुसार कुनै एम्बुलेन्स चालक प्रोत्साहन रेकर्ड भेटिएन।
                    </td>
                  </tr>
                )}
                {/* Grand Total Row */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={6} className="border-2 border-slate-950 p-2.5 text-right font-black font-nepali">
                    कुल जम्मा रकम (Grand Total):
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmbulanceChargedSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono">
                    {formatNumberValue(totalAmbulanceDriverFareSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5 text-right font-black font-mono text-emerald-900 bg-emerald-50/50">
                    {formatNumberValue(totalAmountSum.toFixed(2))}
                  </td>
                  <td className="border-2 border-slate-950 p-2.5"></td>
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
