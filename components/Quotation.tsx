
import React, { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, FileSpreadsheet, Building2, Package, Search, Calendar, X, CheckCircle2, DollarSign } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// Corrected import paths for FiscalYear, FirmEntry, QuotationEntry, Option, InventoryItem
import { FiscalYear, Option } from '../types/coreTypes';
import { FirmEntry, QuotationEntry, InventoryItem } from '../types/inventoryTypes';
import { FISCAL_YEARS } from '../constants';
import { SearchableSelect } from './SearchableSelect';

interface QuotationProps {
  currentFiscalYear: string;
  firms: FirmEntry[];
  quotations: QuotationEntry[];
  onAddQuotation: (quotation: QuotationEntry) => void;
  inventoryItems: InventoryItem[]; // Added prop to access stock
}

export const Quotation: React.FC<QuotationProps> = ({ currentFiscalYear, firms, quotations, onAddQuotation, inventoryItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const getTodayDateAd = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    fiscalYear: currentFiscalYear,
    firmId: '',
    firmName: '',
    itemName: '',
    unit: '',
    rate: '',
    quotationDateAd: getTodayDateAd(),
    quotationDateBs: '',
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      fiscalYear: currentFiscalYear,
    }));
  }, [currentFiscalYear]);

  const handleReset = () => {
    setFormData({
      fiscalYear: currentFiscalYear,
      firmId: '',
      firmName: '',
      itemName: '',
      unit: '',
      rate: '',
      quotationDateAd: getTodayDateAd(),
      quotationDateBs: '',
    });
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!formData.fiscalYear) {
      setValidationError('आर्थिक वर्ष आवश्यक छ। (Fiscal Year is required)');
      return;
    }
    if (!formData.firmId || !formData.firmName) {
      setValidationError('फर्मको नाम आवश्यक छ। (Firm Name is required)');
      return;
    }
    if (!formData.itemName.trim()) {
      setValidationError('सामानको नाम आवश्यक छ। (Item Name is required)');
      return;
    }
    if (!formData.unit.trim()) {
      setValidationError('एकाई आवश्यक छ। (Unit is required)');
      return;
    }
    if (!formData.rate.trim() || isNaN(parseFloat(formData.rate))) {
      setValidationError('मान्य दर आवश्यक छ। (Valid Rate is required)');
      return;
    }
    if (!formData.quotationDateBs.trim()) {
      setValidationError('कोटेशन मिति आवश्यक छ। (Quotation Date is required)');
      return;
    }

    const newQuotation: QuotationEntry = {
      id: Date.now().toString(),
      ...formData,
    };

    onAddQuotation(newQuotation);
    setSuccessMessage('कोटेशन सफलतापूर्वक दर्ता भयो! (Quotation Registered Successfully!)');
    handleReset(); // Reset form after successful submission
  };

  const firmOptions: Option[] = useMemo(() => firms.map(firm => ({
    id: firm.id,
    value: firm.id,
    label: `${firm.firmName} (PAN: ${firm.vatPan})`
  })), [firms]);

  // Generate Item Options from Inventory (Unique names, Alphabetical)
  // NOTE: Removed quantity filter to show 0 stock items as well, consistent with Mag Faram.
  const itemOptions: Option[] = useMemo(() => {
    // 1. Get all items (no quantity filter)
    const availableItems = inventoryItems;
    
    // 2. Extract unique names
    const uniqueNames = Array.from(new Set(availableItems.map(item => item.itemName)));
    
    // 3. Sort alphabetically and map to Option format
    return uniqueNames.sort().map(name => {
        // Find first occurrence to get unit (optional helper)
        const itemData = availableItems.find(i => i.itemName === name);
        return {
            id: name,
            value: name,
            label: `${name} ${itemData ? `(${itemData.unit})` : ''}`
        };
    });
  }, [inventoryItems]);

  const handleFirmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFirmId = e.target.value;
    const selectedFirm = firms.find(firm => firm.id === selectedFirmId);
    setFormData(prev => ({
      ...prev,
      firmId: selectedFirmId,
      firmName: selectedFirm ? selectedFirm.firmName : '',
    }));
  };

  const filteredQuotations = quotations.filter(quotation =>
    quotation.firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.fiscalYear.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.quotationDateAd).getTime() - new Date(a.quotationDateAd).getTime()); // Sort by date descending

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-600">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">सामानको कोटेशन (Item Quotation)</h2>
            <p className="text-sm text-slate-500">सामानको कोटेशन विवरण प्रविष्ट गर्नुहोस्</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600 transition-colors">
            <X size={20} />
          </button>
        </div>
      )}
      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2">
          <div className="text-red-500 mt-0.5">
            <X size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">विवरण मिलेन (Validation Error)</h3>
            <p className="text-red-700 text-sm mt-1 whitespace-pre-line leading-relaxed">{validationError}</p>
          </div>
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600 transition-colors">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-green-800 bg-green-50 p-3 rounded-lg border border-green-100">
            <DollarSign size={20} />
            <span className="font-semibold font-nepali">नयाँ कोटेशन विवरण (New Quotation Details)</span>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Select
            label="आर्थिक वर्ष (Fiscal Year)"
            options={FISCAL_YEARS}
            value={formData.fiscalYear}
            onChange={e => setFormData({...formData, fiscalYear: e.target.value})}
            required
            icon={<Calendar size={16} />}
            className="font-nepali"
          />

          <Select
            label="फर्मको नाम (Firm Name)"
            options={firmOptions}
            value={formData.firmId}
            onChange={handleFirmChange}
            required
            placeholder="-- फर्म छान्नुहोस् --"
            icon={<Building2 size={16} />}
            className="font-nepali"
          />
          
          <NepaliDatePicker
            label="कोटेशन मिति (Quotation Date - BS)"
            value={formData.quotationDateBs}
            onChange={(val) => setFormData({...formData, quotationDateBs: val})}
            required
          />

          <SearchableSelect
            label="सामानको नाम (Item Name)"
            options={itemOptions}
            value={formData.itemName}
            onChange={(val) => setFormData({...formData, itemName: val})}
            onSelect={(option) => {
                // Auto-fill unit if available from the option label context or find from original list
                const matchedItem = inventoryItems.find(i => i.itemName === option.value);
                if (matchedItem) {
                    setFormData(prev => ({...prev, itemName: option.value, unit: matchedItem.unit}));
                } else {
                    setFormData(prev => ({...prev, itemName: option.value}));
                }
            }}
            placeholder="सामानको नाम लेख्नुहोस् वा छान्नुहोस्"
            required
            icon={<Package size={16} />}
          />

          <Input
            label="एकाई (Unit)"
            value={formData.unit}
            onChange={e => setFormData({...formData, unit: e.target.value})}
            required
            placeholder="एकाई"
          />

          <Input
            label="दर (Rate)"
            type="number"
            value={formData.rate}
            onChange={e => setFormData({...formData, rate: e.target.value})}
            required
            placeholder="0.00"
            step="0.01"
            icon={<DollarSign size={16} />}
          />

          <div className="lg:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              <RotateCcw size={18} />
              <span>रिसेट (Reset)</span>
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
            >
              <Save size={18} />
              <span>दर्ता गर्नुहोस् (Register)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Registered Quotations List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-700 font-nepali">दर्ता भएका कोटेशनहरू (Registered Quotations)</h3>
            <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{quotations.length}</span>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="फर्म, सामान वा आ.व. खोज्नुहोस्..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Fiscal Year</th>
                <th className="px-6 py-3">Firm Name</th>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3">Quotation Date (BS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    {searchTerm ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै कोटेशन दर्ता भएको छैन (No quotations registered)'}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-600 font-nepali whitespace-nowrap">{quotation.fiscalYear}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{quotation.firmName}</td>
                    <td className="px-6 py-4 text-slate-600">{quotation.itemName}</td>
                    <td className="px-6 py-4 text-slate-600">{quotation.unit}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">रू. {quotation.rate}</td>
                    <td className="px-6 py-4 text-slate-600 font-nepali">{quotation.quotationDateBs}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};