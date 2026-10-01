import fs from 'fs';

let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Add new state for mapped organizations info
content = content.replace(
  `  const [newManualOffice, setNewManualOffice] = useState('');`,
  `  const [newManualOffice, setNewManualOffice] = useState('');
  const [mappedOrgsInfo, setMappedOrgsInfo] = useState<{org: string, offices: string[]}[]>([]);`
);

// Add useEffect to fetch all mappings for Super Admins
let useEffectCode = `
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchAllMappings = async () => {
        try {
          const querySnapshot = await getDocs(collection(localDb, 'sujhabPetikaOfficeMap'));
          const mappings: {org: string, offices: string[]}[] = [];
          querySnapshot.forEach((doc) => {
            mappings.push({ org: doc.id, offices: doc.data().officeNames || [] });
          });
          setMappedOrgsInfo(mappings);
        } catch (e) {
          console.error(e);
        }
      };
      fetchAllMappings();
    }
  }, [isSuperAdmin, showSettings]);
`;

content = content.replace(
  `  useEffect(() => {
    fetchData();
  }, [currentUser]);`,
  `  useEffect(() => {
    fetchData();
  }, [currentUser]);
  ${useEffectCode}`
);

// Add the summary section at the bottom
let summaryUI = `
      {isSuperAdmin && mappedOrgsInfo.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 font-nepali border-b border-slate-100 pb-2">
                  म्यापिङ गरिएका संस्थाहरू (Mapped Organizations)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mappedOrgsInfo.map((info, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="font-bold text-slate-800 font-nepali text-sm mb-1 flex items-center gap-2">
                              <Building size={14} className="text-primary-600" />
                              {info.org}
                          </div>
                          <div className="flex flex-wrap gap-1">
                              {info.offices.map((off, oidx) => (
                                  <span key={oidx} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-nepali">
                                      {off}
                                  </span>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
`;

content = content.replace(
  `    </div>
  );
};`,
  `      ${summaryUI}
    </div>
  );
};`
);

fs.writeFileSync('components/SujhabPetika.tsx', content);
