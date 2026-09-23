import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, Plus, Search, Printer, Trash2, Edit3, Save, 
  Users, DollarSign, CreditCard, Download, Eye, CheckCircle2, 
  AlertCircle, RefreshCw, ChevronRight, ArrowUpDown, Calendar,
  Building2, UserCheck, ShieldCheck, Copy, FileText, ArrowRight, X,
  Briefcase, Settings2, Sparkles
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { MonthlySalaryReceipt, SalaryEmployeeItem, EmployeeSalaryProfile, DesignationSalaryScale } from '../types/financeTypes';
import { OrganizationSettings, User } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { toNepaliNumber, parseNepaliNumber } from './nepaliUtils';
import { FISCAL_YEARS } from '../constants';
import { db } from '../firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { getDriverMonthlyIncentive, isAmbulanceDriver, DriverIncentiveResult } from '../lib/ambulanceIncentiveUtils';
import { sortUsersByHierarchy } from '../lib/userHierarchyUtils';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface TalabiBharpaiProps {
  currentFiscalYear: string;
  currentUser: User;
  allUsers: User[];
  users: User[];
  generalSettings: OrganizationSettings;
  salaryReceipts?: MonthlySalaryReceipt[];
  onSaveSalaryReceipt?: (receipt: MonthlySalaryReceipt) => void;
  onDeleteSalaryReceipt?: (id: string) => void;
  activeOrgName: string;
}

export const NEPALI_MONTHS = [
  { code: '04', name: 'साउन (Shrawan)', shortName: 'साउन', order: 1 },
  { code: '05', name: 'भदौ (Bhadra)', shortName: 'भदौ', order: 2 },
  { code: '06', name: 'असोज (Ashwin)', shortName: 'असोज', order: 3 },
  { code: '07', name: 'कात्तिक (Kartik)', shortName: 'कात्तिक', order: 4 },
  { code: '08', name: 'मंसिर (Mangsir)', shortName: 'मंसिर', order: 5 },
  { code: '09', name: 'पुस (Poush)', shortName: 'पुस', order: 6 },
  { code: '10', name: 'माघ (Magh)', shortName: 'माघ', order: 7 },
  { code: '11', name: 'फागुन (Falgun)', shortName: 'फागुन', order: 8 },
  { code: '12', name: 'चैत (Chaitra)', shortName: 'चैत', order: 9 },
  { code: '01', name: 'वैशाख (Baishakh)', shortName: 'वैशाख', order: 10 },
  { code: '02', name: 'जेठ (Jestha)', shortName: 'जेठ', order: 11 },
  { code: '03', name: 'असार (Ashadh)', shortName: 'असार', order: 12 },
];

export const SERVICE_TYPES = [
  { value: 'Permanent', label: 'स्थायी (Permanent)' },
  { value: 'Contract', label: 'करार (Contract)' },
  { value: 'Temporary', label: 'अस्थायी (Temporary)' },
  { value: 'DailyWages', label: 'ज्यालादारी (Daily Wages)' },
  { value: 'Other', label: 'अन्य (Other)' }
];

export const numberToNepaliWords = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return 'शून्य';
  
  const ones = [
    '', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दश',
    'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस', 'बीस',
    'एक्काइस', 'बाइस', 'तेइस', 'चौबिस', 'पच्चिस', 'छब्बीस', 'सत्ताइस', 'अट्ठाइस', 'उनन्तिस', 'तीस',
    'एकत्तिस', 'बत्तीस', 'तेत्तीस', 'चौंतीस', 'पैंतीस', 'छत्तिस', 'सैंतीस', 'अड्तीस', 'उनन्चालीस', 'चालीस',
    'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैंतालीस', 'छयालीस', 'सत्चालीस', 'अठचालीस', 'उनपचास', 'पचास',
    'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चौपन्न', 'पचपन्न', 'छपन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठ्ठी', 'साठ्ठी',
    'एकसट्ठी', 'बासट्ठी', 'त्रीसट्ठी', 'चौंसट्ठी', 'पैंसट्ठी', 'छयसट्ठी', 'सत्सट्ठी', 'अठसट्ठी', 'उनन्सत्तरी', 'सत्तरी',
    'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी', 'असी',
    'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे', 'नब्बे',
    'एकान्नब्बे', 'बयानब्बे', 'त्रियान्नब्बे', 'चौरान्नब्बे', 'पन्चान्नब्बे', 'छयान्नब्बे', 'सन्तान्नब्बे', 'अन्ठान्नब्बे', 'उनान्सय'
  ];

  const convertTwoDigits = (n: number): string => {
    if (n < 100) return ones[n];
    return '';
  };

  let integerPart = Math.floor(num);
  let paisa = Math.round((num - integerPart) * 100);

  let result = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;

  const hundred = Math.floor(integerPart / 100);
  const remaining = integerPart % 100;

  if (crore > 0) {
    result += `${convertTwoDigits(crore)} करोड `;
  }
  if (lakh > 0) {
    result += `${convertTwoDigits(lakh)} लाख `;
  }
  if (thousand > 0) {
    result += `${convertTwoDigits(thousand)} हजार `;
  }
  if (hundred > 0) {
    result += `${ones[hundred]} सय `;
  }
  if (remaining > 0) {
    result += `${convertTwoDigits(remaining)} `;
  }

  result = result.trim() + ' रुपैयाँ';

  if (paisa > 0) {
    result += ` ${convertTwoDigits(paisa)} पैसा`;
  }

  return result + ' मात्र';
};

export const TalabiBharpai: React.FC<TalabiBharpaiProps> = ({
  currentFiscalYear: initialFiscalYear,
  currentUser,
  allUsers = [],
  users = [],
  generalSettings,
  salaryReceipts: externalSalaryReceipts,
  onSaveSalaryReceipt,
  onDeleteSalaryReceipt,
  activeOrgName
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(initialFiscalYear || '2081/082');
  const [activeTab, setActiveTab] = useState<'monthly_bharpai' | 'annual_report' | 'salary_scales'>('monthly_bharpai');
  
  // Current Nepali Month default
  const defaultNepaliMonthCode = useMemo(() => {
    try {
      const np = new NepaliDate();
      const m = np.getMonth() + 1; // 1-12
      return m < 10 ? `0${m}` : `${m}`;
    } catch {
      return '04';
    }
  }, []);

  const [selectedMonthCode, setSelectedMonthCode] = useState<string>(defaultNepaliMonthCode);
  const [localSalaryReceipts, setLocalSalaryReceipts] = useState<MonthlySalaryReceipt[]>([]);
  const [employeeProfiles, setEmployeeProfiles] = useState<EmployeeSalaryProfile[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);

  // Active Receipt Form State
  const [currentReceiptDate, setCurrentReceiptDate] = useState<string>(() => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch {
      return '';
    }
  });
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [budgetHeadName, setBudgetHeadName] = useState<string>('२११११ - कर्मचारी पारिश्रमिक');
  const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'Cash' | 'Cheque'>('Bank');
  const [bankName, setBankName] = useState<string>('');
  const [chequeOrVoucherNo, setChequeOrVoucherNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Signatures
  const [preparedByName, setPreparedByName] = useState<string>(currentUser?.fullName || '');
  const [preparedByDesignation, setPreparedByDesignation] = useState<string>(currentUser?.designation || 'सहायक / कम्प्युटर अपरेटर');
  const [verifiedByName, setVerifiedByName] = useState<string>('');
  const [verifiedByDesignation, setVerifiedByDesignation] = useState<string>('लेखापाल / लेखा अधिकृत');
  const [approvedByName, setApprovedByName] = useState<string>('');
  const [approvedByDesignation, setApprovedByDesignation] = useState<string>('कार्यालय प्रमुख / स्वास्थ्य शाखा प्रमुख');

  // Employee Items in Current Month
  const [employeesList, setEmployeesList] = useState<SalaryEmployeeItem[]>([]);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [editingEmployeeItem, setEditingEmployeeItem] = useState<SalaryEmployeeItem | null>(null);
  const [selectedPaySlipEmployee, setSelectedPaySlipEmployee] = useState<SalaryEmployeeItem | null>(null);
  const [isPaySlipModalOpen, setIsPaySlipModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Employee Form State (for modal)
  const [empForm, setEmpForm] = useState<Partial<SalaryEmployeeItem>>({
    employeeName: '',
    designation: '',
    level: '',
    employeeCode: '',
    bankAccountNumber: '',
    bankName: '',
    panNumber: '',
    citNumber: '',
    pfNumber: '',
    serviceType: 'Permanent',
    basicScale: 0,
    gradeCount: 0,
    gradeRate: 0,
    gradeAmount: 0,
    totalBasicSalary: 0,
    dearnessAllowance: 2000,
    incentiveAllowance: 0,
    fieldAllowance: 0,
    dressAllowance: 0,
    medicalAllowance: 0,
    otherAllowances: 0,
    grossSalary: 0,
    providentFund: 0,
    citDeduction: 0,
    insuranceDeduction: 0,
    taxDeduction: 0,
    loanOrAdvanceDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    netPayable: 0,
    remarks: ''
  });

  // Debug & Audit info for ambulance driver incentive calculation in the modal
  const [driverIncentiveDebugInfo, setDriverIncentiveDebugInfo] = useState<{
    isDriver: boolean;
    tripCount: number;
    totalFare: number;
    incentiveAmount: number;
    percent: number;
    driverName: string;
    checked: boolean;
  } | null>(null);

  const effectiveOrgName = activeOrgName || currentUser?.organizationName || 'DefaultOrg';
  const safeOrgName = effectiveOrgName.trim().replace(/[.#$[\]]/g, "_");

  const [ambulanceRecords, setAmbulanceRecords] = useState<any[]>([]);
  const [salaryScales, setSalaryScales] = useState<DesignationSalaryScale[]>([]);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<DesignationSalaryScale | null>(null);
  const [scaleForm, setScaleForm] = useState<Partial<DesignationSalaryScale>>({
    designation: '',
    level: '',
    basicScale: 0,
    gradeRate: 0,
    dearnessAllowance: 2000,
    fieldAllowance: 0,
    dressAllowance: 0,
    remarks: ''
  });

  // Sync with Firebase Realtime Database
  useEffect(() => {
    setIsDbLoading(true);
    const receiptsRef = ref(db, `orgData/${safeOrgName}/salaryReceipts`);
    const profilesRef = ref(db, `orgData/${safeOrgName}/employeeSalaryProfiles`);
    const ambulanceRef = ref(db, `orgData/${safeOrgName}/ambulanceRecords`);
    const scalesRef = ref(db, `orgData/${safeOrgName}/designationSalaryScales`);

    const unsubReceipts = onValue(receiptsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: MonthlySalaryReceipt[] = Object.keys(data).map(k => ({ ...data[k], id: k }));
        setLocalSalaryReceipts(list);
      } else {
        setLocalSalaryReceipts([]);
      }
      setIsDbLoading(false);
    });

    const unsubProfiles = onValue(profilesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: EmployeeSalaryProfile[] = Object.keys(data).map(k => ({ ...data[k], id: k }));
        setEmployeeProfiles(list);
      } else {
        setEmployeeProfiles([]);
      }
    });

    const unsubAmbulance = onValue(ambulanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(k => ({ ...data[k], id: k }));
        setAmbulanceRecords(list);
      } else {
        setAmbulanceRecords([]);
      }
    });

    const unsubScales = onValue(scalesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: DesignationSalaryScale[] = Object.keys(data).map(k => ({ ...data[k], id: k }));
        setSalaryScales(list);
      } else {
        setSalaryScales([]);
      }
    });

    return () => {
      unsubReceipts();
      unsubProfiles();
      unsubAmbulance();
      unsubScales();
    };
  }, [safeOrgName]);

  // Merge external and local receipts if available
  const allSalaryReceipts = useMemo(() => {
    if (externalSalaryReceipts && externalSalaryReceipts.length > 0) {
      return externalSalaryReceipts;
    }
    return localSalaryReceipts;
  }, [externalSalaryReceipts, localSalaryReceipts]);

  // Current Month Receipt
  const currentMonthReceipt = useMemo(() => {
    return allSalaryReceipts.find(
      r => r.fiscalYear === selectedFiscalYear && r.month === selectedMonthCode
    );
  }, [allSalaryReceipts, selectedFiscalYear, selectedMonthCode]);

  // When changing Month or Fiscal Year, load existing receipt if found
  useEffect(() => {
    if (currentMonthReceipt) {
      setEmployeesList(currentMonthReceipt.employees || []);
      setCurrentReceiptDate(currentMonthReceipt.dateBs || new NepaliDate().format('YYYY-MM-DD'));
      setReceiptNumber(currentMonthReceipt.receiptNumber || '');
      setBudgetHeadName(currentMonthReceipt.budgetHeadName || '२११११ - कर्मचारी पारिश्रमिक');
      setPaymentMethod(currentMonthReceipt.paymentMethod || 'Bank');
      setBankName(currentMonthReceipt.bankName || '');
      setChequeOrVoucherNo(currentMonthReceipt.chequeOrVoucherNo || '');
      setNotes(currentMonthReceipt.notes || '');
      if (currentMonthReceipt.preparedBy) {
        setPreparedByName(currentMonthReceipt.preparedBy.name);
        setPreparedByDesignation(currentMonthReceipt.preparedBy.designation);
      }
      if (currentMonthReceipt.verifiedBy) {
        setVerifiedByName(currentMonthReceipt.verifiedBy.name);
        setVerifiedByDesignation(currentMonthReceipt.verifiedBy.designation);
      }
      if (currentMonthReceipt.approvedBy) {
        setApprovedByName(currentMonthReceipt.approvedBy.name);
        setApprovedByDesignation(currentMonthReceipt.approvedBy.designation);
      }
    } else {
      // Clear or start fresh with empty employee list or retain previous
      setEmployeesList([]);
      setReceiptNumber(`PAY-${selectedFiscalYear.replace(/[^0-9]/g, '')}-${selectedMonthCode}`);
      setNotes('');
    }
  }, [currentMonthReceipt, selectedFiscalYear, selectedMonthCode]);

  // Relevant Office Users for Quick Import (Sorted by Office Hierarchy)
  const relevantOfficeUsers = useMemo(() => {
    const combined = [...users, ...allUsers];
    const unique = new Map<string, User>();
    combined.forEach(u => {
      if (u && u.fullName && (!activeOrgName || activeOrgName === 'All' || u.organizationName === activeOrgName)) {
        unique.set(u.id || u.fullName, u);
      }
    });
    const rawList = Array.from(unique.values());
    return sortUsersByHierarchy(rawList, generalSettings?.userHierarchyOrder);
  }, [users, allUsers, activeOrgName, generalSettings?.userHierarchyOrder]);

  // Helper to Recalculate Employee Item
  const calculateEmployeeNumbers = (data: Partial<SalaryEmployeeItem>): SalaryEmployeeItem => {
    const basicScale = Number(data.basicScale) || 0;
    const gradeCount = Number(data.gradeCount) || 0;
    const gradeRate = Number(data.gradeRate) || 0;
    const gradeAmount = data.gradeAmount !== undefined ? Number(data.gradeAmount) : (gradeCount * gradeRate);
    const totalBasicSalary = basicScale + gradeAmount;

    const dearnessAllowance = Number(data.dearnessAllowance) || 0;
    let incentiveAllowance = Number(data.incentiveAllowance) || 0;
    const fieldAllowance = Number(data.fieldAllowance) || 0;
    const dressAllowance = Number(data.dressAllowance) || 0;
    const medicalAllowance = Number(data.medicalAllowance) || 0;
    const otherAllowances = Number(data.otherAllowances) || 0;

    // Check if ambulance driver and auto-populate incentive if needed using EXACT single-source-of-truth
    const empName = data.employeeName || '';
    const designation = data.designation || '';
    const isAmbuDriver = isAmbulanceDriver(designation, empName);
    const driverIncentivePercent = Number(generalSettings?.ambulanceDriverIncentivePercent) || 15;

    if (isAmbuDriver && ambulanceRecords.length > 0) {
      const incentiveResult = getDriverMonthlyIncentive(
        ambulanceRecords,
        empName,
        selectedFiscalYear,
        selectedMonthCode,
        driverIncentivePercent
      );
      if (incentiveResult.tripCount > 0 || data.incentiveAllowance === undefined || data.incentiveAllowance === null) {
        incentiveAllowance = incentiveResult.incentiveAmount;
      }
    }

    const totalAllowances = dearnessAllowance + incentiveAllowance + fieldAllowance + dressAllowance + medicalAllowance + otherAllowances;
    const grossSalary = totalBasicSalary + totalAllowances;

    // Default PF 10% if Permanent and providentFund not explicitly 0
    let providentFund = Number(data.providentFund) || 0;
    const citDeduction = Number(data.citDeduction) || 0;
    const insuranceDeduction = Number(data.insuranceDeduction) || 0;
    
    // Tax calculation: 1% on regular taxable remuneration (totalBasicSalary + dearness + allowances excluding incentive) and 15% on incentive
    const taxableRemuneration = totalBasicSalary + dearnessAllowance + fieldAllowance + dressAllowance + medicalAllowance + otherAllowances;
    const taxRemuneration = Math.round(taxableRemuneration * 0.01);
    const taxIncentive = Math.round(incentiveAllowance * 0.15);
    
    let taxDeduction = (data.taxDeduction !== undefined && data.taxDeduction !== null && data.taxDeduction !== 0) 
      ? Number(data.taxDeduction) 
      : (taxRemuneration + taxIncentive);

    const loanOrAdvanceDeduction = Number(data.loanOrAdvanceDeduction) || 0;
    const otherDeductions = Number(data.otherDeductions) || 0;

    if (taxDeduction === 0 && grossSalary > 0) {
      taxDeduction = taxRemuneration + taxIncentive;
    }

    const totalDeductions = providentFund + citDeduction + insuranceDeduction + taxDeduction + loanOrAdvanceDeduction + otherDeductions;
    const netPayable = Math.max(0, grossSalary - totalDeductions);

    return {
      id: data.id || `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: data.userId,
      employeeName: data.employeeName || '',
      designation: data.designation || '',
      level: data.level || '',
      employeeCode: data.employeeCode || '',
      bankAccountNumber: data.bankAccountNumber || '',
      bankName: data.bankName || '',
      panNumber: data.panNumber || '',
      citNumber: data.citNumber || '',
      pfNumber: data.pfNumber || '',
      serviceType: data.serviceType || 'Permanent',
      basicScale,
      gradeCount,
      gradeRate,
      gradeAmount,
      totalBasicSalary,
      dearnessAllowance,
      incentiveAllowance,
      fieldAllowance,
      dressAllowance,
      medicalAllowance,
      otherAllowances,
      grossSalary,
      providentFund,
      citDeduction,
      insuranceDeduction,
      taxDeduction,
      loanOrAdvanceDeduction,
      otherDeductions,
      totalDeductions,
      netPayable,
      remarks: data.remarks || ''
    };
  };

  // Grand Totals Calculation
  const grandTotals = useMemo(() => {
    return employeesList.reduce((acc, emp) => {
      acc.totalBasicScale += Number(emp.basicScale) || 0;
      acc.totalGradeAmount += Number(emp.gradeAmount) || 0;
      acc.totalBasicSalary += Number(emp.totalBasicSalary) || 0;
      acc.totalDearness += Number(emp.dearnessAllowance) || 0;
      acc.totalIncentive += Number(emp.incentiveAllowance) || 0;
      acc.totalField += Number(emp.fieldAllowance) || 0;
      acc.totalDress += Number(emp.dressAllowance) || 0;
      acc.totalOtherAllowances += (Number(emp.medicalAllowance) || 0) + (Number(emp.otherAllowances) || 0);
      acc.totalGross += Number(emp.grossSalary) || 0;
      acc.totalPF += Number(emp.providentFund) || 0;
      acc.totalCIT += Number(emp.citDeduction) || 0;
      acc.totalInsurance += Number(emp.insuranceDeduction) || 0;
      acc.totalTax += Number(emp.taxDeduction) || 0;
      acc.totalAdvance += Number(emp.loanOrAdvanceDeduction) || 0;
      acc.totalOtherDeductions += Number(emp.otherDeductions) || 0;
      acc.totalDeductions += Number(emp.totalDeductions) || 0;
      acc.totalNetPayable += Number(emp.netPayable) || 0;
      return acc;
    }, {
      totalBasicScale: 0,
      totalGradeAmount: 0,
      totalBasicSalary: 0,
      totalDearness: 0,
      totalIncentive: 0,
      totalField: 0,
      totalDress: 0,
      totalOtherAllowances: 0,
      totalGross: 0,
      totalPF: 0,
      totalCIT: 0,
      totalInsurance: 0,
      totalTax: 0,
      totalAdvance: 0,
      totalOtherDeductions: 0,
      totalDeductions: 0,
      totalNetPayable: 0
    });
  }, [employeesList]);

  // Populate / Auto-Load Employees from users + profiles
  const handleAutoLoadEmployees = () => {
    if (relevantOfficeUsers.length === 0) {
      alert("कुनै प्रयोगकर्ता/कर्मचारी फेला परेन। कृपया प्रयोगकर्ता व्यवस्थापनबाट कर्मचारी थप्नुहोस् वा तलको 'कर्मचारी थप्नुहोस्' बटन प्रयोग गर्नुहोस्।");
      return;
    }

    const loadedList: SalaryEmployeeItem[] = relevantOfficeUsers.map(user => {
      // Find if an employee profile already exists
      const profile = employeeProfiles.find(p => p.userId === user.id || p.employeeName === user.fullName);
      
      // Match designation salary scale if exists in database
      const matchedScale = salaryScales.find(s => 
        s.designation && user.designation && s.designation.trim().toLowerCase() === user.designation.trim().toLowerCase()
      ) || salaryScales.find(s =>
        s.designation && user.designation && (
          s.designation.toLowerCase().includes(user.designation.toLowerCase()) || 
          user.designation.toLowerCase().includes(s.designation.toLowerCase())
        )
      );

      const basicScale = profile?.basicScale || matchedScale?.basicScale || 32000;
      const gradeCount = profile?.gradeCount || 0;
      const gradeRate = profile?.gradeRate || matchedScale?.gradeRate || Math.round(basicScale / 30);
      const gradeAmount = gradeCount * gradeRate;
      const totalBasicSalary = basicScale + gradeAmount;
      const dearnessAllowance = profile?.dearnessAllowance !== undefined 
        ? profile.dearnessAllowance 
        : (matchedScale?.dearnessAllowance !== undefined ? matchedScale.dearnessAllowance : 2000);
      const incentiveAllowance = profile?.incentiveAllowance || 0;
      const fieldAllowance = profile?.fieldAllowance || matchedScale?.fieldAllowance || 0;
      const dressAllowance = profile?.dressAllowance || matchedScale?.dressAllowance || 0;
      const medicalAllowance = profile?.medicalAllowance || 0;
      const otherAllowances = profile?.otherAllowances || 0;
      const grossSalary = totalBasicSalary + dearnessAllowance + incentiveAllowance + fieldAllowance + dressAllowance + medicalAllowance + otherAllowances;

      const isPermanent = (profile?.serviceType || user.serviceType) === 'Permanent';
      const providentFund = profile?.providentFund !== undefined ? profile.providentFund : (isPermanent ? Math.round(totalBasicSalary * 0.10) : 0);
      const citDeduction = profile?.citDeduction || 0;
      const insuranceDeduction = profile?.insuranceDeduction || (isPermanent ? 400 : 0);
      const taxDeduction = profile?.taxDeduction !== undefined ? profile.taxDeduction : Math.round(grossSalary * 0.01);
      const loanOrAdvanceDeduction = profile?.loanOrAdvanceDeduction || 0;
      const otherDeductions = profile?.otherDeductions || 0;
      const totalDeductions = providentFund + citDeduction + insuranceDeduction + taxDeduction + loanOrAdvanceDeduction + otherDeductions;
      const netPayable = Math.max(0, grossSalary - totalDeductions);

      return {
        id: `emp-${user.id || Date.now()}`,
        userId: user.id,
        employeeName: user.fullName || user.username,
        designation: user.designation || 'कर्मचारी',
        level: profile?.level || matchedScale?.level || 'पाँचौं तह',
        employeeCode: profile?.employeeCode || '',
        bankAccountNumber: profile?.bankAccountNumber || '',
        bankName: profile?.bankName || 'राष्ट्रिय वाणिज्य बैंक',
        panNumber: profile?.panNumber || '',
        citNumber: profile?.citNumber || '',
        pfNumber: profile?.pfNumber || '',
        serviceType: profile?.serviceType || user.serviceType || 'Permanent',
        basicScale,
        gradeCount,
        gradeRate,
        gradeAmount,
        totalBasicSalary,
        dearnessAllowance,
        incentiveAllowance,
        fieldAllowance,
        dressAllowance,
        medicalAllowance,
        otherAllowances,
        grossSalary,
        providentFund,
        citDeduction,
        insuranceDeduction,
        taxDeduction,
        loanOrAdvanceDeduction,
        otherDeductions,
        totalDeductions,
        netPayable,
        remarks: ''
      };
    });

    setEmployeesList(loadedList);
    setSaveSuccessMessage(`${loadedList.length} जना कर्मचारीको विवरण पदानुक्रम अनुसार सफलतापूर्वक लोड गरियो!`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Re-sort current month employees according to Office User Hierarchy
  const handleSortEmployeesByHierarchy = () => {
    if (employeesList.length === 0) return;
    const order = generalSettings?.userHierarchyOrder || [];
    const orderMap = new Map<string, number>();
    order.forEach((id, idx) => orderMap.set(id, idx));

    const userByNameMap = new Map<string, string>();
    relevantOfficeUsers.forEach(u => {
      if (u.fullName) userByNameMap.set(u.fullName.trim().toLowerCase(), u.id);
    });

    const sorted = [...employeesList].sort((a, b) => {
      const idA = a.userId || userByNameMap.get((a.employeeName || '').trim().toLowerCase()) || '';
      const idB = b.userId || userByNameMap.get((b.employeeName || '').trim().toLowerCase()) || '';
      const hasA = Boolean(idA && orderMap.has(idA));
      const hasB = Boolean(idB && orderMap.has(idB));

      if (hasA && hasB) {
        return (orderMap.get(idA)!) - (orderMap.get(idB)!);
      }
      if (hasA) return -1;
      if (hasB) return 1;
      return (a.employeeName || '').localeCompare(b.employeeName || '', 'ne');
    });

    setEmployeesList(sorted);
    setSaveSuccessMessage("कर्मचारीहरूलाई कार्यालय पदानुक्रम (Hierarchy) अनुसार क्रमबद्ध गरियो!");
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Copy From Previous Month
  const handleCopyFromPreviousMonth = () => {
    const currentMonthObj = NEPALI_MONTHS.find(m => m.code === selectedMonthCode);
    if (!currentMonthObj) return;

    const prevOrder = currentMonthObj.order === 1 ? 12 : currentMonthObj.order - 1;
    const prevMonthCode = NEPALI_MONTHS.find(m => m.order === prevOrder)?.code;
    const prevYear = currentMonthObj.order === 10 ? FISCAL_YEARS.find((_, i) => FISCAL_YEARS[i+1]?.value === selectedFiscalYear)?.value || selectedFiscalYear : selectedFiscalYear;

    const prevReceipt = allSalaryReceipts.find(r => r.fiscalYear === prevYear && r.month === prevMonthCode);
    if (!prevReceipt || !prevReceipt.employees || prevReceipt.employees.length === 0) {
      alert(`अघिल्लो महिना (${prevMonthCode}) को कुनै तलबी भरपाई फेला परेन।`);
      return;
    }

    setEmployeesList(prevReceipt.employees.map(e => ({ ...e, id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` })));
    setBudgetHeadName(prevReceipt.budgetHeadName || '२११११ - कर्मचारी पारिश्रमिक');
    setPaymentMethod(prevReceipt.paymentMethod || 'Bank');
    setBankName(prevReceipt.bankName || '');
    setSaveSuccessMessage(`अघिल्लो महिनाको तलबी भरपाईबाट ${prevReceipt.employees.length} जनाको विवरण कपी गरियो!`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Save Salary Bharpai Receipt
  const handleSaveReceipt = async () => {
    if (employeesList.length === 0) {
      alert("तलबी भरपाईमा कम्तिमा एक जना कर्मचारीको विवरण समावेश हुनुपर्छ।");
      return;
    }

    const monthObj = NEPALI_MONTHS.find(m => m.code === selectedMonthCode);
    const receiptId = currentMonthReceipt?.id || `${selectedFiscalYear.replace(/[^0-9]/g, '')}_${selectedMonthCode}_${Date.now()}`;

    const receiptPayload: MonthlySalaryReceipt = {
      id: receiptId,
      fiscalYear: selectedFiscalYear,
      month: selectedMonthCode,
      monthNameNepali: monthObj?.shortName || selectedMonthCode,
      receiptNumber: receiptNumber || `PAY-${selectedFiscalYear.replace(/[^0-9]/g, '')}-${selectedMonthCode}`,
      dateBs: currentReceiptDate,
      paymentMethod,
      bankName,
      chequeOrVoucherNo,
      budgetHeadName,
      budgetCode: '२११११',
      employees: employeesList,
      totalBasicSalary: grandTotals.totalBasicSalary,
      totalGradeAmount: grandTotals.totalGradeAmount,
      totalAllowances: grandTotals.totalDearness + grandTotals.totalIncentive + grandTotals.totalField + grandTotals.totalDress + grandTotals.totalOtherAllowances,
      totalGrossSalary: grandTotals.totalGross,
      totalDeductions: grandTotals.totalDeductions,
      totalNetPayable: grandTotals.totalNetPayable,
      preparedBy: { name: preparedByName, designation: preparedByDesignation },
      verifiedBy: { name: verifiedByName, designation: verifiedByDesignation },
      approvedBy: { name: approvedByName, designation: approvedByDesignation },
      status: 'Approved',
      notes,
      createdAt: currentMonthReceipt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _orgName: effectiveOrgName
    };

    try {
      if (onSaveSalaryReceipt) {
        onSaveSalaryReceipt(receiptPayload);
      }
      // Also persist to Firebase Realtime Database directly
      const docRef = ref(db, `orgData/${safeOrgName}/salaryReceipts/${receiptId}`);
      await set(docRef, receiptPayload);

      // Save profiles as well for future months
      employeesList.forEach(emp => {
        const profId = emp.userId || emp.employeeName.trim().replace(/[.#$[\]]/g, "_");
        const profRef = ref(db, `orgData/${safeOrgName}/employeeSalaryProfiles/${profId}`);
        set(profRef, {
          id: profId,
          userId: emp.userId,
          employeeName: emp.employeeName,
          designation: emp.designation,
          level: emp.level,
          employeeCode: emp.employeeCode,
          bankAccountNumber: emp.bankAccountNumber,
          bankName: emp.bankName,
          panNumber: emp.panNumber,
          citNumber: emp.citNumber,
          pfNumber: emp.pfNumber,
          serviceType: emp.serviceType,
          basicScale: emp.basicScale,
          gradeCount: emp.gradeCount,
          gradeRate: emp.gradeRate,
          dearnessAllowance: emp.dearnessAllowance,
          incentiveAllowance: emp.incentiveAllowance,
          fieldAllowance: emp.fieldAllowance,
          dressAllowance: emp.dressAllowance,
          medicalAllowance: emp.medicalAllowance,
          otherAllowances: emp.otherAllowances,
          providentFund: emp.providentFund,
          citDeduction: emp.citDeduction,
          insuranceDeduction: emp.insuranceDeduction,
          taxDeduction: emp.taxDeduction,
          loanOrAdvanceDeduction: emp.loanOrAdvanceDeduction,
          otherDeductions: emp.otherDeductions,
          _orgName: effectiveOrgName
        }).catch(() => {});
      });

      setSaveSuccessMessage(`${monthObj?.shortName} महिनाको तलबी भरपाई सफलतापूर्वक सुरक्षित गरियो!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Error saving salary receipt", err);
      alert("डाटा सुरक्षित गर्न सकिएन: " + (err.message || 'Error'));
    }
  };

  // Post as Expense to Lekha Prashasan
  const handlePostToLekhaPrashasan = async () => {
    if (employeesList.length === 0) {
      alert("पोस्ट गर्नको लागि कुनै कर्मचारीको विवरण छैन।");
      return;
    }

    const monthObj = NEPALI_MONTHS.find(m => m.code === selectedMonthCode);
    const txId = `sal_exp_${selectedFiscalYear.replace(/[^0-9]/g, '')}_${selectedMonthCode}`;
    const transaction = {
      id: txId,
      dateBs: currentReceiptDate,
      dateAd: new Date().toISOString().split('T')[0],
      category: 'General',
      type: 'Expense',
      amount: grandTotals.totalNetPayable,
      remarks: `${monthObj?.name || selectedMonthCode} महिनाको कर्मचारी तलबी भरपाई निकासा खर्च`,
      fiscalYear: selectedFiscalYear,
      paymentMethod,
      checkNo: chequeOrVoucherNo || '',
      referenceNo: receiptNumber || `PAY-${selectedMonthCode}`
    };

    const voucherId = `GV-SAL-${selectedFiscalYear.replace(/[^0-9]/g, '')}-${selectedMonthCode}`;
    const voucher = {
      id: voucherId,
      dateBs: currentReceiptDate,
      dateAd: new Date().toISOString().split('T')[0],
      fiscalYear: selectedFiscalYear,
      remarks: `${monthObj?.name || selectedMonthCode} महिनाको कर्मचारी तलबी भरपाई निकासा खर्च`,
      totalAmount: grandTotals.totalNetPayable,
      entries: [
        {
          activityName: budgetHeadName,
          accountName: 'कर्मचारी पारिश्रमिक तथा भत्ता खर्च',
          debit: grandTotals.totalGross,
          credit: 0
        },
        {
          activityName: 'कट्टी',
          accountName: 'कर्मचारी सञ्चय कोष / कर कट्टी',
          debit: 0,
          credit: grandTotals.totalDeductions
        },
        {
          activityName: 'भुक्तानी',
          accountName: paymentMethod === 'Bank' ? 'बैंक खाता' : paymentMethod === 'Cheque' ? 'चेक खाता' : 'नगद खाता',
          debit: 0,
          credit: grandTotals.totalNetPayable
        }
      ]
    };

    try {
      const txRef = ref(db, `orgData/${safeOrgName}/financialTransactions/${txId}`);
      await set(txRef, transaction);
      const voucherRef = ref(db, `orgData/${safeOrgName}/goswaraVouchers/${voucherId}`);
      await set(voucherRef, voucher);

      setSaveSuccessMessage(`सफलतापूर्वक ${monthObj?.name} महिनाको तलबी भरपाई लेखा प्रशासनमा खर्च तथा गोश्वारा भौचरको रूपमा पोस्ट गरियो!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
      alert(`सफलतापूर्वक ${monthObj?.name} महिनाको तलबी भरपाई रकम लेखा प्रशासनमा खर्चको रूपमा पोस्ट गरियो!`);
    } catch (err: any) {
      alert("खर्च पोस्ट गर्दा त्रुटि भयो: " + (err.message || 'Error'));
    }
  };

  // Delete Receipt
  const handleDeleteReceipt = async () => {
    if (!currentMonthReceipt) return;
    if (window.confirm(`${currentMonthReceipt.monthNameNepali} महिनाको तलबी भरपाई मेटाउन चाहनुहुन्छ?`)) {
      try {
        if (onDeleteSalaryReceipt) {
          onDeleteSalaryReceipt(currentMonthReceipt.id);
        }
        const cleanFy = selectedFiscalYear.replace(/[^0-9]/g, '');
        const txId = `sal_exp_${cleanFy}_${selectedMonthCode}`;
        const voucherId = `GV-SAL-${cleanFy}_${selectedMonthCode}`;

        await remove(ref(db, `orgData/${safeOrgName}/salaryReceipts/${currentMonthReceipt.id}`));
        await remove(ref(db, `orgData/${safeOrgName}/financialTransactions/${txId}`));
        await remove(ref(db, `orgData/${safeOrgName}/goswaraVouchers/${voucherId}`));

        setEmployeesList([]);
        alert("तलबी भरपाई तथा सम्बन्धित लेखाका रेकर्डहरू सफलतापूर्वक database बाट हटाइयो।");
      } catch (e: any) {
        alert("त्रुटि: " + e.message);
      }
    }
  };

  // Save / Edit Employee Modal submit
  const handleSaveEmpModal = () => {
    if (!empForm.employeeName) {
      alert("कर्मचारीको नाम अनिवार्य छ।");
      return;
    }

    const calculated = calculateEmployeeNumbers(empForm);
    if (editingEmployeeItem) {
      setEmployeesList(prev => prev.map(item => item.id === editingEmployeeItem.id ? calculated : item));
      setSaveSuccessMessage("कर्मचारीको विवरण सफलतापूर्वक सम्पादन गरी सुरक्षित गरियो!");
    } else {
      setEmployeesList(prev => [...prev, calculated]);
      setSaveSuccessMessage("नयाँ कर्मचारी सफलतापूर्वक थपियो!");
    }
    setTimeout(() => setSaveSuccessMessage(null), 3500);
    setIsAddEmployeeModalOpen(false);
    setEditingEmployeeItem(null);
  };

  // Designation Salary Scale Handlers
  const handleSaveSalaryScale = async () => {
    if (!scaleForm.designation || !scaleForm.designation.trim()) {
      alert("कृपया पद (Designation) को नाम लेख्नुहोस्।");
      return;
    }
    const cleanId = editingScale?.id || scaleForm.designation.trim().replace(/[.#$[\]/]/g, "_");
    const payload: DesignationSalaryScale = {
      id: cleanId,
      designation: scaleForm.designation.trim(),
      level: scaleForm.level?.trim() || '',
      basicScale: Number(scaleForm.basicScale) || 0,
      gradeRate: Number(scaleForm.gradeRate) || Math.round((Number(scaleForm.basicScale) || 0) / 30),
      dearnessAllowance: scaleForm.dearnessAllowance !== undefined ? Number(scaleForm.dearnessAllowance) : 2000,
      fieldAllowance: Number(scaleForm.fieldAllowance) || 0,
      dressAllowance: Number(scaleForm.dressAllowance) || 0,
      remarks: scaleForm.remarks || '',
      updatedAt: new Date().toISOString()
    };

    try {
      const scaleRef = ref(db, `orgData/${safeOrgName}/designationSalaryScales/${cleanId}`);
      await set(scaleRef, payload);
      setSaveSuccessMessage(`पद "${payload.designation}" को सुरु तलब स्केल सफलतापूर्वक सुरक्षित गरियो!`);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
      setIsScaleModalOpen(false);
      setEditingScale(null);
    } catch (err: any) {
      alert("तलब स्केल सुरक्षित गर्न सकिएन: " + (err.message || 'Error'));
    }
  };

  const handleDeleteSalaryScale = async (scaleId: string, designation: string) => {
    if (window.confirm(`के तपाईं पद "${designation}" को तलब स्केल मेटाउन निश्चित हुनुहुन्छ?`)) {
      try {
        await remove(ref(db, `orgData/${safeOrgName}/designationSalaryScales/${scaleId}`));
        setSaveSuccessMessage(`पद "${designation}" को तलब स्केल मेटाइयो।`);
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } catch (err: any) {
        alert("त्रुटि: " + (err.message || 'Error'));
      }
    }
  };

  // Seed standard Nepal civil/health service pay scales
  const handleSeedStandardScales = async () => {
    const standardScales: Array<Omit<DesignationSalaryScale, 'id'>> = [
      { designation: 'अधिकृत आठौं तह', level: 'आठौं तह', basicScale: 48737, gradeRate: 1625, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'अधिकृत सातौं तह (मेडिकल अधिकृत)', level: 'सातौं तह', basicScale: 43689, gradeRate: 1456, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'हेल्थ असिस्टेन्ट (HA / छैटौं तह)', level: 'छैटौं तह', basicScale: 36490, gradeRate: 1216, dearnessAllowance: 2000, remarks: 'पाँचौंबाट स्तरोन्नति' },
      { designation: 'हेल्थ असिस्टेन्ट (HA / पाँचौं तह)', level: 'पाँचौं तह', basicScale: 32902, gradeRate: 1097, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'स्टाफ नर्स (पाँचौं तह)', level: 'पाँचौं तह', basicScale: 32902, gradeRate: 1097, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'ल्याब टेक्निसियन (पाँचौं तह)', level: 'पाँचौं तह', basicScale: 32902, gradeRate: 1097, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'फार्मेसी सहायक (पाँचौं तह)', level: 'पाँचौं तह', basicScale: 32902, gradeRate: 1097, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'अ.हे.ब. (AHW / चौथो तह)', level: 'चौथो तह', basicScale: 28610, gradeRate: 954, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'अ.न.मी. (ANM / चौथो तह)', level: 'चौथो तह', basicScale: 28610, gradeRate: 954, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'ल्याब असिस्टेन्ट (चौथो तह)', level: 'चौथो तह', basicScale: 28610, gradeRate: 954, dearnessAllowance: 2000, remarks: 'नेपाल स्वास्थ्य सेवा' },
      { designation: 'एम्बुलेन्स चालक (Ambulance Driver)', level: 'श्रेणी विहीन', basicScale: 26082, gradeRate: 869, dearnessAllowance: 2000, remarks: 'सवारी चालक' },
      { designation: 'कार्यालय सहयोगी / स्वीपर', level: 'श्रेणी विहीन', basicScale: 24702, gradeRate: 823, dearnessAllowance: 2000, remarks: 'श्रेणी विहीन प्रथम स्तर' }
    ];

    if (!window.confirm("नेपाल स्वास्थ्य तथा निजामती सेवाको मानक सुरु तलब स्केलहरू डाटाबेसमा सुरक्षित गर्न चाहनुहुन्छ?")) {
      return;
    }

    try {
      for (const item of standardScales) {
        const cleanId = item.designation.trim().replace(/[.#$[\]/]/g, "_");
        const scaleRef = ref(db, `orgData/${safeOrgName}/designationSalaryScales/${cleanId}`);
        await set(scaleRef, {
          id: cleanId,
          ...item,
          updatedAt: new Date().toISOString()
        });
      }
      setSaveSuccessMessage("मानक पद तथा सुरु तलब स्केलहरू सफलतापूर्वक डाटाबेसमा सुरक्षित गरियो!");
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (e: any) {
      alert("त्रुटि: " + e.message);
    }
  };

  // Helper function to apply scale to empForm
  const applyScaleToEmpForm = (desig: string) => {
    if (!desig) return;
    const cleanDesig = desig.trim().toLowerCase();
    const matched = salaryScales.find(s => s.designation && s.designation.trim().toLowerCase() === cleanDesig)
      || salaryScales.find(s => s.designation && (
        cleanDesig.includes(s.designation.trim().toLowerCase()) ||
        s.designation.trim().toLowerCase().includes(cleanDesig)
      ));

    if (matched) {
      setEmpForm(prev => {
        const basic = Number(matched.basicScale) || prev.basicScale || 0;
        const gradeRt = Number(matched.gradeRate) || Math.round(basic / 30);
        const count = prev.gradeCount || 0;
        const gAmount = count * gradeRt;
        const dearness = matched.dearnessAllowance !== undefined ? Number(matched.dearnessAllowance) : (prev.dearnessAllowance ?? 2000);
        const field = matched.fieldAllowance !== undefined ? Number(matched.fieldAllowance) : (prev.fieldAllowance || 0);
        const dress = matched.dressAllowance !== undefined ? Number(matched.dressAllowance) : (prev.dressAllowance || 0);

        return {
          ...prev,
          designation: desig,
          level: matched.level || prev.level || '',
          basicScale: basic,
          gradeRate: gradeRt,
          gradeAmount: gAmount,
          dearnessAllowance: dearness,
          fieldAllowance: field,
          dressAllowance: dress
        };
      });
    }
  };

  // Remove Employee Row
  const handleRemoveEmployee = (id: string) => {
    setEmployeesList(prev => prev.filter(e => e.id !== id));
  };

  // Export to Excel
  const handleExportExcel = () => {
    const monthObj = NEPALI_MONTHS.find(m => m.code === selectedMonthCode);
    const rows = employeesList.map((emp, index) => ({
      'क्र.सं.': index + 1,
      'कर्मचारीको नाम': emp.employeeName,
      'पद': emp.designation,
      'तह': emp.level || '',
      'सेवा': emp.serviceType || '',
      'संकेत नं.': emp.employeeCode || '',
      'बैंक खाता नं.': emp.bankAccountNumber || '',
      'PAN नं.': emp.panNumber || '',
      'सुरु तलब': emp.basicScale,
      'ग्रेड रकम': emp.gradeAmount,
      'जम्मा तलब': emp.totalBasicSalary,
      'महङ्गी भत्ता': emp.dearnessAllowance,
      'प्रोत्साहन/अन्य भत्ता': (emp.incentiveAllowance || 0) + (emp.fieldAllowance || 0) + (emp.dressAllowance || 0) + (emp.otherAllowances || 0),
      'जम्मा पारिश्रमिक': emp.grossSalary,
      'क.सं.को. कट्टी': emp.providentFund,
      'ना.ल.को. कट्टी': emp.citDeduction,
      'बीमा कट्टी': emp.insuranceDeduction,
      'आयकर/TDS': emp.taxDeduction,
      'सापटी/अन्य कट्टी': (emp.loanOrAdvanceDeduction || 0) + (emp.otherDeductions || 0),
      'जम्मा कट्टी': emp.totalDeductions,
      'पाउने खुद रकम': emp.netPayable,
      'कैफियत': emp.remarks || ''
    }));

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, `${monthObj?.shortName}_तलबी_भरपाई`);
    writeFile(wb, `Salary_Bharpai_${selectedFiscalYear.replace(/[^0-9]/g, '')}_${selectedMonthCode}.xlsx`);
  };

  // Print Monthly Bharpai Sheet
  const handlePrintMonthlyBharpai = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("कृपया पप-अप विन्डोलाई अनुमति दिनुहोस्।");
      return;
    }

    const monthObj = NEPALI_MONTHS.find(m => m.code === selectedMonthCode);
    const totalWords = numberToNepaliWords(grandTotals.totalNetPayable);

    const logoUrl = generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png';
    const provinceLogo = generalSettings?.provinceLogoUrl || logoUrl;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>मासिक तलबी भरपाई - ${monthObj?.shortName} ${selectedFiscalYear}</title>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 8mm 10mm 8mm;
          }
          body {
            font-family: 'Mukta', sans-serif;
            color: #111827;
            background: #fff;
            margin: 0;
            padding: 4px;
            font-size: 11px;
            line-height: 1.25;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
            border-bottom: 1.5px solid #dc2626;
            padding-bottom: 4px;
          }
          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          .header-text {
            flex: 1;
            text-align: center;
          }
          .header-text h1 {
            font-size: 18px;
            font-weight: 800;
            color: #b91c1c;
            margin: 0 0 2px 0;
          }
          .header-text h2 {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 2px 0;
          }
          .header-text p {
            font-size: 10.5px;
            font-weight: 600;
            color: #475569;
            margin: 0;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 6px;
            font-size: 11px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #475569;
            padding: 7px 6px;
            text-align: center;
            line-height: 1.4;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 700;
            color: #0f172a;
          }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .total-row {
            background-color: #e2e8f0;
            font-weight: 800;
          }
          .words-box {
            border: 1px dashed #64748b;
            background: #fdfdfd;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
            padding: 0 20px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 220px;
            border-top: 1px solid #111;
            padding-top: 4px;
            font-size: 11px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header-container" style="justify-content: center; text-align: center; position: relative;">
          <img src="${logoUrl}" class="logo" style="position: absolute; left: 10px; top: 0;" />
          <div class="header-text">
            <h1>${generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था व्यवस्थापन'}</h1>
            <h2>${generalSettings?.subTitleNepali || ''} ${generalSettings?.subTitleNepali2 ? ', ' + generalSettings.subTitleNepali2 : ''}</h2>
            <p>${generalSettings?.subTitleNepali3 || ''} ${generalSettings?.subTitleNepali4 || ''}</p>
            <h2 style="margin-top: 3px; text-decoration: underline; color: #0f172a;">मासिक कर्मचारी तलबी भरपाई तथा निकासा विवरण</h2>
          </div>
        </div>

        <div class="meta-grid">
          <div><b>आर्थिक वर्ष:</b> ${toNepaliNumber(selectedFiscalYear)}</div>
          <div><b>महिना:</b> ${monthObj?.shortName || ''}</div>
          <div><b>भरपाई/निकासा नं.:</b> ${toNepaliNumber(receiptNumber || '-')}</div>
          <div><b>मिति:</b> ${toNepaliNumber(currentReceiptDate)}</div>
          <div><b>बजेट शीर्षक:</b> ${budgetHeadName || '२११११ - कर्मचारी पारिश्रमिक'}</div>
          <div><b>भुक्तानी माध्यम:</b> ${paymentMethod === 'Bank' ? 'बैंक ट्रान्सफर' : paymentMethod === 'Cheque' ? 'चेक (Cheque)' : 'नगद'}</div>
          <div><b>बैंकको नाम:</b> ${bankName || '-'}</div>
          ${paymentMethod === 'Cheque' ? `<div><b>चेक नं.:</b> ${toNepaliNumber(chequeOrVoucherNo || '-')}</div>` : ''}
          <div><b>जम्मा कर्मचारी:</b> ${toNepaliNumber(employeesList.length)} जना</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2">क्र.सं.</th>
              <th rowspan="2">कर्मचारीको नाम</th>
              <th rowspan="2">पद / तह</th>
              <th rowspan="2">बैंक खाता नं.</th>
              <th colspan="3">तलब विवरण</th>
              <th colspan="3">भत्ता विवरण</th>
              <th rowspan="2">जम्मा पारिश्रमिक</th>
              <th colspan="5">कट्टी विवरण</th>
              <th rowspan="2">जम्मा कट्टी</th>
              <th rowspan="2">पाउने खुद रकम</th>
              <th rowspan="2">बुझिलिनेको दस्तखत</th>
            </tr>
            <tr>
              <th>सुरु तलब</th>
              <th>ग्रेड</th>
              <th>जम्मा तलब</th>
              <th>महङ्गी</th>
              <th>प्रोत्साहन/फिल्ड</th>
              <th>अन्य</th>
              <th>क.सं.को.</th>
              <th>ना.ल.को.</th>
              <th>बीमा</th>
              <th>सा.सु./आयकर</th>
              <th>अन्य</th>
            </tr>
          </thead>
          <tbody>
            ${employeesList.map((emp, i) => `
              <tr>
                <td>${toNepaliNumber(i + 1)}</td>
                <td class="text-left" style="font-weight: 600;">${emp.employeeName}</td>
                <td class="text-left">${emp.designation} ${emp.level ? `(${emp.level})` : ''}</td>
                <td class="text-left" style="font-size: 9px;">${emp.bankAccountNumber || '-'}</td>
                <td class="text-right">${toNepaliNumber(emp.basicScale.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(emp.gradeAmount.toLocaleString())}</td>
                <td class="text-right" style="font-weight: 600;">${toNepaliNumber(emp.totalBasicSalary.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(emp.dearnessAllowance.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(((emp.incentiveAllowance || 0) + (emp.fieldAllowance || 0)).toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(((emp.dressAllowance || 0) + (emp.otherAllowances || 0) + (emp.medicalAllowance || 0)).toLocaleString())}</td>
                <td class="text-right" style="font-weight: 700; background-color: #f8fafc;">${toNepaliNumber(emp.grossSalary.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(emp.providentFund.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(emp.citDeduction.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(emp.insuranceDeduction.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(emp.taxDeduction.toLocaleString())}</td>
                <td class="text-right">${toNepaliNumber(((emp.loanOrAdvanceDeduction || 0) + (emp.otherDeductions || 0)).toLocaleString())}</td>
                <td class="text-right" style="font-weight: 700; color: #dc2626;">${toNepaliNumber(emp.totalDeductions.toLocaleString())}</td>
                <td class="text-right" style="font-weight: 800; color: #16a34a; font-size: 11px;">${toNepaliNumber(emp.netPayable.toLocaleString())}</td>
                <td></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: center;">कुल जम्मा (Grand Total)</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalBasicScale.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalGradeAmount.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalBasicSalary.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalDearness.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber((grandTotals.totalIncentive + grandTotals.totalField).toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber((grandTotals.totalDress + grandTotals.totalOtherAllowances).toLocaleString())}</td>
              <td class="text-right" style="font-weight: 800;">${toNepaliNumber(grandTotals.totalGross.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalPF.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalCIT.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalInsurance.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(grandTotals.totalTax.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber((grandTotals.totalAdvance + grandTotals.totalOtherDeductions).toLocaleString())}</td>
              <td class="text-right" style="font-weight: 800; color: #dc2626;">${toNepaliNumber(grandTotals.totalDeductions.toLocaleString())}</td>
              <td class="text-right" style="font-weight: 800; color: #16a34a; font-size: 11px;">${toNepaliNumber(grandTotals.totalNetPayable.toLocaleString())}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="words-box">
          <b>अक्षरेपी कुल खुद भुक्तानी रकम:</b> ${totalWords}
        </div>

        <div class="signatures">
          <div class="sig-box">
            <p style="margin: 0 0 2px 0;"><strong>${preparedByName || 'तयार गर्ने'}</strong></p>
            <p style="margin: 0;">${preparedByDesignation || 'पद: सहायक'}</p>
            <p style="margin: 2px 0 0 0; font-size: 9px;">तयार गर्ने</p>
          </div>
          <div class="sig-box">
            <p style="margin: 0 0 2px 0;"><strong>${verifiedByName || 'जाँच/पेश गर्ने'}</strong></p>
            <p style="margin: 0;">${verifiedByDesignation || 'पद: लेखापाल'}</p>
            <p style="margin: 2px 0 0 0; font-size: 9px;">जाँच / पेश गर्ने</p>
          </div>
          <div class="sig-box">
            <p style="margin: 0 0 2px 0;"><strong>${approvedByName || 'स्वीकृत गर्ने'}</strong></p>
            <p style="margin: 0;">${approvedByDesignation || 'पद: कार्यालय प्रमुख'}</p>
            <p style="margin: 2px 0 0 0; font-size: 9px;">स्वीकृत गर्ने / कार्यालय प्रमुख</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print Individual Pay Slip
  const handlePrintPaySlip = (emp: SalaryEmployeeItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const monthObj = NEPALI_MONTHS.find(m => m.code === selectedMonthCode);
    const words = numberToNepaliWords(emp.netPayable);

    const logoUrl = generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>तलब स्लिप - ${emp.employeeName} (${monthObj?.shortName})</title>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Mukta', sans-serif; padding: 10px; color: #1e293b; line-height: 1.4; }
          .payslip-card { border: 2px solid #0f172a; border-radius: 8px; padding: 20px; max-width: 700px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 15px; }
          .header img { width: 65px; height: 65px; margin-bottom: 5px; }
          .header h1 { font-size: 20px; font-weight: 800; color: #b91c1c; margin: 0; }
          .header h2 { font-size: 14px; margin: 2px 0; color: #334155; }
          .header h3 { font-size: 15px; text-decoration: underline; margin-top: 8px; color: #0f172a; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .info-table td { padding: 5px 8px; font-size: 13px; font-weight: 600; }
          .breakdown-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .breakdown-table th, .breakdown-table td { border: 1px solid #475569; padding: 8px 10px; font-size: 13px; }
          .breakdown-table th { background: #f1f5f9; font-weight: 700; }
          .net-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 6px; padding: 12px; text-align: center; font-size: 16px; font-weight: 800; color: #166534; margin-bottom: 25px; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-col { text-align: center; width: 180px; border-top: 1px solid #333; padding-top: 5px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="payslip-card">
          <div class="header">
            <img src="${logoUrl}" />
            <h1>${generalSettings?.orgNameNepali || 'स्वास्थ्य संस्था'}</h1>
            <h2>${generalSettings?.subTitleNepali || ''}</h2>
            <h3>कर्मचारी तलब भुक्तानी स्लिप (Salary Pay Slip)</h3>
            <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600;">
              आर्थिक वर्ष: ${toNepaliNumber(selectedFiscalYear)} | महिना: ${monthObj?.name || ''} | मिति: ${toNepaliNumber(currentReceiptDate)}
            </p>
          </div>

          <table class="info-table">
            <tr>
              <td><strong>कर्मचारीको नाम:</strong> ${emp.employeeName}</td>
              <td><strong>पद / तह:</strong> ${emp.designation} ${emp.level ? `(${emp.level})` : ''}</td>
            </tr>
            <tr>
              <td><strong>संकेत नं / PAN:</strong> ${toNepaliNumber(emp.employeeCode || emp.panNumber || '-')}</td>
              <td><strong>सेवाको किसिम:</strong> ${emp.serviceType || 'स्थायी'}</td>
            </tr>
            <tr>
              <td><strong>बैंकको नाम:</strong> ${emp.bankName || bankName || '-'}</td>
              <td><strong>बैंक खाता नं.:</strong> ${toNepaliNumber(emp.bankAccountNumber || '-')}</td>
            </tr>
          </table>

          <table class="breakdown-table">
            <thead>
              <tr>
                <th style="width: 50%;">पारिश्रमिक / आम्दानी (Earnings)</th>
                <th style="width: 50%;">कट्टी विवरण (Deductions)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="vertical-align: top;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>सुरु तलब स्केल (Basic Scale):</span>
                    <span>रु. ${toNepaliNumber(emp.basicScale.toLocaleString())}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>ग्रेड रकम (${toNepaliNumber(emp.gradeCount)} वटा):</span>
                    <span>रु. ${toNepaliNumber(emp.gradeAmount.toLocaleString())}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: bold;">
                    <span>जम्मा तलब (Total Basic):</span>
                    <span>रु. ${toNepaliNumber(emp.totalBasicSalary.toLocaleString())}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>महङ्गी भत्ता (Dearness):</span>
                    <span>रु. ${toNepaliNumber(emp.dearnessAllowance.toLocaleString())}</span>
                  </div>
                  ${emp.incentiveAllowance ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>प्रोत्साहन भत्ता:</span>
                      <span>रु. ${toNepaliNumber(emp.incentiveAllowance.toLocaleString())}</span>
                    </div>
                  ` : ''}
                  ${emp.fieldAllowance ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>फिल्ड / स्थानीय भत्ता:</span>
                      <span>रु. ${toNepaliNumber(emp.fieldAllowance.toLocaleString())}</span>
                    </div>
                  ` : ''}
                  ${emp.dressAllowance ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>पोशाक भत्ता:</span>
                      <span>रु. ${toNepaliNumber(emp.dressAllowance.toLocaleString())}</span>
                    </div>
                  ` : ''}
                  ${emp.otherAllowances ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>अन्य भत्ता:</span>
                      <span>रु. ${toNepaliNumber(emp.otherAllowances.toLocaleString())}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #333; margin-top: 8px; padding-top: 6px; font-weight: 800; font-size: 14px;">
                    <span>जम्मा पारिश्रमिक (Gross):</span>
                    <span>रु. ${toNepaliNumber(emp.grossSalary.toLocaleString())}</span>
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>क.सं.को. (PF 10%):</span>
                    <span>रु. ${toNepaliNumber(emp.providentFund.toLocaleString())}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>नागरिक लगानी कोष (CIT):</span>
                    <span>रु. ${toNepaliNumber(emp.citDeduction.toLocaleString())}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>सावधिक जीवन बीमा:</span>
                    <span>रु. ${toNepaliNumber(emp.insuranceDeduction.toLocaleString())}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>सा.सु.कर / TDS:</span>
                    <span>रु. ${toNepaliNumber(emp.taxDeduction.toLocaleString())}</span>
                  </div>
                  ${emp.loanOrAdvanceDeduction ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>पेश्की / ऋण कट्टी:</span>
                      <span>रु. ${toNepaliNumber(emp.loanOrAdvanceDeduction.toLocaleString())}</span>
                    </div>
                  ` : ''}
                  ${emp.otherDeductions ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span>अन्य कट्टी:</span>
                      <span>रु. ${toNepaliNumber(emp.otherDeductions.toLocaleString())}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #333; margin-top: 8px; padding-top: 6px; font-weight: 800; font-size: 14px; color: #dc2626;">
                    <span>जम्मा कट्टी (Total Deductions):</span>
                    <span>रु. ${toNepaliNumber(emp.totalDeductions.toLocaleString())}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="net-box">
            पाउने खुद भुक्तानी रकम (Net Salary): रु. ${toNepaliNumber(emp.netPayable.toLocaleString())}/-
            <div style="font-size: 12px; font-weight: 600; color: #14532d; margin-top: 4px;">
              अक्षरेपी: ${words}
            </div>
          </div>

          <div class="sig-row">
            <div class="sig-col">
              तयार गर्ने
            </div>
            <div class="sig-col">
              लेखापाल / जाँच गर्ने
            </div>
            <div class="sig-col">
              कर्मचारीको दस्तखत
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Annual Report Aggregations
  const annualSummary = useMemo(() => {
    const yearReceipts = allSalaryReceipts.filter(r => r.fiscalYear === selectedFiscalYear);
    
    // Month-wise summary
    const monthStats = NEPALI_MONTHS.map(m => {
      const receipt = yearReceipts.find(r => r.month === m.code);
      return {
        ...m,
        isCreated: !!receipt,
        employeeCount: receipt?.employees?.length || 0,
        grossSalary: receipt?.totalGrossSalary || 0,
        totalDeductions: receipt?.totalDeductions || 0,
        netPayable: receipt?.totalNetPayable || 0,
        receipt
      };
    });

    // Employee-wise annual summary
    const empMap = new Map<string, {
      name: string;
      designation: string;
      level: string;
      monthsCount: number;
      totalBasic: number;
      totalGross: number;
      totalPF: number;
      totalCIT: number;
      totalTax: number;
      totalDeductions: number;
      totalNet: number;
    }>();

    yearReceipts.forEach(r => {
      (r.employees || []).forEach(emp => {
        const key = emp.userId || emp.employeeName;
        const existing = empMap.get(key) || {
          name: emp.employeeName,
          designation: emp.designation,
          level: emp.level || '',
          monthsCount: 0,
          totalBasic: 0,
          totalGross: 0,
          totalPF: 0,
          totalCIT: 0,
          totalTax: 0,
          totalDeductions: 0,
          totalNet: 0
        };

        existing.monthsCount += 1;
        existing.totalBasic += Number(emp.totalBasicSalary) || 0;
        existing.totalGross += Number(emp.grossSalary) || 0;
        existing.totalPF += Number(emp.providentFund) || 0;
        existing.totalCIT += Number(emp.citDeduction) || 0;
        existing.totalTax += Number(emp.taxDeduction) || 0;
        existing.totalDeductions += Number(emp.totalDeductions) || 0;
        existing.totalNet += Number(emp.netPayable) || 0;

        empMap.set(key, existing);
      });
    });

    const totalAnnualGross = monthStats.reduce((sum, m) => sum + m.grossSalary, 0);
    const totalAnnualDeductions = monthStats.reduce((sum, m) => sum + m.totalDeductions, 0);
    const totalAnnualNet = monthStats.reduce((sum, m) => sum + m.netPayable, 0);

    return {
      monthStats,
      employeeStats: Array.from(empMap.values()),
      totalAnnualGross,
      totalAnnualDeductions,
      totalAnnualNet,
      monthsGeneratedCount: yearReceipts.length
    };
  }, [allSalaryReceipts, selectedFiscalYear]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 shrink-0">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                तलबी भरपाई तथा प्रतिवेदन
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                आ.व. {toNepaliNumber(selectedFiscalYear)}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              कार्यालयका कर्मचारीहरूको मासिक तलब भरपाई, पे-स्लिप तथा वार्षिक तलब खर्च प्रतिवेदन
            </p>
          </div>
        </div>

        {/* Fiscal Year & Quick Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">आर्थिक वर्ष:</span>
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {FISCAL_YEARS.map(fy => (
                <option key={fy.id} value={fy.value}>{fy.label}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('monthly_bharpai')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'monthly_bharpai'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मासिक तलबी भरपाई
            </button>
            <button
              onClick={() => setActiveTab('annual_report')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'annual_report'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              वार्षिक प्रतिवेदन
            </button>
            <button
              onClick={() => setActiveTab('salary_scales')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'salary_scales'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase size={14} />
              <span>पद / सुरु तलब स्केल ({toNepaliNumber(salaryScales.length)})</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Tab 1: Monthly Bharpai */}
      {activeTab === 'monthly_bharpai' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={14} /> महिना छनोट गर्नुहोस्:
              </span>
              <span className="text-xs text-slate-500 font-medium">
                भरपाई बनेको: <b>{toNepaliNumber(allSalaryReceipts.filter(r => r.fiscalYear === selectedFiscalYear).length)}</b> / १२ महिना
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {NEPALI_MONTHS.map(m => {
                const hasReceipt = allSalaryReceipts.some(r => r.fiscalYear === selectedFiscalYear && r.month === m.code);
                const isSelected = selectedMonthCode === m.code;

                return (
                  <button
                    key={m.code}
                    onClick={() => setSelectedMonthCode(m.code)}
                    className={`relative p-2.5 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-200'
                        : hasReceipt
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-black">{m.shortName}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-red-700 text-white'
                        : hasReceipt
                        ? 'bg-emerald-200 text-emerald-900 font-bold'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {hasReceipt ? 'तयार' : 'बाँकी'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bharpai Header Settings & Actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <FileText className="text-red-600" size={20} />
                  {NEPALI_MONTHS.find(m => m.code === selectedMonthCode)?.name} महिनाको तलबी भरपाई
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  भरपाई विवरण सम्पादन गरी सुरक्षित र प्रिन्ट गर्नुहोस्
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAutoLoadEmployees}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5"
                  title="कार्यालयका सबै कर्मचारीहरू पदानुक्रम अनुसार स्वतः लोड गर्नुहोस्"
                >
                  <Users size={15} /> कर्मचारी लोड
                </button>
                {employeesList.length > 1 && (
                  <button
                    onClick={handleSortEmployeesByHierarchy}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors flex items-center gap-1.5"
                    title="कर्मचारीहरूलाई कार्यालय पदानुक्रम (Hierarchy Order) अनुसार पुन: क्रमबद्ध गर्नुहोस्"
                  >
                    <ArrowUpDown size={15} /> पदानुक्रम मिलाउनुहोस्
                  </button>
                )}
                <button
                  onClick={handleCopyFromPreviousMonth}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1.5"
                  title="अघिल्लो महिनाको भरपाईबाट डाटा कपी गर्नुहोस्"
                >
                  <Copy size={15} /> अघिल्लो महिना कपी
                </button>
                <button
                  onClick={() => {
                    setEditingEmployeeItem(null);
                    setEmpForm({
                      employeeName: '',
                      designation: '',
                      level: '',
                      employeeCode: '',
                      bankAccountNumber: '',
                      bankName: '',
                      panNumber: '',
                      citNumber: '',
                      pfNumber: '',
                      serviceType: 'Permanent',
                      basicScale: 0,
                      gradeCount: 0,
                      gradeRate: 0,
                      gradeAmount: 0,
                      totalBasicSalary: 0,
                      dearnessAllowance: 0,
                      incentiveAllowance: 0,
                      fieldAllowance: 0,
                      dressAllowance: 0,
                      medicalAllowance: 0,
                      otherAllowances: 0,
                      grossSalary: 0,
                      providentFund: 0,
                      citDeduction: 0,
                      insuranceDeduction: 0,
                      taxDeduction: 0,
                      loanOrAdvanceDeduction: 0,
                      otherDeductions: 0,
                      totalDeductions: 0,
                      netPayable: 0,
                      remarks: ''
                    });
                    setIsAddEmployeeModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus size={15} /> नयाँ कर्मचारी थप्नुहोस्
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={employeesList.length === 0}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download size={15} /> Excel
                </button>
                <button
                  onClick={handlePrintMonthlyBharpai}
                  disabled={employeesList.length === 0}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Printer size={15} /> भरपाई प्रिन्ट (A4)
                </button>
                <button
                  onClick={handlePostToLekhaPrashasan}
                  disabled={employeesList.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="यो तलबी भरपाईको कुल खुद रकम लेखा प्रशासनमा खर्चको रूपमा पोस्ट गर्नुहोस्"
                >
                  <DollarSign size={15} /> लेखामा खर्च पोस्ट
                </button>
              </div>
            </div>

            {/* Meta Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">भरपाई/निकासा मिति (BS):</label>
                <NepaliDatePicker
                  value={currentReceiptDate}
                  onChange={(val) => setCurrentReceiptDate(val)}
                  placeholder="२०८१-०४-२५"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">भरपाई / निकासा नं.:</label>
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="PAY-01"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">बजेट उपशीर्षक / खर्च शीर्षक:</label>
                <Input
                  value={budgetHeadName}
                  onChange={(e) => setBudgetHeadName(e.target.value)}
                  placeholder="२११११ - कर्मचारी पारिश्रमिक"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम र बैंक:</label>
                <div className="flex gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="Bank">बैंक ट्रान्सफर</option>
                    <option value="Cash">नगद (Cash)</option>
                    <option value="Cheque">चेक (Cheque)</option>
                  </select>
                  <Input
                    className="w-1/2"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="बैंकको नाम"
                  />
                </div>
              </div>
              {paymentMethod === 'Cheque' && (
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">चेक नं. (Cheque No.):</label>
                  <Input
                    value={chequeOrVoucherNo}
                    onChange={(e) => setChequeOrVoucherNo(e.target.value)}
                    placeholder="चेक नं. प्रविष्ट गर्नुहोस्"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Salary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-2.5 text-center w-10">क्र.सं.</th>
                    <th className="p-2.5 min-w-[150px]">कर्मचारीको विवरण</th>
                    <th className="p-2.5 min-w-[120px]">संकेत / बैंक खाता</th>
                    <th className="p-2.5 text-right">सुरु तलब</th>
                    <th className="p-2.5 text-right">ग्रेड रकम</th>
                    <th className="p-2.5 text-right bg-slate-100/60">जम्मा तलब</th>
                    <th className="p-2.5 text-right">महङ्गी भत्ता</th>
                    <th className="p-2.5 text-right">अन्य भत्ता</th>
                    <th className="p-2.5 text-right bg-blue-50/60 font-black text-blue-900">कुल तलब (Gross)</th>
                    <th className="p-2.5 text-right">क.सं.को.</th>
                    <th className="p-2.5 text-right">ना.ल.को.</th>
                    <th className="p-2.5 text-right">बीमा/TDS</th>
                    <th className="p-2.5 text-right bg-red-50/60 font-bold text-red-900">कुल कट्टी</th>
                    <th className="p-2.5 text-right bg-emerald-50 font-black text-emerald-900 min-w-[110px]">खुद भुक्तानी (Net)</th>
                    <th className="p-2.5 text-center min-w-[110px]">कार्य / स्लिप</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeesList.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 text-center font-bold text-slate-500">{toNepaliNumber(index + 1)}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-800">{emp.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{emp.designation} {emp.level ? `(${emp.level})` : ''}</div>
                        <span className="inline-block px-1.5 py-0.2 mt-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {emp.serviceType === 'Permanent' ? 'स्थायी' : emp.serviceType === 'Contract' ? 'करार' : emp.serviceType}
                        </span>
                      </td>
                      <td className="p-2.5 text-[11px] space-y-0.5">
                        {emp.employeeCode && <div>संकेत: <b>{emp.employeeCode}</b></div>}
                        {emp.bankAccountNumber && <div>खाता: <span className="font-mono text-slate-600">{emp.bankAccountNumber}</span></div>}
                        {emp.panNumber && <div>PAN: <span className="font-mono text-slate-600">{emp.panNumber}</span></div>}
                      </td>
                      <td className="p-2.5 text-right font-medium">{toNepaliNumber(emp.basicScale.toLocaleString())}</td>
                      <td className="p-2.5 text-right text-slate-600">{toNepaliNumber(emp.gradeAmount.toLocaleString())}</td>
                      <td className="p-2.5 text-right font-bold bg-slate-50">{toNepaliNumber(emp.totalBasicSalary.toLocaleString())}</td>
                      <td className="p-2.5 text-right">{toNepaliNumber(emp.dearnessAllowance.toLocaleString())}</td>
                      <td className="p-2.5 text-right text-slate-600">
                        {toNepaliNumber(((emp.incentiveAllowance || 0) + (emp.fieldAllowance || 0) + (emp.dressAllowance || 0) + (emp.otherAllowances || 0)).toLocaleString())}
                      </td>
                      <td className="p-2.5 text-right font-black text-blue-900 bg-blue-50/40">
                        {toNepaliNumber(emp.grossSalary.toLocaleString())}
                      </td>
                      <td className="p-2.5 text-right text-slate-600">{toNepaliNumber(emp.providentFund.toLocaleString())}</td>
                      <td className="p-2.5 text-right text-slate-600">{toNepaliNumber(emp.citDeduction.toLocaleString())}</td>
                      <td className="p-2.5 text-right text-slate-600">{toNepaliNumber(((emp.insuranceDeduction || 0) + (emp.taxDeduction || 0)).toLocaleString())}</td>
                      <td className="p-2.5 text-right font-bold text-red-700 bg-red-50/40">
                        {toNepaliNumber(emp.totalDeductions.toLocaleString())}
                      </td>
                      <td className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/60 text-sm">
                        {toNepaliNumber(emp.netPayable.toLocaleString())}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrintPaySlip(emp)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="पे-स्लिप प्रिन्ट गर्नुहोस्"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmployeeItem(emp);
                              setEmpForm({ ...emp });
                              setIsAddEmployeeModalOpen(true);
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleRemoveEmployee(emp.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="हटाउनुहोस्"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {employeesList.length === 0 && (
                    <tr>
                      <td colSpan={15} className="p-12 text-center text-slate-400 font-medium">
                        <Users size={36} className="mx-auto mb-2 text-slate-300" />
                        कुनै कर्मचारीको पारिश्रमिक थपिएको छैन। माथिको <b>'कर्मचारी लोड'</b> वा <b>'नयाँ कर्मचारी थप्नुहोस्'</b> बटन क्लिक गर्नुहोस्।
                      </td>
                    </tr>
                  )}
                </tbody>
                {employeesList.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-black border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={3} className="p-3 text-center">जम्मा कुल योग (Grand Total)</td>
                      <td className="p-3 text-right">{toNepaliNumber(grandTotals.totalBasicScale.toLocaleString())}</td>
                      <td className="p-3 text-right">{toNepaliNumber(grandTotals.totalGradeAmount.toLocaleString())}</td>
                      <td className="p-3 text-right bg-slate-200/60">{toNepaliNumber(grandTotals.totalBasicSalary.toLocaleString())}</td>
                      <td className="p-3 text-right">{toNepaliNumber(grandTotals.totalDearness.toLocaleString())}</td>
                      <td className="p-3 text-right">{toNepaliNumber((grandTotals.totalIncentive + grandTotals.totalField + grandTotals.totalDress + grandTotals.totalOtherAllowances).toLocaleString())}</td>
                      <td className="p-3 text-right bg-blue-100/60 text-blue-950 font-black">{toNepaliNumber(grandTotals.totalGross.toLocaleString())}</td>
                      <td className="p-3 text-right">{toNepaliNumber(grandTotals.totalPF.toLocaleString())}</td>
                      <td className="p-3 text-right">{toNepaliNumber(grandTotals.totalCIT.toLocaleString())}</td>
                      <td className="p-3 text-right">{toNepaliNumber((grandTotals.totalInsurance + grandTotals.totalTax).toLocaleString())}</td>
                      <td className="p-3 text-right bg-red-100/60 text-red-950 font-black">{toNepaliNumber(grandTotals.totalDeductions.toLocaleString())}</td>
                      <td className="p-3 text-right bg-emerald-100 text-emerald-950 font-black text-sm">{toNepaliNumber(grandTotals.totalNetPayable.toLocaleString())}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Summary In Words */}
            {employeesList.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700">अक्षरेपी कुल खुद भुक्तानी रकम:</span>{' '}
                  <span className="font-extrabold text-emerald-800 font-nepali text-sm">
                    {numberToNepaliWords(grandTotals.totalNetPayable)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">कर्मचारी संख्या: <b>{toNepaliNumber(employeesList.length)}</b> जना</span>
                </div>
              </div>
            )}
          </div>

          {/* Signatures & Bottom Save Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              प्रमाणिकरण तथा हस्ताक्षरकर्ता विवरण:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block border-b pb-1">१. तयार गर्ने (Prepared By):</span>
                <div>
                  <label className="text-[11px] text-slate-500">नाम:</label>
                  <Input value={preparedByName} onChange={(e) => setPreparedByName(e.target.value)} placeholder="कर्मचारीको नाम" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">पद:</label>
                  <Input value={preparedByDesignation} onChange={(e) => setPreparedByDesignation(e.target.value)} placeholder="पद" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block border-b pb-1">२. जाँच / पेश गर्ने (Accountant):</span>
                <div>
                  <label className="text-[11px] text-slate-500">नाम:</label>
                  <Input value={verifiedByName} onChange={(e) => setVerifiedByName(e.target.value)} placeholder="लेखापालको नाम" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">पद:</label>
                  <Input value={verifiedByDesignation} onChange={(e) => setVerifiedByDesignation(e.target.value)} placeholder="पद" />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block border-b pb-1">३. स्वीकृत गर्ने (Approved By / Office Head):</span>
                <div>
                  <label className="text-[11px] text-slate-500">नाम:</label>
                  <Input value={approvedByName} onChange={(e) => setApprovedByName(e.target.value)} placeholder="कार्यालय प्रमुखको नाम" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">पद:</label>
                  <Input value={approvedByDesignation} onChange={(e) => setApprovedByDesignation(e.target.value)} placeholder="पद" />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div>
                {currentMonthReceipt && (
                  <button
                    onClick={handleDeleteReceipt}
                    className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold border border-red-200 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={15} /> भरपाई रद्द/हटाउनुहोस्
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handlePrintMonthlyBharpai}
                  disabled={employeesList.length === 0}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} /> प्रिन्ट भरपाई
                </button>
                <button
                  onClick={handleSaveReceipt}
                  disabled={employeesList.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} /> भरपाई सुरक्षित गर्नुहोस्
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 2: Annual Report */}
      {activeTab === 'annual_report' && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">आ.व. भरपाई स्थिति</span>
              <div className="text-2xl font-black text-slate-800">
                {toNepaliNumber(annualSummary.monthsGeneratedCount)} / १२ महिना
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {annualSummary.monthsGeneratedCount === 12 ? 'सबै महिनाको भरपाई सम्पन्न' : `${toNepaliNumber(12 - annualSummary.monthsGeneratedCount)} महिना बाँकी`}
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-blue-100 bg-blue-50/20 shadow-xs">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">वार्षिक कुल तलब खर्च (Gross)</span>
              <div className="text-2xl font-black text-blue-900">
                रु. {toNepaliNumber(annualSummary.totalAnnualGross.toLocaleString())}
              </div>
              <span className="text-xs text-blue-600 mt-1 block">सुरु तलब + ग्रेड + भत्ताहरू</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-red-100 bg-red-50/20 shadow-xs">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1">वार्षिक कुल कट्टी (Deductions)</span>
              <div className="text-2xl font-black text-red-900">
                रु. {toNepaliNumber(annualSummary.totalAnnualDeductions.toLocaleString())}
              </div>
              <span className="text-xs text-red-600 mt-1 block">क.सं.को., ना.ल.को., बीमा र कर</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">वार्षिक खुद भुक्तानी (Net Disbursed)</span>
              <div className="text-2xl font-black text-emerald-900">
                रु. {toNepaliNumber(annualSummary.totalAnnualNet.toLocaleString())}
              </div>
              <span className="text-xs text-emerald-600 mt-1 block">कर्मचारीको बैंक खातामा गएको</span>
            </div>
          </div>

          {/* Month-wise Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-base font-black text-slate-800">
              महिनागत तलब निकासा तथा खर्च विवरण (Month-wise Breakdown)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">महिना</th>
                    <th className="p-2.5 text-center">स्थिति</th>
                    <th className="p-2.5 text-center">कर्मचारी संख्या</th>
                    <th className="p-2.5 text-right">कुल तलब (Gross)</th>
                    <th className="p-2.5 text-right">कुल कट्टी (Deductions)</th>
                    <th className="p-2.5 text-right">पाउने खुद रकम (Net)</th>
                    <th className="p-2.5 text-center">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {annualSummary.monthStats.map(m => (
                    <tr key={m.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-bold text-slate-800">{m.name}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.isCreated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {m.isCreated ? 'भरपाई तयार' : 'बाँकी'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">{m.isCreated ? `${toNepaliNumber(m.employeeCount)} जना` : '-'}</td>
                      <td className="p-2.5 text-right font-semibold">{m.isCreated ? `रु. ${toNepaliNumber(m.grossSalary.toLocaleString())}` : '-'}</td>
                      <td className="p-2.5 text-right text-red-700">{m.isCreated ? `रु. ${toNepaliNumber(m.totalDeductions.toLocaleString())}` : '-'}</td>
                      <td className="p-2.5 text-right font-black text-emerald-800">{m.isCreated ? `रु. ${toNepaliNumber(m.netPayable.toLocaleString())}` : '-'}</td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedMonthCode(m.code);
                            setActiveTab('monthly_bharpai');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          हेर्नुहोस् →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={3} className="p-3 text-center">वार्षिक कुल योग (Annual Total)</td>
                    <td className="p-3 text-right">रु. {toNepaliNumber(annualSummary.totalAnnualGross.toLocaleString())}</td>
                    <td className="p-3 text-right text-red-800">रु. {toNepaliNumber(annualSummary.totalAnnualDeductions.toLocaleString())}</td>
                    <td className="p-3 text-right text-emerald-900 text-sm">रु. {toNepaliNumber(annualSummary.totalAnnualNet.toLocaleString())}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Employee-wise Annual Summary */}
          {annualSummary.employeeStats.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <h3 className="text-base font-black text-slate-800">
                कर्मचारीगत वार्षिक पारिश्रमिक तथा कर सारांश (Employee-wise Annual Summary)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center">क्र.सं.</th>
                      <th className="p-2.5">कर्मचारीको नाम</th>
                      <th className="p-2.5">पद / तह</th>
                      <th className="p-2.5 text-center">भुक्तानी महिना</th>
                      <th className="p-2.5 text-right">वार्षिक कुल तलब</th>
                      <th className="p-2.5 text-right">वार्षिक क.सं.को.</th>
                      <th className="p-2.5 text-right">वार्षिक ना.ल.को.</th>
                      <th className="p-2.5 text-right">वार्षिक कर/TDS</th>
                      <th className="p-2.5 text-right">वार्षिक कुल कट्टी</th>
                      <th className="p-2.5 text-right font-black text-emerald-900">वार्षिक खुद भुक्तानी</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {annualSummary.employeeStats.map((emp, idx) => (
                      <tr key={emp.name} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 text-center text-slate-500 font-bold">{toNepaliNumber(idx + 1)}</td>
                        <td className="p-2.5 font-bold text-slate-800">{emp.name}</td>
                        <td className="p-2.5 text-slate-600">{emp.designation} {emp.level ? `(${emp.level})` : ''}</td>
                        <td className="p-2.5 text-center font-semibold">{toNepaliNumber(emp.monthsCount)} महिना</td>
                        <td className="p-2.5 text-right font-semibold">रु. {toNepaliNumber(emp.totalGross.toLocaleString())}</td>
                        <td className="p-2.5 text-right text-slate-600">रु. {toNepaliNumber(emp.totalPF.toLocaleString())}</td>
                        <td className="p-2.5 text-right text-slate-600">रु. {toNepaliNumber(emp.totalCIT.toLocaleString())}</td>
                        <td className="p-2.5 text-right text-slate-600">रु. {toNepaliNumber(emp.totalTax.toLocaleString())}</td>
                        <td className="p-2.5 text-right text-red-700 font-semibold">रु. {toNepaliNumber(emp.totalDeductions.toLocaleString())}</td>
                        <td className="p-2.5 text-right font-black text-emerald-800">रु. {toNepaliNumber(emp.totalNet.toLocaleString())}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tab 3: Designation Salary Scales (पद तथा सुरु तलब स्केल) */}
      {activeTab === 'salary_scales' && (
        <div className="space-y-6">
          {/* Top Banner and Quick Add */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-700 rounded-lg">
                  <Briefcase size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-800">
                  पद अनुसार सुरु तलब स्केल (Designation Salary Scale Setup)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                यहाँ प्रत्येक पद अनुसार सुरु तलब स्केल (Basic Scale), प्रति ग्रेड दर, महङ्गी भत्ता तथा अन्य सुविधाहरू सुरक्षित गर्नुहोस्। यो डाटाबेसमा रहनेछ र नयाँ कर्मचारी छान्दा स्वतः सुरु तलब आउनेछ।
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSeedStandardScales}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5"
                title="स्वास्थ्य तथा निजामती सेवाको मानक स्केलहरू लोड गर्नुहोस्"
              >
                <Sparkles size={15} /> मानक तलब स्केल लोड गर्नुहोस्
              </button>
              <button
                onClick={() => {
                  setEditingScale(null);
                  setScaleForm({
                    designation: '',
                    level: '',
                    basicScale: 0,
                    gradeRate: 0,
                    dearnessAllowance: 2000,
                    fieldAllowance: 0,
                    dressAllowance: 0,
                    remarks: ''
                  });
                  setIsScaleModalOpen(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus size={15} /> नयाँ पद / तलब स्केल थप्नुहोस्
              </button>
            </div>
          </div>

          {/* Salary Scales Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700">
                कुल सुरक्षित पदहरू: <b>{toNepaliNumber(salaryScales.length)}</b> वटा
              </span>
              <span className="text-[11px] text-slate-500">
                💡 नयाँ कर्मचारी दर्ता गर्दा वा युजर छान्दा यो सुरु तलब स्वतः फारममा भरिन्छ।
              </span>
            </div>

            {salaryScales.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Briefcase size={40} className="mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">हाल कुनै पनि पदको तलब स्केल दर्ता गरिएको छैन।</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  तपाईं "मानक तलब स्केल लोड गर्नुहोस्" मा क्लिक गरेर स्वास्थ्य सेवाका मानक पदहरू एकैपटक सुरक्षित गर्न सक्नुहुन्छ वा नयाँ पद थप्न सक्नुहुन्छ।
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleSeedStandardScales}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles size={15} /> मानक तलब स्केलहरू लोड गर्नुहोस्
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center">क्र.सं.</th>
                      <th className="p-3">पद (Designation)</th>
                      <th className="p-3">तह / श्रेणी (Level)</th>
                      <th className="p-3 text-right">सुरु तलब स्केल (Basic Scale)</th>
                      <th className="p-3 text-right">प्रति ग्रेड दर (Grade Rate)</th>
                      <th className="p-3 text-right">महङ्गी भत्ता</th>
                      <th className="p-3 text-right">फिल्ड / पोशाक</th>
                      <th className="p-3">कैफियत</th>
                      <th className="p-3 text-center">कार्य (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryScales.map((scale, idx) => (
                      <tr key={scale.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-500">{toNepaliNumber(idx + 1)}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 text-sm">{scale.designation}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                            {scale.level || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 text-sm">
                          रु. {toNepaliNumber((scale.basicScale || 0).toLocaleString())}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-600">
                          रु. {toNepaliNumber((scale.gradeRate || Math.round((scale.basicScale || 0) / 30)).toLocaleString())}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-600">
                          रु. {toNepaliNumber((scale.dearnessAllowance !== undefined ? scale.dearnessAllowance : 2000).toLocaleString())}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          रु. {toNepaliNumber(((scale.fieldAllowance || 0) + (scale.dressAllowance || 0)).toLocaleString())}
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{scale.remarks || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingScale(scale);
                                setScaleForm(scale);
                                setIsScaleModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="सम्पादन गर्नुहोस्"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteSalaryScale(scale.id, scale.designation)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="मेटाउनुहोस्"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Salary Scale Modal */}
      {isScaleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 relative animate-in zoom-in-95">
            <button
              onClick={() => setIsScaleModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
              <Briefcase className="text-red-600" size={22} />
              {editingScale ? 'पद तथा सुरु तलब स्केल सम्पादन' : 'नयाँ पद तथा सुरु तलब स्केल प्रविष्टि'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              पदको नाम र सुरु तलब स्केल सुरक्षित गर्नुहोस्, जुन डाटाबेसमा रहनेछ।
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">पद (Designation) *:</label>
                <Input
                  value={scaleForm.designation || ''}
                  onChange={(e) => setScaleForm(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="जस्तै: हेल्थ असिस्टेन्ट / अ.न.मी. / एम्बुलेन्स चालक"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">तह / श्रेणी (Level):</label>
                <Input
                  value={scaleForm.level || ''}
                  onChange={(e) => setScaleForm(prev => ({ ...prev, level: e.target.value }))}
                  placeholder="जस्तै: पाँचौं तह / चौथो तह / श्रेणी विहीन"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">सुरु तलब स्केल (Basic Scale) *:</label>
                  <Input
                    type="number"
                    value={scaleForm.basicScale || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setScaleForm(prev => ({
                        ...prev,
                        basicScale: val,
                        gradeRate: prev?.gradeRate || Math.round(val / 30)
                      }));
                    }}
                    placeholder="जस्तै: 32902"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">प्रति ग्रेड दर (Grade Rate):</label>
                  <Input
                    type="number"
                    value={scaleForm.gradeRate || 0}
                    onChange={(e) => setScaleForm(prev => ({ ...prev, gradeRate: parseFloat(e.target.value) || 0 }))}
                    placeholder="सुरु तलब / ३०"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">महङ्गी भत्ता:</label>
                  <Input
                    type="number"
                    value={scaleForm.dearnessAllowance ?? 2000}
                    onChange={(e) => setScaleForm(prev => ({ ...prev, dearnessAllowance: parseFloat(e.target.value) || 0 }))}
                    placeholder="2000"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">फिल्ड भत्ता:</label>
                  <Input
                    type="number"
                    value={scaleForm.fieldAllowance || 0}
                    onChange={(e) => setScaleForm(prev => ({ ...prev, fieldAllowance: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">पोशाक भत्ता:</label>
                  <Input
                    type="number"
                    value={scaleForm.dressAllowance || 0}
                    onChange={(e) => setScaleForm(prev => ({ ...prev, dressAllowance: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कैफियत (Remarks):</label>
                <Input
                  value={scaleForm.remarks || ''}
                  onChange={(e) => setScaleForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="कुनै थप जानकारी भए..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsScaleModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                onClick={handleSaveSalaryScale}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                {editingScale ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'डाटाबेसमा सुरक्षित गर्नुहोस्'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative my-8 p-6 animate-in zoom-in-95">
            <button
              onClick={() => setIsAddEmployeeModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
              <Users className="text-red-600" size={22} />
              {editingEmployeeItem ? 'कर्मचारी पारिश्रमिक विवरण संशोधन' : 'नयाँ कर्मचारी तथा पारिश्रमिक प्रविष्टि'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              कर्मचारीको पद, सुरु तलब, ग्रेड, भत्ताहरू र कट्टी विवरण भर्नुहोस् (स्वतः हिसाब हुनेछ)
            </p>

            <div className="space-y-4 text-xs">
              {/* Basic Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                    कर्मचारी विवरण (Personal & Official Info)
                  </span>
                  {relevantOfficeUsers.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-semibold">युजरबाट छान्नुहोस्:</span>
                      <select
                        onChange={(e) => {
                          const selectedUser = relevantOfficeUsers.find(u => (u.id || u.fullName) === e.target.value);
                          if (selectedUser) {
                            const uName = selectedUser.fullName || '';
                            const uDesig = selectedUser.designation || '';
                            const isDriver = isAmbulanceDriver(uDesig, uName);
                            const driverIncentivePercent = Number(generalSettings?.ambulanceDriverIncentivePercent) || 15;

                            let autoIncentive = 0;
                            if (isDriver) {
                              const incentiveRes = getDriverMonthlyIncentive(
                                ambulanceRecords,
                                uName,
                                selectedFiscalYear,
                                selectedMonthCode,
                                driverIncentivePercent
                              );
                              autoIncentive = incentiveRes.incentiveAmount;
                              setDriverIncentiveDebugInfo({
                                isDriver: true,
                                tripCount: incentiveRes.tripCount,
                                totalFare: incentiveRes.totalFare,
                                incentiveAmount: incentiveRes.incentiveAmount,
                                percent: driverIncentivePercent,
                                driverName: uName,
                                checked: true
                              });
                            } else {
                              setDriverIncentiveDebugInfo(null);
                            }

                            // Check matched salary scale for designation
                            const cleanDesig = uDesig.trim().toLowerCase();
                            const matchedScale = salaryScales.find(s => s.designation && s.designation.trim().toLowerCase() === cleanDesig)
                              || salaryScales.find(s => s.designation && (
                                cleanDesig.includes(s.designation.trim().toLowerCase()) ||
                                s.designation.trim().toLowerCase().includes(cleanDesig)
                              ));

                            setEmpForm(prev => {
                              const bScale = matchedScale ? Number(matchedScale.basicScale) : prev.basicScale;
                              const gRate = matchedScale ? (Number(matchedScale.gradeRate) || Math.round((Number(matchedScale.basicScale) || 0) / 30)) : prev.gradeRate;
                              const gCount = prev.gradeCount || 0;
                              const gAmount = gCount * (gRate || 0);

                              const updated = {
                                ...prev,
                                userId: selectedUser.id || '',
                                employeeName: uName,
                                designation: uDesig,
                                level: selectedUser.level || matchedScale?.level || prev.level || '',
                                employeeCode: selectedUser.employeeCode || selectedUser.employeeId || '',
                                bankAccountNumber: selectedUser.bankAccountNumber || '',
                                bankName: selectedUser.bankName || '',
                                panNumber: selectedUser.panNumber || '',
                                citNumber: selectedUser.citNumber || '',
                                pfNumber: selectedUser.pfNumber || '',
                                basicScale: bScale,
                                gradeRate: gRate,
                                gradeAmount: gAmount,
                                dearnessAllowance: matchedScale?.dearnessAllowance !== undefined ? Number(matchedScale.dearnessAllowance) : (prev.dearnessAllowance ?? 2000),
                                fieldAllowance: matchedScale?.fieldAllowance !== undefined ? Number(matchedScale.fieldAllowance) : (prev.fieldAllowance || 0),
                                dressAllowance: matchedScale?.dressAllowance !== undefined ? Number(matchedScale.dressAllowance) : (prev.dressAllowance || 0)
                              };
                              if (isDriver) {
                                updated.incentiveAllowance = autoIncentive;
                              }
                              return updated;
                            });
                          }
                        }}
                        defaultValue=""
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                      >
                        <option value="" disabled>-- कार्यालयका कर्मचारी छान्नुहोस् --</option>
                        {relevantOfficeUsers.map(u => (
                          <option key={u.id || u.fullName} value={u.id || u.fullName}>
                            {u.fullName} ({u.designation || 'पद नखुलेको'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">कर्मचारीको नाम *:</label>
                    <Input
                      value={empForm.employeeName || ''}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, employeeName: e.target.value }))}
                      placeholder="श्री राम बहादुर थापा"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">पद (Designation) *:</label>
                      {salaryScales.length > 0 && (
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {toNepaliNumber(salaryScales.length)} पद सुरक्षित
                        </span>
                      )}
                    </div>
                    {salaryScales.length > 0 && (
                      <div className="mb-1.5">
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              applyScaleToEmpForm(val);
                            }
                          }}
                          defaultValue=""
                          className="w-full px-2 py-1.5 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- दर्ता भएका पदबाट छान्नुहोस् (स्वतः सुरु तलब भरिनेछ) --</option>
                          {salaryScales.map(s => (
                            <option key={s.id} value={s.designation}>
                              {s.designation} {s.level ? `(${s.level})` : ''} - सुरु स्केल रु. {toNepaliNumber((s.basicScale || 0).toLocaleString())}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        list="designation-suggestions"
                        value={empForm.designation || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmpForm(prev => ({ ...prev, designation: val }));
                          // Auto match as user types
                          applyScaleToEmpForm(val);
                        }}
                        placeholder="हे.अ. / अ.न.मी. / अधिकृत / एम्बुलेन्स चालक"
                      />
                      <datalist id="designation-suggestions">
                        {salaryScales.map(s => (
                          <option key={s.id} value={s.designation}>
                            {s.level ? `${s.level} - ` : ''}सुरु तलब रु. {toNepaliNumber((s.basicScale || 0).toLocaleString())}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">तह / श्रेणी (Level):</label>
                    <Input
                      value={empForm.level || ''}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, level: e.target.value }))}
                      placeholder="पाँचौं तह / छैटौं तह"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">सेवाको किसिम:</label>
                    <select
                      value={empForm.serviceType || 'Permanent'}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, serviceType: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      {SERVICE_TYPES.map(st => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">कर्मचारी संकेत नं.:</label>
                    <Input
                      value={empForm.employeeCode || ''}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, employeeCode: e.target.value }))}
                      placeholder="१२३४५"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">स्थायी लेखा नं. (PAN):</label>
                    <Input
                      value={empForm.panNumber || ''}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, panNumber: e.target.value }))}
                      placeholder="१०१२३४५६७"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">बैंकको नाम:</label>
                    <Input
                      value={empForm.bankName || ''}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="राष्ट्रिय वाणिज्य बैंक"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">बैंक खाता नम्बर:</label>
                    <Input
                      value={empForm.bankAccountNumber || ''}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                      placeholder="1234000000000001"
                    />
                  </div>
                </div>
              </div>

              {/* Earnings & Allowances */}
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200 space-y-3">
                <span className="font-bold text-blue-900 uppercase tracking-wider block text-[11px]">
                  पारिश्रमिक तथा भत्ता विवरण (Salary & Allowances)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">सुरु तलब स्केल (Basic Scale):</label>
                      {(() => {
                        const matched = salaryScales.find(s => s.designation && empForm.designation && s.designation.trim().toLowerCase() === empForm.designation.trim().toLowerCase());
                        if (matched) {
                          return (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                              <Sparkles size={11} /> दरबन्दी अनुसार
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <Input
                      type="number"
                      value={empForm.basicScale || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEmpForm(prev => ({
                          ...prev,
                          basicScale: val,
                          gradeRate: prev?.gradeRate || Math.round(val / 30)
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ग्रेड सङ्ख्या:</label>
                    <Input
                      type="number"
                      value={empForm.gradeCount || 0}
                      onChange={(e) => {
                        const count = parseFloat(e.target.value) || 0;
                        setEmpForm(prev => {
                          const rate = prev?.gradeRate || Math.round((prev?.basicScale || 0) / 30);
                          return {
                            ...prev,
                            gradeCount: count,
                            gradeRate: rate,
                            gradeAmount: count * rate
                          };
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ग्रेड रकम (Grade Amount):</label>
                    <Input
                      type="number"
                      value={empForm.gradeAmount || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, gradeAmount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">महङ्गी भत्ता (Dearness):</label>
                    <Input
                      type="number"
                      value={empForm.dearnessAllowance || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, dearnessAllowance: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">प्रोत्साहन भत्ता (Incentive):</label>
                      {isAmbulanceDriver(empForm.designation, empForm.employeeName) && (
                        <button
                          type="button"
                          onClick={() => {
                            const driverIncentivePercent = Number(generalSettings?.ambulanceDriverIncentivePercent) || 15;
                            const res = getDriverMonthlyIncentive(
                              ambulanceRecords,
                              empForm.employeeName || '',
                              selectedFiscalYear,
                              selectedMonthCode,
                              driverIncentivePercent
                            );
                            setEmpForm(prev => ({ ...prev, incentiveAllowance: res.incentiveAmount }));
                            setDriverIncentiveDebugInfo({
                              isDriver: true,
                              tripCount: res.tripCount,
                              totalFare: res.totalFare,
                              incentiveAmount: res.incentiveAmount,
                              percent: driverIncentivePercent,
                              driverName: empForm.employeeName || '',
                              checked: true
                            });
                          }}
                          className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                          title="एम्बुलेन्स ट्रिप रेकर्डबाट पुनः गणना गर्नुहोस्"
                        >
                          <RefreshCw size={11} /> पुनः गणना
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      value={empForm.incentiveAllowance || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, incentiveAllowance: parseFloat(e.target.value) || 0 }))}
                    />
                    {isAmbulanceDriver(empForm.designation, empForm.employeeName) && (
                      <div className="mt-1.5 text-[11px]">
                        {(() => {
                          const driverIncentivePercent = Number(generalSettings?.ambulanceDriverIncentivePercent) || 15;
                          const currentRes = getDriverMonthlyIncentive(
                            ambulanceRecords,
                            empForm.employeeName || '',
                            selectedFiscalYear,
                            selectedMonthCode,
                            driverIncentivePercent
                          );
                          const currentMonthName = NEPALI_MONTHS.find(m => m.code === selectedMonthCode)?.name || selectedMonthCode;

                          if (currentRes.tripCount > 0) {
                            return (
                              <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 font-medium">
                                ✓ {currentRes.tripCount} वटा ट्रिप फेला पर्यो, जम्मा भाडा रु. {currentRes.totalFare.toLocaleString()}, दर {driverIncentivePercent}% = प्रोत्साहन रु. {currentRes.incentiveAmount.toLocaleString()}
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                                ⚠️ यस महिना ({currentMonthName}) र आ.व. ({selectedFiscalYear}) मा <b className="font-semibold">{empForm.employeeName || 'यो चालक'}</b> नामको कुनै एम्बुलेन्स ट्रिप रेकर्ड फेला परेन। नाम हिज्जे वा मिति जाँच्नुहोस्।
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">फिल्ड / अन्य भत्ता:</label>
                    <Input
                      type="number"
                      value={empForm.otherAllowances || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, otherAllowances: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="p-3 bg-red-50/40 rounded-xl border border-red-200 space-y-3">
                <span className="font-bold text-red-900 uppercase tracking-wider block text-[11px]">
                  कट्टी विवरण (Deductions)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">क.सं.को. (PF 10%):</label>
                    <Input
                      type="number"
                      value={empForm.providentFund || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, providentFund: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">नागरिक लगानी कोष (CIT):</label>
                    <Input
                      type="number"
                      value={empForm.citDeduction || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, citDeduction: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">सावधिक जीवन बीमा:</label>
                    <Input
                      type="number"
                      value={empForm.insuranceDeduction || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, insuranceDeduction: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">सा.सु.कर / TDS (आयकर):</label>
                    <Input
                      type="number"
                      value={empForm.taxDeduction || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, taxDeduction: parseFloat(e.target.value) || 0 }))}
                    />
                    <div className="mt-1 text-[10px] text-slate-500 font-medium">
                      {(() => {
                        const basic = Number(empForm.basicScale) || 0;
                        const grade = Number(empForm.gradeAmount) || 0;
                        const dearness = Number(empForm.dearnessAllowance) || 0;
                        const other = Number(empForm.otherAllowances) || 0;
                        const inc = Number(empForm.incentiveAllowance) || 0;
                        const nonIncTaxable = basic + grade + dearness + other;
                        const taxRem = Math.round(nonIncTaxable * 0.01);
                        const taxInc = Math.round(inc * 0.15);
                        return (
                          <span>
                            (नियमित: रु. {nonIncTaxable.toLocaleString()} × १% = रु. {taxRem} + प्रोत्साहन: रु. {inc.toLocaleString()} × १५% = रु. {taxInc} ➔ जम्मा रु. {(taxRem + taxInc).toLocaleString()})
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">पेश्की / ऋण कट्टी:</label>
                    <Input
                      type="number"
                      value={empForm.loanOrAdvanceDeduction || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, loanOrAdvanceDeduction: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">अन्य कट्टी:</label>
                    <Input
                      type="number"
                      value={empForm.otherDeductions || 0}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, otherDeductions: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">कैफियत (Remarks):</label>
                <Input
                  value={empForm.remarks || ''}
                  onChange={(e) => setEmpForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="कुनै टिप्पणी भए यहाँ लेख्नुहोस्..."
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setIsAddEmployeeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                onClick={handleSaveEmpModal}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                {editingEmployeeItem ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'कर्मचारी थप्नुहोस्'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
