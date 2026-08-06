import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

// Support both SUPERADMIN and SUPER_ADMIN
content = content.replace(
  `const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';`,
  `const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN';`
);

content = content.replace(
  `const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';`,
  `const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SUPERADMIN';`
);

fs.writeFileSync('components/SujhabPetika.tsx', content);
