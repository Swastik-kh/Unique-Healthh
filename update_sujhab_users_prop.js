import fs from 'fs';
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');
content = content.replace(
    `case 'sujhab_petika': return <SujhabPetika currentUser={currentUser} />;`,
    `case 'sujhab_petika': return <SujhabPetika currentUser={currentUser} users={allUsers} />;`
);
fs.writeFileSync('components/Dashboard.tsx', content);

let sujhabContent = fs.readFileSync('components/SujhabPetika.tsx', 'utf8');
sujhabContent = sujhabContent.replace(
    `interface SujhabPetikaProps {
  currentUser?: any;
}`,
    `interface SujhabPetikaProps {
  currentUser?: any;
  users?: any[];
}`
);
sujhabContent = sujhabContent.replace(
    `export const SujhabPetika: React.FC<SujhabPetikaProps> = ({ currentUser }) => {`,
    `export const SujhabPetika: React.FC<SujhabPetikaProps> = ({ currentUser, users = [] }) => {`
);
fs.writeFileSync('components/SujhabPetika.tsx', sujhabContent);
