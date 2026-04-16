
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, RotateCcw, Activity, UserPlus, List, Phone, MapPin, 
  Calendar, FileDigit, User as UserIcon, Stethoscope, Users, TrendingUp, 
  FlaskConical, AlertCircle, X, ChevronRight, Microscope, 
  CheckCircle2, Eye, Search, ClipboardList, History, Clock, Trash2, Pencil, Scale, Pill, MoreVertical
} from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Option, User, OrganizationSettings, ServiceSeekerRecord } from '../types/coreTypes';
import { TBPatient, TBReport, InterFacilityRequest } from '../types/healthTypes';
import { InventoryItem } from '../types/inventoryTypes';
import { calculatePatientRequirements, MedicineRequirement, checkDefaulter } from '../lib/medicineUtils';
import { MedicineStatusReport } from './MedicineStatusReport';
import { TBTreatmentCard } from './TBTreatmentCard';

// @ts-ignore
import NepaliDate from 'nepali-date-converter';

// Updated TBPatientRegistrationProps to receive data and handlers from App.tsx
interface TBPatientRegistrationProps {
  currentFiscalYear: string;
  patients: TBPatient[]; // Now comes from props
  inventoryItems: InventoryItem[];
  interFacilityRequests: InterFacilityRequest[];
  allUsers: User[];
  currentUser: User | null;
  generalSettings: OrganizationSettings;
  serviceSeekerRecords: ServiceSeekerRecord[];
  onUpdateGeneralSettings: (settings: OrganizationSettings) => void;
  onAddPatient: (patient: TBPatient) => void;
  onUpdatePatient: (patient: TBPatient, sourceOrgName?: string) => void;
  onDeletePatient: (patientId: string) => void;
  onAddInterFacilityRequest: (req: InterFacilityRequest) => void;
  onUpdateInterFacilityRequest: (req: InterFacilityRequest) => void;
}

export const TBPatientRegistration: React.FC<TBPatientRegistrationProps> = ({ 
  currentFiscalYear, 
  patients = [], // Defensive default value: ensures 'patients' is always an array
  inventoryItems = [],
  interFacilityRequests: globalInterFacilityRequests = [],
  allUsers = [],
  currentUser,
  generalSettings,
  serviceSeekerRecords = [],
  onUpdateGeneralSettings,
  onAddPatient, 
  onUpdatePatient,
  onDeletePatient,
  onAddInterFacilityRequest,
  onUpdateInterFacilityRequest
}) => {
  const [activeTab, setActiveTab] = useState<'TB' | 'Leprosy'>('TB');
  const [showSputumModal, setShowSputumModal] = useState(false);
  const [showDefaulterModal, setShowDefaulterModal] = useState(false);
  const [showReportCenter, setShowReportCenter] = useState(false);
  const [reportCenterTab, setReportCenterTab] = useState<'Recent' | 'History' | 'InterFacility'>('Recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null); // For editing existing patients
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [searchId, setSearchId] = useState('');
  
  // State for Lab Report Entry
  const [selectedPatientForLab, setSelectedPatientForLab] = useState<{patient: TBPatient, reason: string, scheduleMonth: number} | null>(null);
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<TBPatient | null>(null);
  const [labFormData, setLabFormData] = useState({
    testDate: new Date().toISOString().split('T')[0],
    testDateNepali: '',
    labNo: '',
    result: '',
    grading: ''
  });

  const [showInterFacilityModal, setShowInterFacilityModal] = useState(false);
  const [selectedPatientForInterFacility, setSelectedPatientForInterFacility] = useState<TBPatient | null>(null);
  const [interFacilityFormData, setInterFacilityFormData] = useState({
    month: 0,
    targetPalikaId: '',
    targetPalikaName: '',
    targetFacilityId: '',
    targetFacilityName: ''
  });
  const [activeMenuPatientId, setActiveMenuPatientId] = useState<string | null>(null);
  const [selectedInterFacilityRequest, setSelectedInterFacilityRequest] = useState<{patient: TBPatient, request: InterFacilityRequest} | null>(null);
  const [showMedicineStatusModal, setShowMedicineStatusModal] = useState(false);
  const [showTreatmentCardModal, setShowTreatmentCardModal] = useState(false);
  const [selectedPatientForTreatmentCard, setSelectedPatientForTreatmentCard] = useState<TBPatient | null>(null);

  // Filter Palikas (Users with role ADMIN or SUPER_ADMIN)
  const palikaOptions = useMemo(() => {
    return allUsers
      .filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
      .map(u => ({ id: u.id, label: u.organizationName, value: u.id }));
  }, [allUsers]);

  // Removed facilityOptions as it's no longer needed

  const getAllSputumFollowupDates = (p: TBPatient) => {
    if (p.serviceType !== 'TB') return [];
    
    let regDateNepali: any;
    try {
        if (!p.registrationDate) return [];
        const parts = p.registrationDate.split(/[-/]/);
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1; // 0-based month
            const d = parseInt(parts[2], 10);
            regDateNepali = new NepaliDate(y, m, d);
        } else {
            regDateNepali = new NepaliDate(p.registrationDate);
        }
    } catch (e) { return []; }
    
    const isDone = (month: number) => {
        const localDone = (p.completedSchedule || []).includes(month);
        const interFacilityDone = (globalInterFacilityRequests || []).some(req => 
            req.patientId === p.id && 
            req.month === month && 
            req.status === 'Completed'
        );
        return localDone || interFacilityDone;
    };
    const isMonth2Positive = (p.reports || []).some(r => r.month === 2 && r.result.toLowerCase().includes('positive')) || 
                             (globalInterFacilityRequests || []).some(req => req.patientId === p.id && req.month === 2 && req.result?.toLowerCase().includes('positive'));
    
    const getFollowUpDate = (monthsToAdd: number) => {
        try {
            // Clone using year, month, date to avoid constructor errors
            const d = new NepaliDate(regDateNepali.getYear(), regDateNepali.getMonth(), regDateNepali.getDate());
            d.setMonth(d.getMonth() + monthsToAdd);
            return d.format('YYYY-MM-DD');
        } catch (e) {
            return 'N/A';
        }
    };

    const schedule: number[] = [0];
    if (['PBC', 'PCD', 'EP'].includes(p.classification || '')) {
        schedule.push(2);
    }
    if (p.classification === 'PBC') {
        schedule.push(5, 6);
        if (isMonth2Positive) {
            schedule.push(3);
        }
    }
    
    // Sort schedule to ensure order
    schedule.sort((a, b) => a - b);

    return schedule.map(month => ({
        month,
        label: month === 0 ? 'Month 0 (Registration)' : `Month ${month}`,
        status: isDone(month) ? 'Completed' : 'Pending',
        date: getFollowUpDate(month)
    }));
  };

  const generateId = (type: 'TB' | 'Leprosy') => {
    const fyClean = currentFiscalYear.replace('/', '');
    const prefix = type === 'TB' ? 'TB' : 'LP';
    // Simple random for initial unique ID. For sequential, would need database query.
    const random = Math.floor(1000 + Math.random() * 9000); 
    return `${prefix}-${fyClean}-${random}`;
  };

  const todayBs = useMemo(() => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  }, []);

  const [formData, setFormData] = useState<TBPatient>({
    id: '', // Will be set on submit or edit load
    patientId: generateId('TB'),
    name: '',
    age: '',
    gender: 'Male',
    ethnicity: '',
    address: '',
    phone: '',
    weight: '',
    regimen: 'Adult',
    treatmentType: '',
    regType: '',
    classification: '',
    leprosyType: undefined, 
    registrationDate: todayBs, // Initialize with today's Nepali date
    treatmentStartDate: todayBs, // Initialize with today's Nepali date
    serviceType: 'TB', // Default to TB
    completedSchedule: [],
    newReportAvailable: false,
    reports: [],
    // Fix: Initialize fiscalYear property as it's required by TBPatient type
    fiscalYear: currentFiscalYear, 
    status: 'Active',
    statusDateBs: todayBs,
    intensivePhaseExtensionDays: 0,
    continuationPhaseExtensionDays: 0,
  });

  // Effect to update patientId and reset leprosyType when activeTab or fiscal year changes
  useEffect(() => {
    setFormData(prev => ({ 
      ...prev, 
      patientId: generateId(activeTab),
      serviceType: activeTab, // Ensure serviceType matches active tab
      fiscalYear: currentFiscalYear, // Ensure fiscal year is synced
      leprosyType: activeTab === 'Leprosy' 
                   ? (prev.leprosyType === 'MB' || prev.leprosyType === 'PB' ? prev.leprosyType : 'PB') 
                   : undefined,
      classification: activeTab === 'Leprosy' ? (prev.leprosyType || 'PB') : '' // Sync classification for Leprosy
    }));
  }, [currentFiscalYear, activeTab]);

  const regTypes: Option[] = [
    { id: 'new', label: 'नयाँ (New)', value: 'New' },
    { id: 'relapse', label: 'दोहोरिएको (Relapse)', value: 'Relapse' },
    { id: 'taf', label: 'उपचार असफल पछि (TAF)', value: 'TAF' },
    { id: 'talf', label: 'उपचार पछि हराएको (TALF)', value: 'TALF' },
    { id: 'opt', label: 'अन्य पहिले उपचार गरिएको (OPT)', value: 'OPT' },
    { id: 'upth', label: 'अज्ञात उपचार इतिहास (UPTH)', value: 'UPTH' },
    { id: 'transfer_in', label: 'सरुवा भई आएको (Transferred In)', value: 'Transferred In' },
  ];

  const treatmentTypeOptions: Option[] = [
    { id: '2hrze4hr', label: '2HRZE+4HR', value: '2HRZE+4HR' },
    { id: '6hrze', label: '6HRZE', value: '6HRZE' },
    { id: '6hrzelfx', label: '6HRZE+Lfx', value: '6HRZE+Lfx' },
    { id: '2hrze7hre', label: '2HRZE+7HRE', value: '2HRZE+7HRE' },
    { id: 'custom', label: 'अन्य (Other/Manual)', value: 'Other' },
  ];

  const tbClassification: Option[] = [
    { id: 'pbc', label: 'PBC (Bacteriologically Confirmed)', value: 'PBC' },
    { id: 'pcd', label: 'PCD (Clinically Diagnosed)', value: 'PCD' },
    { id: 'ep', label: 'EP (Extrapulmonary)', value: 'EP' },
  ];

  const leprosyTypes: Option[] = [
    { id: 'pb', label: 'PB (Paucibacillary)', value: 'PB' },
    { id: 'mb', label: 'MB (Multibacillary)', value: 'MB' },
  ];

  const getSputumTestStatus = (p: TBPatient) => {
    if (p.serviceType !== 'TB' || (p.status && p.status !== 'Active')) return { required: false, reason: '', scheduleMonth: -1 };
    
    const followupDates = getAllSputumFollowupDates(p);
    const today = new NepaliDate();
    
    // Parse registration date for diff calculation
    let regDate;
    try {
        const parts = p.registrationDate.split(/[-/]/);
        regDate = new NepaliDate(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } catch (e) { return { required: false, reason: '', scheduleMonth: -1 }; }

    const diffDays = Math.ceil(Math.abs(today.toJsDate().getTime() - regDate.toJsDate().getTime()) / (1000 * 60 * 60 * 24));
    
    // Define windows for each month
    const windows: Record<number, [number, number]> = {
        0: [0, 30],
        2: [55, 75],
        3: [85, 105],
        5: [145, 165],
        6: [175, 195]
    };

    for (const item of followupDates) {
        if (item.status === 'Pending') {
            const window = windows[item.month];
            // Return if within window OR overdue (diffDays > window[0])
            if (window && diffDays >= window[0]) {
                return { required: true, reason: `${item.label} परीक्षण`, scheduleMonth: item.month };
            }
        }
    }

    return { required: false, reason: '', scheduleMonth: -1 };
  };

  const getDosageInfo = (p: TBPatient) => {
    if (p.serviceType !== 'TB' || p.regimen !== 'Adult' || (p.treatmentType !== '2HRZE+4HR' && p.treatmentType !== '6HRZE' && p.treatmentType !== '6HRZE+Lfx') || !p.weight) return null;
    
    const weight = parseFloat(p.weight);
    if (isNaN(weight)) return null;

    let tablets = 0;
    if (weight <= 39) tablets = 2;
    else if (weight <= 54) tablets = 3;
    else if (weight <= 70) tablets = 4;
    else tablets = 5;

    if (p.treatmentType?.includes('6HRZE')) {
      const totalDays = 180 + (p.intensivePhaseExtensionDays || 0);
      return {
        tablets,
        phase1: `${Math.round(totalDays/30)} महिना HRZE`,
        phase2: "N/A"
      };
    }

    const ipDays = 60 + (p.intensivePhaseExtensionDays || 0);
    const cpDays = 120 + (p.continuationPhaseExtensionDays || 0);

    return {
      tablets,
      phase1: `${Math.round(ipDays/30)} महिना HRZE`,
      phase2: `${Math.round(cpDays/30)} महिना HR`
    };
  };

  // Fix: Ensure fiscalYear is recognized on patient objects for filtering
  const patientsNeedingSputum = useMemo(() => (patients || []) // Defensive check, though 'patients' is defaulted to []
    .map(p => ({ ...p, ...getSputumTestStatus(p) }))
    .filter(p => p.required), [patients, currentFiscalYear]); // Re-evaluate when patients or FY changes

  const patientsWithNewReports = useMemo(() => {
    const localNew = (patients || []).filter(p => p.newReportAvailable);
    const interFacilityNew = (globalInterFacilityRequests || []).filter(req => 
      req.sourceOrgName === currentUser?.organizationName && 
      req.status === 'Completed' && 
      !req.viewedBySource
    );
    
    // Combine them into a single list of "new report notifications"
    // For inter-facility, we'll map them to a structure similar to TBPatient for the UI
    const interFacilityPatients = interFacilityNew.map(req => {
      const patient = patients.find(p => p.id === req.patientId) || req.patientDetails as TBPatient;
      return {
        ...patient,
        id: patient.id,
        newReportAvailable: true,
        latestResult: req.result,
        latestReportMonth: req.month,
        isInterFacilityReport: true,
        requestId: req.id
      };
    });
    
    const combined = [...localNew, ...interFacilityPatients];
    const uniquePatients = new Map();
    combined.forEach(p => {
        // If it already exists, prefer the one with isInterFacilityReport flag if applicable
        if (!uniquePatients.has(p.id) || (p as any).isInterFacilityReport) {
            uniquePatients.set(p.id, p);
        }
    });
    return Array.from(uniquePatients.values());
  }, [patients, globalInterFacilityRequests, currentUser]);

  const newReportCount = patientsWithNewReports.length;

  const defaulterPatients = useMemo(() => {
    return (patients || []).filter(p => p.serviceType === activeTab && p.fiscalYear === currentFiscalYear).map(p => {
        const { isDefaulter, sinceDate, treatmentStartDate, daysSinceStopped } = checkDefaulter(p);
        return { ...p, isDefaulter, sinceDate, treatmentStartDate, daysSinceStopped };
    }).filter(p => p.isDefaulter);
  }, [patients, currentFiscalYear, activeTab]);

  const defaulterCount = defaulterPatients.length;

  const isUserUnderTarget = (user: User, targetId: string, allUsers: User[]): boolean => {
    if (!user.parentId) return false;
    if (user.parentId === targetId) return true;
    const parent = allUsers.find(u => u.id === user.parentId);
    if (!parent) return false;
    return isUserUnderTarget(parent, targetId, allUsers);
  };

  // Memoized filtered requests for the current facility
  const interFacilityRequestsForMe = useMemo(() => {
    if (!currentUser) return [];
    const filtered = globalInterFacilityRequests.filter(req => {
      const targetUser = allUsers.find(u => u.id === req.targetPalikaId);
      const isSameOrg = targetUser && currentUser.organizationName === targetUser.organizationName;
      const isTarget = req.targetPalikaId === currentUser.id || isUserUnderTarget(currentUser, req.targetPalikaId, allUsers) || isSameOrg;
      const isPending = req.status === 'Pending';
      return isTarget && isPending;
    });
    return filtered.map(req => {
      const patient = patients.find(p => p.id === req.patientId) || req.patientDetails as TBPatient;
      return { request: req, patient };
    }).filter(item => item.patient !== undefined) as {request: InterFacilityRequest, patient: TBPatient}[];
  }, [globalInterFacilityRequests, currentUser, patients, allUsers]);
  
  // FIX: Rewritten allReportsHistory with robust checks
  const allReportsHistory = useMemo(() => {
      const history: Array<{patient: TBPatient, report: TBReport}> = [];
      // 'patients' is guaranteed to be an array due to prop default
      patients.forEach(p => {
        // Use optional chaining for p.reports and check if it's an array
        if (p?.reports && Array.isArray(p.reports)) { 
          p.reports.forEach(r => {
            history.push({ patient: p, report: r });
          });
        }
      });
      // FIX: Access .report.date for sorting
      return history.sort((a, b) => new Date(b.report.date).getTime() - new Date(a.report.date).getTime());
  }, [patients]);

  const medicineStats = useMemo(() => {
    const activePatients = (patients || []).filter(p => (p.status === 'Active' || !p.status) && p.serviceType === activeTab);
    const aggregate: Record<string, { totalRemaining: number, stock: number }> = {};
    
    activePatients.forEach(patient => {
      const requirements = calculatePatientRequirements(patient, inventoryItems);
      requirements.forEach(req => {
        if (!aggregate[req.itemName]) {
          aggregate[req.itemName] = { totalRemaining: 0, stock: req.availableStock };
        }
        aggregate[req.itemName].totalRemaining += req.remainingNeeded;
      });
    });
    
    return aggregate;
  }, [patients, inventoryItems, activeTab]);

  const lowStockMedicines = useMemo(() => {
    return Object.entries(medicineStats).filter(([_, data]: [string, any]) => data.stock < data.totalRemaining);
  }, [medicineStats]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) { alert("कृपया बिरामीको नाम भर्नुहोस्।"); return; }
    if (!formData.age.trim()) { alert(" कृपया बिरामीको उमेर भर्नुहोस्।"); return; }
    if (!formData.address.trim()) { alert(" कृपया बिरामीको ठेगाना भर्नुहोस्।"); return; }
    if (!formData.gender) { alert("कृपया लिङ्ग छान्नुहोस्।"); return; }
    if (!formData.ethnicity.trim()) { alert("कृपया जात/जाति भर्नुहोस्।"); return; }
    if (!formData.regType.trim()) { alert(" कृपया दर्ता प्रकार छान्नुहोस्।"); return; }
    if (!formData.registrationDate.trim()) { alert("कृपया दर्ता मिति भर्नुहोस्।"); return; }

    if (activeTab === 'TB' && !formData.classification.trim()) {
      alert("कृपया TB वर्गीकरण छान्नुहोस्।");
      return;
    }
    if (activeTab === 'Leprosy' && formData.leprosyType === undefined) { 
      alert(" कृपया कुष्ठरोग प्रकार छान्नुहोस्।");
      return;
    }

    const rawPatientData = {
      ...formData,
      id: editingPatientId || Date.now().toString(), // Use existing ID if editing, otherwise new
      // Fix: Explicitly set fiscalYear from prop to ensure it's current even if formData is stale
      fiscalYear: currentFiscalYear, 
      serviceType: activeTab,
      classification: activeTab === 'Leprosy' ? (formData.leprosyType || '') : formData.classification,
      // If activeTab is TB, leprosyType might be undefined. Firebase rejects undefined.
      // We set it to null or use sanitization below.
      leprosyType: activeTab === 'Leprosy' ? formData.leprosyType : null, 
    };

    // Sanitize: Remove undefined values to prevent Firebase "set failed" error
    const patientToSave = JSON.parse(JSON.stringify(rawPatientData));

    if (editingPatientId) {
        onUpdatePatient(patientToSave);
        alert('बिरामी विवरण सफलतापूर्वक अपडेट भयो!');
    } else {
        onAddPatient(patientToSave);
        alert('बिरामी सफलतापूर्वक दर्ता भयो!');
    }
    
    handleReset();
  };

  const handleEditPatient = (patient: TBPatient) => {
    setEditingPatientId(patient.id);
    // Fix: patient object already contains fiscalYear, so spreading it is correct.
    setFormData({ 
      ...patient,
      intensivePhaseExtensionDays: patient.intensivePhaseExtensionDays || 0,
      continuationPhaseExtensionDays: patient.continuationPhaseExtensionDays || 0
    });
    setActiveTab(patient.serviceType); // Ensure tab matches edited patient
    setShowRegistrationForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchAndOpen = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;

    const existingPatient = (patients || []).find(p => 
      p.patientId.toLowerCase() === searchId.trim().toLowerCase() || 
      p.id === searchId.trim()
    );

    if (existingPatient) {
      handleEditPatient(existingPatient);
      setSearchId('');
    } else {
      // Check in Muldarta (Service Seeker Records)
      const muldartaRecord = (serviceSeekerRecords || []).find(r => 
        r.mulDartaNo === searchId.trim() || 
        r.registrationNumber === searchId.trim() ||
        r.uniquePatientId === searchId.trim()
      );

      if (muldartaRecord) {
        handleReset();
        setFormData(prev => ({
          ...prev,
          patientId: generateId(activeTab),
          name: muldartaRecord.name,
          age: muldartaRecord.age || (muldartaRecord.ageYears !== undefined ? muldartaRecord.ageYears.toString() : ''),
          gender: muldartaRecord.gender,
          address: muldartaRecord.address,
          phone: muldartaRecord.phone,
          ethnicity: muldartaRecord.casteCode || '', // Map casteCode to ethnicity if available
        }));
        setShowRegistrationForm(true);
        setSearchId('');
        alert(`मूल दर्ता नं. ${searchId.trim()} बाट विवरण प्राप्त भयो।`);
      } else {
        handleReset();
        setFormData(prev => ({ ...prev, patientId: searchId.trim() }));
        setShowRegistrationForm(true);
        setSearchId('');
      }
    }
  };

  const handleReset = () => {
    setEditingPatientId(null);
    setShowRegistrationForm(false);
    setFormData({
        id: '',
        patientId: generateId(activeTab), // Re-generate ID for new entry
        name: '',
        age: '',
        gender: 'Male',
        ethnicity: '',
        address: '',
        phone: '',
        weight: '',
        regimen: 'Adult',
        treatmentType: '',
        regType: '',
        classification: '',
        leprosyType: activeTab === 'Leprosy' ? 'PB' : undefined, // Reset based on activeTab
        registrationDate: todayBs, // Reset to today's Nepali date
        treatmentStartDate: todayBs, // Reset to today's Nepali date
        serviceType: activeTab,
        completedSchedule: [],
        newReportAvailable: false,
        reports: [],
        fiscalYear: currentFiscalYear, // Ensure reset also sets fiscalYear
        status: 'Active',
        statusDateBs: todayBs,
    });
  };

  const handleDeletePatient = (patientId: string, patientName: string) => {
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${patientName} को विवरण हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
        onDeletePatient(patientId);
        alert(`${patientName} को विवरण सफलतापूर्वक हटाइयो।`);
    }
  };


  const handleDeleteReport = (patient: TBPatient, reportId: string) => {
    if (window.confirm('के तपाईं यो रिपोर्ट हटाउन निश्चित हुनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।')) {
        const updatedReports = patient.reports.filter(r => r.id !== reportId);
        
        // Recalculate latest result and month based on remaining reports
        const sortedReports = [...updatedReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestReport = sortedReports[0];
        
        // Recalculate completed schedule
        const completedSchedule = [...new Set(updatedReports.map(r => r.month))];

        const updatedPatientRaw = {
            ...patient,
            reports: sortedReports,
            latestResult: latestReport ? latestReport.result : undefined,
            latestReportMonth: latestReport ? latestReport.month : undefined,
            completedSchedule: completedSchedule
        };

        const updatedPatient = JSON.parse(JSON.stringify(updatedPatientRaw));
        onUpdatePatient(updatedPatient);
        alert('रिपोर्ट सफलतापूर्वक हटाइयो।');
    }
  };

  const handleLabSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedPatientForLab) return;
      
      const { patient, scheduleMonth } = selectedPatientForLab;

      if (patient.status && patient.status !== 'Active') {
          alert("यो बिरामी सक्रिय अवस्थामा नभएकोले रिपोर्ट प्रविष्ट गर्न मिल्दैन।");
          setSelectedPatientForLab(null);
          return;
      }

      const newReport: TBReport = {
          id: Date.now().toString(),
          month: scheduleMonth,
          result: labFormData.result === 'Positive' ? `${labFormData.result} (${labFormData.grading})` : labFormData.result,
          labNo: labFormData.labNo,
          date: labFormData.testDate,
          dateNepali: labFormData.testDateNepali || new NepaliDate(new Date(labFormData.testDate)).format('YYYY-MM-DD')
      };

      const updatedPatientRaw = {
          ...patient,
          completedSchedule: [...new Set([...(patient.completedSchedule || []), scheduleMonth])], // Ensure unique months and nullish coalescing
          newReportAvailable: true,
          latestResult: newReport.result,
          latestReportMonth: scheduleMonth,
          reports: [newReport, ...(patient.reports || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by latest date, nullish coalescing
      };
      
      // Sanitize before updating
      const updatedPatient = JSON.parse(JSON.stringify(updatedPatientRaw));

      onUpdatePatient(updatedPatient); // Use the prop to update
      setSelectedPatientForLab(null);
      alert("ल्याब रिपोर्ट सफलतापूर्वक प्रविष्ट भयो!");
  };

  const handleInterFacilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForInterFacility || !currentUser) return;

    const newRequest: InterFacilityRequest = {
      id: Date.now().toString(),
      patientId: selectedPatientForInterFacility.id,
      patientName: selectedPatientForInterFacility.name,
      patientDetails: {
          id: selectedPatientForInterFacility.id,
          patientId: selectedPatientForInterFacility.patientId,
          name: selectedPatientForInterFacility.name,
          age: selectedPatientForInterFacility.age,
          address: selectedPatientForInterFacility.address,
          phone: selectedPatientForInterFacility.phone,
          gender: selectedPatientForInterFacility.gender,
          ethnicity: selectedPatientForInterFacility.ethnicity,
          registrationDate: selectedPatientForInterFacility.registrationDate,
          serviceType: selectedPatientForInterFacility.serviceType,
          classification: selectedPatientForInterFacility.classification,
          weight: selectedPatientForInterFacility.weight,
          regimen: selectedPatientForInterFacility.regimen,
          treatmentType: selectedPatientForInterFacility.treatmentType,
          fiscalYear: selectedPatientForInterFacility.fiscalYear,
          reports: []
      },
      month: interFacilityFormData.month,
      requestDate: new Date().toISOString().split('T')[0],
      requestDateBs: todayBs,
      status: 'Pending',
      targetPalikaId: interFacilityFormData.targetPalikaId,
      targetPalikaName: interFacilityFormData.targetPalikaName,
      targetFacilityId: interFacilityFormData.targetPalikaId, // Send to Palika
      targetFacilityName: interFacilityFormData.targetPalikaName, // Send to Palika
      sourceOrgId: currentUser.id,
      sourceOrgName: currentUser.organizationName
    };

    // Add to global requests
    onAddInterFacilityRequest(newRequest);

    // Also add to patient's local record for history
    const updatedPatient = {
      ...selectedPatientForInterFacility,
      interFacilityRequests: [...(selectedPatientForInterFacility.interFacilityRequests || []), newRequest]
    };
    onUpdatePatient(updatedPatient);

    setShowInterFacilityModal(false);
    setSelectedPatientForInterFacility(null);
    setInterFacilityFormData({
      month: 0,
      targetPalikaId: '',
      targetPalikaName: '',
      targetFacilityId: '',
      targetFacilityName: ''
    });
    alert('अन्तर संस्था अनुरोध सफलतापूर्वक पठाइयो।');
  };

  const handleInterFacilityReportReject = () => {
    if (!selectedInterFacilityRequest || !currentUser) return;
    if (!window.confirm('के तपाईं यो अनुरोध अस्वीकार गर्न निश्चित हुनुहुन्छ?')) return;

    const { patient, request } = selectedInterFacilityRequest;

    // Update global request status
    const updatedRequest: InterFacilityRequest = {
      ...request,
      status: 'Rejected',
      completedDate: new Date().toISOString().split('T')[0],
      completedDateBs: new NepaliDate().format('YYYY-MM-DD')
    };
    onUpdateInterFacilityRequest(updatedRequest);

    // Update patient record
    const updatedPatientRaw = {
      ...patient,
      // Also update the request in patient's history
      interFacilityRequests: (patient.interFacilityRequests || []).map(r => 
        r.id === request.id ? updatedRequest : r
      )
    };

    const updatedPatient = JSON.parse(JSON.stringify(updatedPatientRaw));
    onUpdatePatient(updatedPatient, request.sourceOrgName);

    setSelectedInterFacilityRequest(null);
    alert('अन्तर संस्था अनुरोध अस्वीकार गरियो।');
  };

  const handleInterFacilityReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterFacilityRequest || !currentUser) return;

    const { patient, request } = selectedInterFacilityRequest;
    
    const report: TBReport = {
      id: Date.now().toString(),
      month: request.month,
      testDate: labFormData.testDate,
      date: labFormData.testDate,
      dateNepali: labFormData.testDateNepali || new NepaliDate(new Date(labFormData.testDate)).format('YYYY-MM-DD'),
      labNo: labFormData.labNo,
      result: labFormData.result === 'Positive' ? `${labFormData.result} (${labFormData.grading})` : labFormData.result,
      grading: labFormData.grading,
      isInterFacility: true,
      reportingOrgId: currentUser.id,
      reportingOrgName: currentUser.organizationName
    };

    // Update global request status
    const updatedRequest: InterFacilityRequest = {
      ...request,
      status: 'Completed',
      report: report,
      result: report.result,
      labNo: report.labNo,
      completedDate: report.date,
      completedDateBs: labFormData.testDateNepali || new NepaliDate(new Date(report.date)).format('YYYY-MM-DD')
    };
    onUpdateInterFacilityRequest(updatedRequest);

    // Update patient record
    const updatedPatientRaw = {
      ...patient,
      completedSchedule: [...new Set([...(patient.completedSchedule || []), request.month])],
      newReportAvailable: true,
      latestResult: report.result,
      latestReportMonth: request.month,
      reports: [report, ...(patient.reports || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      // Also update the request in patient's history
      interFacilityRequests: (patient.interFacilityRequests || []).map(r => 
        r.id === request.id ? updatedRequest : r
      )
    };

    const updatedPatient = JSON.parse(JSON.stringify(updatedPatientRaw));
    onUpdatePatient(updatedPatient, request.sourceOrgName);

    setSelectedInterFacilityRequest(null);
    setLabFormData({
      testDate: new Date().toISOString().split('T')[0],
      testDateNepali: '',
      labNo: '',
      result: '',
      grading: ''
    });
    alert('रिपोर्ट सफलतापूर्वक प्रविष्ट गरियो।');
  };

  const handleToggleDailyDose = (date: string) => {
    if (!selectedPatientForTreatmentCard) return;
    
    const currentDoses = selectedPatientForTreatmentCard.dailyDoses || [];
    let newDoses: string[];
    
    if (currentDoses.includes(date)) {
      newDoses = currentDoses.filter(d => d !== date);
    } else {
      newDoses = [...currentDoses, date].sort();
      
      // Check for interruption if this is a new dose being added
      const sortedDoses = [...currentDoses].sort();
      if (sortedDoses.length > 0) {
        const lastDoseStr = sortedDoses[sortedDoses.length - 1];
        try {
          const lastDoseParts = lastDoseStr.split('-');
          const currentDoseParts = date.split('-');
          
          const lastDoseNep = new NepaliDate(parseInt(lastDoseParts[0]), parseInt(lastDoseParts[1]) - 1, parseInt(lastDoseParts[2]));
          const currentDoseNep = new NepaliDate(parseInt(currentDoseParts[0]), parseInt(currentDoseParts[1]) - 1, parseInt(currentDoseParts[2]));
          
          const diffTime = currentDoseNep.toJsDate().getTime() - lastDoseNep.toJsDate().getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            // Interruption detected
            if (diffDays < 30) {
              alert(`⚠️ उपचार अवरोध (${diffDays} दिन): बिरामीलाई २४-४८ घण्टा भित्र खोज्नुहोस्। छुटेका डोजहरू थप गरी उपचार जारी राख्नुहोस्। औषधि प्रतिरोध विकास हुन नदिन छुटेका डोजहरू व्यवस्थापन गर्नुहोस्।`);
            } else if (diffDays >= 30 && diffDays < 60) {
              alert(`⚠️ उपचार अवरोध १ देखि २ महिना (${diffDays} दिन): बिरामी खोज्नुहोस्, कारण पत्ता लगाउनुहोस् र २ वटा खकार नमुना परीक्षण (Microscopy/Xpert) को लागि पठाउनुहोस्। यदि खकार नेगेटिभ भए उपचार जारी राख्नुहोस् र छुटेका डोजहरू पूर्ति गर्न उपचार अवधि थप गर्नुहोस्। यदि पोजिटिभ भए उपचार पुनः सुरु गर्नुहोस्।`);
            } else if (diffDays >= 60) {
              alert(`⚠️ उपचार अवरोध २ महिना वा सोभन्दा बढी (${diffDays} दिन): बिरामीलाई 'Lost to Follow-up' मानिन्छ। बिरामी खोज्नुहोस्, अवरोधको कारण पत्ता लगाउनुहोस्, खकार परीक्षण गर्नुहोस् र राष्ट्रिय निर्देशिका अनुसार उपचार पुनः सुरु गर्नुहोस्।`);
            }
          }
        } catch (e) {
          console.error("Error calculating interruption gap", e);
        }
      }
    }
    
    const updatedPatient = {
      ...selectedPatientForTreatmentCard,
      dailyDoses: newDoses
    };
    onUpdatePatient(updatedPatient);
    setSelectedPatientForTreatmentCard(updatedPatient);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Activity size={24} /></div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">क्षयरोग / कुष्ठरोग व्यवस्थापन</h2>
                <p className="text-sm text-slate-500">बिरामी दर्ता र ल्याब रिपोर्ट ट्र्याकिङ</p>
            </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button onClick={() => setActiveTab('TB')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TB' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>क्षयरोग (TB)</button>
            <button onClick={() => setActiveTab('Leprosy')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Leprosy' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>कुष्ठरोग (Leprosy)</button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-bold font-nepali mb-1">कुल दर्ता ({activeTab})</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-slate-800">{(patients || []).filter(p => p.serviceType === activeTab && p.fiscalYear === currentFiscalYear).length}</h3>
                    {defaulterCount > 0 && (
                        <span onClick={() => setShowDefaulterModal(true)} className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse cursor-pointer">
                            {defaulterCount} डिफल्टर
                        </span>
                    )}
                </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Users size={20} /></div>
        </div>

        {showDefaulterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-red-600">डिफल्टर बिरामीहरू ({defaulterCount})</h2>
              <div className="max-h-96 overflow-y-auto">
                {defaulterPatients.map(p => (
                  <div key={p.id} className="p-3 border-b flex justify-between items-center">
                    <div>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-xs text-slate-500">दर्ता नं: {p.patientId}</p>
                      <p className="text-xs text-slate-500">उपचार सुरु: {p.treatmentStartDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">औषधि नखाएको दिन</p>
                      <p className="font-bold text-red-600">{p.daysSinceStopped} दिन</p>
                      <p className="text-[10px] text-slate-400">डिफल्टर मिति: {p.sinceDate}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowDefaulterModal(false)} className="mt-4 w-full bg-slate-800 text-white py-2 rounded-lg font-bold">बन्द गर्नुहोस्</button>
            </div>
          </div>
        )}

        {activeTab === 'TB' && (
          <>
            <div onClick={() => setShowSputumModal(true)} className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-all group relative overflow-hidden">
                {interFacilityRequestsForMe.length > 0 && (
                  <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] px-2 py-0.5 font-bold rounded-bl-lg animate-pulse">
                    नयाँ अन्तर संस्था अनुरोध
                  </div>
                )}
                <div>
                  <p className="text-slate-500 text-xs font-bold font-nepali mb-1">खकार परीक्षण अनुरोध</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-black text-orange-600">{patientsNeedingSputum.length + interFacilityRequestsForMe.length}</h3>
                      {interFacilityRequestsForMe.length > 0 && (
                        <span className="text-[10px] font-bold text-orange-500">({interFacilityRequestsForMe.length} अन्तर संस्था)</span>
                      )}
                    </div>
                    {interFacilityRequestsForMe.length > 0 && (
                      <div className="text-[9px] text-orange-400 font-bold truncate max-w-[150px]">
                        {Array.from(new Set(interFacilityRequestsForMe.map(r => r.request.sourceOrgName))).join(', ')} बाट अनुरोध
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:scale-110 transition-transform"><FlaskConical size={20} /></div>
            </div>

            <div onClick={() => { setShowReportCenter(true); setReportCenterTab('Recent'); }} className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-teal-50 transition-all group">
                <div><p className="text-slate-500 text-xs font-bold font-nepali mb-1">नयाँ प्राप्त रिपोर्ट</p><h3 className="text-2xl font-black text-teal-600">{newReportCount}</h3></div>
                <div className="bg-teal-100 p-3 rounded-lg text-teal-600 group-hover:scale-110 transition-transform"><Microscope size={20} /></div>
            </div>

            <div onClick={() => { setShowReportCenter(true); setReportCenterTab('History'); }} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-all group">
                <div><p className="text-slate-500 text-xs font-bold font-nepali mb-1">रिपोर्ट इतिहास</p><h3 className="text-2xl font-black text-indigo-600">{allReportsHistory.length}</h3></div>
                <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform"><History size={20} /></div>
            </div>
          </>
        )}

        <div onClick={() => setShowMedicineStatusModal(true)} className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-rose-50 transition-all group">
            <div>
              <p className="text-slate-500 text-xs font-bold font-nepali mb-1">औषधिको अवस्था</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-rose-600">{lowStockMedicines.length > 0 ? `${lowStockMedicines.length} अपुग` : 'पर्याप्त'}</h3>
              </div>
            </div>
            <div className="bg-rose-100 p-3 rounded-lg text-rose-600 group-hover:scale-110 transition-transform"><Pill size={20} /></div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1 font-nepali">बिरामी परिचय नं. वा दर्ता नं. राख्नुहोस् (Patient ID / Reg No)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="उदा: TB-2082-1234" 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchAndOpen()}
              />
            </div>
          </div>
          <button 
            onClick={() => handleSearchAndOpen()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <ChevronRight size={18} /> अगाडि बढ्नुहोस्
          </button>
        </div>

        {showRegistrationForm && (
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6 pt-6 border-t animate-in fade-in slide-in-from-top-4">
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm"><FileDigit size={20}/></div>
                <div className="flex-1">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">बिरामी परिचय नं. (ID)</label>
                    <input value={formData.patientId} readOnly className="bg-transparent border-none text-xl font-black text-slate-800 p-0 focus:ring-0 w-full" />
                </div>
            </div>

            <Input label="बिरामीको नाम" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required icon={<UserIcon size={18}/>} />
            
            <div className="grid grid-cols-2 gap-4">
              <Select label="लिङ्ग" options={[{id:'m',label:'पुरुष (Male)',value:'Male'},{id:'f',label:'महिला (Female)',value:'Female'},{id:'o',label:'अन्य (Other)',value:'Other'}]} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})} required />
              <Select 
                  label="जात/जाति (Ethnicity)" 
                  options={[
                      {id:'dalit', label:'दलित (Dalit)', value:'Dalit'},
                      {id:'janajati', label:'जनजाति (Janajati)', value:'Janajati'},
                      {id:'madhesi', label:'मधेसी (Madhesi)', value:'Madhesi'},
                      {id:'brahmin', label:'ब्राह्मण/क्षेत्री (Brahmin/Chhetri)', value:'Brahmin/Chhetri'},
                      {id:'muslim', label:'मुस्लिम (Muslim)', value:'Muslim'},
                      {id:'other', label:'अन्य (Other)', value:'Other'}
                  ]} 
                  value={formData.ethnicity} 
                  onChange={e => setFormData({...formData, ethnicity: e.target.value})} 
                  required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input label="उमेर" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required icon={<Calendar size={18}/>} />
                <Input label="फोन नं." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} icon={<Phone size={18}/>} />
            </div>

            <Input label="ठेगाना" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={18}/>} />

            <Select label="दर्ता प्रकार" options={regTypes} value={formData.regType} onChange={e => setFormData({...formData, regType: e.target.value})} required icon={<List size={18}/>} />

            {activeTab === 'TB' ? (
                <Select label="TB वर्गीकरण" options={tbClassification} value={formData.classification} onChange={e => setFormData({...formData, classification: e.target.value})} required icon={<Stethoscope size={18}/>} />
            ) : (
                <Select 
                  label="कुष्ठरोग प्रकार (MB/PB)" 
                  options={leprosyTypes} 
                  value={formData.leprosyType || ''} 
                  onChange={e => setFormData({
                      ...formData, 
                      leprosyType: (e.target.value === '' ? undefined : e.target.value) as 'MB' | 'PB' | undefined
                  })} 
                  required 
                  icon={<ClipboardList size={18}/>} 
                  placeholder="-- प्रकार छान्नुहोस् --"
                />
            )}
            <NepaliDatePicker 
              label="दर्ता मिति" 
              value={formData.registrationDate} 
              onChange={val => setFormData({...formData, registrationDate: val})} 
              required 
              // Removed minDate and maxDate restrictions
            />

            <NepaliDatePicker 
              label="उपचार सुरु गरेको मिति" 
              value={formData.treatmentStartDate || ''} 
              onChange={val => setFormData({...formData, treatmentStartDate: val})} 
              required 
            />

            {activeTab === 'TB' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="बिरामीको तौल (Weight)" type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} icon={<Scale size={18}/>} />
                  <Select label="उपचार तालिका (Regimen)" options={[{id:'adult', label:'Adult', value:'Adult'}, {id:'child', label:'Child', value:'Child'}]} value={formData.regimen} onChange={e => setFormData({...formData, regimen: e.target.value as any})} />
                </div>

                <div className="space-y-4">
                  <Select 
                    label="उपचार प्रकार (Treatment Type)" 
                    options={treatmentTypeOptions} 
                    value={treatmentTypeOptions.some(opt => opt.value === formData.treatmentType && opt.value !== 'Other') ? formData.treatmentType : (formData.treatmentType ? 'Other' : '')} 
                    onChange={e => {
                      const val = e.target.value;
                      if (val !== 'Other') {
                        setFormData({...formData, treatmentType: val});
                      } else if (formData.treatmentType === '2HRZE+4HR' || formData.treatmentType === '2HRZE+10HR' || formData.treatmentType === '6HRZE' || formData.treatmentType === '6HRZE+Lfx' || formData.treatmentType === '2HRZE+7HRE' || !formData.treatmentType) {
                        setFormData({...formData, treatmentType: ''});
                      }
                    }} 
                    icon={<Pill size={18}/>}
                  />

                  {formData.classification === 'EP' && (
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                      <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-2">
                        <Clock size={14} /> उपचार अवधि थप (Treatment Extension for EP)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="सघन चरण थप दिन (Intensive Ext. Days)" 
                          type="number" 
                          value={formData.intensivePhaseExtensionDays} 
                          onChange={e => setFormData({...formData, intensivePhaseExtensionDays: parseInt(e.target.value) || 0})} 
                          placeholder="0"
                        />
                        <Input 
                          label="निरन्तर चरण थप दिन (Continuation Ext. Days)" 
                          type="number" 
                          value={formData.continuationPhaseExtensionDays} 
                          onChange={e => {
                            let val = parseInt(e.target.value) || 0;
                            // Standard is 120, max is 300 total, so max extension is 180
                            if (val > 180) val = 180;
                            setFormData({...formData, continuationPhaseExtensionDays: val});
                          }} 
                          placeholder="0"
                          helperText="कुल निरन्तर चरण ३०० दिन भन्दा बढी हुन पाउने छैन।"
                        />
                      </div>
                    </div>
                  )}
                  
                  {(formData.treatmentType === '' || !treatmentTypeOptions.some(opt => opt.value === formData.treatmentType && opt.value !== 'Other')) && (
                    <Input 
                      label="अन्य उपचार प्रकार (Manual Entry)" 
                      placeholder="उपचार प्रकार लेख्नुहोस्..." 
                      value={formData.treatmentType} 
                      onChange={e => setFormData({...formData, treatmentType: e.target.value})} 
                    />
                  )}
                </div>
              </>
            )}

            <Select 
              label="अवस्था (Status)" 
              options={[
                {id:'active', label:'Active', value:'Active'},
                {id:'transfer_out', label:'Transfer Out', value:'Transfer Out'},
                {id:'completed', label:'Completed', value:'Completed'},
                {id:'died', label:'Died', value:'Died'},
                {id:'loss_to_followup', label:'Loss to Follow-up', value:'Loss to Follow-up'}
              ]} 
              value={formData.status || 'Active'} 
              onChange={e => {
                const newStatus = e.target.value as any;
                setFormData({
                  ...formData, 
                  status: newStatus, 
                  statusDateBs: newStatus === 'Active' ? null : (formData.statusDateBs || todayBs)
                });
              }} 
              required 
              icon={<Activity size={18}/>} 
            />

            {formData.status !== 'Active' && (
              <NepaliDatePicker
                label="अवस्था परिवर्तन मिति (Status Date)"
                value={formData.statusDateBs || ''}
                onChange={val => setFormData({...formData, statusDateBs: val})}
                required
              />
            )}

            <div className="md:col-span-2 pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={handleReset} className="flex items-center gap-2 px-6 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-bold text-sm"><RotateCcw size={16}/> {editingPatientId ? 'रद्द (Cancel)' : 'रिसेट (Reset)'}</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all font-bold text-sm"><Save size={16}/> {editingPatientId ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस्'}</button>
            </div>
          </form>
        )}
      </div>

      {/* Patient List */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-visible">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-700 font-nepali">हालै दर्ता भएका बिरामीहरू ({activeTab})</h3>
              <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="नाम वा ठेगाना..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20" />
              </div>
          </div>
          <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-500 font-bold border-b">
                  <tr>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">बिरामी विवरण</th>
                      <th className="px-6 py-3">दर्ता प्रकार</th>
                      <th className="px-6 py-3">वर्गीकरण</th>
                      <th className="px-6 py-3">अवस्था</th>
                      <th className="px-6 py-3">रिपोर्टहरू</th>
                      <th className="px-6 py-3">मिति</th>
                      <th className="px-6 py-3 text-right">कार्य</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {(patients || []).filter(p => p.fiscalYear === currentFiscalYear && p.serviceType === activeTab && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.address.toLowerCase().includes(searchTerm.toLowerCase()) || p.patientId.toLowerCase().includes(searchTerm.toLowerCase()))).map(p => ( // Defensive check
                      <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-xs">{p.patientId}</td>
                          <td className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => setSelectedPatientForDetails(p)}>
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.age} Yrs | {p.address} | {p.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black border bg-slate-50 text-slate-700 border-slate-200">
                                  {regTypes.find(r => r.value === p.regType)?.label || p.regType}
                              </span>
                          </td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${activeTab === 'TB' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                                  {activeTab === 'TB' ? p.classification : p.leprosyType}
                              </span>
                          </td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  p.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                                  p.status === 'Transfer Out' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                  p.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-slate-50 text-slate-700 border-slate-200'
                              }`}>
                                  {p.status || 'Active'}
                                  {p.statusDateBs && (
                                      <div className="text-[8px] mt-0.5 opacity-70">({p.statusDateBs})</div>
                                  )}
                              </span>
                          </td>
                          <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                  {(p.reports || []).map((r, idx) => {
                                      const grading = r.result.includes('Positive') ? (r.result.match(/\(([^)]+)\)/)?.[1] || 'Pos') : 'Neg';
                                      return (
                                          <span key={idx} className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${r.result.includes('Pos') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                              M{r.month}: {grading}
                                          </span>
                                      );
                                  })}
                                  {(!p.reports || p.reports.length === 0) && <span className="text-slate-300">-</span>}
                              </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-slate-500 font-nepali">
                              <div className="flex flex-col">
                                  <span>दर्ता: {p.registrationDate}</span>
                                  {p.treatmentStartDate && <span className="text-indigo-600 font-bold">सुरु: {p.treatmentStartDate}</span>}
                              </div>
                          </td>
                          <td className="px-6 py-4 text-right relative">
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => {
                                      setActiveMenuPatientId(activeMenuPatientId === p.id ? null : p.id);
                                  }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors">
                                      <MoreVertical size={18}/>
                                  </button>
                                  
                                  {activeMenuPatientId === p.id && (
                                      <>
                                          <div 
                                              className="fixed inset-0 z-[5]" 
                                              onClick={() => setActiveMenuPatientId(null)}
                                          ></div>
                                          <div className="absolute right-14 top-4 z-10 bg-white border rounded-xl shadow-xl py-2 w-48 animate-in fade-in zoom-in-95">
                                              <button onClick={() => {
                                                  handleEditPatient(p);
                                                  setActiveMenuPatientId(null);
                                              }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                  <Pencil size={14}/> सम्पादन गर्नुहोस्
                                              </button>
                                              {activeTab === 'TB' && (
                                                <>
                                                  <button onClick={() => {
                                                      setSelectedPatientForTreatmentCard(p);
                                                      setShowTreatmentCardModal(true);
                                                      setActiveMenuPatientId(null);
                                                  }} className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                                                      <ClipboardList size={14}/> TB उपचार कार्ड
                                                  </button>
                                                  <button onClick={() => {
                                                      setSelectedPatientForInterFacility(p);
                                                      setShowInterFacilityModal(true);
                                                      setActiveMenuPatientId(null);
                                                  }} className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                                                      <Microscope size={14}/> अन्तर संस्था अनुरोध
                                                  </button>
                                                </>
                                              )}
                                              <div className="border-t my-1"></div>
                                              <button onClick={() => {
                                                  handleDeletePatient(p.id, p.name);
                                                  setActiveMenuPatientId(null);
                                              }} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                  <Trash2 size={14}/> हटाउनुहोस्
                                              </button>
                                          </div>
                                      </>
                                  )}
                              </div>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* Report Center Modal (Combined Recent & History) */}
      {showReportCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportCenter(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b bg-teal-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><Microscope size={20}/></div>
                          <h3 className="font-bold text-slate-800 text-lg font-nepali">खकार रिपोर्ट केन्द्र (Sputum Report Center)</h3>
                      </div>
                      <button onClick={() => setShowReportCenter(false)} className="p-2 hover:bg-white/50 rounded-full"><X size={20}/></button>
                  </div>

                  <div className="flex border-b">
                      <button onClick={() => setReportCenterTab('Recent')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${reportCenterTab === 'Recent' ? 'bg-white text-teal-600 border-b-2 border-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Clock size={16}/> हालसालैका रिपोर्टहरू ({patientsWithNewReports.length})
                      </button>
                      <button onClick={() => setReportCenterTab('History')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${reportCenterTab === 'History' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                          <History size={16}/> रिपोर्ट इतिहास ({allReportsHistory.length})
                      </button>
                      <button onClick={() => setReportCenterTab('InterFacility')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${reportCenterTab === 'InterFacility' ? 'bg-white text-orange-600 border-b-2 border-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                          <MapPin size={16}/> अन्तर संस्था अनुरोधहरू ({interFacilityRequestsForMe.length})
                      </button>
                  </div>

                  <div className="flex-1 overflow-auto">
                      {reportCenterTab === 'Recent' ? (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                  <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">नाम</th><th className="px-6 py-3">महिना</th><th className="px-6 py-3">नतिजा</th><th className="px-6 py-3">कार्य</th></tr>
                              </thead>
                              <tbody className="divide-y">
                                  {patientsWithNewReports.map(p => (
                                      <tr key={p.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{p.patientId}</td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold flex items-center gap-2">
                                                  {p.name}
                                                  {(p as any).isInterFacilityReport && (
                                                      <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-black">अन्तर संस्था</span>
                                                  )}
                                              </div>
                                              <div className="text-[10px] text-slate-400">{p.age} Yrs | {p.address} | {p.phone}</div>
                                          </td>
                                          <td className="px-6 py-4 text-xs">Month {p.latestReportMonth}</td>
                                          <td className="px-6 py-4">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${p.latestResult?.includes('Pos') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                  {p.latestResult?.includes('Positive') ? (p.latestResult.match(/\(([^)]+)\)/)?.[1] || 'Pos') : 'Neg'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4">
                                              <button onClick={() => {
                                                  if ((p as any).isInterFacilityReport) {
                                                      const req = globalInterFacilityRequests.find(r => r.id === (p as any).requestId);
                                                      if (req) {
                                                          onUpdateInterFacilityRequest({...req, viewedBySource: true});
                                                      }
                                                  } else {
                                                      onUpdatePatient({...p, newReportAvailable: false});
                                                  }
                                                  alert("विवरण सुरक्षित गरियो");
                                              }} className="text-teal-600 hover:underline font-bold text-xs">Mark as Viewed</button>
                                          </td>
                                      </tr>
                                  ))}
                                  {patientsWithNewReports.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">कुनै नयाँ रिपोर्ट छैन।</td></tr>}
                              </tbody>
                          </table>
                      ) : reportCenterTab === 'History' ? (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                  <tr><th className="px-6 py-3">मिति</th><th className="px-6 py-3">बिरामी</th><th className="px-6 py-3">महिना</th><th className="px-6 py-3">ल्याब नं</th><th className="px-6 py-3">नतिजा</th><th className="px-6 py-3 text-right">कार्य</th></tr>
                              </thead>
                              <tbody className="divide-y">
                                  {allReportsHistory.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 text-xs font-nepali">{item.report.dateNepali}</td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold">{item.patient.name}</div>
                                              <div className="text-[10px] text-slate-400">{item.patient.patientId} | {item.patient.age} Yrs | {item.patient.address} | {item.patient.phone}</div>
                                          </td>
                                          <td className="px-6 py-4 text-xs font-bold">Month {item.report.month}</td>
                                          <td className="px-6 py-4 font-mono">{item.report.labNo}</td>
                                          <td className="px-6 py-4 font-bold">
                                              {item.report.result.includes('Positive') ? (item.report.result.match(/\(([^)]+)\)/)?.[1] || 'Pos') : 'Neg'}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => handleDeleteReport(item.patient, item.report.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="हटाउनुहोस्">
                                                  <Trash2 size={16} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                                  {allReportsHistory.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">कुनै रिपोर्ट इतिहास छैन।</td></tr>}
                              </tbody>
                          </table>
                      ) : (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                  <tr><th className="px-6 py-3">अनुरोध मिति</th><th className="px-6 py-3">बिरामी</th><th className="px-6 py-3">महिना</th><th className="px-6 py-3">पठाउने संस्था</th><th className="px-6 py-3 text-right">कार्य</th></tr>
                              </thead>
                              <tbody className="divide-y">
                                  {interFacilityRequestsForMe.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 text-xs font-nepali">{item.request.requestDateBs}</td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold">{item.patient.name}</div>
                                              <div className="text-[10px] text-slate-400">{item.patient.patientId} | {item.patient.age} Yrs | {item.patient.address} | {item.patient.phone}</div>
                                          </td>
                                          <td className="px-6 py-4 text-xs font-bold text-orange-600">Month {item.request.month}</td>
                                          <td className="px-6 py-4 text-xs font-bold">
                                              <div className="font-bold">{item.request.sourceOrgName}</div>
                                              <div className="text-[10px] text-slate-400">{item.request.targetPalikaName}</div>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => {
                                                  setSelectedInterFacilityRequest(item);
                                                  setLabFormData({testDate: new Date().toISOString().split('T')[0], testDateNepali: '', labNo: '', result: '', grading: ''});
                                              }} className="bg-orange-600 text-white px-4 py-1 rounded-lg text-xs font-bold">रिपोर्ट प्रविष्ट</button>
                                          </td>
                                      </tr>
                                  ))}
                                  {interFacilityRequestsForMe.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">कुनै अन्तर संस्था अनुरोध छैन।</td></tr>}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Sputum Request Modal (Required Tests) */}
      {showSputumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSputumModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center text-orange-800">
                    <h3 className="font-bold text-lg font-nepali">खकार परीक्षण आवश्यक बिरामीहरू</h3>
                    <button onClick={() => setShowSputumModal(false)} className="p-2 hover:bg-white/50 rounded-full"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-bold">
                            <tr><th className="px-6 py-3">बिरामी</th><th className="px-6 py-3">कारण</th><th className="px-6 py-3 text-right">कार्य</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {patientsNeedingSputum.map(p => (
                                <tr key={p.id} className="hover:bg-orange-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{p.name}</div>
                                        <div className="text-[10px] text-slate-400">{p.patientId} | {p.age} Yrs | {p.address} | {p.phone}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{p.reason}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => {
                                            setSelectedPatientForLab({patient: p, reason: p.reason, scheduleMonth: p.scheduleMonth});
                                            setLabFormData({testDate: new Date().toISOString().split('T')[0], testDateNepali: '', labNo: '', result: '', grading: ''});
                                        }} className="bg-indigo-600 text-white px-4 py-1 rounded-lg text-xs font-bold">रिपोर्ट प्रविष्ट</button>
                                    </td>
                                </tr>
                            ))}
                            {interFacilityRequestsForMe.map(item => (
                                <tr key={item.request.id} className="hover:bg-orange-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{item.patient.name}</div>
                                        <div className="text-[10px] text-slate-400">{item.patient.patientId} | {item.patient.age} Yrs | {item.patient.address} | {item.patient.phone}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">अन्तर संस्था: {item.request.sourceOrgName} (Month {item.request.month})</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => {
                                            setSelectedInterFacilityRequest(item);
                                            setLabFormData({testDate: new Date().toISOString().split('T')[0], testDateNepali: '', labNo: '', result: '', grading: ''});
                                        }} className="bg-orange-600 text-white px-4 py-1 rounded-lg text-xs font-bold">रिपोर्ट प्रविष्ट</button>
                                    </td>
                                </tr>
                            ))}
                            {patientsNeedingSputum.length === 0 && interFacilityRequestsForMe.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-400 italic">हाल कुनै परीक्षण आवश्यक छैन।</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Lab Result Entry Form (Modal on top) */}
      {selectedPatientForLab && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedPatientForLab(null)}></div>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
                  <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center">
                      <h3 className="font-bold font-nepali">ल्याब रिपोर्ट प्रविष्टि ({selectedPatientForLab.patient.name})</h3>
                      <button onClick={() => setSelectedPatientForLab(null)}><X size={20}/></button>
                  </div>
                  <form onSubmit={handleLabSubmit} className="p-6 space-y-4">
                      <Input label="ल्याब नं." value={labFormData.labNo} onChange={e => setLabFormData({...labFormData, labNo: e.target.value})} required icon={<FileDigit size={16}/>} />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="मिति (AD)" type="date" value={labFormData.testDate} onChange={e => setLabFormData({...labFormData, testDate: e.target.value})} required />
                        <NepaliDatePicker label="मिति (BS)" value={labFormData.testDateNepali} onChange={val => setLabFormData({...labFormData, testDateNepali: val})} required />
                      </div>

                      <div className="space-y-2">
                          <label className="block text-sm font-bold text-slate-700">नतिजा</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => setLabFormData({...labFormData, result: 'Negative'})} className={`py-3 rounded-xl border-2 font-bold transition-all ${labFormData.result === 'Negative' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-100 text-slate-400'}`}>Negative</button>
                              <button type="button" onClick={() => setLabFormData({...labFormData, result: 'Positive'})} className={`py-3 rounded-xl border-2 font-bold transition-all ${labFormData.result === 'Positive' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>Positive</button>
                          </div>
                      </div>

                      {labFormData.result === 'Positive' && (
                          <Select label="ग्रेडिङ" options={[{id:'1',value:'1+',label:'1+'}, {id:'2',value:'2+',label:'2+'}, {id:'3',value:'3+ or more',label:'3+ or more'}, {id:'s',value:'Scanty',label:'Scanty'}]} value={labFormData.grading} onChange={e => setLabFormData({...labFormData, grading: e.target.value})} required />
                      )}

                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button type="button" onClick={() => setSelectedPatientForLab(null)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                          <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">सुरक्षित गर्नुहोस्</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      {selectedPatientForDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedPatientForDetails(null)}></div>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in-95">
                  <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center shrink-0">
                      <h3 className="font-bold font-nepali">बिरामीको विवरण ({selectedPatientForDetails.name})</h3>
                      <button onClick={() => setSelectedPatientForDetails(null)}><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                      <p><strong>ID:</strong> {selectedPatientForDetails.patientId}</p>
                      <p><strong>नाम:</strong> {selectedPatientForDetails.name}</p>
                      <p><strong>उमेर:</strong> {selectedPatientForDetails.age}</p>
                      <p><strong>ठेगाना:</strong> {selectedPatientForDetails.address}</p>
                      <p><strong>फोन नं:</strong> {selectedPatientForDetails.phone}</p>
                      <p><strong>दर्ता मिति:</strong> {selectedPatientForDetails.registrationDate}</p>
                      <p><strong>उपचार सुरु गरेको मिति:</strong> {selectedPatientForDetails.treatmentStartDate || '-'}</p>
                      <div className="flex items-center gap-2">
                        <strong>अवस्था:</strong>
                        <select 
                          value={selectedPatientForDetails.status || 'Active'} 
                          onChange={(e) => {
                            const newStatus = e.target.value as any;
                            const updatedPatient = { 
                              ...selectedPatientForDetails, 
                              status: newStatus, 
                              statusDateBs: newStatus === 'Active' ? null : (selectedPatientForDetails.statusDateBs || todayBs)
                            };
                            const sanitizedPatient = JSON.parse(JSON.stringify(updatedPatient));
                            onUpdatePatient(sanitizedPatient);
                            setSelectedPatientForDetails(sanitizedPatient);
                          }}
                          className={`text-xs font-bold px-2 py-1 rounded border ${
                            selectedPatientForDetails.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                            selectedPatientForDetails.status === 'Transfer Out' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            selectedPatientForDetails.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="Transfer Out">Transfer Out</option>
                          <option value="Completed">Completed</option>
                          <option value="Died">Died</option>
                          <option value="Loss to Follow-up">Loss to Follow-up</option>
                        </select>
                      </div>
                      {selectedPatientForDetails.status !== 'Active' && (
                        <div className="flex items-center gap-2 mt-2">
                          <strong>अवस्था परिवर्तन मिति:</strong>
                          <NepaliDatePicker
                            value={selectedPatientForDetails.statusDateBs || ''}
                            onChange={(val) => {
                              const updatedPatient = { ...selectedPatientForDetails, statusDateBs: val || null };
                              const sanitizedPatient = JSON.parse(JSON.stringify(updatedPatient));
                              onUpdatePatient(sanitizedPatient);
                              setSelectedPatientForDetails(sanitizedPatient);
                            }}
                          />
                        </div>
                      )}
                      {selectedPatientForDetails.serviceType === 'TB' && (
                        <>
                          <p><strong>तौल:</strong> {selectedPatientForDetails.weight || '-'} kg</p>
                          <p><strong>उपचार तालिका:</strong> {selectedPatientForDetails.regimen || '-'}</p>
                          <p><strong>उपचार प्रकार:</strong> {selectedPatientForDetails.treatmentType || '-'}</p>
                          {getDosageInfo(selectedPatientForDetails) && (
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mt-2">
                              <p className="text-xs font-bold text-blue-800 mb-1">औषधि मात्रा (Dosage Info):</p>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-white p-2 rounded border border-blue-100">
                                  <span className="block text-slate-500">पहिलो चरण:</span>
                                  <span className="font-bold text-blue-700">{getDosageInfo(selectedPatientForDetails)?.phase1}</span>
                                </div>
                                <div className="bg-white p-2 rounded border border-blue-100">
                                  <span className="block text-slate-500">दोस्रो चरण:</span>
                                  <span className="font-bold text-blue-700">{getDosageInfo(selectedPatientForDetails)?.phase2}</span>
                                </div>
                                <div className="col-span-2 bg-indigo-600 text-white p-2 rounded text-center font-black">
                                  दैनिक {getDosageInfo(selectedPatientForDetails)?.tablets} ट्याब्लेट (Tablets)
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="space-y-2">
                          <p><strong>खकार परीक्षण तालिका:</strong></p>
                          <ul className="list-disc pl-5">
                              {getAllSputumFollowupDates(selectedPatientForDetails).map(item => (
                                  <li key={item.month} className="flex flex-col py-2 border-b border-slate-50 last:border-0">
                                      <div className="flex items-center justify-between">
                                          <span className="text-sm">
                                              {item.label}: <span className="font-mono text-xs text-slate-500">{item.date}</span> - <strong className={item.status === 'Completed' ? 'text-green-600' : 'text-amber-600'}>{item.status}</strong>
                                          </span>
                                          {item.status === 'Pending' && (selectedPatientForDetails.status === 'Active' || !selectedPatientForDetails.status) && (
                                              <button 
                                                  onClick={() => {
                                                      setSelectedPatientForLab({ 
                                                          patient: selectedPatientForDetails, 
                                                          reason: item.label, 
                                                          scheduleMonth: item.month 
                                                      });
                                                      setSelectedPatientForDetails(null);
                                                  }}
                                                  className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 font-bold transition-colors"
                                              >
                                                  प्रविष्टि
                                              </button>
                                          )}
                                      </div>
                                      {item.status === 'Completed' && (
                                          <div className="mt-1 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                                              {(() => {
                                                  const localReport = (selectedPatientForDetails.reports || []).find(r => r.month === item.month);
                                                  const interReport = (globalInterFacilityRequests || []).find(req => req.patientId === selectedPatientForDetails.id && req.month === item.month && req.status === 'Completed');
                                                  
                                                  if (localReport) {
                                                      return (
                                                          <div className="flex justify-between">
                                                              <span>Lab No: {localReport.labNo} | Result: <strong className={localReport.result === 'Positive' ? 'text-red-600' : 'text-green-600'}>{localReport.result} {localReport.grading}</strong></span>
                                                              <span>{localReport.testDateNepali}</span>
                                                          </div>
                                                      );
                                                  } else if (interReport) {
                                                      return (
                                                          <div className="flex justify-between">
                                                              <span>Lab No: {interReport.labNo} | Result: <strong className={interReport.result === 'Positive' ? 'text-red-600' : 'text-green-600'}>{interReport.result}</strong> (Inter-facility: {interReport.targetFacilityName})</span>
                                                              <span>{interReport.completedDateBs}</span>
                                                          </div>
                                                      );
                                                  }
                                                  return null;
                                              })()}
                                          </div>
                                      )}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  </div>
                  <div className="p-6 border-t flex justify-end">
                      <button onClick={() => setSelectedPatientForDetails(null)} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">बन्द गर्नुहोस्</button>
                  </div>
              </div>
          </div>
      )}

      {/* Inter-facility Request Modal */}
      {showInterFacilityModal && selectedPatientForInterFacility && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowInterFacilityModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
                <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center">
                    <h3 className="font-bold font-nepali">अन्तर संस्था खकार परीक्षण अनुरोध ({selectedPatientForInterFacility.name})</h3>
                    <button onClick={() => setShowInterFacilityModal(false)}><X size={20}/></button>
                </div>
                <form onSubmit={handleInterFacilitySubmit} className="p-6 space-y-4">
                    <Select 
                      label="परीक्षण महिना (Month)" 
                      options={[
                        {id:'m0', label:'Month 0', value:'0'},
                        {id:'m2', label:'Month 2', value:'2'},
                        {id:'m3', label:'Month 3', value:'3'},
                        {id:'m5', label:'Month 5', value:'5'},
                        {id:'m6', label:'Month 6', value:'6'}
                      ]} 
                      value={interFacilityFormData.month.toString()} 
                      onChange={e => setInterFacilityFormData({...interFacilityFormData, month: parseInt(e.target.value)})} 
                      required 
                    />
                    
                    <Select
                      label="पालिका छनोट गर्नुहोस्"
                      value={interFacilityFormData.targetPalikaId}
                      onChange={(e) => {
                        const selected = palikaOptions.find(o => o.value === e.target.value);
                        setInterFacilityFormData({
                          ...interFacilityFormData, 
                          targetPalikaId: e.target.value,
                          targetPalikaName: selected?.label || ''
                        });
                      }}
                      options={[{ id: '', label: 'पालिका छान्नुहोस्', value: '' }, ...palikaOptions]}
                      icon={<MapPin size={18} />}
                    />

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={() => setShowInterFacilityModal(false)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                        <button type="submit" disabled={!interFacilityFormData.targetPalikaId} className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg disabled:opacity-50">अनुरोध पठाउनुहोस्</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Inter-facility Report Entry Modal */}
      {selectedInterFacilityRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedInterFacilityRequest(null)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
                <div className="p-6 border-b bg-orange-50 text-orange-800 flex justify-between items-center">
                    <h3 className="font-bold font-nepali">अन्तर संस्था रिपोर्ट प्रविष्टि ({selectedInterFacilityRequest.patient.name})</h3>
                    <button onClick={() => setSelectedInterFacilityRequest(null)}><X size={20}/></button>
                </div>
                <form onSubmit={handleInterFacilityReportSubmit} className="p-6 space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs text-orange-800 mb-4">
                        <div className="font-bold">अनुरोध विवरण:</div>
                        <div>महिना: Month {selectedInterFacilityRequest.request.month}</div>
                        <div>पठाउने संस्था: {selectedInterFacilityRequest.request.sourceOrgName} ({selectedInterFacilityRequest.request.targetPalikaName})</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="परीक्षण मिति (AD)" type="date" value={labFormData.testDate} onChange={e => setLabFormData({...labFormData, testDate: e.target.value})} required />
                        <NepaliDatePicker label="परीक्षण मिति (BS)" value={labFormData.testDateNepali} onChange={val => setLabFormData({...labFormData, testDateNepali: val})} required />
                    </div>
                    <Input label="ल्याब नम्बर" placeholder="Lab No." value={labFormData.labNo} onChange={e => setLabFormData({...labFormData, labNo: e.target.value})} required />
                    <Select 
                        label="नतिजा" 
                        options={[{id:'neg', label:'Negative', value:'Negative'}, {id:'pos', label:'Positive', value:'Positive'}]} 
                        value={labFormData.result} 
                        onChange={e => setLabFormData({...labFormData, result: e.target.value})} 
                        required 
                    />
                    {labFormData.result === 'Positive' && (
                        <Select 
                            label="ग्रेडिङ (Grading)" 
                            options={[{id:'1', label:'1+', value:'1+'}, {id:'2', label:'2+', value:'2+'}, {id:'3', label:'3+ or more', value:'3+ or more'}, {id:'sc', label:'Scanty', value:'Scanty'}]} 
                            value={labFormData.grading} 
                            onChange={e => setLabFormData({...labFormData, grading: e.target.value})} 
                            required 
                        />
                    )}
                    <div className="pt-4 border-t flex justify-between gap-3">
                        <button type="button" onClick={handleInterFacilityReportReject} className="bg-red-100 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-200">अस्वीकार गर्नुहोस्</button>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setSelectedInterFacilityRequest(null)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                            <button type="submit" className="bg-orange-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">रिपोर्ट सुरक्षित गर्नुहोस्</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}
      {/* Medicine Status Modal */}
      {showMedicineStatusModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Pill size={20} className="text-blue-600" />
                औषधि अवस्था विवरण (Medicine Status Report)
              </h3>
              <button onClick={() => setShowMedicineStatusModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MedicineStatusReport 
                patients={patients} 
                inventory={inventoryItems} 
                onDeletePatient={onDeletePatient}
                medicineMappings={generalSettings.medicineMappings || {}}
                onUpdateMappings={(mappings) => onUpdateGeneralSettings({ ...generalSettings, medicineMappings: mappings })}
                customStandardMedicineNames={generalSettings.customStandardMedicineNames || []}
                onUpdateCustomStandardNames={(names) => onUpdateGeneralSettings({ ...generalSettings, customStandardMedicineNames: names })}
                serviceType={activeTab as 'TB' | 'Leprosy'}
              />
            </div>
          </div>
        </div>
      )}

      {/* TB Treatment Card Modal */}
      {showTreatmentCardModal && selectedPatientForTreatmentCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowTreatmentCardModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-6 py-4 border-b bg-primary-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
                  <ClipboardList size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg font-nepali">TB उपचार कार्ड ({selectedPatientForTreatmentCard.name})</h3>
              </div>
              <button onClick={() => setShowTreatmentCardModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              <TBTreatmentCard tbPatientRecord={selectedPatientForTreatmentCard} />
            </div>
            <div className="px-6 py-4 border-t bg-white flex justify-end">
              <button 
                onClick={() => setShowTreatmentCardModal(false)}
                className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
