import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firestore';
import { collection, doc, getDoc, setDoc, addDoc, query, getDocs, updateDoc, where, and } from 'firebase/firestore';
import { VitaminATarget, FCHV, VitaminADistributionRecord, AgeGroupData } from '../types/vitaminATypes';
import { Save, UserPlus, Plus, Printer } from 'lucide-react';
import { NepaliDatePicker } from './NepaliDatePicker';

const INITIAL_DISTRIBUTION_DATA: Record<string, AgeGroupData> = {
    '6-11months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
    '12-23months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
    '24-59months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
};

export const VitaminAProgram: React.FC<{ currentFiscalYear: string; activeOrgName: string }> = ({ currentFiscalYear, activeOrgName }) => {
    const safeOrgName = activeOrgName.trim().replace(/[.#$[\\]]/g, "_");
    const [targets, setTargets] = useState<VitaminATarget>({ fiscalYear: currentFiscalYear, target6to11Months: 0, target12to23Months: 0, target24to59Months: 0 });
    const [fchvs, setFchvs] = useState<FCHV[]>([]);
    const [newFchv, setNewFchv] = useState({ name: '', wardNumber: '' });
    const [editingFchvId, setEditingFchvId] = useState<string | null>(null);

    const [distributionData, setDistributionData] = useState<Record<string, AgeGroupData>>(INITIAL_DISTRIBUTION_DATA);
    const [selectedFchv, setSelectedFchv] = useState('');
    const [round, setRound] = useState<'1st' | '2nd'>('1st');
    const [programDates, setProgramDates] = useState({ round1: '', round2: '' });
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [allRecords, setAllRecords] = useState<VitaminADistributionRecord[]>([]);
    const [reportRound, setReportRound] = useState<'1st' | '2nd'>('1st');

    useEffect(() => {
        const fetchData = async () => {
            const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
            const targetDoc = await getDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_targets', sanitizedFiscalYear));
            if (targetDoc.exists()) setTargets(targetDoc.data() as VitaminATarget);
            
            const fchvCol = await getDocs(collection(db, 'orgData', safeOrgName, 'fchvs'));
            setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));

            // Load global program dates
            const datesDoc = await getDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_dates', sanitizedFiscalYear));
            if (datesDoc.exists()) {
                setProgramDates(datesDoc.data() as { round1: string; round2: string });
            }

            // Load all distribution records for the current fiscal year
            const q = query(
                collection(db, 'orgData', safeOrgName, 'vitamin_a_records'),
                where('fiscalYear', '==', currentFiscalYear)
            );
            const querySnapshot = await getDocs(q);
            setAllRecords(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitaminADistributionRecord)));
        };
        fetchData();
    }, [currentFiscalYear]);

    const saveTargets = async () => {
        const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
        await setDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_targets', sanitizedFiscalYear), targets);
        alert('लक्ष्य सुरक्षित भयो');
    };

    const editFchv = (fchv: FCHV) => {
        setNewFchv({ name: fchv.name, wardNumber: fchv.wardNumber });
        setEditingFchvId(fchv.id);
    };

    const addFchv = async () => {
        if(!newFchv.name) return;
        if (editingFchvId) {
            await updateDoc(doc(db, 'orgData', safeOrgName, 'fchvs', editingFchvId), newFchv);
            alert('FCHV अपडेट भयो');
            setEditingFchvId(null);
        } else {
            await addDoc(collection(db, 'orgData', safeOrgName, 'fchvs'), newFchv);
            alert('FCHV थपियो');
        }
        setNewFchv({ name: '', wardNumber: '' });
        const fchvCol = await getDocs(collection(db, 'orgData', safeOrgName, 'fchvs'));
        setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));
    };

    const handleDataChange = (ageGroup: keyof typeof distributionData, field: keyof AgeGroupData, value: string) => {
        const numValue = parseInt(value) || 0;
        setDistributionData(prev => {
            const newData = { ...prev[ageGroup], [field]: numValue };
            
            // Calculate totals
            if (field.includes('VitaminA')) {
                newData.totalVitaminA = newData.maleVitaminA + newData.femaleVitaminA;
            } else if (field.includes('Albendazole')) {
                newData.totalAlbendazole = newData.maleAlbendazole + newData.femaleAlbendazole;
            } else if (field.includes('MuacGreen')) {
                newData.totalMuacGreen = newData.maleMuacGreen + newData.femaleMuacGreen;
            } else if (field.includes('MuacYellow')) {
                newData.totalMuacYellow = newData.maleMuacYellow + newData.femaleMuacYellow;
            } else if (field.includes('MuacRed')) {
                newData.totalMuacRed = newData.maleMuacRed + newData.femaleMuacRed;
            }
            
            return { ...prev, [ageGroup]: newData };
        });
    };

    const saveDistribution = async () => {
        if (!selectedFchv) return alert('FCHV छान्नुहोस्');
        const recordData = {
            fiscalYear: currentFiscalYear,
            round,
            programDates,
            fchvId: selectedFchv,
            date: new Date().toISOString(),
            data: distributionData
        };

        if (editingRecordId) {
            await updateDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_records', editingRecordId), recordData);
            alert('वितरण रेकर्ड अपडेट भयो');
            setEditingRecordId(null);
        } else {
            await addDoc(collection(db, 'orgData', safeOrgName, 'vitamin_a_records'), recordData);
            alert('वितरण रेकर्ड सुरक्षित भयो');
        }
        setDistributionData(INITIAL_DISTRIBUTION_DATA);
        setSelectedFchv('');

        // Reload all records for reporting update in real-time
        const q = query(
            collection(db, 'orgData', safeOrgName, 'vitamin_a_records'),
            where('fiscalYear', '==', currentFiscalYear)
        );
        const querySnapshot = await getDocs(q);
        setAllRecords(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitaminADistributionRecord)));
    };

    const saveProgramDates = async () => {
        const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
        await setDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_dates', sanitizedFiscalYear), programDates);
        alert('कार्यक्रम मिति सुरक्षित भयो');
    };

    const totals = useMemo(() => {
        const stats = {
            v6_11_m: 0, v6_11_f: 0, v6_11_t: 0,
            v12_23_m: 0, v12_23_f: 0, v12_23_t: 0,
            v24_59_m: 0, v24_59_f: 0, v24_59_t: 0,
            a12_23_m: 0, a12_23_f: 0, a12_23_t: 0,
            a24_59_m: 0, a24_59_f: 0, a24_59_t: 0,
            
            g_m: 0, g_f: 0, g_t: 0,
            y_m: 0, y_f: 0, y_t: 0,
            r_m: 0, r_f: 0, r_t: 0,
            tot_m: 0, tot_f: 0, tot_t: 0
        };

        fchvs.forEach(fchv => {
            const rec = allRecords.find(r => r.fchvId === fchv.id && r.round === reportRound);
            if (rec?.data) {
                // 6-11m Vit A
                stats.v6_11_m += rec.data['6-11months']?.maleVitaminA || 0;
                stats.v6_11_f += rec.data['6-11months']?.femaleVitaminA || 0;
                stats.v6_11_t += rec.data['6-11months']?.totalVitaminA || 0;

                // 12-23m Vit A
                stats.v12_23_m += rec.data['12-23months']?.maleVitaminA || 0;
                stats.v12_23_f += rec.data['12-23months']?.femaleVitaminA || 0;
                stats.v12_23_t += rec.data['12-23months']?.totalVitaminA || 0;

                // 24-59m Vit A
                stats.v24_59_m += rec.data['24-59months']?.maleVitaminA || 0;
                stats.v24_59_f += rec.data['24-59months']?.femaleVitaminA || 0;
                stats.v24_59_t += rec.data['24-59months']?.totalVitaminA || 0;

                // 12-23m Albendazole
                stats.a12_23_m += rec.data['12-23months']?.maleAlbendazole || 0;
                stats.a12_23_f += rec.data['12-23months']?.femaleAlbendazole || 0;
                stats.a12_23_t += rec.data['12-23months']?.totalAlbendazole || 0;

                // 24-59m Albendazole
                stats.a24_59_m += rec.data['24-59months']?.maleAlbendazole || 0;
                stats.a24_59_f += rec.data['24-59months']?.femaleAlbendazole || 0;
                stats.a24_59_t += rec.data['24-59months']?.totalAlbendazole || 0;

                // MUAC Green
                const greenM = (rec.data['6-11months']?.maleMuacGreen || 0) + (rec.data['12-23months']?.maleMuacGreen || 0) + (rec.data['24-59months']?.maleMuacGreen || 0);
                const greenF = (rec.data['6-11months']?.femaleMuacGreen || 0) + (rec.data['12-23months']?.femaleMuacGreen || 0) + (rec.data['24-59months']?.femaleMuacGreen || 0);
                stats.g_m += greenM;
                stats.g_f += greenF;
                stats.g_t += greenM + greenF;

                // MUAC Yellow
                const yellowM = (rec.data['6-11months']?.maleMuacYellow || 0) + (rec.data['12-23months']?.maleMuacYellow || 0) + (rec.data['24-59months']?.maleMuacYellow || 0);
                const yellowF = (rec.data['6-11months']?.femaleMuacYellow || 0) + (rec.data['12-23months']?.femaleMuacYellow || 0) + (rec.data['24-59months']?.femaleMuacYellow || 0);
                stats.y_m += yellowM;
                stats.y_f += yellowF;
                stats.y_t += yellowM + yellowF;

                // MUAC Red
                const redM = (rec.data['6-11months']?.maleMuacRed || 0) + (rec.data['12-23months']?.maleMuacRed || 0) + (rec.data['24-59months']?.maleMuacRed || 0);
                const redF = (rec.data['6-11months']?.femaleMuacRed || 0) + (rec.data['12-23months']?.femaleMuacRed || 0) + (rec.data['24-59months']?.femaleMuacRed || 0);
                stats.r_m += redM;
                stats.r_f += redF;
                stats.r_t += redM + redF;

                // Totals Screened
                stats.tot_m += greenM + yellowM + redM;
                stats.tot_f += greenF + yellowF + redF;
                stats.tot_t += greenM + greenF + yellowM + yellowF + redM + redF;
            }
        });

        return stats;
    }, [fchvs, allRecords, reportRound]);

    useEffect(() => {
        const loadExistingRecord = async () => {
            if (!selectedFchv) {
                setDistributionData(INITIAL_DISTRIBUTION_DATA);
                setEditingRecordId(null);
                return;
            }
            const q = query(
                collection(db, 'orgData', safeOrgName, 'vitamin_a_records'),
                and(where('fchvId', '==', selectedFchv), where('fiscalYear', '==', currentFiscalYear), where('round', '==', round))
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setDistributionData(doc.data().data);
                setEditingRecordId(doc.id);
            } else {
                setDistributionData(INITIAL_DISTRIBUTION_DATA);
                setEditingRecordId(null);
            }
        };
        loadExistingRecord();
    },[selectedFchv, round, currentFiscalYear]);

    return (
        <div className="p-8 space-y-6">
            <h2 className="text-2xl font-bold font-nepali">भिटामिन ए कार्यक्रम - {currentFiscalYear}</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">लक्ष्य जनसंख्या</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs text-slate-500">६-११ महिना</label>
                  <input type="number" value={targets.target6to11Months || 0} onChange={(e) => setTargets({...targets, target6to11Months: parseInt(e.target.value) || 0})} className="border p-2 rounded w-full" /></div>
                  <div><label className="block text-xs text-slate-500">१२-२३ महिना</label>
                  <input type="number" value={targets.target12to23Months || 0} onChange={(e) => setTargets({...targets, target12to23Months: parseInt(e.target.value) || 0})} className="border p-2 rounded w-full" /></div>
                    <div><label className="block text-xs text-slate-500">२४-५९ महिना</label>
                  <input type="number" value={targets.target24to59Months || 0} onChange={(e) => setTargets({...targets, target24to59Months: parseInt(e.target.value) || 0})} className="border p-2 rounded w-full" /></div>
                </div>
                <button onClick={saveTargets} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2"><Save size={16}/> सुरक्षित गर्नुहोस्</button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">FCHV व्यवस्थापन</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="नाम" value={newFchv.name} onChange={e => setNewFchv({...newFchv, name: e.target.value})} className="border p-2 rounded" />
                    <input type="text" placeholder="वडा नं" value={newFchv.wardNumber} onChange={e => setNewFchv({...newFchv, wardNumber: e.target.value})} className="border p-2 rounded" />
                    <button onClick={addFchv} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"><UserPlus size={16}/> थप्नुहोस्</button>
                </div>
                <ul className="space-y-1">
                    {fchvs.map(fchv => <li key={fchv.id} className="border-b p-1 text-sm flex justify-between">{fchv.name} (वडा: {fchv.wardNumber}) <button onClick={() => editFchv(fchv)} className="text-blue-500 underline">edit</button></li>)}
                </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">कार्यक्रम मिति (Program Dates)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <NepaliDatePicker
                        value={programDates.round1}
                        onChange={(val) => setProgramDates(prev => ({...prev, round1: val}))}
                        label="१st राउन्ड"
                    />
                    <NepaliDatePicker
                        value={programDates.round2}
                        onChange={(val) => setProgramDates(prev => ({...prev, round2: val}))}
                        label="२nd राउन्ड"
                    />
                </div>
                <button onClick={saveProgramDates} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2 no-print"><Save size={16}/> मिति सुरक्षित गर्नुहोस्</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">वितरण रेकर्ड</h3>
                <div className="flex gap-4 mb-4">
                    <select onChange={(e) => setSelectedFchv(e.target.value)} className="border p-2 rounded"><option>FCHV छान्नुहोस्</option>{fchvs.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}</select>
                    <select onChange={(e) => setRound(e.target.value as '1st' | '2nd')} className="border p-2 rounded"><option value="1st">१st राउन्ड</option><option value="2nd">२nd राउन्ड</option></select>
                </div>
                
                {Object.keys(distributionData).map(ageGroup => (
                    <div key={ageGroup} className="mb-6 border-t pt-4">
                        <h4 className="font-bold mb-3 text-lg">{ageGroup}</h4>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="space-y-1">
                                <label className="text-xs">Vitamin A</label>
                                <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500">
                                    <span>Male</span><span>Female</span><span>Total</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <input type="number" placeholder="M" value={distributionData[ageGroup].maleVitaminA ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'maleVitaminA', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="F" value={distributionData[ageGroup].femaleVitaminA ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'femaleVitaminA', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="T" value={distributionData[ageGroup].totalVitaminA ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100"/>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs">Albendazole</label>
                                <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500">
                                    <span>Male</span><span>Female</span><span>Total</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <input type="number" placeholder="M" value={distributionData[ageGroup].maleAlbendazole ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'maleAlbendazole', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="F" value={distributionData[ageGroup].femaleAlbendazole ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'femaleAlbendazole', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="T" value={distributionData[ageGroup].totalAlbendazole ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100"/>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                             <div className="space-y-1">
                                <label className="text-xs text-green-600">MUAC Green</label>
                                <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500">
                                    <span>Male</span><span>Female</span><span>Total</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <input type="number" placeholder="M" value={distributionData[ageGroup].maleMuacGreen ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'maleMuacGreen', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="F" value={distributionData[ageGroup].femaleMuacGreen ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'femaleMuacGreen', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="T" value={distributionData[ageGroup].totalMuacGreen ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100"/>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs text-yellow-600">MUAC Yellow</label>
                                <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500">
                                    <span>Male</span><span>Female</span><span>Total</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <input type="number" placeholder="M" value={distributionData[ageGroup].maleMuacYellow ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'maleMuacYellow', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="F" value={distributionData[ageGroup].femaleMuacYellow ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'femaleMuacYellow', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="T" value={distributionData[ageGroup].totalMuacYellow ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100"/>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs text-red-600">MUAC Red</label>
                                <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500">
                                    <span>Male</span><span>Female</span><span>Total</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    <input type="number" placeholder="M" value={distributionData[ageGroup].maleMuacRed ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'maleMuacRed', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="F" value={distributionData[ageGroup].femaleMuacRed ?? ''} onChange={(e) => handleDataChange(ageGroup as any, 'femaleMuacRed', e.target.value)} className="border p-1 rounded text-xs"/>
                                    <input type="number" placeholder="T" value={distributionData[ageGroup].totalMuacRed ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100"/>
                                </div>
                             </div>
                        </div>
                    </div>
                ))}                
                <button onClick={saveDistribution} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"><Plus size={16}/> रेकर्ड सुरक्षित गर्नुहोस्</button>
            </div>

            {/* रिपोर्ट र प्रिन्ट सेक्सन */}
            <div className="bg-white p-6 rounded-lg shadow-sm border print-section">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        .print-section, .print-section * { visibility: visible; }
                        .print-section { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
                        .no-print { display: none !important; }
                        .print-container { padding: 10px; }
                        .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        .print-table th, .print-table td { border: 1px solid #000 !important; padding: 4px 6px; text-align: center; font-size: 10px; }
                        .print-table th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .print-header { text-align: center; margin-bottom: 15px; }
                    }
                `}</style>

                <div className="flex justify-between items-center mb-6 no-print">
                    <div>
                        <h3 className="text-lg font-semibold font-nepali">भिटामिन ए तथा अल्बेन्डाजोल वितरण प्रतिवेदन</h3>
                        <p className="text-xs text-slate-500">राउन्ड अनुसारको विस्तृत रिपोर्ट र प्रिन्ट</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <select 
                            value={reportRound} 
                            onChange={(e) => setReportRound(e.target.value as '1st' | '2nd')} 
                            className="border p-2 rounded text-sm bg-white"
                        >
                            <option value="1st">१st राउन्ड प्रतिवेदन</option>
                            <option value="2nd">२nd राउन्ड प्रतिवेदन</option>
                        </select>
                        <button 
                            onClick={() => window.print()} 
                            className="bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 text-sm hover:bg-slate-900 transition-colors"
                        >
                            <Printer size={16}/> प्रतिवेदन प्रिन्ट गर्नुहोस्
                        </button>
                    </div>
                </div>

                <div className="print-container">
                    {/* Print Header */}
                    <div className="hidden print:block text-center mb-6">
                        <h1 className="text-xl font-bold font-nepali">{activeOrgName}</h1>
                        <h2 className="text-lg font-bold font-nepali mt-1">भिटामिन ए तथा जुकाको औषधि (अल्बेन्डाजोल) वितरण प्रतिवेदन</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            आर्थिक वर्ष: {currentFiscalYear} | राउन्ड: {reportRound === '1st' ? 'पहिलो (1st)' : 'दोस्रो (2nd)'} | 
                            मिति: {reportRound === '1st' ? programDates.round1 : programDates.round2}
                        </p>
                    </div>

                    {/* Target Stats Summary */}
                    <div className="mb-6 grid grid-cols-3 gap-4 text-center print:border print:p-3 print:rounded print:mb-4">
                        <div className="p-3 bg-slate-50 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-500 font-nepali">६-११ महिना लक्ष्य</span>
                            <span className="text-lg font-bold font-mono">{targets.target6to11Months || 0}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-500 font-nepali">१२-२३ महिना लक्ष्य</span>
                            <span className="text-lg font-bold font-mono">{targets.target12to23Months || 0}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-500 font-nepali">२४-५९ महिना लक्ष्य</span>
                            <span className="text-lg font-bold font-mono">{targets.target24to59Months || 0}</span>
                        </div>
                    </div>

                    {/* Table 1: Vitamin A & Albendazole Distribution */}
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-700 font-nepali mb-3 print:text-xs">१. भिटामिन ए र जुकाको औषधी (अल्बेन्डाजोल) वितरण विवरण</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse print-table">
                                <thead className="bg-slate-100 text-slate-700 border font-bold">
                                    <tr>
                                        <th className="border p-2 text-center" rowSpan={2}>क्र.सं.</th>
                                        <th className="border p-2" rowSpan={2}>स्वयंसेविकाको नाम</th>
                                        <th className="border p-2 text-center" rowSpan={2}>वडा नं</th>
                                        <th className="border p-2 text-center" colSpan={3}>भिटामिन ए (६-११ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>भिटामिन ए (१२-२३ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>भिटामिन ए (२४-५९ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>जुकाको औषधी (१२-२३ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>जुकाको औषधी (२४-५९ महिना)</th>
                                    </tr>
                                    <tr>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fchvs.map((fchv, idx) => {
                                        const rec = allRecords.find(r => r.fchvId === fchv.id && r.round === reportRound);
                                        return (
                                            <tr key={fchv.id} className="border hover:bg-slate-50 transition-colors">
                                                <td className="border p-2 text-center">{idx + 1}</td>
                                                <td className="border p-2 font-medium">{fchv.name}</td>
                                                <td className="border p-2 text-center font-mono">{fchv.wardNumber}</td>
                                                
                                                {/* 6-11m Vit A */}
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['6-11months']?.maleVitaminA || 0}</td>
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['6-11months']?.femaleVitaminA || 0}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{rec?.data?.['6-11months']?.totalVitaminA || 0}</td>

                                                {/* 12-23m Vit A */}
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['12-23months']?.maleVitaminA || 0}</td>
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['12-23months']?.femaleVitaminA || 0}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{rec?.data?.['12-23months']?.totalVitaminA || 0}</td>

                                                {/* 24-59m Vit A */}
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['24-59months']?.maleVitaminA || 0}</td>
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['24-59months']?.femaleVitaminA || 0}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{rec?.data?.['24-59months']?.totalVitaminA || 0}</td>

                                                {/* 12-23m Albendazole */}
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['12-23months']?.maleAlbendazole || 0}</td>
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['12-23months']?.femaleAlbendazole || 0}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{rec?.data?.['12-23months']?.totalAlbendazole || 0}</td>

                                                {/* 24-59m Albendazole */}
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['24-59months']?.maleAlbendazole || 0}</td>
                                                <td className="border p-1 text-center font-mono">{rec?.data?.['24-59months']?.femaleAlbendazole || 0}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{rec?.data?.['24-59months']?.totalAlbendazole || 0}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Grand Total Row */}
                                    <tr className="border bg-slate-100 font-bold">
                                        <td className="border p-2 text-center" colSpan={3}>कुल जम्मा (Grand Total)</td>
                                        
                                        {/* 6-11m Vit A Total */}
                                        <td className="border p-1 text-center font-mono">{totals.v6_11_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.v6_11_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.v6_11_t}</td>

                                        {/* 12-23m Vit A Total */}
                                        <td className="border p-1 text-center font-mono">{totals.v12_23_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.v12_23_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.v12_23_t}</td>

                                        {/* 24-59m Vit A Total */}
                                        <td className="border p-1 text-center font-mono">{totals.v24_59_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.v24_59_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.v24_59_t}</td>

                                        {/* 12-23m Albendazole Total */}
                                        <td className="border p-1 text-center font-mono">{totals.a12_23_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.a12_23_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.a12_23_t}</td>

                                        {/* 24-59m Albendazole Total */}
                                        <td className="border p-1 text-center font-mono">{totals.a24_59_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.a24_59_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.a24_59_t}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Table 2: MUAC Screening */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 font-nepali mb-3 print:text-xs">२. पाखुराको घेरा (MUAC) स्क्रिनिङ स्थिति विवरण (६-५९ महिना)</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse print-table">
                                <thead className="bg-slate-100 text-slate-700 border font-bold">
                                    <tr>
                                        <th className="border p-2 text-center" rowSpan={2}>क्र.सं.</th>
                                        <th className="border p-2" rowSpan={2}>स्वयंसेविकाको नाम</th>
                                        <th className="border p-2 text-center" rowSpan={2}>वडा नं</th>
                                        <th className="border p-2 text-center" colSpan={3}>हरियो (Normal - Green)</th>
                                        <th className="border p-2 text-center" colSpan={3}>पहेंलो (MAM - Yellow)</th>
                                        <th className="border p-2 text-center" colSpan={3}>रातो (SAM - Red)</th>
                                        <th className="border p-2 text-center" colSpan={3}>जम्मा स्क्रिनिङ (Total Screened)</th>
                                    </tr>
                                    <tr>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                        <th className="border p-1 text-center">M</th><th className="border p-1 text-center">F</th><th className="border p-1 text-center">T</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fchvs.map((fchv, idx) => {
                                        const rec = allRecords.find(r => r.fchvId === fchv.id && r.round === reportRound);
                                        
                                        // Calculate sums across age groups
                                        const greenM = (rec?.data?.['6-11months']?.maleMuacGreen || 0) + (rec?.data?.['12-23months']?.maleMuacGreen || 0) + (rec?.data?.['24-59months']?.maleMuacGreen || 0);
                                        const greenF = (rec?.data?.['6-11months']?.femaleMuacGreen || 0) + (rec?.data?.['12-23months']?.femaleMuacGreen || 0) + (rec?.data?.['24-59months']?.femaleMuacGreen || 0);
                                        const greenT = greenM + greenF;

                                        const yellowM = (rec?.data?.['6-11months']?.maleMuacYellow || 0) + (rec?.data?.['12-23months']?.maleMuacYellow || 0) + (rec?.data?.['24-59months']?.maleMuacYellow || 0);
                                        const yellowF = (rec?.data?.['6-11months']?.femaleMuacYellow || 0) + (rec?.data?.['12-23months']?.femaleMuacYellow || 0) + (rec?.data?.['24-59months']?.femaleMuacYellow || 0);
                                        const yellowT = yellowM + yellowF;

                                        const redM = (rec?.data?.['6-11months']?.maleMuacRed || 0) + (rec?.data?.['12-23months']?.maleMuacRed || 0) + (rec?.data?.['24-59months']?.maleMuacRed || 0);
                                        const redF = (rec?.data?.['6-11months']?.femaleMuacRed || 0) + (rec?.data?.['12-23months']?.femaleMuacRed || 0) + (rec?.data?.['24-59months']?.femaleMuacRed || 0);
                                        const redT = redM + redF;

                                        const totalM = greenM + yellowM + redM;
                                        const totalF = greenF + yellowF + redF;
                                        const totalT = totalM + totalF;

                                        return (
                                            <tr key={fchv.id} className="border hover:bg-slate-50 transition-colors">
                                                <td className="border p-2 text-center">{idx + 1}</td>
                                                <td className="border p-2 font-medium">{fchv.name}</td>
                                                <td className="border p-2 text-center font-mono">{fchv.wardNumber}</td>
                                                
                                                {/* Green */}
                                                <td className="border p-1 text-center font-mono">{greenM}</td>
                                                <td className="border p-1 text-center font-mono">{greenF}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{greenT}</td>

                                                {/* Yellow */}
                                                <td className="border p-1 text-center font-mono">{yellowM}</td>
                                                <td className="border p-1 text-center font-mono">{yellowF}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{yellowT}</td>

                                                {/* Red */}
                                                <td className="border p-1 text-center font-mono">{redM}</td>
                                                <td className="border p-1 text-center font-mono">{redF}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{redT}</td>

                                                {/* Total Screened */}
                                                <td className="border p-1 text-center font-mono">{totalM}</td>
                                                <td className="border p-1 text-center font-mono">{totalF}</td>
                                                <td className="border p-1 text-center font-mono font-black bg-slate-100">{totalT}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Grand Total Row */}
                                    <tr className="border bg-slate-100 font-bold">
                                        <td className="border p-2 text-center" colSpan={3}>कुल जम्मा (Grand Total)</td>
                                        
                                        {/* Green Total */}
                                        <td className="border p-1 text-center font-mono">{totals.g_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.g_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.g_t}</td>

                                        {/* Yellow Total */}
                                        <td className="border p-1 text-center font-mono">{totals.y_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.y_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.y_t}</td>

                                        {/* Red Total */}
                                        <td className="border p-1 text-center font-mono">{totals.r_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.r_f}</td>
                                        <td className="border p-1 text-center font-mono font-black">{totals.r_t}</td>

                                        {/* Grand Screened Total */}
                                        <td className="border p-1 text-center font-mono">{totals.tot_m}</td>
                                        <td className="border p-1 text-center font-mono">{totals.tot_f}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-slate-200">{totals.tot_t}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
