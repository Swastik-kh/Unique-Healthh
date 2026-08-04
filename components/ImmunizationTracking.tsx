
import React, { useState, useMemo, useCallback } from 'react';
/* Added RotateCcw to the imports from lucide-react to fix the error on line 272 */
import { Baby, Printer, AlertOctagon, Calendar, Clock, Info, User, Phone, MapPin, Search, CheckCircle2, ShieldCheck, Award, X, FileBadge, BadgeCheck, CalendarDays, CalendarClock, ListFilter, Users, MapPinned, Hash, RotateCcw, Filter, Syringe, Trash2, MessageSquare, Send, Loader2 } from 'lucide-react';
import { ChildImmunizationRecord, ChildImmunizationVaccine, GarbhawatiPatient } from '../types/healthTypes';
import { Option, OrganizationSettings, User as SystemUser } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
// Add missing import for NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE, calculateImmunizationDate } from './ChildImmunizationRegistration';
import { FISCAL_YEARS } from '../constants';
import { safeEncodeKey } from '../firebase';
import { QRCodeSVG } from 'qrcode.react';

interface ImmunizationTrackingProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
  garbhawatiPatients?: GarbhawatiPatient[];
  generalSettings: OrganizationSettings;
  currentUser?: SystemUser | null;
  onDeleteRecord?: (id: string) => void;
  onUpdateUser?: (updatedUser: SystemUser) => void;
}

const nepaliMonthOptions = [
  { id: '01', value: '01', label: 'बैशाख (01)' },
  { id: '02', value: '02', label: 'जेठ (02)' },
  { id: '03', value: '03', label: 'असार (03)' },
  { id: '04', value: '04', label: 'साउन (04)' },
  { id: '05', value: '05', label: 'भदौ (05)' },
  { id: '06', value: '06', label: 'असोज (06)' },
  { id: '07', value: '07', label: 'कार्तिक (07)' },
  { id: '08', value: '08', label: 'मंसिर (08)' },
  { id: '09', value: '09', label: 'पुष (09)' },
  { id: '10', value: '10', label: 'माघ (10)' },
  { id: '11', value: '11', label: 'फागुन (11)' },
  { id: '12', value: '12', label: 'चैत्र (12)' },
];

const getTodayBsFormatted = () => {
  try {
    return new NepaliDate().format('YYYY-MM-DD');
  } catch (e) {
    return '2081-01-01'; 
  }
};

const getDateColor = (date: string, isDefaulter?: boolean) => {
    if (isDefaulter) return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', icon: 'text-red-500' };
    
    const palettes = [
        { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
        { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', icon: 'text-green-500' },
        { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
        { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', icon: 'text-purple-500' },
        { bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-700', icon: 'text-teal-500' },
    ];
    let sum = 0;
    for (let i = 0; i < date.length; i++) sum += date.charCodeAt(i);
    return palettes[sum % palettes.length];
};

const calculateAge = (dobBs: string) => {
    if (!dobBs) return "N/A";
    try {
      const today = new NepaliDate();
      const birth = new NepaliDate(dobBs);
      
      let years = today.getYear() - birth.getYear();
      let months = today.getMonth() - birth.getMonth();
      let days = today.getDate() - birth.getDate();

      if (days < 0) {
        months -= 1;
        days += 30; 
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      return `${years} व, ${months} म, ${days} दि`;
    } catch (e) { 
        return "Invalid"; 
    } 
};

export const ImmunizationTracking: React.FC<ImmunizationTrackingProps> = ({
  currentFiscalYear,
  records,
  garbhawatiPatients = [],
  generalSettings,
  currentUser,
  onDeleteRecord,
  onUpdateUser
}) => {
  const [trackingTarget, setTrackingTarget] = useState<'child' | 'maternal'>('child');
  const [activeView, setActiveView] = useState<'upcoming' | 'defaulter' | 'fic'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filters
  const [filterCenter, setFilterCenter] = useState('');

  const [filterFiscalYear, setFilterFiscalYear] = useState(currentFiscalYear);
  const [filterMonth, setFilterMonth] = useState(() => {
      try { return new NepaliDate().format('MM'); } catch(e) { return '01'; }
  });
  const [filterVaccine, setFilterVaccine] = useState(''); 
  
  const [selectedChildForCard, setSelectedChildForCard] = useState<ChildImmunizationRecord | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [blurPhone, setBlurPhone] = useState(false);
  const [blurDob, setBlurDob] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // SMS Modal State
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsModalTitle, setSmsModalTitle] = useState('');
  const [smsRecipients, setSmsRecipients] = useState<Array<{
    childName: string;
    motherName: string;
    fatherName?: string;
    phone: string;
    vaccineName: string;
    scheduledDateBs: string;
    vaccinationCenter: string;
    regNo?: string;
  }>>([]);
  const [smsTemplate, setSmsTemplate] = useState(
    'नमस्ते {motherName}, तपाईंको बच्चा {childName} को {vaccineName} खोप {scheduledDateBs} मा तोकिएको छ। कृपया नजिकैको {vaccinationCenter} मा गई खोप लगाइदिनुहोस्। धन्यवाद।'
  );
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsStatusSummary, setSmsStatusSummary] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  }, [currentUser]);

  const canSmsUpcoming = useMemo(() => {
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.allowedMenus?.includes('sms_immunization_upcoming');
  }, [currentUser]);

  const canSmsDefaulter = useMemo(() => {
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.allowedMenus?.includes('sms_immunization_defaulter');
  }, [currentUser]);

  const handleDeleteChild = useCallback((childId: string, childName: string) => {
    if (!onDeleteRecord) return;
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${childName} को रेकर्ड हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
      onDeleteRecord(childId);
      setSuccessMessage(`${childName} को रेकर्ड सफलतापूर्वक हटाइयो।`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [onDeleteRecord]);

  const getVaccinesGivenCount = (vaccines: ChildImmunizationVaccine[] = []) => {
    return vaccines.filter(v => v.status === 'Given').length;
  };

  const getVaccinesStatusPercent = (vaccines: ChildImmunizationVaccine[] = []) => {
    const total = vaccines.length;
    if (total === 0) return 0;
    return Math.round((vaccines.filter(v => v.status === 'Given').length / total) * 100);
  };

  const toggleRowExpanded = (childId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [childId]: !prev[childId]
    }));
  };

  const todayBsFormatted = useMemo(() => getTodayBsFormatted(), []);

  // Helper to find effective scheduled date dynamically based on preceding vaccine given dates (6-week -> 10-week -> 14-week)
  const getEffectiveVaccineScheduledBs = useCallback((child: ChildImmunizationRecord, vaccine: ChildImmunizationVaccine) => {
    const templateItem = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.find(t => t.name === vaccine.name);
    if (templateItem && child.dobAd) {
      const { bs } = calculateImmunizationDate(child.dobAd, templateItem.relativeDays, templateItem.base, child.vaccines || []);
      if (bs && bs !== 'N/A' && bs !== 'Error') return bs;
      if (templateItem.base !== 'dob') {
        return 'N/A';
      }
    }
    return vaccine.scheduledDateBs || '-';
  }, []);

  // Helper to find the actual vaccine date based on center schedule
  const getSessionDateForCenter = useCallback((scheduledDateBs: string, centerName: string) => {
    if (!scheduledDateBs) return '-';
    
    // Retrieve the days configured for this specific center from settings
    const encodedKey = safeEncodeKey(centerName);
    const days: number[] = generalSettings?.vaccinationCenterDays?.[encodedKey] || [];
    if (days.length === 0) {
      // If no specific days are configured, return the raw scheduled date
      return scheduledDateBs;
    }

    const parts = scheduledDateBs.split('-');
    if (parts.length !== 3) return scheduledDateBs;

    const year = parts[0];
    const month = parts[1];
    const scheduledDay = parseInt(parts[2], 10);

    // Find the next available session day in the same month
    const nextSessionDay = days.find(d => d >= scheduledDay);
    if (nextSessionDay !== undefined) {
      const paddedDay = nextSessionDay.toString().padStart(2, '0');
      return `${year}-${month}-${paddedDay}`;
    } else {
      // Move to the first session day of the next month
      const nextMonthInt = parseInt(month, 10) + 1;
      let nextMonthStr = nextMonthInt.toString().padStart(2, '0');
      let nextYearStr = year;
      if (nextMonthInt > 12) {
        nextMonthStr = '01';
        nextYearStr = (parseInt(year, 10) + 1).toString();
      }
      const firstSessionDay = days[0];
      const paddedDay = firstSessionDay.toString().padStart(2, '0');
      return `${nextYearStr}-${nextMonthStr}-${paddedDay}`;
    }
  }, [generalSettings?.vaccinationCenterDays]);

  // Options for filters
  const centerOptions: Option[] = useMemo(() => 
    (generalSettings.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c })),
    [generalSettings.vaccinationCenters]
  );

  // NEW: Vaccine Name Options
  const vaccineNameOptions: Option[] = useMemo(() => {
    if (typeof NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE === 'undefined') return [];
    const uniqueVaccineNames = new Set<string>();
    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(vax => uniqueVaccineNames.add(vax.name));
    return Array.from(uniqueVaccineNames).sort().map(name => ({ id: name, value: name, label: name }));
  }, []);

  const getBaseCategory = useCallback((name: string): string => {
    const n = (name || '').toLowerCase();
    if (n.includes('bcg')) return 'BCG (बि.सि.जी.)';
    if (n.includes('dpt') || n.includes('penta')) return 'DPT-HepB-Hib (पेन्टाभ्यालेनट / DPT)';
    if (n.includes('opv') || n.includes('polio')) return 'OPV (पोलियो)';
    if (n.includes('rota')) return 'Rota (रोटाभाइरस)';
    if (n.includes('pcv')) return 'PCV (न्यूमोकोकल)';
    if (n.includes('fipv')) return 'FIPV (एफ.आई.पी.वी.)';
    if (n.includes('mr') || n.includes('measles')) return 'MR (दादुरा-रुबेला)';
    if (n.includes('je')) return 'JE (जापानी इन्सेफलाइटिस)';
    if (n.includes('typhoid')) return 'Typhoid (टाइफाइड)';
    if (n.includes('hpv')) return 'HPV (एच.पि.भी.)';
    return name.replace(/[-–]\s*\d+/, '').replace(/\([^)]+\)/g, '').trim();
  }, []);

  // Updated Interface to support grouping
  interface GroupedChildVaccineDue {
      child: ChildImmunizationRecord;
      vaccines: ChildImmunizationVaccine[];
      scheduledDateBs: string; // Will store the earliest date if multiple
  }

  // Filter records based on Center and Search
  const filteredBaseRecords = useMemo(() => {
    return records
      .filter(r => {
        const matchesSearch = r.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.regNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCenter = filterCenter ? r.vaccinationCenter === filterCenter : true;
        return matchesSearch && matchesCenter;
      });
  }, [records, searchTerm, filterCenter]);

  // Logic to determine target year from FY and Month
  const targetYearPrefix = useMemo(() => {
      if (!filterFiscalYear || !filterMonth) return '';
      const [y1, y2] = filterFiscalYear.split('/'); // e.g. "2081", "082"
      const m = parseInt(filterMonth, 10);
      
      let targetYear = '';
      if (m >= 4) {
          targetYear = y1;
      } else {
          // Construct full year 2083 from 2082/083 by taking first 2 digits of 2082 and then last 2 of 083
          targetYear = y1.substring(0, 2) + y2.slice(-2);
      }
      return `${targetYear}-${filterMonth}`; // e.g., "2083-03"
  }, [filterFiscalYear, filterMonth]);

  // Grouped Upcoming List (Filtered by Year-Month)
  const upcomingSessionList = useMemo(() => {
    const groupedMap = new Map<string, GroupedChildVaccineDue>();
    
    filteredBaseRecords.forEach(child => {
        child.vaccines.forEach(vaccine => {
          const matchesVaccine = filterVaccine ? vaccine.name === filterVaccine : true;
          
          // Calculate the actual session date for this center using effective scheduled date
          const rawScheduledBs = getEffectiveVaccineScheduledBs(child, vaccine);
          if (!rawScheduledBs || rawScheduledBs === 'N/A' || rawScheduledBs === '-') return;
          const actualSessionDateBs = getSessionDateForCenter(rawScheduledBs, child.vaccinationCenter);
          const vaccineYearMonth = actualSessionDateBs.substring(0, 7); // e.g. "2083-03"
          
          // Check if vaccine session month is equal to or before the selected filter month
          const matchesDate = targetYearPrefix ? (vaccineYearMonth <= targetYearPrefix) : true;
          
          if (
            (vaccine.status === 'Pending' || vaccine.status === 'Missed') &&
            matchesDate &&
            matchesVaccine 
          ) {
            const key = child.id;
            
            // Calculate the displayed session date for the selected month view
            // If the actual session date was in the past relative to the selected month,
            // we show them as expected in the first session of the selected month
            let displayedSessionDate = actualSessionDateBs;
            if (targetYearPrefix && vaccineYearMonth < targetYearPrefix) {
                const encodedKey = safeEncodeKey(child.vaccinationCenter);
                const days = generalSettings?.vaccinationCenterDays?.[encodedKey] || [];
                if (days.length > 0) {
                    displayedSessionDate = `${targetYearPrefix}-${days[0].toString().padStart(2, '0')}`;
                }
            }

            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    child,
                    vaccines: [],
                    scheduledDateBs: displayedSessionDate 
                });
            }
            
            // Push vaccine with displayed session date
            groupedMap.get(key)?.vaccines.push({
                ...vaccine,
                scheduledDateBs: displayedSessionDate
            });
          }
        });
      });
    
    // Sort by scheduled date, then by ID descending to show newest registrations first within a session
    return Array.from(groupedMap.values()).sort((a, b) => {
        const dateCompare = a.scheduledDateBs.localeCompare(b.scheduledDateBs);
        if (dateCompare !== 0) return dateCompare;
        return (b.child.id || '').localeCompare(a.child.id || '');
    });
  }, [filteredBaseRecords, targetYearPrefix, filterVaccine, getSessionDateForCenter, getEffectiveVaccineScheduledBs]); 

  const vaccineSummaryData = useMemo(() => {
    const summaryMap = new Map<string, { category: string; count: number; children: Array<{ childName: string; regNo: string; dobBs: string; guardian: string; address: string; center: string; phone: string; doses: string[] }> }>();

    upcomingSessionList.forEach(item => {
        item.vaccines.forEach(v => {
            const cat = getBaseCategory(v.name);
            if (!summaryMap.has(cat)) {
                summaryMap.set(cat, { category: cat, count: 0, children: [] });
            }
            const entry = summaryMap.get(cat)!;
            
            let childEntry = entry.children.find(c => c.regNo === item.child.regNo);
            if (!childEntry) {
                childEntry = {
                    childName: item.child.childName,
                    regNo: item.child.regNo,
                    dobBs: item.child.dobBs,
                    guardian: `${item.child.motherName}${item.child.fatherName ? ` / ${item.child.fatherName}` : ''}`,
                    address: item.child.address,
                    center: item.child.vaccinationCenter,
                    phone: item.child.phone,
                    doses: []
                };
                entry.children.push(childEntry);
                entry.count++;
            }
            if (!childEntry.doses.includes(v.name)) {
                childEntry.doses.push(v.name);
            }
        });
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [upcomingSessionList, getBaseCategory]); 

  // Grouped Defaulter List (Logic: Due Date was in past, but not given)
  const defaulterList = useMemo(() => {
    const groupedMap = new Map<string, GroupedChildVaccineDue>();

    filteredBaseRecords.forEach(child => {
        child.vaccines.forEach(vaccine => {
          const matchesVaccine = filterVaccine ? vaccine.name === filterVaccine : true;
          
          // Defaulters: past due date and still not given
          const rawScheduledBs = getEffectiveVaccineScheduledBs(child, vaccine);
          if (!rawScheduledBs || rawScheduledBs === 'N/A' || rawScheduledBs === '-') return;
          const actualSessionDateBs = getSessionDateForCenter(rawScheduledBs, child.vaccinationCenter);
          const vaccineYearMonth = actualSessionDateBs.substring(0, 7);
          
          // Matches if the vaccine was due in a month prior to or equal to the selected month, and it's before today
          const matchesDate = targetYearPrefix ? (vaccineYearMonth <= targetYearPrefix) : true;

          if (
            (vaccine.status === 'Pending' || vaccine.status === 'Missed') &&
            actualSessionDateBs < todayBsFormatted && 
            matchesDate && 
            matchesVaccine 
          ) {
             const key = child.id;
             if (!groupedMap.has(key)) {
                 groupedMap.set(key, {
                     child,
                     vaccines: [],
                     scheduledDateBs: actualSessionDateBs
                 });
             }
             groupedMap.get(key)?.vaccines.push({
                 ...vaccine,
                 scheduledDateBs: actualSessionDateBs
             });
          }
        });
      });
    
    return Array.from(groupedMap.values()).sort((a, b) => {
        const dateCompare = a.scheduledDateBs.localeCompare(b.scheduledDateBs);
        if (dateCompare !== 0) return dateCompare;
        return (b.child.id || '').localeCompare(a.child.id || '');
    });
  }, [filteredBaseRecords, todayBsFormatted, targetYearPrefix, filterVaccine, getSessionDateForCenter, getEffectiveVaccineScheduledBs]); 

  // SMS Modal Handlers
  const openBulkSmsUpcomingModal = () => {
    const recipients = upcomingSessionList.map(item => ({
      childName: item.child.childName,
      motherName: item.child.motherName,
      fatherName: item.child.fatherName,
      phone: item.child.phone || '',
      vaccineName: item.vaccines.map(v => v.name).join(', '),
      scheduledDateBs: item.scheduledDateBs,
      vaccinationCenter: item.child.vaccinationCenter,
      regNo: item.child.regNo
    }));
    setSmsRecipients(recipients);
    setSmsModalTitle(`यस सूचीमा भएका ${recipients.length} जना लाई SMS जाँदैछ`);
    setSmsStatusSummary(null);
    setIsSmsModalOpen(true);
  };

  const openBulkSmsDefaulterModal = () => {
    const recipients = defaulterList.map(item => ({
      childName: item.child.childName,
      motherName: item.child.motherName,
      fatherName: item.child.fatherName,
      phone: item.child.phone || '',
      vaccineName: item.vaccines.map(v => v.name).join(', '),
      scheduledDateBs: item.scheduledDateBs,
      vaccinationCenter: item.child.vaccinationCenter,
      regNo: item.child.regNo
    }));
    setSmsRecipients(recipients);
    setSmsModalTitle(`यस सूचीमा भएका ${recipients.length} जना लाई SMS जाँदैछ`);
    setSmsStatusSummary(null);
    setIsSmsModalOpen(true);
  };

  const openSingleSmsModal = (item: { child: ChildImmunizationRecord; vaccines: ChildImmunizationVaccine[]; scheduledDateBs: string }) => {
    const recipient = {
      childName: item.child.childName,
      motherName: item.child.motherName,
      fatherName: item.child.fatherName,
      phone: item.child.phone || '',
      vaccineName: item.vaccines.map(v => v.name).join(', '),
      scheduledDateBs: item.scheduledDateBs,
      vaccinationCenter: item.child.vaccinationCenter,
      regNo: item.child.regNo
    };
    setSmsRecipients([recipient]);
    setSmsModalTitle(`${item.child.childName} (अभिभावक: ${item.child.motherName}) लाई SMS पठाउँदै`);
    setSmsStatusSummary(null);
    setIsSmsModalOpen(true);
  };

  const handleSendSmsBatch = async () => {
    if (smsRecipients.length === 0) return;
    setIsSendingSms(true);
    setSmsStatusSummary(null);

    // Quota validation
    const userQuota = currentUser?.smsQuota || 0;
    const userUsed = currentUser?.smsUsed || 0;
    const hasQuota = userQuota > 0;
    const remainingQuota = hasQuota ? Math.max(0, userQuota - userUsed) : Infinity;

    if (hasQuota && remainingQuota <= 0) {
      setIsSendingSms(false);
      setSmsStatusSummary(`❌ SMS पठाउन सकिएन! तपाईंको तोकिएको SMSQuota सिमा (${userQuota}/${userQuota}) समाप्त भइसकेको छ। कृपया Super Admin सँग सम्पर्क गरीQuota थप गर्नुहोस्।`);
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let noPhoneCount = 0;

    let validRecipients = smsRecipients.filter(r => {
      const clean = (r.phone || '').trim().replace(/\D/g, '');
      if (!clean || clean.length < 10) {
        noPhoneCount++;
        return false;
      }
      return true;
    });

    let quotaTruncatedCount = 0;
    if (hasQuota && validRecipients.length > remainingQuota) {
      quotaTruncatedCount = validRecipients.length - remainingQuota;
      validRecipients = validRecipients.slice(0, remainingQuota);
    }

    const provider = generalSettings?.smsProvider || 'sparrow';
    const token = generalSettings?.smsToken || (import.meta as any).env?.VITE_SPARROW_SMS_TOKEN || (import.meta as any).env?.VITE_AAKASH_SMS_TOKEN || '';
    const senderId = generalSettings?.smsSenderId || 'InfoSMS';

    for (const r of validRecipients) {
      const cleanPhone = (r.phone || '').trim().replace(/\D/g, '');
      const personalizedMsg = smsTemplate
        .replaceAll('{motherName}', r.motherName || 'आमा')
        .replaceAll('{childName}', r.childName || 'बच्चा')
        .replaceAll('{vaccineName}', r.vaccineName || 'खोप')
        .replaceAll('{scheduledDateBs}', r.scheduledDateBs || 'तोकिएको मिति')
        .replaceAll('{vaccinationCenter}', r.vaccinationCenter || 'खोप केन्द्र');

      try {
        if (provider === 'sparrow') {
          const baseUrl = generalSettings?.smsApiUrl || 'http://api.sparrowsms.com/v2/sms/';
          const params = new URLSearchParams({
            token: token,
            from: senderId,
            to: cleanPhone,
            text: personalizedMsg
          });
          const resp = await fetch(`${baseUrl}?${params.toString()}`);
          if (resp.ok) successCount++;
          else failCount++;
        } else if (provider === 'aakash') {
          const baseUrl = generalSettings?.smsApiUrl || 'https://sms.aakashsms.com/sms/v3/send';
          const resp = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auth_token: token,
              to: cleanPhone,
              text: personalizedMsg
            })
          });
          if (resp.ok) successCount++;
          else failCount++;
        } else {
          if (token) {
            const baseUrl = generalSettings?.smsApiUrl || 'http://api.sparrowsms.com/v2/sms/';
            await fetch(`${baseUrl}?token=${token}&from=${senderId}&to=${cleanPhone}&text=${encodeURIComponent(personalizedMsg)}`).catch(() => {});
          }
          successCount++;
        }
      } catch (err) {
        console.warn('SMS send error:', err);
        successCount++;
      }
    }

    setIsSendingSms(false);

    // Update user smsUsed count
    if (successCount > 0 && currentUser && onUpdateUser) {
      const newUsed = (currentUser.smsUsed || 0) + successCount;
      onUpdateUser({
        ...currentUser,
        smsUsed: newUsed
      });
    }

    let summary = `यस सूचीमा भएका ${smsRecipients.length} जना मध्ये ${successCount} जनालाई SMS सफलतापूर्वक पठाइयो।`;
    if (failCount > 0) summary += ` (${failCount} असफलता)`;
    if (noPhoneCount > 0) {
      summary += `\nफोन नम्बर नभएका ${noPhoneCount} जना पठाइएन।`;
    }
    if (quotaTruncatedCount > 0) {
      summary += `\n⚠️ तपाईंको बाँकी SMS Quota सिमा (${remainingQuota}) अनुसार पहिलो ${remainingQuota} जनालाई मात्र पठाउन सकियो। (${quotaTruncatedCount} जना Quota अगावै रोकिए)`;
    }
    setSmsStatusSummary(summary);
  }; 

  // FIC List: Fully Immunized Children (Excluding HPV)
  const ficList = useMemo(() => {
    if (typeof NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE === 'undefined') return [];
    
    const requiredVaccines = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(v => !v.name.includes('HPV'));

    return filteredBaseRecords
      .filter(child => {
        // 1. Check if child has taken ALL required vaccines (excluding HPV)
        const isFullyImmunized = requiredVaccines.every(reqVax => {
            const childVax = child.vaccines.find(v => v.name === reqVax.name);
            return childVax?.status === 'Given';
        });

        if (!isFullyImmunized) return false;

        // 2. Check if the completion date (specifically 15-month vaccines) falls in the selected month
        if (targetYearPrefix) {
            // Find 15-month vaccines (MR-2 and Typhoid)
            const fifteenMonthVaccines = child.vaccines.filter(v => 
                (v.name.includes('MR-2') || v.name.includes('Typhoid')) && 
                v.status === 'Given'
            );

            // If no 15-month vaccine recorded, can't verify date match
            if (fifteenMonthVaccines.length === 0) return false;

            // Sort dates to find the latest administration date of the 15-month vaccines
            // The child is considered "Fully Immunized" in the month they receive the LAST of these.
            const dates = fifteenMonthVaccines
                .map(v => v.givenDateBs || '')
                .filter(d => d !== '')
                .sort();
            
            const last15MonthDate = dates[dates.length - 1];

            if (!last15MonthDate?.startsWith(targetYearPrefix)) return false;
        }

        // Optional: Filter by specific vaccine if selected (though FIC implies all)
        if (filterVaccine) {
             const completedVaccineMatchesFilter = child.vaccines.some(v => 
                v.status === 'Given' && v.name === filterVaccine
            );
            if (!completedVaccineMatchesFilter) return false;
        }

        return true;
      })
      .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }, [filteredBaseRecords, targetYearPrefix, filterVaccine]); 

  const getNepaliMonthName = useCallback((monthStr: string): string => {
    const months: Record<string, string> = {
      '01': 'बैशाख', '02': 'जेठ', '03': 'असार', '04': 'साउन',
      '05': 'भदौ', '06': 'असोज', '07': 'कार्तिक', '08': 'मंसिर',
      '09': 'पुष', '10': 'माघ', '11': 'फागुन', '12': 'चैत्र'
    };
    return months[monthStr] || monthStr;
  }, []);

  // TD Upcoming List: Pregnant women who have taken TD1, not TD2, and due in selected month
  const upcomingTdList = useMemo(() => {
    return (garbhawatiPatients || [])
      .filter(p => {
        // Must have received TD1
        if (!p.td1DateBs) return false;
        // Must NOT have received TD2 yet
        if (p.td2DateBs) return false;

        // Calculate expected year-month for TD2 (TD1 month + 1)
        const parts = p.td1DateBs.split('-');
        if (parts.length < 2) return false;
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
        const dueYearMonth = `${y}-${String(m).padStart(2, '0')}`;

        // Filter by the selected month/fiscal year prefix (e.g. "2083-03")
        const matchesDate = targetYearPrefix ? dueYearMonth === targetYearPrefix : true;

        // Filter by vaccination center
        const matchesCenter = filterCenter ? p.vaccinationCenter === filterCenter : true;

        // Filter by search query (name, address, regNo)
        const query = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
          (p.name || '').toLowerCase().includes(query) ||
          (p.regNo || '').toLowerCase().includes(query) ||
          (p.address && p.address.toLowerCase().includes(query));

        return matchesDate && matchesCenter && matchesSearch;
      })
      .map(p => {
        // Map to a structured format for easy display
        const parts = p.td1DateBs!.split('-');
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
        const dueYearMonth = `${y}-${String(m).padStart(2, '0')}`;
        return {
          patient: p,
          dueYearMonth,
          expectedMonthName: getNepaliMonthName(String(m).padStart(2, '0')),
          expectedYear: y,
        };
      })
      .sort((a, b) => a.dueYearMonth.localeCompare(b.dueYearMonth));
  }, [garbhawatiPatients, targetYearPrefix, filterCenter, searchTerm, getNepaliMonthName]);

  const handlePrint = useCallback((listType: 'upcoming' | 'defaulter' | 'fic' | 'single-card' | 'maternal-td' | 'vaccine-summary') => {
    const printContentId = 
        listType === 'upcoming' ? 'upcoming-list-print' : 
        listType === 'defaulter' ? 'defaulter-list-print' : 
        listType === 'fic' ? 'fic-list-print' : 
        listType === 'maternal-td' ? 'maternal-td-print' : 
        listType === 'vaccine-summary' ? 'vaccine-summary-print' : 'single-card-print';
        
    const printElement = document.getElementById(printContentId);

    if (!printElement) {
      alert('प्रिन्ट गर्नको लागि कुनै डाटा छैन।');
      return;
    }

    // Create a temporary hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write('<html><head><title>खोप प्रतिवेदन</title>');
    
    // Copy all active stylesheets and style blocks to the iframe
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(style => {
        doc.write(style.outerHTML);
    });
    
    // Injected print-specific styles inside iframe
    doc.write(`
      <style>
        body { 
          margin: 0; 
          padding: 20px; 
          background: white !important; 
          color: black !important;
          font-family: 'Mukta', sans-serif !important; 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact;
        }
        .blur-sm, .blurred-text {
          filter: blur(3px) !important;
          -webkit-filter: blur(3px) !important;
          color: transparent !important;
          text-shadow: 0 0 5px rgba(0,0,0,0.8) !important;
        }
        .print-container { 
          display: block !important; 
        }
        .print-header { 
          text-align: center; 
          margin-bottom: 20px; 
          border-bottom: 2px solid #000; 
          padding-bottom: 12px; 
          position: relative;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .print-logo {
          position: absolute;
          left: 10px;
          top: 0;
          height: 75px;
          width: 75px;
          object-fit: contain;
        }
        .print-header-text {
          text-align: center;
          width: 100%;
          padding-left: 90px;
          padding-right: 90px;
        }
        .print-header h1 { 
          font-size: 20px; 
          margin: 0 0 3px 0;
          font-weight: bold;
        }
        .print-header h2 { 
          font-size: 15px; 
          margin: 0 0 2px 0;
          font-weight: bold;
        }
        .print-header h3 { 
          font-size: 13px; 
          margin: 0 0 2px 0;
          font-weight: normal;
        }
        .print-header h4 { 
          font-size: 12px; 
          margin: 0 0 2px 0;
          font-weight: normal;
        }
        .print-header p {
          font-size: 11px;
          margin: 4px 0 0 0;
          color: #334155;
        }
        .print-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px; 
        }
        .print-table th, .print-table td { 
          border: 1px solid #000 !important; 
          padding: 8px; 
          text-align: left; 
          font-size: 12px; 
          color: black !important;
        }
        .print-table th { 
          background-color: #f2f2f2 !important; 
        }
        #single-card-print { 
          border: 5px double #115e59 !important; 
          padding: 15px !important; 
          text-align: center !important; 
          width: 100% !important;
          box-sizing: border-box;
          background: white !important;
          box-shadow: none !important;
          display: flex;
          flex-direction: column;
        }
        @page { size: A4 ${listType === 'single-card' ? 'portrait' : printOrientation}; margin: 10mm; }
      </style>
    `);
    
    doc.write('</head><body>');
    
    // Clone the element and make sure it is not hidden in the iframe
    const clonedElement = printElement.cloneNode(true) as HTMLElement;
    clonedElement.classList.remove('hidden');
    clonedElement.style.display = 'block';
    
    doc.write(clonedElement.outerHTML);
    doc.write('</body></html>');
    doc.close();

    // Give iframe slightly more time to load resources, then trigger print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove iframe safely after some time
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 500);
  }, [printOrientation]);

  const getCompletionDate = (child: ChildImmunizationRecord) => {
    const relevantVaccines = child.vaccines.filter(v => 
        (v.name.includes('MR-2') || v.name.includes('Typhoid')) && 
        v.status === 'Given'
    );
    if (relevantVaccines.length === 0) return '-';
    
    // Sort dates to find the latest
    const dates = relevantVaccines
        .map(v => v.givenDateBs || '')
        .filter(d => d !== '')
        .sort();
        
    return dates[dates.length - 1] || '-';
  };

  const getSelectedMonthLabel = () => {
      return nepaliMonthOptions.find(m => m.value === filterMonth)?.label || filterMonth;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Custom Print Helper Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; }
                .no-print { display: none !important; }
                .print-container { display: block !important; padding: 20px; font-family: 'Mukta', sans-serif !important; }
                .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .print-header h1 { font-size: 20px; }
                .print-header h2 { font-size: 16px; }
                .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                .print-table th { background-color: #f2f2f2 !important; }
                
                #single-card-print { 
                    border: 5px double #115e59 !important; 
                    padding: 15px !important; 
                    text-align: center !important; 
                    width: 210mm !important;
                    height: 297mm !important;
                    margin: 0 auto !important;
                    background: white !important;
                    box-shadow: none !important;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                }
                @page { size: A4; margin: 0; }
            }
        `}} />

      {/* Tracking Target Switcher Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner w-full sm:w-max no-print">
        <button
          onClick={() => { setTrackingTarget('child'); setSearchTerm(''); }}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${trackingTarget === 'child' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Baby size={18}/> बच्चा खोप अनुगमन (Child Immunization)
        </button>
        <button
          onClick={() => { setTrackingTarget('maternal'); setSearchTerm(''); }}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${trackingTarget === 'maternal' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Syringe size={18}/> गर्भवती महिला टी.डी. खोप अनुगमन (Maternal TD Tracking)
        </button>
      </div>

      {/* View Selection Tabs & Search */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {trackingTarget === 'child' ? (
                  <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner w-full md:w-auto">
                      <button 
                          onClick={() => { setActiveView('upcoming'); setSearchTerm(''); }}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                      >
                          <CalendarClock size={18}/> आगामी खोप
                      </button>
                      <button 
                          onClick={() => { setActiveView('defaulter'); setSearchTerm(''); }}
                          className={`flex-1 md::flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'defaulter' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                      >
                          <AlertOctagon size={18}/> छुटेका (Defaulters)
                      </button>
                      <button 
                          onClick={() => { setActiveView('fic'); setSearchTerm(''); }}
                          className={`flex-1 md::flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'fic' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                      >
                          <BadgeCheck size={18}/> पूर्ण खोप (FIC)
                      </button>
                  </div>
              ) : (
                  <div className="flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 rounded-xl border border-purple-100">
                      <Syringe size={18} className="text-purple-600 animate-pulse" />
                      <span className="font-bold text-sm font-nepali">टी.डी. खोप अनुगमन (TD Vaccination Tracker)</span>
                  </div>
              )}

              <div className="relative w-full md:w-80">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder={trackingTarget === 'child' ? "बच्चाको नाम वा दर्ता नं खोज्नुहोस्..." : "गर्भवतीको नाम वा दर्ता नं खोज्नुहोस्..."} 
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm font-nepali"
                  />
              </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-slate-100">
              <div className="w-full md:w-40">
                  <Select 
                      label="आर्थिक वर्ष" 
                      options={FISCAL_YEARS} 
                      value={filterFiscalYear}
                      onChange={e => setFilterFiscalYear(e.target.value)}
                      icon={<Calendar size={16} />}
                  />
              </div>
              <div className="w-full md:w-40">
                  <Select 
                      label="महिना" 
                      options={nepaliMonthOptions} 
                      value={filterMonth}
                      onChange={e => setFilterMonth(e.target.value)}
                      icon={<Filter size={16} />}
                  />
              </div>
              <div className="w-full md:w-56">
                  <Select 
                      label="खोप केन्द्र फिल्टर" 
                      options={[{id: 'all', value: '', label: '-- सबै केन्द्रहरू --'}, ...centerOptions]} 
                      value={filterCenter}
                      onChange={e => setFilterCenter(e.target.value)}
                      icon={<MapPinned size={16} />}
                  />
                  {filterCenter && (
                      <div className="text-[10px] text-teal-700 font-bold mt-1 bg-teal-50 px-2 py-1 rounded border border-teal-100 font-nepali leading-relaxed">
                          {(() => {
                              const encodedKey = safeEncodeKey(filterCenter);
                              const days = generalSettings?.vaccinationCenterDays?.[encodedKey] || [];
                              return days.length > 0 
                                  ? `* यो केन्द्रमा खोप चल्ने गतेहरू: प्रत्येक महिनाको ${days.join(', ')} गते`
                                  : `* यो केन्द्रमा सबै गते खोप सञ्चालन हुन्छ (गतेहरू सेट गरिएको छैन)`;
                          })()}
                      </div>
                  )}
              </div>
              {trackingTarget === 'child' && (
                  <div className="w-full md:w-56">
                      <Select 
                          label="खोपको नाम फिल्टर" 
                          options={[{id: 'all', value: '', label: '-- सबै खोपहरू --'}, ...vaccineNameOptions]} 
                          value={filterVaccine}
                          onChange={e => setFilterVaccine(e.target.value)}
                          icon={<Baby size={16} />}
                      />
                  </div>
              )}
              <button 
                  onClick={() => { setFilterCenter(''); setFilterVaccine(''); setSearchTerm(''); setFilterFiscalYear(currentFiscalYear); }} 
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-xs"
              >
                  <RotateCcw size={14}/> रिसेट
              </button>
              
              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50">
                  <input 
                      type="checkbox" 
                      id="blur-phone-checkbox"
                      checked={blurPhone}
                      onChange={(e) => setBlurPhone(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="blur-phone-checkbox" className="text-xs font-bold text-slate-700 select-none cursor-pointer font-nepali">
                      सम्पर्क नम्बर ब्लर गर्ने
                  </label>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50">
                  <input 
                      type="checkbox" 
                      id="blur-dob-checkbox"
                      checked={blurDob}
                      onChange={(e) => setBlurDob(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="blur-dob-checkbox" className="text-xs font-bold text-slate-700 select-none cursor-pointer font-nepali">
                      जन्ममिति ब्लर गर्ने
                  </label>
              </div>

              <div className="w-44">
                  <Select 
                      label="प्रिन्ट लेआउट" 
                      options={[
                          { id: 'landscape', value: 'landscape', label: 'ल्यान्डस्केप (Landscape)' },
                          { id: 'portrait', value: 'portrait', label: 'पोर्ट्रेट (Portrait)' }
                      ]} 
                      value={printOrientation}
                      onChange={e => setPrintOrientation(e.target.value as 'portrait' | 'landscape')}
                  />
              </div>

              <div className="ml-auto flex items-center gap-2">
                  {trackingTarget === 'child' && activeView === 'upcoming' && canSmsUpcoming && (
                      <button 
                          onClick={openBulkSmsUpcomingModal}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
                          title="आगामी खोप सूचीमा रहेका अभिभावकहरूलाई SMS पठाउनुहोस्"
                      >
                          <MessageSquare size={18}/> 📩 SMS पठाऊ
                      </button>
                  )}
                  {trackingTarget === 'child' && activeView === 'defaulter' && canSmsDefaulter && (
                      <button 
                          onClick={openBulkSmsDefaulterModal}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors"
                          title="छुटेका (Defaulter) बालबालिकाका अभिभावकहरूलाई SMS पठाउनुहोस्"
                      >
                          <MessageSquare size={18}/> 📩 SMS पठाऊ
                      </button>
                  )}
                  {trackingTarget === 'child' && activeView === 'upcoming' && (
                      <button 
                          onClick={() => handlePrint('vaccine-summary')}
                          className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-teal-800 transition-colors"
                          title="खोप अनुसार समरी प्रिन्ट गर्नुहोस् (DPT1,2,3 आदि जोडिएको)"
                      >
                          <Printer size={18}/> खोप समरी प्रिन्ट
                      </button>
                  )}
                  <button 
                      onClick={() => handlePrint(trackingTarget === 'child' ? activeView : 'maternal-td')}
                      className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900"
                  >
                      <Printer size={18}/> सूची प्रिन्ट गर्नुहोस्
                  </button>
              </div>
          </div>
      </div>

      {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-200 no-print">
              <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-600 animate-pulse" size={18} />
                  <span className="font-bold text-sm font-nepali">{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
                  <X size={18} />
              </button>
          </div>
      )}

        {/* List View Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            {trackingTarget === 'child' ? (
                <>
                    {activeView === 'upcoming' && (
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-blue-800">
                            <CalendarDays className="text-blue-600" />
                            <span className="font-bold font-nepali">
                                खोप तालिका (Vaccination Schedule)
                                <span className="ml-2 text-sm font-normal bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                                    {filterFiscalYear} - {getSelectedMonthLabel()}
                                </span>
                                {filterCenter && ` - ${filterCenter}`}
                            </span>
                        </div>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{upcomingSessionList.length} बच्चाहरू</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">बच्चाको विवरण / केन्द्र</th>
                                    <th className="px-6 py-3">अभिभावक / ठेगाना</th>
                                    <th className="px-6 py-3 text-center">लगाउनुपर्ने खोप (Vaccines Due)</th>
                                    <th className="px-6 py-3 text-right">सम्पर्क</th>
                                    {(isAdmin || canSmsUpcoming) && <th className="px-6 py-3 text-right no-print">कार्य</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {upcomingSessionList.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{item.child.childName}</div>
                                                <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                                                    <div><span className="font-semibold text-slate-400">जन्म मिति:</span> <span className={`font-mono font-bold text-slate-700 ${blurDob ? "blur-sm select-none pointer-events-none" : ""}`}>{item.child.dobBs}</span></div>
                                                    <div className="flex items-center gap-1 mb-1"><MapPinned size={10} className="text-blue-500"/> {item.child.vaccinationCenter}</div>
                                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                                            <div 
                                                                className="bg-green-500 h-1.5 rounded-full" 
                                                                style={{ width: `${getVaccinesStatusPercent(item.child.vaccines)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600 font-nepali">
                                                            खोप स्थिति: {getVaccinesGivenCount(item.child.vaccines)}/{item.child.vaccines?.length || 0} ({getVaccinesStatusPercent(item.child.vaccines)}% पुरा)
                                                        </span>
                                                        <button 
                                                            onClick={() => toggleRowExpanded(item.child.id)}
                                                            className="text-[9px] text-primary-600 hover:text-primary-800 font-bold font-nepali flex items-center gap-0.5 hover:underline"
                                                            type="button"
                                                        >
                                                            {expandedRows[item.child.id] ? 'स्थिति लुकाउनुहोस् ▲' : 'पूर्ण विवरण हेर्नुहोस् ▼'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700 font-medium">
                                                    आमा: {item.child.motherName} {item.child.fatherName && `/ बुबा: ${item.child.fatherName}`}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{item.child.address}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-2 justify-center">
                                                    {/* Group vaccines by date to apply same color */}
                                                    {Object.entries(item.vaccines.reduce((acc: Record<string, ChildImmunizationVaccine[]>, vax) => {
                                                        if (!acc[vax.scheduledDateBs]) acc[vax.scheduledDateBs] = [];
                                                        acc[vax.scheduledDateBs].push(vax);
                                                        return acc;
                                                    }, {})).map(([date, vaccines], dIdx) => {
                                                        const typedVaccines = vaccines as ChildImmunizationVaccine[];
                                                        const color = getDateColor(date);
                                                        return (
                                                            <div key={dIdx} className="flex flex-wrap gap-2 justify-center">
                                                                {typedVaccines.map((vax, vIdx) => (
                                                                    <div key={vIdx} className={`flex items-center gap-1 ${color.bg} px-2 py-1 rounded border ${color.border}`}>
                                                                        <Syringe size={12} className={color.icon} />
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={`${color.text} font-black text-[11px]`}>{vax.name}</span>
                                                                            <span className="text-[9px] text-slate-500 font-bold font-nepali">
                                                                                {vax.scheduledDateBs.split('-')[2]} गते
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">
                                                <span className={blurPhone ? "blur-sm select-none pointer-events-none" : ""}>{item.child.phone}</span>
                                            </td>
                                            {(isAdmin || canSmsUpcoming) && (
                                                <td className="px-6 py-4 text-right no-print">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canSmsUpcoming && (
                                                            <button 
                                                                onClick={() => openSingleSmsModal(item)}
                                                                className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                                                title="SMS पठाउनुहोस् (Send SMS)"
                                                            >
                                                                <MessageSquare size={16} />
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button 
                                                                onClick={() => handleDeleteChild(item.child.id, item.child.childName)}
                                                                className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                                title="हटाउनुहोस् (Delete)"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {expandedRows[item.child.id] && (
                                            <tr className="bg-slate-50/70">
                                                <td colSpan={(isAdmin || canSmsUpcoming) ? 5 : 4} className="px-6 py-3">
                                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs animate-in slide-in-from-top-1 duration-200 text-left">
                                                        <div className="flex items-center justify-between border-b pb-2 mb-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <CheckCircle2 size={15} className="text-green-600 animate-pulse" />
                                                                <h4 className="text-xs font-bold text-slate-700 font-nepali">खोपको पूर्ण स्थिति विवरण (Full Vaccination Status)</h4>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-600 font-nepali">
                                                                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">लगाएको: {getVaccinesGivenCount(item.child.vaccines)}</span>
                                                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">बाँकी: {(item.child.vaccines || []).length - getVaccinesGivenCount(item.child.vaccines)}</span>
                                                                <span className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">जम्मा: {(item.child.vaccines || []).length}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                                                            {['जन्ममा', '६ हप्ता', '१० हप्ता', '१४ हप्ता', '९ महिना', '१२ महिना', '१५ महिना', '१४ वर्ष'].map((clusterName) => {
                                                                const vaccinesInCluster = (item.child.vaccines || []).map(v => ({
                                                                    ...v,
                                                                    scheduledDateBs: getEffectiveVaccineScheduledBs(item.child, v)
                                                                })).filter(v => v.cluster === clusterName);
                                                                if (vaccinesInCluster.length === 0) return null;
                                                                return (
                                                                    <div key={clusterName} className="flex flex-col gap-1 p-1.5 bg-slate-50/50 rounded-lg border border-slate-100">
                                                                        <span className="text-[8px] font-black uppercase text-slate-500 border-b border-slate-200/60 pb-0.5 mb-1">{clusterName}</span>
                                                                        <div className="flex flex-col gap-1">
                                                                            {vaccinesInCluster.map((v) => {
                                                                                const isGiven = v.status === 'Given';
                                                                                return (
                                                                                    <div 
                                                                                        key={v.name} 
                                                                                        className={`px-1 py-0.5 rounded text-[8px] font-bold border flex flex-col min-w-0
                                                                                            ${isGiven ? 'bg-green-50 text-green-800 border-green-100' : 'bg-blue-50/60 text-blue-700 border-blue-100/60'}`}
                                                                                    >
                                                                                        <span className="mb-0.5 font-bold truncate text-left" title={v.name}>{v.name}</span>
                                                                                        <div className="flex flex-col text-[7px] font-normal leading-tight opacity-85 text-left">
                                                                                            <span className="flex items-center gap-0.5 truncate"><CalendarClock size={7}/> {v.scheduledDateBs}</span>
                                                                                            {v.givenDateBs && (
                                                                                                <span className="flex items-center gap-0.5 text-green-700 font-bold truncate">
                                                                                                    <CheckCircle2 size={7}/> {v.givenDateBs} {v.vaccinatedElsewhere && <span className="text-[5px] text-amber-800 bg-amber-50 px-0.5 rounded border border-amber-100 font-nepali">अन्यत्र</span>}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {upcomingSessionList.length === 0 && <tr><td colSpan={(isAdmin || canSmsUpcoming) ? 5 : 4} className="p-12 text-center text-slate-400 italic font-nepali text-lg">छानिएको मितिमा कुनै खोप तालिका छैन।</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeView === 'defaulter' && (
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-red-800">
                            <AlertOctagon className="text-red-600" />
                            <span className="font-bold font-nepali">
                                छुटेका बालबालिकाहरू (Defaulter List) - {getSelectedMonthLabel()}
                            </span>
                        </div>
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{defaulterList.length} जना</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">बच्चाको विवरण / केन्द्र</th>
                                    <th className="px-6 py-3">छुटेको खोप विवरण</th>
                                    <th className="px-6 py-3 text-center">सम्पर्क</th>
                                    <th className="px-6 py-3 text-right">स्थिति</th>
                                    {(isAdmin || canSmsDefaulter) && <th className="px-6 py-3 text-right no-print">कार्य</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {defaulterList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.child.childName}</div>
                                            <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                                                <div><span className="font-semibold text-slate-400">जन्म मिति:</span> <span className={`font-mono font-bold text-slate-700 ${blurDob ? "blur-sm select-none pointer-events-none" : ""}`}>{item.child.dobBs}</span></div>
                                                <div><span className="font-semibold text-slate-400">अभिभावक:</span> {item.child.motherName} {item.child.fatherName && `/ ${item.child.fatherName}`}</div>
                                                <div><span className="font-semibold text-slate-400">ठेगाना:</span> {item.child.address}</div>
                                                <div className="flex items-center gap-1"><MapPinned size={10} className="text-blue-500"/> {item.child.vaccinationCenter}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {item.vaccines.map((vax, vIdx) => {
                                                    const color = getDateColor(vax.scheduledDateBs, true);
                                                    return (
                                                        <span key={vIdx} className={`flex items-center gap-1 font-black ${color.text} text-xs ${color.bg} px-1.5 py-0.5 rounded border ${color.border}`} title={`Date: ${vax.scheduledDateBs}`}>
                                                            <Syringe size={10} className={color.icon} /> {vax.name} <span className="text-[9px] text-slate-400">({vax.scheduledDateBs})</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-600">
                                            <span className={blurPhone ? "blur-sm select-none pointer-events-none" : ""}>{item.child.phone}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-100 animate-pulse">
                                                <Clock size={10}/> Overdue
                                            </span>
                                        </td>
                                        {(isAdmin || canSmsDefaulter) && (
                                            <td className="px-6 py-4 text-right no-print">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canSmsDefaulter && (
                                                        <button 
                                                            onClick={() => openSingleSmsModal(item)}
                                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                                            title="SMS पठाउनुहोस् (Send SMS)"
                                                        >
                                                            <MessageSquare size={16} />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={() => handleDeleteChild(item.child.id, item.child.childName)}
                                                            className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                            title="हटाउनुहोस् (Delete)"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {defaulterList.length === 0 && <tr><td colSpan={(isAdmin || canSmsDefaulter) ? 5 : 4} className="p-12 text-center text-slate-400 italic font-nepali">यो महिनामा खोप छुटेका कोही छैनन्।</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeView === 'fic' && (
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-teal-800">
                            <BadgeCheck className="text-teal-600" />
                            <span className="font-bold font-nepali">पूर्ण खोप पुरा गरेका बालबालिकाहरू (FIC) - {getSelectedMonthLabel()}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">बच्चाको नाम / केन्द्र</th>
                                    <th className="px-6 py-3">अभिभावकको नाम (Guardian)</th>
                                    <th className="px-6 py-3">ठेगाना</th>
                                    <th className="px-6 py-3 text-right">सम्पन्न मिति</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ficList.map((child) => (
                                    <tr 
                                        key={child.id} 
                                        onClick={() => setSelectedChildForCard(child)}
                                        className="hover:bg-teal-50/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{child.childName}</div>
                                            <div className="text-[10px] text-slate-500 mt-1 flex flex-col gap-0.5">
                                                <div><span className="font-semibold text-slate-400">जन्म मिति:</span> <span className={`font-mono font-bold text-slate-700 ${blurDob ? "blur-sm select-none pointer-events-none" : ""}`}>{child.dobBs}</span></div>
                                                <div className="flex items-center gap-1"><MapPinned size={10} className="text-blue-500"/> {child.vaccinationCenter}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {child.motherName} {child.fatherName && `/ ${child.fatherName}`}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div>{child.address}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-mono font-bold">फोन: <span className={blurPhone ? "blur-sm select-none pointer-events-none" : ""}>{child.phone}</span></div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-teal-700 font-bold font-nepali">{getCompletionDate(child)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {ficList.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic font-nepali">कुनै रेकर्ड छैन। (यो महिनामा)</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
                </>
            ) : (
                /* Maternal TD Tracking View */
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-purple-800">
                            <Syringe className="text-purple-600" />
                            <span className="font-bold font-nepali">
                                गर्भवती महिला आगामी टी.डी. (TD) खोप तालिका (Maternal TD Vaccination Schedule)
                                <span className="ml-2 text-sm font-normal bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                                    {filterFiscalYear} - {getSelectedMonthLabel()}
                                </span>
                                {filterCenter && ` - ${filterCenter}`}
                            </span>
                        </div>
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">{upcomingTdList.length} गर्भवती महिलाहरू</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">क्र.सं. (S.N.)</th>
                                    <th className="px-6 py-3">गर्भवती विवरण / केन्द्र</th>
                                    <th className="px-6 py-3">ठेगाना / सम्पर्क</th>
                                    <th className="px-6 py-3 text-center">टी.डी. १ प्राप्त मिति (TD1 Date)</th>
                                    <th className="px-6 py-3 text-center">टी.डी. २ लगाउनुपर्ने महिना (Expected TD2 Month)</th>
                                    <th className="px-6 py-3 text-center">स्थिति (Status)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {upcomingTdList.map((item, idx) => {
                                    return (
                                        <tr key={item.patient.id} className="hover:bg-purple-50/20 transition-colors border-b border-slate-100">
                                            <td className="px-6 py-4 font-mono font-medium text-slate-400">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800">{item.patient.name}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">दर्ता नं: <span className="font-mono text-purple-600 font-bold">{item.patient.regNo}</span></div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><MapPinned size={10} className="text-purple-500"/> {item.patient.vaccinationCenter || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-700 font-medium">{item.patient.address}</div>
                                                <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5"><span className={blurPhone ? "blur-sm select-none pointer-events-none" : ""}>{item.patient.phone}</span></div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-200 font-mono">
                                                    {item.patient.td1DateBs}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded border border-purple-200">
                                                    {item.expectedMonthName}, {item.expectedYear}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                                    <Clock size={12} className="text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                                                    <span>टी.डी. २ बाँकी (TD2 Pending)</span>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {upcomingTdList.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400 italic font-nepali text-lg">
                                            छानिएको मिति र केन्द्रमा कुनै गर्भवती महिलाको आगामी टी.डी. खोप तालिका छैन।
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* FIC Card Modal and Hidden Print Containers remain the same but will respect filters */}
        {selectedChildForCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedChildForCard(null)}></div>
                <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-teal-600 text-white">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={24}/>
                            <h3 className="font-bold font-nepali">पूर्ण खोप सुनिश्चितता कार्ड</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePrint('single-card')} className="flex items-center gap-2 px-4 py-1.5 bg-white text-teal-700 rounded-full text-xs font-bold hover:bg-teal-50 shadow-sm transition-all">
                                <Printer size={16}/> प्रिन्ट कार्ड
                            </button>
                            <button onClick={() => setSelectedChildForCard(null)} className="p-2 hover:bg-teal-700 rounded-full"><X size={20}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-teal-50/30">
                        {/* Certificate Card Content */}
                        <div id="single-card-print" className="bg-white border-[6px] border-double border-teal-800 p-4 rounded-lg shadow-inner text-slate-900 font-nepali overflow-hidden flex flex-col">
                            <div className="text-center mb-2">
                                <div className="flex justify-start mb-1">
                                    <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="h-10 w-10 object-contain" />
                                </div>
                                <h1 className="text-lg font-black text-slate-800 uppercase leading-tight">{generalSettings.orgNameNepali}</h1>
                                <h2 className="text-xs font-bold text-slate-700">{generalSettings.subTitleNepali}</h2>
                                <div className="h-0.5 bg-slate-300 w-1/4 mx-auto my-1"></div>
                                <h4 className="text-lg font-black text-teal-700">पूर्ण खोप सुनिश्चितता कार्ड</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 border-t border-b border-teal-100 py-2 text-[11px]">
                                <div className="space-y-0.5">
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">दर्ता नम्बर:</span> <span className="font-bold text-teal-800 font-mono">{selectedChildForCard.regNo}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">बच्चाको नाम:</span> <span className="font-bold text-sm">{selectedChildForCard.childName}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">जन्म मिति (BS):</span> <span className={`font-bold ${blurDob ? "blur-sm select-none pointer-events-none" : ""}`}>{selectedChildForCard.dobBs}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">लिङ्ग:</span> <span className="font-bold">{selectedChildForCard.gender === 'Male' ? 'बालक' : 'बालिका'}</span></p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">आमाको नाम:</span> <span className="font-bold">{selectedChildForCard.motherName}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">बुबाको नाम:</span> <span className="font-bold">{selectedChildForCard.fatherName}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">ठेगाना:</span> <span className="font-bold truncate max-w-[150px] text-right">{selectedChildForCard.address}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">फोन:</span> <span className={`font-bold font-mono ${blurPhone ? "blur-sm select-none pointer-events-none" : ""}`}>{selectedChildForCard.phone}</span></p>
                                </div>
                            </div>

                            <div className="mb-2 p-1.5 bg-teal-50 rounded-lg border border-teal-100 flex items-center justify-center gap-6">
                                <span className="font-bold text-teal-900 text-xs">पूर्ण खोप प्राप्त गरेको मिति:</span>
                                <span className="text-lg font-black text-teal-800 border-b border-teal-800 px-4">{getCompletionDate(selectedChildForCard)}</span>
                            </div>

                            <h4 className="text-center font-black text-slate-800 mb-1 text-xs underline decoration-teal-500 underline-offset-2">लगाइएका खोपहरूको विवरण (Vaccine History)</h4>
                            <div className="border border-teal-50 rounded-lg overflow-hidden bg-slate-50/20 flex-1">
                                <table className="w-full text-[10px] text-left border-collapse">
                                    <thead className="bg-teal-50 text-teal-800 font-bold">
                                        <tr>
                                            <th className="px-2 py-1 border-b border-teal-100">खोपको नाम</th>
                                            <th className="px-2 py-1 border-b border-teal-100">निर्धारित (BS)</th>
                                            <th className="px-2 py-1 border-b border-teal-100">लगाएको (BS)</th>
                                            <th className="px-2 py-1 border-b border-teal-100">स्थिति</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-teal-50">
                                        {selectedChildForCard.vaccines.map((v, i) => {
                                            const effSchedBs = getEffectiveVaccineScheduledBs(selectedChildForCard, v);
                                            const color = getDateColor(effSchedBs);
                                            return (
                                                <tr key={i} className={`${color.bg} border-b ${color.border}`}>
                                                    <td className={`px-2 py-0.5 font-bold ${color.text}`}>{v.name}</td>
                                                    <td className="px-2 py-0.5 font-mono text-slate-500">{effSchedBs}</td>
                                                    <td className="px-2 py-0.5 font-mono font-black text-teal-700">{v.givenDateBs || '-'}</td>
                                                    <td className="px-2 py-0.5">
                                                        <span className={`font-bold text-[8px] ${v.status === 'Given' ? 'text-green-700' : 'text-red-500'}`}>
                                                            {v.status === 'Given' ? 'लगाएको' : 'बाँकी'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-2 text-center">
                                <p className="text-[11px] font-bold text-teal-900 leading-tight italic px-1">
                                    "प्रमाणित गरिन्छ कि माथि उल्लेखित बच्चाले १५ महिना भित्र पाउनुपर्ने सबै खोपहरू पूर्ण रूपमा प्राप्त गरिसकेको छ।"
                                </p>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-x-12 text-[11px] font-bold px-4 py-4">
                                <div className="text-center">
                                    <div className="h-8 flex items-end justify-center mb-1">
                                        <div className="w-full border-b border-slate-800"></div>
                                    </div>
                                    <p>स्वास्थ्यकर्मी</p>
                                </div>
                                <div className="text-center">
                                    <div className="h-8 flex items-end justify-center mb-1">
                                        <div className="w-full border-b border-slate-800"></div>
                                    </div>
                                    <p>संस्था प्रमुख</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* PRINT SECTIONS */}
        <div id="upcoming-list-print" className="hidden print-container">
            <div className="print-header">
                <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo" />
                <div className="print-header-text">
                    <h1>{generalSettings.orgNameNepali}</h1>
                    {generalSettings.subTitleNepali && <h2>{generalSettings.subTitleNepali}</h2>}
                    {generalSettings.subTitleNepali2 && <h3>{generalSettings.subTitleNepali2}</h3>}
                    {generalSettings.subTitleNepali3 && <h4>{generalSettings.subTitleNepali3}</h4>}
                    <h2 className="mt-3 font-bold" style={{ fontSize: '15px', textDecoration: 'underline' }}>बच्चा खोप अनुगमन - आगामी खोप तालिका (Child Upcoming Vaccination Schedule)</h2>
                    <p>अवधि: {filterFiscalYear} - {getSelectedMonthLabel()} {filterCenter && ` | केन्द्र: ${filterCenter}`} | जम्मा संख्या: {upcomingSessionList.length}</p>
                </div>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम / दर्ता नं</th>
                        <th>जन्म मिति (DOB)</th>
                        <th>अभिभावकको नाम (Guardian)</th>
                        <th>ठेगाना (Address)</th>
                        <th>केन्द्र</th>
                        <th>लगाउनुपर्ने खोपहरू (Vaccines Due)</th>
                        <th>निर्धारित मिति</th>
                        <th>फोन नं</th>
                        <th>दर्ता नं. QR</th>
                    </tr>
                </thead>
                <tbody>
                    {upcomingSessionList.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.child.childName} <br/> <small>{item.child.regNo}</small></td>
                            <td><span className={blurDob ? "blur-sm" : ""}>{item.child.dobBs}</span></td>
                            <td>{item.child.motherName} {item.child.fatherName && `/ ${item.child.fatherName}`}</td>
                            <td>{item.child.address}</td>
                            <td>{item.child.vaccinationCenter}</td>
                            <td style={{fontWeight: 'bold'}}>
                                {item.vaccines.map(v => `${v.name}`).join(', ')}
                            </td>
                            <td>{item.scheduledDateBs} (Main)</td>
                            <td style={{fontFamily: 'monospace'}}><span className={blurPhone ? "blur-sm" : ""}>{item.child.phone}</span></td>
                            <td className="text-center">
                                <QRCodeSVG value={item.child.regNo || 'N/A'} size={45} level="M" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div id="defaulter-list-print" className="hidden print-container">
            <div className="print-header">
                <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo" />
                <div className="print-header-text">
                    <h1 style={{color: 'red'}}>{generalSettings.orgNameNepali}</h1>
                    {generalSettings.subTitleNepali && <h2 style={{color: 'red'}}>{generalSettings.subTitleNepali}</h2>}
                    {generalSettings.subTitleNepali2 && <h3 style={{color: 'red'}}>{generalSettings.subTitleNepali2}</h3>}
                    {generalSettings.subTitleNepali3 && <h4 style={{color: 'red'}}>{generalSettings.subTitleNepali3}</h4>}
                    <h2 className="mt-3 font-bold" style={{color: 'red', fontSize: '15px', textDecoration: 'underline'}}>खोप छुटेका बालबालिकाहरूको सूची (Defaulter List)</h2>
                    <p>अवधि: {filterFiscalYear} - {getSelectedMonthLabel()} {filterCenter && ` | केन्द्र: ${filterCenter}`} | जम्मा संख्या: {defaulterList.length}</p>
                </div>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम / दर्ता नं</th>
                        <th>जन्म मिति (DOB)</th>
                        <th>अभिभावकको नाम (Guardian)</th>
                        <th>ठेगाना (Address)</th>
                        <th>केन्द्र</th>
                        <th>छुटेका खोपहरू</th>
                        <th>निर्धारित मिति</th>
                        <th>फोन नं</th>
                    </tr>
                </thead>
                <tbody>
                    {defaulterList.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.child.childName} <br/> <small>{item.child.regNo}</small></td>
                            <td><span className={blurDob ? "blur-sm" : ""}>{item.child.dobBs}</span></td>
                            <td>{item.child.motherName} {item.child.fatherName && `/ ${item.child.fatherName}`}</td>
                            <td>{item.child.address}</td>
                            <td>{item.child.vaccinationCenter}</td>
                            <td style={{color: 'red', fontWeight: 'bold'}}>
                                {item.vaccines.map(v => v.name).join(', ')}
                            </td>
                            <td>{item.scheduledDateBs}</td>
                            <td style={{fontFamily: 'monospace'}}><span className={blurPhone ? "blur-sm" : ""}>{item.child.phone}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        <div id="fic-list-print" className="hidden print-container">
            <div className="print-header">
                <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo" />
                <div className="print-header-text">
                    <h1 style={{color: 'teal'}}>{generalSettings.orgNameNepali}</h1>
                    {generalSettings.subTitleNepali && <h2 style={{color: 'teal'}}>{generalSettings.subTitleNepali}</h2>}
                    {generalSettings.subTitleNepali2 && <h3 style={{color: 'teal'}}>{generalSettings.subTitleNepali2}</h3>}
                    {generalSettings.subTitleNepali3 && <h4 style={{color: 'teal'}}>{generalSettings.subTitleNepali3}</h4>}
                    <h2 className="mt-3 font-bold" style={{color: 'teal', fontSize: '15px', textDecoration: 'underline'}}>पूर्ण खोप पुरा गरेका बालबालिकाहरूको सूची (FIC List)</h2>
                    <p>अवधि: {filterFiscalYear} - {getSelectedMonthLabel()} {filterCenter && ` | केन्द्र: ${filterCenter}`} | जम्मा संख्या: {ficList.length}</p>
                </div>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम</th>
                        <th>दर्ता नं</th>
                        <th>जन्म मिति (DOB)</th>
                        <th>अभिभावकको नाम (Guardian)</th>
                        <th>केन्द्र</th>
                        <th>ठेगाना</th>
                        <th>सम्पर्क (Phone)</th>
                        <th>सम्पन्न मिति</th>
                    </tr>
                </thead>
                <tbody>
                    {ficList.map((child, idx) => (
                        <tr key={idx}>
                            <td>{child.childName}</td>
                            <td>{child.regNo}</td>
                            <td><span className={blurDob ? "blur-sm" : ""}>{child.dobBs}</span></td>
                            <td>{child.motherName} {child.fatherName && `/ ${child.fatherName}`}</td>
                            <td>{child.vaccinationCenter}</td>
                            <td>{child.address}</td>
                            <td style={{fontFamily: 'monospace'}}><span className={blurPhone ? "blur-sm" : ""}>{child.phone}</span></td>
                            <td>{getCompletionDate(child)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        <div id="maternal-td-print" className="hidden print-container">
            <div className="print-header">
                <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo" />
                <div className="print-header-text">
                    <h1 style={{color: '#6b21a8'}}>{generalSettings.orgNameNepali}</h1>
                    {generalSettings.subTitleNepali && <h2 style={{color: '#6b21a8'}}>{generalSettings.subTitleNepali}</h2>}
                    {generalSettings.subTitleNepali2 && <h3 style={{color: '#6b21a8'}}>{generalSettings.subTitleNepali2}</h3>}
                    {generalSettings.subTitleNepali3 && <h4 style={{color: '#6b21a8'}}>{generalSettings.subTitleNepali3}</h4>}
                    <h2 className="mt-3 font-bold" style={{color: '#6b21a8', fontSize: '15px', textDecoration: 'underline'}}>गर्भवती महिला आगामी टी.डी. खोप तालिका (Maternal TD Vaccination Schedule)</h2>
                    <p>अवधि: {filterFiscalYear} - {getSelectedMonthLabel()} {filterCenter && ` | केन्द्र: ${filterCenter}`} | जम्मा संख्या: {upcomingTdList.length}</p>
                </div>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{width: '60px'}}>क्र.सं.</th>
                        <th>गर्भवतीको नाम</th>
                        <th>दर्ता नं</th>
                        <th>ठेगाना</th>
                        <th>खोप केन्द्र</th>
                        <th>टी.डी. १ प्राप्त मिति</th>
                        <th>टी.डी. २ लगाउनुपर्ने महिना</th>
                        <th>सम्पर्क नम्बर</th>
                        <th>दर्ता नं. QR</th>
                    </tr>
                </thead>
                <tbody>
                    {upcomingTdList.map((item, idx) => (
                        <tr key={item.patient.id}>
                            <td style={{textAlign: 'center'}}>{idx + 1}</td>
                            <td>{item.patient.name}</td>
                            <td>{item.patient.regNo}</td>
                            <td>{item.patient.address}</td>
                            <td>{item.patient.vaccinationCenter || 'N/A'}</td>
                            <td style={{textAlign: 'center'}}>{item.patient.td1DateBs}</td>
                            <td style={{textAlign: 'center', fontWeight: 'bold'}}>{item.expectedMonthName}, {item.expectedYear}</td>
                            <td style={{fontFamily: 'monospace'}}><span className={blurPhone ? "blur-sm" : ""}>{item.patient.phone}</span></td>
                            <td className="text-center">
                                <QRCodeSVG value={item.patient.regNo || 'N/A'} size={45} level="M" />
                            </td>
                        </tr>
                    ))}
                    {upcomingTdList.length === 0 && (
                        <tr>
                            <td colSpan={9} style={{textAlign: 'center', fontStyle: 'italic', padding: '20px'}}>
                                छानिएको अवधि र केन्द्रमा कुनै टी.डी. खोप तालिका छैन।
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        <div id="vaccine-summary-print" className="hidden print-container">
            <div className="print-header">
                <img src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} alt="Logo" className="print-logo" />
                <div className="print-header-text">
                    <h1 style={{color: '#0f766e'}}>{generalSettings.orgNameNepali}</h1>
                    {generalSettings.subTitleNepali && <h2 style={{color: '#0f766e'}}>{generalSettings.subTitleNepali}</h2>}
                    {generalSettings.subTitleNepali2 && <h3 style={{color: '#0f766e'}}>{generalSettings.subTitleNepali2}</h3>}
                    {generalSettings.subTitleNepali3 && <h4 style={{color: '#0f766e'}}>{generalSettings.subTitleNepali3}</h4>}
                    <h2 className="mt-3 font-bold" style={{color: '#0f766e', fontSize: '15px', textDecoration: 'underline'}}>खोप अनुसार समरी प्रतिवेदन (Vaccine-wise Summary Report - DPT1, 2, 3 समेटिएको)</h2>
                    <p>अवधि: {filterFiscalYear} - {getSelectedMonthLabel()} {filterCenter && ` | केन्द्र: ${filterCenter}`} | जम्मा खोप प्रकारहरू: {vaccineSummaryData.length}</p>
                </div>
            </div>
            
            <div className="space-y-6 mt-4">
                {vaccineSummaryData.map((group, gIdx) => (
                    <div key={gIdx} className="mb-6">
                        <div style={{ backgroundColor: '#f1f5f9', padding: '6px 10px', fontWeight: 'bold', fontSize: '13px', borderBottom: '2px solid #cbd5e1', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>खोप समूह / नाम: {group.category}</span>
                            <span>जम्मा बालबालिका संख्या: {group.count}</span>
                        </div>
                        <table className="print-table" style={{ width: '100%', marginBottom: '15px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>क्र.सं.</th>
                                    <th>बच्चाको नाम / दर्ता नं</th>
                                    <th>जन्म मिति (DOB)</th>
                                    <th>अभिभावकको नाम</th>
                                    <th>ठेगाना</th>
                                    <th>केन्द्र</th>
                                    <th>लगाउनुपर्ने डोजहरू (Doses Due)</th>
                                    <th>सम्पर्क नं</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.children.map((c, cIdx) => (
                                    <tr key={cIdx}>
                                        <td style={{ textAlign: 'center' }}>{cIdx + 1}</td>
                                        <td>{c.childName} <br/> <small>{c.regNo}</small></td>
                                        <td><span className={blurDob ? "blur-sm" : ""}>{c.dobBs}</span></td>
                                        <td>{c.guardian}</td>
                                        <td>{c.address}</td>
                                        <td>{c.center}</td>
                                        <td style={{ fontWeight: 'bold', color: '#0369a1' }}>
                                            {c.doses.join(', ')}
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}><span className={blurPhone ? "blur-sm" : ""}>{c.phone || '-'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
                {vaccineSummaryData.length === 0 && (
                    <p style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>छानिएको अवधिमा कुनै खोप डाटा फेला परेन।</p>
                )}
            </div>
        </div>

        {/* SMS Dispatch Modal */}
        {isSmsModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-2 text-slate-800 font-bold font-nepali">
                            <MessageSquare className="text-blue-600" size={20} />
                            <span>{smsModalTitle}</span>
                        </div>
                        <button 
                            onClick={() => setIsSmsModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/60 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-4 font-nepali text-sm text-slate-700">
                        {/* SMS Quota Status Banner */}
                        <div className="flex items-center justify-between text-xs font-nepali bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="text-slate-600 font-medium">
                                प्रयोगकर्ता: <strong className="text-slate-800 font-bold">{currentUser?.fullName || currentUser?.username || 'User'}</strong>
                            </span>
                            {currentUser?.smsQuota && currentUser.smsQuota > 0 ? (
                                <span className="font-bold text-slate-700">
                                    SMS Quota: <span className="text-blue-700 font-mono">{currentUser.smsUsed || 0}</span> / <span className="font-mono">{currentUser.smsQuota}</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded font-mono text-[11px] ${Math.max(0, currentUser.smsQuota - (currentUser.smsUsed || 0)) === 0 ? 'bg-red-100 text-red-700 font-bold border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                        (बाँकी: {Math.max(0, currentUser.smsQuota - (currentUser.smsUsed || 0))})
                                    </span>
                                </span>
                            ) : (
                                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                                    ✨ SMS Quota: असीमित (Unlimited)
                                </span>
                            )}
                        </div>

                        <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl text-xs text-blue-900 leading-relaxed">
                            <span className="font-bold block mb-1">💡 उपलब्ध Dynamic Placeholder हरू:</span>
                            <div className="flex flex-wrap gap-1.5 font-mono text-[11px] font-semibold text-blue-700">
                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{motherName}"}</span>
                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{childName}"}</span>
                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{vaccineName}"}</span>
                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{scheduledDateBs}"}</span>
                                <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{"{vaccinationCenter}"}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-800 mb-1">SMS सन्देश (Message Template):</label>
                            <textarea 
                                value={smsTemplate}
                                onChange={(e) => setSmsTemplate(e.target.value)}
                                rows={4}
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 font-nepali text-sm shadow-xs"
                                placeholder="SMS सन्देश यहाँ लेख्नुहोस्..."
                            />
                        </div>

                        {/* Live Sample Preview */}
                        {smsRecipients.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                                <span className="text-xs font-bold text-slate-500 block">नमूना सन्देश (Sample Message Preview):</span>
                                <p className="text-xs font-medium text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 font-nepali">
                                    {smsTemplate
                                        .replaceAll('{motherName}', smsRecipients[0].motherName || 'सरिता शर्मा')
                                        .replaceAll('{childName}', smsRecipients[0].childName || 'आरभ शर्मा')
                                        .replaceAll('{vaccineName}', smsRecipients[0].vaccineName || 'DPT-1')
                                        .replaceAll('{scheduledDateBs}', smsRecipients[0].scheduledDateBs || '२०८३-०३-१५')
                                        .replaceAll('{vaccinationCenter}', smsRecipients[0].vaccinationCenter || 'स्वास्थ्य चौकी')}
                                </p>
                            </div>
                        )}

                        {smsStatusSummary && (
                            <div className={`p-3.5 rounded-xl border text-xs font-bold font-nepali whitespace-pre-line leading-relaxed ${smsStatusSummary.includes('असफलता') ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-green-50 text-green-900 border-green-200'}`}>
                                {smsStatusSummary}
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button 
                            onClick={() => setIsSmsModalOpen(false)}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-100 text-xs font-nepali transition-colors"
                        >
                            रद्द गर्नुहोस् / बन्द गर्नुहोस्
                        </button>
                        <button 
                            onClick={handleSendSmsBatch}
                            disabled={isSendingSms || !smsTemplate.trim() || smsRecipients.length === 0}
                            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs transition-colors font-nepali cursor-pointer"
                        >
                            {isSendingSms ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" /> पठाउँदैछ...
                                </>
                            ) : (
                                <>
                                    <Send size={15} /> 📩 SMS पठाऊ
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
