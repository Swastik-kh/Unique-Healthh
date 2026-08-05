import fs from 'fs';

let content = fs.readFileSync('components/UserManagement.tsx', 'utf-8');

// Add Firebase imports
let importsToAdd = `
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtt4_yw8_76inlXJPgMNRV0h0vqPpvgt8",
  authDomain: "asymmetric-flow-scf5x.firebaseapp.com",
  projectId: "asymmetric-flow-scf5x",
  storageBucket: "asymmetric-flow-scf5x.firebasestorage.app",
  messagingSenderId: "1047209545761",
  appId: "1:1047209545761:web:d81af21e1f0d477cf31360"
};
const appName = "sujhabPetikaSource";
const sujhabApp = getApps().find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
const sujhabDb = getFirestore(sujhabApp, "ai-studio-digitalsujabpeti-f3ba13ee-e50b-48cc-bf1e-2244437f6abf");
`;

content = content.replace(
  `import { Select } from './Select';`,
  `import { Select } from './Select';\n${importsToAdd}`
);

// Update handleSubmit
let oldTryBlock = `        }

        setShowForm(false);
        resetForm();
        alert("प्रयोगकर्ता सफलतापूर्वक सुरक्षित गरियो।");
    } catch (err: any) {`;

let newTryBlock = `        }

        // --- Sujhab Petika Auto-create User ---
        if (finalMenus.includes('sujhab_petika')) {
            try {
                const adminUsersRef = collection(sujhabDb, 'adminUsers');
                const q = query(adminUsersRef, where('username', '==', userToSave.username));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    const newAdminId = \`usr_\${Date.now()}\`;
                    const newAdminRef = doc(adminUsersRef, newAdminId);
                    await setDoc(newAdminRef, {
                        id: newAdminId,
                        username: userToSave.username,
                        password: userToSave.password,
                        organization: userToSave.organizationName,
                        role: userToSave.role === 'SUPER_ADMIN' ? 'superadmin' : 'admin',
                        createdAt: new Date().toISOString()
                    });
                    console.log('User auto-created in Sujhab Petika adminUsers');
                } else {
                    console.log('User already exists in Sujhab Petika adminUsers');
                }
            } catch (err) {
                console.error('Failed to auto-create user in Sujhab Petika:', err);
                // Silent handle, don't break the main user creation flow
            }
        }
        // --------------------------------------

        setShowForm(false);
        resetForm();
        alert("प्रयोगकर्ता सफलतापूर्वक सुरक्षित गरियो।");
    } catch (err: any) {`;

content = content.replace(oldTryBlock, newTryBlock);

fs.writeFileSync('components/UserManagement.tsx', content);
