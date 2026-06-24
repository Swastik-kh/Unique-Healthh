import React, { useState } from 'react';
import { 
  Monitor, Tv, Cpu, Wifi, Globe, Plus, Trash2, RefreshCw, 
  Play, CheckCircle2, AlertCircle, Link, Copy, ExternalLink,
  Signal, SignalLow, Settings2, Save
} from 'lucide-react';
import { DisplayDevice, User } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';

interface DisplaySettingsProps {
  currentUser: User;
  displayDevices: DisplayDevice[];
  onSaveDisplayDevice: (device: DisplayDevice) => void;
  onDeleteDisplayDevice: (id: string) => void;
  availableServices: string[];
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({
  currentUser,
  displayDevices,
  onSaveDisplayDevice,
  onDeleteDisplayDevice,
  availableServices
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DisplayDevice | null>(null);
  const [formData, setFormData] = useState<Partial<DisplayDevice>>({
    name: '',
    location: '',
    type: 'SmartTV',
    status: 'Offline',
    assignedServices: []
  });

  const isAuthorized = currentUser.role === 'ADMIN' || 
                       currentUser.role === 'SUPER_ADMIN' || 
                       currentUser.allowedMenus?.includes('display_settings');

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">पहुँच अस्वीकृत (Access Denied)</h3>
      </div>
    );
  }

  const handleOpenForm = (device?: DisplayDevice) => {
    if (device) {
      setEditingDevice(device);
      setFormData(device);
    } else {
      setEditingDevice(null);
      const newId = `DISP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      // In a real app, the URL would be derived from the current origin
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setFormData({
        id: newId,
        name: '',
        location: '',
        type: 'SmartTV',
        status: 'Offline',
        url: `${baseUrl}/display?id=${newId}`,
        assignedServices: []
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.id) {
      onSaveDisplayDevice(formData as DisplayDevice);
      setIsFormOpen(false);
    }
  };

  const toggleService = (service: string) => {
    const current = formData.assignedServices || [];
    if (current.includes(service)) {
      setFormData({ ...formData, assignedServices: current.filter(s => s !== service) });
    } else {
      setFormData({ ...formData, assignedServices: [...current, service] });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 p-2 rounded-lg text-white">
            <Monitor size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">डिस्प्ले सेटिङ (Display Settings)</h2>
            <p className="text-sm text-slate-500">LED, Smart TV र मोनिटरहरू व्यवस्थापन गर्नुहोस्</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all font-semibold"
        >
          <Plus size={18} />
          नयाँ डिस्प्ले थप्नुहोस्
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayDevices.map(device => (
          <div key={device.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all">
            <div className="p-4 border-b border-slate-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${device.status === 'Online' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  {device.type === 'SmartTV' ? <Tv size={20} /> : device.type === 'LED' ? <Cpu size={20} /> : <Monitor size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{device.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Globe size={12} /> {device.location}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                device.status === 'Online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${device.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                {device.status}
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Services</label>
                <div className="flex flex-wrap gap-1">
                  {device.assignedServices.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                      {s}
                    </span>
                  ))}
                  {device.assignedServices.length === 0 && <span className="text-[10px] text-slate-400 italic">None</span>}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between gap-2">
                <div className="truncate text-[10px] font-mono text-slate-500">{device.url}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => copyToClipboard(device.url)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded transition-all"
                    title="Copy URL"
                  >
                    <Copy size={14} />
                  </button>
                  <a 
                    href={device.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-white rounded transition-all"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenForm(device)}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                  >
                    <Settings2 size={18} />
                  </button>
                  <button 
                    onClick={() => onDeleteDisplayDevice(device.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <button 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-all"
                  onClick={() => alert(`Test signal sent to ${device.name}`)}
                >
                  <RefreshCw size={14} />
                  Test Display
                </button>
              </div>
            </div>
          </div>
        ))}

        {displayDevices.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Tv size={48} className="mb-4 opacity-20" />
            <p className="font-nepali text-lg">कुनै पनि डिस्प्ले उपकरणहरू भेटिएन।</p>
            <p className="text-sm">सुरु गर्न "नयाँ डिस्प्ले थप्नुहोस्" मा क्लिक गर्नुहोस्।</p>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {editingDevice ? 'डिस्प्ले सम्पादन गर्नुहोस्' : 'नयाँ डिस्प्ले थप्नुहोस्'}
                </h3>
                <p className="text-sm text-slate-500">डिस्प्ले विवरणहरू भर्नुहोस्</p>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <RefreshCw size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Display Name (e.g. Lobby TV 1)"
                  value={formData.name || ''}
                  onChange={v => setFormData({ ...formData, name: v })}
                  required
                />
                <Input
                  label="Location (e.g. Main Waiting Area)"
                  value={formData.location || ''}
                  onChange={v => setFormData({ ...formData, location: v })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Device Type"
                  options={[
                    { value: 'SmartTV', label: 'Smart TV / Browser' },
                    { value: 'LED', label: 'LED Display Controller' },
                    { value: 'Monitor', label: 'HDMI Monitor' },
                    { value: 'Other', label: 'Other Device' }
                  ]}
                  value={formData.type || 'SmartTV'}
                  onChange={v => setFormData({ ...formData, type: v as any })}
                />
                <Input
                  label="Device ID"
                  value={formData.id || ''}
                  onChange={() => {}}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Assigned Services</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50">
                  {availableServices.map(service => (
                    <label key={service} className="flex items-center gap-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={formData.assignedServices?.includes(service)}
                        onChange={() => toggleService(service)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-slate-700">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.url && (
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
                  <div className="flex items-center gap-2 text-primary-700 font-bold text-xs mb-1">
                    <Link size={14} />
                    Display URL (Open this on your TV/Monitor)
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[10px] font-mono text-primary-600">{formData.url}</div>
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(formData.url!)}
                      className="p-1.5 bg-white text-primary-600 rounded-lg shadow-sm hover:shadow transition-all"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-all"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                  <Save size={18} />
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
