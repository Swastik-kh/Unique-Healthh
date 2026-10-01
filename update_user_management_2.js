import fs from 'fs';

let content = fs.readFileSync('components/UserManagement.tsx', 'utf-8');

// Update handleSubmit
const oldPattern = `        }
        
        setShowForm(false);
        resetForm();
        alert("प्रयोगकर्ता सफलतापूर्वक सुरक्षित गरियो।");
    } catch (err: any) {`;

const newCode = `        }

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

// Let's replace using regex to ignore spaces
content = content.replace(/if\s*\(editingId\)\s*await\s*onUpdateUser\(userToSave\);\s*else\s*await\s*onAddUser\(userToSave\);\s*}\s*setShowForm\(false\);\s*resetForm\(\);\s*alert\("प्रयोगकर्ता सफलतापूर्वक सुरक्षित गरियो।"\);\s*}\s*catch\s*\(err:\s*any\)\s*\{/g, 
`if (editingId) await onUpdateUser(userToSave);
            else await onAddUser(userToSave);
        }

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
    } catch (err: any) {`);

fs.writeFileSync('components/UserManagement.tsx', content);
