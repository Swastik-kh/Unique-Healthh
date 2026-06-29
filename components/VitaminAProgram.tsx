import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firestore';
import { collection, doc, getDoc, setDoc, addDoc, query, getDocs, updateDoc, where, and } from 'firebase/firestore';
import { VitaminATarget, FCHV, VitaminADistributionRecord, AgeGroupData } from '../types/vitaminATypes';
import { Save, UserPlus, Plus, Printer } from 'lucide-react';
import { NepaliDatePicker } from './NepaliDatePicker';
import { toNepaliNumber } from './nepaliUtils';

const INITIAL_DISTRIBUTION_DATA: Record<string, AgeGroupData> = {
    '6-11months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
    '12-23months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
    '24-59months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
    '12-59months': { maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0, maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0, maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0, maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0, maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0 },
};

const sanitizeRecordData = (data: any): Record<string, AgeGroupData> => {
    const emptyGroup = () => ({
        maleVitaminA: 0, femaleVitaminA: 0, totalVitaminA: 0,
        maleAlbendazole: 0, femaleAlbendazole: 0, totalAlbendazole: 0,
        maleMuacGreen: 0, femaleMuacGreen: 0, totalMuacGreen: 0,
        maleMuacYellow: 0, femaleMuacYellow: 0, totalMuacYellow: 0,
        maleMuacRed: 0, femaleMuacRed: 0, totalMuacRed: 0
    });

    const sanitized: Record<string, AgeGroupData> = {
        '6-11months': emptyGroup(),
        '12-23months': emptyGroup(),
        '24-59months': emptyGroup(),
        '12-59months': emptyGroup(),
    };
    if (!data) return sanitized;

    if (data['6-11months']) {
        sanitized['6-11months'] = { ...sanitized['6-11months'], ...data['6-11months'] };
    }

    if (data['12-23months']) {
        sanitized['12-23months'] = { ...sanitized['12-23months'], ...data['12-23months'] };
    }

    if (data['24-59months']) {
        sanitized['24-59months'] = { ...sanitized['24-59months'], ...data['24-59months'] };
    }

    if (data['12-59months']) {
        sanitized['12-59months'] = { ...sanitized['12-59months'], ...data['12-59months'] };
    } else {
        // Merge 12-23months and 24-59months into 12-59months for backward compatibility
        const r12 = data['12-23months'] || {};
        const r24 = data['24-59months'] || {};
        
        const mVitA = (r12.maleVitaminA || 0) + (r24.maleVitaminA || 0);
        const fVitA = (r12.femaleVitaminA || 0) + (r24.femaleVitaminA || 0);
        const mAlb = (r12.maleAlbendazole || 0) + (r24.maleAlbendazole || 0);
        const fAlb = (r12.femaleAlbendazole || 0) + (r24.femaleAlbendazole || 0);
        
        const mGreen = (r12.maleMuacGreen || 0) + (r24.maleMuacGreen || 0);
        const fGreen = (r12.femaleMuacGreen || 0) + (r24.femaleMuacGreen || 0);
        const mYellow = (r12.maleMuacYellow || 0) + (r24.maleMuacYellow || 0);
        const fYellow = (r12.femaleMuacYellow || 0) + (r24.femaleMuacYellow || 0);
        const mRed = (r12.maleMuacRed || 0) + (r24.maleMuacRed || 0);
        const fRed = (r12.femaleMuacRed || 0) + (r24.femaleMuacRed || 0);

        sanitized['12-59months'] = {
            maleVitaminA: mVitA,
            femaleVitaminA: fVitA,
            totalVitaminA: mVitA + fVitA,
            maleAlbendazole: mAlb,
            femaleAlbendazole: fAlb,
            totalAlbendazole: mAlb + fAlb,
            maleMuacGreen: mGreen,
            femaleMuacGreen: fGreen,
            totalMuacGreen: mGreen + fGreen,
            maleMuacYellow: mYellow,
            femaleMuacYellow: fYellow,
            totalMuacYellow: mYellow + fYellow,
            maleMuacRed: mRed,
            femaleMuacRed: fRed,
            totalMuacRed: mRed + fRed,
        };
    }

    // Fallback: if we have 12-59months Albendazole but 12-23 and 24-59 are empty,
    // let's put it in 24-59 so the user can see it in 24-59months and doesn't lose old records.
    if (sanitized['12-59months'].totalAlbendazole > 0 &&
        sanitized['12-23months'].totalAlbendazole === 0 &&
        sanitized['24-59months'].totalAlbendazole === 0) {
        sanitized['24-59months'].maleAlbendazole = sanitized['12-59months'].maleAlbendazole;
        sanitized['24-59months'].femaleAlbendazole = sanitized['12-59months'].femaleAlbendazole;
        sanitized['24-59months'].totalAlbendazole = sanitized['12-59months'].totalAlbendazole;
    }

    return sanitized;
};

export const VitaminAProgram: React.FC<{ currentFiscalYear: string; activeOrgName: string; generalSettings?: any }> = ({ currentFiscalYear, activeOrgName, generalSettings }) => {
    const safeOrgName = activeOrgName.trim().replace(/[.#$[\\]]/g, "_");
    const [targets, setTargets] = useState<VitaminATarget>({ 
        fiscalYear: currentFiscalYear, 
        target6to11Months: 0, 
        target12to23Months: 0,
        target24to59Months: 0,
        target12to59Months: 0 
    });
    const [fchvs, setFchvs] = useState<FCHV[]>([]);
    const [newFchv, setNewFchv] = useState({ name: '', wardNumber: '' });
    const [editingFchvId, setEditingFchvId] = useState<string | null>(null);

    const [distributionData, setDistributionData] = useState<Record<string, AgeGroupData>>(INITIAL_DISTRIBUTION_DATA);
    const [selectedFchv, setSelectedFchv] = useState('');
    const [round, setRound] = useState<'1st' | '2nd'>('1st');
    const [programDates, setProgramDates] = useState({ 
        round1From: '', 
        round1To: '', 
        round2From: '', 
        round2To: '',
        round1: '',
        round2: ''
    });
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [allRecords, setAllRecords] = useState<VitaminADistributionRecord[]>([]);
    const [reportRound, setReportRound] = useState<'1st' | '2nd'>('1st');
    const [filterFchvId, setFilterFchvId] = useState<string>('all');

    const [receivedVitaminA, setReceivedVitaminA] = useState<number | ''>('');
    const [spentVitaminA, setSpentVitaminA] = useState<number | ''>('');
    const [receivedAlbendazole, setReceivedAlbendazole] = useState<number | ''>('');
    const [spentAlbendazole, setSpentAlbendazole] = useState<number | ''>('');

    useEffect(() => {
        const fetchData = async () => {
            const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
            const targetDoc = await getDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_targets', sanitizedFiscalYear));
            if (targetDoc.exists()) {
                const data = targetDoc.data() as VitaminATarget;
                setTargets({
                    fiscalYear: data.fiscalYear,
                    target6to11Months: data.target6to11Months || 0,
                    target12to23Months: data.target12to23Months || 0,
                    target24to59Months: data.target24to59Months || 0,
                    target12to59Months: data.target12to59Months ?? ((data.target12to23Months || 0) + (data.target24to59Months || 0))
                });
            } else {
                setTargets({ 
                    fiscalYear: currentFiscalYear, 
                    target6to11Months: 0, 
                    target12to23Months: 0, 
                    target24to59Months: 0, 
                    target12to59Months: 0 
                });
            }
            
            const fchvCol = await getDocs(collection(db, 'orgData', safeOrgName, 'fchvs'));
            setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));

            // Load global program dates
            const datesDoc = await getDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_dates', sanitizedFiscalYear));
            if (datesDoc.exists()) {
                const data = datesDoc.data();
                setProgramDates({
                    round1From: data.round1From || '',
                    round1To: data.round1To || '',
                    round2From: data.round2From || '',
                    round2To: data.round2To || '',
                    round1: data.round1 || data.round1From || '',
                    round2: data.round2 || data.round2From || ''
                });
            } else {
                setProgramDates({
                    round1From: '',
                    round1To: '',
                    round2From: '',
                    round2To: '',
                    round1: '',
                    round2: ''
                });
            }

            // Load all distribution records for the current fiscal year
            const q = query(
                collection(db, 'orgData', safeOrgName, 'vitamin_a_records'),
                where('fiscalYear', '==', currentFiscalYear)
            );
            const querySnapshot = await getDocs(q);
            setAllRecords(querySnapshot.docs.map(doc => {
                const rec = doc.data() as VitaminADistributionRecord;
                return {
                    id: doc.id,
                    ...rec,
                    data: sanitizeRecordData(rec.data)
                } as VitaminADistributionRecord;
            }));
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
            data: distributionData,
            inventory: {
                receivedVitaminA: receivedVitaminA === '' ? 0 : Number(receivedVitaminA),
                spentVitaminA: spentVitaminA === '' ? 0 : Number(spentVitaminA),
                receivedAlbendazole: receivedAlbendazole === '' ? 0 : Number(receivedAlbendazole),
                spentAlbendazole: spentAlbendazole === '' ? 0 : Number(spentAlbendazole)
            }
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
        setReceivedVitaminA('');
        setSpentVitaminA('');
        setReceivedAlbendazole('');
        setSpentAlbendazole('');

        // Reload all records for reporting update in real-time
        const q = query(
            collection(db, 'orgData', safeOrgName, 'vitamin_a_records'),
            where('fiscalYear', '==', currentFiscalYear)
        );
        const querySnapshot = await getDocs(q);
        setAllRecords(querySnapshot.docs.map(doc => {
            const rec = doc.data() as VitaminADistributionRecord;
            return {
                id: doc.id,
                ...rec,
                data: sanitizeRecordData(rec.data)
            } as VitaminADistributionRecord;
        }));
    };

    const saveProgramDates = async () => {
        const sanitizedFiscalYear = currentFiscalYear.replace(/\//g, '_');
        const updatedDates = {
            ...programDates,
            round1: programDates.round1From || '',
            round2: programDates.round2From || ''
        };
        await setDoc(doc(db, 'orgData', safeOrgName, 'vitamin_a_dates', sanitizedFiscalYear), updatedDates);
        setProgramDates(updatedDates);
        alert('कार्यक्रम मिति सुरक्षित भयो');
    };

    const visibleFchvs = useMemo(() => {
        if (filterFchvId === 'all') return fchvs;
        return fchvs.filter(f => f.id === filterFchvId);
    }, [fchvs, filterFchvId]);

    const totals = useMemo(() => {
        const stats = {
            v6_11_m: 0, v6_11_f: 0, v6_11_t: 0,
            v12_59_m: 0, v12_59_f: 0, v12_59_t: 0,
            a12_23_m: 0, a12_23_f: 0, a12_23_t: 0,
            a24_59_m: 0, a24_59_f: 0, a24_59_t: 0,
            a12_59_m: 0, a12_59_f: 0, a12_59_t: 0,
            
            g_m: 0, g_f: 0, g_t: 0,
            y_m: 0, y_f: 0, y_t: 0,
            r_m: 0, r_f: 0, r_t: 0,
            tot_m: 0, tot_f: 0, tot_t: 0,

            inv_v_rec: 0, inv_v_sp: 0, inv_v_rem: 0,
            inv_a_rec: 0, inv_a_sp: 0, inv_a_rem: 0
        };

        visibleFchvs.forEach(fchv => {
            const rec = allRecords.find(r => r.fchvId === fchv.id && r.round === reportRound);
            if (rec?.data) {
                // 6-11m Vit A
                stats.v6_11_m += rec.data['6-11months']?.maleVitaminA || 0;
                stats.v6_11_f += rec.data['6-11months']?.femaleVitaminA || 0;
                stats.v6_11_t += rec.data['6-11months']?.totalVitaminA || 0;

                // 12-59m Vit A
                stats.v12_59_m += rec.data['12-59months']?.maleVitaminA || 0;
                stats.v12_59_f += rec.data['12-59months']?.femaleVitaminA || 0;
                stats.v12_59_t += rec.data['12-59months']?.totalVitaminA || 0;

                // 12-23m Albendazole
                const alb12_m = rec.data['12-23months']?.maleAlbendazole || 0;
                const alb12_f = rec.data['12-23months']?.femaleAlbendazole || 0;
                stats.a12_23_m += alb12_m;
                stats.a12_23_f += alb12_f;
                stats.a12_23_t += (rec.data['12-23months']?.totalAlbendazole || (alb12_m + alb12_f));

                // 24-59m Albendazole
                const alb24_m = rec.data['24-59months']?.maleAlbendazole || 0;
                const alb24_f = rec.data['24-59months']?.femaleAlbendazole || 0;
                stats.a24_59_m += alb24_m;
                stats.a24_59_f += alb24_f;
                stats.a24_59_t += (rec.data['24-59months']?.totalAlbendazole || (alb24_m + alb24_f));

                // 12-59m Albendazole Total (sum of 12-23 and 24-59, or fallback to 12-59months if both are 0)
                let alb59_m = alb12_m + alb24_m;
                let alb59_f = alb12_f + alb24_f;
                let alb59_t = (rec.data['12-23months']?.totalAlbendazole || 0) + (rec.data['24-59months']?.totalAlbendazole || 0);

                if (alb59_m === 0 && alb59_f === 0 && rec.data['12-59months']?.totalAlbendazole) {
                     alb59_m = rec.data['12-59months']?.maleAlbendazole || 0;
                     alb59_f = rec.data['12-59months']?.femaleAlbendazole || 0;
                     alb59_t = rec.data['12-59months']?.totalAlbendazole || 0;
                }

                stats.a12_59_m += alb59_m;
                stats.a12_59_f += alb59_f;
                stats.a12_59_t += alb59_t || (alb59_m + alb59_f);

                // MUAC Green
                const greenM = (rec.data['6-11months']?.maleMuacGreen || 0) + (rec.data['12-59months']?.maleMuacGreen || 0);
                const greenF = (rec.data['6-11months']?.femaleMuacGreen || 0) + (rec.data['12-59months']?.femaleMuacGreen || 0);
                stats.g_m += greenM;
                stats.g_f += greenF;
                stats.g_t += greenM + greenF;

                // MUAC Yellow
                const yellowM = (rec.data['6-11months']?.maleMuacYellow || 0) + (rec.data['12-59months']?.maleMuacYellow || 0);
                const yellowF = (rec.data['6-11months']?.femaleMuacYellow || 0) + (rec.data['12-59months']?.femaleMuacYellow || 0);
                stats.y_m += yellowM;
                stats.y_f += yellowF;
                stats.y_t += yellowM + yellowF;

                // MUAC Red
                const redM = (rec.data['6-11months']?.maleMuacRed || 0) + (rec.data['12-59months']?.maleMuacRed || 0);
                const redF = (rec.data['6-11months']?.femaleMuacRed || 0) + (rec.data['12-59months']?.femaleMuacRed || 0);
                stats.r_m += redM;
                stats.r_f += redF;
                stats.r_t += redM + redF;

                // Inventory Stock
                const rec_v = rec.inventory?.receivedVitaminA || 0;
                const sp_v = rec.inventory?.spentVitaminA || 0;
                stats.inv_v_rec += rec_v;
                stats.inv_v_sp += sp_v;
                stats.inv_v_rem += (rec_v - sp_v);

                const rec_a = rec.inventory?.receivedAlbendazole || 0;
                const sp_a = rec.inventory?.spentAlbendazole || 0;
                stats.inv_a_rec += rec_a;
                stats.inv_a_sp += sp_a;
                stats.inv_a_rem += (rec_a - sp_a);

                // Totals Screened
                stats.tot_m += greenM + yellowM + redM;
                stats.tot_f += greenF + yellowF + redF;
                stats.tot_t += greenM + greenF + yellowM + yellowF + redM + redF;
            }
        });

        return stats;
    }, [visibleFchvs, allRecords, reportRound]);

    useEffect(() => {
        const loadExistingRecord = async () => {
            if (!selectedFchv) {
                setDistributionData(INITIAL_DISTRIBUTION_DATA);
                setEditingRecordId(null);
                setReceivedVitaminA('');
                setSpentVitaminA('');
                setReceivedAlbendazole('');
                setSpentAlbendazole('');
                return;
            }
            const q = query(
                collection(db, 'orgData', safeOrgName, 'vitamin_a_records'),
                and(where('fchvId', '==', selectedFchv), where('fiscalYear', '==', currentFiscalYear), where('round', '==', round))
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docObj = querySnapshot.docs[0];
                const data = docObj.data();
                setDistributionData(sanitizeRecordData(data.data));
                setEditingRecordId(docObj.id);
                
                const inv = data.inventory || {};
                setReceivedVitaminA(inv.receivedVitaminA !== undefined ? inv.receivedVitaminA : '');
                setSpentVitaminA(inv.spentVitaminA !== undefined ? inv.spentVitaminA : '');
                setReceivedAlbendazole(inv.receivedAlbendazole !== undefined ? inv.receivedAlbendazole : '');
                setSpentAlbendazole(inv.spentAlbendazole !== undefined ? inv.spentAlbendazole : '');
            } else {
                setDistributionData(INITIAL_DISTRIBUTION_DATA);
                setEditingRecordId(null);
                setReceivedVitaminA('');
                setSpentVitaminA('');
                setReceivedAlbendazole('');
                setSpentAlbendazole('');
            }
        };
        loadExistingRecord();
    },[selectedFchv, round, currentFiscalYear]);

    return (
        <div className="p-8 space-y-6">
            <h2 className="text-2xl font-bold font-nepali">भिटामिन ए कार्यक्रम - {currentFiscalYear}</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">लक्ष्य जनसंख्या (Target Population)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 font-nepali mb-1">६-११ महिना</label>
                        <input 
                            type="number" 
                            value={targets.target6to11Months || 0} 
                            onChange={(e) => setTargets({...targets, target6to11Months: parseInt(e.target.value) || 0})} 
                            className="border p-2 rounded w-full font-mono focus:ring-2 focus:ring-primary-500 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-nepali mb-1">१२-२३ महिना</label>
                        <input 
                            type="number" 
                            value={targets.target12to23Months || 0} 
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTargets(prev => ({
                                    ...prev,
                                    target12to23Months: val,
                                    target12to59Months: val + (prev.target24to59Months || 0)
                                }));
                            }} 
                            className="border p-2 rounded w-full font-mono focus:ring-2 focus:ring-primary-500 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-nepali mb-1">२४-५९ महिना</label>
                        <input 
                            type="number" 
                            value={targets.target24to59Months || 0} 
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTargets(prev => ({
                                    ...prev,
                                    target24to59Months: val,
                                    target12to59Months: (prev.target12to23Months || 0) + val
                                }));
                            }} 
                            className="border p-2 rounded w-full font-mono focus:ring-2 focus:ring-primary-500 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 font-nepali mb-1">१२-५९ महिना जम्मा</label>
                        <input 
                            type="number" 
                            readOnly 
                            value={targets.target12to59Months || 0} 
                            className="border p-2 rounded w-full font-mono bg-slate-50 text-slate-600 font-bold outline-none" 
                        />
                    </div>
                </div>
                <button onClick={saveTargets} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2 font-nepali hover:bg-primary-700 transition-colors"><Save size={16}/> लक्ष्य सुरक्षित गर्नुहोस्</button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border p-4 rounded-lg bg-sky-50/20">
                        <h4 className="font-bold text-sm mb-3 font-nepali text-sky-800 border-b pb-1">१st राउन्ड (1st Round)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <NepaliDatePicker
                                value={programDates.round1From}
                                onChange={(val) => setProgramDates(prev => ({...prev, round1From: val}))}
                                label="मिति देखि (From Date)"
                            />
                            <NepaliDatePicker
                                value={programDates.round1To}
                                onChange={(val) => setProgramDates(prev => ({...prev, round1To: val}))}
                                label="मिति सम्म (To Date)"
                            />
                        </div>
                    </div>
                    <div className="border p-4 rounded-lg bg-amber-50/20">
                        <h4 className="font-bold text-sm mb-3 font-nepali text-amber-800 border-b pb-1">२nd राउन्ड (2nd Round)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <NepaliDatePicker
                                value={programDates.round2From}
                                onChange={(val) => setProgramDates(prev => ({...prev, round2From: val}))}
                                label="मिति देखि (From Date)"
                            />
                            <NepaliDatePicker
                                value={programDates.round2To}
                                onChange={(val) => setProgramDates(prev => ({...prev, round2To: val}))}
                                label="मिति सम्म (To Date)"
                            />
                        </div>
                    </div>
                </div>
                <button onClick={saveProgramDates} className="mt-4 bg-primary-600 text-white px-4 py-2 rounded flex items-center gap-2 no-print font-nepali hover:bg-primary-700 transition-colors"><Save size={16}/> मिति सुरक्षित गर्नुहोस्</button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-3">वितरण रेकर्ड</h3>
                <div className="flex gap-4 mb-4">
                    <select onChange={(e) => setSelectedFchv(e.target.value)} className="border p-2 rounded"><option>FCHV छान्नुहोस्</option>{fchvs.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}</select>
                    <select onChange={(e) => setRound(e.target.value as '1st' | '2nd')} className="border p-2 rounded"><option value="1st">१st राउन्ड</option><option value="2nd">२nd राउन्ड</option></select>
                </div>
                
                {(() => {
                    const AGE_GROUPS_TO_RENDER = [
                        {
                            id: '6-11months',
                            title: '६-११ महिना (6-11 Months)',
                            showVitaminA: true,
                            showAlbendazole: false,
                            showMuac: true,
                        },
                        {
                            id: '12-59months',
                            title: '१२-५९ महिना (12-59 Months)',
                            showVitaminA: true,
                            showAlbendazole: false,
                            showMuac: true,
                        },
                        {
                            id: '12-23months',
                            title: '१२-२३ महिना (12-23 Months) - जुकाको औषधी (Albendazole) मात्र',
                            showVitaminA: false,
                            showAlbendazole: true,
                            showMuac: false,
                        },
                        {
                            id: '24-59months',
                            title: '२४-५९ महिना (24-59 Months) - जुकाको औषधी (Albendazole) मात्र',
                            showVitaminA: false,
                            showAlbendazole: true,
                            showMuac: false,
                        }
                    ];

                    return AGE_GROUPS_TO_RENDER.map(group => (
                        <div key={group.id} className="mb-6 border-t pt-4">
                            <h4 className="font-bold mb-3 text-sm font-nepali text-slate-800">
                                {group.title}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {group.showVitaminA && (
                                    <div className="space-y-1 bg-sky-50/50 p-3 rounded border border-sky-100">
                                        <label className="text-xs font-semibold text-sky-800 font-nepali">भिटामिन ए (Vitamin A)</label>
                                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500 font-nepali">
                                            <span>पुरुष (Male)</span><span>महिला (Female)</span><span>जम्मा (Total)</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <input type="number" placeholder="M" value={distributionData[group.id]?.maleVitaminA ?? ''} onChange={(e) => handleDataChange(group.id as any, 'maleVitaminA', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="F" value={distributionData[group.id]?.femaleVitaminA ?? ''} onChange={(e) => handleDataChange(group.id as any, 'femaleVitaminA', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="T" value={distributionData[group.id]?.totalVitaminA ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100 font-mono font-bold"/>
                                        </div>
                                    </div>
                                )}
                                
                                {group.showAlbendazole && (
                                    <div className="space-y-1 bg-amber-50/50 p-3 rounded border border-amber-100">
                                        <label className="text-xs font-semibold text-amber-800 font-nepali">जुकाको औषधी (Albendazole)</label>
                                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500 font-nepali">
                                            <span>पुरुष (Male)</span><span>महिला (Female)</span><span>जम्मा (Total)</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <input type="number" placeholder="M" value={distributionData[group.id]?.maleAlbendazole ?? ''} onChange={(e) => handleDataChange(group.id as any, 'maleAlbendazole', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="F" value={distributionData[group.id]?.femaleAlbendazole ?? ''} onChange={(e) => handleDataChange(group.id as any, 'femaleAlbendazole', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="T" value={distributionData[group.id]?.totalAlbendazole ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100 font-mono font-bold"/>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {group.showMuac && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/30 p-3 rounded border border-emerald-100/50">
                                     <div className="space-y-1">
                                        <label className="text-xs text-emerald-700 font-bold font-nepali">MUAC Green (हरियो)</label>
                                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500 font-nepali">
                                            <span>पु (M)</span><span>म (F)</span><span>जम्मा (T)</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <input type="number" placeholder="M" value={distributionData[group.id]?.maleMuacGreen ?? ''} onChange={(e) => handleDataChange(group.id as any, 'maleMuacGreen', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="F" value={distributionData[group.id]?.femaleMuacGreen ?? ''} onChange={(e) => handleDataChange(group.id as any, 'femaleMuacGreen', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="T" value={distributionData[group.id]?.totalMuacGreen ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100 font-mono font-bold"/>
                                        </div>
                                     </div>
                                     <div className="space-y-1">
                                        <label className="text-xs text-yellow-600 font-bold font-nepali">MUAC Yellow (पहेंलो)</label>
                                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500 font-nepali">
                                            <span>पु (M)</span><span>म (F)</span><span>जम्मा (T)</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <input type="number" placeholder="M" value={distributionData[group.id]?.maleMuacYellow ?? ''} onChange={(e) => handleDataChange(group.id as any, 'maleMuacYellow', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="F" value={distributionData[group.id]?.femaleMuacYellow ?? ''} onChange={(e) => handleDataChange(group.id as any, 'femaleMuacYellow', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="T" value={distributionData[group.id]?.totalMuacYellow ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100 font-mono font-bold"/>
                                        </div>
                                     </div>
                                     <div className="space-y-1">
                                        <label className="text-xs text-rose-600 font-bold font-nepali">MUAC Red (रातो)</label>
                                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-500 font-nepali">
                                            <span>पु (M)</span><span>म (F)</span><span>जम्मा (T)</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            <input type="number" placeholder="M" value={distributionData[group.id]?.maleMuacRed ?? ''} onChange={(e) => handleDataChange(group.id as any, 'maleMuacRed', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="F" value={distributionData[group.id]?.femaleMuacRed ?? ''} onChange={(e) => handleDataChange(group.id as any, 'femaleMuacRed', e.target.value)} className="border p-1 rounded text-xs bg-white font-mono"/>
                                            <input type="number" placeholder="T" value={distributionData[group.id]?.totalMuacRed ?? ''} readOnly className="border p-1 rounded text-xs bg-gray-100 font-mono font-bold"/>
                                        </div>
                                     </div>
                                </div>
                            )}
                        </div>
                    ));
                })()}

                {/* जिन्सी सामान विवरण (Inventory Details) */}
                <div className="mb-6 border-t pt-6">
                    <h4 className="font-bold mb-4 text-sm font-nepali text-slate-800 flex items-center gap-2">
                        📦 जिन्सी सामान विवरण (Inventory Stock Details)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {/* Vitamin A Stock Card */}
                        <div className="bg-white p-4 rounded border border-sky-100 shadow-sm">
                            <h5 className="font-bold text-xs text-sky-800 font-nepali mb-3 border-b pb-1">भिटामिन ए क्याप्सुल (Vitamin A Capsules)</h5>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-nepali mb-1">प्राप्त (Received)</label>
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={receivedVitaminA} 
                                        onChange={(e) => setReceivedVitaminA(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} 
                                        className="border p-2 rounded w-full text-xs font-mono focus:ring-1 focus:ring-sky-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-nepali mb-1">खर्च भएको (Spent)</label>
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={spentVitaminA} 
                                        onChange={(e) => setSpentVitaminA(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} 
                                        className="border p-2 rounded w-full text-xs font-mono focus:ring-1 focus:ring-sky-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-nepali mb-1">बाँकी (Remaining)</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={toNepaliNumber((receivedVitaminA === '' ? 0 : Number(receivedVitaminA)) - (spentVitaminA === '' ? 0 : Number(spentVitaminA)))} 
                                        className="border p-2 rounded w-full text-xs bg-slate-50 text-slate-600 font-mono font-bold outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Albendazole Stock Card */}
                        <div className="bg-white p-4 rounded border border-amber-100 shadow-sm">
                            <h5 className="font-bold text-xs text-amber-800 font-nepali mb-3 border-b pb-1">अल्बेन्डाजोल ट्याब्लेट (Albendazole Tablets)</h5>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-nepali mb-1">प्राप्त (Received)</label>
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={receivedAlbendazole} 
                                        onChange={(e) => setReceivedAlbendazole(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} 
                                        className="border p-2 rounded w-full text-xs font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-nepali mb-1">खर्च भएको (Spent)</label>
                                    <input 
                                        type="number" 
                                        placeholder="0" 
                                        value={spentAlbendazole} 
                                        onChange={(e) => setSpentAlbendazole(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} 
                                        className="border p-2 rounded w-full text-xs font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 font-nepali mb-1">बाँकी (Remaining)</label>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={toNepaliNumber((receivedAlbendazole === '' ? 0 : Number(receivedAlbendazole)) - (spentAlbendazole === '' ? 0 : Number(spentAlbendazole)))} 
                                        className="border p-2 rounded w-full text-xs bg-slate-50 text-slate-600 font-mono font-bold outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>                
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
                        <p className="text-xs text-slate-500">राउन्ड तथा स्वयंसेविका अनुसारको विस्तृत रिपोर्ट र प्रिन्ट</p>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-nepali">स्वयंसेविका:</span>
                            <select 
                                value={filterFchvId}
                                onChange={(e) => setFilterFchvId(e.target.value)}
                                className="border p-2 rounded text-sm bg-white font-nepali"
                            >
                                <option value="all">सबै स्वयंसेविका हरू (All FCHVs)</option>
                                {fchvs.map(f => (
                                    <option key={f.id} value={f.id}>{f.name} (वडा नं: {f.wardNumber})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-nepali">राउन्ड:</span>
                            <select 
                                value={reportRound} 
                                onChange={(e) => setReportRound(e.target.value as '1st' | '2nd')} 
                                className="border p-2 rounded text-sm bg-white font-nepali"
                            >
                                <option value="1st">१st राउन्ड प्रतिवेदन</option>
                                <option value="2nd">२nd राउन्ड प्रतिवेदन</option>
                            </select>
                        </div>
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
                    <div className="border-b-2 border-slate-300 pb-4 mb-6 flex items-start justify-between gap-4">
                        {/* Left side: Logo */}
                        <div className="flex-shrink-0">
                            <img 
                                src={generalSettings?.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                                alt="Logo" 
                                className="w-20 h-20 md:w-24 md:h-24 object-contain"
                            />
                        </div>
                        {/* Center: General settings headers 1, 2, 3, 4 */}
                        <div className="flex-grow text-center pr-10 md:pr-16">
                            <h1 className="text-xl font-bold font-nepali text-red-600 leading-tight">
                                {generalSettings?.orgNameNepali || activeOrgName}
                            </h1>
                            {generalSettings?.subTitleNepali && (
                                <h2 className="text-md font-semibold font-nepali mt-1 text-slate-800 leading-tight">
                                    {generalSettings.subTitleNepali}
                                </h2>
                            )}
                            {generalSettings?.subTitleNepali2 && (
                                <h3 className="text-sm font-medium font-nepali mt-1 text-slate-700 leading-tight">
                                    {generalSettings.subTitleNepali2}
                                </h3>
                            )}
                            {generalSettings?.subTitleNepali3 && (
                                <h4 className="text-xs font-normal font-nepali mt-1 text-slate-600 leading-tight">
                                    {generalSettings.subTitleNepali3}
                                </h4>
                            )}
                            {generalSettings?.subTitleNepali4 && (
                                <h5 className="text-[10px] font-normal font-nepali mt-0.5 text-slate-500 leading-tight">
                                    {generalSettings.subTitleNepali4}
                                </h5>
                            )}
                            
                            <h2 className="text-base font-bold font-nepali mt-3 border-t pt-2 text-slate-900">
                                भिटामिन ए तथा जुकाको औषधि (अल्बेन्डाजोल) वितरण प्रतिवेदन
                            </h2>
                            <p className="text-xs text-slate-600 mt-1 font-nepali">
                                आर्थिक वर्ष: {toNepaliNumber(currentFiscalYear)} | राउन्ड: {reportRound === '1st' ? 'पहिलो (1st)' : 'दोस्रो (2nd)'} | 
                                मिति: {toNepaliNumber(
                                    reportRound === '1st' 
                                        ? (programDates.round1From && programDates.round1To ? `${programDates.round1From} देखि ${programDates.round1To} सम्म` : (programDates.round1 || ''))
                                        : (programDates.round2From && programDates.round2To ? `${programDates.round2From} देखि ${programDates.round2To} सम्म` : (programDates.round2 || ''))
                                )}
                                {filterFchvId !== 'all' && ` | स्वयंसेविका: ${fchvs.find(f => f.id === filterFchvId)?.name} (वडा नं: ${toNepaliNumber(fchvs.find(f => f.id === filterFchvId)?.wardNumber || '')})`}
                            </p>
                        </div>
                    </div>

                    {/* Target Stats Summary */}
                    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center print:border print:p-3 print:rounded print:mb-4">
                        <div className="p-3 bg-slate-50 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-500 font-nepali">६-११ महिना लक्ष्य</span>
                            <span className="text-sm font-bold font-mono">{toNepaliNumber(targets.target6to11Months || 0)}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-500 font-nepali">१२-२३ महिना लक्ष्य</span>
                            <span className="text-sm font-bold font-mono">{toNepaliNumber(targets.target12to23Months || 0)}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-500 font-nepali">२४-५९ महिना लक्ष्य</span>
                            <span className="text-sm font-bold font-mono">{toNepaliNumber(targets.target24to59Months || 0)}</span>
                        </div>
                        <div className="p-3 bg-slate-100 rounded border print:border-none print:bg-transparent">
                            <span className="block text-xs text-slate-600 font-nepali font-bold">१२-५९ महिना जम्मा लक्ष्य</span>
                            <span className="text-sm font-bold font-mono text-slate-900">{toNepaliNumber(targets.target12to59Months || 0)}</span>
                        </div>
                    </div>

                    {/* Table 1: Vitamin A & Albendazole Distribution */}
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-700 font-nepali mb-3 print:text-xs">१. भिटामिन ए र जुकाको औषधी (अल्बेन्डाजोल) वितरण विवरण</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse print-table">
                                <thead className="bg-slate-100 text-slate-700 border font-bold font-nepali">
                                    <tr>
                                        <th className="border p-2 text-center" rowSpan={2}>क्र.सं.</th>
                                        <th className="border p-2" rowSpan={2}>स्वयंसेविकाको नाम</th>
                                        <th className="border p-2 text-center" rowSpan={2}>वडा नं</th>
                                        <th className="border p-2 text-center" colSpan={3}>भिटामिन ए (६-११ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>भिटामिन ए (१२-५९ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>जुकाको औषधी (१२-२३ महिना)</th>
                                        <th className="border p-2 text-center" colSpan={3}>जुकाको औषधी (२४-५९ महिना)</th>
                                        <th className="border p-2 text-center col-total" colSpan={3}>जुकाको औषधी जम्मा (१२-५९ महिना)</th>
                                        <th className="border p-2 text-center bg-sky-50 text-sky-900" colSpan={3}>भिटामिन ए जिन्सी (Vit A Stock)</th>
                                        <th className="border p-2 text-center bg-amber-50 text-amber-900" colSpan={3}>अल्बेन्डाजोल जिन्सी (Alb Stock)</th>
                                    </tr>
                                    <tr>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800 font-bold">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800 font-bold">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800 font-bold">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800 font-bold">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600 col-total">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600 col-total">म</th><th className="border p-1 text-center bg-slate-300 text-slate-900 font-black col-total">जम्मा</th>
                                        <th className="border p-1 text-center bg-sky-50 text-sky-800">प्राप्त</th><th className="border p-1 text-center bg-sky-50 text-sky-800">खर्च</th><th className="border p-1 text-center bg-sky-200 text-sky-900 font-bold">बाँकी</th>
                                        <th className="border p-1 text-center bg-amber-50 text-amber-800">प्राप्त</th><th className="border p-1 text-center bg-amber-50 text-amber-800">खर्च</th><th className="border p-1 text-center bg-amber-200 text-amber-900 font-bold">बाँकी</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleFchvs.map((fchv, idx) => {
                                        const rec = allRecords.find(r => r.fchvId === fchv.id && r.round === reportRound);
                                        
                                        // Calculations for row level values
                                        const alb12_m = rec?.data?.['12-23months']?.maleAlbendazole || 0;
                                        const alb12_f = rec?.data?.['12-23months']?.femaleAlbendazole || 0;
                                        const alb12_t = rec?.data?.['12-23months']?.totalAlbendazole || (alb12_m + alb12_f);

                                        const alb24_m = rec?.data?.['24-59months']?.maleAlbendazole || 0;
                                        const alb24_f = rec?.data?.['24-59months']?.femaleAlbendazole || 0;
                                        const alb24_t = rec?.data?.['24-59months']?.totalAlbendazole || (alb24_m + alb24_f);

                                        let alb59_m = alb12_m + alb24_m;
                                        let alb59_f = alb12_f + alb24_f;
                                        let alb59_t = alb12_t + alb24_t;

                                        if (alb59_m === 0 && alb59_f === 0 && rec?.data?.['12-59months']?.totalAlbendazole) {
                                            alb59_m = rec.data['12-59months'].maleAlbendazole || 0;
                                            alb59_f = rec.data['12-59months'].femaleAlbendazole || 0;
                                            alb59_t = rec.data['12-59months'].totalAlbendazole || 0;
                                        }

                                        const v_rec = rec?.inventory?.receivedVitaminA || 0;
                                        const v_sp = rec?.inventory?.spentVitaminA || 0;
                                        const v_rem = v_rec - v_sp;

                                        const a_rec = rec?.inventory?.receivedAlbendazole || 0;
                                        const a_sp = rec?.inventory?.spentAlbendazole || 0;
                                        const a_rem = a_rec - a_sp;

                                        return (
                                            <tr key={fchv.id} className="border hover:bg-slate-50 transition-colors">
                                                <td className="border p-2 text-center">{toNepaliNumber(idx + 1)}</td>
                                                <td className="border p-2 font-medium">{fchv.name}</td>
                                                <td className="border p-2 text-center font-mono">{toNepaliNumber(fchv.wardNumber)}</td>
                                                
                                                {/* 6-11m Vit A */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(rec?.data?.['6-11months']?.maleVitaminA || 0)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(rec?.data?.['6-11months']?.femaleVitaminA || 0)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(rec?.data?.['6-11months']?.totalVitaminA || 0)}</td>
 
                                                {/* 12-59m Vit A */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(rec?.data?.['12-59months']?.maleVitaminA || 0)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(rec?.data?.['12-59months']?.femaleVitaminA || 0)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(rec?.data?.['12-59months']?.totalVitaminA || 0)}</td>
 
                                                {/* 12-23m Albendazole */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(alb12_m)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(alb12_f)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(alb12_t)}</td>

                                                {/* 24-59m Albendazole */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(alb24_m)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(alb24_f)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(alb24_t)}</td>

                                                {/* 12-59m Albendazole Total */}
                                                <td className="border p-1 text-center font-mono col-total">{toNepaliNumber(alb59_m)}</td>
                                                <td className="border p-1 text-center font-mono col-total">{toNepaliNumber(alb59_f)}</td>
                                                <td className="border p-1 text-center font-mono font-black bg-slate-100 col-total">{toNepaliNumber(alb59_t)}</td>

                                                {/* Vit A Stock */}
                                                <td className="border p-1 text-center font-mono bg-sky-50/20">{toNepaliNumber(v_rec)}</td>
                                                <td className="border p-1 text-center font-mono bg-sky-50/20">{toNepaliNumber(v_sp)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-sky-100/30">{toNepaliNumber(v_rem)}</td>

                                                {/* Albendazole Stock */}
                                                <td className="border p-1 text-center font-mono bg-amber-50/20">{toNepaliNumber(a_rec)}</td>
                                                <td className="border p-1 text-center font-mono bg-amber-50/20">{toNepaliNumber(a_sp)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-amber-100/30">{toNepaliNumber(a_rem)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Grand Total Row */}
                                    <tr className="border bg-slate-100 font-bold">
                                        <td className="border p-2 text-center" colSpan={3}>कुल जम्मा (Grand Total)</td>
                                        
                                        {/* 6-11m Vit A Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.v6_11_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.v6_11_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black">{toNepaliNumber(totals.v6_11_t)}</td>
 
                                        {/* 12-59m Vit A Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.v12_59_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.v12_59_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black">{toNepaliNumber(totals.v12_59_t)}</td>
 
                                        {/* 12-23m Albendazole Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.a12_23_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.a12_23_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-slate-200/50">{toNepaliNumber(totals.a12_23_t)}</td>

                                        {/* 24-59m Albendazole Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.a24_59_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.a24_59_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-slate-200/50">{toNepaliNumber(totals.a24_59_t)}</td>

                                        {/* 12-59m Albendazole Total */}
                                        <td className="border p-1 text-center font-mono col-total">{toNepaliNumber(totals.a12_59_m)}</td>
                                        <td className="border p-1 text-center font-mono col-total">{toNepaliNumber(totals.a12_59_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-slate-300/80 col-total">{toNepaliNumber(totals.a12_59_t)}</td>

                                        {/* Vit A Stock Totals */}
                                        <td className="border p-1 text-center font-mono bg-sky-50/60">{toNepaliNumber(totals.inv_v_rec)}</td>
                                        <td className="border p-1 text-center font-mono bg-sky-50/60">{toNepaliNumber(totals.inv_v_sp)}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-sky-200/50">{toNepaliNumber(totals.inv_v_rem)}</td>

                                        {/* Albendazole Stock Totals */}
                                        <td className="border p-1 text-center font-mono bg-amber-50/60">{toNepaliNumber(totals.inv_a_rec)}</td>
                                        <td className="border p-1 text-center font-mono bg-amber-50/60">{toNepaliNumber(totals.inv_a_sp)}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-amber-200/50">{toNepaliNumber(totals.inv_a_rem)}</td>
                                    </tr>
                                    {/* Progress Percentage Row */}
                                    <tr className="border bg-slate-50 font-bold text-slate-700">
                                        <td className="border p-2 text-center" colSpan={3}>प्रगति प्रतिशत (Progress %)</td>
                                        
                                        {/* 6-11m Vit A Percentage */}
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono font-black text-blue-700 bg-blue-50/50">
                                            {toNepaliNumber(targets.target6to11Months > 0 ? ((totals.v6_11_t / targets.target6to11Months) * 100).toFixed(2) : '0.00')}%
                                        </td>

                                        {/* 12-59m Vit A Percentage */}
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono font-black text-blue-700 bg-blue-50/50">
                                            {toNepaliNumber(targets.target12to59Months > 0 ? ((totals.v12_59_t / targets.target12to59Months) * 100).toFixed(2) : '0.00')}%
                                        </td>

                                        {/* 12-23m Albendazole Percentage */}
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono font-black text-amber-700 bg-amber-50/50">
                                            {toNepaliNumber(targets.target12to23Months > 0 ? ((totals.a12_23_t / targets.target12to23Months) * 100).toFixed(2) : '0.00')}%
                                        </td>

                                        {/* 24-59m Albendazole Percentage */}
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono font-black text-amber-700 bg-amber-50/50">
                                            {toNepaliNumber(targets.target24to59Months > 0 ? ((totals.a24_59_t / targets.target24to59Months) * 100).toFixed(2) : '0.00')}%
                                        </td>

                                        {/* 12-59m Albendazole Total Percentage */}
                                        <td className="border p-1 text-center font-mono col-total text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono col-total text-slate-400">-</td>
                                        <td className="border p-1 text-center font-mono font-black text-emerald-800 bg-emerald-50/80 col-total">
                                            {toNepaliNumber(targets.target12to59Months > 0 ? ((totals.a12_59_t / targets.target12to59Months) * 100).toFixed(2) : '0.00')}%
                                        </td>

                                        {/* Vit A Stock Progress */}
                                        <td className="border p-1 text-center font-mono text-slate-400 bg-sky-50/20">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400 bg-sky-50/20">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400 bg-sky-100/20">-</td>

                                        {/* Albendazole Stock Progress */}
                                        <td className="border p-1 text-center font-mono text-slate-400 bg-amber-50/20">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400 bg-amber-50/20">-</td>
                                        <td className="border p-1 text-center font-mono text-slate-400 bg-amber-100/20">-</td>
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
                                <thead className="bg-slate-100 text-slate-700 border font-bold font-nepali">
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
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800">जम्मा</th>
                                        <th className="border p-1 text-center bg-slate-50 text-slate-600">पु</th><th className="border p-1 text-center bg-slate-50 text-slate-600">म</th><th className="border p-1 text-center bg-slate-200 text-slate-800">जम्मा</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleFchvs.map((fchv, idx) => {
                                        const rec = allRecords.find(r => r.fchvId === fchv.id && r.round === reportRound);
                                        
                                        // Calculate sums across age groups
                                        const greenM = (rec?.data?.['6-11months']?.maleMuacGreen || 0) + (rec?.data?.['12-59months']?.maleMuacGreen || 0);
                                        const greenF = (rec?.data?.['6-11months']?.femaleMuacGreen || 0) + (rec?.data?.['12-59months']?.femaleMuacGreen || 0);
                                        const greenT = greenM + greenF;

                                        const yellowM = (rec?.data?.['6-11months']?.maleMuacYellow || 0) + (rec?.data?.['12-59months']?.maleMuacYellow || 0);
                                        const yellowF = (rec?.data?.['6-11months']?.femaleMuacYellow || 0) + (rec?.data?.['12-59months']?.femaleMuacYellow || 0);
                                        const yellowT = yellowM + yellowF;

                                        const redM = (rec?.data?.['6-11months']?.maleMuacRed || 0) + (rec?.data?.['12-59months']?.maleMuacRed || 0);
                                        const redF = (rec?.data?.['6-11months']?.femaleMuacRed || 0) + (rec?.data?.['12-59months']?.femaleMuacRed || 0);
                                        const redT = redM + redF;

                                        const totalM = greenM + yellowM + redM;
                                        const totalF = greenF + yellowF + redF;
                                        const totalT = totalM + totalF;

                                        return (
                                            <tr key={fchv.id} className="border hover:bg-slate-50 transition-colors">
                                                <td className="border p-2 text-center">{toNepaliNumber(idx + 1)}</td>
                                                <td className="border p-2 font-medium">{fchv.name}</td>
                                                <td className="border p-2 text-center font-mono">{toNepaliNumber(fchv.wardNumber)}</td>
                                                
                                                {/* Green */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(greenM)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(greenF)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(greenT)}</td>

                                                {/* Yellow */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(yellowM)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(yellowF)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(yellowT)}</td>

                                                {/* Red */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(redM)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(redF)}</td>
                                                <td className="border p-1 text-center font-mono font-bold bg-slate-50/50">{toNepaliNumber(redT)}</td>

                                                {/* Total Screened */}
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(totalM)}</td>
                                                <td className="border p-1 text-center font-mono">{toNepaliNumber(totalF)}</td>
                                                <td className="border p-1 text-center font-mono font-black bg-slate-100">{toNepaliNumber(totalT)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Grand Total Row */}
                                    <tr className="border bg-slate-100 font-bold">
                                        <td className="border p-2 text-center" colSpan={3}>कुल जम्मा (Grand Total)</td>
                                        
                                        {/* Green Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.g_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.g_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black">{toNepaliNumber(totals.g_t)}</td>

                                        {/* Yellow Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.y_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.y_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black">{toNepaliNumber(totals.y_t)}</td>

                                        {/* Red Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.r_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.r_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black">{toNepaliNumber(totals.r_t)}</td>

                                        {/* Grand Screened Total */}
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.tot_m)}</td>
                                        <td className="border p-1 text-center font-mono">{toNepaliNumber(totals.tot_f)}</td>
                                        <td className="border p-1 text-center font-mono font-black bg-slate-200">{toNepaliNumber(totals.tot_t)}</td>
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
