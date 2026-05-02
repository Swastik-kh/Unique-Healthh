
import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Printer, Save, ArrowLeft, Clock, CheckCircle2, Send, AlertTriangle, Search, X, Eye } from 'lucide-react';
import { User, OrganizationSettings } from '../types/coreTypes'; // Changed import
import { DhuliyaunaEntry, DhuliyaunaItem, InventoryItem, Store } from '../types/inventoryTypes'; // Changed import
import { LogoDisplay } from './LogoDisplay';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface DhuliyaunaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  generalSettings: OrganizationSettings;
  inventoryItems: InventoryItem[];
  dhuliyaunaEntries: DhuliyaunaEntry[];
  onSaveDhuliyaunaEntry: (entry: DhuliyaunaEntry) => void;
  stores?: Store[];
}

export const DhuliyaunaFaram: React.FC<DhuliyaunaFaramProps> = ({
  currentFiscalYear,
  currentUser,
  generalSettings,
  inventoryItems,
  dhuliyaunaEntries,
  onSaveDhuliyaunaEntry,
  stores = []
}) => {
  const [items, setItems] = useState<DhuliyaunaItem[]>([
    { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reason: '', remarks: '' }
  ]);

  const [formDetails, setFormDetails] = useState({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: '',
    status: 'Pending' as 'Pending' | 'Approved',
    disposalType: 'Dhuliyauna' as 'Dhuliyauna' | 'Lilaam' | 'Minaha',
    preparedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' },
    approvedBy: { name: '', designation: '', date: '' },
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Calculate Today in Nepali for Restrictions
  const todayBS = useMemo(() => {
      try {
          return new NepaliDate().format('YYYY-MM-DD');
      } catch (e) {
          return '';
      }
  }, []);

  // Determine Roles
  const canApprove = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'APPROVAL';

  // Filter Lists
  const pendingRequests = useMemo(() => 
    dhuliyaunaEntries.filter(e => e.status === 'Pending').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [dhuliyaunaEntries]);

  const approvedHistory = useMemo(() =>
    dhuliyaunaEntries.filter(e => e.status === 'Approved').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [dhuliyaunaEntries]);

  // Inventory Options
  const inventoryOptions = useMemo(() => {
      let filtered = inventoryItems;
      if (selectedStoreId) {
          filtered = filtered.filter(i => i.storeId === selectedStoreId);
      }
      return filtered.map(item => ({
          id: item.id,
          value: item.itemName,
          label: `${item.itemName} (${item.unit}) - Qty: ${item.currentQuantity}`,
          itemData: item
      }));
  }, [inventoryItems, selectedStoreId]);

  const storeOptions = useMemo(() => stores.map(s => ({ id: s.id, value: s.id, label: s.name })), [stores]);

  // Auto-increment form number logic
  useEffect(() => {
    if (!formDetails.id) {
        const entriesInFY = dhuliyaunaEntries.filter(e => e.fiscalYear === currentFiscalYear);
        const maxNo = entriesInFY.reduce((max, e) => Math.max(max, parseInt(e.formNo || '0')), 0);
        setFormDetails(prev => ({ ...prev, formNo: (maxNo + 1).toString(), date: todayBS, preparedBy: {...prev.preparedBy, date: todayBS} })); // FIX: pre-fill date
    }
  }, [currentFiscalYear, dhuliyaunaEntries, formDetails.id, todayBS]);

  const handleAddItem = () => {
    if (items.length >= 14) return;
    setItems([...items, { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reason: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof DhuliyaunaItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto calculate total
        if (field === 'quantity' || field === 'rate') {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
            const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
            updated.totalAmount = qty * rate;
        }
        return updated;
      }
      return item;
    }));
  };

  // Helper to load expired items
  const handleLoadExpiredItems = () => {
      const today = new Date();
      const expiredItems = inventoryItems.filter(item => {
          if (selectedStoreId && item.storeId !== selectedStoreId) return false;
          if (!item.expiryDateAd) return false;
          return new Date(item.expiryDateAd) < today && item.currentQuantity > 0;
      });

      if (expiredItems.length === 0) {
          alert("म्याद सकिएको कुनै सामान भेटिएन (No expired items found)");
          return;
      }

      const newItems: DhuliyaunaItem[] = expiredItems.map((invItem, index) => ({
          id: Date.now() + index,
          inventoryId: invItem.id,
          codeNo: invItem.uniqueCode || invItem.sanketNo || '',
          name: invItem.itemName,
          specification: invItem.specification || '',
          unit: invItem.unit,
          quantity: invItem.currentQuantity,
          rate: invItem.rate || 0,
          totalAmount: (invItem.currentQuantity) * (invItem.rate || 0),
          reason: 'Expired (म्याद सकिएको)',
          remarks: `Batch: ${invItem.batchNo || '-'}, Exp: ${invItem.expiryDateBs || '-'}`
      }));

      setItems(newItems);
  };

  const handleLoadEntry = (entry: DhuliyaunaEntry, viewOnly: boolean = false) => {
      setFormDetails({
          id: entry.id,
          fiscalYear: entry.fiscalYear,
          formNo: entry.formNo,
          date: entry.date,
          status: entry.status,
          disposalType: entry.disposalType,
          preparedBy: {
              name: entry.preparedBy.name,
              designation: entry.preparedBy.designation || '',
              date: entry.preparedBy.date || ''
          },
          approvedBy: {
              name: entry.approvedBy.name,
              designation: entry.approvedBy.designation || '',
              date: entry.approvedBy.date || ''
          }
      });
      setItems(entry.items);
      setIsViewOnly(viewOnly);
      const formElement = document.getElementById('dhuliyauna-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReset = () => {
      setFormDetails({
        id: '',
        fiscalYear: currentFiscalYear,
        formNo: '1', 
        date: todayBS, // FIX: pre-fill date
        status: 'Pending',
        disposalType: 'Dhuliyauna',
        preparedBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }, // FIX: pre-fill date
        approvedBy: { name: '', designation: '', date: '' },
      });
      setItems([{ id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reason: '', remarks: '' }]);
      setIsViewOnly(false);
      setIsSaved(false);
  };

  const handleSave = (statusToSet: 'Pending' | 'Approved') => {
    if (!formDetails.date) {
        alert('मिति आवश्यक छ (Date is required)');
        return;
    }

    const entry: DhuliyaunaEntry = {
        id: formDetails.id || Date.now().toString(),
        fiscalYear: formDetails.fiscalYear,
        formNo: formDetails.formNo,
        date: formDetails.date,
        items: items,
        status: statusToSet,
        disposalType: formDetails.disposalType,
        preparedBy: formDetails.preparedBy,
        approvedBy: statusToSet === 'Approved' ? { ...formDetails.approvedBy, name: currentUser.fullName, date: formDetails.date } : formDetails.approvedBy
    };

    onSaveDhuliyaunaEntry(entry);
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        handleReset();
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* 1. TOP LIST (PENDING REQUESTS - ADMIN VIEW) */}
      {canApprove && pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden no-print mb-6">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-orange-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">स्वीकृति अनुरोधहरू (Pending Disposal Requests)</h3>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Form No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.disposalType}</td>
                              <td className="px-6 py-3 text-slate-600">{req.items.length} items</td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, false)}
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1"
                                  >
                                      <Send size={14} /> Review & Approve
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* 2. HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <Trash2 size={24} />
            </div>
            <div>
                <h2 className="font-bold text-slate-700 font-nepali text-lg">लिलाम / धुल्याउने (Disposal Form)</h2>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500">फारम नं: ४०७ / ४०८</p>
                    {formDetails.status === 'Pending' && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 font-bold">Pending</span>}
                    {formDetails.status === 'Approved' && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 no-print">
                            <CheckCircle2 className="text-green-600" />
                            <p className="text-green-800 font-bold">यो फारम स्वीकृत भइसकेको छ। (This form is approved)</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            {!isViewOnly && (
                <>
                    {canApprove && formDetails.status === 'Pending' && formDetails.id && (
                        <button onClick={() => handleSave('Approved')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors">
                            <CheckCircle2 size={18} /> Approve
                        </button>
                    )}
                    <button onClick={() => handleSave('Pending')} disabled={isSaved || formDetails.status === 'Approved'} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>
                        {isSaved ? <CheckCircle2 size={18} /> : <Send size={18} />}
                        {isSaved ? 'Sent!' : 'Submit Request'}
                    </button>
                </>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                <Printer size={18} /> Print
            </button>
        </div>
      </div>

      {/* 3. MAIN FORM CONTENT (A4 Layout) */}
      <div id="dhuliyauna-form-container" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none">
        
        {/* Header Section */}
        <div className="mb-8">
             <div className="flex items-start justify-between">
                 <div className="w-24 pt-2"><LogoDisplay settings={generalSettings} /></div>
                 <div className="flex-1 text-center space-y-1">
                     <h1 className="text-xl font-bold text-red-600">{currentUser.organizationName}</h1>
                     <h2 className="text-lg font-bold underline underline-offset-4">जिन्सी मालसामान मिनाहा / लिलाम / धुल्याउने आदेश</h2>
                 </div>
                 <div className="w-24"></div> 
             </div>
        </div>

        {/* Action Controls (No Print) */}
        {!isViewOnly && (
            <div className="grid md:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 no-print">
                <Select label="स्टोर छान्नुहोस् (Filter items by store)" options={storeOptions} value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} />
                <div className="flex items-end">
                    <button onClick={handleLoadExpiredItems} className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 transition-colors font-bold text-sm">
                        <AlertTriangle size={18} /> म्याद सकिएका सामानहरू लोड गर्नुहोस्
                    </button>
                </div>
            </div>
        )}

        {/* Table */}
        <table className="w-full border-collapse border border-slate-900 text-center text-xs">
            <thead>
                <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-2 w-10">क्र.सं.</th>
                    <th className="border border-slate-900 p-2">सामानको नाम</th>
                    <th className="border border-slate-900 p-2 w-28">सङ्केत नं.</th>
                    <th className="border border-slate-900 p-2 w-20">परिमाण</th>
                    <th className="border border-slate-900 p-2 w-20">एकाई</th>
                    <th className="border border-slate-900 p-2 w-24">दर</th>
                    <th className="border border-slate-900 p-2 w-32">जम्मा</th>
                    <th className="border border-slate-900 p-2 w-48">कारण</th>
                    <th className="border border-slate-900 p-2 w-8 no-print"></th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={item.id}>
                        <td className="border border-slate-900 p-2">{index + 1}</td>
                        <td className="border border-slate-900 p-1">
                            {!isViewOnly ? (
                                <SearchableSelect
                                    options={inventoryOptions}
                                    value={item.name}
                                    onChange={(val) => updateItem(item.id, 'name', val)}
                                    onSelect={(opt) => {
                                        const inv = opt.itemData as InventoryItem;
                                        if (inv) {
                                            updateItem(item.id, 'inventoryId', inv.id);
                                            updateItem(item.id, 'codeNo', inv.uniqueCode || inv.sanketNo || '');
                                            updateItem(item.id, 'unit', inv.unit);
                                            updateItem(item.id, 'rate', inv.rate || 0);
                                            updateItem(item.id, 'quantity', inv.currentQuantity);
                                        }
                                    }}
                                    className="!border-none !bg-transparent !p-0"
                                />
                            ) : <span>{item.name}</span>}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.codeNo} onChange={e => updateItem(item.id, 'codeNo', e.target.value)} className="w-full bg-transparent text-center outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} type="number" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-full bg-transparent text-center font-bold outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent text-center outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} type="number" value={item.rate || ''} onChange={e => updateItem(item.id, 'rate', e.target.value)} className="w-full bg-transparent text-right outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1 font-bold text-right px-2">
                            {item.totalAmount?.toFixed(2)}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.reason} onChange={e => updateItem(item.id, 'reason', e.target.value)} className="w-full bg-transparent text-left px-2 outline-none" placeholder="Reason for disposal" />
                        </td>
                        <td className="border border-slate-900 p-1 no-print">
                            {!isViewOnly && <button onClick={() => handleRemoveItem(item.id)} className="text-red-500"><Trash2 size={14}/></button>}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        {!isViewOnly && (
            <button 
                onClick={handleAddItem} 
                disabled={items.length >= 14}
                className={`mt-2 text-xs font-bold px-2 py-1 rounded no-print flex items-center gap-1 transition-colors ${items.length >= 14 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-primary-50 text-primary-600 hover:text-primary-700'}`}
            >
                <Plus size={14} /> + लहर थप्नुहोस् (अधिकतम १४)
            </button>
        )}

        {/* Footer section for signatures */}
        <div className="grid grid-cols-2 gap-12 mt-20 text-sm">
            <div className="text-center">
                <div className="border-t border-slate-800 pt-2">
                    <p className="font-bold">तयार गर्ने (Prepared By)</p>
                    <p>{formDetails.preparedBy.name}</p>
                    <p className="text-xs">{formDetails.preparedBy.designation}</p>
                </div>
            </div>
            <div className="text-center">
                <div className="border-t border-slate-800 pt-2">
                    <p className="font-bold">स्वीकृत गर्ने (Approved By)</p>
                    <p>{formDetails.approvedBy.name || '...................'}</p>
                    <p className="text-xs">कार्यालय प्रमुख</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
