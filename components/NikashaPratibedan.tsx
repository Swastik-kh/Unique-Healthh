
import React, { useState, useMemo } from 'react';
import { FileOutput, ArrowLeft, Printer, CheckCircle2, X, Clock, Eye, Send, AlertCircle } from 'lucide-react';
// Corrected import path to use the types folder's index file explicitly to avoid shadowing by root types.ts
import { IssueReportEntry, MagItem, User, OrganizationSettings, Store, InventoryItem } from '../types/index';
import { LogoDisplay } from './LogoDisplay';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface NikashaPratibedanProps {
    reports: IssueReportEntry[];
    onSave: (report: IssueReportEntry) => Promise<void> | void;
    currentUser: User;
    currentFiscalYear: string;
    generalSettings: OrganizationSettings;
    stores: Store[];
    inventoryItems: InventoryItem[];
}

export const NikashaPratibedan: React.FC<NikashaPratibedanProps> = ({ reports, onSave, currentUser, currentFiscalYear, generalSettings, stores, inventoryItems }) => {
    const [selectedReport, setSelectedReport] = useState<IssueReportEntry | null>(null);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [editingItems, setEditingItems] = useState<MagItem[]>([]);

    const isStoreKeeper = currentUser.role === 'STOREKEEPER';
    const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    const handleLoadReport = (report: IssueReportEntry, viewOnly: boolean = false) => {
        setSelectedReport(report);
        setIsViewOnlyMode(viewOnly);
        setSelectedStoreId(report.selectedStoreId || '');
        setEditingItems(report.items || []);
    };

    const handleBack = () => {
        setSelectedReport(null);
        setIsViewOnlyMode(false);
        setSelectedStoreId('');
        setEditingItems([]);
    };

    const handleItemBatchChange = (idx: number, batchNo: string, expiryDate: string) => {
        const newItems = [...editingItems];
        newItems[idx] = {
            ...newItems[idx],
            batchNo,
            expiryDate
        };
        setEditingItems(newItems);
    };

    const handleAction = async (status: 'Pending Approval' | 'Issued' | 'Rejected') => {
        if (!selectedReport) return;
        if ((status === 'Issued' || status === 'Pending Approval') && !selectedStoreId) {
            alert('कृपया एउटा स्टोर चयन गर्नुहोस्।');
            return;
        }
        setIsProcessing(true);
        try {
            const updatedReport: IssueReportEntry = {
                ...selectedReport,
                status,
                items: editingItems,
                selectedStoreId: (status === 'Issued' || status === 'Pending Approval') ? selectedStoreId : selectedReport.selectedStoreId,
                issueDate: new NepaliDate().format('YYYY-MM-DD'),
                approvedBy: status === 'Issued' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : selectedReport.approvedBy,
                preparedBy: status === 'Pending Approval' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : selectedReport.preparedBy
            };
            await onSave(updatedReport);
            setIsProcessing(false);
            handleBack();
        } catch (error) {
            console.error("Error saving report:", error);
            alert("रिपोर्ट सुरक्षित गर्दा त्रुटि भयो।");
            setIsProcessing(false);
        }
    };

    const actionableReports = reports.filter(r => {
        if (isStoreKeeper) return r.status === 'Pending';
        if (isApprover) return r.status === 'Pending Approval';
        return false;
    });

    if (selectedReport) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="font-bold text-slate-700 font-nepali">निकासा प्रतिवेदन #{selectedReport.magFormNo}</h2>
                    </div>
                    <div className="flex gap-2">
                        {!isViewOnlyMode && (
                            <>
                                {isStoreKeeper && selectedReport.status === 'Pending' && (
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={selectedStoreId} 
                                            onChange={(e) => setSelectedStoreId(e.target.value)}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold"
                                        >
                                            <option value="">स्टोर चयन गर्नुहोस्</option>
                                            {stores.map(store => (
                                                <option key={store.id} value={store.id}>{store.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleAction('Pending Approval')} disabled={isProcessing} className="bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
                                            <Send size={18} /> पेश गर्नुहोस्
                                        </button>
                                    </div>
                                )}
                                {isApprover && selectedReport.status === 'Pending Approval' && (
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={selectedStoreId} 
                                            onChange={(e) => setSelectedStoreId(e.target.value)}
                                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold"
                                        >
                                            <option value="">स्टोर चयन गर्नुहोस्</option>
                                            {stores.map(store => (
                                                <option key={store.id} value={store.id}>{store.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleAction('Issued')} disabled={isProcessing} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
                                            <CheckCircle2 size={18} /> स्वीकृत गर्नुहोस्
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
                            <Printer size={18} /> प्रिन्ट
                        </button>
                    </div>
                </div>

                {/* Form 404 Layout */}
                <div className="bg-white p-10 rounded-xl shadow-lg max-w-[297mm] mx-auto min-h-[210mm] font-nepali text-slate-900 print:shadow-none print:p-0 landscape-print">
                    
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-2">
                        {/* Logo */}
                        <div className="w-32 pt-2">
                             <LogoDisplay settings={generalSettings} />
                        </div>

                        {/* Center Text */}
                        <div className="flex-1 text-center space-y-1 pt-2">
                            <h1 className="text-xl font-bold text-slate-900">{generalSettings.orgNameNepali}</h1>
                            <h2 className="text-lg font-medium">{generalSettings.subTitleNepali}</h2>
                            {generalSettings.subTitleNepali2 && <h3 className="text-lg font-medium">{generalSettings.subTitleNepali2}</h3>}
                            {generalSettings.subTitleNepali3 && <h3 className="text-base font-medium">{generalSettings.subTitleNepali3}</h3>}
                            <h2 className="text-lg font-bold mt-4">खर्च निकासा फाराम</h2>
                        </div>

                        {/* Top Right Info */}
                        <div className="w-32 text-right pt-2 space-y-1">
                            <div className="text-[10px] font-bold">म.ले.प.फारम नं: ४०४</div>
                            <div className="mt-8 flex justify-end items-center gap-1 text-sm">
                                <span className="font-bold">नि.नं. :</span>
                                <span className="border-b border-dotted border-slate-900 min-w-[40px] text-center">{selectedReport.issueNo || selectedReport.magFormNo}</span>
                            </div>
                            <div className="flex justify-end items-center gap-1 text-sm">
                                <span className="font-bold">मिति :</span>
                                <span className="border-b border-dotted border-slate-900 min-w-[80px] text-center">{selectedReport.issueDate || selectedReport.requestDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-4 text-xs font-bold">
                        <div className="pb-1">
                            आ.व. : {selectedReport.fiscalYear}
                        </div>
                    </div>

                    <div className="mb-2 text-xs font-bold">
                        खर्च निकासा गरिएको माग फाराम नं. <span className="font-normal">{selectedReport.magFormNo}</span>
                    </div>

                    {/* Table Title */}
                    <div className="text-center text-xs font-bold border-t border-l border-r border-slate-900 p-1">
                        खर्च भएर जाने जिन्सी मालसामानको निकासा गरिएको
                    </div>

                    <table className="w-full border-collapse border border-slate-900 text-xs text-center">
                        <thead className="bg-white">
                            <tr>
                                <th className="border border-slate-900 p-1 w-10">क्र.सं.</th>
                                <th className="border border-slate-900 p-1">नाम</th>
                                <th className="border border-slate-900 p-1 w-20">संकेत नं.</th>
                                <th className="border border-slate-900 p-1">स्पेसिफिकेसन</th>
                                <th className="border border-slate-900 p-1 w-16">एकाई</th>
                                <th className="border border-slate-900 p-1 w-16">परिमाण</th>
                                <th className="border border-slate-900 p-1 w-16">दर</th>
                                <th className="border border-slate-900 p-1 w-24">जम्मा रकम</th>
                                <th className="border border-slate-900 p-1 w-32">कैफियत</th>
                            </tr>
                            {/* Column Numbers */}
                            <tr>
                                <th className="border border-slate-900 p-0.5 text-[10px]">१</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">२</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">३</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">४</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">५</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">६</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">७</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">८=६x७</th>
                                <th className="border border-slate-900 p-0.5 text-[10px]">९</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editingItems.map((item, idx) => {
                                const rate = item.rate || 0;
                                const qty = parseFloat(item.quantity) || 0;
                                const total = rate * qty;

                                // Find matching inventory items for batch selection
                                const matchingInventory = inventoryItems.filter(inv => {
                                    const nameMatches = inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase();
                                    const storeMatches = inv.storeId === selectedStoreId;
                                    const codeMatches = item.codeNo ? (inv.uniqueCode === item.codeNo || inv.sanketNo === item.codeNo) : true;
                                    return nameMatches && storeMatches && codeMatches && inv.currentQuantity > 0;
                                });

                                return (
                                    <tr key={idx}>
                                        <td className="border border-slate-900 p-1">{idx + 1}</td>
                                        <td className="border border-slate-900 p-1 text-left px-2">
                                            <div>{item.name}</div>
                                            {/* Batch Selection UI - Only visible during processing and if matches exist */}
                                            {!isViewOnlyMode && (isApprover || isStoreKeeper) && (selectedReport.status === 'Pending Approval' || selectedReport.status === 'Pending') && (
                                                <div className="mt-1 no-print">
                                                    {!selectedStoreId ? (
                                                        <div className="text-[9px] text-red-500 italic font-bold">कृपया पहिले स्टोर चयन गर्नुहोस्</div>
                                                    ) : matchingInventory.length > 0 ? (
                                                        <select 
                                                            className="text-[10px] p-1 border rounded w-full bg-yellow-50 border-yellow-200"
                                                            value={item.batchNo ? `${item.batchNo}|${item.expiryDate}` : ""}
                                                            onChange={(e) => {
                                                                const [batch, expiry] = e.target.value.split('|');
                                                                handleItemBatchChange(idx, batch, expiry);
                                                            }}
                                                        >
                                                            <option value="">ब्याच चयन गर्नुहोस्</option>
                                                            {matchingInventory.map((inv, i) => (
                                                                <option key={i} value={`${inv.batchNo}|${inv.expiryDateBs || inv.expiryDateAd}`}>
                                                                    Batch: {inv.batchNo || 'N/A'} (Exp: {inv.expiryDateBs || inv.expiryDateAd || 'N/A'}) - Qty: {inv.currentQuantity}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-[9px] text-red-500 italic font-bold">यस स्टोरमा यो सामान उपलब्ध छैन</div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Display selected batch/expiry in view mode but hide in print */}
                                            {(item.batchNo || item.expiryDate) && (
                                                <div className="text-[9px] text-slate-500 no-print mt-0.5">
                                                    {item.batchNo && <span>Batch: {item.batchNo} </span>}
                                                    {item.expiryDate && <span>Exp: {item.expiryDate}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="border border-slate-900 p-1">{item.codeNo}</td>
                                        <td className="border border-slate-900 p-1">{item.specification}</td>
                                        <td className="border border-slate-900 p-1">{item.unit}</td>
                                        <td className="border border-slate-900 p-1 font-bold">{item.quantity}</td>
                                        <td className="border border-slate-900 p-1 text-right px-2">{rate > 0 ? rate.toFixed(2) : ''}</td>
                                        <td className="border border-slate-900 p-1 text-right px-2">{total > 0 ? total.toFixed(2) : ''}</td>
                                        <td className="border border-slate-900 p-1 text-left px-2">{item.remarks}</td>
                                    </tr>
                                );
                            })}
                            {/* Empty rows to fill space if needed, or total row */}
                            <tr>
                                <td className="border border-slate-900 p-1 font-bold text-right" colSpan={7}>कुल जम्मा</td>
                                <td className="border border-slate-900 p-1 font-bold text-right px-2">
                                    {editingItems.reduce((sum, item) => sum + ((item.rate || 0) * (parseFloat(item.quantity) || 0)), 0).toFixed(2)}
                                </td>
                                <td className="border border-slate-900 p-1"></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="grid grid-cols-3 gap-4 mt-16 text-sm">
                        <div className="space-y-4">
                            <p className="font-bold">तयार गर्ने:......</p>
                            <div className="flex gap-2 items-end">
                                <span>नाम थर :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.preparedBy?.name}</span>
                            </div>
                            <div className="flex gap-2 items-end">
                                <span>पद :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.preparedBy?.designation}</span>
                            </div>
                            <div className="flex gap-2 items-end">
                                <span>मिति :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.preparedBy?.date}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="font-bold">सिफारिस गर्ने:.........</p>
                            <div className="flex gap-2 items-end">
                                <span>नाम थर :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.recommendedBy?.name}</span>
                            </div>
                            <div className="flex gap-2 items-end">
                                <span>पद :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.recommendedBy?.designation}</span>
                            </div>
                            <div className="flex gap-2 items-end">
                                <span>मिति :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.recommendedBy?.date}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="font-bold">स्वीकृत गर्ने:.........</p>
                            <div className="flex gap-2 items-end">
                                <span>नाम थर :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.approvedBy?.name}</span>
                            </div>
                            <div className="flex gap-2 items-end">
                                <span>पद :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.approvedBy?.designation}</span>
                            </div>
                            <div className="flex gap-2 items-end">
                                <span>मिति :</span>
                                <span className="border-b border-dotted border-slate-900 flex-1">{selectedReport.approvedBy?.date}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 font-nepali flex items-center gap-2">
                        <FileOutput size={20} className="text-indigo-600"/> 
                        विचाराधीन निकासा अनुरोधहरू (Pending Issues)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">माग नं</th>
                                <th className="px-6 py-4">मिति</th>
                                <th className="px-6 py-4">स्थिति</th>
                                <th className="px-6 py-4 text-right">कार्य</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {actionableReports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">#{r.magFormNo}</td>
                                    <td className="px-6 py-4 font-nepali">{r.requestDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            r.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            <Clock size={12}/> {r.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleLoadReport(r)} className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-200">
                                            Review & Process
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {actionableReports.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 italic font-nepali">
                                        कुनै नयाँ निकासा अनुरोध छैन।
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 font-nepali flex items-center gap-2">
                        <AlertCircle size={18} className="text-slate-400" />
                        निकासा इतिहास (Issue History)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">निकासा नं / माग नं</th>
                                <th className="px-6 py-4">मिति</th>
                                <th className="px-6 py-4">स्थिति</th>
                                <th className="px-6 py-4 text-right">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reports.filter(r => r.status === 'Issued' || r.status === 'Rejected').map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-slate-700">{r.issueNo ? `#${r.issueNo}` : `-`}</div>
                                        <div className="text-[10px] text-slate-400">Demand: #{r.magFormNo}</div>
                                    </td>
                                    <td className="px-6 py-4 font-nepali">{r.issueDate || r.requestDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            r.status === 'Issued' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            {r.status === 'Issued' ? <CheckCircle2 size={12}/> : <X size={12}/>}
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleLoadReport(r, true)} className="text-indigo-400 hover:text-indigo-600 p-2 rounded-full transition-colors">
                                            <Eye size={20}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reports.filter(r => r.status === 'Issued' || r.status === 'Rejected').length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 italic font-nepali">
                                        इतिहासमा कुनै रेकर्ड छैन।
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
