import React, { useState, useEffect } from 'react';
import { db } from '../firestore';
import { collection, doc, getDoc, setDoc, addDoc, query, getDocs } from 'firebase/firestore';
import { VitaminATarget, FCHV, VitaminADistributionRecord, AgeGroupData } from '../types/vitaminATypes';
import { Save, UserPlus, Plus } from 'lucide-react';
import { NepaliDatePicker } from './NepaliDatePicker';

export const VitaminAProgram: React.FC<{ currentFiscalYear: string }> = ({ currentFiscalYear }) => {
    const [targets, setTargets] = useState<VitaminATarget>({ fiscalYear: currentFiscalYear, target6to11Months: 0, target12to23Months: 0, target24to59Months: 0 });
    const [fchvs, setFchvs] = useState<FCHV[]>([]);
    const [newFchv, setNewFchv] = useState({ name: '', wardNumber: '' });

    const [distributionData, setDistributionData] = useState<Record<string, AgeGroupData>>({
        '6-11months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
        '12-23months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
        '24-59months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
    });
    const [selectedFchv, setSelectedFchv] = useState('');
    const [round, setRound] = useState<'1st' | '2nd'>('1st');
    const [programDates, setProgramDates] = useState({ round1: '', round2: '' });

    useEffect(() => {
        const fetchData = async () => {
            const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
            const targetDoc = await getDoc(doc(db, 'vitamin_a_targets', sanitizedFiscalYear));
            if (targetDoc.exists()) setTargets(targetDoc.data() as VitaminATarget);
            
            const fchvCol = await getDocs(collection(db, 'fchvs'));
            setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));
        };
        fetchData();
    }, [currentFiscalYear]);

    const saveTargets = async () => {
        const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
        await setDoc(doc(db, 'vitamin_a_targets', sanitizedFiscalYear), targets);
        alert('लक्ष्य सुरक्षित भयो');
    };

    const addFchv = async () => {
        if(!newFchv.name) return;
        await addDoc(collection(db, 'fchvs'), newFchv);
        setNewFchv({ name: '', wardNumber: '' });
        alert('FCHV थपियो');
        const fchvCol = await getDocs(collection(db, 'fchvs'));
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
        await addDoc(collection(db, 'vitamin_a_records'), {
            fiscalYear: currentFiscalYear,
            round,
            programDates,
            fchvId: selectedFchv,
            date: new Date().toISOString(),
            data: distributionData
        });
        alert('वितरण रेकर्ड सुरक्षित भयो');
    };

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
                    {fchvs.map(fchv => <li key={fchv.id} className="border-b p-1 text-sm">{fchv.name} (वडा: {fchv.wardNumber})</li>)}
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
        </div>
    );
};
