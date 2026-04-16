
import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, ClipboardList, FileDigit, Building2, Phone, MapPin, Search, Calendar, X, CheckCircle2, User } from 'lucide-react';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
// Corrected import path for FirmEntry
import { FirmEntry } from '../types/inventoryTypes';

interface FirmListingProps {
  currentFiscalYear: string;
  firms: FirmEntry[];
  onAddFirm: (firm: FirmEntry) => void;
}

export const FirmListing: React.FC<FirmListingProps> = ({ currentFiscalYear, firms, onAddFirm }) => {
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
    firmRegNo: '',
    firmName: '',
    vatPan: '',
    address: '',
    contactNo: '',
    registrationDateAd: getTodayDateAd(),
    registrationDateBs: '',
    fiscalYear: currentFiscalYear,
  });

  const generateFirmRegNo = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    // Find max existing reg number for the current FY
    const maxNum = firms
      .filter(f => f.fiscalYear === currentFiscalYear && f.firmRegNo.startsWith(`F-${fyClean}-`))
      .map(f => parseInt(f.firmRegNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    
    return `F-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      firmRegNo: generateFirmRegNo(),
      fiscalYear: currentFiscalYear,
    }));
  }, [currentFiscalYear, firms]); // Regenerate if fiscal year changes or new firm is added (to update sequential number)


  const handleReset = () => {
    setFormData({
      firmRegNo: generateFirmRegNo(),
      firmName: '',
      vatPan: '',
      address: '',
      contactNo: '',
      registrationDateAd: getTodayDateAd(),
      registrationDateBs: '',
      fiscalYear: currentFiscalYear,
    });
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!formData.firmName.trim()) {
      setValidationError('फर्मको नाम आवश्यक छ। (Firm Name is required)');
      return;
    }
    if (!formData.vatPan.trim()) {
      setValidationError('VAT/PAN नम्बर आवश्यक छ। (VAT/PAN is required)');
      return;
    }
    if (!formData.address.trim()) {
      setValidationError('ठेगाना आवश्यक छ। (Address is required)');
      return;
    }
    if (!formData.contactNo.trim()) {
      setValidationError('सम्पर्क नम्बर आवश्यक छ। (Contact Number is required)');
      return;
    }
    if (!formData.registrationDateBs.trim()) {
      setValidationError('दर्ता मिति आवश्यक छ। (Registration Date is required)');
      return;
    }

    const newFirm: FirmEntry = {
      id: Date.now().toString(),
      ...formData,
    };

    onAddFirm(newFirm);
    setSuccessMessage('फर्म सफलतापूर्वक दर्ता भयो! (Firm Registered Successfully!)');
    handleReset(); // Reset form after successful submission
  };

  const filteredFirms = firms.filter(firm =>
    firm.fiscalYear === currentFiscalYear && (
      firm.firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.firmRegNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.vatPan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.contactNo.includes(searchTerm)
    )
  ).sort((a, b) => b.firmRegNo.localeCompare(a.firmRegNo)); // Sort by regNo descending

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">फर्म सुचीकरण (Firm Listing)</h2>
            <p className="text-sm text-slate-500">नयाँ फर्मको विवरण प्रविष्ट गर्नुहोस्</p>
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
        <div className="flex items-center gap-2 mb-6 text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Building2 size={20} />
            <span className="font-semibold font-nepali">नयाँ फर्म विवरण (New Firm Details)</span>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <Input
              label="आर्थिक वर्ष (Fiscal Year)"
              value={formData.fiscalYear}
              readOnly
              className="bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
              icon={<Calendar size={16} />}
            />

            <Input
              label="फर्म सुचीकरण दर्ता नं. (Firm Reg No)"
              value={formData.firmRegNo}
              readOnly
              className="font-mono font-bold text-blue-600"
              icon={<FileDigit size={16} />}
            />
            
            <NepaliDatePicker
              label="दर्ता मिति (Registration Date - BS)"
              value={formData.registrationDateBs}
              onChange={(val) => setFormData({...formData, registrationDateBs: val})}
              required
            />
          </div>

          <Input
            label="फर्मको नाम (Firm Name)"
            value={formData.firmName}
            onChange={e => setFormData({...formData, firmName: e.target.value})}
            required
            placeholder="फर्मको पूरा नाम"
            icon={<User size={16} />}
          />

          <Input
            label="VAT/PAN नम्बर"
            value={formData.vatPan}
            onChange={e => setFormData({...formData, vatPan: e.target.value})}
            required
            placeholder="VAT/PAN नम्बर"
            icon={<FileDigit size={16} />}
          />

          <Input
            label="ठेगाना (Address)"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            required
            placeholder="ठेगाना (जस्तै: नगरपालिका-वडा, जिल्ला)"
            icon={<MapPin size={16} />}
          />

          <Input
            label="सम्पर्क नं. (Contact No)"
            type="tel"
            value={formData.contactNo}
            onChange={e => setFormData({...formData, contactNo: e.target.value})}
            required
            placeholder="98XXXXXXXX"
            icon={<Phone size={16} />}
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

      {/* Registered Firms List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-700 font-nepali">दर्ता भएका फर्महरू (Registered Firms)</h3>
            <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{firms.length}</span>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="फर्मको नाम, दर्ता नं. वा फोन खोज्नुहोस्..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Reg No</th>
                <th className="px-6 py-3">Firm Name</th>
                <th className="px-6 py-3">VAT/PAN</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Reg. Date (BS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFirms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    {searchTerm ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै फर्म दर्ता भएको छैन (No firms registered)'}
                  </td>
                </tr>
              ) : (
                filteredFirms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600 whitespace-nowrap">{firm.firmRegNo}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{firm.firmName}</td>
                    <td className="px-6 py-4 text-slate-600">{firm.vatPan}</td>
                    <td className="px-6 py-4 text-slate-600">{firm.address}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{firm.contactNo}</td>
                    <td className="px-6 py-4 text-slate-600 font-nepali">{firm.registrationDateBs}</td>
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