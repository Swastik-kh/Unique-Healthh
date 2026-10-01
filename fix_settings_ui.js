import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

const oldUI = `              <div className="p-6 overflow-y-auto flex-1 bg-white">
                 <p className="text-sm text-slate-500 font-nepali mb-4">
                     तपाईंको संस्था "{currentUser?.organizationName}" मा कुन-कुन कार्यालयका सुझावहरू देखाउने भनेर छनोट गर्नुहोस्:
                 </p>`;

const newUI = `              <div className="p-6 overflow-y-auto flex-1 bg-white">
                 <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 font-nepali mb-2">
                        संस्था छान्नुहोस्:
                    </label>
                    <select 
                        value={settingsSelectedOrg}
                        onChange={(e) => {
                            setSettingsSelectedOrg(e.target.value);
                            loadMappingForOrg(e.target.value);
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-nepali focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">-- संस्था छान्नुहोस् --</option>
                        {allOrganizations.map((org, idx) => (
                            <option key={idx} value={org}>{org}</option>
                        ))}
                    </select>
                 </div>
                 
                 <p className="text-sm text-slate-500 font-nepali mb-4">
                     लक्षित संस्थामा कुन-कुन कार्यालयका सुझावहरू देखाउने भनेर छनोट गर्नुहोस्:
                 </p>`;

content = content.replace(oldUI, newUI);
fs.writeFileSync('components/SujhabPetika.tsx', content);
