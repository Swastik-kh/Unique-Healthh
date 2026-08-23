import React, { useState, useMemo } from 'react';
import { ColdChainEquipment } from '../types/healthTypes';
import { User, OrganizationSettings } from '../types/coreTypes';
import { 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Filter, 
  Thermometer, X, ShieldAlert, Sparkles, RefreshCw, Box, AlertCircle
} from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';

interface ColdChainEquipmentProps {
  equipmentList: ColdChainEquipment[];
  onSaveEquipment: (equipment: ColdChainEquipment) => void;
  onDeleteEquipment: (equipmentId: string) => void;
  currentUser: User | null;
  generalSettings: OrganizationSettings;
  onBackToLogs?: () => void;
}

const EQUIPMENT_TYPES = [
  { value: 'ILR', label: 'ILR (Ice-Lined Refrigerator)' },
  { value: 'Deep Freezer', label: 'Deep Freezer (डिप फ्रिजर)' },
  { value: 'Cold Box', label: 'Cold Box (कोल्ड बक्स)' },
  { value: 'Other', label: 'अन्य उपकरण (Other)' }
];

export const ColdChainEquipmentManager: React.FC<ColdChainEquipmentProps> = ({
  equipmentList,
  onSaveEquipment,
  onDeleteEquipment,
  currentUser,
  generalSettings,
  onBackToLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ColdChainEquipment | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ColdChainEquipment>>({
    name: '',
    type: 'ILR',
    serialNumber: '',
    model: '',
    location: '',
    isActive: true,
    remarks: ''
  });

  const [formError, setFormError] = useState('');

  const filteredList = useMemo(() => {
    return equipmentList.filter(item => {
      const matchesSearch = 
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
      const matchesStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && item.isActive) ||
        (statusFilter === 'INACTIVE' && !item.isActive);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [equipmentList, searchTerm, typeFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      type: 'ILR',
      serialNumber: '',
      model: '',
      location: '',
      isActive: true,
      remarks: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ColdChainEquipment) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      serialNumber: item.serialNumber || '',
      model: item.model || '',
      location: item.location || '',
      isActive: item.isActive !== false,
      remarks: item.remarks || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setFormError('कृपया उपकरणको नाम प्रविष्ट गर्नुहोस्।');
      return;
    }

    const payload: ColdChainEquipment = {
      id: editingItem ? editingItem.id : `cce-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: formData.name.trim(),
      type: (formData.type as any) || 'ILR',
      serialNumber: formData.serialNumber?.trim() || '',
      model: formData.model?.trim() || '',
      location: formData.location?.trim() || '',
      isActive: formData.isActive !== false,
      remarks: formData.remarks?.trim() || '',
      _orgName: editingItem?._orgName || currentUser?.organizationName || generalSettings.orgNameNepali
    };

    onSaveEquipment(payload);
    setIsModalOpen(false);
  };

  const handleDelete = (item: ColdChainEquipment) => {
    if (window.confirm(`के तपाईं "${item.name}" उपकरण हटाउन निश्चित हुनुहुन्छ?`)) {
      onDeleteEquipment(item.id);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ILR':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">ILR (Refrigerator)</span>;
      case 'Deep Freezer':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">Deep Freezer</span>;
      case 'Cold Box':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">Cold Box</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-nepali">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-100 text-cyan-700 rounded-xl">
              <Thermometer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">कोल्ड चेन उपकरण सूची (Cold Chain Equipment Registry)</h2>
              <p className="text-xs text-slate-500">
                खोप भण्डारण गर्ने ILR फ्रिज, डिप फ्रिजर तथा कोल्ड बक्सहरूको सूची र विवरण
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBackToLogs && (
            <button
              onClick={onBackToLogs}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              तापक्रम लगमा फर्कनुहोस्
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} /> नयाँ उपकरण थप्नुहोस् (Add Equipment)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="उपकरणको नाम, सिरियल नं, मोडल वा स्थान खोज्नुहोस्..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
          >
            <option value="ALL">सबै प्रकार (All Types)</option>
            <option value="ILR">ILR</option>
            <option value="Deep Freezer">Deep Freezer</option>
            <option value="Cold Box">Cold Box</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-slate-700"
          >
            <option value="ALL">सबै स्थिति (All Status)</option>
            <option value="ACTIVE">सक्रिय मात्र (Active Only)</option>
            <option value="INACTIVE">निष्क्रिय मात्र (Inactive Only)</option>
          </select>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="p-3.5 pl-5">क्र.सं.</th>
                <th className="p-3.5">उपकरणको नाम (Name)</th>
                <th className="p-3.5">प्रकार (Type)</th>
                <th className="p-3.5">सिरियल नं (Serial No.)</th>
                <th className="p-3.5">मोडल (Model)</th>
                <th className="p-3.5">स्थान (Location)</th>
                <th className="p-3.5 text-center">स्थिति (Status)</th>
                <th className="p-3.5 text-right pr-5">कार्य (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Box size={36} className="mx-auto mb-2 opacity-40 text-slate-500" />
                    <p className="font-bold text-slate-600 text-sm">कुनै उपकरण फेला परेन</p>
                    <p className="text-xs text-slate-400 mt-1">नयाँ खोप फ्रिज वा उपकरण थप्न "नयाँ उपकरण थप्नुहोस्" बटन प्रयोग गर्नुहोस्।</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono text-slate-500">{index + 1}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800">{item.name}</span>
                      {item.remarks && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.remarks}</p>
                      )}
                    </td>
                    <td className="p-3.5">{getTypeBadge(item.type)}</td>
                    <td className="p-3.5 font-mono text-slate-600">{item.serialNumber || '—'}</td>
                    <td className="p-3.5 text-slate-600">{item.model || '—'}</td>
                    <td className="p-3.5 text-slate-600">{item.location || '—'}</td>
                    <td className="p-3.5 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> सक्रिय
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle size={12} /> निष्क्रिय
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                          title="सम्पादन गर्नुहोस्"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="हटाउनुहोस्"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 font-nepali">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Thermometer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingItem ? 'उपकरण विवरण सम्पादन (Edit Equipment)' : 'नयाँ उपकरण दर्ता (New Equipment Registration)'}
                  </h3>
                  <p className="text-xs text-cyan-100">कोल्ड चेन खोप फ्रिज वा बक्सको विवरण</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <Input
                  label="उपकरणको नाम (Equipment Name) *"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="उदा: ILR Fridge 1, Deep Freezer A"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="उपकरणको प्रकार (Equipment Type)"
                    value={formData.type || 'ILR'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    options={EQUIPMENT_TYPES}
                  />

                  <Input
                    label="सिरियल नम्बर (Serial Number)"
                    value={formData.serialNumber || ''}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="उदा: SN-938472"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="मोडल (Model / Make)"
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="उदा: Vestfrost VLS 024"
                  />

                  <Input
                    label="स्थान / कोठा (Location / Room)"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="उदा: खोप कक्ष (Room 102)"
                  />
                </div>

                <Input
                  label="कैफियत (Remarks)"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="कुनै अतिरिक्त विवरण..."
                />

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                    />
                    <span>सक्रिय उपकरण (Active Equipment - दैनिक तापक्रम लगमा देखिने)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  सुरक्षित गर्नुहोस् (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
