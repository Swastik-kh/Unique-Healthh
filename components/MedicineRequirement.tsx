
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, Search, Package, AlertTriangle, CheckCircle2, 
  Info, BrainCircuit, RefreshCw, Loader2, Warehouse
} from 'lucide-react';
import { 
  OPDRecord, EmergencyRecord, CBIMNCIRecord, IPDRecord, 
  InventoryItem, Store, PrescriptionItem, Medication 
} from '../types';
import { GoogleGenAI } from "@google/genai";

interface MedicineRequirementProps {
  opdRecords: OPDRecord[];
  emergencyRecords: EmergencyRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  ipdRecords: IPDRecord[];
  inventoryItems: InventoryItem[];
  stores: Store[];
}

interface PatientRequirement {
  patientId: string;
  patientName: string;
  source: 'OPD' | 'Emergency' | 'CBIMNCI' | 'IPD';
  medicines: {
    name: string;
    dailyQty: number;
    unit: string;
    matchedStock?: {
      itemName: string;
      totalQty: number;
      isExactMatch: boolean;
      matchScore?: number;
    };
  }[];
}

export const MedicineRequirement: React.FC<MedicineRequirementProps> = ({
  opdRecords, emergencyRecords, cbimnciRecords, ipdRecords, inventoryItems, stores
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<Record<string, any>>({});

  const parseQuantity = (dosage: string, frequency: string): number => {
    // Basic parser for dosage like "1 tab", "5ml", "1"
    const dosageNum = parseFloat(dosage.replace(/[^0-9.]/g, '')) || 1;
    
    // Basic parser for frequency like "3 times a day", "TDS", "1-0-1"
    let freqNum = 1;
    const freqLower = frequency.toLowerCase();
    
    if (freqLower.includes('times') || freqLower.includes('पटक')) {
      freqNum = parseFloat(freqLower.replace(/[^0-9.]/g, '')) || 1;
    } else if (freqLower.includes('tds') || freqLower.includes('tid')) {
      freqNum = 3;
    } else if (freqLower.includes('bd') || freqLower.includes('bid')) {
      freqNum = 2;
    } else if (freqLower.includes('od') || freqLower.includes('qid')) {
      freqNum = 4;
    } else if (freqLower.includes('-')) {
      // Handle "1-0-1" or "1-1-1"
      freqNum = freqLower.split('-').reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    }
    
    return dosageNum * freqNum;
  };

  const patientRequirements = useMemo(() => {
    const requirements: PatientRequirement[] = [];

    const processPrescriptions = (recs: any[], source: any, nameField: string = 'uniquePatientId') => {
      recs.forEach(rec => {
        const prescriptions = rec.prescriptions || rec.emergencyPrescriptions || rec.medications || [];
        if (prescriptions.length === 0) return;

        const meds = prescriptions.map((p: any) => {
          const name = p.medicineName || p.name;
          const dailyQty = parseQuantity(p.dosage || '1', p.frequency || '1');
          
          // Find stock
          const stockMatches = inventoryItems.filter(item => 
            item.itemName.toLowerCase() === name.toLowerCase()
          );
          
          const totalStock = stockMatches.reduce((acc, item) => acc + item.currentQuantity, 0);

          return {
            name,
            dailyQty,
            unit: p.unit || 'Unit',
            matchedStock: stockMatches.length > 0 ? {
              itemName: stockMatches[0].itemName,
              totalQty: totalStock,
              isExactMatch: true
            } : undefined
          };
        });

        requirements.push({
          patientId: rec.uniquePatientId || rec.patientId,
          patientName: rec.patientName || rec.uniquePatientId, // Fallback to ID if name not found
          source,
          medicines: meds
        });
      });
    };

    processPrescriptions(opdRecords, 'OPD');
    processPrescriptions(emergencyRecords, 'Emergency');
    processPrescriptions(cbimnciRecords, 'CBIMNCI');
    processPrescriptions(ipdRecords, 'IPD');

    return requirements;
  }, [opdRecords, emergencyRecords, cbimnciRecords, ipdRecords, inventoryItems]);

  const handleAIAssist = async () => {
    setIsMatching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";
      
      // Get unique medicine names that don't have exact matches
      const unmatchedMeds = Array.from(new Set(
        patientRequirements.flatMap(p => p.medicines.filter(m => !m.matchedStock).map(m => m.name))
      ));

      if (unmatchedMeds.length === 0) {
        setIsMatching(false);
        return;
      }

      const inventoryNames = inventoryItems.map(i => i.itemName);

      const prompt = `
        I have a list of medicine names from patient prescriptions and a list of medicine names from our inventory.
        Some names might have slight spelling differences or brand vs generic differences.
        Please match the prescription medicines to the closest inventory medicine.
        
        Prescription Medicines: ${JSON.stringify(unmatchedMeds)}
        Inventory Medicines: ${JSON.stringify(inventoryNames)}
        
        Return a JSON object where keys are prescription medicine names and values are the matched inventory medicine names.
        If no reasonable match is found, use null.
        Example: {"Paracet": "Paracetamol 500mg", "Amox": "Amoxicillin"}
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const matches = JSON.parse(response.text || "{}");
      setMatchResults(matches);
    } catch (error) {
      console.error("AI Matching Error:", error);
    } finally {
      setIsMatching(false);
    }
  };

  const filteredRequirements = patientRequirements.filter(p => 
    p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.medicines.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 font-nepali">
            <Calculator className="text-indigo-600" /> बिरामी औषधी आवश्यकता र मौज्दात मिलान
          </h2>
          <p className="text-slate-500 text-sm">बिरामीको प्रेस्क्रिप्सन अनुसार दैनिक औषधी खपत र गोदामको मौज्दात विवरण</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleAIAssist}
            disabled={isMatching}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100"
          >
            {isMatching ? <Loader2 className="animate-spin" size={18} /> : <BrainCircuit size={18} />}
            AI मिलान (AI Matching)
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="बिरामीको नाम वा औषधी खोज्नुहोस्..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredRequirements.map((patient, idx) => (
          <div key={`${patient.patientId}-${idx}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-200 transition-all">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {patient.patientName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{patient.patientName}</h3>
                  <p className="text-xs text-slate-500">ID: {patient.patientId} | स्रोत: <span className="font-semibold text-indigo-600">{patient.source}</span></p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patient.medicines.map((med, mIdx) => {
                  const aiMatch = matchResults[med.name];
                  const finalStockMatch = med.matchedStock || (aiMatch ? {
                    itemName: aiMatch,
                    totalQty: inventoryItems.filter(i => i.itemName === aiMatch).reduce((acc, i) => acc + i.currentQuantity, 0),
                    isExactMatch: false
                  } : null);

                  const isLowStock = finalStockMatch ? finalStockMatch.totalQty < med.dailyQty * 7 : true; // Less than 7 days supply

                  return (
                    <div key={mIdx} className={`p-4 rounded-xl border transition-all ${isLowStock ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800">{med.name}</h4>
                        {isLowStock ? 
                          <AlertTriangle className="text-red-500" size={18} /> : 
                          <CheckCircle2 className="text-green-500" size={18} />
                        }
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">दैनिक आवश्यकता:</span>
                          <span className="font-bold text-slate-800">{med.dailyQty} {med.unit}</span>
                        </div>
                        
                        <div className="pt-2 border-t border-slate-200/50">
                          {finalStockMatch ? (
                            <>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500 flex items-center gap-1"><Warehouse size={14} /> मौज्दात:</span>
                                <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                  {finalStockMatch.totalQty} {med.unit}
                                </span>
                              </div>
                              {!finalStockMatch.isExactMatch && (
                                <div className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full w-fit">
                                  <BrainCircuit size={10} /> AI मिलान: {finalStockMatch.itemName}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-red-500 text-xs flex items-center gap-1">
                              <AlertTriangle size={12} /> मौज्दात फेला परेन
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {filteredRequirements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Info className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500">कुनै रेकर्ड फेला परेन।</p>
          </div>
        )}
      </div>
    </div>
  );
};
