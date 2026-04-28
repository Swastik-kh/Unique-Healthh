import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { ref as dbRef, onValue, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { FileText, Settings, X, Upload } from 'lucide-react';
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
    const [selectedMonth, setSelectedMonth] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'upload' | 'report'>('upload');
    const [showSettings, setShowSettings] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [newMapping, setNewMapping] = useState<Mapping>({ disease: '', alias: '' });

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

    const handleUpload = async () => {
        if (!selectedMonth || !file) {
            alert('कृपया महिना छान्नुहोस् र फाइल अपलोड गर्नुहोस्।');
            return;
        }

        setIsUploading(true);
        try {
            const fileRef = storageRef(storage, `orgData/${safeOrgName}/dhisReports/${currentFiscalYear}/${selectedMonth}/${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);
            
            await set(dbRef(db, `orgData/${safeOrgName}/dhisReports/${currentFiscalYear}/${selectedMonth}`), {
                fileName: file.name,
                url: downloadURL,
                uploadedAt: new Date().toISOString()
            });

            alert(`${selectedMonth} को लागि रिपोर्ट सुरक्षित गरियो।`);
            setActiveTab('report');
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 5000);
        } catch (error) {
            console.error("Upload error", error);
            alert("अपलोडमा त्रुटि भयो: " + (error instanceof Error ? error.message : "अज्ञात त्रुटि"));
        } finally {
            setIsUploading(false);
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

            <div className="flex space-x-4 mb-4 border-b">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`py-2 px-4 ${activeTab === 'upload' ? 'border-b-2 border-indigo-600 font-bold' : 'text-slate-500'}`}
                >
                    अपलोड (Upload)
                </button>
                <button 
                    onClick={() => setActiveTab('report')}
                    className={`py-2 px-4 ${activeTab === 'report' ? 'border-b-2 border-indigo-600 font-bold' : 'text-slate-500'}`}
                >
                    रिपोर्ट (Report)
                </button>
            </div>

            {activeTab === 'upload' && (
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl space-y-4">
                    <h3 className="font-bold text-slate-700">रिपोर्ट अपलोड गर्नुहोस् (Upload Report)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">महिना छान्नुहोस्</label>
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full border rounded-lg p-2"
                            >
                                <option value="">महिना छान्नुहोस्</option>
                                {['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">फाइल छान्नुहोस् (PDF/Excel)</label>
                            <input 
                                type="file" 
                                accept=".pdf, .xlsx, .xls"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full border rounded-lg p-2 text-sm"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleUpload}
                        disabled={isUploading}
                        className={`px-6 py-2 rounded-lg font-bold ${isUploading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                    >
                        {isUploading ? 'अपलोड हुँदै...' : 'अपलोड गर्नुहोस्'}
                    </button>
                    {uploadSuccess && (
                        <p className="text-green-600 font-bold mt-2">रिपोर्ट सफलतापूर्वक अपलोड भयो!</p>
                    )}
                </div>
            )}

            {activeTab === 'report' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="block text-sm text-slate-600">महिना छान्नुहोस्</label>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="border rounded-lg p-2"
                        >
                            <option value="">महिना छान्नुहोस्</option>
                            {['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    {selectedMonth ? (
                        <div className="p-4 border rounded-xl bg-slate-50">
                            {/* Placeholder for report display */}
                            <p className="text-slate-600">{selectedMonth} को लागि {selectedMonth} मा अपलोड गरिएका रिपोर्टहरू यहाँ देखिनेछन्।</p>
                        </div>
                    ) : (
                        <p className="text-slate-500 italic">कृपया रिपोर्ट हेर्न एक महिना छान्नुहोस्।</p>
                    )}
                </div>
            )}
        </div>
    );
};
