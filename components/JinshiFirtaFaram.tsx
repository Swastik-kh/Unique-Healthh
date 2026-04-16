
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Plus, Trash2, Printer, Save, ArrowLeft, CheckCircle2, Send, Clock, Eye, X } from 'lucide-react';
/* Added Signature to the imports to resolve type conflicts */
import { User, OrganizationSettings, Signature } from '../types/coreTypes';
import { InventoryItem, ReturnEntry, ReturnItem, IssueReportEntry } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiFirtaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;
  issueReports: IssueReportEntry[];
  generalSettings: OrganizationSettings;
}

export const JinshiFirtaFaram: React.FC<JinshiFirtaFaramProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  returnEntries,
  onSaveReturnEntry,
  issueReports,
  generalSettings
}) => {
  const [items, setItems] = useState<ReturnItem[]>([
    { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reasonAndCondition: '', remarks: '' }
  ]);

  /* Explicitly type formDetails state to handle Signature properties being optional in the data source but inferred as required in local state */
  const [formDetails, setFormDetails] = useState<{
    id: string;
    fiscalYear: string;
    formNo: string;
    date: string;
    status: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
    returnedBy: Signature;
    approvedBy: Signature;
  }>({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: new NepaliDate().format('YYYY-MM-DD'),
    // Fix: Updated status type to include 'Verified' to match ReturnEntry status
    status: 'Pending' as 'Pending' | 'Verified' | 'Approved' | 'Rejected',
    returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') },
    approvedBy: { name: '', designation: '', date: '' }
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ReturnEntry | null>(null);

  const isStoreKeeper = currentUser.role === 'STOREKEEPER' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
  const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

  const handleAddItem = () => {
    if (items.length >= 14) return;
    setItems([...items, { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reasonAndCondition: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof ReturnItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.totalAmount = (updated.quantity || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleInventorySelect = (id: number, option: any) => {
    const invItem = option.itemData as InventoryItem;
    if (invItem) {
      setItems(items.map(item => item.id === id ? {
        ...item,
        name: invItem.itemName,
        codeNo: invItem.uniqueCode || invItem.sanketNo || '',
        unit: invItem.unit,
        rate: invItem.rate || 0,
        inventoryId: invItem.id,
        itemType: invItem.itemType
      } : item));
    }
  };

  const handleSave = (status: 'Pending' | 'Verified' | 'Approved' | 'Rejected') => {
    const entry: ReturnEntry = {
        ...formDetails,
        id: formDetails.id || Date.now().toString(),
        items,
        status,
        preparedBy: status === 'Verified' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : formDetails.preparedBy,
        approvedBy: status === 'Approved' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : formDetails.approvedBy
    };
    onSaveReturnEntry(entry);
    let message = '';
    if (status === 'Pending') message = 'जिन्सी फिर्ता पेश भयो।';
    else if (status === 'Verified') message = 'जिन्सी फिर्ता स्टोरकिपरबाट प्रमाणित भयो।';
    else if (status === 'Approved') message = 'जिन्सी फिर्ता स्वीकृत भयो।';
    else if (status === 'Rejected') message = 'जिन्सी फिर्ता अस्वीकृत भयो।';
    
    alert(message);
    handleReset();
  };

  const handleReset = () => {
      setFormDetails({
          id: '',
          fiscalYear: currentFiscalYear,
          formNo: (returnEntries.length + 1).toString(),
          date: new NepaliDate().format('YYYY-MM-DD'),
          status: 'Pending',
          returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') },
          approvedBy: { name: '', designation: '', date: '' }
      });
      setItems([{ id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reasonAndCondition: '', remarks: '' }]);
      setIsViewOnly(false);
      setSelectedEntry(null);
  };

  const inventoryOptions = useMemo(() => {
    // Filter issue reports that were issued to the current user and are non-expendable
    const userIssuedItems = issueReports
      .filter(report => 
        report.status === 'Issued' && 
        report.itemType === 'Non-Expendable' && 
        report.demandBy?.name === currentUser.fullName
      )
      .flatMap(report => report.items);

    const issuedItemNames = new Set(userIssuedItems.map(item => item.name.trim().toLowerCase()));

    // Filter inventory items that match the issued items and are non-expendable
    return inventoryItems
      .filter(i => i.itemType === 'Non-Expendable' && issuedItemNames.has(i.itemName.trim().toLowerCase()))
      .map(i => ({
        id: i.id, value: i.itemName, label: `${i.itemName} (${i.unit})`, itemData: i
      }));
  }, [inventoryItems, issueReports, currentUser.fullName]);

  const pendingEntries = returnEntries.filter(e => (isStoreKeeper && e.status === 'Pending') || (isApprover && e.status === 'Verified'));
  const allHistory = returnEntries.filter(e => e.status === 'Approved' || e.status === 'Rejected' || (e.returnedBy.name === currentUser.fullName && e.status !== 'Approved'));

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border no-print">
            <h2 className="font-bold text-slate-700 font-nepali">जिन्सी फिर्ता फाराम (Return Form)</h2>
            <div className="flex gap-2">
                <button onClick={handleReset} className="bg-slate-100 p-2 rounded-lg" title="Reset Form"><RotateCcw size={18}/></button>
                
                {/* Submit Button for Requester */}
                {!formDetails.id && (
                    <button onClick={() => handleSave('Pending')} className="bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-primary-700 transition-colors">
                        <Send size={18}/> पेश गर्नुहोस्
                    </button>
                )}

                {/* Verification Button for Storekeeper */}
                {isStoreKeeper && formDetails.status === 'Pending' && formDetails.id && (
                    <button onClick={() => handleSave('Verified')} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-colors">
                        <CheckCircle2 size={18}/> प्रमाणित गर्नुहोस् (Verify)
                    </button>
                )}

                {/* Approval Button for Approver */}
                {isApprover && formDetails.status === 'Verified' && formDetails.id && (
                    <button onClick={() => handleSave('Approved')} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-green-700 transition-colors">
                        <CheckCircle2 size={18}/> स्वीकृत गर्नुहोस् (Approve)
                    </button>
                )}

                {/* Rejection Button */}
                {(isStoreKeeper || isApprover) && (formDetails.status === 'Pending' || formDetails.status === 'Verified') && formDetails.id && (
                    <button onClick={() => handleSave('Rejected')} className="bg-red-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-red-700 transition-colors">
                        <X size={18}/> अस्वीकृत
                    </button>
                )}
            </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm]">
            <div className="text-center mb-8">
                <h1 className="text-xl font-bold">{generalSettings.orgNameNepali}</h1>
                <h2 className="text-lg font-bold underline">जिन्सी फिर्ता फाराम</h2>
            </div>

            <div className="flex justify-between mb-4 text-sm">
                <p>फिर्ता गर्ने: <strong>{formDetails.returnedBy.name}</strong></p>
                <p>मिति: <strong>{formDetails.date}</strong></p>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-xs">
                <thead>
                    <tr className="bg-slate-50">
                        <th className="border border-slate-900 p-1">क्र.सं.</th>
                        <th className="border border-slate-900 p-1">सामानको नाम</th>
                        <th className="border border-slate-900 p-1">परिमाण</th>
                        <th className="border border-slate-900 p-1">कारण र अवस्था</th>
                        <th className="border border-slate-900 p-1 w-8 no-print"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={item.id}>
                            <td className="border border-slate-900 p-1 text-center">{idx + 1}</td>
                            <td className="border border-slate-900 p-1">
                                <SearchableSelect options={inventoryOptions} value={item.name} onChange={val => updateItem(item.id, 'name', val)} onSelect={opt => handleInventorySelect(item.id, opt)} className="!border-none" disabled={isViewOnly || formDetails.status === 'Approved'} />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-full text-center outline-none" disabled={isViewOnly || formDetails.status === 'Approved'} />
                            </td>
                            <td className="border border-slate-900 p-1">
                                <input value={item.reasonAndCondition} onChange={e => updateItem(item.id, 'reasonAndCondition', e.target.value)} className="w-full outline-none" disabled={isViewOnly || formDetails.status === 'Approved'} />
                            </td>
                            <td className="border border-slate-900 p-1 text-center no-print">
                                {!(isViewOnly || formDetails.status === 'Approved') && (
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-red-500"><Trash2 size={14}/></button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <button 
                onClick={handleAddItem} 
                disabled={items.length >= 14}
                className={`mt-2 text-xs font-bold no-print flex items-center gap-1 transition-colors ${items.length >= 14 ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'}`}
            >
                <Plus size={14} /> + लहर थप्नुहोस् (अधिकतम १४)
            </button>

            <div className="grid grid-cols-2 gap-12 mt-20 text-sm">
                <div className="border-t border-slate-800 pt-2 text-center">फिर्ता गर्नेको दस्तखत</div>
                <div className="border-t border-slate-800 pt-2 text-center">बुझिलिनेको (Storekeeper) दस्तखत</div>
            </div>
        </div>

        {returnEntries.filter(e => (isStoreKeeper && e.status === 'Pending') || (isApprover && e.status === 'Verified')).length > 0 && (
            <div className="bg-white p-6 rounded-xl border shadow-sm no-print">
                <h3 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
                    <Clock size={18}/> 
                    {isStoreKeeper ? 'प्रमाणिकरणका लागि बाँकी फिर्ता फारामहरू' : 'स्वीकृतिका लागि बाँकी फिर्ता फारामहरू'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {returnEntries.filter(e => (isStoreKeeper && e.status === 'Pending') || (isApprover && e.status === 'Verified')).map(e => (
                        <div key={e.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-bold">फिर्ता गर्ने: {e.returnedBy.name}</p>
                                <p className="text-xs text-slate-500">मिति: {e.date} | सामान: {e.items.length} | अवस्था: <span className="text-orange-600 font-bold">{e.status}</span></p>
                            </div>
                            <button 
                                onClick={() => { 
                                    setSelectedEntry(e); 
                                    setItems(e.items); 
                                    setFormDetails({ 
                                        id: e.id, 
                                        fiscalYear: e.fiscalYear, 
                                        formNo: e.formNo, 
                                        date: e.date, 
                                        status: e.status, 
                                        returnedBy: e.returnedBy, 
                                        approvedBy: e.approvedBy 
                                    }); 
                                    setIsViewOnly(false); // Allow editing/actions for Storekeeper/Approver
                                }} 
                                className="text-primary-600 font-bold text-xs hover:underline bg-primary-50 px-3 py-1 rounded"
                            >
                                Review
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* History Section */}
        {allHistory.length > 0 && (
            <div className="bg-white p-6 rounded-xl border shadow-sm no-print">
                <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2"><Clock size={18}/> फिर्ता फाराम इतिहास (History)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-2">मिति</th>
                                <th className="px-4 py-2">फिर्ता गर्ने</th>
                                <th className="px-4 py-2">सामान संख्या</th>
                                <th className="px-4 py-2">अवस्था</th>
                                <th className="px-4 py-2 text-right">कार्य</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {allHistory.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2">{e.date}</td>
                                    <td className="px-4 py-2">{e.returnedBy.name}</td>
                                    <td className="px-4 py-2">{e.items.length}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                            e.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                            e.status === 'Verified' ? 'bg-blue-100 text-blue-700' :
                                            e.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button 
                                            onClick={() => {
                                                setSelectedEntry(e);
                                                setItems(e.items);
                                                setFormDetails({ id: e.id, fiscalYear: e.fiscalYear, formNo: e.formNo, date: e.date, status: e.status, returnedBy: e.returnedBy, approvedBy: e.approvedBy });
                                                setIsViewOnly(true);
                                            }}
                                            className="text-primary-600 hover:text-primary-800"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};
