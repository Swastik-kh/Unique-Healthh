
import { TBPatient, InventoryItem } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

export interface MedicineRequirement {
  itemName: string;
  dailyQuantity: number;
  totalNeeded: number;
  remainingNeeded: number;
  availableStock: number;
}

export const STANDARD_MEDICINE_NAMES = [
  'HRZE (Adult)', 'HR (Adult)', 'HRE (Adult)', 
  'HRZE (Child)', 'HR (Child)', 
  'Levofloxacin 250/500mg', 'Dapsone 100mg', 
  'Clofazimine 50mg', 'Clofazimine 100mg', 
  'Rifampicin 600mg', 'Rifampicin 450mg'
];

export const getCombinedStandardNames = (customNames: string[] = []) => {
  return Array.from(new Set([...STANDARD_MEDICINE_NAMES, ...customNames]));
};

const MEDICINE_MAPPINGS: Record<string, string[]> = {
  'HRZE (Adult)': ['HRZE', 'HRZE Adult', 'Isoniazid+Rifampicin+Pyrazinamide+Ethambutol', 'TB Intensive', '4FDC', 'Fixed Dose Combination Adult', 'RHZE'],
  'HR (Adult)': ['HR', 'HR Adult', 'Isoniazid+Rifampicin', 'TB Continuation', '2FDC', 'RH'],
  'HRE (Adult)': ['HRE', 'HRE Adult', 'Isoniazid+Rifampicin+Ethambutol', 'TB Continuation EP', '3FDC'],
  'HRZE (Child)': ['HRZE Child', 'Pediatric HRZE', 'H50/R75/Z150/E100', 'Child TB Intensive', 'RHZE Child', 'HRZ'],
  'HR (Child)': ['HR Child', 'Pediatric HR', 'H50/R75', 'Child TB Continuation', 'RH Child'],
  'Levofloxacin 250/500mg': ['Levofloxacin', 'Lfx', 'Levo', 'Levofloxacin 500', 'Levofloxacin 250'],
  'Dapsone 100mg': ['Dapsone', 'Dapsone 100mg', 'DDS', 'Leprosy Dapsone'],
  'Clofazimine 50mg': ['Clofazimine', 'Clofazimine 50mg', 'Lamprene', 'Clofazimine 50'],
  'Clofazimine 100mg': ['Clofazimine 100mg', 'Clofazimine 100'],
  'Rifampicin 600mg': ['Rifampicin', 'Rifampicin 600mg', 'Rifampin', 'Rifampicin 600'],
  'Rifampicin 450mg': ['Rifampicin 450mg', 'Rifampicin 450'],
};

export const fuzzyMatch = (stockName: string, targetName: string, customMappings: Record<string, string[]> = {}): boolean => {
  const stock = stockName.toLowerCase().trim();
  const target = targetName.toLowerCase().trim();
  
  // Exact match or very close match
  if (stock === target) return true;
  
  // Check if there's a custom mapping for this target (highest priority)
  const targetKey = Object.keys(customMappings).find(k => k.toLowerCase() === target);
  if (targetKey && customMappings[targetKey].length > 0) {
    // If custom mapping exists, ONLY use it (no fallback to default or broad match)
    return customMappings[targetKey].some(v => {
      const vLower = v.toLowerCase().trim();
      return stock === vLower || stock.includes(vLower);
    });
  }

  // Check default mappings (only if no custom mapping exists for this target)
  for (const [key, variations] of Object.entries(MEDICINE_MAPPINGS)) {
    if (key.toLowerCase() === target.toLowerCase()) {
      if (variations.some(v => stock.includes(v.toLowerCase()) || v.toLowerCase() === stock)) {
        return true;
      }
    }
  }
  
  // Fallback broad match - but be careful with HR vs HRZE
  // If target is "HR" but stock is "HRZE", it should NOT match
  if (target.includes('hr') && !target.includes('ze') && stock.includes('ze')) {
    return false;
  }

  if (stock.includes(target) || target.includes(stock)) return true;
  
  return false;
};

export const calculatePatientRequirements = (
  patient: TBPatient, 
  inventory: InventoryItem[], 
  customMappings: Record<string, string[]> = {}
): MedicineRequirement[] => {
  const requirements: MedicineRequirement[] = [];
  const weight = parseFloat(patient.weight || '0');
  const isChild = patient.regimen === 'Child';
  const isLeprosy = patient.serviceType === 'Leprosy';
  
  // Calculate days passed since treatment start
  let daysPassed = 0;
  try {
    const startDateStr = patient.treatmentStartDate || patient.registrationDate;
    if (startDateStr) {
      const parts = startDateStr.split(/[-/]/);
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const startNepali = new NepaliDate(y, m, d);
        const todayNepali = new NepaliDate();
        
        // Convert both to AD to calculate difference
        const startAd = startNepali.toJsDate();
        const todayAd = todayNepali.toJsDate();
        
        // Difference in milliseconds
        const diffTime = todayAd.getTime() - startAd.getTime();
        daysPassed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }
    }
  } catch (e) {
    // Fallback to completedSchedule if date calculation fails
    daysPassed = (patient.completedSchedule?.length || 0) * 30;
  }

  if (patient.serviceType === 'TB') {
    const treatmentType = patient.treatmentType || '2HRZE+4HR';
    
    let intensivePhaseDays = 60;
    let continuationPhaseDays = 120;
    let cpMedicineType: 'HR' | 'HRE' | 'HRZE' | 'None' = 'HR';
    let needsLfx = false;

    // Determine regimen based on treatmentType
    if (treatmentType.includes('6HRZE')) {
      intensivePhaseDays = 180;
      continuationPhaseDays = 0;
      cpMedicineType = 'None';
      if (treatmentType.includes('Lfx')) needsLfx = true;
    } else if (treatmentType.includes('7HRE')) {
      intensivePhaseDays = 60;
      continuationPhaseDays = 210;
      cpMedicineType = 'HRE';
    } else {
      // Default 2HRZE+4HR
      intensivePhaseDays = 60;
      continuationPhaseDays = 120;
      cpMedicineType = 'HR';
    }

    // Add extensions if present
    if (patient.intensivePhaseExtensionDays) {
      intensivePhaseDays += patient.intensivePhaseExtensionDays;
    }
    if (patient.continuationPhaseExtensionDays) {
      continuationPhaseDays += patient.continuationPhaseExtensionDays;
      // Cap continuation phase at 300 days total (as per user request)
      if (continuationPhaseDays > 300) {
        continuationPhaseDays = 300;
      }
    }
    
    // Intensive Phase Medicine (HRZE)
    const ipMedicineName = isChild ? 'HRZE (Child)' : 'HRZE (Adult)';
    let ipDailyQty = 0;
    if (!isChild) {
      if (weight >= 30 && weight <= 39) ipDailyQty = 2;
      else if (weight >= 40 && weight <= 54) ipDailyQty = 3;
      else if (weight >= 55 && weight <= 70) ipDailyQty = 4;
      else if (weight > 70) ipDailyQty = 5;
      else ipDailyQty = 2;
    } else {
      if (weight >= 4 && weight <= 7.9) ipDailyQty = 1;
      else if (weight >= 8 && weight <= 11.9) ipDailyQty = 2;
      else if (weight >= 12 && weight <= 15.9) ipDailyQty = 3;
      else if (weight >= 16 && weight <= 24.9) ipDailyQty = 4;
      else ipDailyQty = 1;
    }

    const ipRemainingDays = Math.max(0, intensivePhaseDays - daysPassed);
    const ipStock = inventory
      .filter(item => fuzzyMatch(item.itemName, ipMedicineName, customMappings))
      .reduce((sum, item) => sum + item.currentQuantity, 0);

    requirements.push({
      itemName: ipMedicineName,
      dailyQuantity: ipDailyQty,
      totalNeeded: ipDailyQty * intensivePhaseDays,
      remainingNeeded: ipDailyQty * ipRemainingDays,
      availableStock: ipStock
    });

    // Levofloxacin if needed
    if (needsLfx) {
      const lfxStock = inventory
        .filter(item => fuzzyMatch(item.itemName, 'Levofloxacin 250/500mg', customMappings))
        .reduce((sum, item) => sum + item.currentQuantity, 0);
      
      requirements.push({
        itemName: 'Levofloxacin 250/500mg',
        dailyQuantity: 1, // Usually 1 tab daily
        totalNeeded: 1 * intensivePhaseDays,
        remainingNeeded: 1 * ipRemainingDays,
        availableStock: lfxStock
      });
    }

    // Continuation Phase Medicine
    if (cpMedicineType !== 'None') {
      const cpMedicineName = cpMedicineType === 'HRE' ? 'HRE (Adult)' : (isChild ? 'HR (Child)' : 'HR (Adult)');
      let cpDailyQty = ipDailyQty;

      const cpCompletedDays = Math.max(0, daysPassed - intensivePhaseDays);
      const cpRemainingDays = Math.max(0, continuationPhaseDays - cpCompletedDays);
      const cpStock = inventory
        .filter(item => fuzzyMatch(item.itemName, cpMedicineName, customMappings))
        .reduce((sum, item) => sum + item.currentQuantity, 0);

      requirements.push({
        itemName: cpMedicineName,
        dailyQuantity: cpDailyQty,
        totalNeeded: cpDailyQty * continuationPhaseDays,
        remainingNeeded: cpDailyQty * cpRemainingDays,
        availableStock: cpStock
      });
    }
  } else if (isLeprosy) {
    const isMB = patient.leprosyType === 'MB';
    const totalMonths = isMB ? 12 : 6;
    const totalDays = totalMonths * 30;
    const remainingDays = Math.max(0, totalDays - daysPassed);

    // Dapsone (Daily)
    const dapsoneStock = inventory
      .filter(item => fuzzyMatch(item.itemName, 'Dapsone 100mg', customMappings))
      .reduce((sum, item) => sum + item.currentQuantity, 0);
    
    requirements.push({
      itemName: 'Dapsone 100mg',
      dailyQuantity: 1,
      totalNeeded: 1 * totalDays,
      remainingNeeded: 1 * remainingDays,
      availableStock: dapsoneStock
    });

    if (isMB) {
      // Clofazimine (Daily)
      const clofStock = inventory
        .filter(item => fuzzyMatch(item.itemName, 'Clofazimine 50mg', customMappings))
        .reduce((sum, item) => sum + item.currentQuantity, 0);
      
      requirements.push({
        itemName: 'Clofazimine 50mg',
        dailyQuantity: 1,
        totalNeeded: 1 * totalDays,
        remainingNeeded: 1 * remainingDays,
        availableStock: clofStock
      });
    }
  }

  return requirements.map(req => ({
    ...req,
    remainingNeeded: (patient.status === 'Active' || !patient.status) ? req.remainingNeeded : 0
  }));
};

export function checkDefaulter(patient: TBPatient): { isDefaulter: boolean; sinceDate?: string; treatmentStartDate?: string; daysSinceStopped?: number } {
  if (patient.status === 'Transfer Out') return { isDefaulter: false };
  if (!patient.treatmentStartDate || !patient.dailyDoses) return { isDefaulter: false };
  
  // 1. Convert treatmentStartDate (BS) to AD for comparison
  let startAd: Date | null = null;
  const startDateStr = patient.treatmentStartDate;
  const parts = startDateStr.split(/[-/]/);
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const startNepali = new NepaliDate(y, m, d);
    startAd = startNepali.toJsDate();
  }
  
  if (!startAd) return { isDefaulter: false };

  // 2. Get Today and Yesterday in AD, but we'll check against BS strings
  const todayAd = new Date();
  todayAd.setHours(0, 0, 0, 0);
  const yesterdayAd = new Date(todayAd.getTime() - 24 * 60 * 60 * 1000);
  
  const dosesSet = new Set(patient.dailyDoses);
  
  const getBsStr = (date: Date) => {
    const nep = new NepaliDate(date);
    const y = nep.getYear();
    const m = String(nep.getMonth() + 1).padStart(2, '0');
    const d = String(nep.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  const todayBs = getBsStr(todayAd);
  const yesterdayBs = getBsStr(yesterdayAd);
  
  // 3. Check if today or yesterday was taken
  if (dosesSet.has(todayBs) || dosesSet.has(yesterdayBs)) {
    return { isDefaulter: false };
  }
  
  // 4. If both missed, they are a defaulter.
  // Count consecutive missed days backwards from TODAY.
  let firstMissedDateBs: string = todayBs;
  let currentDate = new Date(todayAd);
  let consecutiveMissedDays = 0;
  
  while (currentDate >= startAd) {
    const dateBs = getBsStr(currentDate);
    if (!dosesSet.has(dateBs)) {
      consecutiveMissedDays++;
      firstMissedDateBs = dateBs; // This will eventually be the earliest missed day in the current streak
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return { 
      isDefaulter: true, 
      sinceDate: firstMissedDateBs,
      treatmentStartDate: patient.treatmentStartDate,
      daysSinceStopped: consecutiveMissedDays
  };
}
