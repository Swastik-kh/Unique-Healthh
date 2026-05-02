import React, { useState, useEffect } from 'react';
import { Save, Building2, Globe, Phone, Mail, FileText, Percent, Calendar, RotateCcw, Image, CheckCircle2, Lock, ListChecks, Plus, Trash2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS, AVAILABLE_SERVICES } from '../constants';
import { OrganizationSettings, User as UserType } from '../types/coreTypes'; // Changed import

interface GeneralSettingProps {
    currentUser: UserType;
    settings: OrganizationSettings;
    onUpdateSettings: (settings: OrganizationSettings) => void;
}

export const GeneralSetting: React.FC<GeneralSettingProps> = ({ currentUser, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [newService, setNewService] = useState('');

  // Security Guard: Admin and Super Admin only
  const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);

  if (!isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
            <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
            <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
            <p className="text-sm text-slate-500 max-w-md text-center">प्रणाली सेटिङ व्यवस्थापन गर्न तपाईंलाई अनुमति छैन।</p>
        </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleAddService = () => {
    if (!newService.trim()) return;
    
    const currentOptions = localSettings.allServiceOptions || AVAILABLE_SERVICES;
    if (currentOptions.includes(newService.trim())) {
        alert('यो सेवा पहिले नै सूचीमा छ।');
        return;
    }

    const updatedOptions = [...currentOptions, newService.trim()];
    handleChange('allServiceOptions', updatedOptions);
    setNewService('');
  };

  const handleRemoveService = (serviceToRemove: string) => {
    if (!window.confirm(`के तपाईं "${serviceToRemove}" लाई उपलब्ध सेवाहरूको सूचीबाट हटाउन चाहनुहुन्छ?`)) return;

    const currentOptions = localSettings.allServiceOptions || AVAILABLE_SERVICES;
    const updatedOptions = currentOptions.filter(s => s !== serviceToRemove);
    
    const currentSelected = localSettings.availableServices || [];
    const updatedSelected = currentSelected.filter(s => s !== serviceToRemove);

    setLocalSettings(prev => ({
        ...prev,
        allServiceOptions: updatedOptions,
        availableServices: updatedSelected
    }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if(window.confirm('के तपाइँ सेटिङहरू रिसेट गर्न चाहनुहुन्छ?')) {
        setLocalSettings(settings);
        setIsSaved(false);
    }
  };

  const serviceOptions = localSettings.allServiceOptions || AVAILABLE_SERVICES;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-slate-800 p-2 rounded-lg text-white"><Building2 size={24} /></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">सामान्य सेटिङ (General Settings)</h2>
          <p className="text-sm text-slate-500">संस्थाको विवरण र प्रणाली कन्फिगरेसन व्यवस्थापन गर्नुहोस्</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Building2 size={18} className="text-primary-600"/>संस्थाको विवरण</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="१. मुख्य नाम" value={localSettings.orgNameNepali} onChange={(e) => handleChange('orgNameNepali', e.target.value)} required />
                    <Input label="२. उप-शीर्षक १" value={localSettings.subTitleNepali} onChange={(e) => handleChange('subTitleNepali', e.target.value)} />
                    <Input label="३. उप-शीर्षक २" value={localSettings.subTitleNepali2 || ''} onChange={(e) => handleChange('subTitleNepali2', e.target.value)} />
                    <Input label="४. उप-शीर्षक ३" value={localSettings.subTitleNepali3 || ''} onChange={(e) => handleChange('subTitleNepali3', e.target.value)} />
                </div>
                <hr className="my-4 border-slate-100" />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="संस्थाको नाम (English)" value={localSettings.orgNameEnglish} onChange={(e) => handleChange('orgNameEnglish', e.target.value)} />
                    <Input label="ठेगाना" value={localSettings.address} onChange={(e) => handleChange('address', e.target.value)} required />
                </div>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input label="फोन नं." value={localSettings.phone} onChange={(e) => handleChange('phone', e.target.value)} icon={<Phone size={16} />} />
                    <Input label="एम्बुलेन्स सेवा नं." value={localSettings.ambulancePhone || ''} onChange={(e) => handleChange('ambulancePhone', e.target.value)} icon={<Phone size={16} />} />
                    <Input label="ईमेल" value={localSettings.email} onChange={(e) => handleChange('email', e.target.value)} icon={<Mail size={16} />} />
                    <Input label="वेबसाइट" value={localSettings.website} onChange={(e) => handleChange('website', e.target.value)} icon={<Globe size={16} />} />
                </div>
                <div className="mt-4"><Input label="PAN/VAT No" value={localSettings.panNo} onChange={(e) => handleChange('panNo', e.target.value)} icon={<FileText size={16} />} /></div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><ListChecks size={18} className="text-primary-600"/>उपलब्ध सेवाहरू</h3>
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            placeholder="नयाँ सेवा थप्नुहोस्..." 
                            value={newService}
                            onChange={(e) => setNewService(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddService();
                                }
                            }}
                            className="text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button 
                            type="button"
                            onClick={handleAddService}
                            className="bg-primary-600 text-white p-1.5 rounded-lg hover:bg-primary-700 transition-colors"
                            title="थप्नुहोस्"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {serviceOptions.map(service => (
                        <div key={service} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input 
                                    type="checkbox" 
                                    checked={localSettings.availableServices?.includes(service) || false}
                                    onChange={(e) => {
                                        const services = localSettings.availableServices || [];
                                        const newServices = e.target.checked 
                                            ? [...services, service] 
                                            : services.filter(s => s !== service);
                                        handleChange('availableServices', newServices);
                                    }}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm text-slate-700">{service}</span>
                            </label>
                            <button 
                                type="button"
                                onClick={() => handleRemoveService(service)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                title="हटाउनुहोस्"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><Globe size={18} className="text-primary-600"/>प्रणाली कन्फिगरेसन</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <Select label="सक्रिय आर्थिक वर्ष" options={FISCAL_YEARS} value={localSettings.activeFiscalYear} onChange={(e) => handleChange('activeFiscalYear', e.target.value)} icon={<Calendar size={16} />} />
                    <Input label="डिफल्ट VAT दर (%)" type="number" value={localSettings.defaultVatRate} onChange={(e) => handleChange('defaultVatRate', e.target.value)} icon={<Percent size={16} />} />
                </div>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Image size={18} className="text-primary-600"/>लोगो सेटिङ</h3>
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-slate-50 cursor-pointer group" onClick={() => document.getElementById('logo-upload')?.click()}>
                    <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const storageRef = ref(storage, `logos/${localSettings.orgNameEnglish || 'default'}_logo_${Date.now()}`);
                            const uploadTask = uploadBytesResumable(storageRef, file);
                            uploadTask.on('state_changed', 
                            null, 
                            (error) => alert('लोगो अपलोड गर्न समस्या भयो'),
                            () => {
                                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                                const updatedSettings = { ...localSettings, logoUrl: downloadURL };
                                setLocalSettings(updatedSettings);
                                onUpdateSettings(updatedSettings);
                                alert('लोगो सफलतापूर्वक अपलोड भयो र सबै फारमहरूमा लागू गरियो!');
                            });
                            });
                        }
                    }} />
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform overflow-hidden relative">
                        <img 
                            key={localSettings.logoUrl}
                            src={localSettings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png"} 
                            alt="Logo" 
                            className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] text-center p-1">
                            लोगो परिवर्तन गर्न क्लिक गर्नुहोस्
                        </div>
                    </div>
                    <span className="text-sm font-medium text-primary-600">नयाँ लोगो अपलोड गर्नुहोस्</span>
                </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border shadow-inner"><div className="flex flex-col gap-3"><button type="submit" className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-900">{isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}{isSaved ? 'सुरक्षित भयो' : 'सेटिङ सुरक्षित गर्नुहोस्'}</button><button type="button" onClick={handleReset} className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 py-3 rounded-lg font-medium hover:bg-red-50"><RotateCcw size={18} />रिसेट (Reset)</button></div><p className="text-xs text-center text-slate-400 mt-4">Last updated: {new Date().toLocaleDateString()}</p></div>
        </div>
      </form>
    </div>
  );
};