import fs from 'fs';

let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Add new state
content = content.replace(
  `  const [settingsSelectedOrg, setSettingsSelectedOrg] = useState('');`,
  `  const [settingsSelectedOrg, setSettingsSelectedOrg] = useState('');
  const [newManualOffice, setNewManualOffice] = useState('');`
);

// Add addManualOffice function
let newFunc = `
  const addManualOffice = () => {
    if (!newManualOffice.trim()) return;
    const office = newManualOffice.trim();
    if (!allOffices.includes(office)) {
      setAllOffices(prev => [...prev, office].sort());
    }
    if (!selectedOffices.includes(office)) {
      setSelectedOffices(prev => [...prev, office]);
    }
    setNewManualOffice('');
  };

  const loadMappingForOrg = async (orgName: string) => {`;

content = content.replace(`  const loadMappingForOrg = async (orgName: string) => {`, newFunc);

// Update Settings UI to include manual entry and better layout
let oldSettingsUI = `                 <p className="text-sm text-slate-500 font-nepali mb-4">
                     लक्षित संस्थामा कुन-कुन कार्यालयका सुझावहरू देखाउने भनेर छनोट गर्नुहोस्:
                 </p>
                                  {allOffices.length === 0 ? (
                     <div className="flex justify-center p-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>
                 ) : (
                     <div className="space-y-2 border border-slate-200 rounded-xl p-2 max-h-60 overflow-y-auto bg-slate-50">
                         {allOffices.map((office, idx) => (`;

let newSettingsUI = `                 <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 font-nepali mb-2">नयाँ कार्यालय थप्नुहोस् (Add Office):</label>
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={newManualOffice}
                            onChange={(e) => setNewManualOffice(e.target.value)}
                            placeholder="कार्यालयको नाम..."
                            className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button 
                            onClick={addManualOffice}
                            disabled={!newManualOffice.trim()}
                            className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center gap-1 font-nepali"
                        >
                            <Plus size={16} />
                            थप्नुहोस्
                        </button>
                    </div>
                 </div>

                 <p className="text-sm text-slate-500 font-nepali mb-4">
                     लक्षित संस्थामा कुन-कुन कार्यालयका सुझावहरू देखाउने भनेर छनोट गर्नुहोस्:
                 </p>
                                  {allOffices.length === 0 && !isSaving ? (
                     <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50">
                        <Building size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-500 font-nepali">कुनै कार्यालय भेटिएन। माथिबाट थप्न सक्नुहुन्छ।</p>
                     </div>
                 ) : (
                     <div className="space-y-2 border border-slate-200 rounded-xl p-2 max-h-60 overflow-y-auto bg-slate-50">
                         {allOffices.map((office, idx) => (`;

content = content.replace(oldSettingsUI, newSettingsUI);

fs.writeFileSync('components/SujhabPetika.tsx', content);
