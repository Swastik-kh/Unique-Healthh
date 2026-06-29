import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Save, Printer, Plus, Trash2, User, Stethoscope, Pill, History, Baby, Edit, FileText, CheckCircle2, ArrowLeft, ShieldAlert, Send, Volume2, VolumeX } from 'lucide-react';
import { ServiceSeekerRecord, CBIMNCIRecord, PrescriptionItem, ServiceItem, OrganizationSettings, LabReport } from '../types/coreTypes';
import { InventoryItem } from '../types/inventoryTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';
import { growthCharts } from '../constants/growthCharts';
import { PrescriptionPrint } from './PrescriptionPrint';
import { callPatientSpeech } from './nepaliUtils';

interface CBIMNCISewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  cbimnciRecords?: CBIMNCIRecord[];
  labReports?: LabReport[];
  onSaveRecord: (record: CBIMNCIRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  serviceItems?: ServiceItem[];
  inventoryItems?: InventoryItem[];
  generalSettings: OrganizationSettings;
}

const initialPrescriptionItem: PrescriptionItem = {
  id: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

const initialAssessmentData = {
  dangerSigns: [],
  localInfection: [],
  jaundiceSigns: [],
  dehydrationSigns: [],
  feedingProblems: [],
  generalDangerSigns: [],
  respiratorySigns: [],
  feverSigns: [],
  nutritionSigns: [],
  immunization: [],
  breathingRate: '',
  temperature: '',
  diarrheaDays: '',
  weight: '',
  height: '',
  muac: '',
  coughDays: '',
  feverDays: '',
  earDischargeDays: '',
  malariaRisk: 'None',
  pallor: '',
  attachment: '',
  suckling: '',
  earPain: false,
  earDischarge: false,
  earDischarge14Days: false,
  mastoidSwelling: false,
  bloodInStool: false,
  choleraOutbreak: false,
  hivStatus: false,
  hivTestStatus: '',
  motherHivStatus: '',
  parotidSwellingOrLymphNodes: false,
  isBreastfeeding: false,
  stoppedBreastfeedingLessThan3Months: false,
  tbContact: false,
  tbSymptoms: [],
  tbDiagnosis: false,
  weightLoss: false,
  fatigue: false,
  gender: 'Male',
  measurementMethod: 'Automatic' // 'Standing' or 'Recumbent' or 'Automatic'
};

const initialCbimnciData: Partial<CBIMNCIRecord> = {
  chiefComplaints: '',
  diagnosis: '',
  investigation: '',
  prescriptions: [],
  advice: '',
  nextVisitDate: '',
  isRefer: false,
  isDeath: false,
  isFollowup: false,
  followupDays: 0
};

export const CBIMNCISewa: React.FC<CBIMNCISewaProps> = ({ 
  serviceSeekerRecords = [], 
  cbimnciRecords = [], 
  labReports = [],
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser,
  serviceItems = [],
  inventoryItems = [],
  generalSettings
}) => {
  const canSearch = useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return currentUser.allowedMenus?.includes('cbimnci_search');
  }, [currentUser]);

  const canDirectEntry = useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return currentUser.allowedMenus?.includes('cbimnci_direct_entry');
  }, [currentUser]);

  const [tempChildInfo, setTempChildInfo] = useState<{
    ageMonths: number | '',
    ageWeeks: number | '',
    ageDays: number | '',
    weight: number | '',
    height: number | '',
    gender: string,
    measurementMethod: string
  }>({ 
    ageMonths: '', 
    ageWeeks: '', 
    ageDays: '', 
    weight: '', 
    height: '', 
    gender: 'Male', 
    measurementMethod: 'Automatic' 
  });
  const [viewMode, setViewMode] = useState<'search' | 'entry' | 'selection'>(
    canSearch ? 'search' : (canDirectEntry ? 'selection' : 'search')
  );
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('queue_voice_muted') === 'true';
    }
    return false;
  });

  const toggleMute = () => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('queue_voice_muted', String(newVal));
    }
  };
  const [moduleType, setModuleType] = useState<'Infant' | 'Child'>('Child');
  const [assessmentData, setAssessmentData] = useState<any>(initialAssessmentData);
  const [cbimnciData, setCbimnciData] = useState<Partial<CBIMNCIRecord>>(initialCbimnciData);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem>(initialPrescriptionItem);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [existingSearchId, setExistingSearchId] = useState('');
  const [existingSearchResults, setExistingSearchResults] = useState<CBIMNCIRecord[]>([]);
  const [showExistingResults, setShowExistingResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const todayNepaliDate = useMemo(() => new NepaliDate().format('YYYY-MM-DD'), []);

  const patientsOnQueue = useMemo(() => {
    return serviceSeekerRecords.filter(patient => {
      const isToday = patient.date === todayNepaliDate;
      const isCBIMNCI = patient.serviceType === 'CBIMNCI';
      if (!isToday || !isCBIMNCI) return false;
      const hasCBIMNCIToday = cbimnciRecords.some(r => r.uniquePatientId === patient.uniquePatientId && r.visitDate === todayNepaliDate);
      return !hasCBIMNCIToday && patient.status !== 'Completed';
    });
  }, [serviceSeekerRecords, cbimnciRecords, todayNepaliDate]);

  const [hasDangerSigns, setHasDangerSigns] = useState<boolean | null>(null);
  const [hasCoughOrBreathingDifficulty, setHasCoughOrBreathingDifficulty] = useState<boolean | null>(null);
  const [hasDiarrhea, setHasDiarrhea] = useState<boolean | null>(null);
  const [showChloroquineModal, setShowChloroquineModal] = useState(false);
  const [showLowBloodSugarModal, setShowLowBloodSugarModal] = useState(false);
  const [showACTModal, setShowACTModal] = useState(false);
  const [showArtesunateModal, setShowArtesunateModal] = useState(false);
  
  // Classification logic added
  const nutritionClassification = useMemo(() => {
    const weight = parseFloat(assessmentData.weight);
    const height = parseFloat(assessmentData.height);
    const muac = parseFloat(assessmentData.muac);
    
    if (isNaN(weight) || height === 0) return 'Not Assessed';
    
    // Simplified classification logic based on guidelines
    // In a real implementation, a proper Z-Score table/library is required.
    // Here we use MUAC and provided simple heuristics.
    if (muac > 0 && muac < 11.5) return 'Severe Acute Malnutrition (SAM)';
    if (muac >= 11.5 && muac < 12.5) return 'Moderate Acute Malnutrition (MAM)';
    if (muac >= 12.5) return 'No Malnutrition';
    
    return 'Malnutrition Check Needed';
  }, [assessmentData.weight, assessmentData.height, assessmentData.muac]);

  const [hasFever, setHasFever] = useState<boolean | null>(null);
  const [hasEarProblem, setHasEarProblem] = useState<boolean | null>(null);
  const [hasJaundice, setHasJaundice] = useState<boolean | null>(null);
  const [tempF, setTempF] = useState('');
  const [isDirectEntry, setIsDirectEntry] = useState(false);

  useEffect(() => {
    const dehydrationSigns = assessmentData.dehydrationSigns || [];
    const count = [
      'छटपटीने, झिझिने (Restless, irritable)',
      'आँखा गडेको (Sunken eyes)',
      'पेटको छाला औंलाले तान्दा बिस्तारै फर्कने (Skin pinch goes back slowly)'
    ].filter(sign => dehydrationSigns.includes(sign)).length;

    if (count >= 2) {
      if (!cbimnciData.diagnosis?.includes('केही जलवियोजन (Some Dehydration)')) {
        setCbimnciData(prev => ({
          ...prev,
          diagnosis: prev.diagnosis ? `${prev.diagnosis}, केही जलवियोजन (Some Dehydration)` : 'केही जलवियोजन (Some Dehydration)'
        }));
      }
    }
  }, [assessmentData.dehydrationSigns]);

  useEffect(() => {
    const feedingProblems = assessmentData.feedingProblems || [];
    const hasThrush = feedingProblems.includes('मुखभित्र घाउ वा सेता दागहरू (Thrush)');
    const thrushAdvice = 'अैांलाको टुप्पामा सफा लुगा बेर्ने र नुन पानीले भिजाएर मुखभित्रको घाउ दिनमा ४ पटक ७ दिनसम्म पुछ्नुहोस्, आधा शक्तिको जेन्सियन भायलेट (Gentian Violet) ०.२५% वा क्लोट्रिमाजोल (Clotrimazole) माउथ पेन्ट दिनमा ४ पटक ७ दिनसम्म घाउमा लगाउनुहोस्।';
    
    setCbimnciData(prev => {
      const currentAdvice = prev.advice || '';
      const hasAdvice = currentAdvice.includes(thrushAdvice);
      
      if (hasThrush && !hasAdvice) {
        return { ...prev, advice: currentAdvice ? `${currentAdvice}\n${thrushAdvice}` : thrushAdvice };
      } else if (!hasThrush && hasAdvice) {
        return { ...prev, advice: currentAdvice.replace(thrushAdvice, '').trim() };
      }
      return prev;
    });
  }, [assessmentData.feedingProblems]);

  useEffect(() => {
    const coughDuration = parseInt(assessmentData.coughDays || '0');
    const feverDuration = parseInt(assessmentData.feverDays || '0');
    const coughSymptom = '२ हप्ता वा बढी समयदेखि खोकी (Cough >= 2 weeks)';
    const feverSymptom = '२ हप्ता वा बढी समयदेखि ज्वरो (Fever >= 2 weeks)';
    
    setAssessmentData(prev => {
      let nextSymptoms = [...(prev.tbSymptoms || [])];
      let changed = false;

      if (coughDuration >= 14 && !nextSymptoms.includes(coughSymptom)) {
        nextSymptoms.push(coughSymptom);
        changed = true;
      } else if (coughDuration < 14 && nextSymptoms.includes(coughSymptom)) {
        nextSymptoms = nextSymptoms.filter(s => s !== coughSymptom);
        changed = true;
      }

      if (feverDuration >= 14 && !nextSymptoms.includes(feverSymptom)) {
        nextSymptoms.push(feverSymptom);
        changed = true;
      } else if (feverDuration < 14 && nextSymptoms.includes(feverSymptom)) {
        nextSymptoms = nextSymptoms.filter(s => s !== feverSymptom);
        changed = true;
      }

      if (changed) {
        return { ...prev, tbSymptoms: nextSymptoms };
      }
      return prev;
    });
  }, [assessmentData.coughDays, assessmentData.feverDays]);

  const medicineSuggestions = useMemo(() => {
    const defaultMedicines = [
      'Amoxicillin DT 125mg',
      'Amoxicillin DT 250mg',
      'Amoxicillin Syrup',
      'Paracetamol',
      'Zinc',
      'ORS',
      'Vitamin A',
      'Albendazole',
      'Gentamicin Injection',
      'Ampicillin Injection'
    ];
    const fromInventory = inventoryItems.map(i => i.itemName);
    const fromRecords = cbimnciRecords.flatMap(r => r.prescriptions?.map(p => p.medicineName) || []);
    return Array.from(new Set([...defaultMedicines, ...fromInventory, ...fromRecords])).filter(Boolean).sort();
  }, [inventoryItems, cbimnciRecords]);

  const dosageSuggestions = [
    '125 mg',
    '250 mg',
    '500 mg',
    '5 ml',
    '10 ml',
    '1 Tablet',
    '1/2 Tablet',
    '1/4 Tablet'
  ];

  const frequencySuggestions = [
    'दिनमा १ पटक (OD)',
    'दिनमा २ पटक (BD)',
    'दिनमा ३ पटक (TDS)',
    'दिनमा ४ पटक (QID)',
    'आवश्यकता अनुसार (SOS)'
  ];
  
  const [activeTab, setActiveTab] = useState<'assessment' | 'reports'>('assessment');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintReport = useReactToPrint({
    contentRef: reportPrintRef,
  });
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [showInvestigationResults, setShowInvestigationResults] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = r.uniquePatientId.toLowerCase().includes(query) || 
                      r.uniquePatientId.replace(/[^0-9]/g, '').includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      const regMatch = r.registrationNumber.includes(query);
      
      // Filter by age: 5 years or less
      const ageInMonths = (r.ageYears || 0) * 12 + (r.ageMonths || 0);
      const isAgeValid = ageInMonths <= 60; // 5 years = 60 months
      
      return (idMatch || nameMatch || regMatch) && isAgeValid;
    });

    if (results.length === 1) {
      selectPatient(results[0]);
      setSearchId('');
      setShowSearchResults(false);
    } else if (results.length > 1) {
      setSearchResults(results);
      setShowSearchResults(true);
      setShowExistingResults(false);
    } else {
      alert('बिरामी भेटिएन वा उमेर ५ वर्षभन्दा बढी छ (Patient not found or age is over 5 years)');
      setCurrentPatient(null);
    }
  };

  const handleExistingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = existingSearchId.trim().toLowerCase();
    if (!query) return;

    const results = cbimnciRecords.filter(r => {
      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === r.uniquePatientId);
      const idMatch = r.uniquePatientId.toLowerCase().includes(query);
      const nameMatch = patient?.name.toLowerCase().includes(query);
      return idMatch || nameMatch;
    });

    // Group by uniquePatientId to show unique patients who have records
    const uniqueResults: CBIMNCIRecord[] = [];
    const seenIds = new Set();
    results.forEach(r => {
      if (!seenIds.has(r.uniquePatientId)) {
        seenIds.add(r.uniquePatientId);
        uniqueResults.push(r);
      }
    });

    if (uniqueResults.length === 1) {
      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === uniqueResults[0].uniquePatientId);
      if (patient) selectPatient(patient);
      setExistingSearchId('');
      setShowExistingResults(false);
    } else if (uniqueResults.length > 1) {
      setExistingSearchResults(uniqueResults);
      setShowExistingResults(true);
      setShowSearchResults(false);
    } else {
      alert('रेकर्ड भएको बिरामी भेटिएन (No existing record found for this patient)');
    }
  };

    const selectPatient = (patient: ServiceSeekerRecord, isEntry: boolean = false) => {
      const currentIndex = patientsOnQueue.findIndex(p => p.id === patient.id);
      const nextPatient = currentIndex !== -1 && currentIndex + 1 < patientsOnQueue.length 
        ? patientsOnQueue[currentIndex + 1] 
        : undefined;
      callPatientSpeech(patient, nextPatient);

      setCurrentPatient(patient);
      setIsDirectEntry(isEntry);
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchId('');
      setHasDangerSigns(null);
      setHasCoughOrBreathingDifficulty(null);
      setHasDiarrhea(null);
      setHasFever(null);
      setHasEarProblem(null);
      setHasJaundice(null);
      
      // Auto-select module based on age
      let isInfant = false;
      if (patient.ageDays !== undefined && patient.ageDays > 0) {
        isInfant = patient.ageDays < 60;
      } else {
        const ageInMonths = (patient.ageYears || 0) * 12 + (patient.ageMonths || 0);
        isInfant = ageInMonths < 2; // Less than 2 months
      }
      const module = isInfant ? 'Infant' : 'Child';
      setModuleType(module);
      setAssessmentData({
        ...initialAssessmentData,
        gender: patient.gender === 'Female' ? 'Female' : 'Male',
        weight: patient.weight ? patient.weight.toString() : ''
      });

      setCbimnciData(initialCbimnciData);
      setPrescriptionItems([]);
      setEditingRecordId(null);
      setTempF('');
    };

    const selectRecordForEdit = (record: CBIMNCIRecord) => {
      setModuleType(record.moduleType || 'Child');
      setHasDangerSigns(record.assessmentData?.generalDangerSigns && record.assessmentData.generalDangerSigns.length > 0);
      setHasCoughOrBreathingDifficulty(!!record.assessmentData?.breathingRate || (record.assessmentData?.respiratorySigns && record.assessmentData.respiratorySigns.length > 0));
      setHasDiarrhea(!!record.assessmentData?.diarrheaDays || (record.assessmentData?.dehydrationSigns && record.assessmentData.dehydrationSigns.length > 0) || record.assessmentData?.bloodInStool);
      setHasFever(!!record.assessmentData?.temperature || !!record.assessmentData?.feverDays || (record.assessmentData?.feverSigns && record.assessmentData.feverSigns.length > 0));
      setHasEarProblem(!!record.assessmentData?.earPain || !!record.assessmentData?.earDischarge || !!record.assessmentData?.mastoidSwelling);
      setHasJaundice(record.assessmentData?.jaundiceSigns && record.assessmentData.jaundiceSigns.length > 0);
      
      const data = record.assessmentData || {};
      setAssessmentData({
        dangerSigns: data.dangerSigns || [],
        localInfection: data.localInfection || [],
        jaundiceSigns: data.jaundiceSigns || [],
        dehydrationSigns: data.dehydrationSigns || [],
        feedingProblems: data.feedingProblems || [],
        generalDangerSigns: data.generalDangerSigns || [],
        respiratorySigns: data.respiratorySigns || [],
        feverSigns: data.feverSigns || [],
        nutritionSigns: data.nutritionSigns || [],
        immunization: data.immunization || [],
        breathingRate: data.breathingRate || '',
        temperature: data.temperature || '',
        diarrheaDays: data.diarrheaDays || '',
        weight: data.weight || '',
        height: data.height || '',
        gender: data.gender || 'Male',
        measurementMethod: data.measurementMethod || 'Automatic',
        muac: data.muac || '',
      coughDays: data.coughDays || '',
      feverDays: data.feverDays || '',
      earDischargeDays: data.earDischargeDays || '',
      malariaRisk: data.malariaRisk || 'None',
      pallor: data.pallor || '',
      attachment: data.attachment || '',
      suckling: data.suckling || '',
      earPain: data.earPain ?? false,
      earDischarge: data.earDischarge ?? false,
      mastoidSwelling: data.mastoidSwelling ?? false,
      bloodInStool: data.bloodInStool ?? false,
      hivStatus: data.hivStatus ?? false,
      parotidSwellingOrLymphNodes: data.parotidSwellingOrLymphNodes ?? false,
      hivTestStatus: data.hivTestStatus || '',
      motherHivStatus: data.motherHivStatus || '',
      isBreastfeeding: data.isBreastfeeding ?? false,
      stoppedBreastfeedingLessThan3Months: data.stoppedBreastfeedingLessThan3Months ?? false,
      tbContact: data.tbContact ?? false,
      tbSymptoms: data.tbSymptoms || [],
      tbDiagnosis: data.tbDiagnosis ?? false,
      weightLoss: data.weightLoss ?? false,
      fatigue: data.fatigue ?? false
    });

    if (data.temperature && !isNaN(parseFloat(data.temperature))) {
      const f = (parseFloat(data.temperature) * 9/5 + 32).toFixed(1);
      setTempF(f);
    } else {
      setTempF('');
    }

    setCbimnciData({
      chiefComplaints: record.chiefComplaints,
      diagnosis: record.diagnosis,
      investigation: record.investigation,
      prescriptions: record.prescriptions || [],
      advice: record.advice,
      nextVisitDate: record.nextVisitDate,
      isRefer: record.isRefer || false,
      isDeath: record.isDeath || false,
      isFollowup: record.isFollowup || false,
      followupDays: record.followupDays || 0
    });
    setPrescriptionItems(record.prescriptions || []);
    setEditingRecordId(record.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestore = () => {
    if (!currentPatient) return;
    const patientRecords = cbimnciRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId);
    if (patientRecords.length === 0) {
      alert('यो बिरामीको कुनै पुरानो रेकर्ड भेटिएन।');
      return;
    }
    const sortedRecords = [...patientRecords].sort((a, b) => b.id.localeCompare(a.id));
    const latestRecord = sortedRecords[0];
    const data = latestRecord.assessmentData || {};

    setModuleType(latestRecord.moduleType || 'Child');
    setAssessmentData({
      dangerSigns: data.dangerSigns || [],
      localInfection: data.localInfection || [],
      jaundiceSigns: data.jaundiceSigns || [],
      dehydrationSigns: data.dehydrationSigns || [],
      feedingProblems: data.feedingProblems || [],
      generalDangerSigns: data.generalDangerSigns || [],
      respiratorySigns: data.respiratorySigns || [],
      feverSigns: data.feverSigns || [],
      nutritionSigns: data.nutritionSigns || [],
      immunization: data.immunization || [],
      breathingRate: data.breathingRate || '',
      temperature: data.temperature || '',
      diarrheaDays: data.diarrheaDays || '',
      weight: data.weight || '',
      measurementMethod: data.measurementMethod || 'Automatic',
      muac: data.muac || '',
      coughDays: data.coughDays || '',
      feverDays: data.feverDays || '',
      earDischargeDays: data.earDischargeDays || '',
      malariaRisk: data.malariaRisk || 'None',
      pallor: data.pallor || '',
      attachment: data.attachment || '',
      suckling: data.suckling || '',
      earPain: data.earPain ?? false,
      earDischarge: data.earDischarge ?? false,
      mastoidSwelling: data.mastoidSwelling ?? false,
      bloodInStool: data.bloodInStool ?? false,
      hivStatus: data.hivStatus ?? false,
      parotidSwellingOrLymphNodes: data.parotidSwellingOrLymphNodes ?? false,
      hivTestStatus: data.hivTestStatus || '',
      motherHivStatus: data.motherHivStatus || '',
      isBreastfeeding: data.isBreastfeeding ?? false,
      stoppedBreastfeedingLessThan3Months: data.stoppedBreastfeedingLessThan3Months ?? false,
      tbContact: data.tbContact ?? false,
      tbSymptoms: data.tbSymptoms || [],
      tbDiagnosis: data.tbDiagnosis ?? false,
      weightLoss: data.weightLoss ?? false,
      fatigue: data.fatigue ?? false
    });

    if (data.temperature && !isNaN(parseFloat(data.temperature))) {
      const f = (parseFloat(data.temperature) * 9/5 + 32).toFixed(1);
      setTempF(f);
    } else {
      setTempF('');
    }

    setCbimnciData({
      chiefComplaints: latestRecord.chiefComplaints,
      diagnosis: latestRecord.diagnosis,
      investigation: latestRecord.investigation,
      prescriptions: latestRecord.prescriptions || [],
      advice: latestRecord.advice,
      nextVisitDate: latestRecord.nextVisitDate,
      isRefer: latestRecord.isRefer || false,
      isDeath: latestRecord.isDeath || false,
      isFollowup: latestRecord.isFollowup || false,
      followupDays: latestRecord.followupDays || 0
    });
    setPrescriptionItems(latestRecord.prescriptions || []);
    setEditingRecordId(latestRecord.id);
    alert(`पुरानो रेकर्ड (मिति: ${latestRecord.visitDate}) रिस्टोर गरियो।`);
  };

  const handleAddPrescription = () => {
    if (!currentPrescription.medicineName) return;
    const newItem = { ...currentPrescription, id: Date.now().toString() };
    setPrescriptionItems([...prescriptionItems, newItem]);
    setCurrentPrescription(initialPrescriptionItem);
    setShowPrescriptionForm(false);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptionItems(prescriptionItems.filter(item => item.id !== id));
  };

  const handleAddInvestigation = (serviceName: string) => {
    const currentInv = cbimnciData.investigation || '';
    const separator = currentInv ? '\n' : '';
    setCbimnciData({
      ...cbimnciData,
      investigation: `${currentInv}${separator}${serviceName}`
    });
    setInvestigationSearch('');
    setShowInvestigationResults(false);
  };

  const resetForm = () => {
    setCbimnciData(initialCbimnciData);
    setAssessmentData(initialAssessmentData);
    setPrescriptionItems([]);
    setEditingRecordId(null);
    setIsDirectEntry(false);
    setHasDangerSigns(null);
    setHasCoughOrBreathingDifficulty(null);
    setHasDiarrhea(null);
    setHasFever(null);
    setHasEarProblem(null);
    setHasJaundice(null);
    setTempF('');
  };

  const handleSave = () => {
    if (!currentPatient) return;

    if (hasDangerSigns === true && (!assessmentData.generalDangerSigns || assessmentData.generalDangerSigns.length === 0)) {
      alert('कृपया कम्तिमा एउटा खतराको संकेत छान्नुहोस्। (Please select at least one danger sign.)');
      return;
    }
    
    if (hasCoughOrBreathingDifficulty === true && !assessmentData.breathingRate) {
      alert('कृपया सासको दर भर्नुहोस्। (Please enter breathing rate.)');
      return;
    }
    
    if (hasDiarrhea === true && !assessmentData.diarrheaDays) {
      alert('कृपया पखाला लागेको दिन भर्नुहोस्। (Please enter days of diarrhea.)');
      return;
    }

    if (hasFever === true) {
      if (!assessmentData.temperature) {
        alert('कृपया तापक्रम भर्नुहोस्। (Please enter temperature.)');
        return;
      }
      if (!assessmentData.feverDays) {
        alert('कृपया ज्वरो आएको दिन भर्नुहोस्। (Please enter days of fever.)');
        return;
      }
      if (!assessmentData.malariaRisk) {
         alert('कृपया मलेरियाको जोखिम छान्नुहोस्। (Please select malaria risk.)');
         return;
      }
    }

    if (!cbimnciData.diagnosis) {
      alert('कृपया वर्गीकरण (Classification) भर्नुहोस्।');
      return;
    }
    if (prescriptionItems.length === 0) {
      alert('कृपया कम्तिमा एउटा औषधि सिफारिस (Prescription) थप्नुहोस्।');
      return;
    }

    const recordId = editingRecordId || Date.now().toString();
    const visitDate = editingRecordId 
      ? (cbimnciRecords.find(r => r.id === editingRecordId)?.visitDate || new NepaliDate().format('YYYY-MM-DD'))
      : new NepaliDate().format('YYYY-MM-DD');

    const newRecord: CBIMNCIRecord = {
      id: recordId,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      visitDate: visitDate,
      moduleType: moduleType,
      assessmentData: assessmentData,
      chiefComplaints: cbimnciData.chiefComplaints || '',
      diagnosis: cbimnciData.diagnosis || '',
      investigation: cbimnciData.investigation || '',
      prescriptions: prescriptionItems,
      advice: cbimnciData.advice,
      nextVisitDate: cbimnciData.nextVisitDate,
      isRefer: cbimnciData.isRefer,
      isDeath: cbimnciData.isDeath,
      isFollowup: cbimnciData.isFollowup,
      followupDays: cbimnciData.followupDays
    };

    onSaveRecord(newRecord);
    alert(editingRecordId ? 'CBIMNCI रेकर्ड अपडेट गरियो।' : 'CBIMNCI रेकर्ड सुरक्षित गरियो।');
    resetForm();
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `CBIMNCI-${currentPatient?.uniquePatientId}`,
    onBeforePrint: () => {
      return new Promise<void>((resolve) => {
        const images = printRef.current?.querySelectorAll('img');
        if (images && images.length > 0) {
          let loadedCount = 0;
          images.forEach((img) => {
            if (img.complete) {
              loadedCount++;
            } else {
              img.onload = () => {
                loadedCount++;
                if (loadedCount === images.length) resolve();
              };
              img.onerror = () => {
                loadedCount++;
                if (loadedCount === images.length) resolve();
              };
            }
          });
          if (loadedCount === images.length) resolve();
        } else {
          resolve();
        }
      });
    }
  });

  const filteredServices = serviceItems?.filter(item => 
    item.serviceName.toLowerCase().includes(investigationSearch.toLowerCase())
  ) || [];

  const renderAssessmentForm = () => {
    if (moduleType === 'Infant') {
      return (
        <div className="space-y-6">
          {/* PSBI / Danger Signs */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex justify-between items-center">
              <span>१. खतराका संकेतहरू (Danger Signs / PSBI)</span>
              <span className="text-xs font-normal text-blue-600">Booklet Page 14</span>
            </h4>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">के खतराका संकेतहरू छन्? (Are there any danger signs?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDangerSigns" checked={hasDangerSigns === true} onChange={() => setHasDangerSigns(true)} className="text-blue-600" />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDangerSigns" checked={hasDangerSigns === false} onChange={() => { setHasDangerSigns(false); setAssessmentData({...assessmentData, generalDangerSigns: []}); }} className="text-blue-600" />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasDangerSigns === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {[
                    'काँप्ने (Convulsions)', 
                    'दूध चुस्न/निल्न नसक्ने (Unable to feed)', 
                    'सुस्त वा बेहोस (Lethargic/Unconscious)', 
                    'कोखा हान्ने (Severe chest in-drawing)', 
                    'नाक फुलाउने (Nasal flaring)', 
                    'कन्कने (Grunting)', 
                    'तालु फुलेको (Bulging fontanelle)',
                    'नाइँटो रातो भई छालासम्म फैलिएको (Umbilical redness spreading to skin)',
                    'ज्वरो (Fever >= 37.5°C or skin feels hot)',
                    'अति कम तापक्रम (Hypothermia < 35.5°C)'
                  ].concat((currentPatient?.ageDays !== undefined && currentPatient.ageDays <= 7) ? ['सासको दर ६० वा सोभन्दा बढी (Respiratory rate 60 or more)'] : []).map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.generalDangerSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.generalDangerSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, generalDangerSigns: next});
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-3">
                <Input 
                  label="सासको दर (प्रति मिनेट)" 
                  type="number"
                  value={assessmentData.breathingRate || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, breathingRate: e.target.value})} 
                  placeholder="६० वा सोभन्दा बढी भए खतरा"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    label="तापक्रम (Celsius)" 
                    type="number"
                    step="0.1"
                    value={assessmentData.temperature || ''} 
                    onChange={(e) => {
                      const c = e.target.value;
                      setAssessmentData({...assessmentData, temperature: c});
                      if (c && !isNaN(parseFloat(c))) {
                        setTempF((parseFloat(c) * 9/5 + 32).toFixed(1));
                      } else {
                        setTempF('');
                      }
                    }} 
                    placeholder="37.5+ (ज्वरो), <35.5 (चिसो)"
                  />
                  <Input 
                    label="तापक्रम (Fahrenheit)" 
                    type="number" 
                    step="0.1" 
                    value={tempF} 
                    onChange={(e) => {
                      const f = e.target.value;
                      setTempF(f);
                      if (f && !isNaN(parseFloat(f))) {
                        const c = ((parseFloat(f) - 32) * 5/9).toFixed(1);
                        setAssessmentData({...assessmentData, temperature: c});
                      } else {
                        setAssessmentData({...assessmentData, temperature: ''});
                      }
                    }} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">स्थानीय संक्रमण (Local Infection)</label>
                {['नाइँटो रातो भएको (Red umbilicus)', 'नाइँटोबाट पीप बगेको (Umbilical pus)', 'छालामा  फोकाहरू (Skin pustules)', 'आँखाबाट पिप बगेको (Eye discharge)'].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.localInfection?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.localInfection || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, localInfection: next});
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Jaundice */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4 flex justify-between items-center">
              <span>२. कमलपित्त (Jaundice)</span>
              <span className="text-xs font-normal text-amber-600">Booklet Page 14</span>
            </h4>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">के कमलपित्त छ? (Is Jaundice present?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasJaundice" checked={hasJaundice === true} onChange={() => setHasJaundice(true)} className="text-amber-600" />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasJaundice" checked={hasJaundice === false} onChange={() => { setHasJaundice(false); setAssessmentData({...assessmentData, jaundiceSigns: []}); }} className="text-amber-600" />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasJaundice === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">कमलपित्तको अवस्था</label>
                  {['हत्केला र पैताला पहेंलो (Yellow palms/soles)', '२४ घण्टा भन्दा कमको शिशुमा कमलपित्त', 'कमलपित्त देखिएको (Jaundice present)'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.jaundiceSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.jaundiceSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, jaundiceSigns: next});
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Diarrhea */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex justify-between items-center">
              <span>३. पखाला (Diarrhea)</span>
              <span className="text-xs font-normal text-emerald-600">Booklet Page 15</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई पखाला लागेको छ? (Does the child have diarrhea?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDiarrheaInfant" checked={hasDiarrhea === true} onChange={() => setHasDiarrhea(true)} className="text-emerald-600 focus:ring-emerald-500" />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="hasDiarrheaInfant" checked={hasDiarrhea === false} onChange={() => { setHasDiarrhea(false); setAssessmentData({...assessmentData, diarrheaDays: '', dehydrationSigns: [], bloodInStool: false}); }} className="text-emerald-600 focus:ring-emerald-500" />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>
            {hasDiarrhea === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">जलवियोजनका संकेतहरू (Dehydration Signs)</label>
                  {[
                    'छटपटीने, झिझिने (Restless, irritable)',
                    'आँखा गडेको (Sunken eyes)',
                    'पेटको छाला औंलाले तान्दा बिस्तारै फर्कने (Skin pinch goes back slowly)',
                    'सुस्त वा बेहोस (Lethargic/Unconscious)',
                    'छाला तान्दा धेरै ढिलो फर्कने (Skin pinch very slow)'
                  ].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.dehydrationSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.dehydrationSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, dehydrationSigns: next});
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <Input label="पखाला लागेको दिन" type="number" value={assessmentData.diarrheaDays || ''} onChange={(e) => setAssessmentData({...assessmentData, diarrheaDays: e.target.value})} />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.bloodInStool}
                      onChange={(e) => setAssessmentData({...assessmentData, bloodInStool: e.target.checked})}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    दिसामा रगत देखिएको (Blood in stool)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Feeding / Weight */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4 flex justify-between items-center">
              <span>४. स्तनपान र तौल (Feeding & Weight)</span>
              <span className="text-xs font-normal text-purple-600">Booklet Page 16</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तौल (kg)" type="number" step="0.01" value={assessmentData.weight || ''} onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} />
                <Input label="लम्बाई (cm)" type="number" step="0.1" value={assessmentData.height || ''} onChange={(e) => setAssessmentData({...assessmentData, height: e.target.value})} />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">मापन विधि (Measurement Method)</label>
                  <div className="flex gap-4 p-2 border border-slate-200 rounded-lg bg-white">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentMethodInfant" 
                        value="Automatic" 
                        checked={assessmentData.measurementMethod === 'Automatic'} 
                        onChange={(e) => setAssessmentData({...assessmentData, measurementMethod: e.target.value})}
                      />
                      Auto
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentMethodInfant" 
                        value="Standing" 
                        checked={assessmentData.measurementMethod === 'Standing'} 
                        onChange={(e) => setAssessmentData({...assessmentData, measurementMethod: e.target.value})}
                      />
                      उठेर
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentMethodInfant" 
                        value="Recumbent" 
                        checked={assessmentData.measurementMethod === 'Recumbent'} 
                        onChange={(e) => setAssessmentData({...assessmentData, measurementMethod: e.target.value})}
                      />
                      सुताएर
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">लिङ्ग (Gender)</label>
                  <div className="flex gap-4 p-2 border border-slate-200 rounded-lg bg-white">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentGenderInfant" 
                        value="Male" 
                        checked={assessmentData.gender === 'Male'} 
                        onChange={(e) => setAssessmentData({...assessmentData, gender: e.target.value})}
                      />
                      M
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentGenderInfant" 
                        value="Female" 
                        checked={assessmentData.gender === 'Female'} 
                        onChange={(e) => setAssessmentData({...assessmentData, gender: e.target.value})}
                      />
                      F
                    </label>
                  </div>
                </div>
                {zScore && (
                  <div className={`p-2 rounded-lg border ${parseFloat(zScore) < -3 ? 'bg-red-100 border-red-200 text-red-800' : parseFloat(zScore) < -2 ? 'bg-orange-100 border-orange-200 text-orange-800' : parseFloat(zScore) > 2 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                    <p className="text-xs font-bold">WAZ Score: {zScore}</p>
                    <p className="text-[10px]">
                      {parseFloat(zScore) < -3 ? 'Severe Underweight' : parseFloat(zScore) < -2 ? 'Underweight' : parseFloat(zScore) > 2 ? 'Overweight' : 'Normal Weight'}
                    </p>
                  </div>
                )}
                {whzScore && (
                  <div className={`p-2 rounded-lg border ${parseFloat(whzScore) < -3 ? 'bg-red-100 border-red-200 text-red-800' : parseFloat(whzScore) < -2 ? 'bg-orange-100 border-orange-200 text-orange-800' : parseFloat(whzScore) > 2 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                    <p className="text-xs font-bold">WFL Score: {whzScore}</p>
                    <p className="text-[10px]">
                      {parseFloat(whzScore) < -3 ? 'Severe Wasting' : parseFloat(whzScore) < -2 ? 'Wasting' : parseFloat(whzScore) > 2 ? 'Overweight' : 'Normal Weight-for-Length'}
                    </p>
                  </div>
                )}
                <label className="text-sm font-medium text-slate-700 block">स्तनपान वा बोतलबाट खुवाउने अवस्था</label>
                <div className="space-y-1">
                  {['२४ घण्टामा १० पटक भन्दा कम स्तनपान', 'थप खाना वा झोल दिने गरेको', 'स्तनपान गराउन गाह्रो भएको', 'मुखभित्र घाउ वा सेता दागहरू (Thrush)'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.feedingProblems?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.feedingProblems || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, feedingProblems: next});
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">स्तनपान मूल्यांकन (Assessment of Breastfeeding)</label>
                <div className="space-y-2">
                  <select 
                    value={assessmentData.attachment || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, attachment: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">स्तन समातेको (Attachment)</option>
                    <option value="Good">राम्रो (Good)</option>
                    <option value="Not Well">राम्रो नभएको (Not well)</option>
                    <option value="Not at all">कत्ति पनि नभएको (Not at all)</option>
                  </select>
                  <select 
                    value={assessmentData.suckling || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, suckling: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">दूध चुसेको (Suckling)</option>
                    <option value="Effective">प्रभावकारी (Effective)</option>
                    <option value="Not Effective">प्रभावकारी नभएको (Not effective)</option>
                    <option value="Not at all">कत्ति पनि नभएको (Not at all)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {/* Immunization */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1 flex justify-between items-center">
              <span>५. खोप (Immunization)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 16</span>
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">खोपको अवस्था</label>
              <div className="grid grid-cols-2 gap-2">
                {['BCG', 'OPD-0', 'fIPV-1', 'PCV-1', 'Rotavirus-1', 'DPT-HepB-Hib-1'].map(vax => (
                  <label key={vax} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.immunization?.includes(vax)}
                      onChange={(e) => {
                        const current = assessmentData.immunization || [];
                        const next = e.target.checked ? [...current, vax] : current.filter((s: string) => s !== vax);
                        setAssessmentData({...assessmentData, immunization: next});
                      }}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    {vax}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          {/* General Danger Signs */}
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
            <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-4 flex justify-between items-center">
              <span>१. सामान्य खतराका संकेतहरू (General Danger Signs)</span>
              <span className="text-xs font-normal text-red-600">Booklet Page 25</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चामा सामान्य खतराका संकेतहरू छन्? (Are there any general danger signs?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDangerSigns === true} 
                    onChange={() => setHasDangerSigns(true)} 
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDangerSigns === false} 
                    onChange={() => {
                      setHasDangerSigns(false);
                      setAssessmentData({...assessmentData, generalDangerSigns: []});
                    }} 
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>
            
            {hasDangerSigns === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">

                  {['पिउन/स्तनपान गर्न नसक्ने', 'सबै कुरा वान्ता गर्ने', 'काँप्ने (Convulsions)', 'सुस्त वा वेहोस (Lethargic/Unconscious)'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.generalDangerSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.generalDangerSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, generalDangerSigns: next});
                        }}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cough / Breathing */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex justify-between items-center">
              <span>२. खोकी वा सास फेर्न गाह्रो (Cough / Breathing)</span>
              <span className="text-xs font-normal text-blue-600">Booklet Page 25</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई खोकी लागेको वा सास फेर्न गाह्रो छ? (Does the child have cough or difficulty breathing?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasCoughOrBreathingDifficulty === true} 
                    onChange={() => setHasCoughOrBreathingDifficulty(true)} 
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasCoughOrBreathingDifficulty === false} 
                    onChange={() => {
                      setHasCoughOrBreathingDifficulty(false);
                      setAssessmentData({...assessmentData, coughDays: '', breathingRate: '', respiratorySigns: []});
                    }} 
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasCoughOrBreathingDifficulty === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input label="खोकी लागेको दिन" type="number" value={assessmentData.coughDays || ''} onChange={(e) => setAssessmentData({...assessmentData, coughDays: e.target.value})} />
                    <Input label="सासको दर (प्रति मिनेट)*" type="number" value={assessmentData.breathingRate || ''} onChange={(e) => setAssessmentData({...assessmentData, breathingRate: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    {['कोखा हान्ने (Chest in-drawing)', 'शान्त रहेको बच्चामा स्ट्राइडर (Stridor in calm child)', 'Wheezing'].map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={assessmentData.respiratorySigns?.includes(sign)}
                          onChange={(e) => {
                            const current = assessmentData.respiratorySigns || [];
                            const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                            setAssessmentData({...assessmentData, respiratorySigns: next});
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        {sign}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Diarrhea */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex justify-between items-center">
              <span>३. पखाला (Diarrhea)</span>
              <span className="text-xs font-normal text-emerald-600">Booklet Page 26</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई पखाला लागेको छ? (Does the child have diarrhea?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDiarrhea === true} 
                    onChange={() => setHasDiarrhea(true)} 
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasDiarrhea === false} 
                    onChange={() => {
                      setHasDiarrhea(false);
                      setAssessmentData({...assessmentData, diarrheaDays: '', dehydrationSigns: [], bloodInStool: false});
                    }} 
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasDiarrhea === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">जलवियोजनका संकेतहरू</label>
                  {["सुस्त वा बेहोस (Lethargic/Unconscious)", "छटपटीने वा झर्किने (Restless/Irritable)", "आँखा गडेको (Sunken eyes)", "खूब तिर्खाए झैं गरी पिउँछ (Drinks eagerly)", "पिउन नसक्ने वा ढिलो पिउने (Unable to drink)", "छाला तान्दा धेरै ढिलो फर्कने (Skin pinch very slow)", "छाला तान्दा ढिलो फर्कने (Skin pinch slow)"].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.dehydrationSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.dehydrationSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, dehydrationSigns: next});
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <Input label="पखाला लागेको दिन*" type="number" value={assessmentData.diarrheaDays || ''} onChange={(e) => setAssessmentData({...assessmentData, diarrheaDays: e.target.value})} required />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.bloodInStool}
                      onChange={(e) => setAssessmentData({...assessmentData, bloodInStool: e.target.checked})}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    दिसामा रगत देखिएको (Blood in stool)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.choleraOutbreak}
                      onChange={(e) => setAssessmentData({...assessmentData, choleraOutbreak: e.target.checked})}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    हैजा फैलिएको क्षेत्र (Cholera outbreak in area)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Fever */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4 flex justify-between items-center">
              <span>४. ज्वरो (Fever)</span>
              <span className="text-xs font-normal text-amber-600">Booklet Page 27</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई ज्वरो आएको छ? (Does the child have fever?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasFever === true} 
                    onChange={() => setHasFever(true)} 
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasFever === false} 
                    onChange={() => {
                      setHasFever(false);
                      setAssessmentData({...assessmentData, temperature: '', feverDays: '', malariaRisk: 'None', feverSigns: []});
                    }} 
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasFever === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      label="तापक्रम (Celsius)*" 
                      type="number" 
                      step="0.1" 
                      value={assessmentData.temperature || ''} 
                      onChange={(e) => {
                        const c = e.target.value;
                        setAssessmentData({...assessmentData, temperature: c});
                        if (c && !isNaN(parseFloat(c))) {
                          setTempF((parseFloat(c) * 9/5 + 32).toFixed(1));
                        } else {
                          setTempF('');
                        }
                      }} 
                      required 
                    />
                    <Input 
                      label="तापक्रम (Fahrenheit)" 
                      type="number" 
                      step="0.1" 
                      value={tempF} 
                      onChange={(e) => {
                        const f = e.target.value;
                        setTempF(f);
                        if (f && !isNaN(parseFloat(f))) {
                          const c = ((parseFloat(f) - 32) * 5/9).toFixed(1);
                          setAssessmentData({...assessmentData, temperature: c});
                        } else {
                          setAssessmentData({...assessmentData, temperature: ''});
                        }
                      }} 
                    />
                  </div>
                  <Input label="ज्वरो आएको दिन*" type="number" value={assessmentData.feverDays || ''} onChange={(e) => setAssessmentData({...assessmentData, feverDays: e.target.value})} required />
                  <label className="text-sm font-medium text-slate-700 block">मलेरियाको जोखिम*</label>
                  <select 
                    value={assessmentData.malariaRisk || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, malariaRisk: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    required
                  >
                    <option value="">छान्नुहोस् (Select)</option>
                    <option value="High">उच्च (High)</option>
                    <option value="Medium">मध्यम (Medium)</option>
                    <option value="Low">न्युन (Low)</option>
                    <option value="None">नभएको (No Risk)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ज्वरोका थप संकेतहरू</label>
                  {["गर्दन अररो (Stiff neck)", "RDT Positive", "RDT Negative", "Falciparum Positive", "ज्वरोको अन्य कुनै कारण (Any other cause of fever)", "अहिले वा ३ महिनाभित्र दादुरा भएको (Measles now or within 3 months)", "दादुरा जस्तै डबर जिउभरी आएको (Measles-like rash)", "आँखा रातो (Red eyes)", "आँखाबाट पीप बगेको (Eye discharge)", "मुखभित्र घाउ (Mouth ulcers)", "मुखभित्रको घाउ गहिरो र बढी फैलिएको (Deep or extensive mouth ulcers)", "कर्निया धमिलो (Cornea clouding)", "खोकी (Cough)", "सिँगान बग्ने (Runny nose)"].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.feverSigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.feverSigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, feverSigns: next});
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ear Infection */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 flex justify-between items-center">
              <span>५. कानको समस्या (Ear Problem)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 28</span>
            </h4>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">के बच्चालाई कानको समस्या छ? (Does the child have an ear problem?)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasEarProblem === true} 
                    onChange={() => setHasEarProblem(true)} 
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span>छ (Yes)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    checked={hasEarProblem === false} 
                    onChange={() => {
                      setHasEarProblem(false);
                      setAssessmentData({...assessmentData, earPain: false, earDischarge: false, earDischargeDays: '', mastoidSwelling: false});
                    }} 
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span>छैन (No)</span>
                </label>
              </div>
            </div>

            {hasEarProblem === true && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.earPain}
                      onChange={(e) => setAssessmentData({...assessmentData, earPain: e.target.checked})}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    कान दुख्ने (Ear pain)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.earDischarge}
                      onChange={(e) => setAssessmentData({...assessmentData, earDischarge: e.target.checked})}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    कानबाट पिप बग्ने (Ear discharge)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.earDischarge14Days}
                      onChange={(e) => setAssessmentData({...assessmentData, earDischarge14Days: e.target.checked})}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    कानबाट १४ दिन भन्दा बढी दिनदेखि पिप बगिरहेको (Ear discharge for 14 days or more)
                  </label>
                  {assessmentData.earDischarge && (
                    <Input label="लगातार कति दिन देखि?" type="number" value={assessmentData.earDischargeDays || ''} onChange={(e) => setAssessmentData({...assessmentData, earDischargeDays: e.target.value})} />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.mastoidSwelling}
                      onChange={(e) => setAssessmentData({...assessmentData, mastoidSwelling: e.target.checked})}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    कानको पछाडि दुख्ने गरी सुन्निएको (Mastoid swelling)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Malnutrition / Anemia */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4 flex justify-between items-center">
              <span>६. पोषण र रक्तअल्पता (Nutrition & Anemia)</span>
              <span className="text-xs font-normal text-purple-600">Booklet Page 28-29</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तौल (kg)" type="number" step="0.1" value={assessmentData.weight || ''} onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} />
                <Input label="उचाइ/लम्बाई (cm)" type="number" step="0.1" value={assessmentData.height || ''} onChange={(e) => setAssessmentData({...assessmentData, height: e.target.value})} />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">मापन विधि (Measurement Method)</label>
                  <div className="flex gap-4 p-2 border border-slate-200 rounded-lg bg-white">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="measurementMethod" 
                        value="Automatic" 
                        checked={assessmentData.measurementMethod === 'Automatic'} 
                        onChange={(e) => setAssessmentData({...assessmentData, measurementMethod: e.target.value})}
                      />
                      स्वचालित (Auto)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="measurementMethod" 
                        value="Standing" 
                        checked={assessmentData.measurementMethod === 'Standing'} 
                        onChange={(e) => setAssessmentData({...assessmentData, measurementMethod: e.target.value})}
                      />
                      उठेर (Standing)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="measurementMethod" 
                        value="Recumbent" 
                        checked={assessmentData.measurementMethod === 'Recumbent'} 
                        onChange={(e) => setAssessmentData({...assessmentData, measurementMethod: e.target.value})}
                      />
                      सुताएर (Lying)
                    </label>
                  </div>
                  <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-[10px] text-blue-800 leading-tight">
                      <strong>जानकारी:</strong> ८७ सेमी भन्दा कमका लागि लम्बाइ (Lying) र ८७ सेमी वा सोभन्दा बढीका लागि उचाइ (Standing) नापिन्छ। सुताएर नापिएको लम्बाइ उठेर नापिएको उचाइ भन्दा औसतमा ०.७ सेमी बढी हुन्छ। ८७ सेमी वा सोभन्दा बढी उचाइ भएको बच्चालाई सुताएर नापिएको छ भने ०.७ सेमी घटाइन्छ, र ८७ सेमी भन्दा कम भएको बच्चालाई उठेर नापिएको छ भने ०.७ सेमी थपिन्छ।
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">लिङ्ग (Gender)</label>
                  <div className="flex gap-4 p-2 border border-slate-200 rounded-lg bg-white">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentGender" 
                        value="Male" 
                        checked={assessmentData.gender === 'Male'} 
                        onChange={(e) => setAssessmentData({...assessmentData, gender: e.target.value})}
                      />
                      पुरुष (M)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input 
                        type="radio" 
                        name="assessmentGender" 
                        value="Female" 
                        checked={assessmentData.gender === 'Female'} 
                        onChange={(e) => setAssessmentData({...assessmentData, gender: e.target.value})}
                      />
                      महिला (F)
                    </label>
                  </div>
                </div>
                {zScore && (
                  <div className={`p-2 rounded-lg border ${parseFloat(zScore) < -3 ? 'bg-red-100 border-red-200 text-red-800' : parseFloat(zScore) < -2 ? 'bg-orange-100 border-orange-200 text-orange-800' : parseFloat(zScore) > 2 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                    <p className="text-xs font-bold">Weight-for-Age Z-Score: {zScore}</p>
                    <p className="text-[10px]">
                      {parseFloat(zScore) < -3 ? 'Severe Underweight' : parseFloat(zScore) < -2 ? 'Underweight' : parseFloat(zScore) > 2 ? 'Overweight' : 'Normal Weight'}
                    </p>
                  </div>
                )}
                {whzScore && (
                  <div className={`p-2 rounded-lg border ${parseFloat(whzScore) < -3 ? 'bg-red-100 border-red-200 text-red-800' : parseFloat(whzScore) < -2 ? 'bg-orange-100 border-orange-200 text-orange-800' : parseFloat(whzScore) > 2 ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-green-100 border-green-200 text-green-800'}`}>
                    <p className="text-xs font-bold">Weight-for-Height Z-Score: {whzScore}</p>
                    <p className="text-[10px]">
                      {parseFloat(whzScore) < -3 ? 'Severe Wasting' : parseFloat(whzScore) < -2 ? 'Wasting' : parseFloat(whzScore) > 2 ? 'Overweight' : 'Normal Weight-for-Height'}
                    </p>
                  </div>
                )}
                <div className={`p-2 rounded-lg border font-bold text-xs ${nutritionClassification.includes('Severe') ? 'bg-red-200 border-red-300 text-red-900' : nutritionClassification.includes('Moderate') ? 'bg-orange-200 border-orange-300 text-orange-900' : 'bg-green-200 border-green-300 text-green-900'}`}>
                  Classification: {nutritionClassification}
                </div>
                <Input label="MUAC (mm)" type="number" value={assessmentData.muac || ''} onChange={(e) => setAssessmentData({...assessmentData, muac: e.target.value})} />
                <label className="text-sm font-medium text-slate-700 block">रक्तअल्पता (Anemia)</label>
                <select 
                  value={assessmentData.pallor || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, pallor: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">हत्केलाको अवस्था</option>
                  <option value="Severe">{"धेरै सेतो (Severe pallor)"}</option>
                  <option value="Some">{"केही सेतो (Some pallor)"}</option>
                  <option value="None">{"सामान्य (No pallor)"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">पोषणका संकेतहरू</label>
                {["दुवै खुट्टा सुन्निएको (Oedema both feet)", "धेरै दुब्लो (Visible severe wasting)"].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.nutritionSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.nutritionSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, nutritionSigns: next});
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    {sign}
                  </label>
                ))}
                
                <label className="flex items-center gap-2 text-sm cursor-pointer mt-4 border-t border-purple-200 pt-2 font-medium text-purple-900">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.weightLoss}
                    onChange={(e) => setAssessmentData({...assessmentData, weightLoss: e.target.checked})}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  विगत ३ महिना देखि बच्चाको तौल नबढेमा वा घटेमा (No weight gain or weight loss in last 3 months)
                </label>
              </div>
            </div>
          </div>
          {/* Immunization */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1 flex justify-between items-center">
              <span>७. खोप (Immunization)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 29</span>
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">खोपको अवस्था</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['BCG', 'OPV-1,2,3', 'DPT-HepB-Hib-1,2,3', 'PCV-1,2,3', 'fIPV-1,2', 'Rotavirus-1,2', 'Measles-Rubella-1,2', 'JE', 'TCV'].map(vax => (
                  <label key={vax} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.immunization?.includes(vax)}
                      onChange={(e) => {
                        const current = assessmentData.immunization || [];
                        const next = e.target.checked ? [...current, vax] : current.filter((s: string) => s !== vax);
                        setAssessmentData({...assessmentData, immunization: next});
                      }}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    {vax}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* HIV Trigger Checkbox */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={assessmentData.parotidSwellingOrLymphNodes}
                onChange={(e) => setAssessmentData({...assessmentData, parotidSwellingOrLymphNodes: e.target.checked})}
                className="rounded text-pink-600 focus:ring-pink-500"
              />
              बाहिर प्यारोटिड ग्रन्थी सुन्निएको छ वा सबै लिम्फ ग्रन्थीहरु बढेका छन्? (Parotid gland swelling or enlarged lymph nodes?)
            </label>
          </div>

          {/* HIV Assessment */}
          {(() => {
            const classifications = getClassification();
            const severeClassifications = classifications.filter(c => 
              c === 'Severe Pneumonia or Very Severe Disease' || 
              c === 'Severe Persistent Diarrhea' || 
              c === 'Very Severe Febrile Disease' || 
              c === 'Severe Acute Malnutrition'
            );
            
            const hasMouthUlcers = assessmentData.feverSigns?.includes('मुखभित्र घाउ (Mouth ulcers)');
            
            const shouldShowHivAssessment = 
              severeClassifications.length >= 2 || 
              assessmentData.parotidSwellingOrLymphNodes || 
              hasMouthUlcers;

            if (!shouldShowHivAssessment) return null;

            return (
              <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-200">
                <h4 className="font-bold text-pink-800 border-b border-pink-300 mb-2 pb-1 flex justify-between items-center">
                  <span>८. एच.आई.भी. संक्रमण (HIV Infection)</span>
                  <span className="text-xs font-normal text-pink-600">Booklet Page 30</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">आमाको HIV अवस्था (Mother's HIV Status)</label>
                    <select 
                      value={assessmentData.motherHivStatus || ''} 
                      onChange={(e) => setAssessmentData({...assessmentData, motherHivStatus: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">छान्नुहोस्</option>
                      <option value="Positive">पोजिटिभ (Positive)</option>
                      <option value="Negative">नेगेटिभ (Negative)</option>
                      <option value="Unknown">थाहा नभएको (Unknown)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">बच्चाको HIV जाँच (Child's HIV Test)</label>
                    <select 
                      value={assessmentData.hivTestStatus || ''} 
                      onChange={(e) => setAssessmentData({...assessmentData, hivTestStatus: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">छान्नुहोस्</option>
                      <option value="Virological Positive">Virological Test Positive</option>
                      <option value="DNA PCR Positive">DNA PCR Positive</option>
                      <option value="Rapid Test Positive">Rapid Test Positive</option>
                      <option value="Negative">नेगेटिभ (Negative)</option>
                      <option value="Unknown">थाहा नभएको / नगरेको (Unknown/Not Done)</option>
                    </select>
                  </div>
                  {assessmentData.motherHivStatus === 'Positive' && (
                    <div className="col-span-1 md:col-span-2 space-y-2 mt-2 border-t border-pink-200 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                        <input 
                          type="checkbox" 
                          checked={assessmentData.isBreastfeeding}
                          onChange={(e) => setAssessmentData({...assessmentData, isBreastfeeding: e.target.checked})}
                          className="rounded text-pink-600 focus:ring-pink-500"
                        />
                        बच्चाले हाल स्तनपान गरिरहेको छ? (Is the child currently breastfeeding?)
                      </label>
                      
                      {!assessmentData.isBreastfeeding && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                          <input 
                            type="checkbox" 
                            checked={assessmentData.stoppedBreastfeedingLessThan3Months}
                            onChange={(e) => setAssessmentData({...assessmentData, stoppedBreastfeedingLessThan3Months: e.target.checked})}
                            className="rounded text-pink-600 focus:ring-pink-500"
                          />
                          स्तनपान छुटाएको ३ महिना भन्दा कम भएको छ? (Stopped breastfeeding less than 3 months ago?)
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Fatigue Screening */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
              <input 
                type="checkbox" 
                checked={assessmentData.fatigue}
                onChange={(e) => setAssessmentData({...assessmentData, fatigue: e.target.checked})}
                className="rounded text-slate-600 focus:ring-slate-500"
              />
              चाडै थकाई लाग्ने, खेलकुद लगायत दैनिक क्रियाकलापमा मन नलाग्ने (Easily fatigued / Loss of interest)
            </label>
          </div>

          {/* Tuberculosis Assessment */}
          {(() => {
            const coughDuration = parseInt(assessmentData.coughDays || '0');
            const feverDuration = parseInt(assessmentData.feverDays || '0');
            const temp = parseFloat(assessmentData.temperature || '0');
            const isSevereMalnutrition = assessmentData.nutritionSigns?.includes('धेरै दुब्लो (Visible severe wasting)') || 
                                         assessmentData.nutritionSigns?.includes('दुवै खुट्टा सुन्निएको (Oedema both feet)') ||
                                         (zScore && parseFloat(zScore) < -3) ||
                                         (whzScore && parseFloat(whzScore) < -2);
            
            const showTbAssessment = 
              (coughDuration >= 14) ||
              (feverDuration >= 14 && temp > 38) ||
              (assessmentData.weightLoss) ||
              (isSevereMalnutrition) ||
              (assessmentData.fatigue);

            if (!showTbAssessment) return null;

            return (
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200">
                <h4 className="font-bold text-orange-800 border-b border-orange-300 mb-2 pb-1 flex justify-between items-center">
                  <span>९. क्षयरोग (Tuberculosis)</span>
                  <span className="text-xs font-normal text-orange-600">Booklet Page 31</span>
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.tbContact}
                      onChange={(e) => setAssessmentData({...assessmentData, tbContact: e.target.checked})}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    के बच्चाको परिवारमा वा नजिकको सम्पर्कमा क्षयरोग लागेको व्यक्ति हुनुहुन्छ? (Contact with TB patient?)
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.tbDiagnosis}
                      onChange={(e) => setAssessmentData({...assessmentData, tbDiagnosis: e.target.checked})}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    खकार पोजिटिभ क्षयरोग लागेका वा क्लिनिकल क्षयरोग भनी निदान भएका (Sputum positive TB or Clinically diagnosed TB)
                  </label>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">क्षयरोगका लक्षणहरू (TB Symptoms)</label>
                    {['२ हप्ता वा बढी समयदेखि खोकी (Cough >= 2 weeks)', '२ हप्ता वा बढी समयदेखि ज्वरो (Fever >= 2 weeks)', 'तौल नबढेको वा घटेको (Weight loss / Poor weight gain)'].map(sign => (
                      <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={assessmentData.tbSymptoms?.includes(sign)}
                          onChange={(e) => {
                            const current = assessmentData.tbSymptoms || [];
                            const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                            setAssessmentData({...assessmentData, tbSymptoms: next});
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        {sign}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }
  };

  const getClassification = () => {
    const classifications: string[] = [];
    const currentZScore = zScore ? parseFloat(zScore) : null;
    const currentWHZ = whzScore ? parseFloat(whzScore) : null;
    
    if (moduleType === 'Infant') {
      // PSBI and Pneumonia logic based on age
      const ageDays = currentPatient?.ageDays || 0;
      const breathingRate = parseFloat(assessmentData.breathingRate || '0');
      const temperature = parseFloat(assessmentData.temperature || '0');
      
      const dangerSignsList = assessmentData.generalDangerSigns || [];
      
      const hasFever = temperature >= 37.5 || dangerSignsList.includes('ज्वरो (Fever >= 37.5°C or skin feels hot)');
      const hasHypothermia = (temperature > 0 && temperature < 35.5) || dangerSignsList.includes('अति कम तापक्रम (Hypothermia < 35.5°C)');

      const hasAnyOf8Signs = dangerSignsList.some(s => [
        'काँप्ने (Convulsions)', 
        'दूध चुस्न/निल्न नसक्ने (Unable to feed)', 
        'सुस्त वा बेहोस (Lethargic/Unconscious)', 
        'कोखा हान्ने (Severe chest in-drawing)', 
        'नाक फुलाउने (Nasal flaring)', 
        'कन्कने (Grunting)', 
        'तालु फुलेको (Bulging fontanelle)',
        'नाइँटो रातो भई छालासम्म फैलिएको (Umbilical redness spreading to skin)'
      ].includes(s)) || hasFever || hasHypothermia;

      const isAge7OrLess = ageDays <= 7;
      const isRR60OrMore = breathingRate >= 60;

      if (hasAnyOf8Signs || (isAge7OrLess && isRR60OrMore)) {
        classifications.push('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग (Possible Serious Bacterial Infection)');
      } else if (!isAge7OrLess && breathingRate >= 60) {
        classifications.push('Pneumonia');
      }
      
      // Local Infection
      if (assessmentData.localInfection?.length > 0) classifications.push('Local Bacterial Infection');
      
      // Jaundice
      if (assessmentData.jaundiceSigns?.includes('हत्केला र पैताला पहेंलो (Yellow palms/soles)') || 
          assessmentData.jaundiceSigns?.includes('२४ घण्टा भन्दा कमको शिशुमा कमलपित्त')) {
        classifications.push('Severe Jaundice');
      } else if (assessmentData.jaundiceSigns?.includes('कमलपित्त देखिएको (Jaundice present)')) {
        classifications.push('Jaundice');
      }

      // Dehydration
      if (assessmentData.diarrheaDays || assessmentData.bloodInStool) {
        const dehydSigns = assessmentData.dehydrationSigns || [];
        const severeCount = dehydSigns.filter((s: string) => s.includes('Lethargic') || s.includes('Sunken') || s.includes('very slow')).length;
        const someCount = dehydSigns.length;
        
        if (severeCount >= 2) {
          classifications.push('Severe Dehydration');
        } else if (someCount >= 2) {
          classifications.push('Some Dehydration');
        } else if (assessmentData.diarrheaDays) {
          classifications.push('No Dehydration');
        }

        // Blood in stool for infant is not classified as Dysentery but referred directly
        if (assessmentData.bloodInStool) {
          // No classification logic for Dysentery in infants < 2m as per user request
        }
      }

      // Feeding Problem and Weight
      const hasFeedingProblem = assessmentData.feedingProblems?.length > 0 || 
                                assessmentData.attachment === 'Not Well' || 
                                assessmentData.attachment === 'Not at all' || 
                                assessmentData.suckling === 'Not Effective' || 
                                assessmentData.suckling === 'Not at all';
      
      const weight = parseFloat(assessmentData.weight || '0');
      const isWeightNormal = weight >= 2.5;

      if (hasFeedingProblem) {
        classifications.push('Feeding Problem');
      } else if (assessmentData.attachment || assessmentData.suckling) {
        if (isWeightNormal) {
           classifications.push('No Feeding Problem and Normal Weight');
        } else {
           classifications.push('No Feeding Problem');
        }
      }

      if (weight > 0) {
        if (ageDays < 7 && weight < 2) {
          classifications.push('Very Low Birth Weight');
        } else if (ageDays < 7 && weight < 2.5) {
          classifications.push('Low Birth Weight');
        } else if (ageDays >= 7 && currentZScore !== null) {
          if (currentZScore < -3) {
            classifications.push('Very Low Weight for Age (उमेर अनुसार धेरै कम तौल)');
          } else if (currentZScore < -2) {
            classifications.push('Low Weight for Age (उमेर अनुसार कम तौल)');
          }
        }
      }

      if (!classifications.includes('Very Low Birth Weight') && 
          !classifications.includes('Feeding Problem') && 
          !classifications.includes('Low Birth Weight') &&
          !classifications.includes('Very Low Weight for Age (उमेर अनुसार धेरै कम तौल)') &&
          !classifications.includes('Low Weight for Age (उमेर अनुसार कम तौल)') &&
          !classifications.includes('No Feeding Problem') &&
          !classifications.includes('No Feeding Problem and Normal Weight')) {
        classifications.push('No Feeding Problem');
      }
    } else {
      // Child
      // General Danger Signs
      if (assessmentData.generalDangerSigns?.length > 0 || assessmentData.dehydrationSigns?.includes('सुस्त वा बेहोस (Lethargic/Unconscious)')) {
        classifications.push('Very Severe Disease');
      }

      // Pneumonia
      const rate = parseInt(assessmentData.breathingRate);
      let isInfant = false;
      if (currentPatient?.ageDays !== undefined && currentPatient?.ageDays > 0) {
        isInfant = currentPatient.ageDays < 60;
      } else {
        const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
        isInfant = ageInMonths < 2;
      }
      const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
      const isFast = (ageInMonths < 12 && rate >= 50) || (ageInMonths >= 12 && rate >= 40);
      
      if (assessmentData.respiratorySigns?.includes('शान्त रहेको बच्चामा स्ट्राइडर (Stridor in calm child)')) {
        classifications.push('Severe Pneumonia or Very Severe Disease');
      } else if (isFast || assessmentData.respiratorySigns?.includes('कोखा हान्ने (Chest in-drawing)')) {
        classifications.push('Pneumonia');
      } else if (assessmentData.coughDays) {
        classifications.push('No Pneumonia: Cough or Cold');
      }

      // Dehydration
      const dehydSigns = assessmentData.dehydrationSigns || [];
      const severeCount = dehydSigns.filter((s: string) => s.includes('Lethargic') || s.includes('Sunken') || s.includes('Unable') || s.includes('very slow')).length;
      const someCount = dehydSigns.length;
      
      let dehydrationType = '';
      if (severeCount >= 2) {
        dehydrationType = 'Severe Dehydration';
      } else if (someCount >= 2) {
        dehydrationType = 'Some Dehydration';
      } else if (assessmentData.diarrheaDays) {
        dehydrationType = 'No Dehydration';
      }
      if (dehydrationType) classifications.push(dehydrationType);

      // Persistent Diarrhea
      const diarrheaDays = parseInt(assessmentData.diarrheaDays);
      if (diarrheaDays >= 14) {
        if (dehydrationType === 'Severe Dehydration' || dehydrationType === 'Some Dehydration') {
          classifications.push('Severe Persistent Diarrhea');
        } else {
          classifications.push('Persistent Diarrhea');
        }
      }

      // Dysentery
      if (assessmentData.bloodInStool) {
        classifications.push('Dysentery');
      }

      // Haija (Cholera)
      if (dehydrationType === 'Severe Dehydration' && assessmentData.choleraOutbreak) {
        classifications.push('हैजा (Haija)');
      }

      // Fever
      const childFeverTemp = parseFloat(assessmentData.temperature || '0');
      const hasFeverHistory = parseInt(assessmentData.feverDays || '0') > 0 || childFeverTemp >= 37.5;
      const hasMalariaRisk = assessmentData.malariaRisk && assessmentData.malariaRisk !== 'None';
      
      if (hasFeverHistory) {
        if (childFeverTemp >= 37.5 && (assessmentData.feverSigns?.includes('गर्दन अररो (Stiff neck)') || assessmentData.generalDangerSigns?.length > 0)) {
          if (hasMalariaRisk) {
            classifications.push('धेरै कडा ज्वरोजन्य रोग वा कडा जटिल औलो (Very Severe Febrile Disease or Severe Malaria)');
          } else {
            classifications.push('धेरै कडा ज्वरो (Very Severe Febrile Disease)');
          }
        } else {
          const hasSignsForUnlikelyMalaria = assessmentData.feverSigns?.includes('सिँगान बग्ने (Runny nose)') || 
                                           assessmentData.feverSigns?.includes('दादुरा जस्तै डबर जिउभरी आएको (Measles-like rash)') ||
                                           assessmentData.feverSigns?.includes('ज्वरोको अन्य कुनै कारण (Any other cause of fever)');

          if (hasMalariaRisk) {
            if (assessmentData.feverSigns?.includes('RDT Positive')) {
              if (assessmentData.feverSigns?.includes('Falciparum Positive')) {
                classifications.push('Falciparum Malaria');
              } else {
                classifications.push('फ्याल्सिपेरम नभएको औलो (Non-Falciparum Malaria)');
              }
            } else if (assessmentData.feverSigns?.includes('RDT Negative') || hasSignsForUnlikelyMalaria) {
              classifications.push('ज्वरो (औलोको सम्भावना नभएको)');
            }
          } else {
            classifications.push('ज्वरो');
          }
        }
      }

      // Measles (दादुरा)
      const currentTemp = parseFloat(assessmentData.temperature || '0');
      const hasMeaslesPresence = assessmentData.feverSigns?.includes('अहिले वा ३ महिनाभित्र दादुरा भएको (Measles now or within 3 months)') || 
                                 assessmentData.feverSigns?.includes('दादुरा जस्तै डबर जिउभरी आएको (Measles-like rash)');
      
      if (currentTemp >= 37.5 && hasMeaslesPresence) {
        if (assessmentData.feverSigns?.includes('कर्निया धमिलो (Cornea clouding)') || 
            assessmentData.feverSigns?.includes('मुखभित्रको घाउ गहिरो र बढी फैलिएको (Deep or extensive mouth ulcers)') ||
            assessmentData.generalDangerSigns?.length > 0) {
          classifications.push('Severe Complicated Measles (कडा जटिल दादुरा)');
        } else if (assessmentData.feverSigns?.includes('आँखाबाट पीप बगेको (Eye discharge)') || 
                   assessmentData.feverSigns?.includes('मुखभित्र घाउ (Mouth ulcers)')) {
          classifications.push('Measles with Eye/Mouth Complications (आँखा वा मुखको जटिलता सहितको दादुरा)');
        } else {
          classifications.push('Measles (दादुरा जस्तै रोग)');
        }
      }

      // Malnutrition
      const muacVal = parseInt(assessmentData.muac);
      
      console.log('Malnutrition Debug:', {
        weight: assessmentData.weight,
        zScore: currentZScore,
        whzScore: currentWHZ,
        muac: muacVal,
        nutritionSigns: assessmentData.nutritionSigns
      });
      
      let hasProteinEnergyMalnutrition = false;

      // 1. Severe Acute Malnutrition (SAM)
      if (assessmentData.nutritionSigns?.includes("दुवै खुट्टा सुन्निएको (Oedema both feet)") || 
          assessmentData.nutritionSigns?.includes("धेरै दुब्लो (Visible severe wasting)") ||
          (muacVal > 0 && muacVal < 115) || 
          (currentWHZ !== null && currentWHZ < -3)) {
        classifications.push('Severe Acute Malnutrition');
        hasProteinEnergyMalnutrition = true;
      } 
      // 2. Moderate Acute Malnutrition (MAM)
      else if ((muacVal >= 115 && muacVal < 125) || 
               (currentWHZ !== null && currentWHZ < -2 && currentWHZ >= -3)) {
        classifications.push('Moderate Acute Malnutrition');
        hasProteinEnergyMalnutrition = true;
      }

      // 3. Weight-for-Age classification (Underweight)
      if (currentZScore !== null) {
        if (currentZScore < -3) {
          classifications.push('Very Low Weight (धेरै कम तौल)');
          hasProteinEnergyMalnutrition = true;
        } else if (currentZScore < -2) {
          classifications.push('Low Weight (कम तौल)');
          hasProteinEnergyMalnutrition = true;
        }
      }

      // 4. No Malnutrition
      if (!hasProteinEnergyMalnutrition) {
        classifications.push('No Malnutrition');
      }
      
      // Anemia
      if (assessmentData.pallor === 'Severe') {
        classifications.push('Severe Anemia');
      } else if (assessmentData.pallor === 'Some') {
        classifications.push('Anemia');
      } else if (assessmentData.pallor === 'None') {
        classifications.push('NO Anaemia');
      }

      // Ear Infection
      if (assessmentData.mastoidSwelling) {
        classifications.push('Mastoiditis');
      } else if (assessmentData.earPain || (assessmentData.earDischarge && parseInt(assessmentData.earDischargeDays) < 14)) {
        classifications.push('Acute Ear Infection');
      } else if (assessmentData.earDischarge14Days || (assessmentData.earDischarge && parseInt(assessmentData.earDischargeDays) >= 14)) {
        classifications.push('Chronic Ear Infection');
      } else if (assessmentData.earDischarge === false && assessmentData.earPain === false && assessmentData.earDischarge14Days === false) {
        classifications.push('No Ear Infection');
      }

      // HIV Classification
      const isHivInfected = 
        assessmentData.hivTestStatus === 'Virological Positive' ||
        (assessmentData.hivTestStatus === 'DNA PCR Positive' && ageInMonths < 18) ||
        (assessmentData.hivTestStatus === 'Rapid Test Positive' && ageInMonths >= 18);

      const isHivExposedSuspected = 
        (assessmentData.motherHivStatus === 'Positive' && 
         (assessmentData.isBreastfeeding || assessmentData.stoppedBreastfeedingLessThan3Months) && 
         assessmentData.hivTestStatus === 'Negative') ||
        (assessmentData.motherHivStatus === 'Positive' && 
         (assessmentData.hivTestStatus === '' || assessmentData.hivTestStatus === 'Unknown'));

      if (isHivInfected) {
        classifications.push('CONFIRMED HIV INFECTION');
      } else if (isHivExposedSuspected) {
        classifications.push('HIV EXPOSED / SUSPECTED HIV');
      } else if (assessmentData.motherHivStatus === 'Positive' || 
                 (assessmentData.hivTestStatus === 'Rapid Test Positive' && ageInMonths < 18) ||
                 (assessmentData.hivTestStatus === 'DNA PCR Positive' && ageInMonths >= 18)) {
          classifications.push('HIV EXPOSED');
      } else if (assessmentData.motherHivStatus === 'Unknown') {
        // Check for symptoms suggestive of HIV
        const hasSymptoms = classifications.some(c => 
          c.includes('Pneumonia') || 
          c.includes('Persistent Diarrhea') || 
          c.includes('Acute Ear Infection') || 
          c.includes('Severe Acute Malnutrition')
        );
        if (hasSymptoms) {
          classifications.push('SUSPECTED SYMPTOMATIC HIV');
        } else {
          classifications.push('HIV TEST REQUIRED');
        }
      } else if (assessmentData.motherHivStatus === 'Negative' && assessmentData.hivTestStatus === 'Negative') {
        classifications.push('HIV INFECTION UNLIKELY');
      }

      // Tuberculosis (TB) Classification
      const hasTbSymptoms = assessmentData.tbSymptoms && assessmentData.tbSymptoms.length > 0;
      const coughDuration = parseInt(assessmentData.coughDays || '0');
      const feverDuration = parseInt(assessmentData.feverDays || '0');
      
      if (assessmentData.tbDiagnosis) {
        classifications.push('CONFIRMED TB');
      } else if (hasTbSymptoms || coughDuration >= 14 || feverDuration >= 14 || assessmentData.fatigue) {
        classifications.push('POSSIBLE TB');
      } else if (assessmentData.tbContact) {
        classifications.push('LATENT TUBERCULOSIS INFECTION');
      } else {
        classifications.push('TB UNLIKELY');
      }
    }

    return classifications;
  };

  const getSuggestedNextVisit = (classifications: string[]) => {
    if (classifications.length === 0) return null;
    
    if (moduleType === 'Infant') {
      if (classifications.includes('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग (Possible Serious Bacterial Infection)')) return 'Immediate';
      if (classifications.includes('Local Bacterial Infection')) return '3 days';
      if (classifications.includes('Jaundice') || classifications.includes('Severe Jaundice')) return '3 days';
      if (classifications.includes('Some Dehydration') || classifications.includes('Severe Dehydration')) return '2 days';
    } else {
      if (classifications.includes('Very Severe Disease') || classifications.includes('अति कडा ज्वरो (Very Severe Febrile Disease)') || classifications.includes('धेरै कडा ज्वरो (Very Severe Febrile Disease)') || classifications.includes('धेरै कडा ज्वरोजन्य रोग वा कडा जटिल औलो (Very Severe Febrile Disease or Severe Malaria)') || classifications.includes('Severe Complicated Measles') || classifications.includes('Severe Complicated Measles (कडा जटिल दादुरा)') || classifications.includes('Severe Persistent Diarrhea') || classifications.includes('हैजा (Haija)')) return 'Immediate';
      if (classifications.includes('Pneumonia') || classifications.includes('मलेरिया (Malaria)') || classifications.includes('औलो (Malaria)') || classifications.includes('Falciparum Malaria') || classifications.includes('फ्याल्सिपेरम नभएको औलो (Non-Falciparum Malaria)') || classifications.includes('ज्वरो (औलोको सम्भावना नभएको)') || classifications.includes('Measles with Eye/Mouth Complications') || classifications.includes('Dysentery')) return '3 days';
      if (classifications.includes('Some Dehydration') || classifications.includes('Severe Dehydration')) return '2 days';
      if (classifications.includes('Acute Ear Infection') || classifications.includes('Persistent Diarrhea')) return '5 days';
      if (classifications.includes('Severe Acute Malnutrition') || classifications.includes('Very Low Weight (धेरै कम तौल)')) return '30 days';
      if (classifications.includes('Moderate Acute Malnutrition') || classifications.includes('Low Weight (कम तौल)')) return '30 days';
    }
    return null;
  };

  const getSuggestedTreatment = (classifications: string[]) => {
    const treatments: string[] = [];
    if (classifications.length === 0) return [];

    if (moduleType === 'Infant') {
      const weight = parseFloat(assessmentData.weight) || 0;
      if (classifications.includes('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण वा धेरै कडा रोग (Possible Serious Bacterial Infection)')) {
        if (weight > 0) {
          const gentDose = `${(weight * 5).toFixed(1)}mg (0.125ml/kg of 40mg/ml)`;
          const ampDose = `${(weight * 50).toFixed(0)}mg (0.2ml/kg of 250mg/ml)`;
          treatments.push(`१) शिशुलाई IM Gentamycin को पहिलो मात्रा दिनुहोस्: ${gentDose}`);
          treatments.push(`२) शिशुलाई IM Ampicillin को पहिलो मात्रा दिनुहोस्: ${ampDose}`);
          treatments.push('३) रगतमा चिनीको मात्रा कम हुन नदिन स्तनपानलाई निरन्तरता दिनुहोस्');
          treatments.push('४) शिशुलाई तुरुन्त अस्पताल प्रेषण (Refer) गर्नुहोस्');
        } else {
          treatments.push('१) शिशुको तौल प्रविष्ट गर्नुहोस् (Gentamycin र Ampicillin को मात्रा गणना गर्न)');
          treatments.push('२) रगतमा चिनीको मात्रा कम हुन नदिन स्तनपानलाई निरन्तरता दिनुहोस्');
          treatments.push('३) शिशुलाई तुरुन्त अस्पताल प्रेषण (Refer) गर्नुहोस्');
        }
      }
      if (classifications.includes('Local Bacterial Infection')) {
        let amoxDose = '';
        if (weight > 0) {
          const minDose = (weight * 75) / 2;
          const maxDose = (weight * 100) / 2;
          amoxDose = `${minDose.toFixed(0)}-${maxDose.toFixed(0)}mg twice daily`;
        }
        
        const isOnlyEyeDischarge = assessmentData.localInfection?.length === 1 && assessmentData.localInfection.includes('आँखाबाट पिप बगेको (Eye discharge)');

        if (isOnlyEyeDischarge) {
          treatments.push(` Amoxycillin ५ दिन सम्म खान दिनुहोस्: ${amoxDose}`);
          treatments.push('आँखामा रहेको पिपलाई मनतातो सफा पानीले सफा गर्नुहोस्। यो प्रक्रिया आँखाबाट पिप बग्न नरोकिएसम्म जारी राख्नुहोस्। पिप सफा गरिसकेपछि Ciprofloxacin Eye/Ear drop १ थोपा दिनको ४ पटक ७ दिनसम्म राख्नुहोस्');
          treatments.push(' दिनमा फलो-अप (Follow-up) मा बोलाउनुहोस्');
        } else {
          treatments.push(` Amoxycillin ५ दिन सम्म खान दिनुहोस्: ${amoxDose}`);
          treatments.push(' हल्का तरिकाले फोकाको पिप र पत्रहरू दिनमा २ पटक ५ दिनसम्म साबुन पानीले सफा गर्नुहोस् र पखाल्नुहोस्');
          treatments.push(' घाउ सुक्खा पार्नुहोस्');
          treatments.push(' Gentian Violet ०.५% लगाउनुहोस्');
          if (assessmentData.localInfection?.includes('आँखाबाट पिप बगेको (Eye discharge)')) {
            treatments.push(' आँखामा रहेको पिपलाई मनतातो सफा पानीले सफा गर्नुहोस्। यो प्रक्रिया आँखाबाट पिप बग्न नरोकिएसम्म जारी राख्नुहोस्। पिप सफा गरिसकेपछि Ciprofloxacin Eye/Ear drop १ थोपा दिनको ४ पटक ७ दिनसम्म राख्नुहोस्');
          }
          treatments.push(' ३ दिनमा फलो-अप (Follow-up) मा बोलाउनुहोस्');
        }
      }
      if (classifications.includes('Pneumonia')) {
        let amoxDose = '';
        if (weight > 0) {
          const minDose = (weight * 75) / 2;
          const maxDose = (weight * 100) / 2;
          amoxDose = `${minDose.toFixed(0)}-${maxDose.toFixed(0)}mg twice daily`;
        }
        treatments.push(` Amoxycillin ७ दिनको लागि खान दिनुहोस्: ${amoxDose}`);
        treatments.push(' घरमै शिशुलाई स्याहार गर्नेबारे आमालाई परामर्श दिनुहोस्');
        treatments.push(' ३ दिन पछि फलो-अप (Follow-up) मा बोलाउनुहोस्');
      }
      if (classifications.includes('Low Birth Weight') || classifications.includes('Very Low Birth Weight') || classifications.includes('Low Weight for Age (उमेर अनुसार कम तौल)') || classifications.includes('Very Low Weight for Age (उमेर अनुसार धेरै कम तौल)')) {
        treatments.push('शिशुलाई न्यानो पारी राख्ने तरिका:');
        treatments.push(' सफा, नरम र सुख्खा कपडाले शिशुको शरीर पुछी दिने र बेर्ने');
        treatments.push(' आमाको छाती, पेटसँग शिशुलाई टाँसेर राख्ने (Kangaroo Mother Care)');
        treatments.push(' तुरुन्त स्तनपान सुरु गर्ने');
        treatments.push(' शिशु जन्मेको २४ घण्टासम्म ननुहाइदिने');
        treatments.push(' शिशुलाई न्यानो कपडाले टाउको समेत छोपेर बेर्ने');
        treatments.push(' सुत्ने बेलामा शिशुलाई आमासँगै टाँसेर सुताउने');
        treatments.push('१ घण्टा पछि पुनर्मूल्यांकन गर्नुहोस्:');
        treatments.push(' ब्याक्टेरियाको सम्भावित संक्रमणको लागि जाँच गर्नुहोस्');
        treatments.push(' यदि संक्रमणका कुनै लक्षण छैनन् र तापक्रम सामान्य छ भने शिशुको स्याहारलाई निरन्तरता दिन आमालाई सल्लाह दिनुहोस्');
        treatments.push(' १४ दिनमा अनुगमनको लागि बोलाउनुहोस्');
      }
      if (assessmentData.feedingProblems?.includes('मुखभित्र घाउ वा सेता दागहरू (Thrush)')) {
        treatments.push('अैालाको टुप्पामा सफा लुगा बेर्ने र नुन पानीले भिजाएर मुखभित्रको घाउ दिनमा ४ पटक ७ दिनसम्म पुछ्नुहोस्, आधा शक्तिको जेन्सियन भायलेट (Gentian Violet) ०.२५% वा क्लोट्रिमाजोल (Clotrimazole) माउथ पेन्ट दिनमा ४ पटक ७ दिनसम्म घाउमा लगाउनुहोस्।');
      }
      if (classifications.includes('Severe Jaundice')) {
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('Prevent low blood sugar');
        treatments.push('Keep infant warm');
      }
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('१) कडा जलवियोजनको लागि उपचार गर्नुहोस् (Plan C)');
        treatments.push('२) तुरुन्त अस्पताल प्रेषण (Refer) गर्नुहोस्');
        treatments.push('३) यदि बच्चाले निल्न सक्छ भने अस्पताल पुर्याउँदासम्मको लागि ओ.आर.एस (ORS) चिया चम्चाले वा कपले खुवाउँदै लैजानुहोस्');
        treatments.push('४) १०० मिली/केजी रिंगर ल्याक्टेट (वा साधारण सलाइन) दिई उपचार सुरु गर्नुहोस्');
      }
      if (classifications.includes('Some Dehydration')) {
        treatments.push('१) केही जलवियोजनको लागि उपचार गर्नुहोस् (Plan B)');
        treatments.push('२) स्वास्थ्य संस्थामा ४ घण्टासम्म ओ.आर.एस (ORS) ७५ मिली/केजीका दरले खुवाउनुहोस्');
        treatments.push('३) आमालाई ओ.आर.एस (ORS) बनाउने र खुवाउने तरिका सिकाउनुहोस्');
        treatments.push('४) ४ घण्टा पछि पुन: जाँच गरि निर्देशानुसार उपचार गर्नुहोस्');
      }
      if (classifications.includes('No Dehydration')) {
        treatments.push('१) घरमै पखालाको उपचार गर्नुहोस् (Plan A)');
        treatments.push('२) थप झोल पदार्थहरू (र स्तनपान) बच्चाले चाहे जति खुवाउनुहोस्');
        treatments.push('३) स्तनपानलाई निरन्तरता दिनुहोस्');
        treatments.push('४) खतराका संकेतहरू देखिएमा तुरुन्त स्वास्थ्य संस्था ल्याउन परामर्श दिनुहोस्');
      }

      if (assessmentData.bloodInStool) {
        treatments.push('१) शिशुलाई तुरुन्त माथिल्लो स्वास्थ्य संस्थामा प्रेषण (Refer) गर्नुहोस्');
      }

      if (classifications.includes('Feeding Problem')) {
        treatments.push('स्तनपान सम्बन्धी समस्याको उपचार:');
        
        const attachmentNotGood = assessmentData.attachment === 'Not Well' || assessmentData.attachment === 'Not at all';
        const sucklingNotEffective = assessmentData.suckling === 'Not Effective' || assessmentData.suckling === 'Not at all';
        
        if (attachmentNotGood || sucklingNotEffective) {
          treatments.push(' स्तन सम्पर्क राम्रो छैन र प्रभावकारी रुपले स्तन चुसेको छैन भने सही आसन र स्तन सम्पर्क बारे आमालाई सिकाउनुहोस्');
          treatments.push(' यदि स्तन सम्पर्क तुरुन्तै हुन नसकेको अवस्था छ भने आमालाई दूध निचोरेर कपबाट शिशुलाई खुवाउन सिकाउनुहोस्');
        }
        
        if (assessmentData.feedingProblems?.includes('२४ घण्टामा १० पटक भन्दा कम स्तनपान')) {
          treatments.push(' यदि स्तनपान २४ घण्टामा १० पटक भन्दा कम गराएको रहेछ भने आमालाई पटक बढाउन सल्लाह दिनुहोस् र बच्चाले चाहेको खण्डमा र चाहे जति दिनमा र राति पनि शिशुलाई स्तनपान गराउन सल्लाह दिनुहोस्');
        }
        
        if (assessmentData.feedingProblems?.includes('थप खाना वा झोल दिने गरेको')) {
          treatments.push(' यदि स्तनपान बाहेक अरु खानेकुरा वा झोल कुरा खुवाउने गरेको रहेछ भने त्यस किसिमको खाना घटाउन र झोलकुरा खान दिँदा कप प्रयोग गर्न र स्तनपान बढाउन सल्लाह दिनुहोस्');
        }
        
        if (assessmentData.suckling === 'Not at all') {
          treatments.push(' यदि स्तनपान पट्टकै नगराउने गरेको छ भने स्तनपानको लागि परामर्श लिने ठाउँमा जाँच्न प्रेषण गर्नुहोस्, स्तनपानको सट्टामा दिइने दूध सही तरिकाले तयार गर्न र कपले खुवाउन सल्लाह दिनुहोस्');
        }

        treatments.push(' शिशुलाई घरमा कसरी खुवाउने र न्यानो बनाइराख्ने भन्ने बारेमा सल्लाह दिनुहोस्');
        treatments.push(' घरमा शिशुलाई हेरचाह गर्न आमालाई सल्लाह दिनुहोस्');
        treatments.push(' खाना सम्बन्धी समस्याको लागि ३ दिनमा अनुगमनको लागि बोलाउनुहोस्');
      }
    } else {
      const weight = parseFloat(assessmentData.weight) || 0;
      if (classifications.includes('Very Severe Disease') || classifications.includes('Severe Pneumonia or Very Severe Disease') || classifications.includes('Severe Acute Malnutrition') || classifications.includes('Severe Complicated Measles') || classifications.includes('Mastoiditis') || classifications.includes('धेरै कडा ज्वरोजन्य रोग वा कडा जटिल औलो (Very Severe Febrile Disease or Severe Malaria)') || classifications.includes('अति कडा ज्वरो (Very Severe Febrile Disease)') || classifications.includes('धेरै कडा ज्वरो (Very Severe Febrile Disease)')) {
        let gentDose = '';
        let ampDose = '';
        if (weight > 0) {
          gentDose = `${(weight * 5).toFixed(1)}mg IM`;
          ampDose = `${(weight * 50).toFixed(0)}mg IM`;
        }
        treatments.push(`एन्टीबायोटिकको पहिलो मात्रा दिनुहोस्: Gentamicin (${gentDose}) र Ampicillin (${ampDose}) (Give first dose of appropriate antibiotic)`);
        treatments.push('तुरुन्त अस्पताल प्रेषण गर्नुहोस् (Refer URGENTLY to hospital)');
        treatments.push('रगतमा चिनीको मात्रा कम हुनबाट जोगाउन उपचार गर्नुहोस् (Prevent low blood sugar)');
        treatments.push('शिशुलाई न्यानो पार्नुहोस् (Keep child warm)');
        
        if (classifications.includes('धेरै कडा ज्वरो (Very Severe Febrile Disease)') || 
            classifications.includes('अति कडा ज्वरो (Very Severe Febrile Disease)') || 
            classifications.includes('धेरै कडा ज्वरोजन्य रोग वा कडा जटिल औलो (Very Severe Febrile Disease or Severe Malaria)')) {
          treatments.push('बढी ज्वरो (३८.५ वा सो भन्दा बढी) भएमा उपचार केन्द्रमा नै १ मात्रा प्यारासिटामोल दिनुहोस् (Give one dose of Paracetamol at the health facility if fever is 38.5°C or higher)');
        }

        if (classifications.includes('धेरै कडा ज्वरोजन्य रोग वा कडा जटिल औलो (Very Severe Febrile Disease or Severe Malaria)')) {
          treatments.push('रगतको स्लाइड बनाउनुहोस्, र सेवा प्राप्त छ भने इन्ज आर्टेसुनेट एक मात्रा दिई स्लाइड सहित तुरुन्त प्रेषण गर्नुहोस् (Prepare blood slide, and if service available, give one dose of Inj. Artesunate and refer urgently with the slide)');
        }
      }
      if (classifications.includes('Moderate Acute Malnutrition')) {
        treatments.push('१) आमालाई बच्चा खुवाउने तरिका सिकाउनुहोस् (Counsel on feeding)');
        treatments.push('२) ३० दिन पछि फलो-अप (Follow-up) मा बोलाउनुहोस्');
        treatments.push('३) स्थानीय रुपमा उपलब्ध पौष्टिक आहार खुवाउन सल्लाह दिनुहोस्');
      }
      if (classifications.includes('Very Low Weight (धेरै कम तौल)')) {
        if (!classifications.includes('Severe Acute Malnutrition')) {
          treatments.push('१) बच्चालाई खुवाउने बारे परामर्श दिनुहोस्');
          treatments.push('२) ३० दिन पछि फलो-अप (Follow-up) मा बोलाउनुहोस्');
          treatments.push('३) स्थानीय रुपमा उपलब्ध पौष्टिक आहार खुवाउन सल्लाह दिनुहोस्');
        }
      }
      if (classifications.includes('Low Weight (कम तौल)')) {
        if (!classifications.includes('Moderate Acute Malnutrition') && !classifications.includes('Severe Acute Malnutrition')) {
          treatments.push('१) बच्चालाई खुवाउने बारे परामर्श दिनुहोस्');
          treatments.push('२) ३० दिन पछि फलो-अप (Follow-up) मा बोलाउनुहोस्');
        }
      }
      if (assessmentData.generalDangerSigns?.includes('काँप्ने (Convulsions)')) {
        const diazepamDose = weight > 0 ? `${(weight * 0.5).toFixed(1)}mg` : '0.5 mg/kg';
        treatments.push(`Give Diazepam ${diazepamDose} (10mg/2ml) solution per-rectum`);
      }
      if (classifications.includes('Pneumonia')) {
        let amoxDose = '';
        const ageYears = currentPatient?.ageYears || 0;
        const ageMonths = currentPatient?.ageMonths || 0;
        const totalMonths = ageYears * 12 + ageMonths;

        if (weight >= 4 && weight < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (weight >= 6 && weight < 8) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (weight >= 8 && weight < 10) amoxDose = '250mg tab: 1.5 tab BD OR Syrup 125mg/5ml: 15 ml BD';
        else if (weight >= 10 && weight < 14) amoxDose = '250mg tab: 2 tab BD';
        else if (weight >= 14 && weight < 19) amoxDose = '250mg tab: 2.5 tab BD';
        else if (totalMonths >= 2 && totalMonths < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (totalMonths >= 6 && totalMonths < 12) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (totalMonths >= 12 && totalMonths < 36) amoxDose = '250mg tab: 2 tab BD';
        else if (totalMonths >= 36 && totalMonths <= 60) amoxDose = '250mg tab: 2.5 tab BD';
        else amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        
        if (assessmentData.hivStatus) {
          treatments.push(`Give first dose of Amoxicillin: ${amoxDose.split(' OR ')[0]}`);
          treatments.push('Refer URGENTLY to hospital (HIV exposed/infected)');
        } else if (!classifications.includes('Dysentery')) {
          treatments.push(`Give Amoxicillin for 5 days: ${amoxDose}`);
          treatments.push('Soothe the throat and relieve cough with safe remedy');
          treatments.push('Advise mother when to return immediately');
          treatments.push('Follow-up in 3 days');
        } else {
          treatments.push('Note: Amoxicillin not required as Ciprofloxacin is given for Dysentery');
          treatments.push('Soothe the throat and relieve cough with safe remedy');
          treatments.push('Advise mother when to return immediately');
          treatments.push('Follow-up in 3 days');
        }
      }
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Give fluid for severe dehydration (Plan C)');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('If child can drink, give ORS by mouth while drip is being set up');
        treatments.push('Give 100 ml/kg Ringer\'s Lactate (or Normal Saline)');
      }
      if (classifications.includes('Some Dehydration')) {
        treatments.push('Give fluid and food for some dehydration (Plan B)');
        treatments.push('Give 75 ml/kg of ORS in the clinic over 4 hours');
        treatments.push('Show mother how to give ORS solution');
        treatments.push('After 4 hours, reassess child and classify for dehydration');
      }
      if (classifications.includes('No Dehydration')) {
        treatments.push('Treat diarrhea at home (Plan A)');
        treatments.push('Give extra fluid (as much as child will take)');
        treatments.push('Give Zinc Supplement for 10 days (2-6m: 10mg, >6m: 20mg)');
        treatments.push('Continue feeding');
        treatments.push('Advise mother when to return immediately');
      }
      if (classifications.includes('Severe Persistent Diarrhea')) {
        treatments.push('Treat dehydration before referral');
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Persistent Diarrhea')) {
        treatments.push('Advise on feeding for persistent diarrhea');
        treatments.push('Give Vitamin A');
        treatments.push('Follow-up in 5 days');
      }
      if (classifications.includes('Dysentery')) {
        const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
        let ciproDose = '';
        
        if (ageInMonths < 6) {
          ciproDose = '१/२ चक्की (1/2 tab) दिनको २ पटक, ३ दिनसम्म';
        } else {
          ciproDose = '१ चक्की (1 tab) दिनको २ पटक, ३ दिनसम्म';
        }
        
        treatments.push(`सिप्रोफ्लोक्सासिन (Ciprofloxacin 250mg): ${ciproDose}`);
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('हैजा (Haija)')) {
        let ciproDose = '';
        if (weight >= 4 && weight < 6) ciproDose = '१/४ चक्की (1/4 tab) दिनको २ पटक, ३ दिनसम्म (२-४ महिना)';
        else if (weight >= 6 && weight < 10) ciproDose = '१/२ चक्की (1/2 tab) दिनको २ पटक, ३ दिनसम्म (४-१२ महिना)';
        else if (weight >= 10 && weight <= 19) ciproDose = '१ चक्की (1 tab) दिनको २ पटक, ३ दिनसम्म (१२ महिना-५ वर्ष)';
        
        treatments.push(`हैजाको लागि सिप्रोफ्लोक्सासिन (Ciprofloxacin for Cholera): ${ciproDose}`);
      }
      if (classifications.includes('मलेरिया (Malaria)') || classifications.includes('औलो (Malaria)') || classifications.includes('Falciparum Malaria') || classifications.includes('फ्याल्सिपेरम नभएको औलो (Non-Falciparum Malaria)')) {
        let actDose = '';
        if (weight >= 5 && weight < 15) actDose = '1 tablet (20/120) once daily for 3 days';
        else if (weight >= 15 && weight < 25) actDose = '2 tablets (20/120) once daily for 3 days';
        
        if (classifications.includes('Falciparum Malaria')) {
          treatments.push(`Give first dose of ACT for Falciparum Malaria: ${actDose}`);
        } else if (classifications.includes('फ्याल्सिपेरम नभएको औलो (Non-Falciparum Malaria)')) {
          treatments.push('भाइभेक्सको क्लोरोक्विन द्वारा उपचार गर्नुहोस् (Treat with Chloroquine for Vivax)');
        } else {
          treatments.push(`Give ACT for 3 days: ${actDose}`);
        }
        treatments.push('Follow-up in 3 days if fever persists');
      }
      if (classifications.includes('ज्वरो (औलोको सम्भावना नभएको)') || classifications.includes('ज्वरो')) {
        treatments.push('बढी ज्वरो (३८.५ वा सो भन्दा बढी) भएमा उपचार केन्द्रमा नै १ मात्रा प्यारासिटामोल दिनुहोस् (Give one dose of Paracetamol at the health facility if fever is 38.5°C or higher)');
        treatments.push('ज्वरो आइरह्यो भने तेस्रो दिनमा फलोअपमा बोलाउने (Call for follow-up on the 3rd day if fever persists)');
        treatments.push('यदि ज्वरो प्रत्येक दिन लगातार ७ दिन सम्म आइरह्यो भने थप मूल्यांकनको लागि प्रेषण गर्ने (Refer for further evaluation if fever persists for 7 consecutive days)');
        treatments.push('ज्वरोको अन्य कारणको उपयुक्त उपचार गर्नुहोस् (Treat other causes of fever appropriately)');
      }
      if (classifications.includes('Acute Ear Infection')) {
        let amoxDose = '';
        const ageYears = currentPatient?.ageYears || 0;
        const ageMonths = currentPatient?.ageMonths || 0;
        const totalMonths = ageYears * 12 + ageMonths;

        if (weight >= 4 && weight < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (weight >= 6 && weight < 8) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (weight >= 8 && weight < 10) amoxDose = '250mg tab: 1.5 tab BD OR Syrup 125mg/5ml: 15 ml BD';
        else if (weight >= 10 && weight < 14) amoxDose = '250mg tab: 2 tab BD';
        else if (weight >= 14 && weight < 19) amoxDose = '250mg tab: 2.5 tab BD';
        else if (totalMonths >= 2 && totalMonths < 6) amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD';
        else if (totalMonths >= 6 && totalMonths < 12) amoxDose = '250mg tab: 1 tab BD OR Syrup 125mg/5ml: 10 ml BD';
        else if (totalMonths >= 12 && totalMonths < 36) amoxDose = '250mg tab: 2 tab BD';
        else if (totalMonths >= 36 && totalMonths <= 60) amoxDose = '250mg tab: 2.5 tab BD';
        else amoxDose = '250mg tab: 3/4 tab BD OR Syrup 125mg/5ml: 7.5 ml BD'; // Default fallback
        
        if (!classifications.includes('Dysentery')) {
          treatments.push(`Give Amoxicillin for 5 days: ${amoxDose}`);
        } else {
          treatments.push('Note: Amoxicillin not required as Ciprofloxacin is given for Dysentery');
        }
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('Chronic Ear Infection')) {
        treatments.push('१) दिनमा कम्तीमा ३ पटक वा कान सुक्खा नभएसम्म कान सफा (Dry Ear Wicking) गर्ने तरिका सिकाउनुहोस्');
        treatments.push('२) Ciprofloxacin ear drops १-१ थोपा दिनको २ पटक १४ दिनसम्म कानमा हाल्न सल्लाह दिनुहोस्');
        treatments.push('३) ५ दिन पछि फलो-अप (Follow-up) मा बोलाउनुहोस्');
      }
      if (classifications.includes('Severe Anemia')) {
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Anemia')) {
        treatments.push('Give Iron/Folate');
        treatments.push('Give Albendazole if child is 1 year or older');
        treatments.push('Advise mother on feeding');
        treatments.push('Follow-up in 14 days');
      }

      if (classifications.includes('Severe Complicated Measles (कडा जटिल दादुरा)')) {
        treatments.push('१) भिटामिन ए (Vitamin A) को मात्रा दिनुहोस्');
        treatments.push('२) एन्टिबायोटिकको पहिलो मात्रा दिनुहोस्');
        treatments.push('३) तुरुन्त अस्पताल प्रेषण (Refer) गर्नुहोस्');
      }
      if (classifications.includes('Measles with Eye/Mouth Complications (आँखा वा मुखको जटिलता सहितको दादुरा)')) {
        treatments.push('१) भिटामिन ए (Vitamin A) को मात्रा दिनुहोस्');
        if (assessmentData.feverSigns?.includes('आँखाबाट पीप बगेको (Eye discharge)')) {
          treatments.push('२) आँखामा पीप सफा गरी Tetracycline Eye Ointment लगाउनुहोस्');
        }
        if (assessmentData.feverSigns?.includes('मुखभित्र घाउ (Mouth ulcers)')) {
          treatments.push('३) मुखभित्रको घाउमा Gentian Violet (0.25%) लगाउनुहोस्');
        }
      }
      if (classifications.includes('Measles (दादुरा जस्तै रोग)')) {
        treatments.push('१) भिटामिन ए (Vitamin A) को मात्रा दिनुहोस्');
      }

      // Dehydration Plans
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Plan C: Start IV fluids immediately (Ringer\'s Lactate)');
        treatments.push('If child can drink, give ORS by mouth while drip is set up');
        treatments.push('Refer URGENTLY to hospital');
      } else if (classifications.includes('Some Dehydration')) {
        treatments.push('Plan B: Give ORS in clinic (75ml/kg over 4 hours)');
        treatments.push('Show mother how to give ORS');
        treatments.push('Give Zinc (10-14 days)');
        treatments.push('Reassess after 4 hours');
      } else if (classifications.includes('No Dehydration')) {
        treatments.push('Plan A: Give extra fluid, continue feeding');
        treatments.push('Give Zinc (10-14 days)');
        treatments.push('Advise mother when to return immediately');
      }

      // HIV Treatment
      if (classifications.includes('CONFIRMED HIV INFECTION (रातो)')) {
        treatments.push('Refer to ART Center for treatment');
        treatments.push('Start Cotrimoxazole Prophylaxis');
        treatments.push('Treat other infections');
      }
      if (classifications.includes('HIV EXPOSED (पहेँलो)')) {
        treatments.push('Start Cotrimoxazole Prophylaxis from 6 weeks of age');
        treatments.push('Test for HIV at 6 weeks (PCR)');
        treatments.push('Follow-up regularly');
      }
      if (classifications.includes('SUSPECTED SYMPTOMATIC HIV (पहेँलो)') || classifications.includes('HIV TEST REQUIRED (पहेँलो)')) {
        treatments.push('Refer for HIV Testing and Counseling');
        treatments.push('Treat existing conditions');
      }

      // TB Treatment
      if (classifications.includes('POSSIBLE TB (पहेँलो)')) {
        treatments.push('Refer for TB investigation (Mantoux, X-ray, GeneXpert)');
        treatments.push('Assess for other causes of symptoms');
      }
      if (classifications.includes('LATENT TUBERCULOSIS INFECTION (पहेँलो)')) {
        treatments.push('Start Isoniazid Preventive Therapy (IPT)');
        treatments.push('Follow-up regularly');
      }

      // Paracetamol for high fever or ear pain/infection
      const temp = parseFloat(assessmentData.temperature) || 0;
      if (temp >= 38.5 || assessmentData.earPain || classifications.includes('Acute Ear Infection') || classifications.includes('Mastoiditis')) {
        const ageYears = currentPatient?.ageYears || 0;
        const ageMonths = currentPatient?.ageMonths || 0;
        const totalMonths = ageYears * 12 + ageMonths;
        let pcmDose = '';
        
        // In Child module (2m-5y), we always give at least 5ml
        if (weight >= 14 || totalMonths >= 36) {
          pcmDose = '७.५ मि.लि. (7.5 ml) दिनको ४ पटक (QID)';
        } else {
          pcmDose = '५ मि.लि. (5 ml) दिनको ४ पटक (QID)';
        }
        
        const reason = (temp >= 38.5) ? 'उच्च ज्वरो' : 'कान दुखाई/संक्रमण';
        treatments.push(`${reason}को लागि प्यारासिटामोल (Paracetamol 125mg/5ml): ${pcmDose} (ज्वरो वा दुखाई निको नभएसम्म)`);
      }
    }
    return Array.from(new Set(treatments));
  };

  const calculateZScore = () => {
    if (!assessmentData.weight || !currentPatient) return null;
    const weight = parseFloat(assessmentData.weight);
    
    // Calculate precise age in months
    const today = new Date();
    const birthDate = currentPatient.dobAd ? new Date(currentPatient.dobAd) : null;
    let ageMonths = (currentPatient.ageYears || 0) * 12 + (currentPatient.ageMonths || 0);
    
    if (birthDate) {
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      ageMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
    }

    // More granular WHO Weight-for-Age Z-score (WAZ) logic (Approximate Median and SD)
    const wazData: any = {
      0: { m: 3.3, s: 0.4 },
      1: { m: 4.5, s: 0.5 },
      2: { m: 5.6, s: 0.6 },
      3: { m: 6.4, s: 0.7 },
      4: { m: 7.0, s: 0.8 },
      5: { m: 7.5, s: 0.8 },
      6: { m: 7.9, s: 0.8 },
      9: { m: 8.9, s: 0.9 },
      12: { m: 9.6, s: 1.0 },
      15: { m: 10.3, s: 1.1 },
      18: { m: 10.9, s: 1.1 },
      21: { m: 11.5, s: 1.2 },
      24: { m: 12.2, s: 1.3 },
      30: { m: 13.3, s: 1.4 },
      36: { m: 14.3, s: 1.6 },
      42: { m: 15.3, s: 1.7 },
      48: { m: 16.3, s: 1.9 },
      54: { m: 17.3, s: 2.0 },
      60: { m: 18.3, s: 2.2 }
    };

    const ages = Object.keys(wazData).map(Number).sort((a, b) => a - b);
    
    // Linear interpolation for more accuracy
    let m, s;
    if (ageMonths <= 0) {
      m = wazData[0].m;
      s = wazData[0].s;
    } else if (ageMonths >= 60) {
      m = wazData[60].m;
      s = wazData[60].s;
    } else {
      const lowerAge = ages.filter(a => a <= ageMonths).pop() || 0;
      const upperAge = ages.find(a => a > ageMonths) || 60;
      const factor = (ageMonths - lowerAge) / (upperAge - lowerAge);
      
      m = wazData[lowerAge].m + factor * (wazData[upperAge].m - wazData[lowerAge].m);
      s = wazData[lowerAge].s + factor * (wazData[upperAge].s - wazData[lowerAge].s);
    }
    
    const zScore = (weight - m) / s;
    return zScore.toFixed(2);
  };

  const calculateWHZ = () => {
    if (!assessmentData.weight || !assessmentData.height) return null;
    const weight = parseFloat(assessmentData.weight);
    let height = parseFloat(assessmentData.height);
    const gender = assessmentData.gender || 'Male';
    const method = assessmentData.measurementMethod || 'Automatic';

    // WHO Correction Logic
    // Below 87cm: Length (Recumbent)
    // 87cm and above: Height (Standing)
    // Standing is 0.7cm less than Recumbent
    if (height < 87 && method === 'Standing') {
      height += 0.7; // Convert standing height to length for WHZ calculation
    } else if (height >= 87 && method === 'Recumbent') {
      height -= 0.7; // Convert recumbent length to height for WHZ calculation
    } else if (method === 'Automatic') {
      // If automatic and user gave >= 87, we assume it's height. If < 87, we assume it's length.
      // This is the default WHO stance unless specified otherwise.
    }
    
    // WHO Weight-for-Height (WFH) / Weight-for-Length (WFL) approximate Median and SD
    const whzData: any = {
      Male: {
        45: { m: 2.5, s: 0.3 },
        50: { m: 3.4, s: 0.4 },
        55: { m: 4.6, s: 0.5 },
        60: { m: 5.9, s: 0.6 },
        65: { m: 7.2, s: 0.7 },
        70: { m: 8.4, s: 0.8 },
        75: { m: 9.6, s: 0.9 },
        80: { m: 10.6, s: 1.0 },
        85: { m: 11.8, s: 1.1 },
        90: { m: 13.0, s: 1.3 },
        95: { m: 14.3, s: 1.4 },
        100: { m: 15.6, s: 1.6 },
        105: { m: 17.0, s: 1.8 },
        110: { m: 18.5, s: 2.0 },
        115: { m: 20.1, s: 2.2 },
        120: { m: 21.8, s: 2.5 }
      },
      Female: {
        45: { m: 2.4, s: 0.3 },
        50: { m: 3.2, s: 0.4 },
        55: { m: 4.4, s: 0.5 },
        60: { m: 5.6, s: 0.6 },
        65: { m: 6.8, s: 0.7 },
        70: { m: 8.0, s: 0.8 },
        75: { m: 9.1, s: 0.9 },
        80: { m: 10.2, s: 1.0 },
        85: { m: 11.3, s: 1.1 },
        90: { m: 12.5, s: 1.3 },
        95: { m: 13.8, s: 1.4 },
        100: { m: 15.1, s: 1.6 },
        105: { m: 16.5, s: 1.8 },
        110: { m: 18.0, s: 2.0 },
        115: { m: 19.6, s: 2.2 },
        120: { m: 21.3, s: 2.5 }
      }
    };

    const data = whzData[gender] || whzData.Male;
    const heights = Object.keys(data).map(Number).sort((a, b) => a - b);
    
    let m, s;
    if (height <= 45) {
      m = data[45].m;
      s = data[45].s;
    } else if (height >= 120) {
      m = data[120].m;
      s = data[120].s;
    } else {
      const lowerH = heights.filter(h => h <= height).pop() || 45;
      const upperH = heights.find(h => h > height) || 120;
      const factor = (height - lowerH) / (upperH - lowerH);
      
      m = data[lowerH].m + factor * (data[upperH].m - data[lowerH].m);
      s = data[lowerH].s + factor * (data[upperH].s - data[lowerH].s);
    }
    
    const whz = (weight - m) / s;
    return whz.toFixed(2);
  };

  const zScore = calculateZScore();
  const whzScore = calculateWHZ();
  const suggestedClassifications = getClassification();
  const suggestedNextVisit = getSuggestedNextVisit(suggestedClassifications);
  const suggestedTreatments = getSuggestedTreatment(suggestedClassifications);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {!currentPatient && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
            <Baby className="text-primary-600" />
            CBIMNCI सेवा (CBIMNCI Service)
          </h2>
          <div className="flex gap-4 mb-6 border-b pb-2">
            {canSearch && (
              <button 
                onClick={() => setViewMode('search')} 
                className={`px-4 py-2 font-bold text-sm ${viewMode === 'search' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
              >
                बिरामी खोज्नुहोस् (Search Patient)
              </button>
            )}
            {canDirectEntry && (
              <button 
                onClick={() => setViewMode('selection')} 
                className={`px-4 py-2 font-bold text-sm ${viewMode === 'selection' || viewMode === 'entry' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500'}`}
              >
                प्रत्यक्ष प्रविष्टि (Direct Entry)
              </button>
            )}
          </div>

          {viewMode === 'entry' && canDirectEntry ? (
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <button onClick={() => { setViewMode('selection'); resetForm(); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm">
                  <ArrowLeft size={16} /> फिर्ता
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input 
              label="उमेर (महिनामा) *" 
              type="number"
              value={tempChildInfo.ageMonths || ''}
              disabled={moduleType === 'Infant'}
              min={2}
              max={59}
              onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setTempChildInfo({...tempChildInfo, ageMonths: val as any});
              }}
            />
            <Input 
              label="उमेर (हप्तामा)"
              type="number"
              value={tempChildInfo.ageWeeks || ''}
              disabled={true}
              onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setTempChildInfo({...tempChildInfo, ageWeeks: val as any});
              }}
            />
            <Input 
              label="उमेर (दिनमा) *" 
              type="number"
              value={tempChildInfo.ageDays || ''}
              disabled={moduleType === 'Child'}
              min={0}
              max={59}
              onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setTempChildInfo({...tempChildInfo, ageDays: val as any});
              }}
            />
            <Input 
              label="तौल (kg)" 
              type="number"
              value={tempChildInfo.weight || ''}
              onChange={(e) => setTempChildInfo({...tempChildInfo, weight: e.target.value === '' ? '' : parseFloat(e.target.value) as any})}
            />
            <Input 
              label="उचाइ/लम्बाई (cm)" 
              type="number"
              value={tempChildInfo.height || ''}
              onChange={(e) => setTempChildInfo({...tempChildInfo, height: e.target.value === '' ? '' : parseFloat(e.target.value) as any})}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 block">मापन विधि (Measurement Method)</label>
              <div className="flex gap-2 p-1 border border-slate-300 rounded-lg">
                <label className="flex items-center gap-1 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="tempMeasurementMethod" 
                    value="Automatic" 
                    checked={tempChildInfo.measurementMethod === 'Automatic'} 
                    onChange={(e) => setTempChildInfo({...tempChildInfo, measurementMethod: e.target.value})}
                  />
                  Auto
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="tempMeasurementMethod" 
                    value="Standing" 
                    checked={tempChildInfo.measurementMethod === 'Standing'} 
                    onChange={(e) => setTempChildInfo({...tempChildInfo, measurementMethod: e.target.value})}
                  />
                  उठेर
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="tempMeasurementMethod" 
                    value="Recumbent" 
                    checked={tempChildInfo.measurementMethod === 'Recumbent'} 
                    onChange={(e) => setTempChildInfo({...tempChildInfo, measurementMethod: e.target.value})}
                  />
                  सुताएर
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 block">लिङ्ग (Gender)</label>
              <div className="flex gap-4 p-2 border border-slate-300 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="radio" 
                    name="tempGender" 
                    value="Male" 
                    checked={tempChildInfo.gender === 'Male'} 
                    onChange={(e) => setTempChildInfo({...tempChildInfo, gender: e.target.value})}
                  />
                  पुरुष (Male)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="radio" 
                    name="tempGender" 
                    value="Female" 
                    checked={tempChildInfo.gender === 'Female'} 
                    onChange={(e) => setTempChildInfo({...tempChildInfo, gender: e.target.value})}
                  />
                  महिला (Female)
                </label>
              </div>
            </div>
          </div>
          <button 
                onClick={() => {
                  if (moduleType === 'Infant') {
                    if (tempChildInfo.ageDays === '') {
                      alert('कृपया बच्चाको उमेर (दिनमा) भर्नुहोस्।');
                      return;
                    }
                    const ageDays = Number(tempChildInfo.ageDays);
                    if (ageDays < 0 || ageDays > 59) {
                      alert('कृपया ० देखि ५९ दिन सम्मको उमेर भर्नुहोस्।');
                      return;
                    }
                  } else {
                    if (tempChildInfo.ageMonths === '') {
                      alert('कृपया बच्चाको उमेर (महिनामा) भर्नुहोस्।');
                      return;
                    }
                    const ageMonths = Number(tempChildInfo.ageMonths);
                    if (ageMonths < 2 || ageMonths > 59) {
                      alert('कृपया २ देखि ५९ महिना सम्मको उमेर भर्नुहोस्।');
                      return;
                    }
                  }
                  
                  const ageDaysVal = tempChildInfo.ageDays === '' ? 0 : Number(tempChildInfo.ageDays);
                  const ageMonthsVal = tempChildInfo.ageMonths === '' ? 0 : Number(tempChildInfo.ageMonths);

                  const dummyPatient: any = {
                      id: 'temp-' + Date.now(),
                      uniquePatientId: 'TEMP-' + Date.now().toString().slice(-6),
                      registrationNumber: 'TEMP',
                      date: new NepaliDate().format('YYYY-MM-DD'),
                      name: 'अस्थायी बिरामी',
                      age: moduleType === 'Infant' ? `${ageDaysVal} दिन` : `${ageMonthsVal} महिना`,
                      ageMonths: moduleType === 'Infant' ? 0 : ageMonthsVal,
                      ageDays: moduleType === 'Infant' ? ageDaysVal : 0,
                      gender: tempChildInfo.gender,
                      address: 'नखुलेको',
                      phone: '',
                      serviceType: 'CBIMNCI',
                      visitType: 'New',
                      fiscalYear: currentFiscalYear
                  };
                  selectPatient(dummyPatient, true);
                  setAssessmentData({
                    ...assessmentData, 
                    weight: tempChildInfo.weight.toString(), 
                    height: tempChildInfo.height.toString(), 
                    gender: tempChildInfo.gender,
                    measurementMethod: tempChildInfo.measurementMethod
                  });
                  setViewMode('search'); 
                }}
                className="bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 font-medium shadow-sm text-sm mt-4"
              >
                परीक्षण सुरू गर्नुहोस्
              </button>
            </div>
          ) : viewMode === 'selection' && canDirectEntry ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 p-4 md:p-8 bg-slate-100 rounded-3xl border border-slate-200">
              <button 
                onClick={() => { 
                  setModuleType('Infant'); 
                  setViewMode('entry');
                  setTempChildInfo({ ageMonths: '', ageWeeks: '', ageDays: '', weight: '', height: '', gender: 'Male', measurementMethod: 'Automatic' });
                }}
                className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border-2 md:border-4 border-blue-400 hover:border-blue-600 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-xl md:shadow-2xl transition-all transform hover:scale-105"
              >
                <div className="bg-blue-500 p-4 md:p-6 rounded-2xl md:rounded-3xl text-white shadow-inner">
                  <Baby className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <h3 className="text-xl md:text-3xl font-black text-blue-900 font-nepali text-center md:text-left">२ महिना मुनिका बच्चा</h3>
              </button>
              <button 
                onClick={() => { 
                  setModuleType('Child'); 
                  setViewMode('entry');
                  setTempChildInfo({ ageMonths: '', ageWeeks: '', ageDays: '', weight: '', height: '', gender: 'Male', measurementMethod: 'Automatic' });
                }}
                className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border-2 md:border-4 border-green-400 hover:border-green-600 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-xl md:shadow-2xl transition-all transform hover:scale-105"
              >
                <div className="bg-green-500 p-4 md:p-6 rounded-2xl md:rounded-3xl text-white shadow-inner">
                  <User className="w-12 h-12 md:w-16 md:h-16" />
                </div>
                <h3 className="text-xl md:text-3xl font-black text-green-900 font-nepali text-center md:text-left">२ महिनादेखि ५ वर्षसम्म</h3>
              </button>
            </div>
          ) : canSearch ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">नयाँ बिरामी खोज्नुहोस् (New Patient Search)</label>
                  <form onSubmit={handleSearch} className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="ID, नाम वा दर्ता नं."
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <button type="submit" className="bg-primary-600 text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 font-medium shadow-sm text-sm">
                      खोज्नुहोस्
                    </button>

                    {showSearchResults && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Results ({searchResults.length})</span>
                          <button onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={14} /></button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {searchResults.map(patient => (
                            <div 
                              key={patient.id} 
                              onClick={() => {
                                selectPatient(patient);
                                setShowSearchResults(false);
                              }}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                            >
                              <p className="font-bold text-slate-800 text-sm">{patient.name}</p>
                              <p className="text-[10px] text-slate-500">{patient.uniquePatientId} | {patient.age}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </form>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">रेकर्ड भएका बिरामी खोज्नुहोस् (Existing Record Search)</label>
                  <form onSubmit={handleExistingSearch} className="flex gap-2 relative">
                      <div className="flex-1 relative">
                        <History className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          value={existingSearchId}
                          onChange={(e) => setExistingSearchId(e.target.value)}
                          placeholder="रेकर्ड भएको नाम वा ID"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <button type="submit" className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium shadow-sm text-sm">
                        खोज्नुहोस्
                      </button>
                  </form>
                </div>
              </div>

              {patientsOnQueue.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                      पर्खिरहेका बिरामीहरू (Patients on Queue): {patientsOnQueue.length}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isMuted 
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={isMuted ? "Unmute voice announcement" : "Mute voice announcement"}
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      <span>{isMuted ? "आवाज म्युट छ" : "आवाज अनम्युट छ"}</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patientsOnQueue.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => selectPatient(patient)}
                        className="flex items-center gap-2 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold border border-primary-200 transition-all cursor-pointer animate-in zoom-in-95"
                      >
                        <User size={14} />
                        <span>{patient.name} ({patient.uniquePatientId})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-nepali text-lg">तपाईंलाई यो सेवा वा कार्यको लागि अनुमति छैन।</p>
            </div>
          )}
        </div>
      )}

      {!currentPatient && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <History size={18} /> भर्खरैका रेकर्डहरू (Recent Records)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">मिति</th>
                  <th className="p-3">बिरामीको नाम</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">वर्गीकरण</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cbimnciRecords.length > 0 ? (
                  cbimnciRecords
                    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                    .slice(0, 10)
                    .map(record => {
                      const patient = serviceSeekerRecords.find(p => p.uniquePatientId === record.uniquePatientId);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-3 font-medium text-primary-600">{record.visitDate}</td>
                          <td className="p-3 font-bold text-slate-800">{patient?.name || 'Unknown'}</td>
                          <td className="p-3 font-mono text-xs">{record.uniquePatientId}</td>
                          <td className="p-3">{record.diagnosis || '-'}</td>
                          <td className="p-3">
                            <button 
                              onClick={() => {
                                if (window.confirm('के तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                                  onDeleteRecord(record.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">कुनै रेकर्ड भेटिएन</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentPatient && (
        <div className="space-y-4">
          {!isDirectEntry && (
            <button onClick={() => { setCurrentPatient(null); resetForm(); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm no-print mb-2 font-nepali">
              <ArrowLeft size={16} /> फिर्ता (Back)
            </button>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!isDirectEntry && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                  <User size={18} /> बिरामीको विवरण
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">नाम:</span> <span className="font-medium">{currentPatient.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ID:</span> <span className="font-mono bg-slate-100 px-2 rounded">{currentPatient.uniquePatientId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">उमेर/लिङ्ग:</span> <span>{currentPatient.age} / {currentPatient.gender}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ठेगाना:</span> <span>{currentPatient.address}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">फोन:</span> <span>{currentPatient.phone}</span></div>
                </div>
              </div>

              {/* History Section */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                  <History size={18} /> उपचार इतिहास (History)
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {cbimnciRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId).length > 0 ? (
                    cbimnciRecords
                      .filter(r => r.uniquePatientId === currentPatient.uniquePatientId)
                      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                      .map(record => (
                        <div key={record.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary-300 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-xs font-bold text-primary-600">{record.visitDate}</p>
                              <p className="text-sm font-bold text-slate-800">{record.diagnosis || 'No Classification'}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => selectRecordForEdit(record)}
                                className="p-1.5 text-primary-500 hover:bg-primary-50 rounded-lg"
                                title="Edit Record"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('के तपाईं यो रेकर्ड हटाउन चाहनुहुन्छ?')) {
                                    onDeleteRecord(record.id);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Delete Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                            {record.chiefComplaints || 'No complaints recorded'}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 italic text-sm">
                      कुनै इतिहास भेटिएन
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`${isDirectEntry ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6`}>
            {isDirectEntry && (
              <button 
                onClick={() => { setCurrentPatient(null); resetForm(); setViewMode('selection'); }} 
                className="text-primary-600 hover:text-primary-800 flex items-center gap-1 mb-2 font-bold"
              >
                  <ArrowLeft size={16} /> फिर्ता (Back)
              </button>
            )}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50/50">
                <button
                  onClick={() => setActiveTab('assessment')}
                  className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'assessment'
                      ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Baby size={18} /> परीक्षण फारम (Assessment)
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'reports'
                      ? 'bg-white text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText size={18} /> रिपोर्टहरू (Reports)
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'assessment' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="font-bold text-slate-800 text-lg">CBIMNCI परीक्षण फारम</h3>
                      <div className="flex items-center gap-2">
                        {moduleType === 'Infant' ? (
                          <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-md">
                            Infant (up to 2m)
                          </div>
                        ) : (
                          <div className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white shadow-md">
                            Child (2m - 5y)
                          </div>
                        )}
                        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full ml-2">
                          {new NepaliDate().format('YYYY-MM-DD')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <div className="flex-1">
                          <h4 className="font-bold text-indigo-800 text-sm mb-1 flex items-center gap-2">
                            <Baby size={16} /> तौल (Weight in kg)
                          </h4>
                          <p className="text-xs text-indigo-600">औषधिको मात्रा (Dose) हिसाब गर्न तौल अनिवार्य छ।</p>
                        </div>
                        <div className="w-48">
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="तौल (kg) राख्नुहोस्"
                            value={assessmentData.weight || ''} 
                            onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} 
                            className="w-full px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-bold text-indigo-900"
                          />
                        </div>
                      </div>

                      {renderAssessmentForm()}

                      {suggestedClassifications.length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Suggested Classifications (Booklet Based)</h4>
                          <div className="flex flex-wrap gap-2">
                            {suggestedClassifications.map((cls, idx) => (
                              <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                cls.includes('Severe') || cls.includes('PSBI') || cls.includes('Disease') || cls.includes('CONFIRMED') || cls.includes('ब्याक्टेरियाको सम्भावित गम्भीर संक्रमण') || cls.includes('Very Low Birth Weight') || cls.includes('Mastoiditis') || cls.includes('Very Low Weight') || cls.includes('कडा जटिल दादुरा') || cls.includes('धेरै कडा ज्वरोजन्य रोग वा कडा जटिल औलो') || cls.includes('अति कडा ज्वरो') || cls.includes('धेरै कडा ज्वरो')
                                  ? 'bg-red-100 text-red-700 border-red-200' 
                                  : cls.includes('Some') || (cls.includes('Pneumonia') && !cls.includes('No Pneumonia')) || cls.includes('Jaundice') || ((cls.includes('Anemia') || cls.includes('Anaemia')) && !cls.includes('NO')) || cls.includes('POSSIBLE') || cls.includes('LATENT') || cls.includes('EXPOSED') || cls.includes('SUSPECTED') || cls.includes('REQUIRED') || cls.includes('Local Bacterial Infection') || cls.includes('Low Birth Weight') || (cls.includes('Ear Infection') && !cls.includes('No Ear Infection')) || (cls.includes('Feeding Problem') && !cls.includes('No Feeding Problem')) || cls.includes('Low Weight') || cls.includes('Persistent Diarrhea') || cls.includes('Dysentery') || cls.includes('को जटिलता सहितको दादुरा') || cls.includes('औलो (Malaria)') || cls.includes('Falciparum Malaria') || cls.includes('फ्याल्सिपेरम नभएको औलो') || cls.includes('मलक्षिया (Malaria)') || cls.includes('Measles with Eye/Mouth Complications')
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}>
                                {cls}
                              </span>
                            ))}
                          </div>
                          {suggestedNextVisit && (
                            <p className="mt-2 text-xs text-slate-600">
                              <span className="font-bold">Suggested Follow-up:</span> {suggestedNextVisit}
                            </p>
                          )}
                          {suggestedTreatments.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested Treatment:</p>
                              {suggestedTreatments.map((t, idx) => {
                                const isLowBloodSugar = t.includes('Prevent low blood sugar') || t.includes('रगतमा चिनीको मात्रा कम हुन नदिन');
                                const isChloroquine = t.includes('भाइभेक्सको क्लोरोक्विन द्वारा उपचार गर्नुहोस्');
                                const isACT = t.includes('ACT');
                                const isArtesunate = t.includes('आर्टेसुनेट');
                                return (
                                  <div key={idx} className="text-xs text-slate-700 flex items-start gap-1">
                                    <span className="text-primary-500">•</span> 
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (isLowBloodSugar) setShowLowBloodSugarModal(true);
                                        if (isChloroquine) setShowChloroquineModal(true);
                                        if (isACT) setShowACTModal(true);
                                        if (isArtesunate) setShowArtesunateModal(true);
                                      }}
                                      className={`${(isLowBloodSugar || isChloroquine || isACT || isArtesunate) ? "cursor-pointer hover:text-indigo-600 border-b border-dotted border-slate-400 font-medium text-left" : "text-left pointer-events-none"}`}
                                    >
                                      {t}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button 
                              onClick={() => setCbimnciData({...cbimnciData, diagnosis: suggestedClassifications.join(', ')})}
                              className="text-xs bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                            >
                              Apply to Classification
                            </button>
                            <button 
                              onClick={() => {
                                const newItems = suggestedTreatments.map((t, idx) => {
                                  let medicineName = t;
                                  let dosage = '';
                                  let duration = '';

                                  if (t.includes(':')) {
                                    const parts = t.split(':');
                                    const leftPart = parts[0].replace('Give ', '').trim();
                                    dosage = parts[1].trim();
                                    
                                    if (leftPart.includes(' for ')) {
                                      const subParts = leftPart.split(' for ');
                                      medicineName = subParts[0].trim();
                                      duration = subParts[1].trim();
                                    } else {
                                      medicineName = leftPart;
                                    }
                                  } else if (t.startsWith('Give ')) {
                                    medicineName = t.replace('Give ', '').trim();
                                  }

                                  return {
                                    id: `suggested-${Date.now()}-${idx}`,
                                    medicineName,
                                    dosage,
                                    frequency: dosage.includes('twice daily') ? '2 times a day' : (dosage.includes('once daily') ? '1 time a day' : ''),
                                    duration,
                                    instructions: ''
                                  };
                                });
                                setPrescriptionItems([...prescriptionItems, ...newItems]);
                              }}
                              className="text-xs bg-white border border-primary-300 text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                            >
                              Apply to Prescription
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                        <textarea
                          value={cbimnciData.chiefComplaints || ''}
                          onChange={(e) => setCbimnciData({...cbimnciData, chiefComplaints: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                          placeholder="बिरामीको मुख्य समस्याहरू लेख्नुहोस्..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">वर्गीकरण (Classification)</label>
                          <textarea
                            value={cbimnciData.diagnosis || ''}
                            onChange={(e) => setCbimnciData({...cbimnciData, diagnosis: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                            placeholder="वर्गीकरण लेख्नुहोस्..."
                          />
                        </div>
                        <div className="relative">
                          <label className="block text-sm font-medium text-slate-700 mb-2">जाँच (Investigation)</label>
                          <div className="relative mb-2">
                             <input
                               type="text"
                               value={investigationSearch}
                               onChange={(e) => {
                                 setInvestigationSearch(e.target.value);
                                 setShowInvestigationResults(true);
                               }}
                               placeholder="Search Service..."
                               className="w-full p-2 pl-8 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                             />
                             <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                             {showInvestigationResults && investigationSearch && (
                               <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                                 {filteredServices.map(service => (
                                   <div 
                                     key={service.id}
                                     onClick={() => handleAddInvestigation(service.serviceName)}
                                     className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                   >
                                     {service.serviceName}
                                   </div>
                                 ))}
                               </div>
                             )}
                          </div>
                          <textarea
                            value={cbimnciData.investigation || ''}
                            onChange={(e) => setCbimnciData({...cbimnciData, investigation: e.target.value})}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                          />
                        </div>
                      </div>

                      <div className="border rounded-xl p-4 bg-slate-50">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <Pill size={18} className="text-primary-600" /> औषधि सिफारिस (Prescription)
                          </h4>
                          <button 
                            onClick={() => setShowPrescriptionForm(true)}
                            className="text-sm bg-white border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 flex items-center gap-1 shadow-sm"
                          >
                            <Plus size={16} /> औषधि थप्नुहोस्
                          </button>
                        </div>

                        {showPrescriptionForm && (
                          <div className="bg-white p-4 rounded-lg border border-primary-100 mb-4 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="relative">
                                <Input 
                                  label="औषधिको नाम" 
                                  value={currentPrescription.medicineName} 
                                  onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})} 
                                  list="medicine-list"
                                />
                                <datalist id="medicine-list">
                                  {medicineSuggestions.map((med, idx) => (
                                    <option key={idx} value={med} />
                                  ))}
                                </datalist>
                              </div>
                              <div>
                                <Input label="मात्रा (Dosage)" value={currentPrescription.dosage} onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})} list="dosage-list" />
                                <datalist id="dosage-list">
                                  {dosageSuggestions.map((d, i) => <option key={i} value={d} />)}
                                </datalist>
                              </div>
                              <div>
                                <Input label="पटक (Frequency)" value={currentPrescription.frequency} onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})} list="frequency-list" />
                                <datalist id="frequency-list">
                                  {frequencySuggestions.map((f, i) => <option key={i} value={f} />)}
                                </datalist>
                              </div>
                              <Input label="अवधि (Duration)" value={currentPrescription.duration} onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setShowPrescriptionForm(false)} className="px-4 py-2 text-slate-500 rounded-lg text-sm">रद्द</button>
                              <button onClick={handleAddPrescription} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">थप्नुहोस्</button>
                            </div>
                          </div>
                        )}

                        {prescriptionItems.length > 0 && (
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                  <th className="p-3">औषधि</th>
                                  <th className="p-3">मात्रा</th>
                                  <th className="p-3">पटक</th>
                                  <th className="p-3">अवधि</th>
                                  <th className="p-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {prescriptionItems.map((item) => (
                                  <tr key={item.id}>
                                    <td className="p-3 font-medium">{item.medicineName}</td>
                                    <td className="p-3">{item.dosage}</td>
                                    <td className="p-3">{item.frequency}</td>
                                    <td className="p-3">{item.duration}</td>
                                    <td className="p-3">
                                      <button onClick={() => handleRemovePrescription(item.id)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">सल्लाह / सुझाव (Advice)</label>
                        <textarea
                          value={cbimnciData.advice || ''}
                          onChange={(e) => setCbimnciData({...cbimnciData, advice: e.target.value})}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[60px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="isRefer"
                            checked={cbimnciData.isRefer}
                            onChange={(e) => setCbimnciData({...cbimnciData, isRefer: e.target.checked})}
                            className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                          />
                          <label htmlFor="isRefer" className="text-sm font-bold text-slate-700 cursor-pointer">रेफर गरिएको (Referral)</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="isDeath"
                            checked={cbimnciData.isDeath}
                            onChange={(e) => setCbimnciData({...cbimnciData, isDeath: e.target.checked})}
                            className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                          />
                          <label htmlFor="isDeath" className="text-sm font-bold text-red-700 cursor-pointer">मृत्यु भएको (Death)</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            id="isFollowup"
                            checked={cbimnciData.isFollowup}
                            onChange={(e) => setCbimnciData({...cbimnciData, isFollowup: e.target.checked})}
                            className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                          />
                          <label htmlFor="isFollowup" className="text-sm font-bold text-amber-700 cursor-pointer">फलोअप (Followup)</label>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">फलोअप (Follow-up Days)</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={cbimnciData.followupDays || ''}
                              onChange={(e) => setCbimnciData({...cbimnciData, followupDays: parseInt(e.target.value) || 0})}
                              className="w-20 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                              placeholder="दिन"
                            />
                            <span className="text-xs text-slate-500 font-bold">दिन पछि</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-4 pt-4 border-t">
                        {!isDirectEntry && (
                          <button onClick={handleRestore} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-2 shadow-sm font-medium border border-amber-200 w-full sm:w-auto justify-center">
                            <History size={18} /> Restore Previous
                          </button>
                        )}
                        <button onClick={() => {
                          setEditingRecordId(null);
                          setCbimnciData({
                            chiefComplaints: '',
                            diagnosis: '',
                            investigation: '',
                            prescriptions: [],
                            advice: '',
                            nextVisitDate: '',
                            isRefer: false,
                            isDeath: false,
                            isFollowup: false,
                            followupDays: 0
                          });
                          setAssessmentData({
                            dangerSigns: [],
                            localInfection: [],
                            jaundiceSigns: [],
                            dehydrationSigns: [],
                            feedingProblems: [],
                            generalDangerSigns: [],
                            respiratorySigns: [],
                            feverSigns: [],
                            nutritionSigns: [],
                            immunization: [],
                            breathingRate: '',
                            temperature: '',
                            diarrheaDays: '',
                            weight: '',
                            muac: '',
                            coughDays: '',
                            feverDays: '',
                            earDischargeDays: '',
                            malariaRisk: 'None',
                            pallor: '',
                            attachment: '',
                            suckling: '',
                            earPain: false,
                            earDischarge: false,
                            mastoidSwelling: false,
                            bloodInStool: false,
                            hivStatus: false,
                            parotidSwellingOrLymphNodes: false,
                            hivTestStatus: '',
                            motherHivStatus: '',
                            isBreastfeeding: false,
                            stoppedBreastfeedingLessThan3Months: false,
                            tbContact: false,
                            tbSymptoms: [],
                            tbDiagnosis: false,
                            weightLoss: false,
                            fatigue: false
                          });
                          setPrescriptionItems([]);
                          setIsDirectEntry(false);
                        }} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-2 shadow-sm font-medium border border-slate-200 w-full sm:w-auto justify-center">
                          <Trash2 size={18} /> Clear Form
                        </button>
                        {!isDirectEntry && (
                          <button onClick={handlePrint} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center">
                            <Printer size={18} /> प्रिन्ट (Print)
                          </button>
                        )}
                        {!isDirectEntry && currentUser?.hasSaveAccess !== false && (
                          <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium w-full sm:w-auto justify-center">
                            <Save size={18} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                          </button>
                        )}
                        {isDirectEntry && currentUser?.hasSaveAccess !== false && (
                           <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium w-full sm:w-auto justify-center">
                            <Save size={18} /> सुरक्षित गर्नुहोस्
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    {/* Recommended Investigations Section */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 mb-6">
                      <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-3 border-b border-amber-100 pb-2 uppercase">
                        <Stethoscope size={16} /> सिफारिस गरिएका जाँचहरू (Recommended Investigations)
                      </h3>
                      <div className="space-y-3">
                        {cbimnciRecords
                          .filter(r => r.uniquePatientId === currentPatient.uniquePatientId && r.investigation)
                          .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
                          .map(record => (
                            <div key={record.id} className="flex justify-between items-start bg-white p-3 rounded-lg border border-amber-200 shadow-sm">
                              <div>
                                <p className="text-xs font-bold text-amber-600 mb-1">{record.visitDate}</p>
                                <p className="text-sm font-medium text-slate-800">{record.investigation}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {labReports.some(lr => 
                                  lr.serviceSeekerId === currentPatient.id && 
                                  lr.reportDate >= record.visitDate
                                ) ? (
                                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Report Available
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                    Pending Result
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        {cbimnciRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId && r.investigation).length === 0 && (
                          <p className="text-xs text-slate-400 italic text-center py-2">कुनै सिफारिस गरिएको जाँच भेटिएन</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <FileText className="text-indigo-600" /> प्रयोगशाला रिपोर्टहरू (Laboratory Reports)
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {labReports.filter(r => r.serviceSeekerId === currentPatient.id).length > 0 ? (
                        labReports
                          .filter(r => r.serviceSeekerId === currentPatient.id)
                          .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
                          .map(report => (
                            <div key={report.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-300 transition-all">
                              <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <FileText size={18} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Report Date</p>
                                    <p className="text-sm font-bold text-slate-800">{report.reportDate}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Invoice #</p>
                                    <p className="text-sm font-mono text-indigo-600">{report.invoiceNumber}</p>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setTimeout(() => handlePrintReport(), 100);
                                    }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 text-xs font-bold border border-indigo-100"
                                  >
                                    <Printer size={14} /> Print
                                  </button>
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {report.tests.map((test, idx) => (
                                    <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-slate-700">{test.testName}</span>
                                        <span className="text-sm font-bold text-indigo-700">{test.result} {test.unit}</span>
                                      </div>
                                      {test.normalRange && (
                                        <p className="text-[10px] text-slate-500 italic">Range: {test.normalRange}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {report.remarks && (
                                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <p className="text-xs font-bold text-amber-800 uppercase mb-1">Remarks</p>
                                    <p className="text-sm text-amber-900 italic">{report.remarks}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                          <p className="text-slate-500 font-medium">कुनै प्रयोगशाला रिपोर्ट भेटिएन (No laboratory reports found)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="absolute -top-[9999px] left-0">
        <div ref={printRef} className="p-0 bg-white text-slate-900 print:block">
          {currentPatient && (
            <PrescriptionPrint 
              record={currentPatient} 
              generalSettings={generalSettings}
              cbimnciRecord={{
                id: editingRecordId || 'new',
                fiscalYear: '',
                serviceSeekerId: currentPatient.id,
                uniquePatientId: currentPatient.uniquePatientId,
                visitDate: new NepaliDate().format('YYYY-MM-DD'),
                moduleType: moduleType,
                assessmentData: assessmentData,
                chiefComplaints: cbimnciData.chiefComplaints,
                diagnosis: cbimnciData.diagnosis,
                investigation: cbimnciData.investigation,
                prescriptions: prescriptionItems,
                advice: cbimnciData.advice,
                nextVisitDate: cbimnciData.nextVisitDate
              }}
            />
          )}
        </div>
      </div>
      {/* Hidden Print Template for Reports */}
      <div style={{ display: 'none' }}>
        <div ref={reportPrintRef} className="p-8 bg-white text-slate-900 print:block font-nepali">
          {selectedReport && (
            <div>
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
                    <h1 className="text-2xl font-black text-slate-900 mb-1">{generalSettings?.orgNameNepali || currentUser?.organizationName || ''}</h1>
                    <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali || ''}</p>
                    <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali2 || ''}</p>
                    <p className="text-sm font-bold text-slate-700 mb-0.5">{generalSettings?.subTitleNepali3 || ''}</p>
                    <p className="text-xs font-bold text-slate-600 mb-0.5">{generalSettings?.subTitleNepali4 || ''}</p>
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
                  <h2 className="text-lg font-bold border-2 border-slate-800 inline-block px-6 py-1 rounded-md uppercase tracking-wider">Laboratory Report</h2>
                </div>
              </div>

              <div className="flex justify-between mt-4 text-sm mb-4">
                <span>Date: {selectedReport.reportDate}</span>
                <span>Invoice: {selectedReport.invoiceNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-y-2 mb-6 text-sm border p-4 rounded-lg">
                <div><span className="font-bold">Patient Name:</span> {currentPatient?.name}</div>
                <div><span className="font-bold">Age/Sex:</span> {currentPatient?.age} / {currentPatient?.gender}</div>
                <div><span className="font-bold">Patient ID:</span> {currentPatient?.uniquePatientId}</div>
                <div><span className="font-bold">Address:</span> {currentPatient?.address}</div>
              </div>

              <table className="w-full text-sm border-collapse border border-slate-400">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-400 p-2 text-left">Test Name</th>
                    <th className="border border-slate-400 p-2 text-center">Result</th>
                    <th className="border border-slate-400 p-2 text-center">Unit</th>
                    <th className="border border-slate-400 p-2 text-center">Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.tests.map((test: any, i: number) => (
                    <tr key={i}>
                      <td className="border border-slate-400 p-2">{test.testName}</td>
                      <td className="border border-slate-400 p-2 text-center font-bold">{test.result}</td>
                      <td className="border border-slate-400 p-2 text-center">{test.unit}</td>
                      <td className="border border-slate-400 p-2 text-center">{test.normalRange || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedReport.remarks && (
                <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Remarks:</p>
                  <p className="text-sm italic">{selectedReport.remarks}</p>
                </div>
              )}

              <div className="mt-20 flex justify-between items-end px-4">
                <div className="text-center">
                  <div className="w-32 border-t border-slate-400 mb-1"></div>
                  <p className="text-xs font-bold">Lab Technician</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-t border-slate-400 mb-1"></div>
                  <p className="text-xs font-bold">Authorized Signature</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLowBloodSugarModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                रगतमा चिनीको मात्रा (Low Blood Sugar)
              </h3>
              <button 
                onClick={() => setShowLowBloodSugarModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                type="button"
              >
                <Plus className="w-6 h-6 rotate-45 text-slate-500" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto leading-relaxed text-sm text-slate-600 font-nepali">
              रगतमा चिनीको मात्रा कम हुनबाट जोगाउन उपचार गर्नुहोस्:
              <ul className="mt-4 space-y-3">
                <li className="flex gap-2">
                  <span className="font-bold text-primary-600">१)</span> 
                  यदि बच्चाले आमाको स्तनपान गर्न सक्छ भने बच्चालाई स्तनपान गराउन भन्नुहोस्।
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-600">२)</span> 
                  यदि बच्चाले स्तनपान गर्न सक्दैन तर निल्न सम्म सक्छ भने ६ महिना सम्मको शिशुको लागि आमाको दूध निचोरेर वा गाई बस्तुको दूध खान दिनुहोस् यस्तो कुनै पनि चिज पाइदैन भने चिनी पानी खान दिनुहोस्।
                </li>
                <li className="bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                  उपचार केन्द्रबाट जानु अघि ३०-५० मिली दूध वा चिनी पानी खान दिनुहोस्। चिनी पानी बनाउन २०० मिली सफा पानीमा ४ चिया चम्चा (२० ग्राम) चिनी घोल्नुहोस्।
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-600">३)</span> 
                  यदि बच्चाले निल्न पनि सक्दैन भने यदि तपाईं तालिम प्राप्त हुनुहुन्छ भने ५० मिली दूध वा चिनी पानी NG tube द्वारा दिनुहोस् (शिशुको लागि ५ मिली/केजी)।
                </li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowLowBloodSugarModal(false)}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all text-sm shadow-md"
                type="button"
              >
                Close / बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {showChloroquineModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-blue-50">
              <h3 className="font-bold text-blue-900 flex items-center gap-2 uppercase tracking-tight">
                <Pill className="w-5 h-5 text-blue-600" />
                ग. Chloroquine Dose Table for P. Vivax Malaria
              </h3>
              <button 
                onClick={() => setShowChloroquineModal(false)}
                className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                type="button"
              >
                <Plus className="w-6 h-6 rotate-45 text-blue-500" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto leading-tight text-xs text-slate-800 font-nepali">
              <p className="font-bold text-slate-700 mb-4">बच्चालाई P. Vivax Malaria भएमा Chloroquine को मात्रा (Dose of Chloroquine by age group):</p>
              
              <div className="grid grid-cols-5 gap-0 border border-slate-300 mb-6 shadow-sm overflow-hidden rounded-lg">
                <div className="bg-slate-100 p-2 border-r border-b border-slate-300 font-bold">दिन</div>
                <div className="bg-slate-100 p-2 border-r border-b border-slate-300 font-bold col-span-2 text-center">४-१० किलो (१ वर्ष मुनि)</div>
                <div className="bg-slate-100 p-2 border-b border-slate-300 font-bold col-span-2 text-center">१० किलो भन्दा माथि (१-५ वर्ष)</div>
                
                <div className="p-3 border-r border-b border-slate-300 font-bold">१ र २</div>
                <div className="p-3 border-r border-b border-slate-300 col-span-2 text-center font-bold text-lg bg-indigo-50/30 text-indigo-700">०.५ चक्की (१५०मिग्रा)</div>
                <div className="p-3 border-b border-slate-300 col-span-2 text-center text-blue-700 font-bold text-lg bg-blue-50/30">१ चक्की (१-४ वर्ष) / २ चक्की (४-५ वर्ष)</div>
                
                <div className="p-3 border-r border-slate-300 font-bold">३</div>
                <div className="p-3 border-r border-slate-300 col-span-2 text-center font-bold text-lg text-indigo-600">०.५ चक्की (१५०मिग्रा)</div>
                <div className="p-3 col-span-2 text-center text-blue-600 font-bold text-lg">०.५ चक्की (१-४ वर्ष) / १ चक्की (४-५ वर्ष)</div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6 italic text-sm text-blue-800 flex items-start gap-3">
                <div className="bg-blue-200 p-1 rounded-full"><History className="w-4 h-4" /></div>
                <span>* Chloroquine चक्की ३ दिन सम्म खुवाउने (पहेलो र दोस्रो दिन १० मिग्रा/के.जी र तेस्रो दिन ५ मिग्रा/के.जी)</span>
              </div>

              <p className="font-bold text-slate-700 mb-4 text-sm underline underline-offset-4 decoration-indigo-200">साना नानीहरूलाई Chloroquine Syrup (भोल औषधी):</p>
              <div className="grid grid-cols-4 gap-0 border border-slate-300 mb-6 shadow-sm overflow-hidden rounded-lg">
                <div className="bg-slate-50 p-2 border-r border-b border-slate-300 font-bold">दिन</div>
                <div className="bg-slate-50 p-2 border-r border-b border-slate-300 font-bold text-center">४ किलो मुनि</div>
                <div className="bg-slate-50 p-2 border-r border-b border-slate-300 font-bold text-center">४-१० किलो</div>
                <div className="bg-slate-50 p-2 border-b border-slate-300 font-bold text-center">१० किलो+</div>
                
                <div className="p-3 border-r border-b border-slate-300 italic font-bold">१ र २</div>
                <div className="p-3 border-r border-b border-slate-300 text-center font-bold text-blue-600">५ मि.लि.</div>
                <div className="p-3 border-r border-b border-slate-300 text-center font-bold text-blue-600">७.५ मि.लि.</div>
                <div className="p-3 border-b border-slate-300 text-center font-bold text-blue-700">१५ मि.लि.</div>
                
                <div className="p-3 border-r border-slate-300 italic font-bold">३</div>
                <div className="p-3 border-r border-slate-300 text-center">५ मि.लि.</div>
                <div className="p-3 border-r border-slate-300 text-center">७.५ मि.लि.</div>
                <div className="p-3 border-slate-300 text-center font-bold">७.५ मि.लि.</div>
              </div>

              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <p className="font-bold text-slate-800 text-sm mb-1 uppercase tracking-wider text-[10px]">याद गर्नुहोस्:</p>
                <div className="flex gap-3 text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" /> 
                  <span>Chloroquine औषधी खाली पेटमा दिनुहुदैन। यो औषधि खाएपछि जिउ चिलाउने हुन सक्छ, तर त्यो खतरनाक चाहिँ हुदैन।</span>
                </div>
                <div className="flex gap-3 text-red-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" /> 
                  <span>Primaquine चक्की 0.25 mg/kg bw को दरले १४ दिन सम्म खुवाउने। ६ महिना भन्दा कम उमेरका बालबालिकालाई नखुवाउने।</span>
                </div>
                <div className="flex gap-3 text-indigo-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" /> 
                  <span>औषधी सेवन गरेको ३, ७ र १४ औं दिनमा विरामीको अनुगमन गर्ने।</span>
                </div>
                <div className="flex gap-3 font-bold text-slate-900 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" /> 
                  <span>यदि बच्चाले औषधी खुवाएको आधा घण्टा भित्र बान्ता गरेमा औषधी दोहोर्याएर खुवाउनु पर्दछ। थप औषधीको लागि उपचार केन्द्रमा आउनु पर्दछ।</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowChloroquineModal(false)}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-200"
                type="button"
              >
                Close / बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {showACTModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-green-50">
              <h3 className="font-bold text-green-900 flex items-center gap-2 uppercase tracking-tight">
                <Pill className="w-5 h-5 text-green-600" />
                ख. Uncomplicated Falciparum Malaria भएमा
              </h3>
              <button 
                onClick={() => setShowACTModal(false)}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                type="button"
              >
                <Plus className="w-6 h-6 rotate-45 text-green-500" />
              </button>
            </div>
            <div className="p-6 max-h-[85vh] overflow-y-auto leading-tight text-xs text-slate-800 font-nepali">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 mb-6 text-center shadow-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th rowSpan={3} className="border border-slate-300 p-2 font-bold">तौल (के.जी. मा)</th>
                      <th colSpan={3} className="border border-slate-300 p-2 font-bold">पहिलो दिन</th>
                      <th colSpan={2} className="border border-slate-300 p-2 font-bold">दोस्रो दिन</th>
                      <th colSpan={2} className="border border-slate-300 p-2 font-bold">तेस्रो दिन</th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th colSpan={2} className="border border-slate-300 p-1 font-bold">ACT</th>
                      <th className="border border-slate-300 p-1 font-bold">Primaquine</th>
                      <th colSpan={2} className="border border-slate-300 p-1 font-bold">ACT</th>
                      <th colSpan={2} className="border border-slate-300 p-1 font-bold">ACT</th>
                    </tr>
                    <tr className="bg-slate-50 text-[10px]">
                      <th className="border border-slate-300 p-1 font-bold">पहिलो मात्रा</th>
                      <th className="border border-slate-300 p-1 font-bold">८ घण्टा पछि</th>
                      <th className="border border-slate-300 p-1 font-bold text-red-600">पहिलो मात्रा</th>
                      <th className="border border-slate-300 p-1 font-bold">बिहान</th>
                      <th className="border border-slate-300 p-1 font-bold">राती</th>
                      <th className="border border-slate-300 p-1 font-bold">बिहान</th>
                      <th className="border border-slate-300 p-1 font-bold">राती</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-3 font-bold bg-slate-50">५ के.जी. भन्दा कम</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-red-600 bg-red-50/30">०.५ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                    </tr>
                    <tr className="bg-blue-50/10">
                      <td className="border border-slate-300 p-3 font-bold bg-slate-50">५ के.जी. देखि १५ के.जी. सम्म</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-red-600 bg-red-50/30">०.५ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                      <td className="border border-slate-300 p-3">१ चक्की</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-3 font-bold bg-slate-50">१५ देखि २५ के.जी.</td>
                      <td className="border border-slate-300 p-3 font-bold text-blue-700">२ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-blue-700">२ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-red-700 bg-red-50/30">१ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-blue-700">२ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-blue-700">२ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-blue-700">२ चक्की</td>
                      <td className="border border-slate-300 p-3 font-bold text-blue-700">२ चक्की</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6 font-bold text-slate-800">
                नोटे : ६ महिनाभन्दा कम उमेरका बालबालिकाहरूलाई Primaquine चक्की नखुवाउने। Primaquine चक्की खुवाउँदा 0.25 mg/kg bw को दरले १ दिन (पहिलो दिन) मात्र खुवाउने।
              </div>

              <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                <p className="font-bold text-red-800 text-sm mb-2 uppercase tracking-tight">यसको असर (Side Effects):</p>
                <p className="text-red-700">कान कराउने, रिंगटा लाग्ने, पेट गडबड हुने र बढि मात्रा हुन गएमा मुटु र रक्त नलीहरूमा असर हुन सक्छ।</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowACTModal(false)}
                className="px-8 py-2.5 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition-all text-sm shadow-lg shadow-green-200"
                type="button"
              >
                Close / बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {showArtesunateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 font-nepali">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-red-50">
              <h3 className="font-bold text-red-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-red-600" />
                क. Severe Complicated Malaria भएमा
              </h3>
              <button 
                onClick={() => setShowArtesunateModal(false)}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                type="button"
              >
                <Plus className="w-6 h-6 rotate-45 text-red-500" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto leading-relaxed text-sm text-slate-800">
              <div className="font-bold text-slate-800 mb-4 text-base">Artesunate Injection (IV/IM) तत्काल दिने:</div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>
                    <strong>२० के.जी. भन्दा कम तौल</strong> भएका बिरामीलाई <strong>3 mg/kg bw</strong> को आधारमा शुरुमा ०, ८ र २४ घण्टामा र मुखबाट औषधी खान नसकुञ्जेल दिने।
                  </span>
                </li>
                <li className="flex gap-3 items-start border-t border-slate-100 pt-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                  <span>
                    <strong>२० के.जी. भन्दा बढी तौल</strong> भएका बिरामीलाई <strong>2.4 mg/kg bw</strong> को आधारमा शुरुमा ०, ८ र २४ घण्टामा र मुखबाट औषधी खान नसकुञ्जेल दिने।
                  </span>
                </li>
              </ul>

              <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  पूर्व प्रेषण उपचार (Pre-referral Treatment):
                </div>
                <p className="text-amber-800">यदि बिरामी बच्चालाई अन्य स्वास्थ्य संस्थामा प्रेषण गर्नु पर्ने भएमा <strong>एक मात्रा IM Artesunate</strong> दिएपछि मात्र प्रेषण गर्ने।</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowArtesunateModal(false)}
                className="px-8 py-2.5 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 transition-all text-sm shadow-lg shadow-red-200"
                type="button"
              >
                Close / बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
