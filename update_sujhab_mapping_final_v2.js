import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

const newSummaryUI = `      {isSuperAdmin && allOrganizations.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 font-nepali border-b border-slate-100 pb-2">
                  सबै संस्थाहरूको सूची र म्यापिङ स्थिति
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allOrganizations.map((org, idx) => {
                      const mapping = mappedOrgsInfo.find(m => m.org === org);
                      return (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                              <div className="font-bold text-slate-800 font-nepali text-sm flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                      <Building size={16} className={mapping ? "text-primary-600" : "text-slate-400"} />
                                      {org}
                                  </div>
                                  {mapping ? (
                                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                                  ) : (
                                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">No Mapping</span>
                                  )}
                              </div>
                              {mapping && mapping.offices.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                      {mapping.offices.map((off, oidx) => (
                                          <span key={oidx} className="text-[10px] bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-500 font-nepali shadow-sm">
                                              {off}
                                          </span>
                                      ))}
                                  </div>
                              )}
                              {!mapping && (
                                  <p className="text-[10px] text-slate-400 italic font-nepali">सेटिङ्सबाट म्यापिङ गर्नुहोस।</p>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}`;

// We target the previous block from update_sujhab_mapping_4.js
const targetStart = `{isSuperAdmin && mappedOrgsInfo.length > 0 && (`;
const targetEnd = `      )}
    </div>
  );
};`;

// Using a more robust replace by finding the index
let startIndex = content.indexOf(targetStart);
let endIndex = content.lastIndexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
    let finalContent = content.substring(0, startIndex) + newSummaryUI + "\n    </div>\n  );\n};";
    fs.writeFileSync('components/SujhabPetika.tsx', finalContent);
    console.log("Successfully updated summary UI.");
} else {
    console.log("Could not find target indices.");
    console.log("startIndex:", startIndex);
    console.log("endIndex:", endIndex);
}
