

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Save, X, Building2, User, Phone, MapPin, Search, Calendar, CheckCircle2, Store as StoreIcon, AlertCircle, RefreshCcw, FileDigit, SlidersHorizontal, BarChart4, Lock } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// Corrected import paths for Store, InventoryItem, User
import { User as UserType } from '../types/coreTypes';
import { Store, InventoryItem } from '../types/inventoryTypes';

interface StoreSetupProps {
  currentUser: UserType;
  currentFiscalYear: string;
  stores: Store[];
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;
  inventoryItems?: InventoryItem[]; 
  onUpdateInventoryItem?: (item: InventoryItem) => void; 
}

export const StoreSetup: React.FC<StoreSetupProps> = ({ 
  currentUser,
  currentFiscalYear, 
  stores, 
  onAddStore, 
  onUpdateStore, 
  onDeleteStore,
  inventoryItems = [],
  onUpdateInventoryItem
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    fiscalYear: currentFiscalYear,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security Guard: Admin and Super Admin only
  const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  // State for Global Stock Level Configuration Modal
  const [showStockLevelModal, setShowStockLevelModal] = useState(false);
  const [stockLevelConfig, setStockLevelConfig] = useState<{
      id: string; // The ID of the item being configured
      itemName: string;
      approvedStockLevel: number;
      emergencyOrderPoint: number;
  } | null>(null);
  const [stockLevelSearch, setStockLevelSearch] = useState('');
  const [isUpdatingStockLevel, setIsUpdatingStockLevel] = useState(false);


  // Generate unique registration number
  const generateStoreRegNo = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    const maxNum = stores
      .filter(s => s.fiscalYear === currentFiscalYear && s.regNo.startsWith(`S-${fyClean}-`))
      .map(s => parseInt(s.regNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    
    return `S-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (!editingStoreId && !showForm) {
      setFormData(prev => ({ ...prev, fiscalYear: currentFiscalYear }));
    } else if (editingStoreId) {
        const editingStore = stores.find(s => s.id === editingStoreId);
        if (editingStore && editingStore.fiscalYear !== formData.fiscalYear) {
            setFormData(prev => ({ ...prev, fiscalYear: editingStore.fiscalYear }));
        }
    }
  }, [currentFiscalYear, editingStoreId, showForm, stores]);

  if (!isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
            <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
            <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
            <p className="text-sm text-slate-500 max-w-md text-center">स्टोर सेटअप व्यवस्थापन गर्न तपाईंलाई अनुमति छैन। कृपया एडमिनसँग सम्पर्क गर्नुहोस्।</p>
        </div>
    );
  }

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditClick = (store: Store) => {
    setEditingStoreId(store.id);
    setFormData({
      name: store.name,
      address: store.address,
      contactPerson: store.contactPerson || '',
      contactPhone: store.contactPhone || '',
      fiscalYear: store.fiscalYear,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingStoreId(null);
    setFormData({
      name: '',
      address: '',
      contactPerson: '',
      contactPhone: '',
      fiscalYear: currentFiscalYear,
    });
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!formData.name.trim()) {
      setValidationError('गोदामको नाम आवश्यक छ। (Store Name is required)');
      return;
    }
    if (!formData.address.trim()) {
      setValidationError('ठेगाना आवश्यक छ। (Address is required)');
      return;
    }

    if (editingStoreId) {
      const updatedStore: Store = {
        id: editingStoreId,
        regNo: stores.find(s => s.id === editingStoreId)?.regNo || generateStoreRegNo(), 
        ...formData,
      };
      onUpdateStore(updatedStore);
      setSuccessMessage('गोदाम सफलतापूर्वक अपडेट भयो!');
    } else {
      const newStore: Store = {
        id: Date.now().toString(),
        regNo: generateStoreRegNo(),
        ...formData,
      };
      onAddStore(newStore);
      setSuccessMessage('गोदाम सफलतापूर्वक दर्ता भयो!');
    }

    setShowForm(false);
    resetForm();
  };

  const handleDeleteClick = (storeId: string) => {
    if (window.confirm('के तपाईं निश्चित हुनुहुन्छ? यो गोदामसँग सम्बन्धित सबै जिन्सी सामानहरू पनि स्थायी रूपमा मेटिनेछन्।')) {
      onDeleteStore(storeId);
      setSuccessMessage('गोदाम सफलतापूर्वक डिलिट भयो।');
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name)); 

  // STOCK LEVEL MANAGEMENT LOGIC
  const availableInventoryItemsForStockLevel = useMemo(() => {
    return inventoryItems
      .filter(item => item.itemType === 'Expendable') // Only Expendable items typically have stock levels
      .filter(item => 
          item.itemName.toLowerCase().includes(stockLevelSearch.toLowerCase()) || 
          (item.uniqueCode && item.uniqueCode.toLowerCase().includes(stockLevelSearch.toLowerCase()))
      )
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [inventoryItems, stockLevelSearch]);

  const handleEditStockLevel = (item: InventoryItem) => {
    setStockLevelConfig({
      id: item.id,
      itemName: item.itemName,
      approvedStockLevel: item.approvedStockLevel || 0,
      emergencyOrderPoint: item.emergencyOrderPoint || 0,
    });
  };

  const handleSaveStockLevel = () => {
    if (!stockLevelConfig || !onUpdateInventoryItem) return;
    setIsUpdatingStockLevel(true);

    const updatedItem = inventoryItems.find(item => item.id === stockLevelConfig.id);
    if (updatedItem) {
      onUpdateInventoryItem({
        ...updatedItem,
        approvedStockLevel: stockLevelConfig.approvedStockLevel,
        emergencyOrderPoint: stockLevelConfig.emergencyOrderPoint,
      });
      setSuccessMessage(`${updatedItem.itemName} को स्टक लेभल सफलतापूर्वक अपडेट गरियो!`);
    } else {
      setValidationError("स्टक लेभल अपडेट गर्न सकिएन।");
    }
    
    setIsUpdatingStockLevel(false);
    setStockLevelConfig(null); // Close individual config
  };

  const handleApplyToAllStockLevels = () => {
      if (!onUpdateInventoryItem) return;
      
      const newASL = parseInt(prompt("सबै सामानको लागि नयाँ स्वीकृत स्टक लेभल (ASL) प्रविष्ट गर्नुहोस् (संख्या मात्र):") || '0');
      if (isNaN(newASL) || newASL < 0) {
          alert("कृपया मान्य संख्या प्रविष्ट गर्नुहोस्।");
          return;
      }

      const newEOP = parseInt(prompt("सबै सामानको लागि नयाँ आपतकालीन अर्डर पोइन्ट (EOP) प्रविष्ट गर्नुहोस् (संख्या मात्र):") || '0');
      if (isNaN(newEOP) || newEOP < 0) {
          alert("कृपया मान्य संख्या प्रविष्ट गर्नुहोस्।");
          return;
      }

      if (newEOP >= newASL) {
          alert("आपतकालीन अर्डर पोइन्ट (EOP) स्वीकृत स्टक लेभल (ASL) भन्दा कम हुनुपर्छ।");
          return;
      }
      
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईंले "${newASL}" लाई सबै खर्च हुने सामानहरूको ASL र "${newEOP}" लाई EOP बनाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
          setIsUpdatingStockLevel(true);
          inventoryItems.filter(item => item.itemType === 'Expendable').forEach(item => {
              onUpdateInventoryItem({
                  ...item,
                  approvedStockLevel: newASL,
                  emergencyOrderPoint: newEOP,
              });
          });
          setSuccessMessage(`सबै खर्च हुने सामानहरूको स्टक लेभल सफलतापूर्वक "${newASL}" (ASL) र "${newEOP}" (EOP) मा अपडेट गरियो!`);
          setIsUpdatingStockLevel(false);
      }
  };


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><StoreIcon size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">स्टोर सेटअप (Store Setup)</h2>
            <p className="text-sm text-slate-500">गोदामहरू र स्टक लेभल व्यवस्थापन गर्नुहोस्।</p>
          </div>
        </div>
        {!showForm && (
          <div className="flex gap-2">
             <button onClick={() => setShowStockLevelModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><SlidersHorizontal size={18} /><span className="font-nepali">स्टक लेभल</span></button>
             <button onClick={handleAddNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"><Plus size={18} /><span className="font-nepali">नयाँ गोदाम</span></button>
          </div>
        )}
      </div>

      {successMessage && <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3"><CheckCircle2 size={24} className="text-green-500" /><div className="flex-1 text-green-800 font-medium">{successMessage}</div><button onClick={() => setSuccessMessage(null)}><X size={20} className="text-green-400" /></button></div>}
      {validationError && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3"><AlertCircle size={24} className="text-red-500" /><div className="flex-1 text-red-800 font-medium">{validationError}</div><button onClick={() => setValidationError(null)}><X size={20} className="text-red-400" /></button></div>}


      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="font-semibold text-slate-700">{editingStoreId ? 'गोदाम विवरण सच्याउनुहोस्' : 'नयाँ गोदाम विवरण'}</h3><button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button></div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border grid md:grid-cols-2 gap-4">
                <Input label="आर्थिक वर्ष" value={formData.fiscalYear} readOnly className="bg-slate-100" icon={<Calendar size={16} />} />
                <Input label="गोदाम दर्ता नं." value={editingStoreId ? (stores.find(s => s.id === editingStoreId)?.regNo || '-') : generateStoreRegNo()} readOnly className="font-mono text-orange-600" icon={<FileDigit size={16} />} />
            </div>
            <Input label="गोदामको नाम" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required icon={<Building2 size={16} />} />
            <Input label="ठेगाना" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
            <Input label="सम्पर्क व्यक्ति" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} icon={<User size={16} />} />
            <Input label="सम्पर्क फोन नं." type="tel" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} icon={<Phone size={16} />} />
            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">रद्द</button><button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm">सुरक्षित गर्नुहोस्</button></div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-slate-700 font-nepali">दर्ता भएका गोदामहरू ({filteredStores.length})</h3>
          <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 rounded-lg border outline-none text-sm" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="px-6 py-3">Reg No</th><th className="px-6 py-3">Name</th><th className="px-6 py-3">Address</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-orange-600">{store.regNo}</td>
                  <td className="px-6 py-4 font-medium">{store.name}</td>
                  <td className="px-6 py-4 text-slate-600">{store.address}</td>
                  <td className="px-6 py-4 text-slate-600">{store.contactPerson || '-'}<br/><span className="text-xs">{store.contactPhone}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(store)} className="text-primary-400 hover:text-primary-600 p-1"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteClick(store.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Level Management Modal */}
      {showStockLevelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => {setShowStockLevelModal(false); setStockLevelConfig(null);}}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><BarChart4 size={20} /></div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">स्टक लेभल व्यवस्थापन (Stock Level Management)</h3>
                            <p className="text-xs text-slate-500">ASL (Approved Stock Level) र EOP (Emergency Order Point) सेट गर्नुहोस्।</p>
                        </div>
                    </div>
                    <button onClick={() => {setShowStockLevelModal(false); setStockLevelConfig(null);}} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <div className="relative w-full max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="सामानको नाम खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm" value={stockLevelSearch} onChange={e => setStockLevelSearch(e.target.value)} />
                        </div>
                        <button onClick={handleApplyToAllStockLevels} disabled={isUpdatingStockLevel} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                            <RefreshCcw size={16} /> सबैलाई लागू गर्नुहोस्
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                                <tr>
                                    <th className="px-4 py-3">सामानको नाम</th>
                                    <th className="px-4 py-3 text-center">हालको मौज्दात</th>
                                    <th className="px-4 py-3 text-center">ASL</th>
                                    <th className="px-4 py-3 text-center">EOP</th>
                                    <th className="px-4 py-3 text-right">कार्य</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {availableInventoryItemsForStockLevel.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">खर्च हुने कुनै सामान भेटिएन।</td></tr>
                                ) : (
                                    availableInventoryItemsForStockLevel.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{item.itemName}</div>
                                                <div className="text-[10px] text-slate-500">{item.uniqueCode || item.sanketNo}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold">{item.currentQuantity} <span className="text-[10px] text-slate-400">{item.unit}</span></td>
                                            <td className="px-4 py-3 text-center text-blue-700 font-bold">{item.approvedStockLevel || '-'}</td>
                                            <td className="px-4 py-3 text-center text-orange-600 font-bold">{item.emergencyOrderPoint || '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleEditStockLevel(item)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">Edit</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={() => {setShowStockLevelModal(false); setStockLevelConfig(null);}} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm">बन्द गर्नुहोस्</button>
                </div>
            </div>
        </div>
      )}

      {/* Individual Stock Level Config Modal */}
      {stockLevelConfig && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setStockLevelConfig(null)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                      <h3 className="font-bold text-slate-800 text-lg font-nepali">स्टक लेभल सेट गर्नुहोस्</h3>
                      <button onClick={() => setStockLevelConfig(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="font-bold text-slate-800">{stockLevelConfig.itemName}</p>
                      <Input 
                          label="स्वीकृत स्टक लेभल (ASL)" 
                          type="number" 
                          value={stockLevelConfig.approvedStockLevel || ''} 
                          onChange={e => setStockLevelConfig(prev => prev ? {...prev, approvedStockLevel: parseInt(e.target.value) || 0} : null)} 
                          min={0}
                      />
                      <Input 
                          label="आपतकालीन अर्डर पोइन्ट (EOP)" 
                          type="number" 
                          value={stockLevelConfig.emergencyOrderPoint || ''} 
                          onChange={e => setStockLevelConfig(prev => prev ? {...prev, emergencyOrderPoint: parseInt(e.target.value) || 0} : null)} 
                          min={0}
                      />
                       {stockLevelConfig.emergencyOrderPoint >= stockLevelConfig.approvedStockLevel && (
                           <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2">
                               <AlertCircle size={16} className="mt-0.5 shrink-0" />
                               <span>आपतकालीन अर्डर पोइन्ट (EOP) स्वीकृत स्टक लेभल (ASL) भन्दा कम हुनुपर्छ।</span>
                           </div>
                       )}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setStockLevelConfig(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">रद्द</button>
                      <button 
                        onClick={handleSaveStockLevel} 
                        disabled={isUpdatingStockLevel || (stockLevelConfig.emergencyOrderPoint >= stockLevelConfig.approvedStockLevel)}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
                      >
                          <Save size={16} /> बचत गर्नुहोस्
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};