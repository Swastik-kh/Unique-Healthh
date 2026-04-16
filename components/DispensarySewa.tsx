
import React, { useState, useMemo } from 'react';
import { TBTreatmentCard } from './TBTreatmentCard';
import { 
  Search, Pill, User, Calendar, Clock, CheckCircle2, 
  AlertCircle, Printer, Save, Trash2, Warehouse,
  ChevronRight, ClipboardList, Info, Activity
} from 'lucide-react';
import { 
  ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, 
  DispensaryRecord, User as AppUser, OrganizationSettings, TBPatient 
} from '../types';
import { InventoryItem, Store } from '../types/inventoryTypes';
import { STANDARD_MEDICINE_NAMES, fuzzyMatch, calculatePatientRequirements, getCombinedStandardNames } from '../lib/medicineUtils';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface DispensarySewaProps {
  currentFiscalYear: string;
  currentUser: AppUser;
  generalSettings: OrganizationSettings;
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  emergencyRecords: EmergencyRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  dispensaryRecords: DispensaryRecord[];
  onSaveDispensaryRecord: (record: DispensaryRecord) => void;
  onDeleteDispensaryRecord: (id: string) => void;
  inventoryItems: InventoryItem[];
  stores: Store[];
  onUpdateInventoryItem: (item: InventoryItem) => void;
  tbPatients?: TBPatient[];
  onUpdateTbPatient?: (patient: TBPatient) => void;
}

export const DispensarySewa: React.FC<DispensarySewaProps> = ({
  currentFiscalYear,
  currentUser,
  generalSettings,
  serviceSeekerRecords = [],
  opdRecords = [],
  emergencyRecords = [],
  cbimnciRecords = [],
  dispensaryRecords = [],
  onSaveDispensaryRecord,
  onDeleteDispensaryRecord,
  inventoryItems = [],
  stores = [],
  onUpdateInventoryItem,
  tbPatients = [],
  onUpdateTbPatient
}) => {
  const [searchId, setSearchId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<ServiceSeekerRecord | null>(null);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dispenseItems, setDispenseItems] = useState<any[]>([]);
  const [tbMedicine, setTbMedicine] = useState('');
  const [tbQuantity, setTbQuantity] = useState('');
  const [tbInventoryId, setTbInventoryId] = useState('');

  const tbPatientRecord = useMemo(() => {
    if (!selectedPatient) return null;
    return tbPatients.find(p => 
      p.patientId === selectedPatient.id || 
      p.patientId === selectedPatient.uniquePatientId ||
      (p.name === selectedPatient.name && p.phone === selectedPatient.phone)
    );
  }, [selectedPatient, tbPatients]);

  const handleToggleDailyDose = (date: string) => {
    if (!tbPatientRecord || !onUpdateTbPatient) return;
    
    const currentDoses = tbPatientRecord.dailyDoses || [];
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
    
    onUpdateTbPatient({
      ...tbPatientRecord,
      dailyDoses: newDoses
    });
  };

  const handleDispenseTB = () => {
    if (!tbPatientRecord) {
      alert("कृपया पहिले बिरामी छान्नुहोस्।");
      return;
    }
    if (!tbMedicine) {
      alert("कृपया औषधि छान्नुहोस्।");
      return;
    }
    if (!tbInventoryId) {
      alert("कृपया ब्याच छान्नुहोस्। (यदि ब्याच खाली छ भने स्टकमा औषधि नहुन सक्छ)");
      return;
    }
    if (!tbQuantity || parseInt(tbQuantity) <= 0) {
      alert("कृपया मान्य मात्रा (Quantity) राख्नुहोस्।");
      return;
    }
    
    // Find the specific inventory item
    const item = inventoryItems.find(i => i.id === tbInventoryId);
    
    if (!item || item.currentQuantity < parseInt(tbQuantity)) {
      alert("स्टकमा पर्याप्त औषधि छैन।");
      return;
    }
    
    // Update inventory
    onUpdateInventoryItem({
      ...item,
      currentQuantity: item.currentQuantity - parseInt(tbQuantity),
      lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
      lastUpdateDateAd: new Date().toISOString().split('T')[0]
    });

    // Save Dispensary Record
    const newRecord: DispensaryRecord = {
      id: `DISP-TB-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: selectedPatient!.id,
      uniquePatientId: selectedPatient!.uniquePatientId,
      patientName: selectedPatient!.name,
      dispenseDate: new NepaliDate().format('YYYY-MM-DD'),
      storeId: item.storeId,
      items: [{
        medicineName: item.itemName,
        quantity: parseInt(tbQuantity),
        unit: item.unit,
        batchNo: item.batchNo,
        expiryDate: item.expiryDateBs,
        dosage: 'As per TB regimen',
        instructions: 'TB Treatment'
      }],
      remarks: `TB Treatment Dispensing: ${tbMedicine}`,
      createdBy: currentUser.fullName
    };
    
    onSaveDispensaryRecord(newRecord);
    
    alert("औषधि सफलतापूर्वक डिस्पेंस गरियो।");
    setTbMedicine('');
    setTbQuantity('');
    setTbInventoryId('');
  };

  const renderTBTreatmentCard = () => {
    if (!tbPatientRecord) return null;
    const startDateStr = tbPatientRecord.treatmentStartDate || tbPatientRecord.registrationDate;
    if (!startDateStr) return null;

    const parts = startDateStr.split('-');
    if (parts.length !== 3) return null;
    
    const startYear = parseInt(parts[0]);
    const startMonth = parseInt(parts[1]) - 1; // 0-indexed
    const startDay = parseInt(parts[2]);
    
    const startAdDate = new NepaliDate(startYear, startMonth, startDay).toJsDate();
    const todayAd = new Date();
    todayAd.setHours(0, 0, 0, 0);
    const statusAdDate = tbPatientRecord.statusDateBs ? new NepaliDate(parseInt(tbPatientRecord.statusDateBs.split('-')[0]), parseInt(tbPatientRecord.statusDateBs.split('-')[1]) - 1, parseInt(tbPatientRecord.statusDateBs.split('-')[2])).toJsDate() : null;
    if (statusAdDate) statusAdDate.setHours(0, 0, 0, 0);
    const isStandardRegimen = tbPatientRecord.treatmentType === '2HRZE+4HR' || tbPatientRecord.treatmentType?.includes('6HRZE');
    const is6HRZE = tbPatientRecord.treatmentType?.includes('6HRZE');
    
    const intensiveDays = (is6HRZE ? 180 : 60) + (tbPatientRecord.intensivePhaseExtensionDays || 0);
    const continuationDays = is6HRZE ? 0 : (120 + (tbPatientRecord.continuationPhaseExtensionDays || 0));
    const totalDays = intensiveDays + continuationDays;

    const months = [];
    for (let i = 0; i < 12; i++) {
      let y = startYear;
      let m = startMonth + i;
      while (m > 11) {
        m -= 12;
        y += 1;
      }
      const dateObj = new NepaliDate(y, m, 1);
      
      // Calculate days in month
      let daysInMonth = 30;
      for (let d = 32; d >= 28; d--) {
        const dObj = new NepaliDate(y, m, d);
        if (dObj.getMonth() === m) {
          daysInMonth = d;
          break;
        }
      }
      
      months.push({
        year: y,
        month: m,
        name: dateObj.format('MMMM'),
        daysInMonth
      });
    }

    return (
      <div className="mt-8 bg-white p-6 rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 font-nepali text-lg">क्षयरोग उपचार कार्ड (TB Treatment Card)</h3>
              <p className="text-xs text-slate-500">
                दैनिक औषधि सेवन रेकर्ड (Daily Medicine Intake Record) | उपचार सुरु: {tbPatientRecord.treatmentStartDate}
                {tbPatientRecord.status !== 'Active' && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                    {tbPatientRecord.status} ({tbPatientRecord.statusDateBs})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[9px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary-600 rounded-sm"></div>
              <span>सेवन गरिएको (Taken)</span>
            </div>
            {isStandardRegimen && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm"></div>
                  <span>सघन चरण (Intensive: {intensiveDays} Days)</span>
                </div>
                {!is6HRZE && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded-sm"></div>
                    <span>निरन्तर चरण (Continuation: {continuationDays} Days)</span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border border-slate-300 rounded-sm"></div>
              <span>बाँकी (Pending)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
              <span>अमान्य/लक (Locked)</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[9px] border border-slate-300">
            <thead>
              <tr>
                <th className="border border-slate-300 p-1 bg-slate-100 w-24">महिना / गते</th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={i} className="border border-slate-300 p-1 bg-slate-100 w-6">{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m, mIdx) => (
                <tr key={mIdx}>
                  <td className="border border-slate-300 p-1 font-bold bg-slate-50 text-center">{m.name}</td>
                  {Array.from({ length: 31 }, (_, dIdx) => {
                    const day = dIdx + 1;
                    const isValid = day <= m.daysInMonth;
                    const currentNepDate = new NepaliDate(m.year, m.month, day);
                    const currentAdDate = currentNepDate.toJsDate();
                    const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isTaken = tbPatientRecord.dailyDoses?.includes(dateStr);
                    
                    const isBeforeStart = currentAdDate < startAdDate;
                    const isFuture = currentAdDate > todayAd;
                    const isAfterStatusChange = tbPatientRecord.status !== 'Active' && statusAdDate && currentAdDate >= statusAdDate;
                    const diffTime = currentAdDate.getTime() - startAdDate.getTime();
                    const daysFromStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    
                    const isIntensive = isStandardRegimen && daysFromStart >= 1 && daysFromStart <= intensiveDays;
                    const isContinuation = !is6HRZE && isStandardRegimen && daysFromStart > intensiveDays && daysFromStart <= totalDays;

                    let cellClass = "border border-slate-300 p-0 text-center transition-colors ";
                    if (!isValid || isBeforeStart || isFuture || isAfterStatusChange) {
                      cellClass += "bg-slate-300 cursor-not-allowed ";
                    } else {
                      cellClass += "cursor-pointer hover:bg-white/50 ";
                      if (isTaken) {
                        if (isIntensive) {
                          cellClass += "bg-blue-600 text-white ";
                        } else if (isContinuation) {
                          cellClass += "bg-orange-600 text-white ";
                        } else {
                          cellClass += "bg-primary-600 text-white ";
                        }
                      } else {
                        if (isIntensive) {
                          cellClass += "bg-blue-50 ";
                        } else if (isContinuation) {
                          cellClass += "bg-orange-50 ";
                        }
                      }
                    }
                    
                    return (
                      <td 
                        key={dIdx} 
                        className={cellClass}
                        onClick={() => isValid && !isBeforeStart && !isFuture && !isAfterStatusChange && handleToggleDailyDose(dateStr)}
                      >
                        <div className="w-full h-6 flex items-center justify-center">
                          {isValid && !isBeforeStart && !isFuture ? (isTaken ? '✓' : '') : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-2">औषधि वितरण (Dispense Medicine)</h4>
          <div className="grid grid-cols-4 gap-4">
            <select 
              value={tbMedicine} 
              onChange={(e) => {
                const selectedMed = e.target.value;
                setTbMedicine(selectedMed);
                
                // Find available batches for this medicine
                const availableBatches = inventoryItems.filter(i => 
                  fuzzyMatch(i.itemName, selectedMed, generalSettings.medicineMappings) && 
                  i.currentQuantity > 0
                );
                
                if (availableBatches.length === 1) {
                  setTbInventoryId(availableBatches[0].id);
                } else {
                  setTbInventoryId('');
                }
                
                // Auto-populate daily quantity
                const requirements = calculatePatientRequirements(tbPatientRecord!, inventoryItems, generalSettings.medicineMappings);
                const medRequirement = requirements.find(r => fuzzyMatch(r.itemName, selectedMed, generalSettings.medicineMappings));
                if (medRequirement) {
                  setTbQuantity(medRequirement.dailyQuantity.toString());
                } else {
                  setTbQuantity('');
                }
              }}
              className="px-3 py-2 border rounded-lg text-xs"
            >
              <option value="">औषधि छान्नुहोस्</option>
              {getCombinedStandardNames(generalSettings.customStandardMedicineNames || []).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select 
              value={tbInventoryId} 
              onChange={(e) => setTbInventoryId(e.target.value)}
              className="px-3 py-2 border rounded-lg text-xs"
            >
              <option value="">ब्याच छान्नुहोस्</option>
              {inventoryItems
                .filter(i => fuzzyMatch(i.itemName, tbMedicine, generalSettings.medicineMappings) && i.currentQuantity > 0)
                .map(i => (
                  <option key={i.id} value={i.id}>
                    ब्याच: {i.batchNo || 'N/A'} | म्याद: {i.expiryDateBs || 'N/A'} | मौज्दात: {i.currentQuantity}
                  </option>
                ))}
            </select>
            <input 
              type="number" 
              value={tbQuantity} 
              onChange={(e) => setTbQuantity(e.target.value)}
              placeholder="मात्रा (Qty)"
              className="px-3 py-2 border rounded-lg text-xs"
            />
            <button 
              onClick={handleDispenseTB}
              className="bg-primary-600 text-white font-bold rounded-lg text-xs hover:bg-primary-700"
            >
              डिस्पेंस गर्नुहोस्
            </button>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] text-slate-500 italic">
          <div>* INTENSIVE PHASE: HRZE (Tab) / HRZ (Tab)</div>
          <div className="text-right">* CONTINUATION PHASE: E (Tab) / Lfx (Tab)</div>
        </div>
      </div>
    );
  };

  // Update dispense items when store changes to find available batches
  React.useEffect(() => {
    if (selectedPatient && selectedStoreId) {
      setDispenseItems(prev => prev.map(item => {
        const invItems = inventoryItems.filter(i => 
          i.itemName.toLowerCase() === item.medicineName.toLowerCase() && 
          i.storeId === selectedStoreId && 
          i.currentQuantity > 0
        ).sort((a, b) => (a.expiryDateAd || '').localeCompare(b.expiryDateAd || ''));
        
        const defaultBatch = invItems[0];
        return {
          ...item,
          inventoryId: defaultBatch?.id || '',
          batchNo: defaultBatch?.batchNo || '',
          expiryDate: defaultBatch?.expiryDateBs || '',
          unit: defaultBatch?.unit || item.unit
        };
      }));
    }
  }, [selectedStoreId, inventoryItems, selectedPatient]);

  const handleSearch = () => {
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = r.uniquePatientId.toLowerCase().includes(query) || 
                      r.uniquePatientId.replace(/[^0-9]/g, '').includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      const regMatch = r.registrationNumber.includes(query);
      return idMatch || nameMatch || regMatch;
    });

    if (results.length === 1) {
      selectPatient(results[0]);
    } else if (results.length > 1) {
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      alert('बिरामी फेला परेन।');
      setSelectedPatient(null);
      setSelectedPrescriptions([]);
      setDispenseItems([]);
    }
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchId('');
    
    // Collect prescriptions from all sources
    const opdPres = opdRecords
      .filter(r => r.serviceSeekerId === patient.id)
      .flatMap(r => (r.prescriptions || []).map(p => ({ ...p, source: 'OPD', date: r.visitDate })));
    
    const emergencyPres = emergencyRecords
      .filter(r => r.serviceSeekerId === patient.id)
      .flatMap(r => [
        ...(r.emergencyPrescriptions || []).map(p => ({ ...p, source: 'Emergency (ER)', date: r.visitDate })),
        ...(r.dischargePrescriptions || []).map(p => ({ ...p, source: 'Emergency (Discharge)', date: r.visitDate }))
      ]);
    
    const cbimnciPres = cbimnciRecords
      .filter(r => r.serviceSeekerId === patient.id)
      .flatMap(r => (r.prescriptions || []).map(p => ({ ...p, source: 'CBIMNCI', date: r.visitDate })));
    
    const allPres = [...opdPres, ...emergencyPres, ...cbimnciPres].sort((a, b) => b.date.localeCompare(a.date));
    setSelectedPrescriptions(allPres);
    
    // Initialize dispense items from prescriptions
    setDispenseItems(allPres.map(p => {
      // Try to find the unit and default batch from inventory
      const invItems = inventoryItems.filter(i => 
        i.itemName.toLowerCase() === p.medicineName.toLowerCase() && 
        i.storeId === selectedStoreId && 
        i.currentQuantity > 0
      ).sort((a, b) => (a.expiryDateAd || '').localeCompare(b.expiryDateAd || ''));
      
      const defaultBatch = invItems[0];
      const generalInvItem = inventoryItems.find(i => i.itemName.toLowerCase() === p.medicineName.toLowerCase());

      return {
        medicineName: p.medicineName,
        quantity: 1, // Default quantity
        unit: defaultBatch?.unit || generalInvItem?.unit || 'Pcs',
        inventoryId: defaultBatch?.id || '',
        batchNo: defaultBatch?.batchNo || '',
        expiryDate: defaultBatch?.expiryDateBs || '',
        dosage: p.dosage,
        instructions: p.instructions || '',
        dispensed: false
      };
    }));
  };

  const handleDispense = async () => {
    if (!selectedPatient || !selectedStoreId) {
      alert('कृपया बिरामी र गोदाम छान्नुहोस्।');
      return;
    }

    const itemsToDispense = dispenseItems.filter(item => item.dispensed);
    if (itemsToDispense.length === 0) {
      alert('कृपया डिस्पेंस गर्नको लागि कम्तिमा एउटा औषधि छान्नुहोस्।');
      return;
    }

    // Check stock for each item by aggregating quantities
    const aggregatedItems = itemsToDispense.reduce((acc, item) => {
      const name = item.medicineName.toLowerCase();
      if (!acc[name]) acc[name] = 0;
      acc[name] += Number(item.quantity);
      return acc;
    }, {} as Record<string, number>);

    for (const [name, totalQty] of Object.entries(aggregatedItems)) {
      const stock = inventoryItems
        .filter(i => i.itemName.toLowerCase() === name && i.storeId === selectedStoreId)
        .reduce((acc, i) => acc + i.currentQuantity, 0);
      
      if (stock < totalQty) {
        alert(`${name} को पर्याप्त मौज्दात छैन। (मौज्दात: ${stock})`);
        return;
      }
    }

    const newRecord: DispensaryRecord = {
      id: `DISP-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: selectedPatient.id,
      uniquePatientId: selectedPatient.uniquePatientId,
      patientName: selectedPatient.name,
      dispenseDate: new NepaliDate().format('YYYY-MM-DD'),
      storeId: selectedStoreId,
      items: itemsToDispense.map(i => ({
        medicineName: i.medicineName,
        quantity: Number(i.quantity),
        unit: i.unit,
        batchNo: i.batchNo,
        expiryDate: i.expiryDate,
        dosage: i.dosage,
        instructions: i.instructions
      })),
      remarks,
      createdBy: currentUser.fullName
    };

    // Update Inventory
    let localInventory = [...inventoryItems];

    itemsToDispense.forEach(dispItem => {
      let remainingToDeduct = Number(dispItem.quantity);
      
      // If a specific batch was selected, try to deduct from it first
      if (dispItem.inventoryId) {
        const stockItemIndex = localInventory.findIndex(i => i.id === dispItem.inventoryId);
        if (stockItemIndex !== -1) {
          const stockItem = localInventory[stockItemIndex];
          const deduct = Math.min(stockItem.currentQuantity, remainingToDeduct);
          
          const updatedItem = {
            ...stockItem,
            currentQuantity: stockItem.currentQuantity - deduct,
            lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
            lastUpdateDateAd: new Date().toISOString().split('T')[0]
          };
          
          localInventory[stockItemIndex] = updatedItem;
          onUpdateInventoryItem(updatedItem);
          
          remainingToDeduct -= deduct;
        }
      }

      // If still remaining, use FEFO logic for other batches of same medicine
      if (remainingToDeduct > 0) {
        const relevantStockIndices = localInventory
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => 
            item.itemName.toLowerCase() === dispItem.medicineName.toLowerCase() && 
            item.storeId === selectedStoreId &&
            item.id !== dispItem.inventoryId && // Skip the one we already deducted from
            item.currentQuantity > 0
          )
          .sort((a, b) => {
            if (!a.item.expiryDateAd) return 1;
            if (!b.item.expiryDateAd) return -1;
            return a.item.expiryDateAd.localeCompare(b.item.expiryDateAd);
          });

        for (const { item: stockItem, index: stockItemIndex } of relevantStockIndices) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(stockItem.currentQuantity, remainingToDeduct);
          
          const updatedItem = {
            ...stockItem,
            currentQuantity: stockItem.currentQuantity - deduct,
            lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
            lastUpdateDateAd: new Date().toISOString().split('T')[0]
          };
          
          localInventory[stockItemIndex] = updatedItem;
          onUpdateInventoryItem(updatedItem);
          
          remainingToDeduct -= deduct;
        }
      }
    });

    onSaveDispensaryRecord(newRecord);
    alert('औषधि सफलतापूर्वक डिस्पेंस गरियो।');
    
    // Reset
    setSearchId('');
    setSelectedPatient(null);
    setSelectedPrescriptions([]);
    setDispenseItems([]);
    setRemarks('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary-100 p-3 rounded-xl text-primary-600">
            <Pill size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">डिस्पेन्सरी सेवा (Dispensary Service)</h2>
            <p className="text-sm text-slate-500">औषधि वितरण र रेकर्ड व्यवस्थापन</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Search & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={18} className="text-primary-600" /> बिरामी खोज्नुहोस्
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Patient ID, Name or Reg No"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                खोज्नुहोस्
              </button>
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50">
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => selectPatient(r)}
                    className="w-full p-3 text-left hover:bg-white transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-primary-600">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.uniquePatientId} | {r.address}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-600" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-left-4">
              <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                <User size={18} className="text-primary-600" /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">नाम:</span>
                  <span className="font-bold">{selectedPatient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID:</span>
                  <span className="font-mono">{selectedPatient.uniquePatientId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">उमेर/लिङ्ग:</span>
                  <span>{selectedPatient.ageYears}Y {selectedPatient.ageMonths}M / {selectedPatient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ठेगाना:</span>
                  <span>{selectedPatient.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">सम्पर्क:</span>
                  <span>{selectedPatient.phone}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Warehouse size={18} className="text-primary-600" /> गोदाम छान्नुहोस्
            </h3>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              <option value="">गोदाम छान्नुहोस्</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Prescription & Dispensing */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={18} className="text-primary-600" /> प्रेस्क्रिप्शन विवरण (Prescriptions)
                </h3>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold">
                  कुल: {selectedPrescriptions.length}
                </span>
              </div>

              {selectedPrescriptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3">औषधि / ब्याच</th>
                          <th className="p-3 w-24">मात्रा (Qty)</th>
                          <th className="p-3 w-24">एकाइ (Unit)</th>
                          <th className="p-3">डोज</th>
                          <th className="p-3">स्रोत/मिति</th>
                          <th className="p-3 text-center">डिस्पेंस?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dispenseItems.map((item, idx) => {
                          const batches = inventoryItems.filter(i => 
                            i.itemName.toLowerCase() === item.medicineName.toLowerCase() && 
                            i.storeId === selectedStoreId &&
                            i.currentQuantity > 0
                          ).sort((a, b) => (a.expiryDateAd || '').localeCompare(b.expiryDateAd || ''));

                          const stock = selectedStoreId ? batches.reduce((acc, i) => acc + i.currentQuantity, 0) : 0;
                          
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3">
                                <div className="font-bold">{item.medicineName}</div>
                                {selectedStoreId && (
                                  <div className="mt-1">
                                    <select
                                      value={item.inventoryId}
                                      onChange={(e) => {
                                        const batch = batches.find(b => b.id === e.target.value);
                                        const newItems = [...dispenseItems];
                                        newItems[idx].inventoryId = e.target.value;
                                        newItems[idx].batchNo = batch?.batchNo || '';
                                        newItems[idx].expiryDate = batch?.expiryDateBs || '';
                                        setDispenseItems(newItems);
                                      }}
                                      className="w-full text-[10px] p-1 border border-slate-200 rounded outline-none bg-white"
                                    >
                                      <option value="">ब्याच छान्नुहोस्</option>
                                      {batches.map(b => (
                                        <option key={b.id} value={b.id}>
                                          B: {b.batchNo || 'N/A'} (Exp: {b.expiryDateBs || 'N/A'}) [Stock: {b.currentQuantity}]
                                        </option>
                                      ))}
                                    </select>
                                    <div className={`text-[10px] font-bold mt-0.5 ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      कुल मौज्दात: {stock}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].quantity = e.target.value;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].unit = e.target.value;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                                  placeholder="Pcs, Tab..."
                                />
                              </td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">
                                <div className="text-xs font-bold text-primary-600">{selectedPrescriptions[idx].source}</div>
                                <div className="text-[10px] text-slate-400">{selectedPrescriptions[idx].date}</div>
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.dispensed}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].dispensed = e.target.checked;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">कैफियत (Remarks)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm h-20"
                      placeholder="केहि थप जानकारी भए यहाँ लेख्नुहोस्..."
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleDispense}
                      className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
                    >
                      <Save size={20} /> औषधि डिस्पेंस गर्नुहोस्
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Info size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 italic">यो बिरामीको लागि कुनै प्रेस्क्रिप्शन फेला परेन।</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full text-slate-300">
                <Search size={48} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">बिरामी खोज्नुहोस्</h3>
                <p className="text-slate-500 max-w-xs">औषधि वितरण सुरु गर्नको लागि बायाँ तर्फ बिरामीको ID राखेर खोज्नुहोस्।</p>
              </div>
            </div>
          )}
          {renderTBTreatmentCard()}


          {/* Recent Dispensing History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary-600" /> हालसालै वितरण गरिएको रेकर्ड
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">मिति</th>
                    <th className="p-3">बिरामी</th>
                    <th className="p-3">औषधिहरू</th>
                    <th className="p-3">वितरण गर्ने</th>
                    <th className="p-3 text-right">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dispensaryRecords
                    .filter(r => r.fiscalYear === currentFiscalYear)
                    .sort((a, b) => b.dispenseDate.localeCompare(a.dispenseDate))
                    .slice(0, 5)
                    .map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3">{r.dispenseDate}</td>
                        <td className="p-3">
                          <div className="font-bold">{r.patientName}</div>
                          <div className="text-[10px] text-slate-400">{r.uniquePatientId}</div>
                        </td>
                        <td className="p-3">
                          {(r.items || []).map((i, idx) => (
                            <div key={idx} className="bg-slate-100 px-2 py-0.5 rounded inline-block mr-1 mb-1 text-[10px]">
                              <span className="font-bold">{i.medicineName}</span> ({i.quantity} {i.unit})
                              {i.batchNo && <span className="ml-1 text-slate-500">B: {i.batchNo}</span>}
                              {i.expiryDate && <span className="ml-1 text-slate-400">Exp: {i.expiryDate}</span>}
                            </div>
                          ))}
                        </td>
                        <td className="p-3">{r.createdBy}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onDeleteDispensaryRecord(r.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {dispensaryRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">कुनै रेकर्ड फेला परेन।</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
