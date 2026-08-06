import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

content = content.replace(
  /{isAdmin && \(\s*<button\s*onClick={openSettings}/g,
  `{isSuperAdmin && (\n                <button \n                  onClick={openSettings}`
);

fs.writeFileSync('components/SujhabPetika.tsx', content);
