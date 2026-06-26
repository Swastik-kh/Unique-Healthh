import React, { useState, useEffect } from 'react';
import { Save, Globe, Lock, User, ShieldCheck, Database, MapPin, CheckCircle2, RotateCcw } from 'lucide-react';
import { Input } from './Input';
import { OrganizationSettings, User as UserType } from '../types/coreTypes';

interface HIBSettingsProps {
    currentUser: UserType;
    settings: OrganizationSettings;
    onUpdateSettings: (settings: OrganizationSettings) => void;
}

export const HIBSettings: React.FC<HIBSettingsProps> = ({ currentUser, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);

  // Security Guard: Admin and Super Admin only (or those with specific permission if we add it)
  const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.allowedMenus?.includes('hib_settings');

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);

  if (!isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
            <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
            <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
            <p className="text-sm text-slate-500 max-w-md text-center">HIB सेटिङ व्यवस्थापन गर्न तपाईंलाई अनुमति छैन।</p>
        </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if(window.confirm('के तपाइँ HIB सेटिङहरू रिसेट गर्न चाहनुहुन्छ?')) {
        setLocalSettings(settings);
        setIsSaved(false);
    }
  };

  const fillTestData = () => {
    setLocalSettings(prev => ({
        ...prev,
        hibBaseUrl: 'https://imislegacy.hib.gov.np/',
        hibUsername: 'testuser',
        hibPassword: 'f/\\N6k@67',
        hibRemoteUser: 'hib_testuser_testfhir',
        hibPartnerId: '7aa79c53-057e-4e77-8576-dfcfb03584a8',
        hibLocationId: '1ac457d3-efd3-4a67-89b3-bf8cbe18045d'
    }));
    setIsSaved(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white"><ShieldCheck size={24} /></div>
            <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">HIB सेटिङ (HIB Settings)</h2>
            <p className="text-sm text-slate-500">स्वास्थ्य बीमा बोर्ड (HIB) API को कन्फिगरेसन व्यवस्थापन गर्नुहोस्</p>
            </div>
        </div>
        <button 
            type="button" 
            onClick={fillTestData}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
        >
            Fill Test Credentials
        </button>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 border-b pb-2">
                <Database size={18} className="text-indigo-600"/> API Connection Details
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
                <Input 
                    label="HIB API Base URL" 
                    value={localSettings.hibBaseUrl || ''} 
                    onChange={(e) => handleChange('hibBaseUrl', e.target.value)} 
                    placeholder="उदा: https://imislegacy.hib.gov.np"
                    icon={<Globe size={16} />}
                />
                <p className="text-[10px] text-slate-400 -mt-5 ml-10">युआरएलको अन्त्यमा स्ल्याश (/) राख्न जरुरी छैन (उदा: https://imislegacy.hib.gov.np)</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Input 
                    label="API Username" 
                    value={localSettings.hibUsername || ''} 
                    onChange={(e) => handleChange('hibUsername', e.target.value)} 
                    placeholder="testuser"
                    icon={<User size={16} />}
                />
                <Input 
                    label="API Password" 
                    type="password"
                    value={localSettings.hibPassword || ''} 
                    onChange={(e) => handleChange('hibPassword', e.target.value)} 
                    placeholder="••••••••"
                    icon={<Lock size={16} />}
                />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Input 
                    label="Remote User" 
                    value={localSettings.hibRemoteUser || ''} 
                    onChange={(e) => handleChange('hibRemoteUser', e.target.value)} 
                    placeholder="hib_testuser_testfhir"
                    icon={<User size={16} />}
                />
                <Input 
                    label="Partner ID" 
                    value={localSettings.hibPartnerId || ''} 
                    onChange={(e) => handleChange('hibPartnerId', e.target.value)} 
                    placeholder="UUID Format"
                    icon={<ShieldCheck size={16} />}
                />
                <Input 
                    label="Location ID" 
                    value={localSettings.hibLocationId || ''} 
                    onChange={(e) => handleChange('hibLocationId', e.target.value)} 
                    placeholder="UUID Format"
                    icon={<MapPin size={16} />}
                />
            </div>
        </div>

        <div className="flex gap-4">
            {currentUser?.hasSaveAccess !== false && (
                <button 
                    type="submit" 
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-900 transition-all shadow-md"
                >
                    {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                    {isSaved ? 'सुरक्षित भयो' : 'HIB सेटिङ सुरक्षित गर्नुहोस्'}
                </button>
            )}
            <button 
                type="button" 
                onClick={handleReset} 
                className="flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-6 py-3 rounded-lg font-medium hover:bg-red-50 transition-all"
            >
                <RotateCcw size={18} />
                रिसेट
            </button>
        </div>
      </form>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
        <h4 className="text-amber-800 font-bold text-sm mb-1">महत्वपूर्ण जानकारी:</h4>
        <ul className="text-xs text-amber-700 space-y-1 list-disc ml-4">
            <li>यहाँ प्रविष्ट गरिएको विवरणहरू HIB API सँग बिरामी विवरण खोज्न र एलिजिबिलिटी चेक गर्न प्रयोग गरिन्छ।</li>
            <li>यदि तपाईं टेस्टिङ गर्दै हुनुहुन्छ भने "Fill Test Credentials" बटन थिच्नुहोस्।</li>
            <li>सुरक्षाको लागि पासवर्ड सुरक्षित रूपमा राखिन्छ।</li>
        </ul>
      </div>
    </div>
  );
};
