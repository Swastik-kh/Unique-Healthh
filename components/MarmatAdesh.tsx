
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wrench, Plus, Trash2, Printer, Save, ArrowLeft, Clock, CheckCircle2, Send, Eye } from 'lucide-react';
import { LogoDisplay } from './LogoDisplay';
import { useReactToPrint } from 'react-to-print';
import { User, OrganizationSettings } from '../types/coreTypes';
import { MarmatEntry, MarmatItem, InventoryItem } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MarmatAdeshProps {
  currentFiscalYear: string;
  currentUser: User;
  marmatEntries: MarmatEntry[];
  onSaveMarmatEntry: (entry: MarmatEntry) => void;
  inventoryItems: InventoryItem[]; // Added Inventory Items Prop
  generalSettings: OrganizationSettings;
}

export const MarmatAdesh: React.FC<MarmatAdeshProps> = ({
  currentFiscalYear,
  currentUser,
  marmatEntries,
  onSaveMarmatEntry,
  inventoryItems,
  generalSettings
}) => {
  const [items, setItems] = useState<MarmatItem[]>([
    { id: Date.now(), name: '', codeNo: '', details: '', quantity: 0, unit: '', remarks: '' }
  ]);

  const [formDetails, setFormDetails] = useState({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: '',
    status: 'Pending' as 'Pending' | 'Approved' | 'Completed',
    requestedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' },
    recommendedBy: { name: '', designation: '', date: '' },
    approvedBy: { name: '', designation: '', date: '' },
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Marmat_Adesh',
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
    `
  });

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
    marmatEntries.filter(e => e.status === 'Pending').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [marmatEntries]);

  const myRequests = useMemo(() => 
    marmatEntries.filter(e => e.requestedBy.name.trim() === currentUser.fullName.trim()).sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [marmatEntries, currentUser]);

  const allHistory = useMemo(() =>
    marmatEntries.filter(e => e.status !== 'Pending').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [marmatEntries]);

  // 1. Prepare Item Options (Filtered by Non-Expendable & Sorted Alphabetically)
  const itemOptions = useMemo(() => {
    return inventoryItems
        .filter(item => item.itemType === 'Non-Expendable') // Only Maintenance for Assets
        .map(item => ({
            id: item.id,
            value: item.itemName,
            // Show Name and Code in dropdown for clarity
            label: `${item.itemName} (${item.uniqueCode || item.sanketNo || '-'})`,
            itemData: item // Pass full item to populate fields on select
        }))
        .sort((a, b) => a.label.localeCompare(b.label)); // Sort Alphabetically
  }, [inventoryItems]);

  // Auto-increment form number logic (Only for new forms)
  useEffect(() => {
    if (!formDetails.id) {
        const entriesInFY = marmatEntries.filter(e => e.fiscalYear === currentFiscalYear);
        const maxNo = entriesInFY.reduce((max, e) => Math.max(max, parseInt(e.formNo || '0')), 0);
        setFormDetails(prev => ({ ...prev, formNo: (maxNo + 1).toString(), date: todayBS, requestedBy: {...prev.requestedBy, date: todayBS} })); // FIX: pre-fill date
    }
  }, [currentFiscalYear, marmatEntries, formDetails.id, todayBS]);

  const handleAddItem = () => {
    if (items.length >= 14) return;
    setItems([...items, { id: Date.now(), name: '', codeNo: '', details: '', quantity: 0, unit: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof MarmatItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleLoadEntry = (entry: MarmatEntry, viewOnly: boolean = false) => {
      setFormDetails({
          id: entry.id,
          fiscalYear: entry.fiscalYear,
          formNo: entry.formNo,
          date: entry.date,
          status: entry.status,
          requestedBy: {
              name: entry.requestedBy.name,
              designation: entry.requestedBy.designation || '',
              date: entry.requestedBy.date || ''
          },
          recommendedBy: {
              name: entry.recommendedBy.name,
              designation: entry.recommendedBy.designation || '',
              date: entry.recommendedBy.date || ''
          },
          approvedBy: {
              name: entry.approvedBy.name,
              designation: entry.approvedBy.designation || '',
              date: entry.approvedBy.date || ''
          },
      });
      setItems(entry.items);
      setIsViewOnly(viewOnly);
      
      const formElement = document.getElementById('marmat-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReset = () => {
      setFormDetails({
        id: '',
        fiscalYear: currentFiscalYear,
        formNo: '1', 
        date: todayBS, // FIX: pre-fill date
        status: 'Pending',
        requestedBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }, // FIX: pre-fill date
        recommendedBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' },
      });
      setItems([{ id: Date.now(), name: '', codeNo: '', details: '', quantity: 0, unit: '', remarks: '' }]);
      setIsViewOnly(false);
      setIsSaved(false);
  }

  const handleSave = (statusToSet: 'Pending' | 'Approved' = 'Pending') => {
    // Validation for Date
    if (!formDetails.date || !formDetails.date.trim()) {
        alert('मिति अनिवार्य छ। कृपया मिति छान्नुहोस् (Date is required. Please select a date).');
        return;
    }

    const entry: MarmatEntry = {
        id: formDetails.id || Date.now().toString(),
        fiscalYear: formDetails.fiscalYear,
        formNo: formDetails.formNo,
        date: formDetails.date,
        items: items,
        status: statusToSet,
        requestedBy: formDetails.requestedBy,
        recommendedBy: formDetails.recommendedBy,
        approvedBy: statusToSet === 'Approved' ? { ...formDetails.approvedBy, name: currentUser.fullName, date: formDetails.date } : formDetails.approvedBy,
    };

    onSaveMarmatEntry(entry);
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        handleReset();
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* 1. APPROVAL REQUESTS (For Admin) */}
      {canApprove && pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden no-print mb-6">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-orange-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">स्वीकृति अनुरोधहरू (Pending Requests)</h3>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Order No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Requested By</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium text-orange-600">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.requestedBy.name}</td>
                              <td className="px-6 py-3 text-slate-600">{req.items.length} items</td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, false)}
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1"
                                  >
                                      <Eye size={14} /> Review & Approve
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
            <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                <Wrench size={24} />
            </div>
            <div>
                <h2 className="font-bold text-slate-700 font-nepali text-lg">मर्मत सम्भार आदेश (Maintenance Order)</h2>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500">फारम नं: ४०२</p>
                    {formDetails.status === 'Pending' && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 font-bold">Pending</span>}
                    {formDetails.status === 'Approved' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-bold">Approved</span>}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            {isViewOnly && (
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                    <Plus size={18} /> New Request
                </button>
            )}
            
            {!isViewOnly && (
                <>
                    {/* Approve Button for Admins */}
                    {(canApprove && formDetails.status === 'Pending' && formDetails.id) ? (
                        <button 
                            onClick={() => handleSave('Approved')} 
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <CheckCircle2 size={18} /> Approve
                        </button>
                    ) : (
                        /* Request Button */
                        <button 
                            onClick={() => handleSave('Pending')} 
                            disabled={isSaved || formDetails.status === 'Approved'}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${
                                isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'
                            }`}
                        >
                            {isSaved ? <CheckCircle2 size={18} /> : <Send size={18} />}
                            {isSaved ? 'Sent!' : 'Request Maintenance'}
                        </button>
                    )}
                </>
            )}

            <button onClick={() => handlePrint()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                <Printer size={18} /> Print
            </button>
        </div>
      </div>

      {/* 3. MAIN FORM CONTENT (A4 Layout - Form 402) */}
      <div ref={printRef} id="marmat-form-container" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none printable-content">
        
        {/* Top Right */}
        <div className="text-right text-[10px] font-bold mb-2">
            म.ले.प.फारम नं: ४०२
        </div>

        {/* Header */}
        <div className="mb-8">
             <div className="flex items-start justify-between">
                 {/* Left: Logo */}
                 <div className="w-24 flex justify-start pt-2">
                     <LogoDisplay settings={generalSettings} />
                 </div>
                 
                 {/* Center: Text */}
                 <div className="flex-1 text-center space-y-1">
                     <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                     {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                     {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                     {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                 </div>

                 {/* Right: Spacer */}
                 <div className="w-24"></div> 
             </div>
             
             <div className="text-center pt-6 pb-2">
                 <h2 className="text-xl font-bold underline underline-offset-4">मर्मत सम्भार अनुरोध/आदेश</h2>
             </div>
        </div>

        {/* Meta Info */}
        <div className="flex justify-between items-end mb-4">
            <div className="w-1/3">
                <div className="flex items-center gap-2">
                    <span>श्री:</span>
                    <input className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" placeholder="शाखा प्रमुख / प्रशासन"/>
                </div>
            </div>
            <div className="w-1/3 text-right space-y-1">
                <div className="flex items-center justify-end gap-2">
                    <span>अनुरोध नं:</span>
                    <input 
                        value={formDetails.formNo}
                        readOnly
                        className="border-b border-dotted border-slate-600 w-24 text-center outline-none bg-transparent font-bold text-red-600"
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <span>मिति <span className="text-red-500">*</span>:</span>
                    <NepaliDatePicker 
                        value={formDetails.date}
                        onChange={(val) => setFormDetails({...formDetails, date: val})}
                        format="YYYY/MM/DD"
                        label=""
                        hideIcon={true}
                        inputClassName="border-b border-dotted border-slate-600 w-32 text-center outline-none bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-slate-600"
                        wrapperClassName="w-32"
                        disabled={isViewOnly || formDetails.status === 'Approved'}
                        popupAlign="right"
                        minDate={todayBS}
                        maxDate={todayBS}
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <span>शाखा:</span>
                    <input className="border-b border-dotted border-slate-600 w-32 text-center outline-none bg-transparent" placeholder="स्वास्थ्य"/>
                </div>
            </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-slate-900 text-center align-middle">
            <thead>
                <tr className="bg-slate-50 text-xs">
                    <th className="border border-slate-900 p-2 w-12">क्र.सं.</th>
                    <th className="border border-slate-900 p-2 w-64">सामानको नाम</th>
                    <th className="border border-slate-900 p-2 w-32">सङ्केत नं.</th>
                    <th className="border border-slate-900 p-2">विवरण (के भएको हो?)</th>
                    <th className="border border-slate-900 p-2 w-20">परिमाण</th>
                    <th className="border border-slate-900 p-2 w-20">एकाई</th>
                    <th className="border border-slate-900 p-2 w-32">कैफियत</th>
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
                                    options={itemOptions}
                                    value={item.name}
                                    onChange={(val) => updateItem(item.id, 'name', val)}
                                    onSelect={(opt) => {
                                        // Auto-fill Code No and Unit from inventory
                                        const invItem = opt.itemData as InventoryItem;
                                        if (invItem) {
                                            updateItem(item.id, 'codeNo', invItem.uniqueCode || invItem.sanketNo || '');
                                            updateItem(item.id, 'unit', invItem.unit);
                                        }
                                    }}
                                    placeholder="Search Asset..."
                                    className="!border-none !bg-transparent !text-sm !p-0"
                                />
                            ) : (
                                <div className="w-full text-left px-2 py-1">
                                    {item.name}
                                </div>
                            )}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input 
                                disabled={isViewOnly} 
                                value={item.codeNo} 
                                onChange={(e) => updateItem(item.id, 'codeNo', e.target.value)} 
                                className="w-full bg-transparent text-center outline-none disabled:cursor-not-allowed" 
                            />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input 
                                disabled={isViewOnly} 
                                value={item.details} 
                                onChange={(e) => updateItem(item.id, 'details', e.target.value)} 
                                className="w-full bg-transparent text-left px-2 outline-none disabled:cursor-not-allowed" 
                                placeholder="Problem description"
                            />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input 
                                disabled={isViewOnly} 
                                type="number"
                                value={item.quantity || ''} 
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                                className="w-full bg-transparent text-center outline-none font-bold disabled:cursor-not-allowed" 
                            />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input 
                                disabled={isViewOnly} 
                                value={item.unit} 
                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)} 
                                className="w-full bg-transparent text-center outline-none disabled:cursor-not-allowed" 
                            />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input 
                                disabled={isViewOnly} 
                                value={item.remarks} 
                                onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} 
                                className="w-full bg-transparent text-left px-2 outline-none disabled:cursor-not-allowed" 
                            />
                        </td>
                        <td className="border border-slate-900 p-1 no-print">
                            {!isViewOnly && (
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        {!isViewOnly && (
            <div className="mt-2 no-print">
                <button 
                    onClick={handleAddItem} 
                    disabled={items.length >= 14}
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded transition-colors ${items.length >= 14 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-primary-50 text-primary-600 hover:text-primary-700'}`}
                >
                    <Plus size={14} /> Add Row (Max 14)
                </button>
            </div>
        )}

        <div className="mt-6 text-sm">
            <p>माथि उल्लेखित सामानहरूको मर्मत सम्भार गरिदिनु हुन अनुरोध छ ।</p>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-8 mt-12 text-sm">
            {/* Requested By */}
            <div>
                <div className="font-bold mb-4">अनुरोध गर्ने:</div>
                <div className="space-y-1">
                    <div className="flex gap-2">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.requestedBy.name} onChange={(e) => setFormDetails({...formDetails, requestedBy: {...formDetails.requestedBy, name: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly}/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.requestedBy.designation} onChange={(e) => setFormDetails({...formDetails, requestedBy: {...formDetails.requestedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly}/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.requestedBy.date} onChange={(e) => setFormDetails({...formDetails, requestedBy: {...formDetails.requestedBy, date: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly}/>
                    </div>
                </div>
            </div>

            {/* Recommended By */}
            <div>
                <div className="font-bold mb-4">सिफारिस गर्ने:</div>
                <div className="space-y-1">
                    <div className="flex gap-2">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.recommendedBy.name} onChange={(e) => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy, name: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly}/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.recommendedBy.designation} onChange={(e) => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly}/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.recommendedBy.date} onChange={(e) => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy, date: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly}/>
                    </div>
                </div>
            </div>

            {/* Approved By */}
            <div>
                <div className="font-bold mb-4">आदेश दिने (स्वीकृत):</div>
                <div className="space-y-1">
                    <div className="flex gap-2">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.approvedBy.name} onChange={(e) => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy, name: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly || !canApprove}/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.approvedBy.designation} onChange={(e) => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly || !canApprove}/>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.approvedBy.date} onChange={(e) => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy, date: e.target.value}})} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled={isViewOnly || !canApprove}/>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200">
            <p className="font-bold mb-2">मर्मत गर्ने (फर्म/निकाय/व्यक्ति):</p>
            <div className="flex gap-2">
                <span>नाम:</span>
                <input className="border-b border-dotted border-slate-600 w-64 outline-none bg-transparent" />
            </div>
        </div>

      </div>

      {/* 4. HISTORY VIEW */}
      {allHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden no-print mt-6">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-blue-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">मर्मत आदेश इतिहास (History)</h3>
                  </div>
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{allHistory.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Order No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Requested By</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {allHistory.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium text-orange-600">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.requestedBy.name}</td>
                              <td className="px-6 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                      req.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                      req.status === 'Completed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                      'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}>
                                      {req.status === 'Approved' && <CheckCircle2 size={12} />}
                                      {req.status}
                                  </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, true)}
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1"
                                  >
                                      <Eye size={14} /> View
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

    </div>
  );
};
