
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, Calendar, Plus, RotateCcw, Save, X, CheckCircle2, Search, 
  ArrowUpCircle, ArrowDownCircle, Warehouse, DollarSign, Tag, ClipboardList, Barcode,
  Hash, BookOpen, Layers, ScrollText, Store as StoreIcon, User, FileText, Filter, PieChart, Send, Info, Edit, Calculator, SlidersHorizontal, BarChart4, ChevronRight, History, CheckSquare, List, Loader2, Trash2, ShieldAlert
} from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { EnglishDatePicker } from './EnglishDatePicker'; 
// Corrected import paths for InventoryItem, Option, Store, StockEntryRequest, User, PurchaseOrderEntry
import { Option, User as UserType } from '../types/coreTypes';
import { InventoryItem, Store, StockEntryRequest, PurchaseOrderEntry } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect'; 
import { AddOptionModal } from './AddOptionModal'; 
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiMaujdatProps {
  currentFiscalYear: string;
  currentUser: UserType; 
  inventoryItems: InventoryItem[];
  onAddInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (itemId: string) => void; 
  onRequestStockEntry: (request: StockEntryRequest) => void; 
  stores: Store[];
  pendingPoDakhila?: PurchaseOrderEntry | null; 
  onClearPendingPoDakhila?: () => void; 
}

const getTodayDateAd = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateTotalAmount = (quantity: string | number, rate: string | number, tax: string | number): number => {
  const qty = parseFloat(quantity.toString()) || 0;
  const rt = parseFloat(rate.toString()) || 0;
  const tx = parseFloat(tax.toString()) || 0;
  const total = qty * rt * (1 + tx / 100);
  return isNaN(total) ? 0 : total;
};

const itemTypeOptions: Option[] = [
  { id: 'expendable', value: 'Expendable', label: 'खर्च हुने (Expendable)' },
  { id: 'nonExpendable', value: 'Non-Expendable', label: 'खर्च नहुने (Non-Expendable)' },
];

const initialItemClassificationOptions: Option[] = [
  { id: 'medicine', value: 'Medicine', label: 'औषधि (Medicine)' },
  { id: 'surgical', value: 'Surgical', label: 'सर्जिकल (Surgical)' }, 
  { id: 'equipment', value: 'Equipment', label: 'उपकरण (Equipment)' },
  { id: 'consumable', value: 'Consumable', label: 'उपभोग्य सामान (Consumable)' },
  { id: 'officeSupply', value: 'Office Supply', label: 'कार्यालय सामग्री (Office Supply)' },
  { id: 'furniture', value: 'Furniture', label: 'फर्निचर (Furniture)' }, 
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

const initialReceiptSourceOptions: Option[] = [
  { id: 'purchase', value: 'Purchase', label: 'खरिद (Purchase)' },
  { id: 'donation', value: 'Donation', label: 'दान (Donation)' },
  { id: 'return', value: 'Return', label: 'फिर्ता (Return)' },
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

interface ItemDetailsModalProps {
    item: InventoryItem;
    storeName: string;
    onClose: () => void;
}

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, storeName, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-4 border-b bg-indigo-50 flex justify-between items-center text-indigo-800">
                    <div className="flex items-center gap-3">
                        <Package size={20} />
                        <h3 className="font-bold font-nepali">पूर्ण सामान विवरण (Full Item Details)</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                        <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Item Name</label>
                            <p className="text-lg font-bold text-slate-800">{item.itemName}</p>
                            <p className="text-xs text-slate-500">{item.specification || 'No specification provided.'}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Godam/Store</label>
                            <p className="font-medium">{storeName}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Ledger Page No</label>
                            <p className="font-medium font-mono text-indigo-600">{item.ledgerPageNo || '-'}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Unique Code</label>
                            <p className="font-medium">{item.uniqueCode || '-'}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sanket No</label>
                            <p className="font-medium">{item.sanketNo || '-'}</p>
                        </div>
                        <div className="col-span-2 border-t pt-4 grid grid-cols-3 gap-4">
                             <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Current Qty</label>
                                <p className="text-lg font-bold text-green-600">{item.currentQuantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span></p>
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Rate</label>
                                <p className="font-medium">{item.rate?.toFixed(2) || '0.00'}</p>
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Total Value</label>
                                <p className="font-medium">{item.totalAmount?.toFixed(2) || '0.00'}</p>
                             </div>
                        </div>
                        <div className="col-span-2 bg-orange-50 p-3 rounded-lg border border-orange-100 flex justify-between">
                             <div>
                                <label className="text-[10px] font-bold text-orange-400 uppercase">Batch No</label>
                                <p className="font-bold text-orange-700">{item.batchNo || '-'}</p>
                             </div>
                             <div className="text-right">
                                <label className="text-[10px] font-bold text-orange-400 uppercase">Expiry Date (AD)</label>
                                <p className="font-bold text-orange-700">{item.expiryDateAd || '-'}</p>
                             </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Last Updated</label>
                            <p className="text-xs text-slate-600 font-nepali">{item.lastUpdateDateBs} ({item.receiptSource})</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm">Close</button>
                </div>
            </div>
        </div>
    );
};

interface EditInventoryItemModalProps {
    isOpen: boolean;
    item: InventoryItem;
    onClose: () => void;
    onSave: (updatedItem: InventoryItem) => void;
    storeOptions: Option[];
    itemClassificationOptions: Option[];
}

const EditInventoryItemModal: React.FC<EditInventoryItemModalProps> = ({
    isOpen,
    item,
    onClose,
    onSave,
    storeOptions,
    itemClassificationOptions
}) => {
    const [formData, setFormData] = useState<InventoryItem>(item);

    useEffect(() => {
        setFormData(item);
    }, [item]);

    const handleChange = (field: keyof InventoryItem, value: string | number) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            if (['currentQuantity', 'rate', 'tax'].includes(field as string)) {
                updated.totalAmount = calculateTotalAmount(updated.currentQuantity || 0, updated.rate || 0, updated.tax || 0);
            }
            return updated;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Edit size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">विवरण सच्याउनुहोस् (Edit Inventory Details)</h3>
                            <p className="text-xs text-slate-500">ID: {item.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="सामानको नाम (Item Name)" value={formData.itemName} onChange={e => handleChange('itemName', e.target.value)} />
                        <Select label="गोदाम/स्टोर (Store)" options={storeOptions} value={formData.storeId} onChange={e => handleChange('storeId', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input label="खाता पाना नं (Ledger Page No)" value={formData.ledgerPageNo || ''} onChange={e => handleChange('ledgerPageNo', e.target.value)} />
                        <Input label="युनिक कोड (Unique Code)" value={formData.uniqueCode || ''} onChange={e => handleChange('uniqueCode', e.target.value)} />
                        <Input label="सङ्केत नं (Sanket No)" value={formData.sanketNo || ''} onChange={e => handleChange('sanketNo', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-2">सामानको प्रकार (Type)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="editType" value="Expendable" checked={formData.itemType === 'Expendable'} onChange={() => handleChange('itemType', 'Expendable')} className="text-orange-600 focus:ring-orange-500"/>
                                    <span className="text-sm">खर्च हुने</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="editType" value="Non-Expendable" checked={formData.itemType === 'Non-Expendable'} onChange={() => handleChange('itemType', 'Non-Expendable')} className="text-blue-600 focus:ring-blue-500"/>
                                    <span className="text-sm">खर्च नहुने</span>
                                </label>
                            </div>
                        </div>
                        <Select label="वर्गीकरण (Class)" options={itemClassificationOptions} value={formData.itemClassification || ''} onChange={e => handleChange('itemClassification', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input label="एकाई (Unit)" value={formData.unit} onChange={e => handleChange('unit', e.target.value)} />
                        <Input label="परिमाण (Qty)" type="number" value={formData.currentQuantity} onChange={e => handleChange('currentQuantity', e.target.value)} />
                        <Input label="दर (Rate)" type="number" value={formData.rate || ''} onChange={e => handleChange('rate', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="म्याद सकिने मिति (Expiry AD)" type="date" value={formData.expiryDateAd || ''} onChange={e => handleChange('expiryDateAd', e.target.value)} />
                        <Input label="ब्याच नं (Batch No)" value={formData.batchNo || ''} onChange={e => handleChange('batchNo', e.target.value)} />
                    </div>
                    
                    <div className="grid grid-cols-1">
                         <Input label="विशिष्टता (Specification)" value={formData.specification || ''} onChange={e => handleChange('specification', e.target.value)} />
                         <Input label="कैफियत (Remarks)" value={formData.remarks || ''} onChange={e => handleChange('remarks', e.target.value)} />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={() => onSave(formData)} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium shadow-sm">
                        <Save size={16} /> Update Details
                    </button>
                </div>
            </div>
        </div>
    );
};

interface BulkInventoryEntryModalProps {
  onClose: () => void;
  onSave: (
      items: InventoryItem[], 
      commonReceiptSource: string, 
      commonDateBs: string, 
      commonDateAd: string, 
      commonStoreId: string, 
      commonSupplier: string, 
      commonRefNo: string,    
      commonDakhilaNo: string,
      mode: 'opening' | 'add'
  ) => void;
  committedInventoryItems: InventoryItem[]; // Renamed for clarity
  currentFiscalYear: string;
  mode: 'opening' | 'add'; 
  receiptSourceOptions: Option[];
  storeOptions: Option[]; 
  itemClassificationOptions: Option[]; 
  onAddClassification: (newClassification: string) => void; 
  onAddReceiptSource: (newSource: string) => void; 
  initialData?: PurchaseOrderEntry | null; 
  generateNewSequentialCode: (
      prefix: string, 
      currentFy: string, 
      committedItems: InventoryItem[], 
      draftItems: InventoryItem[],     
      key: 'uniqueCode' | 'sanketNo'
  ) => string;
  onClearPendingPoDakhila?: () => void; // Added here
}

const BulkInventoryEntryModal: React.FC<BulkInventoryEntryModalProps> = ({ 
    onClose, 
    onSave, 
    committedInventoryItems, // Use committedInventoryItems here
    currentFiscalYear,
    mode, 
    receiptSourceOptions,
    storeOptions, 
    itemClassificationOptions, 
    onAddClassification, 
    onAddReceiptSource, 
    initialData,
    generateNewSequentialCode, // Destructure the prop
    onClearPendingPoDakhila // Destructure the prop
}) => {
    const initialStoreId = storeOptions && storeOptions.length > 0 ? storeOptions[0].value : '';

    const initialDakhilaNo = useMemo(() => {
        if (mode !== 'add') return '';
        const fyItems = committedInventoryItems.filter(item => item.fiscalYear === currentFiscalYear && item.dakhilaNo);
        const maxNum = fyItems.reduce((max, item) => {
            const dakhilaNoString = String(item.dakhilaNo);
            // Specifically parse for the new "DA-NNN" format
            const match = dakhilaNoString.match(/^DA-(\d{3})$/); 
            if (match) {
                const num = parseInt(match[1]);
                return isNaN(num) ? max : Math.max(max, num);
            }
            return max; // Ignore non-matching formats
        }, 0);
        // Generate in "DA-NNN" format
        return `DA-${String(maxNum + 1).padStart(3, '0')}`;
    }, [currentFiscalYear, committedInventoryItems, mode]);

    const [commonDetails, setCommonDetails] = useState({
        receiptSource: mode === 'opening' ? 'Opening' : '',
        dateBs: '',
        dateAd: getTodayDateAd(),
        storeId: initialStoreId,
        supplier: '', 
        refNo: '',    
        dakhilaNo: initialDakhilaNo, 
    });
    
    const createEmptyBulkItem = useCallback((currentMode: 'opening' | 'add', storeIdForNewItem: string): InventoryItem => {
        return {
            id: `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
            itemName: '',
            uniqueCode: '',
            sanketNo: '',
            ledgerPageNo: '',
            dakhilaNo: '', 
            itemType: '' as 'Expendable' | 'Non-Expendable',
            itemClassification: '',
            specification: '', 
            unit: '',
            currentQuantity: 0,
            totalAmount: 0,
            batchNo: '',
            expiryDateAd: '',
            expiryDateBs: '',
            lastUpdateDateAd: '', 
            lastUpdateDateBs: '', 
            fiscalYear: '', 
            receiptSource: '', 
            remarks: '',
            storeId: storeIdForNewItem, 
        };
    }, []);

    const [bulkItems, setBulkItems] = useState<InventoryItem[]>(() => [createEmptyBulkItem(mode, initialStoreId)]);
    
    const todayBs = useMemo(() => {
        try {
            return new NepaliDate().format('YYYY-MM-DD');
        } catch (e) {
            return '';
        }
    }, []);

    // Effect to process initialData (from Purchase Order)
    useEffect(() => {
        if (initialData) {
            setCommonDetails(prev => ({
                ...prev,
                receiptSource: 'Purchase', 
                supplier: initialData.vendorDetails?.name || '',
                refNo: initialData.orderNo || `PO-${initialData.magFormNo}`,
                dakhilaNo: initialDakhilaNo 
            }));

            // Create a temporary array of InventoryItem-like objects to pass as draftItems to generateNewSequentialCode
            const temporaryDraftItems: InventoryItem[] = [];

            const itemsFromPo = initialData.items.map((poItem: any, index: number) => {
                const newItem = createEmptyBulkItem(mode, commonDetails.storeId);
                const qty = parseFloat(poItem.quantity.toString()) || 0;
                const rt = parseFloat(poItem.rate?.toString() || '0') || 0;

                // Try to find an existing inventory item by name to get codes/units/specs/type
                const existingInvItem = committedInventoryItems.find(i =>
                    i.itemName.trim().toLowerCase() === poItem.name.trim().toLowerCase()
                );

                let uniqueCodeCandidate = poItem.codeNo || existingInvItem?.uniqueCode || '';
                let sanketNoCandidate = existingInvItem?.sanketNo || '';
                let itemTypeToUse = existingInvItem?.itemType || newItem.itemType; // Use existing type or default
                let itemClassificationToUse = existingInvItem?.itemClassification || '';
                let specificationToUse = poItem.specification || existingInvItem?.specification || '';
                let unitToUse = poItem.unit || existingInvItem?.unit || '';

                // If neither PO provides a code, nor an existing item has a uniqueCode/sanketNo, generate one
                // Pass a slice of `temporaryDraftItems` to ensure uniqueness within the current batch being constructed
                const currentBatchDrafts = temporaryDraftItems.slice(0, index);

                if (!uniqueCodeCandidate && !sanketNoCandidate) {
                    uniqueCodeCandidate = generateNewSequentialCode('UC', currentFiscalYear, committedInventoryItems, currentBatchDrafts, 'uniqueCode');
                    sanketNoCandidate = generateNewSequentialCode('SN', currentFiscalYear, committedInventoryItems, currentBatchDrafts, 'sanketNo');
                } else if (!uniqueCodeCandidate) {
                    // If only uniqueCode is missing, generate uniqueCode
                    uniqueCodeCandidate = generateNewSequentialCode('UC', currentFiscalYear, committedInventoryItems, currentBatchDrafts, 'uniqueCode');
                } else if (!sanketNoCandidate) {
                    // If only sanketNo is missing, generate sanketNo
                    sanketNoCandidate = generateNewSequentialCode('SN', currentFiscalYear, committedInventoryItems, currentBatchDrafts, 'sanketNo');
                }

                // If this is not the first row, and itemType is still not set, inherit from the first row if possible
                if (!itemTypeToUse && bulkItems.length > 0 && bulkItems[0].itemType) {
                    itemTypeToUse = bulkItems[0].itemType;
                }
                
                const constructedItem: InventoryItem = {
                    ...newItem,
                    itemName: poItem.name,
                    uniqueCode: uniqueCodeCandidate,
                    sanketNo: sanketNoCandidate,
                    ledgerPageNo: existingInvItem?.ledgerPageNo || '',
                    itemType: itemTypeToUse,
                    itemClassification: itemClassificationToUse, // Corrected typo here
                    specification: specificationToUse,
                    unit: unitToUse,
                    currentQuantity: qty,
                    rate: rt,
                    totalAmount: qty * rt,
                    dakhilaNo: commonDetails.dakhilaNo,
                    fiscalYear: currentFiscalYear,
                    lastUpdateDateAd: commonDetails.dateAd,
                    lastUpdateDateBs: commonDetails.dateBs,
                    receiptSource: commonDetails.receiptSource,
                };

                // Add to temporaryDraftItems for subsequent uniqueness checks within this batch
                temporaryDraftItems.push(constructedItem);

                return constructedItem;
            });
            
            if (itemsFromPo.length > 0) {
                setBulkItems(itemsFromPo);
            }
            // Important: clear the pendingPoDakhila after it has been processed to avoid re-opening the modal
            // This is handled by a callback from JinshiMaujdat to clear its state
            if (initialData && onClearPendingPoDakhila) {
                onClearPendingPoDakhila(); 
            }
        }
    }, [initialData, createEmptyBulkItem, mode, commonDetails.storeId, commonDetails.dakhilaNo, commonDetails.dateAd, commonDetails.dateBs, commonDetails.receiptSource, committedInventoryItems, currentFiscalYear, generateNewSequentialCode, initialDakhilaNo, onClearPendingPoDakhila, bulkItems]); // Added bulkItems to deps for itemType fallback


    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddClassificationModal, setShowAddClassificationModal] = useState(false); 
    const [showAddSourceModal, setShowAddSourceModal] = useState(false); 

    const masterType = bulkItems.length > 0 ? bulkItems[0].itemType : '';

    const allInventoryItemOptions: Option[] = useMemo(() => {
        return committedInventoryItems.map(item => ({
            id: item.id,
            value: item.itemName, 
            label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
            itemData: item 
        }));
    }, [committedInventoryItems]);

    const filteredInventoryItemOptions: Option[] = useMemo(() => {
        if (!masterType) return allInventoryItemOptions;
        return committedInventoryItems
            .filter(item => item.itemType === masterType) 
            .map(item => ({
                id: item.id,
                value: item.itemName,
                label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
                itemData: item
            }));
    }, [committedInventoryItems, masterType, allInventoryItemOptions]);


    const handleAddRow = () => {
        const masterType = bulkItems.length > 0 ? bulkItems[0].itemType : '';
        const newItem = createEmptyBulkItem(mode, commonDetails.storeId);
        if (masterType) newItem.itemType = masterType;
        setBulkItems(prev => [...prev, newItem]);
    };

    const handleRemoveRow = (id: string) => {
        setBulkItems(prev => prev.filter(item => item.id !== id));
        if (bulkItems.length === 1) setBulkItems([createEmptyBulkItem(mode, commonDetails.storeId)]); 
    };

    const handleItemFieldChange = (itemId: string, field: keyof InventoryItem, value: string | number) => {
        setBulkItems(prev => {
            const isFirstRow = prev.length > 0 && prev[0].id === itemId;
            return prev.map(item => {
                if (item.id === itemId) {
                    const updatedItem = { ...item, [field]: value };
                    if (['currentQuantity', 'rate', 'tax'].includes(field as string)) {
                        updatedItem.totalAmount = calculateTotalAmount(updatedItem.currentQuantity || 0, updatedItem.rate || 0, updatedItem.tax || 0);
                    }
                    return updatedItem;
                }
                if (isFirstRow && field === 'itemType') {
                    return { ...item, itemType: value as any };
                }
                return item;
            });
        });
    };

    const handleItemSelect = (itemId: string, option: Option) => {
        const selectedInvItem = option.itemData as InventoryItem;
        if (!selectedInvItem) return;
        setBulkItems(prev => {
            const masterType = prev.length > 0 ? prev[0].itemType : '';
            const isFirstRow = prev.length > 0 && prev[0].id === itemId;
            return prev.map(row => {
                if (row.id === itemId) {
                    const updatedItem = {
                        ...row,
                        itemName: selectedInvItem.itemName,
                        uniqueCode: selectedInvItem.uniqueCode || '',
                        sanketNo: selectedInvItem.sanketNo || '',
                        ledgerPageNo: selectedInvItem.ledgerPageNo || '',
                        unit: selectedInvItem.unit,
                        itemType: selectedInvItem.itemType,
                        itemClassification: selectedInvItem.itemClassification || '',
                        specification: selectedInvItem.specification || '',
                        currentQuantity: row.currentQuantity,
                        rate: selectedInvItem.rate || 0,
                        tax: selectedInvItem.tax || 0
                    };
                    if (!isFirstRow && masterType && updatedItem.itemType !== masterType) {
                        updatedItem.itemType = masterType;
                    }
                    updatedItem.totalAmount = calculateTotalAmount(updatedItem.currentQuantity || 0, updatedItem.rate || 0, updatedItem.tax || 0);
                    return updatedItem;
                }
                return row;
            });
        });
    };

    const handleItemNameChange = (itemId: string, newName: string) => {
        setBulkItems(prev => {
            const masterType = prev.length > 0 ? prev[0].itemType : '';
            const isFirstRow = prev.length > 0 && prev[0].id === itemId;

            // Collect items already in bulkItems for uniqueness check within the current draft
            const draftItemsForCodeGeneration = prev.filter(item => item.id !== itemId);

            return prev.map(item => {
            if (item.id === itemId) {
                let updatedItem = { ...item, itemName: newName };
                let existing = committedInventoryItems.find(i => 
                    i.itemName.toLowerCase() === newName.toLowerCase() && i.storeId === commonDetails.storeId
                );
                if (!existing) existing = committedInventoryItems.find(i => i.itemName.toLowerCase() === newName.toLowerCase());
                
                if (existing) {
                    updatedItem.uniqueCode = existing.uniqueCode || '';
                    updatedItem.sanketNo = existing.sanketNo || '';
                    updatedItem.ledgerPageNo = existing.ledgerPageNo || '';
                    if (!isFirstRow && masterType) { updatedItem.itemType = masterType; } else { updatedItem.itemType = existing.itemType; }
                    updatedItem.itemClassification = existing.itemClassification || '';
                    updatedItem.specification = existing.specification || ''; 
                    updatedItem.unit = existing.unit;
                    if (existing.storeId === commonDetails.storeId) {
                        updatedItem.batchNo = existing.batchNo || '';
                        updatedItem.expiryDateAd = existing.expiryDateAd || '';
                        updatedItem.expiryDateBs = existing.expiryDateBs || '';
                    } else {
                        updatedItem.batchNo = ''; updatedItem.expiryDateAd = ''; updatedItem.expiryDateBs = '';
                    }
                    updatedItem.remarks = ''; 
                } else if (newName.trim() !== '') {
                    // Auto-generate if not existing and new name typed
                    if (!updatedItem.uniqueCode) { 
                        updatedItem.uniqueCode = generateNewSequentialCode('UC', currentFiscalYear, committedInventoryItems, draftItemsForCodeGeneration, 'uniqueCode');
                    }
                    if (!updatedItem.sanketNo) { 
                        updatedItem.sanketNo = generateNewSequentialCode('SN', currentFiscalYear, committedInventoryItems, draftItemsForCodeGeneration, 'sanketNo');
                    }
                    updatedItem.unit = '';
                    if (!isFirstRow && masterType) { updatedItem.itemType = masterType; } else { updatedItem.itemType = '' as 'Expendable' | 'Non-Expendable'; }
                    updatedItem.itemClassification = ''; updatedItem.specification = ''; updatedItem.ledgerPageNo = '';
                    updatedItem.rate = undefined; updatedItem.tax = undefined; updatedItem.batchNo = '';
                    updatedItem.expiryDateBs = ''; updatedItem.expiryDateAd = ''; updatedItem.remarks = '';
                } else {
                    const originalId = item.id;
                    updatedItem = createEmptyBulkItem(mode, commonDetails.storeId);
                    updatedItem.id = originalId;
                    if (!isFirstRow && masterType) updatedItem.itemType = masterType;
                }
                updatedItem.totalAmount = calculateTotalAmount(updatedItem.currentQuantity || 0, updatedItem.rate || 0, updatedItem.tax || 0);
                return updatedItem;
            }
            return item;
        })});
    };

    const handleCommonDetailsChange = (field: keyof typeof commonDetails, value: string) => {
        setCommonDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveBulk = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);
        setIsSaving(true);
        const dateBs = commonDetails.dateBs.trim();

        if (mode === 'add') {
            let maxDakhilaNum = 0;
            let previousDakhilaDate = '';
            let previousDakhilaNo = '';
            committedInventoryItems.forEach(item => {
                if (item.fiscalYear === currentFiscalYear && item.dakhilaNo) {
                    // Match the new "DA-NNN" format
                    const match = String(item.dakhilaNo).match(/^DA-(\d{3})$/);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (!isNaN(num) && num > maxDakhilaNum) {
                            maxDakhilaNum = num;
                            previousDakhilaDate = item.lastUpdateDateBs || ''; 
                            previousDakhilaNo = item.dakhilaNo;
                        }
                    }
                }
            });
            // Ensure newly generated dakhilaNo is consistent with the latest existing dakhilaNo for this fiscal year
            // This is primarily for date validation when the user explicitly changes the dakhilaNo or date.
            // When automatically generated, dakhilaNo increases, so date validation should align.
            if (previousDakhilaDate && dateBs < previousDakhilaDate) {
                setValidationError(`मिति क्रम मिलेन (Invalid Date Order): \nअघिल्लो दाखिला नं (${previousDakhilaNo}) को मिति (${previousDakhilaDate}) भन्दा \nअहिलेको मिति (${dateBs}) अगाडि हुन सक्दैन।`);
                setIsSaving(false);
                return;
            }
        }

        if (!commonDetails.storeId) { setValidationError('कृपया गोदाम/स्टोर छान्नुहोस्।'); setIsSaving(false); return; }
        if (mode === 'add' && !commonDetails.receiptSource) { setValidationError('कृपया प्राप्तिको स्रोत भर्नुहोस्।'); setIsSaving(false); return; }
        if (!commonDetails.dateBs) { setValidationError(' कृपया मिति भर्नुहोस्।'); setIsSaving(false); return; }
        if (mode === 'add' && !commonDetails.dakhilaNo.trim()) { setValidationError('कृपया दाखिला नं. भर्नुहोस्।'); setIsSaving(false); return; }

        let hasError = false;
        const validatedItems = bulkItems.map((item, index) => {
            const itemNumber = index + 1;
            const isExistingItemInSelectedStore = committedInventoryItems.some(i => i.itemName.toLowerCase() === item.itemName.toLowerCase() && i.storeId === commonDetails.storeId);

            if (!item.itemName.trim()) { setValidationError(`क्रम संख्या ${itemNumber} मा सामानको नाम आवश्यक छ।`); hasError = true; }
            if (!item.itemType) { setValidationError(`क्रम संख्या ${itemNumber} मा सामानको प्रकार आवश्यक छ।`); hasError = true; }
            if (!item.unit.trim()) { setValidationError(`क्रम संख्या ${itemNumber} मा एकाई आवश्यक छ।`); hasError = true; }
            const qtyNum = parseFloat(item.currentQuantity.toString()) || 0;
            if (qtyNum <= 0) { setValidationError(`क्रम संख्या ${itemNumber} मा मान्य परिमाण आवश्यक छ।`); hasError = true; }

            if (item.ledgerPageNo?.trim()) {
                const conflictingItem = committedInventoryItems.find(i => i.storeId === commonDetails.storeId && i.itemType === item.itemType && i.ledgerPageNo === item.ledgerPageNo?.trim() && i.itemName.toLowerCase() !== item.itemName.toLowerCase());
                if (conflictingItem) { setValidationError(`क्रम संख्या ${itemNumber} मा खाता पाना नं. ${item.ledgerPageNo} पहिले नै "${conflictingItem.itemName}" को लागि प्रयोग भइसकेको छ।`); hasError = true; }
            }
            if (mode === 'opening') {
                if (isExistingItemInSelectedStore) { setValidationError(`क्रम संख्या ${itemNumber} मा सामान "${item.itemName}" पहिले नै मौज्दात छ।`); hasError = true; }
                if (!item.uniqueCode?.trim()) { setValidationError(`क्रम संख्या ${itemNumber} मा युनिक कोड आवश्यक छ।`); hasError = true; }
                if (!item.sanketNo?.trim()) { setValidationError(`क्रम संख्या ${itemNumber} मा सङ्केत नं आवश्यक छ।`); hasError = true; }
                if (!item.itemClassification?.trim()) { setValidationError(`क्रम संख्या ${itemNumber} मा सामानको वर्गीकरण आवश्यक छ।`); hasError = true; }
            }
            const rateNum = parseFloat(item.rate?.toString() || '0') || 0;
            const taxNum = parseFloat(item.tax?.toString() || '0') || 0;

            return {
                ...item,
                itemName: item.itemName.trim(),
                uniqueCode: item.uniqueCode?.trim() || "",
                sanketNo: item.sanketNo?.trim() || "",
                ledgerPageNo: item.ledgerPageNo?.trim() || "",
                dakhilaNo: mode === 'add' ? commonDetails.dakhilaNo.trim() : "",
                itemClassification: item.itemClassification?.trim() || "",
                specification: item.specification?.trim() || "",
                unit: item.unit.trim(),
                currentQuantity: qtyNum,
                rate: rateNum,
                tax: taxNum,
                totalAmount: calculateTotalAmount(qtyNum, rateNum, taxNum),
                batchNo: item.batchNo?.trim() || "",
                expiryDateAd: item.expiryDateAd || "",
                expiryDateBs: item.expiryDateBs || "",
                remarks: item.remarks?.trim() || "",
                storeId: commonDetails.storeId, 
            };
        }).filter(item => item.itemName); 

        if (hasError) { setIsSaving(false); return; }
        if (validatedItems.length === 0) { setValidationError('कृपया कम्तिमा एउटा सामानको विवरण भर्नुहोस्।'); setIsSaving(false); return; }

        await onSave(validatedItems, commonDetails.receiptSource, commonDetails.dateBs, commonDetails.dateAd, commonDetails.storeId, commonDetails.supplier, commonDetails.refNo, commonDetails.dakhilaNo, mode);
        setIsSaving(false);
        onClose(); 
    };

    const modalTitle = mode === 'opening' ? 'ओपनिङ्ग स्टक राख्नुहोस् (Add Opening Stock)' : 'बल्कमा स्टक थप्नुहोस् (Add Stock in Bulk)';
    const headerBgClass = mode === 'opening' ? 'bg-blue-50/50' : 'bg-purple-50/50';
    const iconClass = mode === 'opening' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600';
    const iconComponent = mode === 'opening' ? <ArrowUpCircle size={20} /> : <Layers size={20} />;
    const saveButtonColor = mode === 'opening' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';
    const shouldShowBatchExpiry = (classification: string = '') => {
        const lower = classification.toLowerCase();
        return lower.includes('medicine') || lower.includes('surgical') || lower.includes('consumable') || lower.includes('aausadi');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full h-full max-w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center ${headerBgClass}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${iconClass}`}>{iconComponent}</div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">{modalTitle}</h3>
                            <p className="text-xs text-slate-500">{mode === 'opening' ? 'यो आर्थिक वर्षको लागि सुरुवाती स्टक प्रविष्ट गर्नुहोस्।' : 'एकै पटक धेरै सामानको मौज्दात प्रविष्ट गर्नुहोस्।'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveBulk} className="p-6 space-y-4 overflow-y-auto">
                    {initialData && (
                        <div className="w-full p-3 mb-4 rounded-lg flex items-center gap-3 border bg-indigo-50 border-indigo-200 text-indigo-800">
                            <Info size={20} className="shrink-0" />
                            <div>
                                <span className="font-bold font-nepali block">खरिद आदेशबाट प्राप्त विवरण (Data from Purchase Order)</span>
                                <span className="text-xs">PO No: {initialData.orderNo || initialData.magFormNo} | Vendor: {initialData.vendorDetails?.name}</span>
                            </div>
                        </div>
                    )}
                    <div className="grid md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <Input label="आर्थिक वर्ष" value={currentFiscalYear} readOnly disabled icon={<Calendar size={16} />} tabIndex={-1} />
                        <Select label="गोदाम/स्टोर *" options={storeOptions} value={commonDetails.storeId} onChange={e => handleCommonDetailsChange('storeId', e.target.value)} required icon={<StoreIcon size={16} />} />
                        <Select label="प्राप्तिको स्रोत" options={mode === 'opening' ? [{ id: 'opening', value: 'Opening', label: 'ओपनिङ्ग' }] : receiptSourceOptions} value={commonDetails.receiptSource} onChange={e => handleCommonDetailsChange('receiptSource', e.target.value)} required icon={<ArrowUpCircle size={16} />} disabled={mode === 'opening'} />
                        <NepaliDatePicker label="मिति (BS)" value={commonDetails.dateBs} onChange={val => handleCommonDetailsChange('dateBs', val)} required minDate={todayBs} maxDate={todayBs} />
                        <div className="col-span-2"><Input label="आपूर्तिकर्ता / स्रोत" value={commonDetails.supplier} onChange={(e) => handleCommonDetailsChange('supplier', e.target.value)} placeholder="Supplier Name" icon={<User size={16} />} /></div>
                        <div className="col-span-1"><Input label="खरिद आदेश / हस्तान्तरण नं" value={commonDetails.refNo} onChange={(e) => handleCommonDetailsChange('refNo', e.target.value)} placeholder="PO / Hafa No" icon={<FileText size={16} />} /></div>
                        {mode === 'add' && <div className="col-span-1"><Input label="दाखिला नं *" value={commonDetails.dakhilaNo} onChange={(e) => handleCommonDetailsChange('dakhilaNo', e.target.value)} required icon={<Hash size={16} />} className="font-bold text-purple-700" /></div>}
                    </div>
                    {validationError && <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl text-red-700 text-sm">{validationError}</div>}
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-3 py-2 w-8">#</th>
                                    <th className="px-3 py-2 w-40">सामानको नाम</th>
                                    <th className="px-3 py-2 w-24">खाता पाना नं</th>
                                    <th className="px-3 py-2 w-24">युनिक कोड</th>
                                    <th className="px-3 py-2 w-24">सङ्केत नं</th>
                                    <th className="px-3 py-2 w-24">प्रकार</th>
                                    <th className="px-3 py-2 w-24">वर्गीकरण</th>
                                    <th className="px-3 py-2 w-20">एकाई</th>
                                    <th className="px-3 py-2 w-20">परिमाण</th>
                                    <th className="px-3 py-2 w-20">दर</th>
                                    <th className="px-3 py-2 w-16">कर %</th>
                                    <th className="px-3 py-2 w-24">जम्मा रकम</th>
                                    <th className="px-3 py-2 w-24">ब्याच नं</th>
                                    <th className="px-3 py-2 w-28">म्याद (AD)</th> 
                                    <th className="px-3 py-2 w-24">विशिष्टता</th> 
                                    <th className="px-3 py-2 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {bulkItems.map((item, index) => (
                                    <tr key={item.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2 text-center">{index + 1}</td>
                                        <td className="px-1 py-1"><SearchableSelect options={index === 0 ? allInventoryItemOptions : filteredInventoryItemOptions} value={item.itemName} onChange={newName => handleItemNameChange(item.id, newName)} onSelect={(option) => handleItemSelect(item.id, option)} placeholder="सामान छान्नुहोस्" className="!pl-3 !pr-8" label="" /></td>
                                        <td className="px-1 py-1"><Input value={item.ledgerPageNo || ''} onChange={e => handleItemFieldChange(item.id, 'ledgerPageNo', e.target.value)} placeholder="पाना नं" className="!pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1"><Input value={item.uniqueCode || ''} onChange={e => handleItemFieldChange(item.id, 'uniqueCode', e.target.value)} placeholder="कोड" className="!pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1"><Input value={item.sanketNo || ''} onChange={e => handleItemFieldChange(item.id, 'sanketNo', e.target.value)} placeholder="सङ्केत नं" className="!pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1"><Select options={itemTypeOptions} value={item.itemType} onChange={e => handleItemFieldChange(item.id, 'itemType', e.target.value as any)} placeholder="-- प्रकार --" className={`!pl-3 !pr-8 ${index > 0 ? 'bg-slate-100' : ''}`} icon={undefined} label="" disabled={index > 0} /></td>
                                        <td className="px-1 py-1"><Select options={itemClassificationOptions} value={item.itemClassification || ''} onChange={e => handleItemFieldChange(item.id, 'itemClassification', e.target.value)} placeholder="-- वर्गीकरण --" className="!pl-3 !pr-8" icon={undefined} label="" onAddOptionHotkeyTriggered={() => setShowAddClassificationModal(true)} addOptionHotkey="Alt+c" /></td>
                                        <td className="px-1 py-1"><Input value={item.unit} onChange={e => handleItemFieldChange(item.id, 'unit', e.target.value)} placeholder="एकाई" className="!pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1"><Input type="number" value={item.currentQuantity === 0 ? '' : item.currentQuantity} onChange={e => handleItemFieldChange(item.id, 'currentQuantity', e.target.value)} placeholder="०" className="text-center !pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1"><Input type="number" value={item.rate === undefined || item.rate === null ? '' : item.rate} onChange={e => handleItemFieldChange(item.id, 'rate', e.target.value)} placeholder="०.००" className="text-right !pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1"><Input type="number" value={item.tax === undefined || item.tax === null ? '' : item.tax} onChange={e => handleItemFieldChange(item.id, 'tax', e.target.value)} placeholder="०" className="text-right !pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1 text-right font-bold text-slate-700 bg-slate-50">{item.totalAmount?.toFixed(2) || '0.00'}</td>
                                        <td className="px-1 py-1"><Input value={shouldShowBatchExpiry(item.itemClassification) ? (item.batchNo || '') : '-'} onChange={e => handleItemFieldChange(item.id, 'batchNo', e.target.value)} placeholder="ब्याच" className="!pl-3" label="" icon={undefined} disabled={!shouldShowBatchExpiry(item.itemClassification)}/></td>
                                        <td className="px-1 py-1">{shouldShowBatchExpiry(item.itemClassification) ? (<EnglishDatePicker value={item.expiryDateAd || ''} onChange={val => handleItemFieldChange(item.id, 'expiryDateAd', val)} label="" />) : (<div className="w-full h-[38px] bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">-</div>)}</td>
                                        <td className="px-1 py-1"><Input value={item.specification || ''} onChange={e => handleItemFieldChange(item.id, 'specification', e.target.value)} placeholder="Model/Brand" className="!pl-3" label="" icon={undefined}/></td>
                                        <td className="px-1 py-1 text-center"><button type="button" onClick={() => handleRemoveRow(item.id)} className="text-red-500 hover:text-red-700 p-1"><X size={14} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={handleAddRow} className="flex items-center gap-2 px-4 py-2 mt-4 text-primary-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors border border-dashed border-slate-300"><Plus size={18} /> लहर थप्नुहोस् (Add Row)</button>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0 -mx-6 -mb-6 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">रद्द (Cancel)</button>
                        <button type="submit" disabled={isSaving} className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg text-sm font-medium shadow-sm transition-colors ${saveButtonColor}`}><Send size={16} />{isSaving ? 'पठाउँदै...' : 'अनुरोध पेश गर्नुहोस् (Submit Request)'}</button>
                    </div>
                </form>
            </div>
            <AddOptionModal isOpen={showAddClassificationModal} onClose={() => setShowAddClassificationModal(false)} onSave={onAddClassification} title="नयाँ वर्गीकरण" label="नाम" placeholder="उदा: सर्जिकल" />
            <AddOptionModal isOpen={showAddSourceModal} onClose={() => setShowAddSourceModal(false)} onSave={onAddReceiptSource} title="नयाँ स्रोत" label="नाम" placeholder="उदा: मन्त्रालय" />
        </div>
    );
};

export const JinshiMaujdat: React.FC<JinshiMaujdatProps> = ({ 
  currentFiscalYear, 
  currentUser,
  inventoryItems, 
  onAddInventoryItem, 
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onRequestStockEntry,
  stores,
  pendingPoDakhila,
  onClearPendingPoDakhila
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterType, setFilterType] = useState(''); 
  const [filterClass, setFilterClass] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [selectedItemForView, setSelectedItemForView] = useState<InventoryItem | null>(null);
  const [bulkMode, setBulkMode] = useState<'opening' | 'add'>('add');

  // Pagination for performance (700+ items)
  const [displayLimit, setDisplayLimit] = useState(50);
  const PAGE_SIZE = 50;

  const [itemClassificationOptions, setItemClassificationOptions] = useState<Option[]>(initialItemClassificationOptions);
  const [receiptSourceOptions, setReceiptSourceOptions] = useState<Option[]>(initialReceiptSourceOptions);

  useEffect(() => {
    if (pendingPoDakhila) {
      setBulkMode('add');
      setShowBulkModal(true);
    }
  }, [pendingPoDakhila]);

  const storeOptions: Option[] = useMemo(() => stores.map(s => ({ id: s.id, value: s.id, label: s.name })), [stores]);

  // UPDATED: Filter out items with 0 currentQuantity for counts
  const expendableCount = useMemo(() => 
    inventoryItems.filter(i => i.itemType === 'Expendable' && i.currentQuantity > 0 && (i.fiscalYear === currentFiscalYear || !i.fiscalYear)).length, 
  [inventoryItems, currentFiscalYear]);
  
  const nonExpendableCount = useMemo(() => 
    inventoryItems.filter(i => i.itemType === 'Non-Expendable' && i.currentQuantity > 0 && (i.fiscalYear === currentFiscalYear || !i.fiscalYear)).length, 
  [inventoryItems, currentFiscalYear]);

  // UPDATED: Filter out items with 0 currentQuantity for listing
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
        // Essential condition: Must have stock
        if (item.currentQuantity <= 0) return false;
        
        // Filter by Fiscal Year (include items with no fiscal year for backward compatibility)
        if (item.fiscalYear && item.fiscalYear !== currentFiscalYear) return false;

        const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (item.uniqueCode && item.uniqueCode.toLowerCase().includes(searchTerm.toLowerCase())) || 
                             (item.sanketNo && item.sanketNo.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStore = filterStore ? item.storeId === filterStore : true;
        const matchesType = filterType ? item.itemType === filterType : true;
        const matchesClass = filterClass ? item.itemClassification === filterClass : true;
        return matchesSearch && matchesStore && matchesType && matchesClass;
    });
  }, [inventoryItems, searchTerm, filterStore, filterType, filterClass, currentFiscalYear]);

  const handleCarryForward = () => {
      // Calculate previous fiscal year
      const parts = currentFiscalYear.split('/');
      if (parts.length !== 2) return;
      
      const startYear = parseInt(parts[0]);
      const endYear = parseInt(parts[1]);
      const prevFiscalYear = `${startYear - 1}/0${endYear - 1}`; // Assuming 0 padding for the second part if needed, but usually it's 3 digits? No, it's 082 -> 081.
      // Better logic:
      // '2082/083' -> '2081/082'
      // '2081/082' -> '2080/081'
      
      // Let's use a robust parser
      const prevStart = startYear - 1;
      const prevEnd = parseInt(parts[1]) - 1;
      const prevFiscalYearStr = `${prevStart}/${String(prevEnd).padStart(3, '0')}`;

      // Find items from previous fiscal year with remaining stock
      const prevItems = inventoryItems.filter(item => 
          item.fiscalYear === prevFiscalYearStr && item.currentQuantity > 0
      );

      if (prevItems.length === 0) {
          alert(`अघिल्लो आर्थिक वर्ष (${prevFiscalYearStr}) मा कुनै मौज्दात भेटिएन। (No stock found in previous fiscal year)`);
          return;
      }

      // Filter out items that already exist in current fiscal year (to prevent duplicates)
      const itemsToTransfer = prevItems.filter(prevItem => {
          const exists = inventoryItems.some(currItem => 
              currItem.fiscalYear === currentFiscalYear && 
              currItem.itemName === prevItem.itemName && 
              currItem.storeId === prevItem.storeId &&
              currItem.uniqueCode === prevItem.uniqueCode
          );
          return !exists;
      });

      if (itemsToTransfer.length === 0) {
          alert(`अघिल्लो आर्थिक वर्षका सबै सामानहरू यस आर्थिक वर्षमा पहिले नै सारिसकिएको छ। (All items already transferred)`);
          return;
      }

      if (!window.confirm(`अघिल्लो आर्थिक वर्ष (${prevFiscalYearStr}) बाट ${itemsToTransfer.length} वटा सामानहरू यस आर्थिक वर्ष (${currentFiscalYear}) मा सार्न चाहनुहुन्छ?`)) {
          return;
      }

      // Create new items
      let successCount = 0;
      itemsToTransfer.forEach(item => {
          const newItem: InventoryItem = {
              ...item,
              id: `FY-${currentFiscalYear}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              fiscalYear: currentFiscalYear,
              receiptSource: 'Opening',
              dakhilaNo: '', // Reset dakhila no for opening stock
              remarks: `Transferred from ${prevFiscalYearStr}`,
              lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
              lastUpdateDateAd: new Date().toISOString().split('T')[0]
          };
          onAddInventoryItem(newItem);
          successCount++;
      });

      alert(`${successCount} वटा सामानहरू सफलतापूर्वक सारियो।`);
  };

  const paginatedItems = useMemo(() => filteredItems.slice(0, displayLimit), [filteredItems, displayLimit]);

  const handleEditClick = (item: InventoryItem) => { setSelectedItemForEdit(item); setShowEditModal(true); };
  const handleViewClick = (item: InventoryItem) => { setSelectedItemForView(item); };
  const handleUpdateItem = (updatedItem: InventoryItem) => { onUpdateInventoryItem(updatedItem); setShowEditModal(false); setSelectedItemForEdit(null); };

  const handleDeleteClick = (item: InventoryItem) => {
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं सामान "${item.itemName}" हटाउन चाहनुहुन्छ?`)) {
      onDeleteInventoryItem(item.id);
    }
  };

  const generateNewSequentialCode = useCallback((
      prefix: string, 
      currentFy: string, 
      committedItems: InventoryItem[], 
      draftItems: InventoryItem[],     
      key: 'uniqueCode' | 'sanketNo'
  ): string => {
      const fyClean = currentFy.replace('/', '');
      const allRelevantItems = [...committedItems, ...draftItems]; // Combine existing and draft
      const relevantCodes = allRelevantItems
          .filter(item => item[key] && String(item[key]).startsWith(`${prefix}-${fyClean}-`))
          .map(item => {
              const code = String(item[key]);
              const parts = code.split('-');
              return parts.length > 2 ? parseInt(parts[2]) : 0;
          })
          .filter(num => !isNaN(num)); 
      const maxNum = relevantCodes.length > 0 ? Math.max(...relevantCodes) : 0;
      return `${prefix}-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  }, [currentFiscalYear]); // Dependency: currentFiscalYear


  const handleBulkSave = (items: InventoryItem[], source: string, dateBs: string, dateAd: string, storeId: string, supplier: string, refNo: string, dakhilaNo: string, mode: 'opening' | 'add') => {
      const request: StockEntryRequest = {
          id: Date.now().toString(),
          requestDateBs: dateBs,
          requestDateAd: dateAd,
          fiscalYear: currentFiscalYear,
          storeId: storeId,
          receiptSource: source,
          supplier: supplier,
          refNo: refNo,
          items: items.map(item => ({ ...item, rate: Number(item.rate) || 0, tax: Number(item.tax) || 0, currentQuantity: Number(item.currentQuantity) || 0, totalAmount: Number(item.totalAmount) || 0, dakhilaNo: mode === 'add' ? dakhilaNo : item.dakhilaNo })),
          status: 'Pending', 
          requestedBy: currentUser.username,
          requesterName: currentUser.fullName,
          requesterDesignation: currentUser.designation,
          mode: mode
      };
      onRequestStockEntry(request);
      alert(`स्टक दाखिला अनुरोध सफलतापूर्वक पेश भयो। एडमिन स्वीकृतिको लागि पठाइएको छ।`);
      if (pendingPoDakhila && onClearPendingPoDakhila) onClearPendingPoDakhila();
  };

  const handleAddClassification = (newClass: string) => { setItemClassificationOptions(prev => [...prev, { id: newClass.toLowerCase(), value: newClass, label: newClass }]); };
  const handleAddReceiptSource = (newSource: string) => { setReceiptSourceOptions(prev => [...prev, { id: newSource.toLowerCase(), value: newSource, label: newSource }]); };
  const handleOpenBulkModal = (mode: 'opening' | 'add') => { setBulkMode(mode); setShowBulkModal(true); };

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
  const isStorekeeper = currentUser.role === 'STOREKEEPER';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Warehouse size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">जिन्सी मौज्दात (Inventory Stock)</h2>
            <p className="text-sm text-slate-500">हाल {filteredItems.length} सामानहरू मौज्दातमा उपलब्ध छन्।</p>
          </div>
        </div>
        {isStorekeeper ? (
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handleCarryForward} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-medium shadow-sm transition-colors justify-center" title="अघिल्लो आ.व. बाट मौज्दात सार्नुहोस्"><History size={18} /><span className="font-nepali">आ.व. सार्नुहोस् (Transfer FY)</span></button>
                <button onClick={() => handleOpenBulkModal('opening')} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors justify-center"><ArrowUpCircle size={18} /><span className="font-nepali">ओपनिङ्ग (Opening)</span></button>
                <button onClick={() => handleOpenBulkModal('add')} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium shadow-sm transition-colors justify-center"><Plus size={18} /><span className="font-nepali">दाखिला (Add Stock)</span></button>
            </div>
        ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg border border-orange-200 text-xs font-bold shadow-sm">
                <ShieldAlert size={16} className="text-orange-600" />
                <span className="font-nepali">स्टक दाखिला जिन्सी शाखाले मात्र गर्न मिल्छ (Restricted to Storekeeper)</span>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
              onClick={() => setFilterType('')}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filterType === '' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
          >
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${filterType === '' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}><List size={20} /></div>
                  <span className="font-bold font-nepali">सबै सामानहरू (All)</span>
              </div>
              <span className={`text-lg font-black ${filterType === '' ? 'text-white' : 'text-slate-400'}`}>{filteredItems.length}</span>
          </button>

          <button 
              onClick={() => setFilterType('Expendable')}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filterType === 'Expendable' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200 scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
          >
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${filterType === 'Expendable' ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}><Layers size={20} /></div>
                  <span className="font-bold font-nepali">खर्च भएर जाने (Expendable)</span>
              </div>
              <span className={`text-lg font-black ${filterType === 'Expendable' ? 'text-white' : 'text-slate-400'}`}>{expendableCount}</span>
          </button>

          <button 
              onClick={() => setFilterType('Non-Expendable')}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${filterType === 'Non-Expendable' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
          >
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${filterType === 'Non-Expendable' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}><CheckSquare size={20} /></div>
                  <span className="font-bold font-nepali">खर्च भएर नजाने (Fixed Assets)</span>
              </div>
              <span className={`text-lg font-black ${filterType === 'Non-Expendable' ? 'text-white' : 'text-slate-400'}`}>{nonExpendableCount}</span>
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="सामान, कोड खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select label="स्टोर फिल्टर" options={[{id: 'all', value: '', label: 'All Stores'}, ...storeOptions]} value={filterStore} onChange={e => setFilterStore(e.target.value)} placeholder="Filter by Store" icon={<StoreIcon size={16} />} />
          <Select label="वर्गीकरण फिल्टर" options={[{id: 'all', value: '', label: 'All Classes'}, ...itemClassificationOptions]} value={filterClass} onChange={e => setFilterClass(e.target.value)} placeholder="Filter by Class" icon={<Tag size={16} />} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 font-nepali flex items-center gap-2">
                  <Package size={18} className="text-slate-400" />
                  {filterType === '' ? 'सबै मौज्दात सूची' : filterType === 'Expendable' ? 'खर्च हुने सामानको सूची' : 'खर्च नहुने सामानको सूची'}
              </h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-3 py-1 rounded-full">{filteredItems.length} Items with Stock</span>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-xs text-left responsive-table">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-3 w-12 text-center">SN</th>
                          <th className="px-4 py-3 min-w-[200px]">Item Name / Specification</th>
                          <th className="px-4 py-3 w-24">जि.खा.पा.नं</th>
                          <th className="px-4 py-3 w-32">Unique Code / Sanket</th>
                          <th className="px-4 py-3 w-28">Store</th>
                          <th className="px-4 py-3 w-28">Classification</th>
                          <th className="px-4 py-3 w-20 text-center">Qty</th>
                          <th className="px-4 py-3 w-28">Batch / Expiry (AD)</th>
                          <th className="px-4 py-3 w-24 text-right">Rate</th>
                          <th className="px-4 py-3 w-24 text-right">Total</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {paginatedItems.length === 0 ? (
                          <tr><td colSpan={11} className="px-6 py-12 text-center text-slate-400 italic font-nepali text-base">माथि छानिएको प्रकारमा कुनै सामान भेटिएन। (No items with stock found.)</td></tr>
                      ) : (
                          paginatedItems.map((item, index) => {
                              const storeName = storeOptions.find(s => s.value === item.storeId)?.label || 'Unknown';
                              return (
                                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 text-center text-slate-500" data-label="SN">{index + 1}</td>
                                      <td className="px-4 py-3" data-label="Item Name">
                                          <div className="font-bold text-slate-800">{item.itemName}</div>
                                          <div className="text-[10px] text-slate-500 italic truncate max-w-[200px]">{item.specification || '-'}</div>
                                      </td>
                                      <td className="px-4 py-3 font-mono font-bold text-indigo-700" data-label="Ledger Page">{item.ledgerPageNo || '-'}</td>
                                      <td className="px-4 py-3 text-[10px] text-slate-500 font-mono" data-label="Codes">
                                          <div>U: {item.uniqueCode || '-'}</div>
                                          <div>S: {item.sanketNo || '-'}</div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600" data-label="Store">{storeName}</td>
                                      <td className="px-4 py-3" data-label="Classification">
                                          <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold border mb-1 ${item.itemType === 'Expendable' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                              {item.itemType === 'Expendable' ? 'EXP' : 'FIX'}
                                          </span>
                                          <div className="text-[10px] text-slate-500">{item.itemClassification}</div>
                                      </td>
                                      <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50" data-label="Quantity">
                                          {item.currentQuantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                                      </td>
                                      <td className="px-4 py-3" data-label="Batch/Expiry">
                                          <div className="text-[10px] font-bold text-orange-600">{item.batchNo || '-'}</div>
                                          <div className="text-[9px] text-slate-400">{item.expiryDateAd || '-'}</div>
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-600" data-label="Rate">{item.rate?.toFixed(2) || '-'}</td>
                                      <td className="px-4 py-3 text-right font-bold text-slate-800" data-label="Total">{item.totalAmount?.toFixed(2) || '-'}</td>
                                      <td className="px-4 py-3 text-center" data-label="Actions">
                                          <div className="flex items-center justify-center gap-1">
                                              <button onClick={() => handleViewClick(item)} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-full transition-all" title="Full Details"><Info size={16}/></button>
                                              <button onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-full transition-all" title="Edit"><Edit size={16} /></button>
                                              {isAdmin && (
                                                <button onClick={() => handleDeleteClick(item)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-all" title="Delete">
                                                  <Trash2 size={16} />
                                                </button>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>
          {filteredItems.length > displayLimit && (
              <div className="p-4 bg-slate-50 border-t flex justify-center">
                  <button 
                    onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                  >
                      थप लोड गर्नुहोस् (Load More {filteredItems.length - displayLimit} items)
                  </button>
              </div>
          )}
      </div>

      {showEditModal && selectedItemForEdit && (<EditInventoryItemModal isOpen={showEditModal} item={selectedItemForEdit} onClose={() => { setShowEditModal(false); setSelectedItemForEdit(null); }} onSave={handleUpdateItem} storeOptions={storeOptions} itemClassificationOptions={itemClassificationOptions} />)}
      {showBulkModal && (<BulkInventoryEntryModal mode={bulkMode} onClose={() => { setShowBulkModal(false); if (onClearPendingPoDakhila) onClearPendingPoDakhila(); }} onSave={handleBulkSave} committedInventoryItems={inventoryItems} currentFiscalYear={currentFiscalYear} storeOptions={storeOptions} receiptSourceOptions={receiptSourceOptions} itemClassificationOptions={itemClassificationOptions} onAddClassification={handleAddClassification} onAddReceiptSource={handleAddReceiptSource} initialData={pendingPoDakhila} generateNewSequentialCode={generateNewSequentialCode} onClearPendingPoDakhila={onClearPendingPoDakhila} />)}
      {selectedItemForView && (<ItemDetailsModal item={selectedItemForView} storeName={storeOptions.find(s => s.value === selectedItemForView.storeId)?.label || 'Unknown'} onClose={() => setSelectedItemForView(null)} />)}
    </div>
  );
};
