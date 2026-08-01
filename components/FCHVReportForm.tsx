import React, { useState, useEffect } from 'react';
import { FCHVReport } from '../types/fchvTypes';
import { FCHV } from '../types/vitaminATypes';
import { Save, ClipboardList, AlertCircle } from 'lucide-react';
import { db } from '../firestore';
import { collection, doc, setDoc, getDocs, query, where, addDoc, updateDoc } from 'firebase/firestore';

interface FCHVReportFormProps {
    safeOrgName: string;
    fiscalYear: string;
    fchvs: FCHV[];
    onSaved: () => void;
}

const MONTHS = [
    { id: '04', name: 'साउन' },
    { id: '05', name: 'भदौ' },
    { id: '06', name: 'असोज' },
    { id: '07', name: 'कात्तिक' },
    { id: '08', name: 'मंसिर' },
    { id: '09', name: 'पुस' },
    { id: '10', name: 'माघ' },
    { id: '11', name: 'फागुन' },
    { id: '12', name: 'चैत' },
    { id: '01', name: 'वैशाख' },
    { id: '02', name: 'जेठ' },
    { id: '03', name: 'असार' },
];

export const FCHVReportForm: React.FC<FCHVReportFormProps> = ({ safeOrgName, fiscalYear, fchvs, onSaved }) => {
    const [selectedFchvId, setSelectedFchvId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [existingReportId, setExistingReportId] = useState<string | null>(null);

    const initialData: Omit<FCHVReport, 'id' | 'fchvId' | 'fiscalYear' | 'month' | 'createdAt' | 'updatedAt'> = {
        safeMotherhood: {
            amaGroupMeeting: 0,
            pregnantMet: 0,
            ironDistribution: 0,
            homeDelivery: {
                misoprostolEnsured: 0,
                liveBirth: 0,
                stillBirth: 0,
                asphyxiaManagement: 0,
                skinToSkin: 0,
                chlorhexidine: 0,
                breastfeeding1Hr: 0,
                lowBirthWeight: 0,
                veryLowBirthWeight: 0,
                checkup24Hr: 0,
                checkup3rdDay: 0,
                checkup7thDay: 0,
            },
            vitADistributionPostnatal: 0,
            condomDistribution: 0,
            pillsDistribution: 0,
            ecpDose: 0,
            ecpWomen: 0,
        },
        maternalDeath: {
            pregnancy: 0,
            delivery: 0,
            postnatal: 0,
        },
        imnci: {
            under2Months: {
                u28Days: 0,
                d29_59Days: 0,
            },
            m2_59Months: {
                respiratoryTotal: 0,
                noPneumonia: 0,
                diarrhea: 0,
                treatedOrsZinc: 0,
                orsUsed: 0,
                zincUsed: 0,
            },
            death: {
                d0_7Days: 0,
                d8_28Days: 0,
                d29_59Days: 0,
                m2_11Months: 0,
                m12_59Months: 0,
            },
        },
        imam: {
            muac: {
                green: 0,
                yellow: 0,
                red: 0,
                edema: 0,
            },
            followUp: {
                recoveredSAM: 0,
                noWeightGainSAM: 0,
                droppedOutSAM: 0,
            },
        },
    };

    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        if (selectedFchvId && selectedMonth) {
            const fetchExisting = async () => {
                const q = query(
                    collection(db, 'orgData', safeOrgName, 'fchvReports'),
                    where('fchvId', '==', selectedFchvId),
                    where('fiscalYear', '==', fiscalYear),
                    where('month', '==', selectedMonth)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docData = snapshot.docs[0].data() as FCHVReport;
                    setExistingReportId(snapshot.docs[0].id);
                    // Merge with initialData to handle schema updates
                    setFormData({
                        ...initialData,
                        ...docData
                    });
                } else {
                    setExistingReportId(null);
                    setFormData(initialData);
                }
            };
            fetchExisting();
        }
    }, [selectedFchvId, selectedMonth, safeOrgName, fiscalYear]);

    const handleNumberChange = (path: string, val: string) => {
        const num = parseInt(val) || 0;
        const keys = path.split('.');
        setFormData(prev => {
            const newData = JSON.parse(JSON.stringify(prev));
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = num;
            return newData;
        });
    };

    const handleSave = async () => {
        if (!selectedFchvId || !selectedMonth) {
            alert('कृपया स्वयंसेविका र महिना छान्नुहोस्');
            return;
        }

        setIsSaving(true);
        try {
            const reportData = {
                ...formData,
                fchvId: selectedFchvId,
                fiscalYear: fiscalYear,
                month: selectedMonth,
                updatedAt: Date.now()
            };

            if (existingReportId) {
                await updateDoc(doc(db, 'orgData', safeOrgName, 'fchvReports', existingReportId), reportData);
                alert('रिपोर्ट अपडेट गरियो');
            } else {
                await addDoc(collection(db, 'orgData', safeOrgName, 'fchvReports'), {
                    ...reportData,
                    createdAt: Date.now()
                });
                alert('रिपोर्ट सुरक्षित गरियो');
            }
            onSaved();
        } catch (error) {
            console.error("Error saving FCHV report:", error);
            alert('डाटा सुरक्षित गर्न सकिएन');
        } finally {
            setIsSaving(false);
        }
    };

    const InputRow = ({ label, path, unit }: { label: string; path: string; unit?: string }) => {
        const keys = path.split('.');
        let val: any = formData;
        for (const key of keys) val = val?.[key];
        
        return (
            <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 gap-4">
                <span className="text-sm text-slate-700 font-nepali flex-1">{label}</span>
                <div className="flex items-center gap-2">
                    {unit && <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>}
                    <input 
                        type="number"
                        min="0"
                        value={val || 0}
                        onChange={e => handleNumberChange(path, e.target.value)}
                        className="w-20 border border-slate-200 rounded-lg p-1.5 text-center focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        onFocus={e => e.target.select()}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">स्वयंसेविका छान्नुहोस्</label>
                    <select 
                        value={selectedFchvId} 
                        onChange={e => setSelectedFchvId(e.target.value)}
                        className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                        <option value="">छान्नुहोस्</option>
                        {fchvs.map(f => <option key={f.id} value={f.id}>{f.name} (वडा नं {f.wardNumber})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">आर्थिक वर्ष</label>
                    <input type="text" value={fiscalYear} readOnly className="w-full border p-2.5 rounded-lg bg-slate-50 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">महिना छान्नुहोस्</label>
                    <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                        <option value="">छान्नुहोस्</option>
                        {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div className="flex items-end">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !selectedFchvId || !selectedMonth}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? 'सुरक्षित हुँदै...' : <><Save size={18} /> सुरक्षित गर्नुहोस्</>}
                    </button>
                </div>
            </div>

            {!selectedFchvId || !selectedMonth ? (
                <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center text-amber-700 flex flex-col items-center gap-3">
                    <AlertCircle size={32} />
                    <p className="font-nepali font-bold">कृपया माथिबाट स्वयंसेविका र महिना छान्नुहोस्।</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
                    {/* Section 1: SM/FP */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-slate-50 px-6 py-4 border-b flex items-center gap-2">
                            <ClipboardList size={18} className="text-indigo-600" />
                            <h3 className="font-bold text-slate-800 font-nepali">१. सुरक्षित मातृत्व/ परिवार नियोजन कार्यक्रम</h3>
                        </div>
                        <div className="p-6 space-y-2 flex-1">
                            <InputRow label="आमा समुहको बैठक बसेको" path="safeMotherhood.amaGroupMeeting" unit="पटक" />
                            <InputRow label="गर्भवती महिलालाई भेट गरेको" path="safeMotherhood.pregnantMet" unit="जना" />
                            <InputRow label="गर्भवती महिलालाई आईरन चक्की वितरण" path="safeMotherhood.ironDistribution" unit="जना" />
                            
                            <div className="pt-4 pb-2">
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">घरमा प्रसूति</span>
                            </div>
                            <InputRow label="मातृ सुरक्षा चक्की (Misoprostol) खाएको सुनिश्चित" path="safeMotherhood.homeDelivery.misoprostolEnsured" unit="जना" />
                            <InputRow label="जीवित जन्म भएका शिशु" path="safeMotherhood.homeDelivery.liveBirth" unit="जना" />
                            <InputRow label="मृत जन्म भएका शिशु" path="safeMotherhood.homeDelivery.stillBirth" unit="जना" />
                            <InputRow label="निसास्सीएको नवजात शिशुको व्यवस्थापन" path="safeMotherhood.homeDelivery.asphyxiaManagement" unit="जना" />
                            <InputRow label="जन्मने बित्तिकै आमाको छातीसंग टासेर राखेको" path="safeMotherhood.homeDelivery.skinToSkin" unit="जना" />
                            <InputRow label="नाभीमा नाभिमलम (Chlorhexidine) लगाइएका शिशु" path="safeMotherhood.homeDelivery.chlorhexidine" unit="जना" />
                            <InputRow label="जन्मेको १ घण्टाभित्र स्तनपान गराएको" path="safeMotherhood.homeDelivery.breastfeeding1Hr" unit="जना" />
                            <InputRow label="कम जन्म तौल भएका शिशु (१.५ - < २.५ केजी)" path="safeMotherhood.homeDelivery.lowBirthWeight" unit="जना" />
                            <InputRow label="धेरै कम जन्म तौल भएका शिशु (< १.५ केजी)" path="safeMotherhood.homeDelivery.veryLowBirthWeight" unit="जना" />
                            
                            <div className="pt-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">नवजात शिशु र सुत्केरी महिलालाई जाँच भेट गरेको:</span>
                                <InputRow label="जन्मेको २४ घण्टा भित्र" path="safeMotherhood.homeDelivery.checkup24Hr" unit="जना" />
                                <InputRow label="जन्मेको तेस्रो दिन" path="safeMotherhood.homeDelivery.checkup3rdDay" unit="जना" />
                                <InputRow label="जन्मेको सातौ दिन" path="safeMotherhood.homeDelivery.checkup7thDay" unit="जना" />
                            </div>

                            <div className="pt-4 border-t mt-4">
                                <InputRow label="भिटामिन ए वितरण गरिएका सुत्केरी महिला" path="safeMotherhood.vitADistributionPostnatal" unit="जना" />
                                <InputRow label="कण्डम वितरण गरेको" path="safeMotherhood.condomDistribution" unit="गोटा" />
                                <InputRow label="पिल्स वितरण गरेको" path="safeMotherhood.pillsDistribution" unit="साईकल" />
                                <InputRow label="आकस्मिक गर्भनिरोधक चक्की (ECP) वितरण डोज" path="safeMotherhood.ecpDose" unit="डोज" />
                                <InputRow label="ECP वितरण गरिएका महिलाको संख्या" path="safeMotherhood.ecpWomen" unit="जना" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Section 2: Maternal Death */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-rose-50 px-6 py-4 border-b flex items-center gap-2">
                                <AlertCircle size={18} className="text-rose-600" />
                                <h3 className="font-bold text-slate-800 font-nepali">२. मातृ मृत्यु (स्वास्थ्य संस्था बाहेक)</h3>
                            </div>
                            <div className="p-6 space-y-2">
                                <InputRow label="गर्भावस्था" path="maternalDeath.pregnancy" unit="जना" />
                                <InputRow label="प्रसुती अवस्था" path="maternalDeath.delivery" unit="जना" />
                                <InputRow label="सुत्केरी अवस्था" path="maternalDeath.postnatal" unit="जना" />
                            </div>
                        </div>

                        {/* Section 3: IMNCI */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-sky-50 px-6 py-4 border-b flex items-center gap-2">
                                <ClipboardList size={18} className="text-sky-600" />
                                <h3 className="font-bold text-slate-800 font-nepali">३. नवशिशु तथा बालरोगको एकीकृत व्यवस्थापन (IMNCI)</h3>
                            </div>
                            <div className="p-6 space-y-2">
                                <div className="pb-2">
                                    <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">२ महिना भन्दा कम (उमेर)</span>
                                </div>
                                <InputRow label="≤ २८ दिन" path="imnci.under2Months.u28Days" unit="जना" />
                                <InputRow label="२९-५९ दिन" path="imnci.under2Months.d29_59Days" unit="जना" />
                                
                                <div className="pt-4 pb-2 border-t mt-4">
                                    <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">२-५९ महिना</span>
                                </div>
                                <InputRow label="स्वासप्रस्वास रोगका जम्मा बिरामी" path="imnci.m2_59Months.respiratoryTotal" unit="जना" />
                                <InputRow label="निमोनिया नभएका बिरामी" path="imnci.m2_59Months.noPneumonia" unit="जना" />
                                <InputRow label="झाडापखाला भएका बिरामी" path="imnci.m2_59Months.diarrhea" unit="जना" />
                                <InputRow label="ओ.आर.एस. र जिंक चक्कीबाट उपचार" path="imnci.m2_59Months.treatedOrsZinc" unit="जना" />
                                <InputRow label="ओ.आर.एस. खर्च" path="imnci.m2_59Months.orsUsed" unit="पुरिया" />
                                <InputRow label="जिंक चक्की खर्च" path="imnci.m2_59Months.zincUsed" unit="चक्की" />

                                <div className="pt-4 pb-2 border-t mt-4">
                                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider text-right">मृत्यु</span>
                                </div>
                                <InputRow label="०-७ दिन" path="imnci.death.d0_7Days" unit="जना" />
                                <InputRow label="८-२८ दिन" path="imnci.death.d8_28Days" unit="जना" />
                                <InputRow label="२९-५९ दिन" path="imnci.death.d29_59Days" unit="जना" />
                                <InputRow label="२-११ महिना" path="imnci.death.m2_11Months" unit="जना" />
                                <InputRow label="१२-५९ महिना" path="imnci.death.m12_59Months" unit="जना" />
                            </div>
                        </div>

                        {/* Section 4: IMAM */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-green-50 px-6 py-4 border-b flex items-center gap-2">
                                <ClipboardList size={18} className="text-green-600" />
                                <h3 className="font-bold text-slate-800 font-nepali">४. शिघ्र कुपोषणको एकीकृत व्यवस्थापन (IMAM)</h3>
                            </div>
                            <div className="p-6 space-y-2">
                                <div className="pb-2">
                                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider">एम.यु.ए.सी. (MUAC) छनौट</span>
                                </div>
                                <InputRow label="हरियो (ह्रष्टपुष्ट)" path="imam.muac.green" unit="जना" />
                                <InputRow label="पहेलो (मध्यम शिघ्र कुपोषण)" path="imam.muac.yellow" unit="जना" />
                                <InputRow label="रातो (कडा शिघ्र कुपोषण)" path="imam.muac.red" unit="जना" />
                                <InputRow label="फुकेनास (Edema)" path="imam.muac.edema" unit="जना" />
                                
                                <div className="pt-4 pb-2 border-t mt-4">
                                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider">घरधुरी भेट र आनुगमन (Red Cases Only)</span>
                                </div>
                                <InputRow label="उपचार पछि निको भएको" path="imam.followUp.recoveredSAM" unit="जना" />
                                <InputRow label="उपचार गर्दा गर्दै तौल वृद्धि नभएको" path="imam.followUp.noWeightGainSAM" unit="जना" />
                                <InputRow label="उपचार गर्दा गर्दै स्वास्थ्य संस्था जान छाडेको" path="imam.followUp.droppedOutSAM" unit="जना" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
