import fs from 'fs';
let content = fs.readFileSync('components/SujhabPetika.tsx', 'utf-8');

content = content.replace(
  `<button 
              onClick={openQRModal}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 font-nepali font-bold text-sm"
            >
                <QrCode size={18} />
                QR पोस्टर
            </button>`,
  `{isAdmin && (
              <button 
                onClick={openQRModal}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 font-nepali font-bold text-sm"
              >
                  <QrCode size={18} />
                  QR पोस्टर
              </button>
            )}`
);

fs.writeFileSync('components/SujhabPetika.tsx', content);
