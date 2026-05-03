
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck, Info, ListFilter, ClipboardList, History } from 'lucide-react';
import { User, Option, OrganizationSettings } from '../types/coreTypes';
import { MagItem, MagFormEntry, InventoryItem, Store, StoreKeeperSignature, ItemEntry } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
import { LogoDisplay } from './LogoDisplay';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface LocalMagItem extends MagItem {
  isFromInventory?: boolean;
}

interface MagFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  existingForms: MagFormEntry[];
  onSave: (form: MagFormEntry) => void;
  onDelete?: (formId: string) => void;
  inventoryItems: InventoryItem[];
  itemList: ItemEntry[];
  stores?: Store[];
  generalSettings: OrganizationSettings;
}

export const MagFaram: React.FC<MagFaramProps> = ({ currentFiscalYear, currentUser, existingForms, onSave, onDelete, inventoryItems, itemList, generalSettings, stores = [] }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Stock Tooltip
  const [hoveredStock, setHoveredStock] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  const isStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isAccount = currentUser.role === 'ACCOUNT';
  const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
  const isPrivileged = isStoreKeeper || isAccount || isApprover;

  const todayBS = useMemo(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  }, []);

  const [items, setItems] = useState<LocalMagItem[]>([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  
  const [formDetails, setFormDetails] = useState<MagFormEntry>({
    id: '', items: [], fiscalYear: currentFiscalYear, formNo: '', date: todayBS, status: 'Pending',
    demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
    recommendedBy: { name: '', designation: '', date: '' },
    storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false },
    approvedBy: { name: '', designation: '', date: '' },
    receiver: { name: '', designation: '', date: '' },
    issueItemType: 'Expendable'
  });

  const filteredForms = useMemo(() => {
    return existingForms.filter(f => {
        const matchesSearch = f.formNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             f.demandBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (!isPrivileged && f.demandBy?.name !== currentUser.fullName) return false;
        
        if (activeTab === 'requests') {
            // Storekeeper sees 'Pending' requests to Verify
            if (isStoreKeeper) return f.status === 'Pending';
            // Approver sees 'Verified' requests to Approve
            if (isApprover) return f.status === 'Verified';
            // Fallback
            return f.status === 'Pending' || f.status === 'Verified';
        } else {
            // History tab logic
            if (isStoreKeeper) return f.status !== 'Pending';
            if (isApprover) return f.status === 'Approved' || f.status === 'Rejected';
            return f.status === 'Approved' || f.status === 'Rejected' || f.status === 'Verified';
        }
    }).sort((a, b) => b.formNo.localeCompare(a.formNo));
  }, [existingForms, activeTab, isStoreKeeper, isApprover, isPrivileged, currentUser.fullName, searchTerm]);

  const pendingBadgeCount = useMemo(() => {
      return existingForms.filter(f => {
          if (!isPrivileged) return f.demandBy?.name === currentUser.fullName && (f.status === 'Pending' || f.status === 'Verified');
          if (isStoreKeeper) return f.status === 'Pending';
          if (isApprover) return f.status === 'Verified';
          return false;
      }).length;
  }, [existingForms, isStoreKeeper, isApprover, isPrivileged, currentUser.fullName]);

  const itemOptions = useMemo(() => {
    const itemMap = new Map<string, { totalQty: number, type: string, unit: string }>();
    inventoryItems.forEach(item => {
        const key = item.itemName.trim();
        const existing = itemMap.get(key);
        if (existing) existing.totalQty += (item.currentQuantity || 0);
        else itemMap.set(key, { totalQty: item.currentQuantity || 0, type: item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने', unit: item.unit });
    });
    // Add items from itemList
    itemList.forEach(item => {
        const key = item.itemName.trim();
        if (!itemMap.has(key)) {
            itemMap.set(key, { totalQty: 0, type: 'नयाँ', unit: item.unit });
        }
    });
    return Array.from(itemMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, data]) => ({ id: name, value: name, label: `${name} ${data.totalQty > 0 ? `(${data.totalQty} ${data.unit})` : ''} [${data.type}]` }));
  }, [inventoryItems, itemList]);

  useEffect(() => {
    if (!editingId && !formDetails.id) {
        const formsInCurrentFY = existingForms.filter(f => f.fiscalYear === currentFiscalYear);
        const maxNum = formsInCurrentFY.reduce((max, f) => {
            const matchNew = f.formNo.match(/^(\d+)-MF$/);
            if (matchNew) return Math.max(max, parseInt(matchNew[1], 10));
            const parts = f.formNo.split('-');
            const numPart = parts.length > 1 ? parseInt(parts[parts.length - 1]) : 0;
            if (!isNaN(numPart) && numPart > 0 && numPart < 10000) return Math.max(max, numPart);
            return max;
        }, 0);
        const nextNum = maxNum + 1;
        setFormDetails(prev => ({ ...prev, formNo: `${String(nextNum).padStart(4, '0')}-MF` }));
    }
  }, [editingId, existingForms, currentFiscalYear, formDetails.id]);

  const handleAddItem = () => {
    // Limit restored to 14
    if (isViewOnly || items.length >= 14) return;
    setItems([...items, { id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  };

  const handleRemoveItem = (id: number) => {
    if (isViewOnly) return;
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : [{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  };

  const handleItemNameChange = useCallback((id: number, newName: string) => {
    console.log("handleItemNameChange called with:", id, newName);
    console.log("itemList:", itemList);
    setItems(prev => prev.map(item => {
        if (item.id === id) {
            let existing = inventoryItems.find(i => i.itemName.trim().toLowerCase() === newName.trim().toLowerCase());
            console.log("Existing in inventory:", existing);
            if (existing) return { ...item, name: newName, isFromInventory: true, codeNo: existing.uniqueCode || existing.sanketNo || '', unit: existing.unit, specification: existing.specification || '' };
            
            // Check in itemList if not found in inventoryItems
            let fromItemList = itemList.find(i => i.itemName.trim().toLowerCase() === newName.trim().toLowerCase());
            console.log("From itemList:", fromItemList);
            if (fromItemList) return { ...item, name: newName, isFromInventory: false, codeNo: '', unit: fromItemList.unit, specification: '' };
            
            return { ...item, name: newName, isFromInventory: false, codeNo: '', unit: '', specification: '' };
        }
        return item;
    }));
  }, [inventoryItems, itemList]);

  const updateItemField = useCallback((id: number, field: keyof LocalMagItem, value: any) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const handleLoadForm = (form: MagFormEntry, viewOnly: boolean = false) => {
      setEditingId(form.id);
      setIsViewOnly(viewOnly);
      setItems(form.items.map((item, idx) => {
          const existing = inventoryItems.find(inv => inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase());
          return { ...item, id: item.id || (Date.now() + idx + Math.random()), isFromInventory: !!existing };
      }));
      setFormDetails({ ...form });
  };

  const handleReset = () => {
    setEditingId(null); setIsViewOnly(false); setValidationError(null); setSuccessMessage(null); setIsSaved(false);
    setItems([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails(prev => ({ 
        ...prev, id: '', items: [], status: 'Pending', 
        demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
        receiver: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false },
        approvedBy: { name: '', designation: '', date: '' }
    }));
  };

  const handleSave = () => {
    if (!formDetails.date?.trim()) { setValidationError("मिति भर्नुहोस्।"); return; }
    if (!formDetails.demandBy?.purpose?.trim()) { setValidationError("मागको प्रयोजन भर्नुहोस्।"); return; }
    const validItems = items.filter(item => item.name.trim() !== '' || item.quantity.trim() !== '');
    if (validItems.length === 0) { setValidationError("कम्तिमा एउटा सामानको विवरण भर्नुहोस्।"); return; }

    let finalStatus = formDetails.status || 'Pending';
    let finalRecommendedBy = { ...formDetails.recommendedBy };
    let finalApprovedBy = { ...formDetails.approvedBy };
    let finalStoreKeeper = { ...formDetails.storeKeeper };

    // WORKFLOW LOGIC:
    // 1. If Storekeeper is saving a 'Pending' form, it becomes 'Verified'.
    if (isStoreKeeper && formDetails.status === 'Pending') {
        if (!formDetails.storeKeeper?.marketRequired && !formDetails.storeKeeper?.inStock) {
            setValidationError("बजारबाट खरिद गर्ने वा मौज्दातमा रहेको मध्ये कम्तिमा एउटा छान्नुहोस्।");
            return;
        }
        
        if (formDetails.storeKeeper?.inStock) {
            const today = new NepaliDate().format('YYYY-MM-DD');
            for (const item of items) {
                if (item.name.trim() === '') continue;
                
                const matchingInventory = inventoryItems.filter(inv => inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase());
                
                const totalStock = matchingInventory.reduce((sum, inv) => sum + (inv.currentQuantity || 0), 0);
                const nonExpiredStock = matchingInventory
                    .filter(inv => !inv.expiryDateBs || inv.expiryDateBs > today)
                    .reduce((sum, inv) => sum + (inv.currentQuantity || 0), 0);
                
                const requestedQty = parseFloat(item.quantity) || 0;
                
                if (requestedQty > totalStock) {
                    setValidationError(`सामान '${item.name}' को लागि पर्याप्त मौज्दात छैन। माग गरिएको: ${requestedQty}, उपलब्ध: ${totalStock}`);
                    return;
                }

                if (requestedQty > nonExpiredStock) {
                    if (nonExpiredStock === 0) {
                        setValidationError(`सामान '${item.name}' को मौज्दात म्याद नाघेको (Expired) छ र अन्य ब्याच उपलब्ध छैन। कृपया प्रमाणित नगर्नुहोस्।`);
                    } else {
                        setValidationError(`सामान '${item.name}' को लागि पर्याप्त म्याद ननाघेको (Non-Expired) मौज्दात छैन। उपलब्ध म्याद ननाघेको मौज्दात: ${nonExpiredStock}`);
                    }
                    return;
                }
            }
        }
        
        finalStatus = 'Verified';
        finalRecommendedBy = { name: currentUser.fullName, designation: currentUser.designation, date: todayBS };
        // Ensure storekeeper details are captured
        finalStoreKeeper = {
            ...finalStoreKeeper,
            name: currentUser.fullName,
            date: todayBS,
            verified: true
        };
    } 
    // 2. If Approver is saving a 'Verified' form, it becomes 'Approved'.
    else if (isApprover && formDetails.status === 'Verified') {
        finalStatus = 'Approved';
        finalApprovedBy = { name: currentUser.fullName, designation: currentUser.designation, date: todayBS };
    }

    onSave({
        ...formDetails,
        id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
        items: validItems.map(({ isFromInventory, ...rest }) => rest),
        status: finalStatus,
        recommendedBy: finalRecommendedBy,
        storeKeeper: finalStoreKeeper,
        approvedBy: finalApprovedBy
    });
    
    setSuccessMessage(finalStatus === 'Approved' ? "माग फारम सफलतापूर्वक स्वीकृत भयो।" : (finalStatus === 'Verified' ? "माग फारम प्रमाणित गरी स्वीकृतिका लागि पठाइयो।" : "माग फारम सुरक्षित गरियो।"));
    setIsSaved(true);
    setTimeout(handleReset, 1500);
  };

  const printOfficialForm = () => {
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

      const printableItems = items.filter(item => item.name && item.name.trim() !== '');

      const rowsHtml = printableItems.map((item, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="text-align: left; padding-left: 8px; font-weight: 600;">${item.name}</td>
          <td style="text-align: center;">${item.specification || '-'}</td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="text-align: left; padding-left: 8px;">${item.remarks || ''}</td>
        </tr>
      `).join('');

      const marketChecked = formDetails.storeKeeper?.marketRequired ? 'checked' : '';
      const stockChecked = formDetails.storeKeeper?.inStock ? 'checked' : '';

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mag Faram Print</title>
          <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: 'Mukta', sans-serif; padding: 0; margin: 0; background: white; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header-red { color: #dc2626 !important; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1.5px solid black; }
            th, td { border: 1px solid black; padding: 6px 8px; font-size: 14px; vertical-align: middle; }
            th { background-color: #f3f4f6; font-weight: 800; font-size: 15px; }
            
            .dotted-line { border-bottom: 1px dotted black; display: inline-block; min-width: 120px; text-align: center; font-weight: bold; }
            .checkbox-box { display: inline-block; width: 16px; height: 16px; border: 1px solid black; margin-right: 6px; vertical-align: middle; position: relative; }
            .checkbox-box.checked::after { content: '✓'; position: absolute; top: -6px; left: 2px; font-size: 20px; font-weight: bold; }
            
            /* Header Specifics */
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; position: relative; }
            .logo-container { width: 15%; text-align: left; }
            .center-text { text-align: center; width: 70%; }
            .form-no-container { width: 15%; text-align: right; }
            
            .form-no-box { border: 1px solid black; padding: 4px 10px; font-size: 12px; font-weight: bold; display: inline-block; }
            
            .org-name { font-size: 28px; font-weight: 900; line-height: 1.2; margin: 0; margin-bottom: 5px; }
            .office-name { font-size: 18px; font-weight: 700; margin: 2px 0; }
            .sub-title { font-size: 16px; font-weight: 600; margin: 2px 0; }
            .sub-title-3 { font-size: 14px; font-weight: 600; margin: 2px 0; }
            .address-text { font-size: 14px; margin-top: 4px; font-weight: 500; }
            
            .form-title { margin-top: 20px; font-size: 24px; font-weight: 900; text-decoration: underline; text-underline-offset: 6px; }
            
            /* Updated Meta Info for Print */
            .meta-info-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; margin-bottom: 5px; font-weight: bold; font-size: 14px; }
            
            .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 40px; font-size: 14px; }
            .sig-block { margin-bottom: 30px; }
            .sig-title { font-weight: 800; border-bottom: 1px solid black; display: inline-block; margin-bottom: 12px; font-size: 15px; }
            .sig-line { margin-bottom: 8px; display: flex; align-items: center; }
            .w-label { width: 60px; display: inline-block; font-weight: 600; }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 210mm; margin: 0 auto;">
            
            <!-- Header Section -->
            <div class="header-container">
               <!-- Logo -->
               <div class="logo-container">
                  <img src="${generalSettings.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'}" style="width: 90px; height: auto;" />
               </div>

               <!-- Center Text -->
               <div class="center-text">
                  <h1 class="header-red org-name">${generalSettings.orgNameNepali}</h1>
                  ${generalSettings.subTitleNepali ? `<h2 class="office-name">${generalSettings.subTitleNepali}</h2>` : ''}
                  ${generalSettings.subTitleNepali2 ? `<h3 class="sub-title">${generalSettings.subTitleNepali2}</h3>` : ''}
                  ${generalSettings.subTitleNepali3 ? `<h4 class="sub-title-3">${generalSettings.subTitleNepali3}</h4>` : ''}
                  <div class="address-text">${[generalSettings.address, generalSettings.phone ? `फोन: ${generalSettings.phone}` : '', generalSettings.email ? `ईमेल: ${generalSettings.email}` : ''].filter(Boolean).join(' | ')}</div>
                  <div class="form-title">माग फारम</div>
               </div>

               <!-- Form No (Top Right) -->
               <div class="form-no-container">
                  <div class="form-no-box">
                    म.ले.प.फा.नं. ४०१
                  </div>
               </div>
            </div>

            <!-- Meta Info Section (Fiscal Year Left, Date/No Right) -->
            <div class="meta-info-container">
               <div>
                  आर्थिक वर्ष: <span class="dotted-line">${formDetails.fiscalYear}</span>
               </div>
               <div style="text-align: right;">
                  <div style="margin-bottom: 6px;">माग नं: <span class="header-red dotted-line">#${formDetails.formNo}</span></div>
                  <div>मिति: <span class="dotted-line">${formDetails.date}</span></div>
               </div>
            </div>

            <!-- Table -->
            <table>
              <thead>
                <tr>
                  <th rowspan="2" style="width: 50px;">क्र.सं.</th>
                  <th colspan="2">जिन्सी मालसामानको विवरण</th>
                  <th rowspan="2" style="width: 70px;">एकाई</th>
                  <th rowspan="2" style="width: 100px;">माग गरिएको<br/>परिमाण</th>
                  <th rowspan="2">कैफियत</th>
                </tr>
                <tr>
                  <th>नाम</th>
                  <th>स्पेसिफिकेसन</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Signatures Section -->
            <div class="signatures-grid">
              <!-- Left Column -->
              <div>
                <div class="sig-block">
                  <div class="sig-title">माग गर्नेको दस्तखत</div>
                  <div class="sig-line"><span class="w-label">नाम:</span> <span style="font-weight: bold;">${formDetails.demandBy?.name || ''}</span></div>
                  <div class="sig-line"><span class="w-label">पद:</span> <span>${formDetails.demandBy?.designation || ''}</span></div>
                  <div class="sig-line"><span class="w-label">मिति:</span> <span>${formDetails.demandBy?.date || ''}</span></div>
                  <div class="sig-line"><span class="w-label">प्रयोजन:</span> <span class="dotted-line" style="text-align: left; padding-left: 5px; min-width: 150px;">${formDetails.demandBy?.purpose || ''}</span></div>
                </div>

                <div class="sig-block" style="margin-top: 40px;">
                  <div class="sig-title">मालसामान बुझिलिनेको दस्तखत</div>
                  <div class="sig-line"><span class="w-label">नाम:</span> <span class="dotted-line">${formDetails.receiver?.name || ''}</span></div>
                  <div class="sig-line"><span class="w-label">पद:</span> <span class="dotted-line">${formDetails.receiver?.designation || ''}</span></div>
                  <div class="sig-line"><span class="w-label">मिति:</span> <span class="dotted-line">${formDetails.receiver?.date || ''}</span></div>
                </div>
              </div>

              <!-- Right Column -->
              <div>
                <div class="sig-block">
                  <div style="margin-bottom: 15px; font-size: 14px;">
                     <div style="margin-bottom: 6px;"><span class="checkbox-box ${marketChecked}"></span> बजारबाट खरिद गर्नु पर्ने</div>
                     <div><span class="checkbox-box ${stockChecked}"></span> मौज्दातमा रहेको</div>
                  </div>
                  <div class="sig-title">सिफारिस गर्नेको दस्तखत</div>
                  <div class="sig-line"><span class="w-label">नाम:</span> <span class="dotted-line">${formDetails.recommendedBy?.name || ''}</span></div>
                  <div class="sig-line"><span class="w-label">पद:</span> <span class="dotted-line">${formDetails.recommendedBy?.designation || ''}</span></div>
                  <div class="sig-line"><span class="w-label">मिति:</span> <span class="dotted-line">${formDetails.recommendedBy?.date || ''}</span></div>
                </div>

                <div class="sig-block" style="margin-top: 40px;">
                  <div class="sig-title">स्वीकृत गर्नेको दस्तखत</div>
                  <div class="sig-line"><span class="w-label">नाम:</span> <span class="dotted-line">${formDetails.approvedBy?.name || ''}</span></div>
                  <div class="sig-line"><span class="w-label">पद:</span> <span class="dotted-line">${formDetails.approvedBy?.designation || ''}</span></div>
                  <div class="sig-line"><span class="w-label">मिति:</span> <span class="dotted-line">${formDetails.approvedBy?.date || ''}</span></div>
                </div>
              </div>
            </div>

          </div>
          <script>
             window.onload = function() { setTimeout(function() { window.print(); }, 800); };
          </script>
        </body>
        </html>
      `);
      doc.close();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
  };

  const handleSnMouseEnter = (e: React.MouseEvent, itemName: string) => {
    if (!itemName) return;
    const matchingItems = inventoryItems.filter(i => i.itemName.trim().toLowerCase() === itemName.trim().toLowerCase());
    if (matchingItems.length === 0) {
         setHoveredStock({ x: e.clientX + 15, y: e.clientY + 15, content: (<div className="text-xs"><div className="font-bold text-slate-200 border-b border-slate-600 mb-1 pb-1">{itemName}</div><div className="text-red-400 font-bold">स्टक रेकर्ड छैन</div></div>) });
        return;
    }
    const totalQty = matchingItems.reduce((acc, i) => acc + (i.currentQuantity || 0), 0);
    const unit = matchingItems[0]?.unit || '';
    setHoveredStock({ x: e.clientX + 15, y: e.clientY + 15, content: (<div className="text-xs"><div className="font-bold text-slate-200 border-b border-slate-600 mb-1 pb-1">{itemName}</div><div className="flex justify-between gap-3 items-center"><span className="text-slate-400">मौज्दात:</span><span className="font-bold text-green-400 text-sm">{totalQty} {unit}</span></div></div>) });
  };

  const handleSnMouseLeave = () => { setHoveredStock(null); };

    const handleReject = () => {
        if (!window.confirm("के तपाईं यो माग फारम अस्वीकृत गर्न निश्चित हुनुहुन्छ?")) return;
        
        let finalStatus = 'Rejected';
        // If storekeeper rejects, it's rejected at verification stage
        // If approver rejects, it's rejected at approval stage
        
        onSave({
            ...formDetails,
            id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
            items: items.filter(item => item.name.trim() !== '' || item.quantity.trim() !== '').map(({ isFromInventory, ...rest }) => rest),
            status: finalStatus,
            // Clear approvals if rejected
            recommendedBy: finalStatus === 'Rejected' ? { name: '', designation: '', date: '' } : formDetails.recommendedBy,
            approvedBy: finalStatus === 'Rejected' ? { name: '', designation: '', date: '' } : formDetails.approvedBy
        });
        
        setSuccessMessage("माग फारम अस्वीकृत गरियो।");
        setIsSaved(true);
        setTimeout(handleReset, 1500);
    };

    const getButtonLabel = () => {
        if (isSaved) return 'सुरक्षित भयो';
        if (isStoreKeeper && formDetails.status === 'Pending') return 'प्रमाणित गरी पठाउनुहोस् (Verify)';
        if (isApprover && formDetails.status === 'Verified') return 'स्वीकृत गर्नुहोस् (Approve)';
        return 'सुरक्षित गर्नुहोस्';
    };

  if (!editingId) {
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg text-primary-600"><ClipboardList size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">माग फारम व्यवस्थापन (Mag Faram)</h2>
                        <p className="text-sm text-slate-500 font-nepali">{isPrivileged ? 'प्राप्त मागहरू र कार्यवाही विवरण' : 'तपाईंले भर्नुभएका माग फारमहरूको सूची'}</p>
                    </div>
                </div>
                <button onClick={() => setEditingId('new')} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold font-nepali transition-all active:scale-95"><Plus size={20} /> नयाँ माग फारम</button>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setActiveTab('requests')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Clock size={18}/> {isPrivileged ? 'नयाँ अनुरोधहरू' : 'प्रक्रियामा रहेका'} {pendingBadgeCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">{pendingBadgeCount}</span>}</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><History size={18}/> {isPrivileged ? 'कार्यवाही सूची (History)' : 'पुरानो विवरण (History)'}</button>
                </div>
                <div className="relative w-full md:w-80"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="माग नं वा नामबाट खोज्नुहोस्..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all" /></div>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                            <tr><th className="px-6 py-4">माग नं</th><th className="px-6 py-4">मिति</th><th className="px-6 py-4">माग गर्ने</th><th className="px-6 py-4">अवस्था (Status)</th><th className="px-6 py-4 text-right">कार्य</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredForms.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">#{f.formNo}</td>
                                    <td className="px-6 py-4 font-nepali text-slate-600">{f.date}</td>
                                    <td className="px-6 py-4"><div><p className="font-bold text-slate-800">{f.demandBy?.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">{f.demandBy?.designation}</p></div></td>
                                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 w-fit ${f.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : f.status === 'Verified' ? 'bg-blue-50 text-blue-700 border-blue-200' : f.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{f.status === 'Approved' ? <CheckCircle2 size={12}/> : f.status === 'Verified' ? <ShieldCheck size={12}/> : <Clock size={12}/>} {f.status}</span></td>
                                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleLoadForm(f, activeTab === 'history' || (!isPrivileged && f.status === 'Approved'))} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full"><Eye size={20} /></button><button onClick={() => { handleLoadForm(f, true); setTimeout(printOfficialForm, 300); }} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full"><Printer size={20} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm no-print">
          <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={24} /></button>
          <div className="flex gap-2">
            {!isViewOnly && (
                <>
                    <button onClick={handleSave} disabled={isSaved} className={`px-6 py-2 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>{getButtonLabel()}</button>
                    {(isStoreKeeper && formDetails.status === 'Pending') || (isApprover && formDetails.status === 'Verified') ? (
                        <button onClick={handleReject} disabled={isSaved} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 hover:bg-red-700">अस्वीकृत गर्नुहोस् (Reject)</button>
                    ) : null}
                </>
            )}
            <button onClick={printOfficialForm} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-md flex items-center gap-2 hover:bg-slate-900"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
          </div>
       </div>

       {successMessage && <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print"><CheckCircle2 size={24} className="text-green-500" /><div className="flex-1 font-bold text-green-800">{successMessage}</div><button onClick={() => setSuccessMessage(null)}><X size={20}/></button></div>}
       {validationError && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print"><AlertCircle size={24} className="text-red-500" /><div className="flex-1 font-bold text-red-800">{validationError}</div><button onClick={() => setValidationError(null)}><X size={20}/></button></div>}

       <div className="overflow-x-auto pb-8">
         <div className="bg-white p-10 md:p-14 w-[210mm] min-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 shadow-2xl rounded-xl relative">
            {hoveredStock && (
              <div 
                  className="fixed z-[9999] bg-slate-800 text-white p-2.5 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 no-print border border-slate-700/50 backdrop-blur-sm"
                  style={{ top: hoveredStock.y, left: hoveredStock.x }}
              >
                  {hoveredStock.content}
              </div>
          )}

          <div className="flex justify-between items-start mb-6">
              <LogoDisplay settings={generalSettings} />
              <div className="text-center flex-1">
                  <h1 className="text-xl font-black text-red-600 uppercase">{generalSettings.orgNameNepali}</h1>
                  {generalSettings.subTitleNepali && <h2 className="text-base font-bold">{generalSettings.subTitleNepali}</h2>}
                  {generalSettings.subTitleNepali2 && <h3 className="text-sm font-bold">{generalSettings.subTitleNepali2}</h3>}
                  {generalSettings.subTitleNepali3 && <h4 className="text-xs font-bold">{generalSettings.subTitleNepali3}</h4>}
                  <div className="text-[10px] font-bold text-slate-500 mt-2">
                    {[
                        generalSettings.address, 
                        generalSettings.phone ? `फोन: ${generalSettings.phone}` : '', 
                        generalSettings.email ? `ईमेल: ${generalSettings.email}` : ''
                    ].filter(Boolean).join(' | ')}
                  </div>
                  <h2 className="text-2xl font-black underline underline-offset-8 mt-6">माग फारम</h2>
              </div>
              <p className="font-bold text-[10px] border border-black px-1 h-fit">म.ले.प.फा.नं. ४०१</p>
          </div>
          
          {/* UPDATED: Meta Info Layout */}
          <div className="flex justify-between items-end mb-6 text-sm font-bold">
              <div>
                  आर्थिक वर्ष: <span className="border-b border-dotted border-black px-4">{formDetails.fiscalYear}</span>
              </div>
              <div className="text-right space-y-1">
                  <p>माग नं: <span className="text-red-600 border-b border-dotted border-black px-4">#{formDetails.formNo}</span></p>
                  <p>मिति: <input value={formDetails.date} onChange={e => setFormDetails({...formDetails, date: e.target.value})} disabled={isViewOnly} className="border-b border-dotted border-black px-1 outline-none w-32 text-right bg-transparent" /></p>
              </div>
          </div>

          <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                  <tr className="bg-slate-100">
                      <th rowSpan={2} className="border border-black p-2 w-10">क्र.सं.</th><th colSpan={2} className="border border-black p-2">जिन्सी मालसामानको विवरण</th><th rowSpan={2} className="border border-black p-2 w-16">एकाई</th><th rowSpan={2} className="border border-black p-2 w-20">माग गरिएको परिमाण</th><th rowSpan={2} className="border border-black p-2">कैफियत</th><th rowSpan={2} className="border border-black p-2 w-8 no-print"></th>
                  </tr>
                  <tr><th className="border border-black p-1">नाम</th><th className="border border-black p-1">स्पेसिफिकेसन</th></tr>
              </thead>
              <tbody>
                  {items.map((item, index) => (
                      <tr key={item.id}>
                          <td 
                            className="border border-black p-2 cursor-help hover:bg-yellow-50 transition-colors"
                            onMouseEnter={(e) => handleSnMouseEnter(e, item.name)}
                            onMouseLeave={handleSnMouseLeave}
                          >
                            {index + 1}
                          </td>
                          <td className="border border-black p-1 text-left font-bold">{!isViewOnly ? <SearchableSelect options={itemOptions} value={item.name} onChange={val => handleItemNameChange(item.id, val)} onSelect={opt => handleItemNameChange(item.id, opt.value)} placeholder="..." className="!border-none" /> : item.name}</td>
                          <td className="border border-black p-1"><input value={item.specification || ''} onChange={e => updateItemField(item.id, 'specification', e.target.value)} disabled={isViewOnly || item.isFromInventory} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.unit || ''} onChange={e => updateItemField(item.id, 'unit', e.target.value)} disabled={isViewOnly || item.isFromInventory} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1 font-black"><input value={item.quantity || ''} onChange={e => updateItemField(item.id, 'quantity', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.remarks || ''} onChange={e => updateItemField(item.id, 'remarks', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                          <td className="border border-black p-1 text-center no-print"><button onClick={() => handleRemoveItem(item.id)} className="text-red-400"><Trash2 size={14}/></button></td>
                      </tr>
                  ))}
              </tbody>
          </table>
          {/* UPDATED: Limit restored to 14 items */}
          {!isViewOnly && <button onClick={handleAddItem} disabled={items.length >= 14} className={`no-print font-bold text-xs mt-3 flex items-center gap-1 ${items.length >= 14 ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600'}`}><Plus size={14}/> थप थप्नुहोस्</button>}
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-16 mt-16 text-[11px] font-bold">
              <div className="space-y-4">
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">माग गर्नेको दस्तखत</p>
                      <p>नाम: {formDetails.demandBy?.name}</p>
                      <p>पद: {formDetails.demandBy?.designation}</p>
                      <p>मिति: {formDetails.demandBy?.date}</p>
                      <div className="flex items-center gap-2 mt-2">प्रयोजन *: <input value={formDetails.demandBy?.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy!, purpose: e.target.value}})} disabled={isViewOnly} className="border-b border-dotted border-black flex-1 outline-none bg-transparent" /></div>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">मालसामान बुझिलिनेको दस्तखत</p>
                      <p>नाम: <input value={formDetails.receiver?.name} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, name: e.target.value}})} disabled={isViewOnly} className="outline-none bg-transparent" /></p>
                      <p>पद: <input value={formDetails.receiver?.designation} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, designation: e.target.value}})} disabled={isViewOnly} className="outline-none bg-transparent" /></p>
                  </div>
              </div>
              <div className="space-y-4">
                  <div className="border-t border-black pt-2">
                      <div className="flex flex-col gap-1 mb-2 no-print">
                           <label className={`flex items-center gap-2 ${isViewOnly || (!isStoreKeeper && formDetails.status !== 'Pending') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                               <input 
                                   type="checkbox" 
                                   checked={formDetails.storeKeeper?.marketRequired} 
                                   onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, marketRequired: e.target.checked}})} 
                                   disabled={isViewOnly || (!isStoreKeeper && formDetails.status !== 'Pending')} 
                                   className="w-3 h-3" 
                               /> बजारबाट खरिद गर्नु पर्ने
                           </label>
                           <label className={`flex items-center gap-2 ${isViewOnly || (!isStoreKeeper && formDetails.status !== 'Pending') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                               <input 
                                   type="checkbox" 
                                   checked={formDetails.storeKeeper?.inStock} 
                                   onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, inStock: e.target.checked}})} 
                                   disabled={isViewOnly || (!isStoreKeeper && formDetails.status !== 'Pending')} 
                                   className="w-3 h-3" 
                               /> मौज्दातमा रहेको
                           </label>
                      </div>
                      <p className="mb-6">सिफारिस गर्नेको दस्तखत</p>
                      <p>नाम: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.name || '................'}</span></p>
                      <p>पद: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.designation || '................'}</span></p>
                      <p>मिति: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.date || '................'}</span></p>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">स्वीकृत गर्नेको दस्तखत</p>
                      <p>नाम: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.approvedBy?.name || '................'}</span></p>
                      <p>पद: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.approvedBy?.designation || '................'}</span></p>
                      <p>मिति: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.approvedBy?.date || '................'}</span></p>
                  </div>
              </div>
          </div>
       </div>
      </div>
    </div>
  );
};
