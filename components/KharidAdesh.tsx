
import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Printer, Save, ArrowLeft, CheckCircle2, X, Clock, FileText, Send, User, Building2, Calculator, Info, Package, AlertCircle, Search, ShieldCheck, Copy } from 'lucide-react';
import { PurchaseOrderEntry, FirmEntry, QuotationEntry, InventoryItem } from '../types/inventoryTypes';
import { User as UserType, OrganizationSettings, Option } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface KharidAdeshProps {
  orders: PurchaseOrderEntry[];
  currentFiscalYear: string;
  onSave: (order: PurchaseOrderEntry) => void;
  currentUser: UserType;
  firms: FirmEntry[];
  quotations: QuotationEntry[];
  onDakhilaClick: (po: PurchaseOrderEntry) => void;
  generalSettings: OrganizationSettings;
  inventoryItems: InventoryItem[];
}

export const KharidAdesh: React.FC<KharidAdeshProps> = ({
  orders,
  currentFiscalYear,
  onSave,
  currentUser,
  firms,
  quotations,
  onDakhilaClick,
  generalSettings,
  inventoryItems
}) => {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderEntry | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [formData, setFormData] = useState<PurchaseOrderEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // Role Logic
  const isStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isAccount = currentUser.role === 'ACCOUNT';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

  // Edit Permission: 
  const canEdit = !isViewOnly && (
      (isStoreKeeper && (formData?.status === 'Pending' || formData?.status === 'Pending Account'))
  );

  // Load form data when an order is selected
  useEffect(() => {
    if (selectedOrder) {
      const initializedOrder = {
          ...selectedOrder,
          items: selectedOrder.items.map(item => ({
              ...item,
              rate: item.rate || 0,
              totalAmount: item.totalAmount || ((parseFloat(item.quantity) || 0) * (item.rate || 0)),
              model: item.model || '',
              codeNo: item.codeNo || ''
          })),
          decisionNo: selectedOrder.decisionNo || '',
          decisionDate: selectedOrder.decisionDate || '',
          budgetDetails: selectedOrder.budgetDetails || { budgetSubHeadNo: '', expHeadNo: '', activityNo: '' },
          vatAmount: selectedOrder.vatAmount || 0 
      };
      setFormData(JSON.parse(JSON.stringify(initializedOrder)));
    }
  }, [selectedOrder]);

  const itemOptions = useMemo(() => {
    const uniqueItems = Array.from(new Set(inventoryItems.map(i => i.itemName))).map(name => {
        const item = inventoryItems.find(i => i.itemName === name);
        return {
            id: name,
            value: name,
            label: `${name} ${item?.unit ? `(${item.unit})` : ''}`,
            itemData: item
        };
    });
    return uniqueItems.sort((a, b) => a.label.localeCompare(b.label));
  }, [inventoryItems]);

  const firmOptions = useMemo(() => firms.map(f => ({
      id: f.id,
      value: f.id, 
      label: `${f.firmName} (PAN: ${f.vatPan})`
  })), [firms]);

  const getLowestQuoteTooltip = (itemName: string) => {
      if (!itemName) return null;
      const relatedQuotes = quotations.filter(q => 
          q.itemName.trim().toLowerCase() === itemName.trim().toLowerCase() && 
          q.fiscalYear === currentFiscalYear
      ).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

      if (relatedQuotes.length === 0) return `Item: ${itemName}\n(No quotations found)`;
      const best = relatedQuotes[0];
      return `Item: ${itemName}\nLowest Rate: Rs. ${best.rate}\nFirm: ${best.firmName}`;
  };

  const handleBack = () => {
      setSelectedOrder(null);
      setFormData(null);
      setIsViewOnly(false);
  };

  const handleVendorSelect = (option: Option) => {
      if (!formData) return;
      const firm = firms.find(f => f.id === option.value);
      if (firm) {
          setFormData({
              ...formData,
              vendorDetails: {
                  name: firm.firmName,
                  address: firm.address,
                  pan: firm.vatPan,
                  phone: firm.contactNo
              }
          });
      }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
      if (!formData) return;
      const updatedItems = [...formData.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      if (field === 'rate' || field === 'quantity') {
          const qty = parseFloat(field === 'quantity' ? value : updatedItems[index].quantity) || 0;
          const rate = parseFloat(field === 'rate' ? value : (updatedItems[index].rate || 0)) || 0;
          updatedItems[index].totalAmount = qty * rate;
      }
      setFormData({ ...formData, items: updatedItems });
  };

  const handlePoItemSelect = (index: number, option: Option) => {
      handleItemChange(index, 'name', option.value);
      if (option.itemData) {
          handleItemChange(index, 'unit', option.itemData.unit);
      }
  };

  const handleSaveOrder = (action: 'draft' | 'submit_account' | 'verify' | 'approve') => {
      if (!formData) return;
      
      let newStatus: PurchaseOrderEntry['status'] = formData.status;
      let updates: Partial<PurchaseOrderEntry> = {};
      const today = new NepaliDate().format('YYYY-MM-DD');

      if (action === 'draft') {
          newStatus = 'Pending';
          updates.preparedBy = { name: currentUser.fullName, designation: currentUser.designation, date: today };
      } else if (action === 'submit_account') {
          newStatus = 'Pending Account';
          updates.preparedBy = { name: currentUser.fullName, designation: currentUser.designation, date: today };
      } else if (action === 'verify') {
          newStatus = 'Account Verified';
          updates.financeBy = { name: currentUser.fullName, designation: currentUser.designation, date: today };
          
          if (!formData.orderNo) {
              const existingOrders = orders.filter(o => o.fiscalYear === currentFiscalYear && o.orderNo);
              let maxNum = 0;
              
              existingOrders.forEach(o => {
                  if (o.orderNo) {
                      const parts = o.orderNo.split('-');
                      const numPart = parseInt(parts[0]);
                      if (!isNaN(numPart) && numPart > maxNum) {
                          maxNum = numPart;
                      }
                  }
              });
              
              const nextNum = maxNum + 1;
              updates.orderNo = `${String(nextNum).padStart(3, '0')}-KH`;
          }
      } else if (action === 'approve') {
          newStatus = 'Completed'; 
          updates.approvedBy = { name: currentUser.fullName, designation: currentUser.designation, date: today };
      }

      onSave({ ...formData, ...updates, status: newStatus });
      alert(
          action === 'draft' ? "मस्यौदा सुरक्षित गरियो!" : 
          action === 'submit_account' ? "लेखा शाखामा पठाइयो!" : 
          action === 'verify' ? `लेखा द्वारा प्रमाणित गरियो! खरिद आदेश नं: ${updates.orderNo || formData.orderNo}` : 
          "खरिद आदेश स्वीकृत भयो!"
      );
      handleBack();
  };

  const handlePrint = () => {
    const printContent = document.getElementById('kharid-adesh-print-content');
    if (!printContent) {
        alert("प्रिन्ट गर्नको लागि सामग्री भेटिएन।");
        return;
    }

    // Force values into input attributes for printing
    const inputs = printContent.querySelectorAll('input');
    inputs.forEach((input: any) => {
        input.setAttribute('value', input.value);
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order Print</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 ${printOrientation}; margin: 10mm; }
          body { 
            font-family: 'Mukta', sans-serif; 
            padding: 20px; 
            margin: 0; 
            background: white; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          /* Ensure inputs look like text in print */
          input { background: transparent !important; border: none !important; color: black !important; font-weight: bold; }
          /* Only keep dotted border for signature lines if needed, but remove for table cells */
          .border-slate-900 { border-color: black !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .text-red-600 { color: #dc2626 !important; }
          
          /* Hide non-printable elements inside the container if any */
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .no-print-view { display: none !important; }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid black !important; padding: 4px; font-size: 16px; }
          th { background-color: #f3f4f6 !important; font-weight: bold; }

          /* Increase font size for signatures and budget text in print */
          .text-xs { font-size: 14px !important; }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: none;">
            ${printContent.innerHTML}
        </div>
        <script>
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 800);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000);
  };

  const filteredOrders = orders.filter(o => 
      o.magFormNo.includes(searchTerm) || 
      o.vendorDetails?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.status.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.requestDate.localeCompare(a.requestDate));

  // --- RENDER ---

  if (formData && selectedOrder) {
      const subTotal = formData.items.reduce((acc, item) => acc + (item.totalAmount || 0), 0);
      const grandTotal = subTotal + (formData.vatAmount || 0);
      
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                  <div className="flex items-center gap-4">
                      <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                          <ArrowLeft size={20} />
                      </button>
                      <div>
                          <h2 className="font-bold text-slate-700 font-nepali text-lg">खरिद आदेश विवरण (Purchase Order)</h2>
                          <div className="flex items-center gap-2">
                              <p className="text-sm text-slate-500">माग फारम नं: {formData.magFormNo}</p>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  formData.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-700' : 
                                  formData.status === 'Account Verified' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-orange-50 border-orange-200 text-orange-700'
                              }`}>
                                  {formData.status}
                              </span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      {!isViewOnly && (
                          <>
                              {isStoreKeeper && (formData.status === 'Pending' || formData.status === 'Pending Account') && (
                                  <>
                                      <button onClick={() => handleSaveOrder('draft')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-sm shadow-sm transition-colors border border-slate-300">
                                          <Save size={16} /> Save Draft
                                      </button>
                                      <button onClick={() => handleSaveOrder('submit_account')} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-bold text-sm shadow-sm transition-colors">
                                          <Send size={16} /> Submit to Account
                                      </button>
                                  </>
                              )}
                              {isAccount && formData.status === 'Pending Account' && (
                                  <button onClick={() => handleSaveOrder('verify')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-sm shadow-sm transition-colors">
                                      <ShieldCheck size={16} /> Verify & Generate PO No
                                  </button>
                              )}
                              {isAdmin && formData.status === 'Account Verified' && (
                                  <button onClick={() => handleSaveOrder('approve')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold text-sm shadow-sm transition-colors">
                                      <CheckCircle2 size={16} /> Final Approve
                                  </button>
                              )}
                          </>
                      )}
                      {(formData.status === 'Completed' || formData.status === 'Generated') && (
                          <button onClick={() => onDakhilaClick(formData)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold text-sm shadow-sm transition-colors">
                              <Package size={16} /> Create Dakhila
                          </button>
                      )}
                      {isStoreKeeper && (
                          <button 
                              onClick={() => {
                                  if(window.confirm('के तपाईं यो माग फारमबाट नयाँ खरिद आदेश (Duplicate) बनाउन चाहनुहुन्छ?')) {
                                      const newOrder = {
                                          ...formData,
                                          id: `PO-${formData.magFormId}-${Date.now()}`,
                                          status: 'Pending' as const,
                                          orderNo: '',
                                          decisionNo: '',
                                          decisionDate: '',
                                          vendorDetails: undefined,
                                          preparedBy: { name: '', designation: '', date: '' },
                                          recommendedBy: { name: '', designation: '', date: '', purpose: '' },
                                          financeBy: { name: '', designation: '', date: '', purpose: '' },
                                          approvedBy: { name: '', designation: '', date: '', purpose: '' }
                                      };
                                      onSave(newOrder);
                                      alert('नयाँ खरिद आदेश सिर्जना गरियो।');
                                      handleBack();
                                  }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-lg font-bold text-sm shadow-sm transition-colors"
                              title="एउटै माग फारमबाट अर्को खरिद आदेश बनाउनुहोस्"
                          >
                              <Copy size={16} /> नयाँ आदेश (Duplicate)
                          </button>
                      )}
                      
                      <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                          <button 
                              onClick={() => setPrintOrientation('portrait')} 
                              className={`px-7 py-1 text-xs font-bold rounded-md transition-all ${printOrientation === 'portrait' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              Portrait
                          </button>
                          <button 
                              onClick={() => setPrintOrientation('landscape')} 
                              className={`px-7 py-1 text-xs font-bold rounded-md transition-all ${printOrientation === 'landscape' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              Landscape
                          </button>
                      </div>

                      <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-bold text-sm shadow-sm transition-colors">
                          <Printer size={16} /> Print
                      </button>
                  </div>
              </div>

              {/* Exact Format per Image Request */}
              <div id="kharid-adesh-print-content" className={`bg-white p-10 md:p-14 max-w-[297mm] mx-auto min-h-[210mm] font-nepali text-slate-900 shadow-xl rounded-xl text-sm ${printOrientation === 'landscape' ? 'landscape-print' : ''}`}>
                  
                  {/* Top Header Section with Logo and Address */}
                  <div className="flex justify-between items-start mb-2">
                      <div className="w-32 pt-2">
                          <img 
                            src={generalSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                            className="h-28 w-28 object-contain" 
                            alt="Emblem"
                          />
                      </div>
                      
                      <div className="flex-1 text-center space-y-1">
                          <h1 className="text-2xl font-black text-red-600">{generalSettings.orgNameNepali}</h1>
                          <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>
                          {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                          {generalSettings.subTitleNepali3 && <h4 className="text-sm font-bold">{generalSettings.subTitleNepali3}</h4>}
                          
                          <div className="text-sm mt-1 font-medium">
                              {generalSettings.address && <span>{generalSettings.address}</span>}
                              {generalSettings.phone && <span> | फोन: {generalSettings.phone}</span>}
                              {generalSettings.email && <span> | ईमेल: {generalSettings.email}</span>}
                          </div>
                      </div>
                      
                      <div className="w-32 text-right">
                          <div className="text-[10px] font-bold">म.ले.प.फारम नं: ४०५</div>
                      </div>
                  </div>

                  <div className="text-center mb-8">
                      <h2 className="text-xl font-black underline mt-2">खरिद आदेश</h2>
                  </div>

                  <div className="flex justify-between items-start mb-6">
                      {/* Left Side: Vendor Info */}
                      <div className="w-1/2 space-y-3">
                          <div className="flex gap-2 items-center">
                              <span className="w-48">श्री (आदेश गरिएको व्यक्ति/फर्म/निकाय नाम):</span>
                              <div className="flex-1">
                                  {!isViewOnly ? (
                                      <SearchableSelect 
                                          options={firmOptions} 
                                          value={formData.vendorDetails?.name || ''} 
                                          onChange={() => {}} 
                                          onSelect={handleVendorSelect}
                                          placeholder="फर्म/सप्लायर्स छान्नुहोस्"
                                          className="!border-none !border-b !border-slate-800 !rounded-none !px-0"
                                      />
                                  ) : (
                                      <span className="font-bold border-b border-dotted border-slate-800 block">{formData.vendorDetails?.name}</span>
                                  )}
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <span className="w-16">ठेगाना :</span>
                              <span className="font-bold border-b border-dotted border-slate-800 flex-1">{formData.vendorDetails?.address}</span>
                          </div>
                          <div className="flex gap-2">
                              <span className="w-40">स्थायी लेखा (PAN/VAT) नम्बर:</span>
                              <span className="font-bold border-b border-dotted border-slate-800 flex-1">{formData.vendorDetails?.pan}</span>
                          </div>
                          <div className="flex gap-2">
                              <span className="w-16">फोन नं.</span>
                              <span className="font-bold border-b border-dotted border-slate-800 flex-1">{formData.vendorDetails?.phone}</span>
                          </div>
                      </div>

                      {/* Right Side: PO Details */}
                      <div className="w-1/3 space-y-2 text-right">
                          <div className="flex justify-end gap-2">
                              <span>आर्थिक वर्ष :</span>
                              <span className="font-bold w-24 text-center">{formData.fiscalYear}</span>
                          </div>
                          <div className="flex justify-end gap-2 items-center">
                              <span>खरिद आदेश नं :</span>
                              <input 
                                  value={formData.orderNo || ''} 
                                  readOnly 
                                  className="w-24 text-right border-b border-dotted border-slate-800 bg-transparent outline-none font-bold text-red-600" 
                                  placeholder="Auto"
                              />
                          </div>
                          <div className="flex justify-end gap-2 items-center">
                              <span>खरिद आदेश मिति :</span>
                              <NepaliDatePicker 
                                  value={formData.decisionDate || new NepaliDate().format('YYYY-MM-DD')} 
                                  onChange={(v) => setFormData({...formData, decisionDate: v})} 
                                  hideIcon 
                                  label="" 
                                  inputClassName="text-right w-24 border-b border-dotted border-slate-800 bg-transparent outline-none" 
                              />
                          </div>
                          <div className="flex justify-end gap-2 items-center">
                              <span>खरिद सम्बन्धी निर्णय नं :</span>
                              <input 
                                  value={formData.decisionNo || ''} 
                                  onChange={(e) => setFormData({...formData, decisionNo: e.target.value})}
                                  disabled={!canEdit}
                                  className="w-24 text-right border-b border-dotted border-slate-800 bg-transparent outline-none" 
                              />
                          </div>
                          <div className="flex justify-end gap-2 items-center">
                              <span>निर्णय मिति :</span>
                              <NepaliDatePicker 
                                  value={formData.decisionDate || ''} 
                                  onChange={(v) => setFormData({...formData, decisionDate: v})} 
                                  hideIcon 
                                  label="" 
                                  inputClassName="text-right w-24 border-b border-dotted border-slate-800 bg-transparent outline-none" 
                              />
                          </div>
                      </div>
                  </div>

                  {/* Table Section */}
                  <table className="w-full border-collapse border border-slate-900 text-xs text-center mb-6">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="border border-slate-900 p-2 w-10" rowSpan={2}>क्र.सं.</th>
                              <th className="border border-slate-900 p-2 font-black text-black" colSpan={2}>सम्पत्ति तथा जिन्सी मालसामानको</th>
                              <th className="border border-slate-900 p-2" rowSpan={2}>स्पेसिफिकेसन</th>
                              <th className="border border-slate-900 p-2" rowSpan={2}>मोडल</th>
                              <th className="border border-slate-900 p-2 w-16" rowSpan={2}>एकाई</th>
                              <th className="border border-slate-900 p-2 w-20" rowSpan={2}>परिमाण</th>
                              <th className="border border-slate-900 p-2" colSpan={2}>मूल्य(मू.अ.क. बाहेक)</th>
                              <th className="border border-slate-900 p-2" rowSpan={2}>कैफियत</th>
                          </tr>
                          <tr>
                              <th className="border border-slate-900 p-2 w-24">सङ्केत नं</th>
                              <th className="border border-slate-900 p-2 font-black text-black">नाम</th>
                              <th className="border border-slate-900 p-2 w-24">दर</th>
                              <th className="border border-slate-900 p-2 w-24">जम्मा</th>
                          </tr>
                      </thead>
                      <tbody>
                          {formData.items.map((item, index) => (
                              <tr key={index}>
                                  <td className="border border-slate-900 p-1">{index + 1}</td>
                                  <td className="border border-slate-900 p-1">
                                      <div className="hidden print-only font-bold text-black">{item.codeNo}</div>
                                      <input value={item.codeNo || ''} onChange={e => handleItemChange(index, 'codeNo', e.target.value)} disabled={!canEdit} className="w-full bg-transparent text-center outline-none no-print-view" />
                                  </td>
                                  <td className="border border-slate-900 p-1 text-left px-2 font-black text-black" title={getLowestQuoteTooltip(item.name) || ''}>
                                      <div className="hidden print-only font-black text-black">{item.name}</div>
                                      <div className="no-print-view">
                                          {!isViewOnly ? (
                                              <SearchableSelect
                                                  options={itemOptions}
                                                  value={item.name}
                                                  onChange={newName => handleItemChange(index, 'name', newName)}
                                                  onSelect={(option) => handlePoItemSelect(index, option)} 
                                                  placeholder=""
                                                  className="!border-none !bg-transparent !p-0 !text-xs !font-black !text-black"
                                                  label=""
                                                  disabled={!canEdit}
                                              />
                                          ) : (
                                              <span className="block px-1 font-black text-black">{item.name}</span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                      <input value={item.specification} onChange={e => handleItemChange(index, 'specification', e.target.value)} disabled={!canEdit} className="w-full bg-transparent text-center outline-none" />
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                      <input value={item.model || ''} onChange={e => handleItemChange(index, 'model', e.target.value)} disabled={!canEdit} className="w-full bg-transparent text-center outline-none" />
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                      <input value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} disabled={!canEdit} className="w-full bg-transparent text-center outline-none" />
                                  </td>
                                  <td className="border border-slate-900 p-1 font-bold">
                                      {item.quantity}
                                  </td>
                                  <td className="border border-slate-900 p-1">
                                      <input type="number" value={item.rate || ''} onChange={e => handleItemChange(index, 'rate', e.target.value)} disabled={!canEdit} className="w-full bg-transparent text-right outline-none" placeholder="" />
                                  </td>
                                  <td className="border border-slate-900 p-1 text-right px-2 font-bold">
                                      {(item.totalAmount || 0).toFixed(2)}
                                  </td>
                                  <td className="border border-slate-900 p-1 relative group">
                                      <input value={item.remarks} onChange={e => handleItemChange(index, 'remarks', e.target.value)} disabled={!canEdit} className="w-full bg-transparent outline-none pr-6" />
                                      {canEdit && (
                                          <button 
                                              onClick={() => {
                                                  const newItems = formData.items.filter((_, i) => i !== index);
                                                  setFormData({...formData, items: newItems});
                                              }}
                                              className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 transition-opacity"
                                              title="हटाउनुहोस्"
                                          >
                                              <X size={14} />
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                      <tfoot>
                          <tr>
                              <td colSpan={8} className="border border-slate-900 p-2 text-right font-bold">जम्मा रकम</td>
                              <td className="border border-slate-900 p-2 text-right font-bold">{subTotal.toFixed(2)}</td>
                              <td className="border border-slate-900 p-2"></td>
                          </tr>
                          <tr>
                              <td colSpan={8} 
                                className="border border-slate-900 p-2 text-right font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => {
                                    if(canEdit) {
                                        const calcVat = subTotal * 0.13;
                                        setFormData({...formData, vatAmount: parseFloat(calcVat.toFixed(2))});
                                    }
                                }}
                                title="Click to auto calculate 13% VAT"
                              >
                                भ्याट/कर (VAT/Tax) <span className="text-[10px] text-slate-500 font-normal no-print">(Click for 13%)</span>
                              </td>
                              <td className="border border-slate-900 p-2 text-right font-bold relative group">
                                  <input 
                                      type="number" 
                                      value={formData.vatAmount || ''} 
                                      onChange={(e) => setFormData({...formData, vatAmount: parseFloat(e.target.value) || 0})}
                                      disabled={!canEdit}
                                      className="w-full bg-transparent text-right outline-none font-bold pr-5"
                                      placeholder="0.00"
                                  />
                                  {formData.vatAmount > 0 && canEdit && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setFormData({...formData, vatAmount: 0}); }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 no-print"
                                        title="Clear"
                                      >
                                          <X size={14} />
                                      </button>
                                  )}
                              </td>
                              <td className="border border-slate-900 p-2"></td>
                          </tr>
                          <tr>
                              <td colSpan={8} className="border border-slate-900 p-2 text-right font-bold">कुल जम्मा रकम</td>
                              <td className="border border-slate-900 p-2 text-right font-bold">{grandTotal.toFixed(2)}</td>
                              <td className="border border-slate-900 p-2"></td>
                          </tr>
                      </tfoot>
                  </table>

                  {/* Signatures Section 1 (Prepared & Recommended) */}
                  <div className="grid grid-cols-2 gap-10 text-xs mb-4">
                      <div className="space-y-1">
                          <p className="font-bold mb-4">तयार गर्ने : ......</p>
                          <div className="flex gap-2"><span>नाम:</span> <span>{formData.preparedBy?.name}</span></div>
                          <div className="flex gap-2"><span>पद:</span> <span>{formData.preparedBy?.designation}</span></div>
                          <div className="flex gap-2"><span>मिति:</span> <span>{formData.preparedBy?.date}</span></div>
                      </div>
                      <div className="space-y-1 text-right">
                          <p className="font-bold mb-4 text-left pl-20">सिफारिस गर्ने : ........</p>
                          <div className="flex gap-2 justify-start pl-20"><span>नाम:</span> <span>{formData.recommendedBy?.name}</span></div>
                          <div className="flex gap-2 justify-start pl-20"><span>पद:</span> <span>{formData.recommendedBy?.designation}</span></div>
                          <div className="flex gap-2 justify-start pl-20"><span>मिति:</span> <span>{formData.recommendedBy?.date}</span></div>
                      </div>
                  </div>

                  {/* Budget Text */}
                  <div className="border-t border-b border-slate-900 py-2 my-4 text-xs font-medium">
                      उल्लेखित सामानहरु बजेट उपशीर्षक नं.<input value={formData.budgetDetails?.budgetSubHeadNo || ''} onChange={e => setFormData({...formData, budgetDetails: {...formData.budgetDetails, budgetSubHeadNo: e.target.value}})} className="border-b border-dotted border-slate-800 w-16 text-center outline-none bg-transparent"/> को खर्च शीर्षक न <input value={formData.budgetDetails?.expHeadNo || ''} onChange={e => setFormData({...formData, budgetDetails: {...formData.budgetDetails, expHeadNo: e.target.value}})} className="border-b border-dotted border-slate-800 w-16 text-center outline-none bg-transparent"/> को क्रियाकलाप नं.<input value={formData.budgetDetails?.activityNo || ''} onChange={e => setFormData({...formData, budgetDetails: {...formData.budgetDetails, activityNo: e.target.value}})} className="border-b border-dotted border-slate-800 w-16 text-center outline-none bg-transparent"/> बाट भुक्तानी दिन बजेट बाँकी रहेको देखिन्छ ।
                  </div>

                  {/* Signatures Section 2 (Finance & Approved) */}
                  <div className="grid grid-cols-2 gap-10 text-xs mt-6">
                      <div className="space-y-1">
                          <p className="font-bold mb-4">आर्थिक प्रशासन शाखा : ........</p>
                          <div className="flex gap-2"><span>नाम:</span> <span>{formData.financeBy?.name}</span></div>
                          <div className="flex gap-2"><span>पद:</span> <span>{formData.financeBy?.designation}</span></div>
                          <div className="flex gap-2"><span>मिति:</span> <span>{formData.financeBy?.date}</span></div>
                      </div>
                      <div className="space-y-1 text-right">
                          <p className="font-bold mb-4 text-left pl-20">स्वीकृत गर्ने :</p>
                          <div className="flex gap-2 justify-start pl-20"><span>नाम:</span> <span>{formData.approvedBy?.name}</span></div>
                          <div className="flex gap-2 justify-start pl-20"><span>पद:</span> <span>{formData.approvedBy?.designation}</span></div>
                          <div className="flex gap-2 justify-start pl-20"><span>मिति:</span> <span>{formData.approvedBy?.date}</span></div>
                      </div>
                  </div>

              </div>
          </div>
      );
  }

  // List View
  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
              <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600"><ShoppingCart size={24} /></div>
                  <div>
                      <h2 className="text-xl font-bold text-slate-800 font-nepali">खरिद आदेश (Purchase Orders)</h2>
                      <p className="text-sm text-slate-500 font-nepali">सिर्जना गरिएको माग फारमबाट खरिद आदेश व्यवस्थापन गर्नुहोस्</p>
                  </div>
              </div>
              <div className="relative w-72">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search orders..." 
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-green-500/10 outline-none text-sm transition-all"
                  />
              </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                      <tr>
                          <th className="px-6 py-4">माग फारम नं</th>
                          <th className="px-6 py-4">मिति</th>
                          <th className="px-6 py-4">सामान संख्या</th>
                          <th className="px-6 py-4">स्थिति</th>
                          <th className="px-6 py-4 text-right">कार्य</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredOrders.length === 0 ? (
                          <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">कुनै आदेश फेला परेन (No orders found)</td></tr>
                      ) : (
                          filteredOrders.map(order => (
                              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">#{order.magFormNo}</td>
                                  <td className="px-6 py-4 font-nepali">{order.requestDate}</td>
                                  <td className="px-6 py-4 flex items-center gap-2">
                                      <Package size={16} className="text-slate-400" /> {order.items.length} Items
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                          order.status === 'Completed' || order.status === 'Generated' ? 'bg-green-50 text-green-700 border-green-200' : 
                                          order.status === 'Account Verified' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          'bg-orange-50 text-orange-700 border-orange-200'
                                      }`}>
                                          <Clock size={10} /> {order.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                          onClick={() => { setSelectedOrder(order); setIsViewOnly(false); }}
                                          className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                      >
                                          विवरण / प्रक्रिया
                                      </button>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );
};