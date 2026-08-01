import React, { useState, useEffect } from 'react';
import { db } from '../firestore';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FCHV } from '../types/vitaminATypes';
import { UserPlus, Save, Trash2, Edit2, Users, ClipboardList, LayoutDashboard } from 'lucide-react';
import { FCHVReportForm } from './FCHVReportForm';

export const FCHVKaryakram: React.FC<{ activeOrgName: string; currentFiscalYear: string }> = ({ activeOrgName, currentFiscalYear }) => {
    const safeOrgName = activeOrgName.trim().replace(/[.#$[\\]]/g, "_");
    const [fchvs, setFchvs] = useState<FCHV[]>([]);
    const [newFchv, setNewFchv] = useState({ name: '', wardNumber: '' });
    const [editingFchvId, setEditingFchvId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'management' | 'reports'>('management');

    useEffect(() => {
        const fetchFchvs = async () => {
            setLoading(true);
            try {
                const fchvCol = await getDocs(collection(db, 'orgData', safeOrgName, 'fchvs'));
                setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));
            } catch (error) {
                console.error("Error fetching FCHVs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFchvs();
    }, [safeOrgName]);

    const handleAddOrUpdate = async () => {
        if (!newFchv.name || !newFchv.wardNumber) {
            alert('कृपया नाम र वडा नम्बर भर्नुहोस्');
            return;
        }

        try {
            if (editingFchvId) {
                await updateDoc(doc(db, 'orgData', safeOrgName, 'fchvs', editingFchvId), newFchv);
                alert('FCHV विवरण अपडेट गरियो');
                setEditingFchvId(null);
            } else {
                await addDoc(collection(db, 'orgData', safeOrgName, 'fchvs'), newFchv);
                alert('नयाँ FCHV थपियो');
            }
            setNewFchv({ name: '', wardNumber: '' });
            
            // Refresh list
            const fchvCol = await getDocs(collection(db, 'orgData', safeOrgName, 'fchvs'));
            setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));
        } catch (error) {
            console.error("Error saving FCHV:", error);
            alert('डाटा सुरक्षित गर्न सकिएन');
        }
    };

    const handleEdit = (fchv: FCHV) => {
        setNewFchv({ name: fchv.name, wardNumber: fchv.wardNumber });
        setEditingFchvId(fchv.id);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('के तपाईं यो FCHV हटाउन चाहनुहुन्छ?')) return;
        try {
            await deleteDoc(doc(db, 'orgData', safeOrgName, 'fchvs', id));
            setFchvs(prev => prev.filter(f => f.id !== id));
            alert('हटाउन सफल');
        } catch (error) {
            console.error("Error deleting FCHV:", error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 font-nepali">FCHV कार्यक्रम (FCHV Program)</h2>
                        <p className="text-xs sm:text-sm text-slate-500">महिला स्वास्थ्य स्वयंसेविका व्यवस्थापन तथा रिपोर्टिङ</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button 
                        onClick={() => setActiveTab('management')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                        <LayoutDashboard size={16} /> स्वयंसेविका सूची
                    </button>
                    <button 
                        onClick={() => setActiveTab('reports')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                        <ClipboardList size={16} /> मासिक रिपोर्ट
                    </button>
                </div>
            </div>

            {activeTab === 'management' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
                            <h3 className="text-md font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
                                {editingFchvId ? <Edit2 size={18} className="text-blue-600" /> : <UserPlus size={18} className="text-green-600" />}
                                {editingFchvId ? 'विवरण सम्पादन गर्नुहोस्' : 'नयाँ स्वयंसेविका थप्नुहोस्'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">स्वयंसेविकाको नाम</label>
                                    <input 
                                        type="text" 
                                        value={newFchv.name} 
                                        onChange={e => setNewFchv({...newFchv, name: e.target.value})} 
                                        className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="नाम लेख्नुहोस्"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">वडा नम्बर</label>
                                    <input 
                                        type="text" 
                                        value={newFchv.wardNumber} 
                                        onChange={e => setNewFchv({...newFchv, wardNumber: e.target.value})} 
                                        className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="वडा नं"
                                    />
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <button 
                                        onClick={handleAddOrUpdate} 
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-bold transition-all ${editingFchvId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        <Save size={18} /> {editingFchvId ? 'अपडेट गर्नुहोस्' : 'थप्नुहोस्'}
                                    </button>
                                    {editingFchvId && (
                                        <button 
                                            onClick={() => { setEditingFchvId(null); setNewFchv({ name: '', wardNumber: '' }); }}
                                            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                                        >
                                            रद्द
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b">
                                <h3 className="font-bold text-slate-800 font-nepali">स्वयंसेविका सूची (FCHV List)</h3>
                            </div>
                            {loading ? (
                                <div className="p-12 text-center text-slate-400">लोड हुँदैछ...</div>
                            ) : fchvs.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic font-nepali">कुनै डाटा फेला परेन।</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b bg-slate-50/50">
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">क्र.सं.</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">नाम</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">वडा नं</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">कार्य</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {fchvs.map((fchv, idx) => (
                                                <tr key={fchv.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-slate-600">{idx + 1}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{fchv.name}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{fchv.wardNumber}</td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button 
                                                            onClick={() => handleEdit(fchv)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="सम्पादन गर्नुहोस्"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(fchv.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="हटाउनुहोस्"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <FCHVReportForm 
                    safeOrgName={safeOrgName}
                    fiscalYear={currentFiscalYear}
                    fchvs={fchvs}
                    onSaved={() => {}}
                />
            )}
        </div>
    );
};
