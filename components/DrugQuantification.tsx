import React, { useState, useMemo } from 'react';
import { 
  Calculator, Search, Package, AlertTriangle, CheckCircle2, 
  Info, BrainCircuit, Loader2, Warehouse, Printer, Download,
  Pill, TrendingUp, ShoppingBag, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { 
  OPDRecord, EmergencyRecord, CBIMNCIRecord, IPDRecord, 
  InventoryItem, Store, User, OrganizationSettings 
} from '../types';
import { GoogleGenAI } from "@google/genai";
import { toNepaliNumber } from './nepaliUtils';

interface DrugQuantificationProps {
  currentFiscalYear: string;
  opdRecords?: OPDRecord[];
  emergencyRecords?: EmergencyRecord[];
  cbimnciRecords?: CBIMNCIRecord[];
  ipdRecords?: IPDRecord[];
  inventoryItems?: InventoryItem[];
  stores?: Store[];
  generalSettings?: OrganizationSettings;
  currentUser?: User;
}

interface QuantifiedDrug {
  id: string;
  name: string;
  sources: string[];
  totalPrescribedQty: number;
  unit: string;
  patientCount: number;
  currentStock: number;
  stockStatus: 'Sufficient' | 'Low' | 'Out';
  req1Month: number;
  req3Month: number;
  req1Year: number;
  estimatedReorderQty: number;
  matchedInventoryItemName?: string;
}

export const DrugQuantification: React.FC<DrugQuantificationProps> = ({
  currentFiscalYear,
  opdRecords = [],
  emergencyRecords = [],
  cbimnciRecords = [],
  ipdRecords = [],
  inventoryItems = [],
  stores = [],
  generalSettings,
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'patient_wise'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Low' | 'Out' | 'Sufficient'>('ALL');
  const [isMatching, setIsMatching] = useState(false);
  const [aiMatches, setAiMatches] = useState<Record<string, string>>({});

  // Helper to parse daily dosage quantity
  const parseQuantity = (dosage: string = '1', frequency: string = '1'): number => {
    const dosageNum = parseFloat(dosage.replace(/[^0-9.]/g, '')) || 1;
    let freqNum = 1;
    const freqLower = (frequency || '').toLowerCase();
    
    if (freqLower.includes('times') || freqLower.includes('पटक')) {
      freqNum = parseFloat(freqLower.replace(/[^0-9.]/g, '')) || 1;
    } else if (freqLower.includes('tds') || freqLower.includes('tid')) {
      freqNum = 3;
    } else if (freqLower.includes('bd') || freqLower.includes('bid')) {
      freqNum = 2;
    } else if (freqLower.includes('od') || freqLower.includes('qid')) {
      freqNum = 4;
    } else if (freqLower.includes('-')) {
      freqNum = freqLower.split('-').reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    }
    
    return dosageNum * freqNum;
  };

  // Aggregated Drug Quantification Calculation
  const quantifiedDrugs = useMemo(() => {
    const drugMap: Record<string, {
      name: string;
      sources: Set<string>;
      totalPrescribedQty: number;
      unit: string;
      patients: Set<string>;
    }> = {};

    const processRecordGroup = (records: any[], sourceName: string) => {
      records.forEach(rec => {
        const prescriptions = rec.prescriptions || rec.emergencyPrescriptions || rec.medications || rec.dispensaryItems || [];
        const pId = rec.uniquePatientId || rec.patientId || rec.id || 'P-UNKNOWN';

        prescriptions.forEach((p: any) => {
          const rawName = (p.medicineName || p.name || p.itemName || '').trim();
          if (!rawName) return;

          const normKey = rawName.toLowerCase();
          const dailyQty = parseQuantity(p.dosage || '1', p.frequency || '1');
          const durationDays = parseFloat(p.duration || p.days || '5') || 5;
          const totalQtyForPrescription = p.quantity ? parseFloat(p.quantity) : (dailyQty * durationDays);

          if (!drugMap[normKey]) {
            drugMap[normKey] = {
              name: rawName,
              sources: new Set([sourceName]),
              totalPrescribedQty: 0,
              unit: p.unit || 'Unit',
              patients: new Set([pId])
            };
          }

          drugMap[normKey].sources.add(sourceName);
          drugMap[normKey].totalPrescribedQty += totalQtyForPrescription;
          drugMap[normKey].patients.add(pId);
        });
      });
    };

    processRecordGroup(opdRecords, 'OPD');
    processRecordGroup(emergencyRecords, 'Emergency');
    processRecordGroup(cbimnciRecords, 'CBIMNCI');
    processRecordGroup(ipdRecords, 'IPD');

    // Convert map to list and match with inventory stock
    const resultList: QuantifiedDrug[] = Object.keys(drugMap).map((key, index) => {
      const data = drugMap[key];
      const nameLower = data.name.toLowerCase();

      // Find stock in inventory
      const stockMatches = inventoryItems.filter(item => 
        item.itemName.toLowerCase() === nameLower ||
        (aiMatches[data.name] && item.itemName.toLowerCase() === aiMatches[data.name].toLowerCase())
      );

      const totalStock = stockMatches.reduce((acc, item) => acc + (item.currentQuantity || 0), 0);
      const matchedName = stockMatches.length > 0 ? stockMatches[0].itemName : aiMatches[data.name];

      // Projections based on average monthly consumption
      const req1Month = Math.ceil(data.totalPrescribedQty);
      const req3Month = req1Month * 3;
      const req1Year = req1Month * 12;

      let stockStatus: 'Sufficient' | 'Low' | 'Out' = 'Sufficient';
      if (totalStock === 0) {
        stockStatus = 'Out';
      } else if (totalStock < req1Month) {
        stockStatus = 'Low';
      }

      const estimatedReorderQty = Math.max(0, req3Month - totalStock);

      return {
        id: `drug-${index}`,
        name: data.name,
        sources: Array.from(data.sources),
        totalPrescribedQty: Math.round(data.totalPrescribedQty * 100) / 100,
        unit: data.unit,
        patientCount: data.patients.size,
        currentStock: totalStock,
        stockStatus,
        req1Month,
        req3Month,
        req1Year,
        estimatedReorderQty,
        matchedInventoryItemName: matchedName
      };
    });

    return resultList.sort((a, b) => b.totalPrescribedQty - a.totalPrescribedQty);
  }, [opdRecords, emergencyRecords, cbimnciRecords, ipdRecords, inventoryItems, aiMatches]);

  // AI Matching for drug names vs inventory names
  const handleAIAssist = async () => {
    setIsMatching(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";

      const unmatchedDrugNames = quantifiedDrugs
        .filter(d => d.currentStock === 0 && !d.matchedInventoryItemName)
        .map(d => d.name);

      if (unmatchedDrugNames.length === 0) {
        setIsMatching(false);
        return;
      }

      const inventoryNames = inventoryItems.map(i => i.itemName);

      const prompt = `
        I have a list of medicine names from clinical prescriptions and an inventory stock list.
        Match prescription drug names to inventory item names when brand vs generic or spelling variations exist.
        Prescription Drugs: ${JSON.stringify(unmatchedDrugNames)}
        Inventory Items: ${JSON.stringify(inventoryNames)}
        
        Return JSON object mapping prescription drug name -> matching inventory item name (or null if no match).
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const matches = JSON.parse(response.text || "{}");
      setAiMatches(prev => ({ ...prev, ...matches }));
    } catch (err) {
      console.error("AI Drug Match Error:", err);
    } finally {
      setIsMatching(false);
    }
  };

  const filteredQuantified = useMemo(() => {
    return quantifiedDrugs.filter(drug => {
      const matchesSearch = drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drug.sources.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || drug.stockStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quantifiedDrugs, searchTerm, statusFilter]);

  // Stats calculation
  const totalUniqueMeds = quantifiedDrugs.length;
  const totalOutCount = quantifiedDrugs.filter(d => d.stockStatus === 'Out').length;
  const totalLowCount = quantifiedDrugs.filter(d => d.stockStatus === 'Low').length;
  const totalReorderUnits = quantifiedDrugs.reduce((sum, d) => sum + d.estimatedReorderQty, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 font-nepali">
            <Pill className="text-teal-600" size={28} /> औषधि परिमाण रिपोर्ट (Drug Quantification Report)
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-nepali">
            बिरामीको खपत तथा प्रेस्क्रिप्सनका आधारमा औषधिको आवश्यक परिमाण र मौज्दात माग प्रक्षेपण (Fiscal Year: {currentFiscalYear})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAIAssist}
            disabled={isMatching}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm font-nepali"
          >
            {isMatching ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
            AI स्टक मिलान (AI Match)
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-all shadow-sm font-nepali"
          >
            <Printer size={16} /> प्रिन्ट गर्नुहोस्
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-nepali">कुल सिफारिस औषधि</span>
            <Pill className="text-teal-600" size={20} />
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">{toNepaliNumber(totalUniqueMeds)}</p>
          <p className="text-xs text-slate-400 mt-1 font-nepali">सिफारिस गरिएका कुल औषधि प्रकार</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-nepali">न्यून मौज्दात (Low Stock)</span>
            <AlertTriangle size={20} />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{toNepaliNumber(totalLowCount)}</p>
          <p className="text-xs text-amber-700/70 mt-1 font-nepali">१ महिनाको खपतभन्दा कम मौज्दात</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-nepali">मौज्दात नभएको (Stock Out)</span>
            <Package size={20} />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{toNepaliNumber(totalOutCount)}</p>
          <p className="text-xs text-rose-700/70 mt-1 font-nepali">तत्काल स्टक थप्नुपर्ने औषधि</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-nepali">३ महिनाको अनुमानित माग</span>
            <TrendingUp size={20} />
          </div>
          <p className="text-2xl font-black text-indigo-600 font-mono">{toNepaliNumber(totalReorderUnits)} <span className="text-xs font-normal">इकाइ</span></p>
          <p className="text-xs text-indigo-700/70 mt-1 font-nepali">अपुग औषधिको अनुमानित माग</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="औषधिको नाम वा स्रोत खोज्नुहोस्..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all font-nepali"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 font-nepali shrink-0">मौज्दात स्थिति:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 font-nepali"
          >
            <option value="ALL">सबै स्थिति (All Status)</option>
            <option value="Sufficient">पर्याप्त मौज्दात (Sufficient)</option>
            <option value="Low">न्यून मौज्दात (Low Stock)</option>
            <option value="Out">मौज्दात नभएको (Stock Out)</option>
          </select>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Printable Header */}
        <div className="hidden print:block text-center p-4 border-b border-slate-300">
          <h1 className="text-lg font-bold font-nepali">{generalSettings?.organizationName || 'स्वास्थ्य संस्था'}</h1>
          <p className="text-xs text-slate-600 font-nepali">{generalSettings?.address || ''}</p>
          <h2 className="text-base font-bold text-slate-900 mt-2 font-nepali">औषधि परिमाण तथा माग प्रक्षेपण प्रतिवेदन (Drug Quantification Report)</h2>
          <p className="text-xs text-slate-500 font-mono mt-1">आर्थिक वर्ष: {currentFiscalYear}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 font-nepali uppercase tracking-wider">
                <th className="p-3 text-center w-12">क्र.सं.</th>
                <th className="p-3">औषधिको नाम (Medicine Name)</th>
                <th className="p-3">स्रोत (Source)</th>
                <th className="p-3 text-right">खपत/सिफारिस परिमाण</th>
                <th className="p-3 text-right">हालको मौज्दात (Stock)</th>
                <th className="p-3 text-center">स्थिति (Status)</th>
                <th className="p-3 text-right">१ महिना आवश्यकता</th>
                <th className="p-3 text-right">३ महिना आवश्यकता</th>
                <th className="p-3 text-right">१ वर्ष प्रक्षेपण</th>
                <th className="p-3 text-right text-indigo-700 font-black">अनुमानित खरिद/माग</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredQuantified.map((drug, idx) => (
                <tr key={drug.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 text-center font-mono text-slate-400">{toNepaliNumber(idx + 1)}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{drug.name}</div>
                    {drug.matchedInventoryItemName && drug.matchedInventoryItemName.toLowerCase() !== drug.name.toLowerCase() && (
                      <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-mono">
                        Stock Match: {drug.matchedInventoryItemName}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {drug.sources.map(s => (
                        <span key={s} className="px-2 py-0.5 text-[10px] bg-slate-100 font-semibold text-slate-600 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">
                    {toNepaliNumber(drug.totalPrescribedQty)} <span className="text-[10px] font-normal text-slate-500">{drug.unit}</span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    <span className={drug.currentStock === 0 ? 'text-rose-600' : drug.currentStock < drug.req1Month ? 'text-amber-600' : 'text-emerald-600'}>
                      {toNepaliNumber(drug.currentStock)} {drug.unit}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {drug.stockStatus === 'Out' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 font-nepali">
                        <AlertTriangle size={10} /> मौज्दात छैन
                      </span>
                    )}
                    {drug.stockStatus === 'Low' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 font-nepali">
                        <AlertTriangle size={10} /> न्यून मौज्दात
                      </span>
                    )}
                    {drug.stockStatus === 'Sufficient' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 font-nepali">
                        <CheckCircle2 size={10} /> पर्याप्त
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono">{toNepaliNumber(drug.req1Month)}</td>
                  <td className="p-3 text-right font-mono font-semibold">{toNepaliNumber(drug.req3Month)}</td>
                  <td className="p-3 text-right font-mono text-slate-500">{toNepaliNumber(drug.req1Year)}</td>
                  <td className="p-3 text-right font-mono font-black text-indigo-700 bg-indigo-50/50">
                    {drug.estimatedReorderQty > 0 ? (
                      `रु. ${toNepaliNumber(drug.estimatedReorderQty)} ${drug.unit}`
                    ) : (
                      <span className="text-slate-400 font-normal text-[10px] font-nepali">आवश्यकता छैन</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredQuantified.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 italic font-nepali">
                    कुनै औषधि परिमाण डाटा फेला परेन।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
