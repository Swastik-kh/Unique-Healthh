import React, { useState, useMemo } from 'react';
import { 
  Calculator, Search, Package, AlertTriangle, CheckCircle2, 
  Info, BrainCircuit, Loader2, Warehouse, Printer, Download,
  Pill, TrendingUp, ShoppingBag, FileSpreadsheet, RefreshCw, Plus, Trash2, Check
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

export interface ProbableProcurementItem {
  id: string;
  medicineName: string;
  dosageForm: string;
  strength: string;
  available: boolean;
  fy1Qty: number; // e.g. 80-81
  fy2Qty: number; // e.g. 81-82
  fy3Qty: number; // e.g. 082-83
  growthPercent?: number; // default 10%
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
  const [reportMode, setReportMode] = useState<'standard' | 'probable_procurement'>('probable_procurement');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Low' | 'Out' | 'Sufficient'>('ALL');
  const [isMatching, setIsMatching] = useState(false);
  const [aiMatches, setAiMatches] = useState<Record<string, string>>({});

  // Probable Procurement configuration
  const [healthFacilityName, setHealthFacilityName] = useState(generalSettings?.organizationName || 'Hadiya Health post');
  const [targetFiscalYear, setTargetFiscalYear] = useState('083/84');
  const [fy1Label, setFy1Label] = useState('F/Y 80-81');
  const [fy2Label, setFy2Label] = useState('F/Y 81-82');
  const [fy3Label, setFy3Label] = useState('F/Y 082-83');
  const [targetFyLabel, setTargetFyLabel] = useState('F/Y 083-84');

  // Initial Essential Medicines Dataset matching image format & standard procurement list
  const initialProcurementItems: ProbableProcurementItem[] = useMemo(() => [
    { id: 'p1', medicineName: 'Acetylsalicylic acid (aspirin)', dosageForm: 'Tablet', strength: '75 mg', available: true, fy1Qty: 350, fy2Qty: 350, fy3Qty: 350 },
    { id: 'p2', medicineName: 'Adrenaline (epinephrine)', dosageForm: 'Injection', strength: '1mg in 1ml', available: true, fy1Qty: 5, fy2Qty: 10, fy3Qty: 10 },
    { id: 'p3_1', medicineName: 'Albendazole', dosageForm: 'Chewable Tablet', strength: '400 mg', available: true, fy1Qty: 450, fy2Qty: 1750, fy3Qty: 2000 },
    { id: 'p3_2', medicineName: 'Albendazole', dosageForm: 'Suspension', strength: '200 mg/5ml', available: true, fy1Qty: 0, fy2Qty: 0, fy3Qty: 100 },
    { id: 'p4', medicineName: 'Aluminium hydroxide gel + Magnesium hydroxide (Antacid)', dosageForm: 'Tablet', strength: '250 mg+250mg', available: true, fy1Qty: 10000, fy2Qty: 16000, fy3Qty: 1600 },
    { id: 'p5_1', medicineName: 'Amitriptyline', dosageForm: 'Tablet', strength: '10 mg', available: true, fy1Qty: 0, fy2Qty: 500, fy3Qty: 500 },
    { id: 'p5_2', medicineName: 'Amitriptyline', dosageForm: 'Tablet', strength: '25 mg', available: true, fy1Qty: 0, fy2Qty: 400, fy3Qty: 500 },
    { id: 'p6', medicineName: 'Amlodipine', dosageForm: 'Tablet', strength: '5mg', available: true, fy1Qty: 4050, fy2Qty: 2200, fy3Qty: 10000 },
    { id: 'p7_1', medicineName: 'Amoxicillin', dosageForm: 'Oral Tablet', strength: '500 mg', available: true, fy1Qty: 5100, fy2Qty: 4800, fy3Qty: 7500 },
    { id: 'p7_2', medicineName: 'Amoxicillin', dosageForm: 'Powder for oral suspension', strength: '125mg/5ml, 100 ml', available: true, fy1Qty: 60, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p7_3', medicineName: 'Amoxicillin', dosageForm: 'Dispersible Tablets', strength: '250 mg', available: true, fy1Qty: 200, fy2Qty: 400, fy3Qty: 600 },
    { id: 'p8', medicineName: 'Ampicillin', dosageForm: 'Powder for IV/IM injection', strength: '500 mg', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p9', medicineName: 'Atropine', dosageForm: 'Injection', strength: '1 mg/ml', available: true, fy1Qty: 10, fy2Qty: 20, fy3Qty: 25 },
    { id: 'p10_1', medicineName: 'Azithromycin', dosageForm: 'Tablet', strength: '250 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1000 },
    { id: 'p10_2', medicineName: 'Azithromycin', dosageForm: 'Tablet', strength: '500 mg', available: true, fy1Qty: 1200, fy2Qty: 1500, fy3Qty: 2100 },
    { id: 'p11', medicineName: 'Calamine', dosageForm: 'Lotion', strength: '100 ml', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 120 },
    { id: 'p12', medicineName: 'Calcium gluconate', dosageForm: 'Injection', strength: '10% 10ml', available: true, fy1Qty: 10, fy2Qty: 15, fy3Qty: 20 },
    { id: 'p13_1', medicineName: 'Carbamazepine', dosageForm: 'Tablet', strength: '100 mg', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 600 },
    { id: 'p13_2', medicineName: 'Carbamazepine', dosageForm: 'Tablet', strength: '200 mg', available: true, fy1Qty: 400, fy2Qty: 600, fy3Qty: 800 },
    { id: 'p13_3', medicineName: 'Carbamazepine', dosageForm: 'Oral liquid', strength: '100mg/5ml', available: true, fy1Qty: 20, fy2Qty: 40, fy3Qty: 50 },
    { id: 'p14', medicineName: 'Cefixime', dosageForm: 'Tablet', strength: '200 mg', available: true, fy1Qty: 1000, fy2Qty: 1500, fy3Qty: 2000 },
    { id: 'p15_1', medicineName: 'Ceftriaxone', dosageForm: 'Powder for Injection', strength: '250 mg', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 120 },
    { id: 'p15_2', medicineName: 'Ceftriaxone', dosageForm: 'Powder for Injection', strength: '500 mg', available: true, fy1Qty: 80, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p15_3', medicineName: 'Ceftriaxone', dosageForm: 'Powder for Injection', strength: '1 gm', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p16_1', medicineName: 'Cetirizine HCL', dosageForm: 'Tablet', strength: '10 mg', available: true, fy1Qty: 3000, fy2Qty: 4500, fy3Qty: 6000 },
    { id: 'p16_2', medicineName: 'Cetirizine HCL', dosageForm: 'Syrup', strength: '5mg/5ml', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p17', medicineName: 'Charcoal, activated', dosageForm: 'powder in sachet', strength: '50 gm', available: true, fy1Qty: 10, fy2Qty: 20, fy3Qty: 25 },
    { id: 'p18_1', medicineName: 'Chlorhexidine (CHX)', dosageForm: 'Solution', strength: '4%', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p18_2', medicineName: 'Chlorhexidine (CHX)', dosageForm: 'Ointment', strength: '7.1%', available: true, fy1Qty: 200, fy2Qty: 300, fy3Qty: 400 },
    { id: 'p19', medicineName: 'Chloroquine (CQ)', dosageForm: 'Tablet', strength: '150 mg', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p20_1', medicineName: 'Ciprofloxacin', dosageForm: 'Tablet', strength: '250 mg', available: true, fy1Qty: 800, fy2Qty: 1200, fy3Qty: 1500 },
    { id: 'p20_2', medicineName: 'Ciprofloxacin', dosageForm: 'Tablet', strength: '500 mg', available: true, fy1Qty: 1500, fy2Qty: 2000, fy3Qty: 2500 },
    { id: 'p20_3', medicineName: 'Ciprofloxacin', dosageForm: 'Eye/Ear drops', strength: '0.3%', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 250 },
    { id: 'p20_4', medicineName: 'Ciprofloxacin', dosageForm: 'Eye ointment', strength: '0.3%', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p20_5', medicineName: 'Ciprofloxacin', dosageForm: 'Injection', strength: '200mg/100ml', available: true, fy1Qty: 20, fy2Qty: 40, fy3Qty: 50 },
    { id: 'p21_1', medicineName: 'Clotrimazole', dosageForm: 'Skin cream', strength: '1%', available: true, fy1Qty: 200, fy2Qty: 300, fy3Qty: 400 },
    { id: 'p21_2', medicineName: 'Clotrimazole', dosageForm: 'Vaginal Tablets', strength: '100 mg', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p21_3', medicineName: 'Clotrimazole', dosageForm: 'Mouth paint', strength: '1%', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p22', medicineName: 'Clove Oil', dosageForm: 'Liquid', strength: '10 ml', available: true, fy1Qty: 20, fy2Qty: 30, fy3Qty: 40 },
    { id: 'p23_1', medicineName: 'Cloxacillin', dosageForm: 'Capsules', strength: '250 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1000 },
    { id: 'p23_2', medicineName: 'Cloxacillin', dosageForm: 'Capsules', strength: '500 mg', available: true, fy1Qty: 800, fy2Qty: 1200, fy3Qty: 1500 },
    { id: 'p23_3', medicineName: 'Cloxacillin', dosageForm: 'Powder for oral liquid', strength: '125mg/5ml', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p24_1', medicineName: 'Cotrimoxazole (Sulphamethoxazole and Trimethoprim 5:1)', dosageForm: 'Tablets', strength: '100mg+20mg', available: true, fy1Qty: 1000, fy2Qty: 1500, fy3Qty: 2000 },
    { id: 'p24_2', medicineName: 'Cotrimoxazole (Sulphamethoxazole and Trimethoprim 5:1)', dosageForm: 'Tablets', strength: '400mg+80mg', available: true, fy1Qty: 1500, fy2Qty: 2000, fy3Qty: 2500 },
    { id: 'p24_3', medicineName: 'Cotrimoxazole (Sulphamethoxazole and Trimethoprim 5:1)', dosageForm: 'Syrup', strength: '200mg+40mg/5ml', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p25', medicineName: 'Dexamethasone', dosageForm: 'Injection', strength: '4mg/ml', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p26', medicineName: 'Dextrose (glucose)', dosageForm: 'Injection/solution', strength: '5%', available: true, fy1Qty: 200, fy2Qty: 300, fy3Qty: 400 },
    { id: 'p27_1', medicineName: 'Diazepam', dosageForm: 'Injection', strength: '5mg/ml', available: true, fy1Qty: 30, fy2Qty: 50, fy3Qty: 80 },
    { id: 'p27_2', medicineName: 'Diazepam', dosageForm: 'Tablet', strength: '5 mg', available: true, fy1Qty: 200, fy2Qty: 300, fy3Qty: 400 },
    { id: 'p28_1', medicineName: 'Diclofenac Sodium', dosageForm: 'Tablet', strength: '50 mg', available: true, fy1Qty: 1500, fy2Qty: 2000, fy3Qty: 2500 },
    { id: 'p28_2', medicineName: 'Diclofenac Sodium', dosageForm: 'Injection', strength: '25mg/ml', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p29', medicineName: 'Doxycycline', dosageForm: 'Capsule', strength: '100 mg', available: true, fy1Qty: 800, fy2Qty: 1200, fy3Qty: 1500 },
    { id: 'p30', medicineName: 'Ferrous sulphate and folic acid', dosageForm: 'Tablet', strength: '60mg+0.4mg', available: true, fy1Qty: 5000, fy2Qty: 8000, fy3Qty: 10000 },
    { id: 'p31', medicineName: 'Fluconazole', dosageForm: 'Capsule', strength: '150 mg', available: true, fy1Qty: 200, fy2Qty: 400, fy3Qty: 500 },
    { id: 'p32', medicineName: 'Fluoxetine', dosageForm: 'Capsule', strength: '20 mg', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p33', medicineName: 'Folic acid', dosageForm: 'Tablet', strength: '5 mg', available: true, fy1Qty: 2000, fy2Qty: 3000, fy3Qty: 4000 },
    { id: 'p34', medicineName: 'Furosemide', dosageForm: 'Tablet', strength: '40 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1000 },
    { id: 'p35', medicineName: 'Gentamicin', dosageForm: 'Injection', strength: '40mg/ml', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p36', medicineName: 'Gentian Violet', dosageForm: 'Aqueous solution', strength: '0.5%', available: true, fy1Qty: 20, fy2Qty: 30, fy3Qty: 40 },
    { id: 'p37_1', medicineName: 'Glimepiride', dosageForm: 'Tablet', strength: '1 mg', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 700 },
    { id: 'p37_2', medicineName: 'Glimepiride', dosageForm: 'Tablet', strength: '2 mg', available: true, fy1Qty: 400, fy2Qty: 600, fy3Qty: 800 },
    { id: 'p38', medicineName: 'Hydrocortisone', dosageForm: 'Powder for Injection', strength: '100 mg', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p39_1', medicineName: 'Hyoscine butylbromide', dosageForm: 'Injection', strength: '20mg/ml', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p39_2', medicineName: 'Hyoscine butylbromide', dosageForm: 'Tablet', strength: '10 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1000 },
    { id: 'p40_1', medicineName: 'Ibuprofen', dosageForm: 'Tablet', strength: '200 mg', available: true, fy1Qty: 2000, fy2Qty: 3000, fy3Qty: 4000 },
    { id: 'p40_2', medicineName: 'Ibuprofen', dosageForm: 'Tablet', strength: '400 mg', available: true, fy1Qty: 3000, fy2Qty: 4500, fy3Qty: 6000 },
    { id: 'p40_3', medicineName: 'Ibuprofen', dosageForm: 'Syrup', strength: '100mg/5ml', available: true, fy1Qty: 200, fy2Qty: 350, fy3Qty: 500 },
    { id: 'p41', medicineName: 'Lignocaine hydrochloride', dosageForm: 'Injection', strength: '2%', available: true, fy1Qty: 30, fy2Qty: 50, fy3Qty: 80 },
    { id: 'p42', medicineName: 'Lignocaine with adrenaline 1:10,000', dosageForm: 'Injection', strength: '2%', available: true, fy1Qty: 20, fy2Qty: 35, fy3Qty: 50 },
    { id: 'p43_1', medicineName: 'Losartan', dosageForm: 'Tablets', strength: '25 mg', available: true, fy1Qty: 1000, fy2Qty: 1500, fy3Qty: 2000 },
    { id: 'p43_2', medicineName: 'Losartan', dosageForm: 'Tablets', strength: '50 mg', available: true, fy1Qty: 1500, fy2Qty: 2200, fy3Qty: 3000 },
    { id: 'p44', medicineName: 'Magnesium sulphate', dosageForm: 'Injection', strength: '50%', available: true, fy1Qty: 20, fy2Qty: 40, fy3Qty: 60 },
    { id: 'p45_1', medicineName: 'Metformin', dosageForm: 'Tablet', strength: '500 mg', available: true, fy1Qty: 2000, fy2Qty: 3500, fy3Qty: 5000 },
    { id: 'p45_2', medicineName: 'Metformin', dosageForm: 'Tablet', strength: '850 mg', available: true, fy1Qty: 1000, fy2Qty: 1800, fy3Qty: 2500 },
    { id: 'p46', medicineName: 'Methyldopa', dosageForm: 'Tablet', strength: '250 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1200 },
    { id: 'p47_1', medicineName: 'Metoclopramide', dosageForm: 'Tablet', strength: '10 mg', available: true, fy1Qty: 800, fy2Qty: 1200, fy3Qty: 1500 },
    { id: 'p47_2', medicineName: 'Metoclopramide', dosageForm: 'Solution', strength: '5mg/5ml', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p47_3', medicineName: 'Metoclopramide', dosageForm: 'Injection', strength: '5mg/ml', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p48_1', medicineName: 'Metronidazole', dosageForm: 'Tablet', strength: '200 mg', available: true, fy1Qty: 1500, fy2Qty: 2000, fy3Qty: 2500 },
    { id: 'p48_2', medicineName: 'Metronidazole', dosageForm: 'Tablet', strength: '400 mg', available: true, fy1Qty: 2500, fy2Qty: 3200, fy3Qty: 4000 },
    { id: 'p48_3', medicineName: 'Metronidazole', dosageForm: 'Oral liquid', strength: '200mg/5ml', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p48_4', medicineName: 'Metronidazole', dosageForm: 'Injection', strength: '5mg/ml', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 120 },
    { id: 'p49', medicineName: 'Mifepristone + Misoprostol', dosageForm: 'Tablet', strength: '200mg+200mcg', available: true, fy1Qty: 30, fy2Qty: 50, fy3Qty: 80 },
    { id: 'p50', medicineName: 'Misoprostol', dosageForm: 'Tablet', strength: '200 mcg', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p51', medicineName: 'Neomycin Skin', dosageForm: 'Ointment', strength: '0.5%', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p52', medicineName: 'Nifedipine', dosageForm: 'Tablet', strength: '10 mg', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 800 },
    { id: 'p53', medicineName: 'Nitrofurantion', dosageForm: 'Tablet', strength: '100 mg', available: true, fy1Qty: 200, fy2Qty: 400, fy3Qty: 600 },
    { id: 'p54', medicineName: 'Normal Saline (NS)', dosageForm: 'Solution', strength: '0.9% 500ml', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 800 },
    { id: 'p55', medicineName: 'Oral Rehydration Salts (ORS)', dosageForm: 'Powder', strength: '20.5 gm', available: true, fy1Qty: 2000, fy2Qty: 3500, fy3Qty: 5000 },
    { id: 'p56', medicineName: 'Oxygen', dosageForm: 'Inhalation', strength: 'Cylinder', available: true, fy1Qty: 20, fy2Qty: 35, fy3Qty: 50 },
    { id: 'p57', medicineName: 'Oxymetazoline', dosageForm: 'Nasal drop', strength: '0.05%', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p58', medicineName: 'Oxytocin', dosageForm: 'Injection', strength: '10 IU/ml', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p59_1', medicineName: 'Paracetamol', dosageForm: 'Injection', strength: '150mg/ml', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 120 },
    { id: 'p59_2', medicineName: 'Paracetamol', dosageForm: 'Tablet', strength: '500 mg', available: true, fy1Qty: 15000, fy2Qty: 22000, fy3Qty: 28000 },
    { id: 'p59_3', medicineName: 'Paracetamol', dosageForm: 'Syrup', strength: '125mg/5ml', available: true, fy1Qty: 300, fy2Qty: 450, fy3Qty: 600 },
    { id: 'p60', medicineName: 'Permethrin', dosageForm: 'Lotion', strength: '5%', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p61', medicineName: 'Pheniramine', dosageForm: 'Injection', strength: '22.75mg/ml', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 100 },
    { id: 'p62_1', medicineName: 'Phenobarbital', dosageForm: 'Tablet', strength: '30 mg', available: true, fy1Qty: 200, fy2Qty: 350, fy3Qty: 500 },
    { id: 'p62_2', medicineName: 'Phenobarbital', dosageForm: 'Injection', strength: '200mg/ml', available: true, fy1Qty: 20, fy2Qty: 40, fy3Qty: 60 },
    { id: 'p63', medicineName: 'Povidone iodine', dosageForm: 'Solution', strength: '10%', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p64', medicineName: 'Pralidoxime Sodium', dosageForm: 'Injection', strength: '500 mg', available: true, fy1Qty: 5, fy2Qty: 10, fy3Qty: 15 },
    { id: 'p65', medicineName: 'Prednisolone', dosageForm: 'Tablet', strength: '5 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1200 },
    { id: 'p66', medicineName: 'Primaquine', dosageForm: 'Tablet', strength: '7.5 mg', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p67', medicineName: 'Pyridoxine', dosageForm: 'Tablet', strength: '25 mg', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 800 },
    { id: 'p68_1', medicineName: 'Ranitidine', dosageForm: 'Tablet', strength: '150 mg', available: true, fy1Qty: 2000, fy2Qty: 3000, fy3Qty: 4000 },
    { id: 'p68_2', medicineName: 'Ranitidine', dosageForm: 'Injection', strength: '25mg/ml', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p69', medicineName: "Ringer's Lactate (RL)", dosageForm: 'Solution', strength: '500 ml', available: true, fy1Qty: 200, fy2Qty: 350, fy3Qty: 500 },
    { id: 'p70', medicineName: 'Risperidone', dosageForm: 'Tablet', strength: '1 mg', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p71_1', medicineName: 'Salbutamol', dosageForm: 'Solution for nebulization', strength: '5mg/ml', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p71_2', medicineName: 'Salbutamol', dosageForm: 'MDI', strength: '100 mcg', available: true, fy1Qty: 30, fy2Qty: 60, fy3Qty: 100 },
    { id: 'p72', medicineName: 'Silver Sulfadiazine', dosageForm: 'Cream', strength: '1%', available: true, fy1Qty: 50, fy2Qty: 80, fy3Qty: 120 },
    { id: 'p73', medicineName: 'Tetanus Toxoid (TT)', dosageForm: 'Injection', strength: '0.5 ml', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 800 },
    { id: 'p74', medicineName: 'Tetracycline', dosageForm: 'Eye ointment', strength: '1%', available: true, fy1Qty: 100, fy2Qty: 200, fy3Qty: 300 },
    { id: 'p75', medicineName: 'Tinidazole', dosageForm: 'Tablet', strength: '500 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1200 },
    { id: 'p76', medicineName: 'Sodium Valporate', dosageForm: 'Tablet', strength: '200 mg', available: true, fy1Qty: 200, fy2Qty: 400, fy3Qty: 600 },
    { id: 'p77', medicineName: 'Vitamin A', dosageForm: 'Capsule', strength: '100,000 IU', available: true, fy1Qty: 1000, fy2Qty: 2000, fy3Qty: 3000 },
    { id: 'p78', medicineName: 'Vitamin B complex', dosageForm: 'Tablet', strength: 'Standard', available: true, fy1Qty: 3000, fy2Qty: 5000, fy3Qty: 7000 },
    { id: 'p79', medicineName: 'Vitamin K1', dosageForm: 'Injection', strength: '10mg/ml', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p80', medicineName: 'Zinc sulphate', dosageForm: 'Dispersible tablets', strength: '20 mg', available: true, fy1Qty: 1000, fy2Qty: 2000, fy3Qty: 3000 },
    { id: 'p81', medicineName: 'Calcium', dosageForm: 'Dispersible tablets', strength: '500 mg', available: true, fy1Qty: 500, fy2Qty: 1000, fy3Qty: 1500 },
    { id: 'p82', medicineName: 'Calcium + Vitamin D3', dosageForm: 'Tablet', strength: '500 mg + 250 IU', available: true, fy1Qty: 800, fy2Qty: 1500, fy3Qty: 2000 },
    { id: 'p83_1', medicineName: 'Chlorpheniramine Maleate', dosageForm: 'Tablet', strength: '4 mg', available: true, fy1Qty: 2000, fy2Qty: 3000, fy3Qty: 4000 },
    { id: 'p83_2', medicineName: 'Chlorpheniramine Maleate', dosageForm: 'Syrup', strength: '2 mg/5ml', available: true, fy1Qty: 150, fy2Qty: 250, fy3Qty: 350 },
    { id: 'p84', medicineName: 'Cinnarizine', dosageForm: 'Tablet', strength: '25 mg', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 800 },
    { id: 'p85', medicineName: 'Clopidogrel', dosageForm: 'Tablet', strength: '75 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1200 },
    { id: 'p86', medicineName: 'Digoxin', dosageForm: 'Tablet', strength: '0.25 mg', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p87', medicineName: 'Enalapril Maleate', dosageForm: 'Tablet', strength: '5 mg', available: true, fy1Qty: 1000, fy2Qty: 1800, fy3Qty: 2500 },
    { id: 'p88_1', medicineName: 'Erythromycin', dosageForm: 'Tablet', strength: '250 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1000 },
    { id: 'p88_2', medicineName: 'Erythromycin', dosageForm: 'Oral Suspension', strength: '125 mg/5ml', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p89_1', medicineName: 'Haloperidol', dosageForm: 'Tablet', strength: '5 mg', available: true, fy1Qty: 200, fy2Qty: 350, fy3Qty: 500 },
    { id: 'p89_2', medicineName: 'Haloperidol', dosageForm: 'Injection', strength: '5 mg/ml', available: true, fy1Qty: 10, fy2Qty: 20, fy3Qty: 30 },
    { id: 'p90', medicineName: 'Insulin (NPH / Soluble)', dosageForm: 'Injection', strength: '100 IU/ml', available: true, fy1Qty: 30, fy2Qty: 50, fy3Qty: 80 },
    { id: 'p91', medicineName: 'Levothyroxine', dosageForm: 'Tablet', strength: '50 mcg', available: true, fy1Qty: 400, fy2Qty: 700, fy3Qty: 1000 },
    { id: 'p92_1', medicineName: 'Ofloxacin', dosageForm: 'Tablet', strength: '200 mg', available: true, fy1Qty: 1000, fy2Qty: 1500, fy3Qty: 2000 },
    { id: 'p92_2', medicineName: 'Ofloxacin', dosageForm: 'Eye Drops', strength: '0.3%', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p93', medicineName: 'Omeprazole', dosageForm: 'Capsule', strength: '20 mg', available: true, fy1Qty: 3000, fy2Qty: 5000, fy3Qty: 7000 },
    { id: 'p94_1', medicineName: 'Pantoprazole', dosageForm: 'Tablet', strength: '40 mg', available: true, fy1Qty: 2000, fy2Qty: 3500, fy3Qty: 5000 },
    { id: 'p94_2', medicineName: 'Pantoprazole', dosageForm: 'Injection', strength: '40 mg', available: true, fy1Qty: 50, fy2Qty: 100, fy3Qty: 150 },
    { id: 'p95', medicineName: 'Potassium Chloride', dosageForm: 'Oral Solution', strength: '10%', available: true, fy1Qty: 20, fy2Qty: 40, fy3Qty: 60 },
    { id: 'p96', medicineName: 'Salicylic Acid + Benzoic Acid (Whitfield)', dosageForm: 'Ointment', strength: '3% + 6%', available: true, fy1Qty: 100, fy2Qty: 150, fy3Qty: 200 },
    { id: 'p97', medicineName: 'Spironolactone', dosageForm: 'Tablet', strength: '25 mg', available: true, fy1Qty: 300, fy2Qty: 500, fy3Qty: 800 },
    { id: 'p98_1', medicineName: 'Tramadol', dosageForm: 'Capsule', strength: '50 mg', available: true, fy1Qty: 500, fy2Qty: 800, fy3Qty: 1200 },
    { id: 'p98_2', medicineName: 'Tramadol', dosageForm: 'Injection', strength: '50 mg/ml', available: true, fy1Qty: 30, fy2Qty: 60, fy3Qty: 100 },
    { id: 'p99', medicineName: 'Vitamin D3 (Cholecalciferol)', dosageForm: 'Capsule / Granules', strength: '60,000 IU', available: true, fy1Qty: 200, fy2Qty: 400, fy3Qty: 600 }
  ], []);

  const [procurementItems, setProcurementItems] = useState<ProbableProcurementItem[]>(initialProcurementItems);

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

  const filteredProcurementItems = useMemo(() => {
    if (!searchTerm.trim()) return procurementItems;
    const term = searchTerm.toLowerCase();
    return procurementItems.filter(item => 
      item.medicineName.toLowerCase().includes(term) ||
      item.dosageForm.toLowerCase().includes(term) ||
      item.strength.toLowerCase().includes(term)
    );
  }, [procurementItems, searchTerm]);

  // Handle cell edit for probable procurement table
  const handleProcurementChange = (id: string, field: keyof ProbableProcurementItem, value: any) => {
    setProcurementItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Add new item to procurement
  const handleAddProcurementRow = () => {
    const newItem: ProbableProcurementItem = {
      id: `custom-${Date.now()}`,
      medicineName: 'New Medicine',
      dosageForm: 'Tablet',
      strength: '500 mg',
      available: true,
      fy1Qty: 0,
      fy2Qty: 0,
      fy3Qty: 0
    };
    setProcurementItems(prev => [...prev, newItem]);
  };

  // Remove procurement row
  const handleRemoveProcurementRow = (id: string) => {
    setProcurementItems(prev => prev.filter(i => i.id !== id));
  };

  // Stats calculation
  const totalUniqueMeds = quantifiedDrugs.length;
  const totalOutCount = quantifiedDrugs.filter(d => d.stockStatus === 'Out').length;
  const totalLowCount = quantifiedDrugs.filter(d => d.stockStatus === 'Low').length;
  const totalReorderUnits = quantifiedDrugs.reduce((sum, d) => sum + d.estimatedReorderQty, 0);

  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (reportMode === 'probable_procurement') {
      let csvContent = `Probable Procurement of Drug for Fiscal year ${targetFiscalYear} for ${healthFacilityName}\n\n`;
      csvContent += `S. No.,Medicine Name,Dosage form,Strength,Availability (Basic Health Service Center/ Health Post),${fy1Label},${fy2Label},${fy3Label},Average,${targetFyLabel}\n`;

      let currentSno = 0;
      let prevMedName = '';

      procurementItems.forEach((item) => {
        if (item.medicineName !== prevMedName) {
          currentSno++;
          prevMedName = item.medicineName;
        }

        const avg = Math.round((item.fy1Qty + item.fy2Qty + item.fy3Qty) / 3);
        const target = Math.round(avg * 1.10);
        const avail = item.available ? '✓' : 'x';

        csvContent += `"${currentSno}","${item.medicineName}","${item.dosageForm}","${item.strength}","${avail}",${item.fy1Qty},${item.fy2Qty},${item.fy3Qty},${avg},${target}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Drug_Procurement_${targetFiscalYear.replace('/', '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      let csvContent = `Drug Quantification Report (${currentFiscalYear})\n\n`;
      csvContent += `S. No.,Medicine Name,Sources,Total Prescribed Qty,Unit,Current Stock,Status,1 Month Req,3 Month Req,1 Year Req,Estimated Reorder Qty\n`;

      quantifiedDrugs.forEach((drug, index) => {
        csvContent += `"${index + 1}","${drug.name}","${drug.sources.join(', ')}",${drug.totalPrescribedQty},"${drug.unit}",${drug.currentStock},"${drug.stockStatus}",${drug.req1Month},${drug.req3Month},${drug.req1Year},${drug.estimatedReorderQty}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Drug_Quantification_${currentFiscalYear.replace('/', '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Merge group S.No and Medicine Name for repeating names
  let displaySno = 0;
  let lastMedicineName = '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Tab Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 font-nepali">
            <Pill className="text-teal-600" size={28} /> औषधि परिमाण तथा खरिद माग रिपोर्ट (Drug Quantification Report)
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-nepali">
            खपत, प्रेस्क्रिप्सन तथा ३ वर्षको औषधीय तथ्याङ्कका आधारमा खरिद माग र परिमाण प्रक्षेपण ढाँचा
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switches */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setReportMode('probable_procurement')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-nepali flex items-center gap-1.5 ${
                reportMode === 'probable_procurement'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet size={14} /> Probable Procurement Format
            </button>
            <button
              onClick={() => setReportMode('standard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all font-nepali flex items-center gap-1.5 ${
                reportMode === 'standard'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator size={14} /> सामान्य परिमाण रिपोर्ट
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-nepali"
          >
            <Download size={14} /> Excel/CSV
          </button>

          {reportMode === 'standard' && (
            <button
              onClick={handleAIAssist}
              disabled={isMatching}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm font-nepali"
            >
              {isMatching ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />}
              AI स्टक मिलान
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition-all shadow-sm font-nepali"
          >
            <Printer size={14} /> प्रिन्ट गर्नुहोस्
          </button>
        </div>
      </div>

      {/* KPI Cards (Shown for both modes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider font-nepali">कुल सिफारिस/खरिद सूची</span>
            <Pill className="text-teal-600" size={20} />
          </div>
          <p className="text-2xl font-black text-slate-800 font-mono">
            {reportMode === 'probable_procurement' ? toNepaliNumber(procurementItems.length) : toNepaliNumber(totalUniqueMeds)}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-nepali">कुल औषधि सूची संख्या</p>
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
            placeholder="औषधिको नाम, प्रकार वा मात्रा खोज्नुहोस्..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all font-nepali"
          />
        </div>

        {reportMode === 'probable_procurement' ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 font-nepali">स्वास्थ्य संस्था:</span>
              <input
                type="text"
                value={healthFacilityName}
                onChange={(e) => setHealthFacilityName(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 font-nepali">आर्थिक वर्ष:</span>
              <input
                type="text"
                value={targetFiscalYear}
                onChange={(e) => {
                  setTargetFiscalYear(e.target.value);
                  setTargetFyLabel(`F/Y ${e.target.value}`);
                }}
                className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              onClick={handleAddProcurementRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-all font-nepali"
            >
              <Plus size={14} /> नयाँ औषधि थप्नुहोस्
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {/* Main Table Section - PROBABLE PROCUREMENT FORMAT */}
      {reportMode === 'probable_procurement' ? (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden print:border-none print:shadow-none print:p-0">
          <div className="p-4 sm:p-6 text-center border-b border-slate-200 bg-slate-50/50 print:bg-transparent print:p-0 print:border-none">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
              Probable Procurement of Drug for Fiscal year {targetFiscalYear} for {healthFacilityName}
            </h1>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-400 text-xs text-slate-900">
              <thead>
                <tr className="bg-[#b8cce4] text-slate-900 font-bold border-b border-slate-400 text-center">
                  <th className="p-2.5 border-r border-slate-400 w-12" rowSpan={2}>S. No.</th>
                  <th className="p-2.5 border-r border-slate-400 min-w-[200px]" rowSpan={2}>Medicine Name</th>
                  <th className="p-2.5 border-r border-slate-400 min-w-[120px]" rowSpan={2}>Dosage form</th>
                  <th className="p-2.5 border-r border-slate-400 min-w-[120px]" rowSpan={2}>Strength</th>
                  <th className="p-2 border-r border-slate-400" rowSpan={1}>Availability</th>
                  <th className="p-2 border-r border-slate-400 w-24">
                    <input
                      type="text"
                      value={fy1Label}
                      onChange={(e) => setFy1Label(e.target.value)}
                      className="w-full text-center bg-transparent border-b border-slate-400/50 outline-none font-bold text-xs"
                    />
                  </th>
                  <th className="p-2 border-r border-slate-400 w-24">
                    <input
                      type="text"
                      value={fy2Label}
                      onChange={(e) => setFy2Label(e.target.value)}
                      className="w-full text-center bg-transparent border-b border-slate-400/50 outline-none font-bold text-xs"
                    />
                  </th>
                  <th className="p-2 border-r border-slate-400 w-24">
                    <input
                      type="text"
                      value={fy3Label}
                      onChange={(e) => setFy3Label(e.target.value)}
                      className="w-full text-center bg-transparent border-b border-slate-400/50 outline-none font-bold text-xs"
                    />
                  </th>
                  <th className="p-2.5 border-r border-slate-400 w-24" rowSpan={2}>Average</th>
                  <th className="p-2 w-28 bg-[#95b3d7]">
                    <input
                      type="text"
                      value={targetFyLabel}
                      onChange={(e) => setTargetFyLabel(e.target.value)}
                      className="w-full text-center bg-transparent border-b border-slate-400/50 outline-none font-bold text-xs"
                    />
                  </th>
                  <th className="p-2 w-10 print:hidden" rowSpan={2}></th>
                </tr>
                <tr className="bg-[#b8cce4] text-slate-900 font-bold border-b border-slate-400 text-center">
                  <th className="p-1.5 border-r border-slate-400 text-[11px] leading-tight">
                    Basic Health Service Center/ Health Post
                  </th>
                  <th className="p-1 border-r border-slate-400 text-[10px] text-slate-600 font-normal">खपत / परिमाण</th>
                  <th className="p-1 border-r border-slate-400 text-[10px] text-slate-600 font-normal">खपत / परिमाण</th>
                  <th className="p-1 border-r border-slate-400 text-[10px] text-slate-600 font-normal">खपत / परिमाण</th>
                  <th className="p-1 text-[10px] text-slate-700 font-bold bg-[#95b3d7]">अनुमानित परिमाण</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-sans">
                {filteredProcurementItems.map((item, index) => {
                  const isNewName = item.medicineName !== lastMedicineName;
                  if (isNewName) {
                    displaySno++;
                    lastMedicineName = item.medicineName;
                  }

                  const avg = Math.round((item.fy1Qty + item.fy2Qty + item.fy3Qty) / 3);
                  const targetQty = Math.round(avg * 1.10);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-300">
                      {/* S. No */}
                      <td className="p-2 text-center border-r border-slate-300 font-medium">
                        {isNewName ? displaySno : ''}
                      </td>

                      {/* Medicine Name */}
                      <td className="p-2 border-r border-slate-300">
                        <input
                          type="text"
                          value={item.medicineName}
                          onChange={(e) => handleProcurementChange(item.id, 'medicineName', e.target.value)}
                          className="w-full bg-transparent outline-none font-medium text-slate-900 hover:bg-slate-100/50 focus:bg-white rounded px-1 transition-all"
                        />
                      </td>

                      {/* Dosage Form */}
                      <td className="p-2 border-r border-slate-300">
                        <input
                          type="text"
                          value={item.dosageForm}
                          onChange={(e) => handleProcurementChange(item.id, 'dosageForm', e.target.value)}
                          className="w-full bg-transparent outline-none text-slate-700 hover:bg-slate-100/50 focus:bg-white rounded px-1 transition-all"
                        />
                      </td>

                      {/* Strength */}
                      <td className="p-2 border-r border-slate-300">
                        <input
                          type="text"
                          value={item.strength}
                          onChange={(e) => handleProcurementChange(item.id, 'strength', e.target.value)}
                          className="w-full bg-transparent outline-none text-slate-700 hover:bg-slate-100/50 focus:bg-white rounded px-1 transition-all"
                        />
                      </td>

                      {/* Availability Checkbox / Checkmark */}
                      <td className="p-2 text-center border-r border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleProcurementChange(item.id, 'available', !item.available)}
                          className="inline-flex items-center justify-center text-slate-800 hover:text-teal-600 transition-colors"
                        >
                          {item.available ? <span className="text-base font-black text-slate-900">✓</span> : <span className="text-slate-300 text-xs">x</span>}
                        </button>
                      </td>

                      {/* FY 1 Qty */}
                      <td className="p-2 text-right border-r border-slate-300 font-mono">
                        <input
                          type="number"
                          value={item.fy1Qty}
                          onChange={(e) => handleProcurementChange(item.id, 'fy1Qty', parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-transparent outline-none hover:bg-slate-100/50 focus:bg-white rounded px-1 transition-all"
                        />
                      </td>

                      {/* FY 2 Qty */}
                      <td className="p-2 text-right border-r border-slate-300 font-mono">
                        <input
                          type="number"
                          value={item.fy2Qty}
                          onChange={(e) => handleProcurementChange(item.id, 'fy2Qty', parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-transparent outline-none hover:bg-slate-100/50 focus:bg-white rounded px-1 transition-all"
                        />
                      </td>

                      {/* FY 3 Qty */}
                      <td className="p-2 text-right border-r border-slate-300 font-mono">
                        <input
                          type="number"
                          value={item.fy3Qty}
                          onChange={(e) => handleProcurementChange(item.id, 'fy3Qty', parseFloat(e.target.value) || 0)}
                          className="w-full text-right bg-transparent outline-none hover:bg-slate-100/50 focus:bg-white rounded px-1 transition-all"
                        />
                      </td>

                      {/* Average */}
                      <td className="p-2 text-right border-r border-slate-300 font-mono font-bold bg-slate-50/50">
                        {avg}
                      </td>

                      {/* Target FY Qty */}
                      <td className="p-2 text-right font-mono font-black text-slate-900 bg-teal-50/50">
                        {targetQty}
                      </td>

                      {/* Action Button */}
                      <td className="p-2 text-center print:hidden">
                        <button
                          onClick={() => handleRemoveProcurementRow(item.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="हटाउनुहोस्"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredProcurementItems.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                      कुनै रेकर्ड फेला परेन।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* STANDARD QUANTIFICATION TABLE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
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
      )}
    </div>
  );
};
