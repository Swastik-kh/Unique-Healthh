import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref as dbRef, onValue, set, push } from "firebase/database";
import { FileText, Settings, X, Plus } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { Option } from '../types/coreTypes';

interface Mapping {
    disease: string;
    alias: string;
}

interface DHISReportProps {
    currentFiscalYear: string;
    currentUser: any;
}

export const DHISReport: React.FC<DHISReportProps> = ({ currentFiscalYear, currentUser }) => {
    const [uploadMonth, setUploadMonth] = useState('');
    const [reportMonth, setReportMonth] = useState('');
    const [selectedDataset, setSelectedDataset] = useState<'progress' | 'vaccination' | 'report'>('progress');
    const [showSettings, setShowSettings] = useState(false);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [newMapping, setNewMapping] = useState<Mapping>({ disease: '', alias: '' });
    
    // Form states
    const [progressReport, setProgressReport] = useState({
        ageGroups: {
            '०-९': { maleNew: 0, femaleNew: 0, maleTotal: 0, femaleTotal: 0, maleReferred: 0, femaleReferred: 0 },
            '१०-१४': { maleNew: 0, femaleNew: 0, maleTotal: 0, femaleTotal: 0, maleReferred: 0, femaleReferred: 0 },
            '१५-१९': { maleNew: 0, femaleNew: 0, maleTotal: 0, femaleTotal: 0, maleReferred: 0, femaleReferred: 0 },
            '२०-५९': { maleNew: 0, femaleNew: 0, maleTotal: 0, femaleTotal: 0, maleReferred: 0, femaleReferred: 0 },
            '६०-६९': { maleNew: 0, femaleNew: 0, maleTotal: 0, femaleTotal: 0, maleReferred: 0, femaleReferred: 0 },
            '>= ७०': { maleNew: 0, femaleNew: 0, maleTotal: 0, femaleTotal: 0, maleReferred: 0, femaleReferred: 0 },
        },
        healthLocations: {
            'गाउँघर क्लिनिक': { expected: 0, actual: 0, totalService: 0 },
            'खोप क्लिनिक': { expected: 0, actual: 0, totalService: 0 },
            'खोप सेसन': { expected: 0, actual: 0, totalService: 0 },
            'सरसफाई सेसन (पटक)': { expected: 0, actual: 0, totalService: 0 },
            'म.स्वा.स्व.से.': { expected: 0, actual: 0, totalService: 0 },
        }
    });

    const [vaccinationReport, setVaccinationReport] = useState({
        rows: ['खोप पाएका बच्चाहरुको संख्या', 'यस महिनामा प्राप्त भएको', 'खोप दिन खोलिएको', 'अन्य कारणले बिग्रेको', 'फिर्ता'],
        columns: ['BCG', 'Rota1', 'Rota2', 'OPV1', 'OPV2', 'OPV3', 'FIPV1', 'FIPV2', 'PCV1', 'PCV2', 'PCV3', 'DPT1', 'DPT2', 'DPT3', 'MR1', 'MR2', 'JE', 'TCV', 'HPV1', 'HPV2'],
        data: {} as Record<string, Record<string, number>>
    });

    // Known diseases for the searchable select (based on the image provided)
    const diseaseOptions: Option[] = [
        { id: '1F03', label: 'Measles', value: '1F03' },
        { id: '1C17', label: 'Diptheria', value: '1C17' },
        { id: '1C12', label: 'Whooping Cough', value: '1C12' },
        { id: '1C15', label: 'Neonatal Tetanus', value: '1C15' },
        { id: '1C13', label: 'Tetanus', value: '1C13' },
        { id: '1B1Z', label: 'Tuberculosis', value: '1B1Z' },
        { id: 'MB56', label: 'Acute Flaccid Paralysis (AFP)', value: 'MB56' },
        { id: '1F02', label: 'Rubella', value: '1F02' },
        { id: '1D80', label: 'Mumps', value: '1D80' },
        { id: '1E90.0', label: 'Chicken Pox', value: '1E90.0' },
        { id: '1E51.0Z', label: 'Hepatitis B', value: '1E51.0Z' },
    ];

    const saveMapping = async () => {
        if (!newMapping.disease || !newMapping.alias) return;
        const updatedMappings = [...mappings, newMapping];
        await set(dbRef(db, `orgData/${safeOrgName}/dhisMappings`), updatedMappings);
        setMappings(updatedMappings);
        setNewMapping({ disease: '', alias: '' });
    };

    const safeOrgName = currentUser?.organizationName?.trim().replace(/[.#$[\\]]/g, "_") || "unknown";

    useEffect(() => {
        const mappingsRef = dbRef(db, `orgData/${safeOrgName}/dhisMappings`);
        onValue(mappingsRef, (snap) => {
            if (snap.exists()) {
                setMappings(Object.values(snap.val()));
            }
        });
    }, [safeOrgName]);

    const handleSave = async () => {
        if (!uploadMonth) {
            alert('कृपया महिना छान्नुहोस्।');
            return;
        }

        try {
            await push(dbRef(db, `orgData/${safeOrgName}/dhisReports/${currentFiscalYear}/${uploadMonth}`), {
                progressReport,
                vaccinationReport,
                uploadedAt: new Date().toISOString()
            });

            alert(`${uploadMonth} को लागि रिपोर्ट सुरक्षित गरियो।`);
            setActiveTab('report');
            setReportMonth(uploadMonth);
        } catch (error) {
            console.error("Save error details:", error);
            alert("सेभ गर्दा त्रुटि भयो: " + (error instanceof Error ? error.message : "अज्ञात त्रुटि"));
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 font-nepali">DHIS सामान्य रिपोर्ट (General DHIS Report) - {currentFiscalYear}</h2>
                <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                    <Settings size={20} />
                </button>
            </div>

            {showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-lg">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-bold">रोग म्यापिङ (Disease Mapping)</h3>
                            <button onClick={() => setShowSettings(false)}><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            {mappings.map((m, i) => <div key={i} className="flex justify-between text-sm"><span>{m.disease}</span> <span>➜</span> <span>{m.alias}</span></div>)}
                            <div className="grid grid-cols-1 gap-2">
                                <SearchableSelect 
                                    label="अपलोड गरिएको नाम"
                                    options={diseaseOptions}
                                    value={newMapping.disease}
                                    onChange={(v) => setNewMapping({...newMapping, disease: v})}
                                />
                                <SearchableSelect 
                                    label="रिपोर्टको नाम (वा टाइप गर्नुहोस्)"
                                    options={diseaseOptions}
                                    value={newMapping.alias}
                                    onChange={(v) => setNewMapping({...newMapping, alias: v})}
                                />
                            </div>
                            <button onClick={saveMapping} className="w-full bg-indigo-600 text-white py-2 rounded font-bold">Save Mapping</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm text-slate-600 mb-1">महिना छान्नुहोस्</label>
                    <select 
                        value={uploadMonth} 
                        onChange={(e) => setUploadMonth(e.target.value)}
                        className="w-full border rounded-lg p-2"
                    >
                        <option value="">महिना छान्नुहोस्</option>
                        {['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'].map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-slate-600 mb-1">डाटासेट छान्नुहोस् (Dataset)</label>
                    <select 
                        value={selectedDataset} 
                        onChange={(e) => setSelectedDataset(e.target.value as any)}
                        className="w-full border rounded-lg p-2"
                    >
                        <option value="progress">मासिक प्रगती (Progress)</option>
                        <option value="vaccination">खोप कार्यक्रम (Vaccination)</option>
                        <option value="report">रिपोर्ट (Report)</option>
                    </select>
                </div>
            </div>

            {selectedDataset === 'progress' && (
                <div className="p-4 bg-white rounded-xl space-y-4">
                    <h3 className="font-bold text-slate-700">मासिक प्रगती प्रतिवेदन (Monthly Progress Report)</h3>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-xs">
                            <thead className="bg-slate-100 italic">
                                <tr>
                                    <th className="border p-2" rowSpan={2}>उमेर समूह</th>
                                    <th className="border p-2" colSpan={2}>नयाँ</th>
                                    <th className="border p-2" colSpan={2}>जम्मा</th>
                                    <th className="border p-2" colSpan={2}>प्रेषण</th>
                                </tr>
                                <tr>
                                    <th className="border p-2">म.</th>
                                    <th className="border p-2">पु.</th>
                                    <th className="border p-2">म.</th>
                                    <th className="border p-2">पु.</th>
                                    <th className="border p-2">म.</th>
                                    <th className="border p-2">पु.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(progressReport.ageGroups).map(([age, metrics]) => (
                                    <tr key={age}>
                                        <td className="border p-2 font-bold">{age}</td>
                                        {[ {key: 'maleNew', val: metrics.maleNew}, {key: 'femaleNew', val: metrics.femaleNew}, {key: 'maleTotal', val: metrics.maleTotal}, {key: 'femaleTotal', val: metrics.femaleTotal}, {key: 'maleReferred', val: metrics.maleReferred}, {key: 'femaleReferred', val: metrics.femaleReferred} ].map(m => (
                                            <td key={m.key} className="border p-1"><input type="number" className="w-full p-1" value={m.val} onChange={e => setProgressReport({...progressReport, ageGroups: {...progressReport.ageGroups, [age]: {...metrics, [m.key]: parseInt(e.target.value) || 0}}})} /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-xs">
                            <thead className="bg-slate-100 italic">
                                <tr>
                                    <th className="border p-2">कार्यक्षेत्र भित्र पर्ने निकाय</th>
                                    <th className="border p-2">संचालन/प्रतिवेदन हुनुपर्ने</th>
                                    <th className="border p-2">संचालन/प्रतिवेदन भएको</th>
                                    <th className="border p-2">सेवा पाएका जम्मा</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(progressReport.healthLocations).map(([loc, stats]) => (
                                    <tr key={loc}>
                                        <td className="border p-2 font-bold">{loc}</td>
                                        <td><input type="number" className="w-full p-1" value={stats.expected} onChange={e => setProgressReport({...progressReport, healthLocations: {...progressReport.healthLocations, [loc]: {...stats, expected: parseInt(e.target.value) || 0}}})} /></td>
                                        <td><input type="number" className="w-full p-1" value={stats.actual} onChange={e => setProgressReport({...progressReport, healthLocations: {...progressReport.healthLocations, [loc]: {...stats, actual: parseInt(e.target.value) || 0}}})} /></td>
                                        <td><input type="number" className="w-full p-1" value={stats.totalService} onChange={e => setProgressReport({...progressReport, healthLocations: {...progressReport.healthLocations, [loc]: {...stats, totalService: parseInt(e.target.value) || 0}}})} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button 
                        onClick={handleSave}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 mt-4"
                    >
                        Save Report
                    </button>
                </div>
            )}

            {selectedDataset === 'vaccination' && (
                <div className="p-4 bg-white rounded-xl space-y-4">
                    <h3 className="font-bold text-slate-700">१. खोप कार्यक्रम (Vaccination Program)</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-xs">
                            <thead className="bg-slate-100 italic">
                                <tr>
                                    <th className="border p-2">खोपको प्रकार</th>
                                    {vaccinationReport.columns.map(col => <th key={col} className="border p-2">{col}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {vaccinationReport.rows.map(row => (
                                    <tr key={row}>
                                        <td className="border p-2 font-bold whitespace-nowrap">{row}</td>
                                        {vaccinationReport.columns.map(col => (
                                            <td key={col} className="border p-1">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-1" 
                                                    value={vaccinationReport.data[row]?.[col] || 0} 
                                                    onChange={e => setVaccinationReport({...vaccinationReport, data: {...vaccinationReport.data, [row]: {...vaccinationReport.data[row], [col]: parseInt(e.target.value) || 0}}})} 
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <button 
                        onClick={handleSave}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 mt-4"
                    >
                        Save Entire Report
                    </button>
                </div>
            )}

            {selectedDataset === 'report' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="block text-sm text-slate-600">महिना छान्नुहोस्</label>
                        <select 
                            value={reportMonth} 
                            onChange={(e) => setReportMonth(e.target.value)}
                            className="border rounded-lg p-2"
                        >
                            <option value="">महिना छान्नुहोस्</option>
                            {['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    {reportMonth ? (
                        <div className="p-4 border rounded-xl bg-slate-50">
                            {/* Placeholder for report display */}
                            <p className="text-slate-600">{reportMonth} को लागि {reportMonth} मा अपलोड गरिएका रिपोर्टहरू यहाँ देखिनेछन्।</p>
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">कृपया रिपोर्ट हेर्न एक महिना छान्नुहोस्।</p>
                    )}
                </div>
            )}
        </div>
    );
};
