import fs from 'fs';

let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Update states
content = content.replace(
  `  const [showSettings, setShowSettings] = useState(false);`,
  `  const [showSettings, setShowSettings] = useState(false);
  const [settingsSelectedOrg, setSettingsSelectedOrg] = useState('');`
);

// Update isAdmin and add isSuperAdmin
content = content.replace(
  `  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';`,
  `  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const allOrganizations = Array.from(new Set(users?.map(u => u.organizationName).filter(Boolean))).sort();`
);

// Update button visibility for settings
content = content.replace(
  `                        {isAdmin && (
                <button 
                  onClick={openSettings}`,
  `                        {isSuperAdmin && (
                <button 
                  onClick={openSettings}`
);

// We need to inject the loadMappingForOrg function and update openSettings
let newSettingsLogic = `
  const loadMappingForOrg = async (orgName: string) => {
      if (!orgName) {
          setSelectedOffices([]);
          return;
      }
      try {
          const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', orgName);
          const mappingDoc = await getDoc(mappingDocRef);
          if (mappingDoc.exists()) {
              setSelectedOffices(mappingDoc.data().officeNames || []);
          } else {
              setSelectedOffices([]);
          }
      } catch (e) {
          console.error(e);
      }
  };

  const openSettings = async () => {
    setShowSettings(true);
    const targetOrg = currentUser?.organizationName || '';
    setSettingsSelectedOrg(targetOrg);
    await loadMappingForOrg(targetOrg);
    try {
        const q = query(collection(sujhabDb, 'gunasos'));
        const querySnapshot = await getDocs(q);
        const offices = new Set<string>();
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.office) {
                offices.add(data.office);
            }
        });
        setAllOffices(Array.from(offices).sort());
    } catch(err) {
        console.error("Error fetching distinct offices", err);
    }
  };

  const saveSettings = async () => {
    if (!settingsSelectedOrg) return;
    setIsSaving(true);
    try {
        const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', settingsSelectedOrg);
        await setDoc(mappingDocRef, { officeNames: selectedOffices }, { merge: true });
        
        if (settingsSelectedOrg === currentUser?.organizationName) {
            fetchData(); // Reload data with new settings if it's their own
        } else {
            alert("म्यापिङ सफलतापूर्वक सेभ भयो।");
        }
        setShowSettings(false);
    } catch(err) {
        console.error("Error saving mapping", err);
    } finally {
        setIsSaving(false);
    }
  };
`;

// replace openSettings and saveSettings
content = content.replace(/const openSettings = async \(\) => \{[\s\S]*?const saveSettings = async \(\) => \{[\s\S]*?\}  \};/, newSettingsLogic);

// Update settings UI
let settingsUI = `
              <div className="p-6 overflow-y-auto flex-1 bg-white">
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
                 </p>
`;

content = content.replace(
  `              <div className="p-6 overflow-y-auto flex-1 bg-white">
                 <p className="text-sm text-slate-500 font-nepali mb-4">
                     तपाईंको संस्था "{currentUser?.organizationName}" मा कुन-कुन कार्यालयका सुझावहरू देखाउने भनेर छनोट गर्नुहोस्:
                 </p>`,
  settingsUI
);

fs.writeFileSync('components/SujhabPetika.tsx', content);
