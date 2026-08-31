import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AmbulanceRecord, ServiceSeekerRecord, User, OrganizationSettings, AmbulanceExpenseRecord, AmbulanceOdometerRecord } from '../types';
import { Plus, Search, Edit2, Trash2, Calendar, User as UserIcon, Phone, MapPin, Truck, AlertCircle, FileText, Info, Receipt, Navigation, RefreshCw, Radio, Compass, Gauge, Wallet, CheckCircle2, X, Eye } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { NepaliDatePicker } from './NepaliDatePicker';
import { AmbulanceTracker } from './AmbulanceTracker';
import { AmbulanceOdometerView } from './AmbulanceOdometerView';
import { LogoDisplay } from './LogoDisplay';
import { toNepaliDigits } from '../lib/tableUtils';

interface AmbulanceSewaProps {
  records: AmbulanceRecord[];
  expenseRecords?: AmbulanceExpenseRecord[];
  odometerRecords?: AmbulanceOdometerRecord[];
  serviceSeekerRecords: ServiceSeekerRecord[];
  currentUser?: User | null;
  onSave: (record: AmbulanceRecord) => Promise<boolean>;
  onDelete: (id: string) => void;
  onSaveExpense?: (record: AmbulanceExpenseRecord) => Promise<boolean>;
  onDeleteExpense?: (id: string) => void;
  onSaveOdometer?: (record: AmbulanceOdometerRecord) => Promise<boolean>;
  onDeleteOdometer?: (id: string) => void;
  currentFiscalYear: string;
  generalSettings?: OrganizationSettings;
  users: User[];
}

export const AmbulanceSewa: React.FC<AmbulanceSewaProps> = ({
  records = [],
  expenseRecords = [],
  odometerRecords = [],
  serviceSeekerRecords = [],
  currentUser,
  onSave,
  onDelete,
  onSaveExpense,
  onDeleteExpense,
  onSaveOdometer,
  onDeleteOdometer,
  currentFiscalYear,
  generalSettings,
  users
}) => {
  // Helper to find the latest endOdometer for a given ambulance vehicle number
  const getLastOdometerForAmbulance = (vehicleNo: string): number | undefined => {
    if (!vehicleNo || !records || records.length === 0) return undefined;
    const ambulanceRecords = records.filter(
      r => r.ambulanceNo && r.ambulanceNo.trim().toLowerCase() === vehicleNo.trim().toLowerCase()
    );
    if (ambulanceRecords.length === 0) return undefined;
    
    // Sort chronologically using dateBs, then id
    const sorted = [...ambulanceRecords].sort((a, b) => {
      const dateComp = (a.dateBs || '').localeCompare(b.dateBs || '');
      if (dateComp !== 0) return dateComp;
      return (a.id || '').localeCompare(b.id || '');
    });
    
    // Scan backwards for a valid endOdometer
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].endOdometer !== undefined) {
        return sorted[i].endOdometer;
      }
    }
    return undefined;
  };

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

  const normalizeToEngDigits = (str: string): string => {
    return (str || '').replace(/[०-९]/g, d => "०१२३४५६७८९".indexOf(d).toString()).trim();
  };

  const normalizeFiscalYearStr = (fy?: string): string => {
    if (!fy || fy === 'all') return 'all';
    const clean = normalizeToEngDigits(fy).replace(/\s+/g, '');
    const parts = clean.split(/[-/]/);
    if (parts.length === 2) {
      let y1 = parts[0];
      let y2 = parts[1];
      if (y1.length === 2) y1 = '20' + y1;
      if (y2.length === 2) y2 = '0' + y2;
      return `${y1}/${y2}`;
    }
    return clean;
  };

  const getFiscalYearFromBsDate = (dateBs?: string, fallbackFy?: string): string => {
    if (!dateBs) return fallbackFy || currentFiscalYear || '2083/084';
    const cleanDate = normalizeToEngDigits(dateBs);
    const parts = cleanDate.split(/[-/.]/);
    if (parts.length >= 2) {
      const yearNum = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10);
      if (!isNaN(yearNum) && !isNaN(monthNum)) {
        if (monthNum >= 4) {
          const nextYearShort = (yearNum + 1) % 100;
          const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
          return `${yearNum}/0${nextYearStr}`; // e.g. "2083/084"
        } else {
          const prevYear = yearNum - 1;
          const yearShort = yearNum % 100;
          const yearStr = yearShort < 10 ? `0${yearShort}` : `${yearShort}`;
          return `${prevYear}/0${yearStr}`; // e.g. "2082/083"
        }
      }
    }
    return fallbackFy || currentFiscalYear || '2083/084';
  };

  const getMonthFromBsDate = (dateBs?: string): string => {
    if (!dateBs) return '';
    const cleanDate = normalizeToEngDigits(dateBs);
    const parts = cleanDate.split(/[-/.]/);
    if (parts.length >= 2) {
      const mNum = parseInt(parts[1], 10);
      if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
        return String(mNum).padStart(2, '0');
      }
    }
    return '';
  };

  const currentYearRecords = useMemo(() => {
    return (records || []).filter(r => {
      if (!r) return false;
      const fy = r.fiscalYear || getFiscalYearFromBsDate(r.dateBs, currentFiscalYear);
      return fy === currentFiscalYear;
    });
  }, [records, currentFiscalYear]);

  const currentYearExpenseRecords = useMemo(() => {
    return (expenseRecords || []).filter(e => {
      if (!e) return false;
      const fy = e.fiscalYear || getFiscalYearFromBsDate(e.dateBs, currentFiscalYear);
      return fy === currentFiscalYear;
    });
  }, [expenseRecords, currentFiscalYear]);

  const NEPALI_MONTHS = useMemo(() => [
    { id: '01', name: 'बैशाख (Baisakh)' },
    { id: '02', name: 'जेठ (Jestha)' },
    { id: '03', name: 'असार (Ashadh)' },
    { id: '04', name: 'साउन (Shrawan)' },
    { id: '05', name: 'भदौ (Bhadra)' },
    { id: '06', name: 'असोज (Ashoj)' },
    { id: '07', name: 'कात्तिक (Kartik)' },
    { id: '08', name: 'मंसिर (Mangsir)' },
    { id: '09', name: 'पुस (Poush)' },
    { id: '10', name: 'माघ (Magh)' },
    { id: '11', name: 'फागुन (Falgun)' },
    { id: '12', name: 'चैत (Chaitra)' },
  ], []);

  const [activeTab, setActiveTab] = useState<'trips' | 'expenses' | 'logbook' | 'odometer' | 'tracking'>('trips');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AmbulanceRecord | null>(null);
  const isEditingAndNonAdmin = useMemo(() => {
    if (!editingRecord) return false;
    const role = currentUser?.role;
    return role !== 'SUPER_ADMIN' && role !== 'ADMIN';
  }, [editingRecord, currentUser]);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFormOpen) {
      setTimeout(() => {
        patientSearchInputRef.current?.focus();
      }, 100);
    }
  }, [isFormOpen]);
  
  // Log book specific filters setup
  const [logBookMonthFilter, setLogBookMonthFilter] = useState('');
  const [logBookDriverFilter, setLogBookDriverFilter] = useState('');
  const [logBookVehicleFilter, setLogBookVehicleFilter] = useState('');
  
  // Expense related states
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AmbulanceExpenseRecord | null>(null);
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [expenseFiscalYearFilter, setExpenseFiscalYearFilter] = useState<string>(() => currentFiscalYear || '2083/084');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentFiscalYear) {
      setExpenseFiscalYearFilter(currentFiscalYear);
    }
  }, [currentFiscalYear]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  const [expenseFormData, setExpenseFormData] = useState<Partial<AmbulanceExpenseRecord>>(() => ({
    dateBs: getInitialMitiValue(),
    expenseCategory: 'fuel',
    amount: 0,
    fuelLiters: undefined,
    ambulanceNo: generalSettings?.ambulanceNo || '',
    billNo: '',
    paidTo: '',
    driverName: generalSettings?.ambulanceDriverName || '',
    remarks: ''
  }));

  const [formData, setFormData] = useState<Partial<AmbulanceRecord>>(() => ({
    dateBs: getInitialMitiValue(),
    patientName: '',
    age: '',
    billNo: '',
    address: '',
    phone: '',
    driverName: '',
    ambulanceNo: '',
    startLocation: '',
    destination: '',
    distanceKm: undefined,
    startOdometer: undefined,
    endOdometer: undefined,
    amountCharged: 0,
    receivedAmount: 0,
    remarks: ''
  }));

  const handlePatientSelect = (patient: ServiceSeekerRecord) => {
    setFormData(prev => ({
      ...prev,
      serviceSeekerId: patient.id,
      patientName: patient.name,
      age: patient.age,
      address: patient.address,
      phone: patient.phone
    }));
    setPatientSearchInput(patient.name);
    setShowPatientDropdown(false);
  };

  const filteredPatients = useMemo(() => {
    if (!patientSearchInput) return [];
    const query = patientSearchInput.toLowerCase();
    return (serviceSeekerRecords || []).filter(p => {
      if (!p) return false;
      return (
        (p.name || '').toLowerCase().includes(query) ||
        (p.uniquePatientId && String(p.uniquePatientId).toLowerCase().includes(query)) ||
        (p.registrationNumber && String(p.registrationNumber).toLowerCase().includes(query)) ||
        (p.phone && String(p.phone).includes(patientSearchInput))
      );
    }).slice(0, 10);
  }, [patientSearchInput, serviceSeekerRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName) {
      alert('कृपया सेवाग्राही/बिरामीको नाम प्रविष्ट गर्नुहोस्');
      return;
    }

    const recordDateBs = formData.dateBs || getInitialMitiValue();
    const record: AmbulanceRecord = {
      id: editingRecord?.id || `AMB-${Date.now()}`,
      fiscalYear: getFiscalYearFromBsDate(recordDateBs, currentFiscalYear),
      dateBs: recordDateBs,
      serviceSeekerId: formData.serviceSeekerId,
      patientName: formData.patientName || '',
      age: formData.age || '',
      billNo: formData.billNo || '',
      address: formData.address || '',
      phone: formData.phone || '',
      driverName: formData.driverName || '',
      ambulanceNo: formData.ambulanceNo || '',
      startLocation: formData.startLocation || '',
      destination: formData.destination || '',
      distanceKm: formData.distanceKm ? Number(formData.distanceKm) : undefined,
      startOdometer: formData.startOdometer !== undefined ? Number(formData.startOdometer) : undefined,
      endOdometer: formData.endOdometer !== undefined ? Number(formData.endOdometer) : undefined,
      amountCharged: formData.amountCharged !== undefined && formData.amountCharged !== null ? Number(formData.amountCharged) : 0,
      receivedAmount: formData.receivedAmount !== undefined && formData.receivedAmount !== null ? Number(formData.receivedAmount) : 0,
      remarks: formData.remarks || ''
    };

    const success = onSave ? await onSave(record) : false;
    if (success === false) {
      return;
    }

    showToast(
      editingRecord 
        ? 'एम्बुलेन्स यात्रा विवरण सफलतापूर्वक परिमार्जन (अपडेट) गरियो।' 
        : 'एम्बुलेन्स यात्रा विवरण सफलतापूर्वक सुरक्षित (सेभ) भयो।'
    );
    setIsFormOpen(false);
    setEditingRecord(null);
    setPatientSearchInput('');
    setFormData({
      dateBs: getInitialMitiValue(),
      patientName: '',
      age: '',
      billNo: '',
      address: '',
      phone: '',
      driverName: '',
      ambulanceNo: '',
      startLocation: '',
      destination: '',
      distanceKm: undefined,
      startOdometer: undefined,
      endOdometer: undefined,
      amountCharged: 0,
      receivedAmount: 0,
      remarks: ''
    });
  };

  const handleEdit = (record: AmbulanceRecord) => {
    setEditingRecord(record);
    setFormData(record);
    setPatientSearchInput(record.patientName);
    setIsFormOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.amount || Number(expenseFormData.amount) <= 0) {
      alert('कृपया मान्य रकम प्रविष्ट गर्नुहोस्');
      return;
    }

    const expDateBs = expenseFormData.dateBs || getInitialMitiValue();
    const expRecord: AmbulanceExpenseRecord = {
      id: editingExpense?.id || `AMB-EXP-${Date.now()}`,
      fiscalYear: getFiscalYearFromBsDate(expDateBs, currentFiscalYear),
      dateBs: expDateBs,
      expenseCategory: expenseFormData.expenseCategory || 'fuel',
      amount: Number(expenseFormData.amount) || 0,
      fuelLiters: expenseFormData.fuelLiters !== undefined ? Number(expenseFormData.fuelLiters) : undefined,
      ambulanceNo: expenseFormData.ambulanceNo || '',
      billNo: expenseFormData.billNo || '',
      paidTo: expenseFormData.paidTo || '',
      driverName: expenseFormData.driverName || '',
      remarks: expenseFormData.remarks || ''
    };

    const success = onSaveExpense ? await onSaveExpense(expRecord) : false;
    if (success === false) {
      return;
    }

    showToast(
      editingExpense 
        ? 'एम्बुलेन्स खर्च विवरण सफलतापूर्वक परिमार्जन (अपडेट) गरियो।' 
        : 'एम्बुलेन्स खर्च विवरण सफलतापूर्वक सुरक्षित (सेभ) भयो।'
    );
    setIsExpenseFormOpen(false);
    setEditingExpense(null);
    setExpenseFormData({
      dateBs: getInitialMitiValue(),
      expenseCategory: 'fuel',
      amount: 0,
      fuelLiters: undefined,
      ambulanceNo: generalSettings?.ambulanceNo || '',
      billNo: '',
      paidTo: '',
      driverName: generalSettings?.ambulanceDriverName || '',
      remarks: ''
    });
  };

  const handleExpenseEdit = (record: AmbulanceExpenseRecord) => {
    setEditingExpense(record);
    setExpenseFormData(record);
    setIsExpenseFormOpen(true);
  };

  const uniqueExpenseFiscalYears = useMemo(() => {
    const years = new Set<string>();
    if (currentFiscalYear) years.add(currentFiscalYear);
    (expenseRecords || []).forEach(e => {
      if (e) {
        const fy = e.fiscalYear || getFiscalYearFromBsDate(e.dateBs, currentFiscalYear);
        if (fy) years.add(fy);
      }
    });
    return Array.from(years).sort().reverse();
  }, [expenseRecords, currentFiscalYear]);

  const filteredExpenseRecords = useMemo(() => {
    const targetFyNorm = normalizeFiscalYearStr(expenseFiscalYearFilter);
    return (expenseRecords || [])
      .filter(e => {
        if (!e) return false;

        // 1. Fiscal Year Filter
        if (targetFyNorm !== 'all') {
          const recFy = e.fiscalYear || getFiscalYearFromBsDate(e.dateBs, currentFiscalYear);
          const recFyNorm = normalizeFiscalYearStr(recFy);
          if (recFyNorm !== targetFyNorm) return false;
        }

        // 2. Category Filter
        if (expenseCategoryFilter !== 'all') {
          if (e.expenseCategory !== expenseCategoryFilter) return false;
        }

        // 3. Month Filter (robust matching with getMonthFromBsDate)
        if (expenseMonthFilter !== 'all') {
          const m = getMonthFromBsDate(e.dateBs);
          if (m !== expenseMonthFilter) return false;
        }

        // 4. Search query
        const query = (expenseSearchTerm || '').toLowerCase().trim();
        if (query) {
          const match = (
            (e.expenseCategory && String(e.expenseCategory).toLowerCase().includes(query)) ||
            (e.driverName && String(e.driverName).toLowerCase().includes(query)) ||
            (e.paidTo && String(e.paidTo).toLowerCase().includes(query)) ||
            (e.billNo && String(e.billNo).toLowerCase().includes(query)) ||
            (e.ambulanceNo && String(e.ambulanceNo).toLowerCase().includes(query)) ||
            (e.remarks && String(e.remarks).toLowerCase().includes(query)) ||
            (e.dateBs && String(e.dateBs).toLowerCase().includes(query)) ||
            (e.fiscalYear && String(e.fiscalYear).toLowerCase().includes(query))
          );
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.dateBs || '';
        const dateB = b.dateBs || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [expenseRecords, expenseFiscalYearFilter, expenseCategoryFilter, expenseMonthFilter, expenseSearchTerm, currentFiscalYear]);

  const monthWiseExpenseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    NEPALI_MONTHS.forEach(m => { counts[m.id] = 0; });
    const targetFyNorm = normalizeFiscalYearStr(expenseFiscalYearFilter);

    (expenseRecords || []).forEach(e => {
      if (!e) return;
      if (targetFyNorm !== 'all') {
        const recFy = e.fiscalYear || getFiscalYearFromBsDate(e.dateBs, currentFiscalYear);
        const recFyNorm = normalizeFiscalYearStr(recFy);
        if (recFyNorm !== targetFyNorm) return;
      }
      if (expenseCategoryFilter !== 'all') {
        if (e.expenseCategory !== expenseCategoryFilter) return;
      }
      const m = getMonthFromBsDate(e.dateBs);
      if (m && counts[m] !== undefined) {
        counts[m] += 1;
      }
    });
    return counts;
  }, [expenseRecords, expenseFiscalYearFilter, expenseCategoryFilter, currentFiscalYear, NEPALI_MONTHS]);

  const allMonthsExpenseSummary = useMemo(() => {
    const summaryMap: Record<string, { fuel: number; maintenance: number; driver_allowance: number; other: number; total: number; fuelLiters: number }> = {};
    NEPALI_MONTHS.forEach(m => {
      summaryMap[m.id] = { fuel: 0, maintenance: 0, driver_allowance: 0, other: 0, total: 0, fuelLiters: 0 };
    });

    const activeFy = expenseFiscalYearFilter === 'all' ? currentFiscalYear : expenseFiscalYearFilter;
    const targetFyNorm = normalizeFiscalYearStr(activeFy);

    const targetRecords = (expenseRecords || []).filter(e => {
      if (!e) return false;
      const recFy = e.fiscalYear || getFiscalYearFromBsDate(e.dateBs, currentFiscalYear);
      const recFyNorm = normalizeFiscalYearStr(recFy);
      return recFyNorm === targetFyNorm;
    });

    targetRecords.forEach(record => {
      const monthKey = getMonthFromBsDate(record.dateBs);
      if (monthKey && summaryMap[monthKey]) {
        const amt = Number(record.amount) || 0;
        const cat = record.expenseCategory || 'other';
        if (cat === 'fuel') {
          summaryMap[monthKey].fuel += amt;
          summaryMap[monthKey].fuelLiters += Number(record.fuelLiters) || 0;
        } else if (cat === 'maintenance') {
          summaryMap[monthKey].maintenance += amt;
        } else if (cat === 'driver_allowance') {
          summaryMap[monthKey].driver_allowance += amt;
        } else {
          summaryMap[monthKey].other += amt;
        }
        summaryMap[monthKey].total += amt;
      }
    });

    return NEPALI_MONTHS.map(m => ({
      id: m.id,
      name: m.name,
      ...summaryMap[m.id]
    }));
  }, [expenseRecords, expenseFiscalYearFilter, currentFiscalYear, NEPALI_MONTHS]);

  const filteredRecords = (currentYearRecords || []).filter(r => {
    if (!r) return false;
    const query = (searchTerm || '').toLowerCase();
    return (
      (r.patientName && String(r.patientName).toLowerCase().includes(query)) ||
      (r.ambulanceNo && String(r.ambulanceNo).toLowerCase().includes(query)) ||
      (r.driverName && String(r.driverName).toLowerCase().includes(query)) ||
      (r.destination && String(r.destination).toLowerCase().includes(query)) ||
      (r.phone && String(r.phone).includes(searchTerm))
    );
  });

  // Constants & memoized helpers for advanced log book filtering

  const uniqueLogBookDrivers = useMemo(() => {
    const drivers = currentYearRecords.map(r => r.driverName).filter(Boolean);
    return Array.from(new Set(drivers));
  }, [currentYearRecords]);

  const uniqueLogBookVehicles = useMemo(() => {
    const vehicles = currentYearRecords.map(r => r.ambulanceNo).filter(Boolean);
    return Array.from(new Set(vehicles));
  }, [currentYearRecords]);

  const filteredLogBookRecords = useMemo(() => {
    return (currentYearRecords || []).filter(r => {
      if (!r) return false;
      // 1. General Search
      const searchLower = (searchTerm || '').toLowerCase();
      const matchesSearch = !searchTerm || 
        (r.patientName && String(r.patientName).toLowerCase().includes(searchLower)) ||
        (r.ambulanceNo && String(r.ambulanceNo).toLowerCase().includes(searchLower)) ||
        (r.driverName && String(r.driverName).toLowerCase().includes(searchLower)) ||
        (r.startLocation && String(r.startLocation).toLowerCase().includes(searchLower)) ||
        (r.destination && String(r.destination).toLowerCase().includes(searchLower)) ||
        (r.phone && String(r.phone).includes(searchTerm)) ||
        (r.remarks && String(r.remarks).toLowerCase().includes(searchLower));

      // 2. Month Filter
      let matchesMonth = true;
      if (logBookMonthFilter) {
        const parts = (r.dateBs || '').split('-');
        if (parts.length >= 2) {
          const m = parts[1];
          matchesMonth = m === logBookMonthFilter || Number(m) === Number(logBookMonthFilter);
        } else {
          matchesMonth = false;
        }
      }

      // 3. Driver Filter
      const matchesDriver = !logBookDriverFilter || r.driverName === logBookDriverFilter;

      // 4. Vehicle Filter
      const matchesVehicle = !logBookVehicleFilter || r.ambulanceNo === logBookVehicleFilter;

      return matchesSearch && matchesMonth && matchesDriver && matchesVehicle;
    });
  }, [currentYearRecords, searchTerm, logBookMonthFilter, logBookDriverFilter, logBookVehicleFilter]);

  const monthlyFuelSummary = useMemo(() => {
    // Initialize standard 12 months sum
    const monthlyData: { [key: string]: { liters: number; cost: number } } = {};
    NEPALI_MONTHS.forEach(m => {
      monthlyData[m.id] = { liters: 0, cost: 0 };
    });

    // Sum fuel expenses with filters
    (currentYearExpenseRecords || []).forEach(record => {
      if (record.expenseCategory === 'fuel') {
        // Vehicle Filter compatibility
        if (logBookVehicleFilter && record.ambulanceNo && record.ambulanceNo !== logBookVehicleFilter) {
          return;
        }
        // Driver filter compatibility
        if (logBookDriverFilter && record.driverName && record.driverName !== logBookDriverFilter) {
          return;
        }
        // Month filter compatibility
        if (logBookMonthFilter) {
          const parts = (record.dateBs || '').split(/[-/]/);
          if (parts.length >= 2) {
            const m = parts[1].padStart(2, '0');
            const targetM = logBookMonthFilter.padStart(2, '0');
            if (m !== targetM) return;
          } else {
            return;
          }
        }
        
        const parts = (record.dateBs || '').split(/[-/]/);
        if (parts.length >= 2) {
          const monthKey = parts[1].padStart(2, '0');
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].liters += Number(record.fuelLiters) || 0;
            monthlyData[monthKey].cost += Number(record.amount) || 0;
          }
        }
      }
    });

    return NEPALI_MONTHS.map(m => ({
      id: m.id,
      name: m.name,
      liters: monthlyData[m.id].liters,
      cost: monthlyData[m.id].cost
    })).filter(item => item.liters > 0 || item.cost > 0); // Only show months with data
  }, [currentYearExpenseRecords, NEPALI_MONTHS, logBookVehicleFilter, logBookDriverFilter, logBookMonthFilter]);

  const totalDrivenDistance = useMemo(() => {
    return filteredLogBookRecords.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  }, [filteredLogBookRecords]);

  const totalFuelLiters = useMemo(() => {
    let liters = 0;
    (currentYearExpenseRecords || []).forEach(record => {
      if (record.expenseCategory === 'fuel' && record.fuelLiters) {
        // Vehicle Filter compatibility
        if (logBookVehicleFilter && record.ambulanceNo && record.ambulanceNo !== logBookVehicleFilter) {
          return;
        }
        // Driver filter compatibility
        if (logBookDriverFilter && record.driverName && record.driverName !== logBookDriverFilter) {
          return;
        }
        // Month filter compatibility
        if (logBookMonthFilter) {
          const parts = (record.dateBs || '').split(/[-/]/);
          if (parts.length >= 2) {
            const m = parts[1].padStart(2, '0');
            const targetM = logBookMonthFilter.padStart(2, '0');
            if (m !== targetM) return;
          } else {
            return;
          }
        }
        liters += Number(record.fuelLiters) || 0;
      }
    });
    return liters;
  }, [currentYearExpenseRecords, logBookVehicleFilter, logBookDriverFilter, logBookMonthFilter]);

  const averageMileage = useMemo(() => {
    return totalFuelLiters > 0 ? (totalDrivenDistance / totalFuelLiters) : 0;
  }, [totalDrivenDistance, totalFuelLiters]);

  const canDelete = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.canDeleteAmbulance === true;

  const assignedAmbulanceUser = useMemo(() => {
    if (!generalSettings || !users) return null;
    return users.find(u => u.id === generalSettings.ambulanceSewaUserId);
  }, [generalSettings, users]);

  const adminUser = useMemo(() => {
    if (!users) return null;
    return users.find(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
  }, [users]);

  const configuredRoutes = useMemo(() => {
    if (!generalSettings?.ambulanceRoutes) return [];
    return generalSettings.ambulanceRoutes.map(route => {
      const parts = route.split('|');
      return {
        from: parts[0] || '',
        to: parts[1] || '',
        rate: Number(parts[2]) || 0,
        distance: parts[3] ? Number(parts[3]) : undefined
      };
    }).filter(r => r.from || r.to);
  }, [generalSettings?.ambulanceRoutes]);

  const hasTabAccess = (tab: 'trips' | 'expenses' | 'logbook' | 'odometer' | 'tracking') => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    const key = `ambulance_${tab}`;
    return currentUser.allowedMenus?.includes(key) || false;
  };

  const hasAnyAmbulanceAccess = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return (
      currentUser.allowedMenus?.includes('ambulance_trips') ||
      currentUser.allowedMenus?.includes('ambulance_expenses') ||
      currentUser.allowedMenus?.includes('ambulance_logbook') ||
      currentUser.allowedMenus?.includes('ambulance_odometer') ||
      currentUser.allowedMenus?.includes('ambulance_tracking')
    );
  }, [currentUser]);

  // Adjust active tab if it's not allowed
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      if (!hasTabAccess(activeTab)) {
        const tabs: ('trips' | 'expenses' | 'logbook' | 'odometer' | 'tracking')[] = ['trips', 'expenses', 'logbook', 'odometer', 'tracking'];
        const firstAllowed = tabs.find(t => hasTabAccess(t));
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [currentUser, activeTab]);

  return (
    <div className="relative min-h-screen">
      {/* Floating Success / Notification Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
              : 'bg-slate-800 text-white border-slate-700 shadow-slate-900/30'
          }`}>
            <div className="p-1.5 bg-white/20 rounded-xl">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="size-5 text-white" />
              ) : (
                <AlertCircle className="size-5 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold font-nepali">{toastMessage.text}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="बन्द गर्नुहोस्"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 font-nepali flex items-center gap-2">
              <Truck className="text-rose-600 size-7" />
              एम्बुलेन्स सेवा (Ambulance Service)
            </h2>
            <p className="text-sm text-slate-500">एम्बुलेन्स सेवा प्रयोगको विवरण, बिलिङ तथा खर्च रेकर्ड</p>
          </div>
        </div>

        {!hasAnyAmbulanceAccess ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-lg mx-auto text-center space-y-5 my-12">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800 font-nepali">अनुमति अस्वीकृत (Access Denied)</h3>
              <p className="text-slate-500 text-xs font-nepali leading-relaxed">
                तपाईंसँग एम्बुलेन्स सेवा अन्तर्गत कुनै पनि विभाग (यात्रा विवरण, खर्च विवरण, लगबुक वा लाइभ ट्र्याकिङ) को पहुँच अनुमति छैन। कृपया एडमिन वा स्वास्थ्य शाखासँग सम्पर्क गरी आवश्यक अनुमति प्राप्त गर्नुहोस्।
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                PERMISSION_REQUIRED: AMBULANCE_SUB_MODULES
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher & Dynamic Adding Button */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-3 rounded-2xl border border-slate-150 shadow-sm print:hidden">
              <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
                {hasTabAccess('trips') && (
                  <button
                    onClick={() => setActiveTab('trips')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'trips'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Truck size={15} />
                    <span>यात्रा विवरण (Travel logs)</span>
                  </button>
                )}
                {hasTabAccess('expenses') && (
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'expenses'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Receipt size={15} />
                    <span>खर्च विवरण (Expenses)</span>
                  </button>
                )}
                {hasTabAccess('logbook') && (
                  <button
                    onClick={() => setActiveTab('logbook')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'logbook'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <FileText size={15} />
                    <span>लगबुक (Log Book)</span>
                  </button>
                )}
                {hasTabAccess('odometer') && (
                  <button
                    onClick={() => setActiveTab('odometer')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'odometer'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Gauge size={15} />
                    <span>ओडोमिटर रेकर्ड (Odometer Record)</span>
                  </button>
                )}
                {hasTabAccess('tracking') && (
                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'tracking'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <MapPin size={15} />
                    <span>लाइभ ट्र्याकिङ (Live Tracking)</span>
                  </button>
                )}
              </div>

          <div>
            {activeTab === 'trips' ? (
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setPatientSearchInput('');
                  const defaultAmbNo = generalSettings?.ambulanceNo || '';
                  const lastOdo = getLastOdometerForAmbulance(defaultAmbNo);
                  setFormData({
                    dateBs: getInitialMitiValue(),
                    patientName: '',
                    age: '',
                    billNo: '',
                    address: '',
                    phone: '',
                    driverName: generalSettings?.ambulanceDriverName || '',
                    ambulanceNo: defaultAmbNo,
                    startLocation: '',
                    destination: '',
                    distanceKm: undefined,
                    startOdometer: lastOdo,
                    endOdometer: undefined,
                    amountCharged: 0,
                    receivedAmount: 0,
                    remarks: ''
                  });
                  setIsFormOpen(true);
                  setIsExpenseFormOpen(false);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl hover:bg-rose-700 transition-all shadow-sm font-bold text-xs hover:scale-[1.02]"
              >
                <Plus size={16} />
                <span className="font-nepali">यात्रा रेकर्ड थप्नुहोस् (Add Trip)</span>
              </button>
            ) : activeTab === 'expenses' ? (
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseFormData({
                    dateBs: getInitialMitiValue(),
                    expenseCategory: 'fuel',
                    amount: 0,
                    fuelLiters: undefined,
                    ambulanceNo: generalSettings?.ambulanceNo || '',
                    billNo: '',
                    paidTo: '',
                    driverName: generalSettings?.ambulanceDriverName || '',
                    remarks: ''
                  });
                  setIsExpenseFormOpen(true);
                  setIsFormOpen(false);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-bold text-xs hover:scale-[1.02]"
              >
                <Plus size={16} />
                <span className="font-nepali">खर्च रेकर्ड थप्नुहोस् (Add Expense)</span>
              </button>
            ) : activeTab === 'tracking' ? (
              <div className="flex items-center gap-2 bg-rose-950/40 text-rose-400 border border-rose-900/40 px-4 py-2.5 rounded-xl text-xs font-black">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="font-nepali">जीपीएस सक्रिय छ (GPS Status: Live)</span>
              </div>
            ) : (
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl hover:bg-amber-700 transition-all shadow-sm font-bold text-xs hover:scale-[1.02]"
              >
                <FileText size={16} />
                <span className="font-nepali">लगबुक प्रिन्ट गर्नुहोस् (Print Log Book)</span>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'trips' && isFormOpen && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 ring-4 ring-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 font-nepali border-b pb-3 border-slate-100">
              {editingRecord ? 'रेकर्ड परिमार्जन गर्नुहोस्' : 'नयाँ एम्बुलेन्स यात्रा विबरण प्रविष्टि'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Date Selection */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <NepaliDatePicker
                    label="मिति (B.S.) *"
                    required
                    value={formData.dateBs || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, dateBs: val }))}
                    disabled={isEditingAndNonAdmin}
                    minDate={fiscalYearRange.min}
                    maxDate={fiscalYearRange.max}
                  />
                </div>

                {/* Patient / Seeker Name Selector with Search */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-600 font-nepali">सेवाग्राही खोज्नुहोस् / नाम प्रविष्ट गर्नुहोस् *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      ref={patientSearchInputRef}
                      type="text"
                      placeholder="सेवाग्राहीको नाम लेख्नुहोस् वा खोज्नुहोस्..."
                      value={patientSearchInput}
                      onChange={e => {
                        setPatientSearchInput(e.target.value);
                        setFormData({...formData, patientName: e.target.value});
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => !isEditingAndNonAdmin && setShowPatientDropdown(true)}
                      disabled={isEditingAndNonAdmin}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  {showPatientDropdown && filteredPatients.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {filteredPatients.map(patient => (
                        <div
                          key={patient.id}
                          onClick={() => !isEditingAndNonAdmin && handlePatientSelect(patient)}
                          className="p-3 text-sm hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{patient.name}</p>
                            <p className="text-xs text-slate-500">ID: {patient.uniquePatientId || 'N/A'} • {patient.address || 'N/A'}</p>
                          </div>
                          <span className="text-[10px] bg-slate-100 font-bold px-2 py-1 rounded text-slate-600">दर्ता भएको</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showPatientDropdown && patientSearchInput && (
                    <div className="absolute z-20 w-full mt-1">
                      <button
                        type="button"
                        onClick={() => setShowPatientDropdown(false)}
                        className="w-full p-2 bg-slate-50 hover:bg-slate-100 text-xs text-slate-500 font-semibold border border-slate-200 rounded-lg shadow-sm"
                      >
                        ड्रपडाउन बन्द गर्नुहोस् (Close Selections)
                      </button>
                    </div>
                  )}
                </div>

                {/* Bill No */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">बिल नम्बर (Bill No.)</label>
                  <input
                    type="text"
                    placeholder="बिल नम्बर प्रविष्ट गर्नुहोस्"
                    value={formData.billNo || ''}
                    onChange={e => setFormData({...formData, billNo: e.target.value})}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Patient Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">ठेगाना (Address)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="ठेगाना लेख्नुहोस्"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      disabled={isEditingAndNonAdmin}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">सम्पर्क नम्बर (Phone)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      placeholder="फोन नम्बर प्रविष्ट गर्नुहोस्"
                      value={formData.phone || ''}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      disabled={isEditingAndNonAdmin}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Driver Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">चालकको नाम (Driver Name) *</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="चालकको पुरा नाम"
                      value={formData.driverName || ''}
                      onChange={e => setFormData({...formData, driverName: e.target.value})}
                      disabled={isEditingAndNonAdmin}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Ambulance Vehicle-No */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">एम्बुलेन्स नं. (Ambulance Vehicle No.) *</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="जस्तै: बा १ झ ९४८८"
                      value={formData.ambulanceNo || ''}
                      onChange={e => {
                        const newAmbNo = e.target.value;
                        setFormData(prev => {
                          const lastOdo = !editingRecord ? getLastOdometerForAmbulance(newAmbNo) : undefined;
                          return {
                            ...prev,
                            ambulanceNo: newAmbNo,
                            startOdometer: (!editingRecord && lastOdo !== undefined) ? lastOdo : prev.startOdometer
                          };
                        });
                      }}
                      disabled={isEditingAndNonAdmin}
                      className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-semibold text-slate-700 disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Route Pre-selector if configured */}
                {configuredRoutes.length > 0 && (
                  <div className={`space-y-1.5 lg:col-span-3 bg-rose-50/50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${isEditingAndNonAdmin ? 'opacity-60 pointer-events-none' : ''}`}>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <Truck size={14} className="text-rose-600" />
                        पूर्व-सुरक्षित एम्बुलेन्स मार्ग छान्नुहोस् (Choose Configured Route)
                      </h4>
                      <p className="text-[11px] text-rose-700/80">नियमित मार्गको भाडा र विवरण स्वचालित भर्न यहाँबाट मार्ग चयन गर्नुहोस्</p>
                    </div>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [fromLoc, toLoc, rate, distance] = val.split('|');
                          const dVal = distance ? Number(distance) : undefined;
                          setFormData(prev => {
                            const startOdo = prev.startOdometer;
                            const endOdo = (startOdo !== undefined && dVal !== undefined)
                              ? Number((startOdo + dVal).toFixed(1))
                              : prev.endOdometer;
                            return {
                              ...prev,
                              startLocation: fromLoc,
                              destination: toLoc,
                              amountCharged: Number(rate) || 0,
                              receivedAmount: Number(rate) || 0,
                              distanceKm: dVal,
                              endOdometer: endOdo
                            };
                          });
                        }
                      }}
                      disabled={isEditingAndNonAdmin}
                      className="text-xs p-2.5 bg-white border border-rose-300 rounded-xl text-rose-900 font-bold focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none w-full sm:w-64 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      <option value="">-- मार्ग छनौट गर्नुहोस् (Select Route) --</option>
                      {configuredRoutes.map((r, i) => (
                        <option key={i} value={`${r.from}|${r.to}|${r.rate}|${r.distance !== undefined ? r.distance : ''}`}>
                          {r.from} ➔ {r.to} (रु. {r.rate}){r.distance !== undefined ? ` - ${r.distance} KM` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Starting Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कहाँबाट (From) *</label>
                  <input
                    type="text"
                    required
                    placeholder="प्रस्थान विन्दु"
                    value={formData.startLocation || ''}
                    onChange={e => setFormData({...formData, startLocation: e.target.value})}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Destination Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कहाँसम्म (To) *</label>
                  <input
                    type="text"
                    required
                    placeholder="गन्तव्य विन्दु"
                    value={formData.destination || ''}
                    onChange={e => setFormData({...formData, destination: e.target.value})}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Start Odometer */}
                <div className="space-y-1.5 p-3 rounded-xl bg-orange-50/40 border border-orange-100">
                  <label className="text-xs font-bold text-orange-950 font-nepali">शुरुको मि. / किलोमिटर (Start Odometer)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="उदा: 14520.5"
                    value={formData.startOdometer === undefined ? '' : formData.startOdometer}
                    onChange={e => {
                      const start = e.target.value === '' ? undefined : Number(e.target.value);
                      setFormData(prev => {
                        const dVal = prev.distanceKm;
                        const end = (start !== undefined && dVal !== undefined)
                          ? Number((start + dVal).toFixed(1))
                          : prev.endOdometer;
                        return {
                          ...prev,
                          startOdometer: start,
                          endOdometer: end
                        };
                      });
                    }}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-mono text-orange-850 disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* End Odometer */}
                <div className="space-y-1.5 p-3 rounded-xl bg-orange-50/40 border border-orange-100">
                  <label className="text-xs font-bold text-orange-950 font-nepali">अन्तिम मि. / किलोमिटर (End Odometer)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="उदा: 14585.2"
                    value={formData.endOdometer === undefined ? '' : formData.endOdometer}
                    onChange={e => {
                      const end = e.target.value === '' ? undefined : Number(e.target.value);
                      setFormData(prev => {
                        const start = prev.startOdometer;
                        const distance = (start !== undefined && end !== undefined && end >= start) ? Number((end - start).toFixed(1)) : prev.distanceKm;
                        return {
                          ...prev,
                          endOdometer: end,
                          distanceKm: distance
                        };
                      });
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-mono text-orange-850"
                  />
                </div>

                {/* Distance in KM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">दुरी कि.मी. (Distance KM)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="दुरी (किलोमिटरमा)"
                    value={formData.distanceKm === undefined ? '' : formData.distanceKm}
                    onChange={e => {
                      const dVal = e.target.value === '' ? undefined : Number(e.target.value);
                      setFormData(prev => {
                        const start = prev.startOdometer;
                        const end = (start !== undefined && dVal !== undefined)
                          ? Number((start + dVal).toFixed(1))
                          : prev.endOdometer;
                        return {
                          ...prev,
                          distanceKm: dVal,
                          endOdometer: end
                        };
                      });
                    }}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-mono disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Amount Charged */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कूल शुल्क रु. (Total Charged Amount) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="जस्तै: 1500"
                    value={formData.amountCharged !== undefined && formData.amountCharged !== null ? formData.amountCharged : ''}
                    onChange={e => setFormData({...formData, amountCharged: e.target.value === '' ? 0 : Number(e.target.value)})}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-mono font-bold text-red-600 disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Received/Paid Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">प्राप्त रकम रु. (Received Amount) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="जस्तै: 1500"
                    value={formData.receivedAmount !== undefined && formData.receivedAmount !== null ? formData.receivedAmount : ''}
                    onChange={e => setFormData({...formData, receivedAmount: e.target.value === '' ? 0 : Number(e.target.value)})}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-mono font-bold text-emerald-600 disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Remarks/Kaifiyat */}
                <div className="space-y-1.5 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कैफियत (Remarks / Notes)</label>
                  <input
                    type="text"
                    placeholder="कैफियत प्रविष्ट गर्नुहोस्..."
                    value={formData.remarks || ''}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                    disabled={isEditingAndNonAdmin}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingRecord(null);
                    setPatientSearchInput('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm font-semibold"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  {editingRecord ? 'सुरक्षित गर्नुहोस् (Update)' : 'रेकर्ड राख्नुहोस् (Save Record)'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'expenses' && isExpenseFormOpen && (
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 ring-4 ring-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 font-nepali border-b pb-3 border-slate-100">
              {editingExpense ? 'एम्बुलेन्स खर्च विवरण परिमार्जन गर्नुहोस्' : 'नयाँ एम्बुलेन्स खर्च रेकर्ड प्रविष्टि'}
            </h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Expense Date */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <NepaliDatePicker
                    label="मिति (B.S.) *"
                    required
                    value={expenseFormData.dateBs || ''}
                    onChange={(val) => setExpenseFormData(prev => ({ ...prev, dateBs: val }))}
                    minDate={fiscalYearRange.min}
                    maxDate={fiscalYearRange.max}
                  />
                </div>

                {/* Expense Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">खर्च वर्ग (Expense Category) *</label>
                  <select
                    required
                    value={expenseFormData.expenseCategory || 'fuel'}
                    onChange={e => setExpenseFormData({...expenseFormData, expenseCategory: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold text-slate-700"
                  >
                    <option value="fuel">इन्धन (Fuel)</option>
                    <option value="maintenance">मर्मत संभार (Maintenance)</option>
                    <option value="driver_allowance">चालक भत्ता (Driver Allowance)</option>
                    <option value="other">अन्य (Other)</option>
                  </select>
                </div>

                {/* Ambulance Vehicle-No */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">एम्बुलेन्स नं. (Ambulance Vehicle No.)</label>
                  <input
                    type="text"
                    placeholder="जस्तै: बा १ झ ९४८८"
                    value={expenseFormData.ambulanceNo || ''}
                    onChange={e => setExpenseFormData({...expenseFormData, ambulanceNo: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-semibold text-slate-700"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कूल खर्च रकम रु. (Amount) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="जस्तै: 1000"
                    value={expenseFormData.amount || ''}
                    onChange={e => setExpenseFormData({...expenseFormData, amount: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-mono font-bold text-emerald-600"
                  />
                </div>

                {/* Fuel Liters (Only shown if category is 'fuel') */}
                {expenseFormData.expenseCategory === 'fuel' && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-slate-600 font-nepali flex items-center gap-1">
                      इन्धन मात्रा लिटर (Fuel Liters) *
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.1"
                      placeholder="जस्तै: 15.5"
                      value={expenseFormData.fuelLiters === undefined ? '' : expenseFormData.fuelLiters}
                      onChange={e => setExpenseFormData({...expenseFormData, fuelLiters: e.target.value === '' ? undefined : Number(e.target.value)})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-mono font-bold text-amber-600"
                    />
                  </div>
                )}

                {/* Bill No. */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">बील नम्बर (Bill No.)</label>
                  <input
                    type="text"
                    placeholder="बील नम्बर प्रविष्ट गर्नुहोस्"
                    value={expenseFormData.billNo || ''}
                    onChange={e => setExpenseFormData({...expenseFormData, billNo: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-semibold"
                  />
                </div>

                {/* Paid To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">भुक्तानी प्राप्त गर्ने (Paid To)</label>
                  <input
                    type="text"
                    placeholder="जस्तै: एबीसी फ्यूल सेन्टर"
                    value={expenseFormData.paidTo || ''}
                    onChange={e => setExpenseFormData({...expenseFormData, paidTo: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>

                {/* Driver Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 font-nepali">चालकको नाम (Driver Name)</label>
                  <input
                    type="text"
                    placeholder="चालकको नाम"
                    value={expenseFormData.driverName || ''}
                    onChange={e => setExpenseFormData({...expenseFormData, driverName: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-semibold"
                  />
                </div>

                {/* Remarks/Notes */}
                <div className="space-y-1.5 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-600 font-nepali">कैफियत / विवरण (Remarks / Notes)</label>
                  <input
                    type="text"
                    placeholder="खर्च सम्बन्धी केही विशेष भए यहाँ उल्लेख गर्नुहोस्..."
                    value={expenseFormData.remarks || ''}
                    onChange={e => setExpenseFormData({...expenseFormData, remarks: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Expense Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsExpenseFormOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm font-semibold"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  {editingExpense ? 'सुरक्षित गर्नुहोस् (Update)' : 'खर्च रेकर्ड राख्नुहोस् (Save Expense)'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 print:hidden">
          <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 rounded-2xl border border-rose-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-800">कूल यात्रा आम्दानी (Total Charge)</p>
              <p className="text-lg font-extrabold text-rose-950 mt-1 font-mono">
                रु. {currentYearRecords.reduce((sum, r) => sum + (r.amountCharged || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl text-rose-600 shadow-sm">
              <Truck size={18} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800">कुल प्राप्त भएको (Received)</p>
              <p className="text-lg font-extrabold text-emerald-950 mt-1 font-mono">
                रु. {currentYearRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl text-emerald-600 shadow-sm">
              <Receipt size={18} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800">बाँकी बक्यौता (Total Due)</p>
              <p className="text-lg font-extrabold text-amber-950 mt-1 font-mono">
                रु. {(currentYearRecords.reduce((sum, r) => sum + (r.amountCharged || 0), 0) - currentYearRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl text-amber-600 shadow-sm">
              <AlertCircle size={18} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-800">कूल एम्बुलेन्स खर्च (Total Expense)</p>
              <p className="text-lg font-extrabold text-indigo-950 mt-1 font-mono">
                रु. {(currentYearExpenseRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 bg-white rounded-xl text-indigo-600 shadow-sm">
              <Receipt size={18} />
            </div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
            (currentYearRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0) - (currentYearExpenseRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0)) >= 0
              ? 'bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200/60 text-teal-900'
              : 'bg-gradient-to-br from-rose-50 to-red-100/50 border-red-200/60 text-red-900'
          }`}>
            <div>
              <p className="text-xs font-bold font-nepali">बचत (Net Savings)</p>
              <p className="text-lg font-extrabold mt-1 font-mono">
                रु. {(currentYearRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0) - (currentYearExpenseRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className={`p-2.5 bg-white rounded-xl shadow-sm ${
              (currentYearRecords.reduce((sum, r) => sum + (r.receivedAmount || 0), 0) - (currentYearExpenseRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0)) >= 0
                ? 'text-teal-600'
                : 'text-red-600'
            }`}>
              <Wallet size={18} />
            </div>
          </div>
        </div>

        {/* Tab Specific Content lists */}
        {activeTab === 'trips' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
                <FileText className="text-slate-500 size-5" />
                यात्रा विबरण सूची (Travel Logs List)
              </h3>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="खोज्नुहोस् (नाम, एम्बुलेन्स नं, चालक वा गन्तव्य...)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all font-semibold"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4 font-nepali">मिति (Date)</th>
                    <th className="p-4 font-nepali">बिरामीको नाम (Patient Name)</th>
                    <th className="p-4 font-nepali">चालक र सवारी (Driver/Vehicle)</th>
                    <th className="p-4 font-nepali">प्रस्थान-गन्तव्य (From - To)</th>
                    <th className="p-4 font-nepali">दुरी (Dist.)</th>
                    <th className="p-4 font-nepali text-right">कूल शुल्क</th>
                    <th className="p-4 font-nepali text-right">प्राप्त रकम</th>
                    <th className="p-4 font-nepali text-center">कैफियत / स्थिति</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        <div className="max-w-[300px] mx-auto flex flex-col items-center gap-3">
                          <AlertCircle className="text-slate-300 size-10" />
                          <p className="text-sm font-semibold">कुनै पनि एम्बुलेन्स यात्रा विवरण फेला परेन।</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(record => {
                      const due = (record.amountCharged || 0) - (record.receivedAmount || 0);
                      const isFullyPaid = due <= 0;

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 whitespace-nowrap text-sm font-mono text-slate-600 font-semibold">{record.dateBs}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-800 text-sm">{record.patientName}</p>
                            <p className="text-xs text-slate-400">
                              {[record.billNo && `बिल नं: ${record.billNo}`, record.phone && `फोन: ${record.phone}`].filter(Boolean).join(' • ')}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-slate-700 text-sm">{record.driverName}</p>
                            <p className="text-xs bg-slate-100 text-slate-600 font-bold font-mono px-1.5 py-0.5 rounded w-max">{record.ambulanceNo}</p>
                          </td>
                          <td className="p-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="font-bold text-rose-600">{record.startLocation}</span>
                              <span>➔</span>
                              <span className="font-bold text-emerald-600">{record.destination}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-mono text-slate-600 font-bold whitespace-nowrap">
                            {record.distanceKm ? `${record.distanceKm} KM` : '-'}
                          </td>
                          <td className="p-4 text-sm font-mono font-bold text-slate-700 text-right whitespace-nowrap">
                            रु. {record.amountCharged?.toFixed(2)}
                          </td>
                          <td className="p-4 text-sm font-mono font-bold text-emerald-600 text-right whitespace-nowrap">
                            रु. {record.receivedAmount?.toFixed(2)}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1.5">
                              {isFullyPaid ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">Paid</span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-100">Due: रु. {due.toFixed(2)}</span>
                              )}
                              {record.remarks && (
                                <p className="text-[11px] text-slate-500 italic max-w-[150px] truncate" title={record.remarks}>{record.remarks}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-all"
                                title="सम्पादन गर्नुहोस्"
                              >
                                <Edit2 size={16} />
                              </button>
                              {canDelete ? (
                                <button
                                  onClick={() => {
                                    if (window.confirm('के तपाईं निश्चित रूपमा यो एम्बुलेन्स यात्रा विवरण हटाउन चाहनुहुन्छ?')) {
                                      onDelete(record.id);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                                  title="मेटाउनुहोस्"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1.5 text-slate-200 cursor-not-allowed"
                                  title="हटाउने अधिकार छैन"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'expenses' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header & Action Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 font-nepali text-base sm:text-lg flex items-center gap-2">
                    एम्बुलेन्स खर्च सूची (Ambulance Expenditure List)
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                      जम्मा रेकर्ड: {filteredExpenseRecords.length}
                    </span>
                    <span className="text-xs bg-rose-100 text-rose-800 font-mono font-bold px-2.5 py-0.5 rounded-full">
                      कुल खर्च: रु. {filteredExpenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}
                    </span>
                    {expenseRecords && expenseRecords.length > 0 && filteredExpenseRecords.length !== expenseRecords.length && (
                      <span className="text-[11px] text-slate-500 font-nepali">
                        (कुल {expenseRecords.length} मध्ये {filteredExpenseRecords.length} देखाइएको)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseFormData({
                      dateBs: getInitialMitiValue(),
                      expenseCategory: 'fuel',
                      amount: 0,
                      fuelLiters: undefined,
                      ambulanceNo: generalSettings?.ambulanceNo || '',
                      billNo: '',
                      paidTo: '',
                      driverName: generalSettings?.ambulanceDriverName || '',
                      remarks: ''
                    });
                    setIsExpenseFormOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                >
                  <Plus size={16} />
                  <span>नयाँ खर्च थप्नुहोस् (Add Expense)</span>
                </button>
              </div>
            </div>

            {/* Quick Month Selector Bar */}
            <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-500 font-nepali whitespace-nowrap flex items-center gap-1">
                <Calendar size={14} className="text-slate-400" />
                महिना:
              </span>
              <button
                type="button"
                onClick={() => setExpenseMonthFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  expenseMonthFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>सबै महिना (All Months)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  expenseMonthFilter === 'all' ? 'bg-emerald-700/80 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {expenseRecords?.length || 0}
                </span>
              </button>

              {NEPALI_MONTHS.map(m => {
                const count = monthWiseExpenseCounts[m.id] || 0;
                const isSelected = expenseMonthFilter === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setExpenseMonthFilter(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                        : count > 0
                        ? 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 font-semibold'
                        : 'bg-white/80 text-slate-500 hover:bg-slate-200 border border-slate-200/70'
                    }`}
                  >
                    <span>{m.name.split(' ')[0]}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-emerald-700/80 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Month Banner if filtered */}
            {expenseMonthFilter !== 'all' && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/70 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold font-nepali">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>
                    हाल <strong>{NEPALI_MONTHS.find(m => m.id === expenseMonthFilter)?.name || expenseMonthFilter}</strong> महिनाको खर्च मात्र देखाइएको छ ({filteredExpenseRecords.length} वटा रेकर्ड)।
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseMonthFilter('all')}
                  className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow-sm"
                >
                  <Eye size={13} />
                  <span>सबै महिनाका खर्च हेर्नुहोस् (Show All Months)</span>
                </button>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="खोज्नुहोस् (विवरण, चालक, बील नं., फर्म...)"
                  value={expenseSearchTerm}
                  onChange={e => setExpenseSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                />
                {expenseSearchTerm && (
                  <button
                    onClick={() => setExpenseSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title="खाली गर्नुहोस्"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 2. Fiscal Year Filter */}
              <div>
                <select
                  value={expenseFiscalYearFilter}
                  onChange={e => setExpenseFiscalYearFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">सबै आर्थिक वर्ष (All Fiscal Years)</option>
                  {uniqueExpenseFiscalYears.map(fy => (
                    <option key={fy} value={fy}>
                      आ.व. {fy} {fy === currentFiscalYear ? '(चालु)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Category Filter */}
              <div>
                <select
                  value={expenseCategoryFilter}
                  onChange={e => setExpenseCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">सबै खर्च वर्ग (All Categories)</option>
                  <option value="fuel">इन्धन (Fuel)</option>
                  <option value="maintenance">मर्मत संभार (Maintenance)</option>
                  <option value="driver_allowance">चालक भत्ता (Driver Allowance)</option>
                  <option value="other">अन्य (Other)</option>
                </select>
              </div>

              {/* 4. Month Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={expenseMonthFilter}
                  onChange={e => setExpenseMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">सबै महिना (All Months)</option>
                  {NEPALI_MONTHS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {(expenseSearchTerm || expenseFiscalYearFilter !== 'all' || expenseCategoryFilter !== 'all' || expenseMonthFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setExpenseSearchTerm('');
                      setExpenseFiscalYearFilter('all');
                      setExpenseCategoryFilter('all');
                      setExpenseMonthFilter('all');
                    }}
                    className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                    title="सबै फिल्टर हटाउनुहोस्"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Expenditure Records Table */}
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3.5 w-12 text-center font-nepali">क्र.सं.</th>
                    <th className="p-3.5 font-nepali">मिति (Date)</th>
                    <th className="p-3.5 font-nepali">आ.व. (FY)</th>
                    <th className="p-3.5 font-nepali">खर्च वर्ग (Category)</th>
                    <th className="p-3.5 font-nepali text-right">रकम (Amount)</th>
                    <th className="p-3.5 font-nepali">बील नं. (Bill No.)</th>
                    <th className="p-3.5 font-nepali">भुक्तानी पाउने (Paid To)</th>
                    <th className="p-3.5 font-nepali">चालक (Driver)</th>
                    <th className="p-3.5 font-nepali">गाडी नं.</th>
                    <th className="p-3.5 font-nepali">कैफियत (Remarks)</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenseRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-400">
                        <div className="max-w-[320px] mx-auto flex flex-col items-center gap-3">
                          <AlertCircle className="text-slate-300 size-12" />
                          <p className="text-sm font-semibold">कुनै पनि खर्च रेकर्ड फेला परेन।</p>
                          {(expenseSearchTerm || expenseFiscalYearFilter !== 'all' || expenseCategoryFilter !== 'all' || expenseMonthFilter !== 'all') && (
                            <button
                              onClick={() => {
                                setExpenseSearchTerm('');
                                setExpenseFiscalYearFilter('all');
                                setExpenseCategoryFilter('all');
                                setExpenseMonthFilter('all');
                              }}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline"
                            >
                              सबै फिल्टरहरू हटाएर सबै खर्च हेर्नुहोस्
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenseRecords.map((record, index) => {
                      const getCategoryLabel = (cat: string) => {
                        switch (cat) {
                          case 'fuel': return 'इन्धन (Fuel)';
                          case 'maintenance': return 'मर्मत संभार (Maintenance)';
                          case 'driver_allowance': return 'चालक भत्ता (Driver Allowance)';
                          default: return 'अन्य (Other)';
                        }
                      };

                      const recFy = record.fiscalYear || getFiscalYearFromBsDate(record.dateBs, currentFiscalYear);

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 text-center text-xs font-mono font-bold text-slate-400">
                            {index + 1}
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-sm font-mono text-slate-700 font-bold">
                            {record.dateBs}
                          </td>
                          <td className="p-3.5 whitespace-nowrap text-xs font-mono text-slate-500 font-semibold">
                            {recFy}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full w-max ${
                                record.expenseCategory === 'fuel' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                record.expenseCategory === 'maintenance' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                record.expenseCategory === 'driver_allowance' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {getCategoryLabel(record.expenseCategory)}
                              </span>
                              {record.expenseCategory === 'fuel' && record.fuelLiters !== undefined && Number(record.fuelLiters) > 0 && (
                                <span className="text-[11px] font-bold text-amber-700 font-mono">
                                  {record.fuelLiters} लिटर
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-sm font-mono font-extrabold text-rose-600 text-right whitespace-nowrap">
                            रु. {record.amount?.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-sm font-mono font-bold text-slate-600">
                            {record.billNo || '-'}
                          </td>
                          <td className="p-3.5 text-sm font-semibold text-slate-800">
                            {record.paidTo || '-'}
                          </td>
                          <td className="p-3.5 text-sm text-slate-700 font-semibold">
                            {record.driverName || '-'}
                          </td>
                          <td className="p-3.5 text-xs font-mono font-bold text-slate-600">
                            {record.ambulanceNo || '-'}
                          </td>
                          <td className="p-3.5 text-sm text-slate-500 italic max-w-[200px] truncate" title={record.remarks}>
                            {record.remarks || '-'}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleExpenseEdit(record)}
                                className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-500 hover:text-emerald-700 transition-all"
                                title="सम्पादन गर्नुहोस्"
                              >
                                <Edit2 size={16} />
                              </button>
                              {canDelete ? (
                                <button
                                  onClick={() => {
                                    if (window.confirm('के तपाईं निश्चित रूपमा यो एम्बुलेन्स खर्च हटाउन चाहनुहुन्छ?')) {
                                      if (onDeleteExpense) onDeleteExpense(record.id);
                                      showToast('खर्च विवरण सफलतापूर्वक हटाइयो।', 'info');
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                                  title="मेटाउनुहोस्"
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="p-1.5 text-slate-200 cursor-not-allowed"
                                  title="हटाउने अधिकार छैन"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredExpenseRecords.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-200">
                      <td colSpan={4} className="p-3.5 text-right font-nepali">
                        जम्मा कुल रकम (Total Expense):
                      </td>
                      <td className="p-3.5 text-right font-mono text-rose-700 font-extrabold text-sm whitespace-nowrap">
                        रु. {filteredExpenseRecords.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}
                      </td>
                      <td colSpan={6} className="p-3.5 text-xs text-slate-500 font-nepali">
                        (सूचीमा प्रदर्शित {filteredExpenseRecords.length} वटा रेकर्डहरूको योगफल)
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* All Months Expense Summary Table */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2">
                  <Calendar className="text-emerald-600 size-5" />
                  महिनागत खर्च विवरण (Monthly Expense Breakdown - आ.व. {expenseFiscalYearFilter === 'all' ? currentFiscalYear : expenseFiscalYearFilter})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                      <th className="p-3.5 font-nepali text-center">महिना (Month)</th>
                      <th className="p-3.5 font-nepali text-right">इन्धन खर्च (Fuel)</th>
                      <th className="p-3.5 font-nepali text-right">मर्मत संभार (Maintenance)</th>
                      <th className="p-3.5 font-nepali text-right">चालक भत्ता (Allowance)</th>
                      <th className="p-3.5 font-nepali text-right">अन्य खर्च (Other)</th>
                      <th className="p-3.5 font-nepali text-right">कुल खर्च (Total)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allMonthsExpenseSummary.map(row => {
                      const isSelected = expenseMonthFilter === row.id;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setExpenseMonthFilter(isSelected ? 'all' : row.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-slate-50/70'
                          }`}
                          title={`क्लिक गरेर ${row.name} महिनाको खर्च सूची हेर्नुहोस्`}
                        >
                          <td className="p-3.5 font-bold text-slate-800 text-center font-nepali flex items-center justify-center gap-1.5">
                            {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                            <span>{row.name}</span>
                          </td>
                          <td className="p-3.5 text-right font-mono text-amber-700">
                            रु. {row.fuel.toLocaleString()}
                            {row.fuelLiters > 0 && <span className="block text-[10px] text-slate-400 font-sans">({row.fuelLiters} L)</span>}
                          </td>
                          <td className="p-3.5 text-right font-mono text-rose-700">रु. {row.maintenance.toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono text-indigo-700">रु. {row.driver_allowance.toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono text-slate-700">रु. {row.other.toLocaleString()}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-700">रु. {row.total.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      onClick={() => setExpenseMonthFilter('all')}
                      className="bg-emerald-50/60 font-bold text-emerald-900 border-t-2 border-emerald-100 cursor-pointer hover:bg-emerald-100/70 transition-colors"
                      title="सबै महिनाका खर्च सूची हेर्न यहाँ थिच्नुहोस्"
                    >
                      <td className="p-3.5 text-center font-nepali">जम्मा (Total - सबै महिना):</td>
                      <td className="p-3.5 text-right font-mono">रु. {allMonthsExpenseSummary.reduce((s, r) => s + r.fuel, 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono">रु. {allMonthsExpenseSummary.reduce((s, r) => s + r.maintenance, 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono">रु. {allMonthsExpenseSummary.reduce((s, r) => s + r.driver_allowance, 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono">रु. {allMonthsExpenseSummary.reduce((s, r) => s + r.other, 0).toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-800">रु. {allMonthsExpenseSummary.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'odometer' ? (
          <AmbulanceOdometerView
            odometerRecords={odometerRecords}
            tripRecords={records}
            expenseRecords={expenseRecords}
            currentFiscalYear={currentFiscalYear}
            generalSettings={generalSettings}
            currentUser={currentUser}
            users={users}
            onSaveOdometer={onSaveOdometer}
            onDeleteOdometer={onDeleteOdometer}
          />
        ) : activeTab === 'tracking' ? (
          <AmbulanceTracker currentUser={currentUser} generalSettings={generalSettings} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 print:hidden">
              <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2 shrink-0">
                <FileText className="text-amber-600 size-5" />
                एम्बुलेन्स लगबुक विवरण (Ambulance Log Book)
              </h3>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="खोज्नुहोस् (नाम, गाडी नम्बर, चालक वा रुट...)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Advanced Filters Section */}
            <div className="p-4 sm:p-5 bg-slate-50/40 border-b border-slate-150 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4 items-end print:hidden">
              {/* Month Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-slate-500 font-nepali flex items-center gap-1.5">
                  <Calendar size={13} className="text-amber-600" />
                  महिना चयन गर्नुहोस् (Month)
                </label>
                <select
                  value={logBookMonthFilter}
                  onChange={e => setLogBookMonthFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-slate-700 cursor-pointer"
                >
                  <option value="">सबै महिना (All Months)</option>
                  {NEPALI_MONTHS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Driver Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-slate-500 font-nepali flex items-center gap-1.5">
                  <UserIcon size={13} className="text-amber-600" />
                  चालक छान्नुहोस् (Driver)
                </label>
                <select
                  value={logBookDriverFilter}
                  onChange={e => setLogBookDriverFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-slate-700 cursor-pointer"
                >
                  <option value="">सबै चालक (All Drivers)</option>
                  {uniqueLogBookDrivers.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-bold text-slate-500 font-nepali flex items-center gap-1.5">
                  <Truck size={13} className="text-amber-600" />
                  एम्बुलेन्स / गाडी नं. (Vehicle)
                </label>
                <select
                  value={logBookVehicleFilter}
                  onChange={e => setLogBookVehicleFilter(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-slate-700 cursor-pointer"
                >
                  <option value="">सबै गाडी नम्बर (All Vehicles)</option>
                  {uniqueLogBookVehicles.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Clear/Reset Option */}
              {(logBookMonthFilter || logBookDriverFilter || logBookVehicleFilter || searchTerm) && (
                <div className="flex">
                  <button
                    onClick={() => {
                      setLogBookMonthFilter('');
                      setLogBookDriverFilter('');
                      setLogBookVehicleFilter('');
                      setSearchTerm('');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition-all w-full sm:w-auto text-center"
                  >
                    फिल्टरहरू रिसेट गर्नुहोस् (Reset)
                  </button>
                </div>
              )}
            </div>

            {/* Monthly Fuel Summary Display & Average Mileage Card */}
            {(monthlyFuelSummary.length > 0 || totalDrivenDistance > 0 || totalFuelLiters > 0) && (
              <div className="mx-4 sm:mx-5 my-4 grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
                {/* Left Side: Fuel Consumption by Month */}
                {monthlyFuelSummary.length > 0 ? (
                  <div className="lg:col-span-2 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-amber-900 font-nepali flex items-center gap-2 mb-3">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        महिना अनुसार इन्धन खपत विवरण (Monthly Fuel Consumption Summary)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                        {monthlyFuelSummary.map(item => (
                          <div key={item.id} className="bg-white p-3 rounded-xl border border-amber-150/80 shadow-sm hover:shadow transition-all space-y-1">
                            <p className="text-[11px] font-black text-slate-500 font-nepali">{item.name.split(' ')[0]}</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-black text-amber-700 font-mono">{item.liters.toFixed(1)}</span>
                              <span className="text-[10px] text-slate-500 font-bold font-nepali">लिटर</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold font-mono">रु. {item.cost.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs font-bold font-nepali text-amber-850">कूल जम्मा इन्धन खर्च (Total Fuel loaded):</p>
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-600 px-3 py-1 rounded-lg text-white font-mono font-bold text-xs">
                          {totalFuelLiters.toFixed(1)} Ltr
                        </div>
                        <p className="text-xs font-bold font-mono text-slate-600">
                          रु. {monthlyFuelSummary.reduce((sum, i) => sum + i.cost, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-2 p-5 bg-amber-50/20 border border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center text-center">
                    <p className="text-xs sm:text-sm font-bold text-slate-400 font-nepali">यो अवधिमा कुनै इन्धन खपत रेकर्ड फेला परेन।</p>
                  </div>
                )}

                {/* Right Side: Average Mileage Card */}
                <div className="lg:col-span-1 p-4 bg-emerald-50/50 border border-emerald-250 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-900 font-nepali flex items-center gap-2 mb-4">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      औसत एम्बुलेन्स माइलेज (Ambulance Mileage)
                    </h4>

                    <div className="space-y-3.5">
                      {/* Metric display box */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 font-nepali uppercase tracking-wider">औसत माइलेज (Average Mileage)</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-2xl font-black text-emerald-700 font-mono">
                              {averageMileage > 0 ? averageMileage.toFixed(2) : '0.00'}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 font-nepali">कि.मी./लिटर (KM/L)</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-emerald-100/50 text-emerald-700 rounded-xl">
                          <Truck size={20} className="stroke-[2.5]" />
                        </div>
                      </div>

                      {/* Detail distance and fuel parameters */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 font-nepali">कूल दूरी (Total KM)</p>
                          <p className="text-sm font-black text-slate-700 font-mono mt-1">
                            {totalDrivenDistance.toFixed(1)} <span className="text-[10px] text-slate-400 font-nepali">KM</span>
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 font-nepali">कूल इन्धन (Total Liters)</p>
                          <p className="text-sm font-black text-slate-700 font-mono mt-1">
                            {totalFuelLiters.toFixed(1)} <span className="text-[10px] text-slate-400 font-nepali">Ltr</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-emerald-250/20 text-[10px] sm:text-xs text-slate-500 font-semibold font-nepali">
                    <span className="font-bold text-emerald-800">विधि (Formula):</span> कूल चलेको दूरी कि.मी. / खपत भएको इन्धन लिटर (KM / Fuel Liters)
                  </div>
                </div>
              </div>
            )}

            {/* Print Header */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-5 mb-5">
              <div className="grid grid-cols-[100px_1fr_100px] items-center gap-4 text-center">
                {/* Left side: Main/Organization Logo */}
                <div className="flex justify-start">
                  {generalSettings && (
                    <LogoDisplay settings={generalSettings} width={75} height={75} />
                  )}
                </div>

                {/* Center: Headings 1, 2, 3, 4 from general settings */}
                <div className="space-y-1">
                  <h1 className="text-xl font-bold font-nepali tracking-wide leading-tight text-slate-950">
                    {generalSettings?.orgNameNepali || 'स्थानीय तह स्वास्थ्य संस्था'}
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
                  {generalSettings?.subTitleNepali4 && (
                    <p className="text-xs font-bold font-nepali leading-tight text-slate-800">
                      {generalSettings.subTitleNepali4}
                    </p>
                  )}
                  
                  <h2 className="text-base font-black font-nepali tracking-wider text-slate-950 pt-2 underline decoration-double decoration-1 underline-offset-4">
                    एम्बुलेन्स सेवा लगबुक रेकर्ड (Executive Vehicle Log Book)
                  </h2>
                </div>

                {/* Right side: Pradesh Logo */}
                <div className="flex justify-end">
                  <img
                    src={generalSettings?.provinceLogoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}
                    style={{ width: 75, height: 75, objectFit: 'contain' }}
                    alt="Province Logo"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Print Meta Values */}
              <div className="text-xs text-slate-700 font-bold flex flex-wrap items-center justify-center gap-6 mt-4 pt-2 border-t border-dashed border-slate-300">
                <span>आर्थिक वर्ष: {toNepaliDigits(currentFiscalYear)}</span>
                <span>छापिएको मिति: {toNepaliDigits(new NepaliDate().format('YYYY-MM-DD'))}</span>
                {logBookMonthFilter && (
                  <span className="border border-slate-300 px-2 py-0.5 rounded">महिना: {NEPALI_MONTHS.find(m => m.id === logBookMonthFilter)?.name || logBookMonthFilter}</span>
                )}
                {logBookDriverFilter && (
                  <span className="border border-slate-300 px-2 py-0.5 rounded">चालक: {logBookDriverFilter}</span>
                )}
                {logBookVehicleFilter && (
                  <span className="border border-slate-300 px-2 py-0.5 rounded">गाडी नं.: {logBookVehicleFilter}</span>
                )}
              </div>
            </div>

            {/* Print Friendly Monthly Summary */}
            {monthlyFuelSummary.length > 0 && (
              <div className="hidden print:block mx-2 my-4 p-4 border-2 border-slate-900">
                <h4 className="text-xs font-bold text-slate-950 font-nepali mb-2">महिना अनुसार इन्धन खपत विवरण (Monthly Fuel Summary)</h4>
                <table className="w-full text-xs text-left border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-900">
                      <th className="p-1.5 border-r border-slate-900 text-center font-nepali">महिना (Month)</th>
                      <th className="p-1.5 border-r border-slate-900 text-center font-nepali">जम्मा इन्धन (Total Liters)</th>
                      <th className="p-1.5 text-right font-nepali">जम्मा खर्च रकम (Total Cost)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyFuelSummary.map(item => (
                      <tr key={item.id} className="border-b border-slate-900">
                        <td className="p-1.5 border-r border-slate-900 text-center font-bold font-nepali">{item.name}</td>
                        <td className="p-1.5 border-r border-slate-900 text-center font-mono font-bold text-amber-900">{item.liters.toFixed(1)} लिटर</td>
                        <td className="p-1.5 text-right font-mono font-bold">रु. {item.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-extrabold font-mono border-t border-slate-900">
                      <td className="p-1.5 border-r border-slate-900 text-center font-nepali font-black">कुल योग (Total):</td>
                      <td className="p-1.5 border-r border-slate-900 text-center font-mono font-black">{totalFuelLiters.toFixed(1)} L</td>
                      <td className="p-1.5 text-right font-mono font-black">रु. {monthlyFuelSummary.reduce((sum, i) => sum + i.cost, 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Print Fuel Mileage Stats */}
                <div className="mt-4 pt-3 border-t border-slate-900 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div>
                    <span className="font-bold font-nepali">कूल यात्रा दूरी (Total Distance):</span> <span className="font-mono font-bold">{totalDrivenDistance.toFixed(1)} KM</span>
                  </div>
                  <div>
                    <span className="font-bold font-nepali">कूल खपत इन्धन (Total Fuel):</span> <span className="font-mono font-bold">{totalFuelLiters.toFixed(1)} Liters</span>
                  </div>
                  <div>
                    <span className="font-bold font-nepali">औसत माइलेज (Average Mileage):</span> <span className="font-mono font-black">{averageMileage > 0 ? averageMileage.toFixed(2) : '0.00'} KM/Ltr</span>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto p-2 print:p-0">
              <table className="w-full text-left border-collapse border-2 border-slate-900 text-[10px] print:text-[10px]">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100/50 text-slate-850 font-bold border-b border-2 border-slate-900">
                    <th className="p-1 border-r-2 border-slate-900 font-nepali text-center w-10">सि.नं.</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali text-center w-20">मिति</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali">गाडी नं.</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali">बिरामी</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali">रुट विवरण</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali text-center">शुरु कि.मी.</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali text-center">अन्तिम कि.मी.</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali text-center">दूरी (KM)</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali">चालक</th>
                    <th className="p-1 border-r-2 border-slate-900 font-nepali text-right text-red-700 font-bold">रकम</th>
                    <th className="p-1 font-nepali">कैफियत</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredLogBookRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-nepali">
                        लगबुकमा कुनै रेकर्ड फेला परेन।
                      </td>
                    </tr>
                  ) : (
                    filteredLogBookRecords.map((record, index) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-1 border-r-2 border-slate-900 text-center font-bold font-nepali">{toNepaliDigits(index + 1)}</td>
                        <td className="p-1 border-r-2 border-slate-900 text-center font-nepali">{toNepaliDigits(record.dateBs)}</td>
                        <td className="p-1 border-r-2 border-slate-900 font-semibold font-nepali">{record.ambulanceNo}</td>
                        <td className="p-1 border-r-2 border-slate-900">
                          <p className="font-bold text-slate-950 text-[10px]">{record.patientName}</p>
                          {(record.billNo || record.phone) && (
                            <p className="text-[9px] text-slate-500 font-nepali">
                              {[record.billNo && `बिल नं: ${toNepaliDigits(record.billNo)}`, record.phone && `संपर्क: ${toNepaliDigits(record.phone)}`].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </td>
                        <td className="p-1 border-r-2 border-slate-900">
                          <span className="font-medium text-amber-800">{record.startLocation}</span> ➔ <span className="font-medium text-teal-800">{record.destination}</span>
                        </td>
                        <td className="p-1 border-r-2 border-slate-900 text-center font-nepali font-bold text-slate-600">
                          {record.startOdometer !== undefined ? toNepaliDigits(record.startOdometer.toFixed(1)) : '-'}
                        </td>
                        <td className="p-1 border-r-2 border-slate-900 text-center font-nepali font-bold text-slate-600">
                          {record.endOdometer !== undefined ? toNepaliDigits(record.endOdometer.toFixed(1)) : '-'}
                        </td>
                        <td className="p-1 border-r-2 border-slate-900 text-center font-nepali font-extrabold text-teal-700">
                          {record.distanceKm ? `${toNepaliDigits(record.distanceKm.toFixed(1))} KM` : '-'}
                        </td>
                        <td className="p-1 border-r-2 border-slate-900 font-semibold text-slate-800 font-nepali">{record.driverName}</td>
                        <td className="p-1 border-r-2 border-slate-900 text-right font-nepali font-bold">
                          रु. {toNepaliDigits((record.amountCharged || 0).toFixed(2))}
                        </td>
                        <td className="p-1 text-slate-600 italic select-all text-[9px]">{record.remarks || '-'}</td>
                      </tr>
                    ))
                  )}

                  {/* Summary row */}
                  <tr className="bg-slate-100 font-black text-slate-950 border-t-2 border-slate-900">
                    <td colSpan={7} className="p-1 border-r-2 border-slate-900 text-right font-nepali">कुल जम्मा योग (Grand Total):</td>
                    <td className="p-1 border-r-2 border-slate-900 text-center font-nepali text-teal-850 font-black">
                      {toNepaliDigits(filteredLogBookRecords.reduce((sum, r) => sum + (r.distanceKm || 0), 0).toFixed(1))} KM
                    </td>
                    <td className="p-1 border-r-2 border-slate-900"></td>
                    <td className="p-1 border-r-2 border-slate-900 text-right font-nepali font-black">
                      रु. {toNepaliDigits(filteredLogBookRecords.reduce((sum, r) => sum + (r.amountCharged || 0), 0).toFixed(2))}
                    </td>
                    <td className="p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print Signatures */}
            <div className="hidden print:grid grid-cols-2 gap-10 mt-20 pt-10 text-center text-sm font-nepali">
              <div className="space-y-1">
                <div className="w-48 mx-auto border-b border-dashed border-slate-900 h-10"></div>
                <p className="font-bold text-slate-900">{assignedAmbulanceUser?.fullName || 'तयार गर्ने'}</p>
                <p className="text-xs text-slate-500">{assignedAmbulanceUser?.designation || ''}</p>
                <p className="text-xs text-slate-500">मिति: {toNepaliDigits(new NepaliDate().format('YYYY-MM-DD'))}</p>
              </div>
              <div className="space-y-1">
                <div className="w-48 mx-auto border-b border-dashed border-slate-900 h-10"></div>
                <p className="font-bold text-slate-900">{currentUser?.fullName || 'स्वीकृत गर्ने अधिकारी'}</p>
                <p className="text-xs text-slate-500">{currentUser?.designation || 'प्रशासकीय प्रमुख'}</p>
                <p className="text-xs text-slate-500">मिति: {toNepaliDigits(new NepaliDate().format('YYYY-MM-DD'))}</p>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
