import React, { useState, useEffect, useMemo } from 'react';
import { 
  Syringe, 
  Calendar, 
  Save, 
  Trash2, 
  Plus, 
  Edit, 
  RotateCcw, 
  Package, 
  Layers,
  FileCheck,
  AlertCircle,
  TrendingUp,
  Info,
  Filter,
  Printer
} from 'lucide-react';
import { db, safeEncodeKey } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { ChildImmunizationRecord, GarbhawatiPatient } from '../types/healthTypes';
import { OrganizationSettings } from '../types/coreTypes';

interface VaccineInventoryMonthlyProps {
  currentFiscalYear: string;
  activeOrgName: string;
  generalSettings: OrganizationSettings;
  bachhaImmunizationRecords: ChildImmunizationRecord[];
  garbhawatiPatients: GarbhawatiPatient[];
  showSettings?: boolean;
}

const NEPALI_MONTHS = [
  'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत', 'वैशाख', 'जेठ', 'असार'
];

const VACCINE_ITEMS = [
  { id: 'bcg', label: 'BCG (बि.सि.जि.)', name: 'BCG' },
  { id: 'dpt', label: 'DPT (डी.पी.टी. - १, २, ३)', name: 'DPT' },
  { id: 'opv', label: 'OPV (ओ.पी.भी. - १, २, ३)', name: 'OPV' },
  { id: 'rota', label: 'Rota (रोटा - १, २)', name: 'Rota' },
  { id: 'pcv', label: 'PCV (पी.सी.भी. - १, २, ३)', name: 'PCV' },
  { id: 'fipv', label: 'FIPV (एफ.आई.पी.भी. - १, २)', name: 'FIPV' },
  { id: 'mr', label: 'MR (एम.आर. - १, २)', name: 'MR' },
  { id: 'je', label: 'JE (जे.ई.)', name: 'JE' },
  { id: 'typhoid', label: 'Typhoid (टाईफाईड)', name: 'Typhoid' },
  { id: 'hpv', label: 'HPV (एच.पी.भी.)', name: 'HPV' },
  { id: 'td', label: 'TD (टी.डी. - गर्भवती महिला)', name: 'TD' }
];

const SUPPLY_ITEMS = [
  { id: 's_05', name: 's_0_05_ml_AD_syringe', label: '0.05 ml AD Syringe' },
  { id: 's_1', name: 's_0_1_ml_AD_syringe', label: '0.1 ml AD Syringe' },
  { id: 's_5_ml', name: 's_0_5_ml_AD_syringe', label: '0.5 ml AD Syringe' },
  { id: 's_2_rec', name: 's_2_ml_reconstituent_syringe', label: '2 ml Reconstituent Syringe' },
  { id: 's_5_rec', name: 's_5_ml_reconstituent_syringe', label: '5 ml Reconstituent Syringe' },
  { id: 'fid_card', name: 'fid_card', label: 'FID Card (खोप कार्ड)' },
  { id: 'safety_box', name: 'safety_box', label: 'Safety Box (सुरक्षित बाकस)' }
];

const getMonthFromBsDate = (dateBs?: string | null): string | null => {
  if (!dateBs) return null;
  const parts = dateBs.split(/[-/]/);
  if (parts.length < 2) return null;
  const monthNum = parseInt(parts[1], 10);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return null;
  
  const monthNames = [
    'वैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
  ];
  return monthNames[monthNum - 1] || null;
};

export const VaccineInventoryMonthly: React.FC<VaccineInventoryMonthlyProps> = ({
  currentFiscalYear,
  activeOrgName,
  generalSettings,
  bachhaImmunizationRecords = [],
  garbhawatiPatients = [],
  showSettings
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('साउन');
  const [vaccineInputs, setVaccineInputs] = useState<Record<string, number>>({});
  const [vaccineExpenses, setVaccineExpenses] = useState<Record<string, number>>({});
  const [supplyInputs, setSupplyInputs] = useState<Record<string, number>>({});
  const [supplyExpenses, setSupplyExpenses] = useState<Record<string, number>>({});
  
  // History list filter selection
  const [filterItem, setFilterItem] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  
  // Summary lists month filter selection
  const [summaryMonth, setSummaryMonth] = useState<string>('all');
  
  const [monthlyRecords, setMonthlyRecords] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fiscalYearClean = currentFiscalYear.replace('/', '-');

  // Load monthly receipts from database
  useEffect(() => {
    if (!activeOrgName) return;
    setIsLoading(true);
    const encodedOrgName = safeEncodeKey(activeOrgName);
    const receiptsRef = ref(db, `orgData/${encodedOrgName}/vaccineReceipts/${fiscalYearClean}`);
    
    const unsubscribe = onValue(receiptsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setMonthlyRecords(val);
      } else {
        setMonthlyRecords({});
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading monthly receipts:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeOrgName, fiscalYearClean]);

  // Load a record for editing
  const loadMonthRecordForEdit = (monthName: string) => {
    setSelectedMonth(monthName);
    const record = monthlyRecords[monthName] || {};
    
    const vaccines = record.vaccines || {};
    const supplies = record.supplies || {};
    const vExpenses = record.vaccineExpenses || {};
    const sExpenses = record.supplyExpenses || {};
    
    const vInputs: Record<string, number> = {};
    const vExps: Record<string, number> = {};
    VACCINE_ITEMS.forEach(v => {
      vInputs[v.name] = vaccines[v.name] || 0;
      vExps[v.name] = vExpenses[v.name] || 0;
    });

    const sInputs: Record<string, number> = {};
    const sExps: Record<string, number> = {};
    SUPPLY_ITEMS.forEach(s => {
      sInputs[s.name] = supplies[s.name] || 0;
      sExps[s.name] = sExpenses[s.name] || 0;
    });

    setVaccineInputs(vInputs);
    setVaccineExpenses(vExps);
    setSupplyInputs(sInputs);
    setSupplyExpenses(sExps);
    
    // Smooth scroll to form
    const formElement = document.getElementById('monthly-receipt-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Pre-fill form when selected month changes
  useEffect(() => {
    const record = monthlyRecords[selectedMonth];
    if (record) {
      const vInputs: Record<string, number> = {};
      const vExps: Record<string, number> = {};
      VACCINE_ITEMS.forEach(v => {
        vInputs[v.name] = record.vaccines?.[v.name] || 0;
        vExps[v.name] = record.vaccineExpenses?.[v.name] || 0;
      });
      const sInputs: Record<string, number> = {};
      const sExps: Record<string, number> = {};
      SUPPLY_ITEMS.forEach(s => {
        sInputs[s.name] = record.supplies?.[s.name] || 0;
        sExps[s.name] = record.supplyExpenses?.[s.name] || 0;
      });
      setVaccineInputs(vInputs);
      setVaccineExpenses(vExps);
      setSupplyInputs(sInputs);
      setSupplyExpenses(sExps);
    } else {
      setVaccineInputs({});
      setVaccineExpenses({});
      setSupplyInputs({});
      setSupplyExpenses({});
    }
  }, [selectedMonth, monthlyRecords]);

  // Reset current form inputs
  const handleResetForm = () => {
    setVaccineInputs({});
    setVaccineExpenses({});
    setSupplyInputs({});
    setSupplyExpenses({});
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  // Save/Update monthly records to Firebase
  const handleSaveReceipts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgName) {
      setErrorMsg("कार्यालयको विवरण फेला परेन।");
      return;
    }

    const isEditing = !!monthlyRecords[selectedMonth];
    const confirmMessage = isEditing 
      ? `के तपाईं ${selectedMonth} महिनाको खोप तथा सामग्रीको रेकर्ड अपडेट गर्न निश्चित हुनुहुन्छ?`
      : `के तपाईं ${selectedMonth} महिनाको खोप तथा सामग्रीको नयाँ रेकर्ड सुरक्षित गर्न निश्चित हुनुहुन्छ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const vaccinesToSave: Record<string, number> = {};
      const vaccineExpensesToSave: Record<string, number> = {};
      VACCINE_ITEMS.forEach(v => {
        vaccinesToSave[v.name] = vaccineInputs[v.name] || 0;
        vaccineExpensesToSave[v.name] = vaccineExpenses[v.name] || 0;
      });

      const suppliesToSave: Record<string, number> = {};
      const supplyExpensesToSave: Record<string, number> = {};
      SUPPLY_ITEMS.forEach(s => {
        suppliesToSave[s.name] = supplyInputs[s.name] || 0;
        supplyExpensesToSave[s.name] = supplyExpenses[s.name] || 0;
      });

      const encodedOrgName = safeEncodeKey(activeOrgName);
      const recordRef = ref(db, `orgData/${encodedOrgName}/vaccineReceipts/${fiscalYearClean}/${selectedMonth}`);
      
      await set(recordRef, {
        month: selectedMonth,
        vaccines: vaccinesToSave,
        supplies: suppliesToSave,
        vaccineExpenses: vaccineExpensesToSave,
        supplyExpenses: supplyExpensesToSave,
        updatedAt: new Date().toISOString()
      });

      setSuccessMsg(`${selectedMonth} महिनाको प्राप्त तथा खर्च खोप र सामग्री विवरण सुरक्षित गरियो।`);
      setErrorMsg(null);
      
      // Auto clear success message after 4 seconds
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Error saving receipts:", err);
      setErrorMsg("विवरण सुरक्षित गर्दा त्रुटि भयो: " + err.message);
    }
  };

  // Delete a month's record
  const handleDeleteRecord = async (monthName: string) => {
    if (!window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${monthName} महिनाको प्राप्ति रेकर्ड हटाउन चाहनुहुन्छ?`)) {
      return;
    }

    try {
      const encodedOrgName = safeEncodeKey(activeOrgName);
      const recordRef = ref(db, `orgData/${encodedOrgName}/vaccineReceipts/${fiscalYearClean}/${monthName}`);
      await remove(recordRef);
      setSuccessMsg(`${monthName} महिनाको रेकर्ड हटाइयो।`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Error deleting monthly record:", err);
      setErrorMsg("विवरण हटाउँदा त्रुटि भयो: " + err.message);
    }
  };

  // Helper: Convert English numbers to Nepali digits
  const toNepaliDigits = (num: string | number) => {
    if (num === undefined || num === null) return '';
    const numbers: Record<string, string> = {
      '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
      '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
    };
    return num.toString().split('').map(x => numbers[x] || x).join('');
  };

  // Computes UTILIZED doses based on Child/Maternal registered records in this fiscal year
  const utilizationStats = useMemo(() => {
    const stats: Record<string, number> = {
      BCG: 0,
      DPT: 0,
      OPV: 0,
      Rota: 0,
      PCV: 0,
      FIPV: 0,
      MR: 0,
      JE: 0,
      Typhoid: 0,
      HPV: 0,
      TD: 0
    };

    // Calculate vaccine doses from Child registrations
    bachhaImmunizationRecords.forEach(record => {
      if (record.fiscalYear !== currentFiscalYear) return;
      
      (record.vaccines || []).forEach(vax => {
        if (vax.status === 'Given') {
          if (summaryMonth !== 'all') {
            const vaxMonth = getMonthFromBsDate(vax.givenDateBs);
            if (vaxMonth !== summaryMonth) return;
          }

          const name = vax.name;
          
          if (name.startsWith('BCG')) {
            stats.BCG += 1;
          } else if (name.startsWith('DPT')) {
            stats.DPT += 1;
          } else if (name.startsWith('OPV')) {
            stats.OPV += 1;
          } else if (name.startsWith('Rota')) {
            stats.Rota += 1;
          } else if (name.startsWith('PCV')) {
            stats.PCV += 1;
          } else if (name.startsWith('FIPV')) {
            stats.FIPV += 1;
          } else if (name.startsWith('MR')) {
            stats.MR += 1;
          } else if (name.startsWith('JE')) {
            stats.JE += 1;
          } else if (name.startsWith('Typhoid')) {
            stats.Typhoid += 1;
          } else if (name.startsWith('HPV')) {
            stats.HPV += 1;
          }
        }
      });
    });

    // Calculate TD doses from Maternal registrations
    garbhawatiPatients.forEach(patient => {
      if (patient.fiscalYear !== currentFiscalYear) return;
      
      if (patient.td1DateBs) {
        if (summaryMonth === 'all' || getMonthFromBsDate(patient.td1DateBs) === summaryMonth) {
          stats.TD += 1;
        }
      }
      if (patient.td2DateBs) {
        if (summaryMonth === 'all' || getMonthFromBsDate(patient.td2DateBs) === summaryMonth) {
          stats.TD += 1;
        }
      }
      if (patient.tdBoosterDateBs) {
        if (summaryMonth === 'all' || getMonthFromBsDate(patient.tdBoosterDateBs) === summaryMonth) {
          stats.TD += 1;
        }
      }
    });

    return stats;
  }, [bachhaImmunizationRecords, garbhawatiPatients, currentFiscalYear, summaryMonth]);

  // Aggregate total received and expended quantities per item for the whole fiscal year or filtered by summaryMonth
  const cumulativeStats = useMemo(() => {
    const vaccineTotals: Record<string, number> = {};
    const vaccineExpTotals: Record<string, number> = {};
    const supplyTotals: Record<string, number> = {};
    const supplyExpTotals: Record<string, number> = {};

    VACCINE_ITEMS.forEach(v => { 
      vaccineTotals[v.name] = 0; 
      vaccineExpTotals[v.name] = 0;
    });
    SUPPLY_ITEMS.forEach(s => { 
      supplyTotals[s.name] = 0; 
      supplyExpTotals[s.name] = 0;
    });

    Object.entries(monthlyRecords).forEach(([monthName, record]: [string, any]) => {
      if (summaryMonth !== 'all' && monthName !== summaryMonth) return;

      if (record.vaccines) {
        Object.entries(record.vaccines).forEach(([name, qty]) => {
          if (vaccineTotals[name] !== undefined) {
            vaccineTotals[name] += (qty as number) || 0;
          }
        });
      }
      if (record.vaccineExpenses) {
        Object.entries(record.vaccineExpenses).forEach(([name, qty]) => {
          if (vaccineExpTotals[name] !== undefined) {
            vaccineExpTotals[name] += (qty as number) || 0;
          }
        });
      }
      if (record.supplies) {
        Object.entries(record.supplies).forEach(([name, qty]) => {
          if (supplyTotals[name] !== undefined) {
            supplyTotals[name] += (qty as number) || 0;
          }
        });
      }
      if (record.supplyExpenses) {
        Object.entries(record.supplyExpenses).forEach(([name, qty]) => {
          if (supplyExpTotals[name] !== undefined) {
            supplyExpTotals[name] += (qty as number) || 0;
          }
        });
      }
    });

    return { 
      vaccinesRec: vaccineTotals, 
      vaccinesExp: vaccineExpTotals, 
      suppliesRec: supplyTotals, 
      suppliesExp: supplyExpTotals 
    };
  }, [monthlyRecords, summaryMonth]);

  const handlePrintHistory = () => {
    const filteredMonths = NEPALI_MONTHS.filter(m => filterMonth === 'all' || filterMonth === m);
    
    let filterDescription = '';
    if (filterMonth === 'all') {
      filterDescription += 'महिना: सबै महिना';
    } else {
      filterDescription += `महिना: ${filterMonth}`;
    }
    
    let itemLabel = 'सबै खोप र सामग्री';
    if (filterItem !== 'all') {
      if (filterItem.startsWith('v_')) {
        const name = filterItem.substring(2);
        itemLabel = VACCINE_ITEMS.find(item => item.name === name)?.label || name;
      } else if (filterItem.startsWith('s_')) {
        const name = filterItem.substring(2);
        itemLabel = SUPPLY_ITEMS.find(item => item.name === name)?.label || name;
      }
    }
    filterDescription += ` | विवरण: ${itemLabel}`;

    let tableRowsHtml = '';

    if (filterItem === 'all') {
      tableRowsHtml = filteredMonths.map(m => {
        const rec = monthlyRecords[m];
        if (!rec) return '';
        
        let rows = '';
        
        // Vaccine items
        VACCINE_ITEMS.forEach(v => {
           const vRec = rec.vaccines?.[v.name] || 0;
           const vExp = rec.vaccineExpenses?.[v.name] || 0;
           if (vRec === 0 && vExp === 0) return;
           rows += `
             <tr>
               <td class="text-center font-bold">${m}</td>
               <td class="font-bold">${v.label}</td>
               <td class="text-center font-mono">${toNepaliDigits(vRec)} Doses</td>
               <td class="text-center font-mono">${toNepaliDigits(vExp)} Doses</td>
             </tr>
           `;
        });
        
        // Supply items
        SUPPLY_ITEMS.forEach(s => {
           const sRec = rec.supplies?.[s.name] || 0;
           const sExp = rec.supplyExpenses?.[s.name] || 0;
           if (sRec === 0 && sExp === 0) return;
           rows += `
             <tr>
               <td class="text-center font-bold">${m}</td>
               <td class="font-bold">${s.label}</td>
               <td class="text-center font-mono">${toNepaliDigits(sRec)} थान</td>
               <td class="text-center font-mono">${toNepaliDigits(sExp)} थान</td>
             </tr>
           `;
        });

        return rows || `
          <tr>
            <td class="text-center font-bold">${m}</td>
            <td colspan="3" class="text-center italic text-slate-400">कुनै रेकर्ड छैन</td>
          </tr>
        `;
      }).join('');
    } else {
      tableRowsHtml = filteredMonths.map(m => {
        const rec = monthlyRecords[m];
        if (!rec) return '';

        let receivedVal = 0;
        let expendedVal = 0;
        let typeLabel = '';

        if (filterItem.startsWith('v_')) {
          const name = filterItem.substring(2);
          receivedVal = rec.vaccines?.[name] || 0;
          expendedVal = rec.vaccineExpenses?.[name] || 0;
          typeLabel = 'Doses';
        } else if (filterItem.startsWith('s_')) {
          const name = filterItem.substring(2);
          receivedVal = rec.supplies?.[name] || 0;
          expendedVal = rec.supplyExpenses?.[name] || 0;
          typeLabel = 'थान';
        }

        return `
          <tr>
            <td class="text-center font-bold">${m}</td>
            <td class="font-bold">${itemLabel}</td>
            <td class="text-center font-mono text-indigo-700 font-bold">${toNepaliDigits(receivedVal)} ${typeLabel}</td>
            <td class="text-center font-mono text-rose-600 font-bold">${toNepaliDigits(expendedVal)} ${typeLabel}</td>
            <td class="text-center font-mono font-bold">${toNepaliDigits(Math.max(0, receivedVal - expendedVal))} ${typeLabel}</td>
          </tr>
        `;
      }).join('');
    }

    const tableHeadersHtml = filterItem === 'all' ? `
      <tr>
        <th class="p-2 text-center" style="width: 15%">महिना</th>
        <th class="p-2 text-left" style="width: 45%">विवरण</th>
        <th class="p-2 text-center" style="width: 20%">प्राप्त</th>
        <th class="p-2 text-center" style="width: 20%">खर्च</th>
      </tr>
    ` : `
      <tr>
        <th class="p-2 text-center" style="width: 15%">महिना</th>
        <th class="p-2 text-left" style="width: 35%">विवरण</th>
        <th class="p-2 text-center" style="width: 15%">प्राप्त</th>
        <th class="p-2 text-center" style="width: 15%">खर्च</th>
        <th class="p-2 text-center" style="width: 20%">बाँकी</th>
      </tr>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>मासिक खोप तथा सामग्री मौज्दात प्रतिवेदन</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { margin: 10mm; size: A4 portrait; }
          body { 
            font-family: 'Mukta', sans-serif; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            padding: 20px;
          }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 6px 10px; }
          thead th { background-color: #f3f4f6; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="text-center mb-6 border-b-2 border-slate-900 pb-4">
          <p class="text-lg font-bold text-red-600">नेपाल सरकार</p>
          <h2 class="text-2xl font-black text-slate-950">${activeOrgName || generalSettings.organizationName || 'स्वास्थ्य संस्था'}</h2>
          <p class="text-sm font-bold text-slate-700">खोप सेवा तथा सामग्री रेकर्ड प्रतिवेदन (Inventory Ledger)</p>
          <p class="text-xs font-bold text-slate-500 mt-1">आर्थिक वर्ष: ${toNepaliDigits(currentFiscalYear)}</p>
        </div>

        <div class="mb-4 flex justify-between items-center text-xs text-slate-700 font-bold bg-slate-50 p-3 rounded border border-slate-200">
          <div>फिल्टर: ${filterDescription}</div>
          <div>प्रतिवेदन मिति: ${toNepaliDigits(new Date().toLocaleDateString('ne-NP') || new Date().toISOString().split('T')[0])}</div>
        </div>

        <table>
          <thead>
            ${tableHeadersHtml}
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="5" class="text-center py-8 italic text-slate-400">कुनै रेकर्ड फेला परेन।</td></tr>'}
          </tbody>
        </table>

        <!-- Footer signatures -->
        <div class="grid grid-cols-2 gap-10 mt-16 text-center text-xs font-bold">
          <div class="border-t border-slate-900 pt-2 mt-8">तयार गर्ने (Prepared By)</div>
          <div class="border-t border-slate-900 pt-2 mt-8">स्वीकृत गर्ने (Approved/Verified By)</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 800);
          };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-bounce-subtle">
          <FileCheck className="text-emerald-500 shrink-0" size={24} />
          <p className="text-emerald-800 font-bold text-sm font-nepali">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
          <AlertCircle className="text-rose-500 shrink-0" size={24} />
          <p className="text-rose-800 font-bold text-sm font-nepali">{errorMsg}</p>
        </div>
      )}

      {/* Summary Filter Bar */}
      {!showSettings && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2 text-base">
              <Filter size={18} className="text-indigo-600" />
              सारांश तालिका विवरण फिल्टर (Summary Ledger Filter)
            </h3>
            <p className="text-xs text-slate-500 font-nepali">
              खोप प्राप्ति तथा उपयोग सारांश र खोपजन्य सामग्री मौज्दात सारांश तालिकालाई महिना अनुसार फिल्टर गर्नुहोस्
            </p>
          </div>
          <div className="flex items-center gap-2 min-w-[220px]">
            <label className="text-xs font-black text-slate-600 font-nepali whitespace-nowrap">
              महिना छान्नुहोस्:
            </label>
            <select
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 outline-none text-xs font-bold text-slate-700 bg-white"
            >
              <option value="all">सबै महिना (All Months)</option>
              {NEPALI_MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Stock Summary / Ledger Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cumulative Vaccine Balance Ledger */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2 text-base">
              <TrendingUp size={20} className="text-indigo-600" />
              खोप प्राप्ति तथा उपयोग सारांश (Vaccines Ledger)
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-black font-nepali">
              {summaryMonth === 'all' ? 'सबै महिना' : summaryMonth}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b">
                <tr>
                  <th className="p-2">खोपको विवरण</th>
                  <th className="p-2 text-center">कुल प्राप्त (Doses)</th>
                  <th className="p-2 text-center">दर्ता अनुसार (Doses)</th>
                  <th className="p-2 text-center">कुल खर्च (Doses)</th>
                  <th className="p-2 text-center">बाँकी मौज्दात</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {VACCINE_ITEMS.map(v => {
                  const rec = cumulativeStats.vaccinesRec[v.name] || 0;
                  const exp = cumulativeStats.vaccinesExp[v.name] || 0;
                  const util = utilizationStats[v.name] || 0;
                  const bal = Math.max(0, rec - exp);
                  return (
                    <tr key={v.id} className="hover:bg-indigo-50/20 transition-all">
                      <td className="p-2 font-bold text-slate-700 font-nepali">{v.label}</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-600">{toNepaliDigits(rec)}</td>
                      <td className="p-2 text-center font-mono font-bold text-indigo-500">{toNepaliDigits(util)}</td>
                      <td className="p-2 text-center font-mono font-bold text-rose-500">{toNepaliDigits(exp)}</td>
                      <td className={`p-2 text-center font-mono font-black ${bal > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {toNepaliDigits(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplies Balance Ledger */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2 text-base">
              <Package size={20} className="text-indigo-600" />
              खोपजन्य सामग्री मौज्दात सारांश (Supplies Summary)
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-black font-nepali">
              {summaryMonth === 'all' ? 'सबै महिना' : summaryMonth}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b">
                <tr>
                  <th className="p-2">सामग्री विवरण (Supplies)</th>
                  <th className="p-2 text-center">कुल प्राप्त</th>
                  <th className="p-2 text-center">कुल खर्च</th>
                  <th className="p-2 text-center">बाँकी मौज्दात</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SUPPLY_ITEMS.map(s => {
                  const rec = cumulativeStats.suppliesRec[s.name] || 0;
                  const exp = cumulativeStats.suppliesExp[s.name] || 0;
                  const bal = Math.max(0, rec - exp);
                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/20 transition-all">
                      <td className="p-2 font-bold text-slate-700 font-nepali">{s.label}</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-700">{toNepaliDigits(rec)}</td>
                      <td className="p-2 text-center font-mono font-bold text-rose-600">{toNepaliDigits(exp)}</td>
                      <td className={`p-2 text-center font-mono font-black ${bal > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {toNepaliDigits(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2 text-[11px] text-amber-800 font-nepali">
            <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <span>खोप सेवालाई पारदर्शी बनाउन प्राप्त भएको परिमाण सँगै प्रत्येक महिनाको खर्च भएको (Consumed) विवरण पनि संगै रेकर्ड गर्नुहोस्।</span>
          </div>
        </div>
      </div>

      {/* Grid for Form and History */}
      {!showSettings && (
        <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Record Entry Form */}
        <div id="monthly-receipt-form" className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2 text-lg">
              <Calendar className="text-indigo-600" size={20} />
              मासिक खोप डोज तथा सामग्री प्राप्ति र खर्च दर्ता
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-black font-mono">
              FY: {toNepaliDigits(currentFiscalYear)}
            </span>
          </div>

          <form onSubmit={handleSaveReceipts} className="space-y-6">
            {/* Month Selection */}
            <div className="max-w-xs space-y-2">
              <label className="text-xs font-bold text-slate-600 font-nepali">प्राप्त भएको महिना छान्नुहोस् *</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-slate-700 text-sm"
              >
                {NEPALI_MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* Sub Grid for Vaccines vs Materials */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Vaccines Doses */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-black text-slate-700 text-xs font-nepali flex items-center gap-1.5 border-b pb-2 mb-2 text-indigo-700">
                  <Syringe size={16} />
                  खोप प्राप्ति तथा खर्च (Vaccines)
                </h4>
                <div className="space-y-3.5">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-nepali">
                    <div className="col-span-6">खोपको विवरण</div>
                    <div className="col-span-3 text-center">प्राप्त</div>
                    <div className="col-span-3 text-center">खर्च</div>
                  </div>
                  {VACCINE_ITEMS.map(v => (
                    <div key={v.id} className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-6 text-xs font-bold text-slate-600 font-nepali line-clamp-1">{v.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={vaccineInputs[v.name] === undefined ? '' : vaccineInputs[v.name]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setVaccineInputs({ ...vaccineInputs, [v.name]: val });
                        }}
                        className="col-span-3 text-center font-bold font-mono px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 text-xs bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        value={vaccineExpenses[v.name] === undefined ? '' : vaccineExpenses[v.name]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setVaccineExpenses({ ...vaccineExpenses, [v.name]: val });
                        }}
                        className="col-span-3 text-center font-bold font-mono px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-rose-500 text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Material Supplies */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="font-black text-slate-700 text-xs font-nepali flex items-center gap-1.5 border-b pb-2 mb-2 text-indigo-700">
                  <Package size={16} />
                  सामग्री प्राप्ति तथा खर्च (Supplies)
                </h4>
                <div className="space-y-3.5">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-nepali">
                    <div className="col-span-6">सामग्री विवरण</div>
                    <div className="col-span-3 text-center">प्राप्त</div>
                    <div className="col-span-3 text-center">खर्च</div>
                  </div>
                  {SUPPLY_ITEMS.map(s => (
                    <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                      <label className="col-span-6 text-xs font-bold text-slate-600 font-nepali line-clamp-1">{s.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={supplyInputs[s.name] === undefined ? '' : supplyInputs[s.name]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSupplyInputs({ ...supplyInputs, [s.name]: val });
                        }}
                        className="col-span-3 text-center font-bold font-mono px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 text-xs bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        value={supplyExpenses[s.name] === undefined ? '' : supplyExpenses[s.name]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSupplyExpenses({ ...supplyExpenses, [s.name]: val });
                        }}
                        className="col-span-3 text-center font-bold font-mono px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-rose-500 text-xs bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-500 font-bold border border-slate-200 hover:bg-slate-50 transition-all text-sm"
              >
                <RotateCcw size={16} /> रद्दी गर्नुहोस्
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all text-sm shadow-md"
              >
                <Save size={16} /> रेकर्ड सुरक्षित गर्नुहोस्
              </button>
            </div>

          </form>
        </div>

        {/* Receipt History Records */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 font-nepali flex items-center gap-2 text-base">
              <Layers size={18} className="text-indigo-600" />
              मासिक विवरण रेकर्ड इतिहास
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black font-nepali transition-all border border-indigo-200 shadow-sm"
                title="विवरण प्रिन्ट गर्नुहोस्"
              >
                <Printer size={14} /> प्रिन्ट गर्नुहोस्
              </button>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg font-black font-mono">
                आ.व. {toNepaliDigits(currentFiscalYear)}
              </span>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
            {/* Month Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 font-nepali flex items-center gap-1">
                <Calendar size={13} className="text-indigo-600" />
                महिना फिल्टर गर्नुहोस्
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-100 outline-none text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">सबै महिना (All Months)</option>
                {NEPALI_MONTHS.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            {/* Item Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 font-nepali flex items-center gap-1">
                <Filter size={13} className="text-indigo-600" />
                खोप वा सामग्री फिल्टर गर्नुहोस्
              </label>
              <select
                value={filterItem}
                onChange={(e) => setFilterItem(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-100 outline-none text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">सबै खोप र सामग्री (जम्मा परिमाण)</option>
                <optgroup label="खोपहरू (Vaccines)">
                  {VACCINE_ITEMS.map(v => (
                    <option key={v.name} value={`v_${v.name}`}>{v.label}</option>
                  ))}
                </optgroup>
                <optgroup label="सामग्रीहरू (Supplies)">
                  {SUPPLY_ITEMS.map(s => (
                    <option key={s.name} value={`s_${s.name}`}>{s.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 italic">लोड हुँदैछ...</div>
          ) : Object.keys(monthlyRecords).length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic font-nepali">
              कुनै मासिक रेकर्ड फेला परेन।
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
              {NEPALI_MONTHS.filter(m => filterMonth === 'all' || filterMonth === m).map(m => {
                const monthRecord = monthlyRecords[m];
                if (!monthRecord) return null;
                
                let receivedVal = 0;
                let expendedVal = 0;
                let label = '';
                let type: 'vax' | 'sup' = 'vax';

                if (filterItem === 'all') {
                  return (
                    <div key={m} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-800 font-nepali text-sm">{m} महिना</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => loadMonthRecordForEdit(m)}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                            title="सम्पादन गर्नुहोस्"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(m)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                            title="हटाउनुहोस्"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-[11px] font-nepali text-slate-500 max-h-[200px] overflow-y-auto pr-1">
                        {/* Vaccines Summary */}
                        {VACCINE_ITEMS.map(v => {
                           const vRec = monthRecord.vaccines?.[v.name] || 0;
                           const vExp = monthRecord.vaccineExpenses?.[v.name] || 0;
                           if (vRec === 0 && vExp === 0) return null;
                           return (
                             <div key={v.id} className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                <span className="font-bold text-slate-600">{v.label}:</span>
                                <span className="font-bold text-slate-700">
                                  प्राप्त: <span className="text-indigo-600 font-mono">{toNepaliDigits(vRec)}</span> | खर्च: <span className="text-rose-500 font-mono">{toNepaliDigits(vExp)}</span>
                                </span>
                             </div>
                           );
                        })}
                        {/* Supplies Summary */}
                        {SUPPLY_ITEMS.map(s => {
                           const sRec = monthRecord.supplies?.[s.name] || 0;
                           const sExp = monthRecord.supplyExpenses?.[s.name] || 0;
                           if (sRec === 0 && sExp === 0) return null;
                           return (
                             <div key={s.id} className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                <span className="font-bold text-slate-600">{s.label}:</span>
                                <span className="font-bold text-slate-700">
                                  प्राप्त: <span className="text-emerald-600 font-mono">{toNepaliDigits(sRec)}</span> | खर्च: <span className="text-rose-500 font-mono">{toNepaliDigits(sExp)}</span>
                                </span>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  );
                } else if (filterItem.startsWith('v_')) {
                  const name = filterItem.substring(2);
                  receivedVal = monthRecord.vaccines?.[name] || 0;
                  expendedVal = monthRecord.vaccineExpenses?.[name] || 0;
                  label = VACCINE_ITEMS.find(item => item.name === name)?.label || name;
                  type = 'vax';
                } else if (filterItem.startsWith('s_')) {
                  const name = filterItem.substring(2);
                  receivedVal = monthRecord.supplies?.[name] || 0;
                  expendedVal = monthRecord.supplyExpenses?.[name] || 0;
                  label = SUPPLY_ITEMS.find(item => item.name === name)?.label || name;
                  type = 'sup';
                }

                // If filtering by a single item, show details for this item in this month
                return (
                  <div key={m} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-800 font-nepali text-sm">{m} महिना</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => loadMonthRecordForEdit(m)}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                          title="सम्पादन गर्नुहोस्"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(m)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                          title="हटाउनुहोस्"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] font-nepali text-indigo-700 font-bold bg-indigo-50/50 px-2 py-1 rounded">
                      {label}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-nepali">
                      <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">प्राप्त (Received)</p>
                        <p className="font-black text-indigo-600 font-mono text-sm mt-0.5">
                          {toNepaliDigits(receivedVal)} {type === 'vax' ? 'Doses' : 'थान'}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">खर्च (Expended)</p>
                        <p className="font-black text-rose-500 font-mono text-sm mt-0.5">
                          {toNepaliDigits(expendedVal)} {type === 'vax' ? 'Doses' : 'थान'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  );
};
