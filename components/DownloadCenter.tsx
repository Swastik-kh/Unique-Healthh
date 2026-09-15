import React, { useState, useEffect } from 'react';
import { 
  Download, ExternalLink, ShieldAlert, FileCheck, Copy, Check, Info, Link2
} from 'lucide-react';
import { User, OrganizationSettings } from '../types';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

interface DownloadCenterProps {
  currentUser: User;
  settings?: OrganizationSettings;
}

export const DownloadCenter: React.FC<DownloadCenterProps> = ({ currentUser, settings }) => {
  const [copied, setCopied] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string>('');

  useEffect(() => {
    const refsToListen = [
      ref(db, 'globalData/downloadCenterUrl'),
      ref(db, 'organizationSettings/config/downloadCenterUrl'),
      ref(db, 'downloadCenterUrl')
    ];

    const unsubs = refsToListen.map(r => 
      onValue(r, (snap) => {
        if (snap.exists() && typeof snap.val() === 'string' && snap.val().trim()) {
          setLiveUrl(snap.val().trim());
        }
      })
    );

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const downloadUrl = (liveUrl || settings?.downloadCenterUrl || '').trim();

  const handleCopyLink = () => {
    if (!downloadUrl) return;
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Download size={200} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3 border border-white/20">
            <Download size={14} />
            <span>आधिकारिक डाउनलोड केन्द्र</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-nepali tracking-tight mb-2">
            डाउनलोड केन्द्र (Download Center)
          </h1>
          <p className="text-primary-100 text-sm sm:text-base font-nepali leading-relaxed">
            प्रणाली व्यवस्थापकद्वारा राखिएको आधिकारिक फाइल, फारम वा एप्स डाउनलोड गर्नुहोस्।
          </p>
        </div>
      </div>

      {/* Main Single Download Link Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
        {downloadUrl ? (
          <div className="space-y-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="p-4 bg-primary-100 text-primary-700 rounded-2xl shrink-0">
                <FileCheck size={36} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  आधिकारिक लिङ्क उपलब्ध छ
                </div>
                <h3 className="text-lg font-bold text-slate-800 font-nepali">
                  आधिकारिक सामग्री डाउनलोड लिङ्क
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-mono break-all line-clamp-2">
                  {downloadUrl}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 transition-all flex items-center justify-center gap-3 group text-sm font-nepali"
              >
                <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                <span>डाउनलोड गर्नुहोस् (Download Now)</span>
                <ExternalLink size={16} className="opacity-70" />
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2 text-sm font-nepali"
                title="लिङ्क कपि गर्नुहोस्"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-emerald-600" />
                    <span className="text-emerald-700">कपि गरियो!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span>लिङ्क कपि गर्नुहोस्</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-10 px-4 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 shadow-inner">
              <ShieldAlert size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-slate-800 font-nepali">
                डाउनलोड लिङ्क हाल उपलब्ध छैन
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-nepali leading-relaxed">
                प्रणाली व्यवस्थापक (Super Admin) ले सामान्य सेटिङबाट डाउनलोड लिङ्क (URL) राखेपछि यहाँ उपलब्ध हुनेछ।
              </p>
            </div>

            {isSuperAdmin && (
              <div className="mt-6 inline-flex items-center gap-2 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 text-xs font-nepali max-w-md text-left">
                <Info size={18} className="shrink-0 text-blue-600" />
                <span>
                  <strong>सुपर एडमिनको लागि जानकारी:</strong> तपाईँले <strong>'सामान्य सेटिङ (General Settings)'</strong> मेनुमा गई डाउनलोड लिङ्क प्रविष्टि गर्न सक्नुहुन्छ।
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
