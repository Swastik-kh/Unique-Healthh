import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

const oldLogic = `  const openSettings = async () => {
    setShowSettings(true);
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
    if (!currentUser?.organizationName) return;
    setIsSaving(true);
    try {
        const mappingDocRef = doc(localDb, 'sujhabPetikaOfficeMap', currentUser.organizationName);
        await setDoc(mappingDocRef, { officeNames: selectedOffices }, { merge: true });
        setShowSettings(false);
        fetchData(); // Reload data with new settings
    } catch(err) {
        console.error("Error saving mapping", err);
    } finally {
        setIsSaving(false);
    }
  };`;

const newLogic = `  const loadMappingForOrg = async (orgName: string) => {
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
            fetchData();
        } else {
            alert("म्यापिङ सफलतापूर्वक सेभ भयो।");
        }
        setShowSettings(false);
    } catch(err) {
        console.error("Error saving mapping", err);
    } finally {
        setIsSaving(false);
    }
  };`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('components/SujhabPetika.tsx', content);
