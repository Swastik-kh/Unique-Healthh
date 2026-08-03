import { db } from './firebase.ts';
import { ref, get, remove } from 'firebase/database';
import { ChildImmunizationRecord } from './types/healthTypes.ts';

async function run() {
  const orgsRef = ref(db, 'orgData');
  const orgsSnap = await get(orgsRef);
  if (!orgsSnap.exists()) {
    console.log("No orgs found");
    process.exit(0);
  }
  
  const orgs = orgsSnap.val();
  
  for (const orgName of Object.keys(orgs)) {
    const records = orgs[orgName].bachhaImmunizationRecords;
    if (!records) continue;
    
    const recordsByRegNo = new Map<string, Array<{id: string, record: any}>>();
    
    for (const key of Object.keys(records)) {
      const record = records[key];
      const regNo = record.regNo;
      if (!regNo) continue;
      
      if (!recordsByRegNo.has(regNo)) {
        recordsByRegNo.set(regNo, []);
      }
      recordsByRegNo.get(regNo)!.push({ id: key, record });
    }
    
    for (const [regNo, duplicates] of Array.from(recordsByRegNo.entries())) {
      if (duplicates.length > 1) {
        console.log(`Org: ${orgName}, RegNo: ${regNo} has ${duplicates.length} records`);
        
        // Sort duplicates to keep the one with most 'Given' vaccines, or the one that is most complete
        duplicates.sort((a, b) => {
           let aGiven = 0;
           let bGiven = 0;
           if (a.record.vaccines) {
             aGiven = a.record.vaccines.filter((v: any) => v.status === 'Given').length;
           }
           if (b.record.vaccines) {
             bGiven = b.record.vaccines.filter((v: any) => v.status === 'Given').length;
           }
           return bGiven - aGiven; // Descending
        });
        
        // Keep the first one, delete the rest
        for (let i = 1; i < duplicates.length; i++) {
          const toDelete = duplicates[i];
          console.log(`Deleting duplicate record id: ${toDelete.id} for RegNo: ${regNo}`);
          await remove(ref(db, `orgData/${orgName}/bachhaImmunizationRecords/${toDelete.id}`));
        }
      }
    }
  }
  
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
