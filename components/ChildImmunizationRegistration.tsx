
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Baby, Calendar, FileDigit, User, Phone, MapPin, Plus, Edit, Trash2, Search, UsersRound, Weight, Droplets, CheckCircle2, AlertTriangle, Info, Code, CalendarClock, MapPinned, X } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Option, OrganizationSettings } from '../types/coreTypes';
import { ChildImmunizationRecord, ChildImmunizationVaccine } from '../types/healthTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ChildImmunizationRegistrationProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
  generalSettings: OrganizationSettings;
  onAddRecord: (record: ChildImmunizationRecord) => void;
  onUpdateRecord: (record: ChildImmunizationRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onUpdateGeneralSettings?: (settings: OrganizationSettings) => void;
}

const genderOptions: Option[] = [
  { id: 'male', value: 'Male', label: 'पुरुष (Male)' },
  { id: 'female', value: 'Female', label: 'महिला (Female)' },
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

const jatCodeOptions: Option[] = [
  { id: '01', value: '01', label: '०१' },
  { id: '02', value: '02', label: '०२' },
  { id: '03', value: '03', label: '०३' },
  { id: '04', value: '04', label: '०४' },
  { id: '05', value: '05', label: '०५' },
  { id: '06', value: '06', label: '०६' },
];

export const NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE = [
    { name: 'BCG (जन्ममा)', relativeDays: 0, base: 'dob', cluster: 'जन्ममा' },
    { name: 'DPT-HepB-Hib-1 (६ हप्ता)', relativeDays: 42, base: 'dob', cluster: '६ हप्ता' },
    { name: 'OPV-1 (६ हप्ता)', relativeDays: 42, base: 'dob', cluster: '६ हप्ता' },
    { name: 'PCV-1 (६ हप्ता)', relativeDays: 42, base: 'dob', cluster: '६ हप्ता' },
    { name: 'Rota-1 (६ हप्ता)', relativeDays: 42, base: 'dob', cluster: '६ हप्ता' },
    { name: 'DPT-HepB-Hib-2 (१० हप्ता)', relativeDays: 28, base: 'DPT-HepB-Hib-1 (६ हप्ता)', cluster: '१० हप्ता' },
    { name: 'OPV-2 (१० हप्ता)', relativeDays: 28, base: 'OPV-1 (६ हप्ता)', cluster: '१० हप्ता' },
    { name: 'Rota-2 (१० हप्ता)', relativeDays: 28, base: 'Rota-1 (६ हप्ता)', cluster: '१० हप्ता' },
    { name: 'PCV-2 (१० हप्ता)', relativeDays: 28, base: 'PCV-1 (६ हप्ता)', cluster: '१० हप्ता' },
    { name: 'FIPV-1 (१४ हप्ता)', relativeDays: 28, base: 'DPT-HepB-Hib-2 (१० हप्ता)', cluster: '१४ हप्ता' },
    { name: 'DPT-HepB-Hib-3 (१४ हप्ता)', relativeDays: 28, base: 'DPT-HepB-Hib-2 (१० हप्ता)', cluster: '१४ हप्ता' },
    { name: 'OPV-3 (१४ हप्ता)', relativeDays: 28, base: 'OPV-2 (१० हप्ता)', cluster: '१४ हप्ता' },
    { name: 'MR-1 (९ महिना)', relativeDays: 270, base: 'dob', cluster: '९ महिना' },
    { name: 'PCV-3 (९ महिना)', relativeDays: 270, base: 'dob', cluster: '९ महिना' }, 
    { name: 'FIPV-2 (९ महिना)', relativeDays: 270, base: 'dob', cluster: '९ महिना' }, 
    { name: 'JE (१२ महिना)', relativeDays: 360, base: 'dob', cluster: '१२ महिना' }, 
    { name: 'MR-2 (१५ महिना)', relativeDays: 450, base: 'dob', cluster: '१५ महिना' },
    { name: 'Typhoid (१५ महिना)', relativeDays: 450, base: 'dob', cluster: '१५ महिना' },
    { name: 'HPV (१४ वर्ष)', relativeDays: 5110, base: 'dob', femaleOnly: true, cluster: '१४ वर्ष' }, 
];

export const isChildFullyImmunized = (record: ChildImmunizationRecord): boolean => {
  if (!record || !record.vaccines) return false;
  
  const requiredVaccines = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(v => !v.name.includes('HPV'));
  
  // A child is fully immunized if they have received all required vaccines (excluding HPV)
  const hasAllRequired = requiredVaccines.every(reqVax => {
    return record.vaccines.some(v => {
      if (v.status !== 'Given') return false;
      const nameLower = (v.name || '').toLowerCase();
      const reqLower = reqVax.name.toLowerCase();
      const normalize = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalize(v.name) === normalize(reqVax.name)) return true;
      
      // Fallbacks
      if (reqLower.includes('bcg') && nameLower.includes('bcg')) return true;
      if (reqLower.includes('dpt-hepb-hib-1') && (
        nameLower.includes('dpt-hepb-hib-1') || 
        nameLower.includes('dpt 1') || 
        nameLower.includes('penta-1') || 
        nameLower.includes('penta 1') || 
        nameLower.includes('pentavalent-1') || 
        nameLower.includes('pentavalent 1')
      )) return true;
      if (reqLower.includes('opv-1') && (nameLower.includes('opv-1') || nameLower.includes('opv 1') || nameLower.includes('polio 1'))) return true;
      if (reqLower.includes('pcv-1') && (nameLower.includes('pcv-1') || nameLower.includes('pcv 1'))) return true;
      if (reqLower.includes('rota-1') && (
        nameLower.includes('rota-1') || 
        nameLower.includes('rota 1') || 
        nameLower.includes('rotavirus-1') || 
        nameLower.includes('rotavirus 1')
      )) return true;
      if (reqLower.includes('dpt-hepb-hib-2') && (
        nameLower.includes('dpt-hepb-hib-2') || 
        nameLower.includes('dpt 2') || 
        nameLower.includes('penta-2') || 
        nameLower.includes('penta 2') || 
        nameLower.includes('pentavalent-2') || 
        nameLower.includes('pentavalent 2')
      )) return true;
      if (reqLower.includes('opv-2') && (nameLower.includes('opv-2') || nameLower.includes('opv 2') || nameLower.includes('polio 2'))) return true;
      if (reqLower.includes('rota-2') && (
        nameLower.includes('rota-2') || 
        nameLower.includes('rota 2') || 
        nameLower.includes('rotavirus-2') || 
        nameLower.includes('rotavirus 2')
      )) return true;
      if (reqLower.includes('pcv-2') && (nameLower.includes('pcv-2') || nameLower.includes('pcv 2'))) return true;
      if (reqLower.includes('fipv-1') && (
        nameLower.includes('fipv-1') || 
        nameLower.includes('fipv 1') || 
        (nameLower.includes('fipv') && !nameLower.includes('2') && !nameLower.includes('२'))
      )) return true;
      if (reqLower.includes('dpt-hepb-hib-3') && (
        nameLower.includes('dpt-hepb-hib-3') || 
        nameLower.includes('dpt 3') || 
        nameLower.includes('penta-3') || 
        nameLower.includes('penta 3') || 
        nameLower.includes('pentavalent-3') || 
        nameLower.includes('pentavalent 3')
      )) return true;
      if (reqLower.includes('opv-3') && (nameLower.includes('opv-3') || nameLower.includes('opv 3') || nameLower.includes('polio 3'))) return true;
      if (reqLower.includes('mr-1') && (nameLower.includes('mr-1') || nameLower.includes('mr 1') || nameLower.includes('measles 1'))) return true;
      if (reqLower.includes('pcv-3') && (nameLower.includes('pcv-3') || nameLower.includes('pcv 3'))) return true;
      if (reqLower.includes('fipv-2') && (nameLower.includes('fipv-2') || nameLower.includes('fipv 2'))) return true;
      if (reqLower.includes('je') && (nameLower.includes('je') || nameLower.includes('जे.ई.') || nameLower.includes('japanese'))) return true;
      if (reqLower.includes('mr-2') && (nameLower.includes('mr-2') || nameLower.includes('mr 2') || nameLower.includes('measles 2'))) return true;
      if (reqLower.includes('typhoid') && (nameLower.includes('typhoid') || nameLower.includes('टाइफाइड') || nameLower.includes('tcv'))) return true;
      return false;
    });
  });

  // Fallback or shortcut: if they received MR-2 or Typhoid (given here, not elsewhere)
  const hasCompletionVax = record.vaccines.some(v => v.status === 'Given' && !v.vaccinatedElsewhere && (v.name.toLowerCase().includes('mr-2') || v.name.toLowerCase().includes('typhoid')));

  return hasAllRequired || hasCompletionVax;
};

const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    }
    return new Date();
};

const toLocalISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const calculateImmunizationDate = (
    dobAd: string,
    relativeDays: number,
    baseName: string,
    allVaccines: ChildImmunizationVaccine[] = []
): { bs: string; ad: string; } => {
    try {
        let actualBaseAdDate = parseDateLocal(dobAd);
        
        if (baseName !== 'dob') {
            const baseVaccine = allVaccines.find(v => v.name === baseName);
            if (baseVaccine && baseVaccine.givenDateAd) {
                actualBaseAdDate = parseDateLocal(baseVaccine.givenDateAd);
            } else {
                return { bs: "N/A", ad: "N/A" };
            }
        }

        const scheduledAdDate = new Date(actualBaseAdDate);
        scheduledAdDate.setDate(actualBaseAdDate.getDate() + relativeDays);
        const scheduledAdDateString = toLocalISO(scheduledAdDate);

        // FIX: Corrected month index for NepaliDate constructor by passing the Date object directly
        let scheduledNepaliDate = new NepaliDate(scheduledAdDate);
        
        return {
            bs: scheduledNepaliDate.format('YYYY-MM-DD'),
            ad: scheduledAdDateString,
        };
    } catch (e) {
        console.error("Error calculating immunization date:", e); // Added error logging
        return { bs: "Error", ad: "Error" };
    }
};

const getInitialVaccineSchedule = (dobAd: string, gender: string): ChildImmunizationVaccine[] => {
  try {
    const filteredTemplate = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(v => {
      if (v.name.includes('HPV') && gender === 'Male') return false;
      return true;
    });

    return filteredTemplate.map(vaccine => {
      const { bs: scheduledDateBs, ad: scheduledDateAdString } = calculateImmunizationDate(
        dobAd,
        vaccine.relativeDays,
        vaccine.base,
        []
      );

      return {
        name: vaccine.name,
        cluster: vaccine.cluster,
        scheduledDateAd: scheduledDateAdString,
        scheduledDateBs: scheduledDateBs,
        givenDateAd: null, 
        givenDateBs: null, 
        status: 'Pending',
      } as ChildImmunizationVaccine;
    });
  } catch (e) {
    console.error("Error in getInitialVaccineSchedule:", e);
    return [];
  }
};

export const ChildImmunizationRegistration: React.FC<ChildImmunizationRegistrationProps> = ({
  currentFiscalYear,
  records,
  generalSettings,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  onUpdateGeneralSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedVaccineForUpdate, setSelectedVaccineForUpdate] = useState<{ record: ChildImmunizationRecord; vaccineIndex: number; } | null>(null);
  const [modalGivenDateBs, setModalGivenDateBs] = useState('');
  const [modalVaccinatedElsewhere, setModalVaccinatedElsewhere] = useState(false);

  const getTodayAd = () => toLocalISO(new Date());
  const getTodayBs = () => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (selectedVaccineForUpdate) {
      const { record, vaccineIndex } = selectedVaccineForUpdate;
      const currentVaccine = (record.vaccines || [])[vaccineIndex];
      if (currentVaccine) {
        setModalGivenDateBs(currentVaccine.givenDateBs || getTodayBs());
        setModalVaccinatedElsewhere(!!currentVaccine.vaccinatedElsewhere);
      }
    } else {
      setModalGivenDateBs('');
      setModalVaccinatedElsewhere(false);
    }
  }, [selectedVaccineForUpdate]);

  const centerOptions: Option[] = (generalSettings.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c }));

  const generateRegNo = (fy: string, recordsList: ChildImmunizationRecord[]) => {
    try {
      const fyClean = fy.replace('/', '');
      const maxNum = (recordsList || [])
        .filter(p => p && p.fiscalYear === fy && typeof p.regNo === 'string' && p.regNo.startsWith(`CIP-${fyClean}-`))
        .map(p => {
          const parts = p.regNo.split('-');
          return parts.length >= 3 ? parseInt(parts[2]) : 0;
        })
        .filter(n => !isNaN(n))
        .reduce((max, num) => Math.max(max, num), 0);
      return `CIP-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
    } catch (e) {
      console.error("Error generating reg no:", e);
      return `CIP-${fy.replace('/', '')}-001`;
    }
  };

  const [formData, setFormData] = useState<ChildImmunizationRecord>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: generateRegNo(currentFiscalYear, records),
    childName: '',
    gender: 'Male',
    dobBs: getTodayBs(),
    dobAd: getTodayAd(),
    jatCode: '',
    motherName: '',
    fatherName: '',
    address: '',
    phone: '',
    birthWeightKg: undefined,
    vaccines: getInitialVaccineSchedule(getTodayAd(), 'Male'),
    remarks: '',
    vaccinationCenter: centerOptions[0]?.value || '',
  });

  useEffect(() => {
    if (!editingRecordId) {
        setFormData(prev => ({
            ...prev,
            fiscalYear: currentFiscalYear,
            regNo: generateRegNo(currentFiscalYear, records),
            dobBs: getTodayBs(),
            dobAd: getTodayAd(),
            jatCode: '',
            vaccines: getInitialVaccineSchedule(getTodayAd(), 'Male'),
            vaccinationCenter: centerOptions[0]?.value || '',
        }));
    }
  }, [currentFiscalYear, records, editingRecordId, centerOptions[0]?.value]);

  useEffect(() => {
    if (formData.dobBs && !editingRecordId) {
        try {
            const filteredTemplate = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.filter(v => {
                if (v.name.includes('HPV') && formData.gender === 'Male') return false;
                return true;
            });

            const existingVaccines = formData.vaccines || [];
            const newSchedule: ChildImmunizationVaccine[] = filteredTemplate.map(vaccine => {
                const existing = existingVaccines.find(v => v.name === vaccine.name);
                
                if (existing && existing.status === 'Given') {
                    return {
                        ...existing,
                        cluster: vaccine.cluster
                    };
                }

                const { bs: scheduledDateBs, ad: scheduledDateAdString } = calculateImmunizationDate(
                    formData.dobAd,
                    vaccine.relativeDays,
                    vaccine.base,
                    existingVaccines
                );

                return {
                    name: vaccine.name,
                    cluster: vaccine.cluster,
                    scheduledDateAd: scheduledDateAdString,
                    scheduledDateBs: scheduledDateBs,
                    givenDateAd: existing ? existing.givenDateAd : null, 
                    givenDateBs: existing ? existing.givenDateBs : null, 
                    status: existing ? existing.status : 'Pending',
                } as ChildImmunizationVaccine;
            });
            setFormData(prev => ({ ...prev, vaccines: newSchedule }));
        } catch (e) {
            setValidationError("Error calculating schedule.");
        }
    }
  }, [formData.dobBs, formData.dobAd, formData.gender, editingRecordId]);

  const handleDOBBsChange = (dateBs: string) => {
    let dateAd = '';
    if (dateBs) {
      try {
        const nd = new NepaliDate(dateBs);
        dateAd = toLocalISO(nd.toJsDate());
      } catch (e) {}
    }
    setFormData(prev => ({ ...prev, dobBs: dateBs, dobAd: dateAd }));
  };

  const recalculateFutureDoses = useCallback((
    currentVaccines: ChildImmunizationVaccine[], 
    givenDoseName: string, 
    givenDateAd: string,
    givenDateBs: string,
    childDobAd: string,
    childGender: string
  ): ChildImmunizationVaccine[] => {
    const updatedVaccinesMap = new Map<string, ChildImmunizationVaccine>();
    currentVaccines.forEach(v => updatedVaccinesMap.set(v.name, v));
    
    if (givenDoseName) {
        const justGivenVaccine = updatedVaccinesMap.get(givenDoseName);
        if (justGivenVaccine) {
            updatedVaccinesMap.set(givenDoseName, { 
                ...justGivenVaccine, 
                givenDateAd, 
                givenDateBs, 
                status: 'Given'
            });
        }
    }

    const finalVaccinesOrdered: ChildImmunizationVaccine[] = [];

    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(templateVaccine => {
        if (templateVaccine.name.includes('HPV') && childGender === 'Male') return;

        const existingVaccineInMap = updatedVaccinesMap.get(templateVaccine.name);

        if (existingVaccineInMap && existingVaccineInMap.status === 'Given') {
            finalVaccinesOrdered.push({
                ...existingVaccineInMap,
                cluster: templateVaccine.cluster || existingVaccineInMap.cluster,
            });
        } else {
            const { bs: newScheduledDateBs, ad: newScheduledDateAd } = calculateImmunizationDate(
                childDobAd,
                templateVaccine.relativeDays,
                templateVaccine.base,
                Array.from(updatedVaccinesMap.values())
            );

            if (existingVaccineInMap) {
                finalVaccinesOrdered.push({
                    ...existingVaccineInMap,
                    cluster: templateVaccine.cluster,
                    scheduledDateAd: newScheduledDateAd,
                    scheduledDateBs: newScheduledDateBs,
                });
            } else {
                // This branch handles cases where a vaccine is in the template but not in existing vaccines
                finalVaccinesOrdered.push({
                    name: templateVaccine.name,
                    cluster: templateVaccine.cluster,
                    scheduledDateAd: newScheduledDateAd,
                    scheduledDateBs: newScheduledDateBs,
                    givenDateAd: null, givenDateBs: null,
                    status: 'Pending',
                });
            }
        }
    });

    return finalVaccinesOrdered;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.childName.trim() || !formData.dobBs.trim() || !formData.jatCode?.trim() || !formData.vaccinationCenter) {
      setValidationError("कृपया सबै तारा चिन्हित (*) विवरणहरू भर्नुहोस्।");
      return;
    }

    // Sanitize optional fields to null if they are undefined
    const sanitizedData = {
      ...formData,
      birthWeightKg: formData.birthWeightKg || null,
      remarks: formData.remarks || null,
      vaccinationCenter: formData.vaccinationCenter || null,
      jatCode: formData.jatCode || null,
    };

    const recordToSave: ChildImmunizationRecord = {
      ...sanitizedData,
      id: editingRecordId || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };

    // Deduct stock for vaccines that are newly marked as "Given"
    if (onUpdateGeneralSettings) {
      const oldRecord = editingRecordId ? records.find(r => r.id === editingRecordId) : null;
      const oldGivenVaccines = new Set(oldRecord ? (oldRecord.vaccines || []).filter(v => v.status === 'Given').map(v => v.name) : []);
      
      let updatedInventory = { ...(generalSettings.vaccineInventory || {}) };
      let inventoryChanged = false;
      let outOfStockWarnings: string[] = [];

      (formData.vaccines || []).forEach(v => {
        if (v.status === 'Given' && !v.vaccinatedElsewhere && !oldGivenVaccines.has(v.name)) {
          const currentStock = updatedInventory[v.name] || 0;
          if (currentStock > 0) {
            updatedInventory[v.name] = currentStock - 1;
            inventoryChanged = true;
          } else {
            outOfStockWarnings.push(v.name);
          }
        }
      });

      if (inventoryChanged) {
        onUpdateGeneralSettings({
          ...generalSettings,
          vaccineInventory: updatedInventory
        });
      }

      if (outOfStockWarnings.length > 0) {
        alert(`चेतावनी: निम्न खोपहरुको मौज्दात मौज्दात ० छ: ${outOfStockWarnings.join(', ')}। विवरण सुरक्षित गरिनेछ।`);
      }
    }

    if (editingRecordId) onUpdateRecord(recordToSave);
    else onAddRecord(recordToSave);
    
    setSuccessMessage('रेकर्ड सफलतापूर्वक सुरक्षित भयो!');
    handleReset();
    // NEW: Clear filters after successful save to ensure new/updated record is visible
    setSearchTerm('');
  };

  const handleEditRecord = (record: ChildImmunizationRecord) => {
    setEditingRecordId(record.id);
    const loadedRecord = { 
        ...record,
        vaccines: (record.vaccines || []).map(v => ({
            ...v,
            givenDateAd: v.givenDateAd || null,
            givenDateBs: v.givenDateBs || null,
        }))
    };
    const reEvaluatedVaccines = recalculateFutureDoses(loadedRecord.vaccines || [], "", "", "", loadedRecord.dobAd, loadedRecord.gender);
    setFormData({ ...loadedRecord, vaccines: reEvaluatedVaccines });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setEditingRecordId(null);
    setFormData(prev => ({
      ...prev,
      id: '',
      regNo: generateRegNo(currentFiscalYear, records),
      childName: '',
      gender: 'Male',
      dobBs: getTodayBs(),
      dobAd: getTodayAd(),
      jatCode: '',
      motherName: '',
      fatherName: '',
      address: '',
      phone: '',
      birthWeightKg: undefined,
      vaccines: getInitialVaccineSchedule(getTodayAd(), 'Male'),
      remarks: '',
      vaccinationCenter: centerOptions[0]?.value || '',
    }));
    setValidationError(null);
    setSuccessMessage(null); // Clear success message on reset
  };

  const handleFormVaccineChange = (vaccineName: string, status: 'Given' | 'Pending', givenDateBs: string, vaccinatedElsewhere?: boolean) => {
    let givenDateAd: string | null = null;
    if (status === 'Given' && givenDateBs) {
      try {
        const nd = new NepaliDate(givenDateBs);
        givenDateAd = toLocalISO(nd.toJsDate());
      } catch (e) {
        givenDateAd = formData.dobAd;
      }
    }

    const currentVaccines = formData.vaccines || [];
    
    // Map existing vaccines to update status and vaccinatedElsewhere for the target vaccine
    const targetVaccines = currentVaccines.map(v => {
      if (v.name === vaccineName) {
        return {
          ...v,
          status,
          givenDateBs: status === 'Given' ? givenDateBs : null,
          givenDateAd: status === 'Given' ? givenDateAd : null,
          vaccinatedElsewhere: status === 'Given' ? (vaccinatedElsewhere !== undefined ? vaccinatedElsewhere : !!v.vaccinatedElsewhere) : undefined
        };
      }
      return v;
    });

    // Call recalculateFutureDoses
    const updated = recalculateFutureDoses(
      targetVaccines,
      vaccineName,
      givenDateAd || '',
      givenDateBs,
      formData.dobAd,
      formData.gender
    );

    if (status === 'Pending') {
      const foundIdx = updated.findIndex(v => v.name === vaccineName);
      if (foundIdx !== -1) {
        updated[foundIdx] = {
          ...updated[foundIdx],
          status: 'Pending',
          givenDateAd: null,
          givenDateBs: null,
          vaccinatedElsewhere: undefined
        };
      }
      // Recalculate without any newly marked dose
      const finalRecalculated = recalculateFutureDoses(
        updated,
        "",
        "",
        "",
        formData.dobAd,
        formData.gender
      );
      setFormData(prev => ({ ...prev, vaccines: finalRecalculated }));
    } else {
      setFormData(prev => ({ ...prev, vaccines: updated }));
    }
  };

  const handleDeleteRecord = (recordId: string, childName: string) => {
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${childName} को रेकर्ड हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
      onDeleteRecord(recordId);
      setSuccessMessage(`${childName} को रेकर्ड सफलतापूर्वक हटाइयो।`);
    }
  };

  const handleUpdateDoseStatus = () => {
    if (!selectedVaccineForUpdate) return;
    const { record, vaccineIndex } = selectedVaccineForUpdate;
    const currentVaccine = (record.vaccines || [])[vaccineIndex];
    if (!currentVaccine) return;

    if (!modalGivenDateBs.trim()) {
        alert("कृपया खोप दिएको मिति भर्नुहोस्।");
        return;
    }
    
    const nd = new NepaliDate(modalGivenDateBs);
    const givenDateAd = toLocalISO(nd.toJsDate());

    // Consuming/Deducting vaccine stock once it is given to the child, UNLESS it's vaccinated elsewhere
    if (onUpdateGeneralSettings && currentVaccine.status !== 'Given' && !modalVaccinatedElsewhere) {
      const currentStock = generalSettings.vaccineInventory?.[currentVaccine.name] || 0;
      if (currentStock > 0) {
        const updatedInventory = {
          ...(generalSettings.vaccineInventory || {}),
          [currentVaccine.name]: currentStock - 1
        };
        onUpdateGeneralSettings({
          ...generalSettings,
          vaccineInventory: updatedInventory
        });
      } else {
        alert("चेतावनी: यस खोपको मौज्दात मौज्दात ० छ। विवरण त्यही पनि सुरक्षित गरिनेछ।");
      }
    }

    const preMappedVaccines = (record.vaccines || []).map((v, idx) => {
        if (idx === vaccineIndex) {
            return {
                ...v,
                status: 'Given' as const,
                givenDateAd,
                givenDateBs: modalGivenDateBs,
                vaccinatedElsewhere: modalVaccinatedElsewhere
            };
        }
        return v;
    });

    const finalVaccines = recalculateFutureDoses(preMappedVaccines, currentVaccine.name, givenDateAd, modalGivenDateBs, record.dobAd, record.gender);
    onUpdateRecord({ ...record, vaccines: finalVaccines });
    
    // If this record is currently being edited on the top form, update the form state as well
    if (editingRecordId === record.id) {
      setFormData(prev => ({
        ...prev,
        vaccines: finalVaccines
      }));
    }

    setSuccessMessage(`${record.childName} को खोप '${currentVaccine.name}' को विवरण सफलतापूर्वक सुरक्षित गरियो (Vaccine details successfully updated)`);
    setSelectedVaccineForUpdate(null);
  };

  const filteredRecords = useMemo(() => {
    return (records || [])
      .filter(r => {
        if (!r) return false;
        // Show if child belongs to the current fiscal year, OR if they are from an earlier/other fiscal year but not fully immunized
        if (r.fiscalYear === currentFiscalYear) return true;
        return !isChildFullyImmunized(r);
      })
      .filter(r => {
        const query = (searchTerm || '').toLowerCase();
        return (
          (r.childName || '').toLowerCase().includes(query) || 
          (r.regNo || '').toLowerCase().includes(query) ||
          (r.jatCode || '').toLowerCase().includes(query) ||
          (r.vaccinationCenter || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  }, [records, currentFiscalYear, searchTerm]);

  return (
    <div className="space-y-6">
      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 no-print">
          <AlertTriangle size={24} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">त्रुटि</h3>
            <p className="text-red-700 text-sm mt-1">{validationError}</p>
          </div>
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print">
          <CheckCircle2 size={24} className="text-green-500" />
          <div className="flex-1">
            <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो</h3>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={20} /></button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border shadow-sm no-print">
        <div className="flex items-center gap-2 mb-6 text-green-800 bg-green-50 p-3 rounded-lg border border-green-100">
            <Baby size={20} />
            <span className="font-semibold font-nepali">बच्चाको विवरण र खोप दर्ता</span>
        </div>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
          <Input label="दर्ता नम्बर" value={formData.regNo} readOnly className="bg-slate-50 font-bold text-green-700" icon={<FileDigit size={16} />} />
          <NepaliDatePicker label="जन्म मिति *" value={formData.dobBs} onChange={handleDOBBsChange} required />
          <Input label="बच्चाको नाम *" value={formData.childName} onChange={e => setFormData({...formData, childName: e.target.value})} required icon={<User size={16} />} />
          
          <Select label="खोप केन्द्र *" options={centerOptions} value={formData.vaccinationCenter || ''} onChange={e => setFormData({...formData, vaccinationCenter: e.target.value})} placeholder="-- केन्द्र छान्नुहोस् --" icon={<MapPinned size={16} />} />
          <Select label="लिङ्ग *" options={genderOptions} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})} />
          <Select label="जातीय कोड *" options={jatCodeOptions} value={formData.jatCode || ''} onChange={e => setFormData({...formData, jatCode: e.target.value})} placeholder="-- छान्नुहोस् --" icon={<Code size={16} />} />
          
          <Input label="आमाको नाम *" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} required icon={<User size={16} />} />
          <Input label="बुबाको नाम *" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} required icon={<User size={16} />} />
          <Input label="ठेगाना *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
          <Input label="फोन नं *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required icon={<Phone size={16} />} />
          
          {/* Vaccine Status Card inside Form */}
          <div className="md:col-span-3 mt-4 border-t pt-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-green-700" />
                <h4 className="font-bold text-slate-700 text-sm font-nepali">खोपहरूको स्थिति र लगाइएको विवरण (Vaccines Status & Records)</h4>
              </div>
              <p className="text-xs text-slate-500 mb-4 font-nepali">
                नयाँ बच्चा दर्ता गर्दा वा सम्पादन गर्दा, तलका खोपहरूको स्थिति 'लगाएको' (Given) वा 'बाँकी' (Pending) सेट गर्न सक्नुहुन्छ। 'लगाएको' छान्दा खोप लगाएको वास्तविक मिति भर्नुहोस्।
              </p>
              
              <div className="space-y-6">
                {['जन्ममा', '६ हप्ता', '१० हप्ता', '१४ हप्ता', '९ महिना', '१२ महिना', '१५ महिना', '१४ वर्ष'].map((clusterName) => {
                  const vaccinesInCluster = (formData.vaccines || []).filter(v => v.cluster === clusterName);
                  if (vaccinesInCluster.length === 0) return null;
                  
                  return (
                    <div key={clusterName} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{clusterName}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vaccinesInCluster.map((v) => {
                          const idx = (formData.vaccines || []).findIndex(origV => origV.name === v.name);
                          const isGiven = v.status === 'Given';
                          const originalRecord = editingRecordId ? records.find(r => r.id === editingRecordId) : null;
                          const isAlreadySavedAsGiven = !!(originalRecord && (originalRecord.vaccines || []).some(origV => origV.name === v.name && origV.status === 'Given'));
                          return (
                            <div 
                              key={v.name} 
                              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                                isGiven 
                                  ? 'bg-green-50/70 border-green-200 shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start gap-1 mb-2">
                                  <span className="font-bold text-xs text-slate-800 font-nepali">{v.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">सिफारिस: {v.scheduledDateBs}</span>
                                </div>
                                
                                <div className="mt-2.5 flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={isAlreadySavedAsGiven}
                                    onClick={() => !isAlreadySavedAsGiven && handleFormVaccineChange(v.name, 'Pending', '')}
                                    className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold border transition-all ${
                                      isAlreadySavedAsGiven
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                        : !isGiven 
                                          ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs' 
                                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    लगाउन बाँकी
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isAlreadySavedAsGiven}
                                    onClick={() => !isAlreadySavedAsGiven && handleFormVaccineChange(v.name, 'Given', v.givenDateBs || v.scheduledDateBs || getTodayBs())}
                                    className={`flex-1 py-1 px-2.5 rounded-lg text-[10px] font-bold border transition-all ${
                                      isAlreadySavedAsGiven
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                        : isGiven 
                                          ? 'bg-green-600 text-white border-green-600 shadow-sm' 
                                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    लगाएको (Given)
                                  </button>
                                </div>
                              </div>

                              {isGiven && (
                                <div className="mt-3.5 pt-3 border-t border-dashed border-green-200 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <label className="text-[10px] font-bold text-slate-500 font-nepali flex items-center justify-between">
                                    <span>लगाएको वास्तविक मिति:</span>
                                    {isAlreadySavedAsGiven && <span className="text-red-500 font-bold text-[8px] bg-red-50 border border-red-100 px-1 py-0.5 rounded">परिमार्जन गर्न नमिल्ने</span>}
                                  </label>
                                  <div className="flex gap-1.5 items-center">
                                    <div className="flex-1">
                                      <NepaliDatePicker
                                        label=""
                                        value={v.givenDateBs || ''}
                                        onChange={(val) => handleFormVaccineChange(v.name, 'Given', val)}
                                        disabled={isAlreadySavedAsGiven}
                                        hideIcon={true}
                                        inputClassName="h-8 py-1 text-xs font-mono font-bold"
                                      />
                                    </div>
                                    {!isAlreadySavedAsGiven && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleFormVaccineChange(v.name, 'Given', getTodayBs())}
                                          className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-[10px] font-bold rounded border border-green-200 transition-colors shrink-0 h-8 flex items-center justify-center"
                                          title="आजको मिति सेट गर्नुहोस्"
                                        >
                                          आज
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFormVaccineChange(v.name, 'Given', v.scheduledDateBs || '')}
                                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 transition-colors shrink-0 h-8 flex items-center justify-center"
                                          title="निर्धारित मिति सेट गर्नुहोस्"
                                        >
                                          सिफारिस
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2.5 flex items-center gap-2 bg-white/50 border border-green-100/50 p-1.5 rounded-lg">
                                    <input
                                      type="checkbox"
                                      id={`elsewhere-${v.name}`}
                                      checked={!!v.vaccinatedElsewhere}
                                      disabled={isAlreadySavedAsGiven}
                                      onChange={(e) => handleFormVaccineChange(v.name, 'Given', v.givenDateBs || '', e.target.checked)}
                                      className="w-3.5 h-3.5 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <label 
                                      htmlFor={`elsewhere-${v.name}`} 
                                      className="text-[10px] font-bold text-slate-600 font-nepali cursor-pointer select-none disabled:opacity-50 flex-1"
                                    >
                                      अन्यत्र लगाएको (Vaccinated Elsewhere)
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-3 pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={handleReset} className="px-6 py-2 bg-slate-100 rounded-lg text-sm font-bold">रिसेट</button>
            <button type="submit" className="px-8 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md">सुरक्षित गर्नुहोस्</button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 font-nepali">खोप तालिका विवरण</h3>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="नाम, दर्ता नं वा केन्द्र..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b">
              <tr>
                <th className="px-6 py-3">दर्ता नं / केन्द्र</th>
                <th className="px-6 py-3">बच्चाको विवरण</th>
                <th className="px-6 py-3">खोपको स्थिति</th>
                <th className="px-6 py-3 text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-green-700">{record.regNo}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1"><MapPinned size={10}/> {record.vaccinationCenter}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{record.childName}</div>
                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      <div><span className="font-medium text-slate-400">जन्म मिति:</span> <span className="font-mono font-bold text-slate-700">{record.dobBs}</span></div>
                      <div><span className="font-medium text-slate-400">अभिभावक:</span> {record.motherName} (आमा) {record.fatherName && `/ ${record.fatherName} (बुबा)`}</div>
                      <div><span className="font-medium text-slate-400">ठेगाना:</span> {record.address} | <span className="font-medium text-slate-400">फोन:</span> <span className="font-mono">{record.phone}</span></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-3">
                        {['जन्ममा', '६ हप्ता', '१० हप्ता', '१४ हप्ता', '९ महिना', '१२ महिना', '१५ महिना', '१४ वर्ष'].map((clusterName) => {
                          const vaccinesInCluster = (record.vaccines || []).filter(v => v.cluster === clusterName);
                          if (vaccinesInCluster.length === 0) return null;
                          return (
                            <div key={clusterName} className="flex flex-col gap-1">
                              <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 w-fit px-1 rounded">{clusterName}</span>
                              <div className="flex flex-wrap gap-1.5">
                                {vaccinesInCluster.map((v) => {
                                    const idx = (record.vaccines || []).findIndex(origV => origV.name === v.name);
                                    const isGiven = v.status === 'Given';
                                    return (
                                      <div 
                                          key={v.name} 
                                          onClick={() => {
                                              if (isGiven) return; 
                                              setSelectedVaccineForUpdate({ record, vaccineIndex: idx });
                                          }}
                                          className={`group relative px-2 py-1 rounded text-[9px] font-bold border flex flex-col items-center min-w-[70px] transition-all
                                              ${isGiven ? 'bg-green-100 text-green-800 border-green-200 cursor-not-allowed opacity-80' : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400 cursor-pointer'}`}
                                          title={isGiven ? "यो खोप लगाईसकेको हुनाले यसको मिति संशोधन गर्न मिल्दैन" : "खोपको विवरण अपडेट गर्नुहोस्"}
                                      >
                                          <span className="mb-0.5 text-center leading-tight">{v.name}</span>
                                          <div className="flex flex-col text-[7px] font-normal leading-tight">
                                              <span className="flex items-center gap-0.5 opacity-70"><CalendarClock size={7}/> {v.scheduledDateBs}</span>
                                              {v.givenDateBs && (
                                                <span className="flex items-center gap-0.5 text-green-700 font-bold">
                                                  <CheckCircle2 size={7}/> {v.givenDateBs} {v.vaccinatedElsewhere && <span className="text-[6px] text-amber-800 bg-amber-50 px-0.5 rounded border border-amber-100 font-nepali">अन्यत्र</span>}
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
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditRecord(record)} className="text-primary-600 hover:bg-primary-50 p-2 rounded-full"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteRecord(record.id, record.childName)} className="text-red-600 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedVaccineForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedVaccineForUpdate(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b bg-blue-50 text-blue-800 flex justify-between items-center">
                    <h3 className="font-bold font-nepali">खोप स्थिति अपडेट</h3>
                    <button onClick={() => setSelectedVaccineForUpdate(null)}><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-center bg-slate-50 p-3 rounded-lg border">
                        <h4 className="font-bold text-slate-800 text-sm">{selectedVaccineForUpdate.record.childName}</h4>
                        <p className="text-xs font-bold text-blue-600 mt-1">{selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].name}</p>
                        <div className="mt-2">
                          {(() => {
                            const stock = generalSettings.vaccineInventory?.[selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].name] ?? 0;
                            return (
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                उपलब्ध मौज्दात: {stock} Doses {stock === 0 ? '(0 स्टॉक - Warning)' : ''}
                              </span>
                            );
                          })()}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs border-b pb-1">
                            <span className="text-slate-500">निर्धारित मिति (Scheduled):</span>
                            <span className="font-bold">{selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].scheduledDateBs}</span>
                        </div>
                        <NepaliDatePicker 
                            label="लगाएको वास्तविक मिति (Administered) *" 
                            value={modalGivenDateBs} 
                            onChange={setModalGivenDateBs} 
                            required
                        />
                        <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="modal-elsewhere"
                              checked={modalVaccinatedElsewhere}
                              onChange={(e) => setModalVaccinatedElsewhere(e.target.checked)}
                              className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <label 
                              htmlFor="modal-elsewhere" 
                              className="text-xs font-bold text-slate-700 font-nepali cursor-pointer select-none"
                            >
                              अन्यत्र लगाएको (Vaccinated Elsewhere)
                            </label>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex gap-3">
                    <button onClick={() => setSelectedVaccineForUpdate(null)} className="flex-1 py-2 text-slate-600 font-bold border rounded-lg">रद्द</button>
                    <button onClick={handleUpdateDoseStatus} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm">सुरक्षित गर्नुहोस्</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};