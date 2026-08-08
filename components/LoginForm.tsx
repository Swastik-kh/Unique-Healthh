
import React, { useState, useRef, useEffect } from 'react';
import NepaliDate from 'nepali-date-converter';
import { Calendar, User, Lock, LogIn, Eye, EyeOff, Loader2, AlertCircle, Info, Code, ShieldAlert, X, CheckCircle2, Mail, Key } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { LoginFormData, User as AppUser } from '../types/coreTypes';
import { logUserActivity } from '../lib/logger';
import { db } from '../firebase';
import { db as localDb } from '../firestore';
import { ref, update } from 'firebase/database';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { hashPassword } from '../lib/crypto';

interface LoginFormProps {
  users: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
  initialFiscalYear: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ users, onLoginSuccess, initialFiscalYear }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    fiscalYear: initialFiscalYear || '2083/084',
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<LoginFormData & { form: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordMsg, setShowForgotPasswordMsg] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: username, 2: code + options, 3: success
  const [resetUsername, setResetUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetOption, setResetOption] = useState<'change' | 'keep'>('change');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async () => {
    if (!resetUsername.trim()) {
      setResetError('प्रयोगकर्ता नाम आवश्यक छ');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const user = users.find(u => u.username.toLowerCase() === resetUsername.trim().toLowerCase());
      if (!user) {
        setResetError('प्रयोगकर्ता फेला परेन');
        setResetLoading(false);
        return;
      }

      if (!user.email) {
        setResetError('यो प्रयोगकर्तासँग इमेल दर्ता छैन, सुपर एडमिनलाई सम्पर्क गर्नुहोस्');
        setResetLoading(false);
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      await setDoc(doc(localDb, 'passwordResetCodes', user.id), {
        code,
        expiresAt,
        attempts: 0
      });

      const response = await fetch('/.netlify/functions/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code,
          fullName: user.fullName
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'इमेल पठाउन सकिएन');

      setTargetUser(user);
      setResetStep(2);
    } catch (err: any) {
      setResetError(err.message || 'सिस्टममा समस्या आयो');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!resetCode.trim()) {
      setResetError('कोड आवश्यक छ');
      return;
    }

    if (resetOption === 'change' && !newPassword.trim()) {
      setResetError('नयाँ पासवर्ड आवश्यक छ');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      if (!targetUser) throw new Error('प्रयोगकर्ता हराइरहेको छ');

      const resetDocRef = doc(localDb, 'passwordResetCodes', targetUser.id);
      const resetDoc = await getDoc(resetDocRef);

      if (!resetDoc.exists()) {
        setResetError('अनुरोध फेला परेन, कृपया पुन: प्रयास गर्नुहोस्');
        setResetLoading(false);
        return;
      }

      const data = resetDoc.data();
      if (Date.now() > data.expiresAt) {
        setResetError('कोडको म्याद सकियो, कृपया नयाँ कोड पठाउनुहोस्');
        setResetLoading(false);
        return;
      }

      if (data.attempts >= 5) {
        setResetError('धेरैपटक गलत प्रयास भयो, कृपया नयाँ कोड पठाउनुहोस्');
        setResetLoading(false);
        return;
      }

      if (data.code !== resetCode.trim()) {
        await setDoc(resetDocRef, { attempts: (data.attempts || 0) + 1 }, { merge: true });
        setResetError('गलत कोड');
        setResetLoading(false);
        return;
      }

      // Code matches!
      if (resetOption === 'change') {
        const hashedPass = hashPassword(newPassword.trim());
        await update(ref(db, `users/${targetUser.id}`), { password: hashedPass });
        // Update local object for login
        targetUser.password = hashedPass;
      }

      await deleteDoc(resetDocRef);
      setShowResetModal(false);
      logUserActivity(targetUser.id, targetUser.username, 'login', formData.fiscalYear).catch(console.error);
      onLoginSuccess(targetUser, formData.fiscalYear);
    } catch (err: any) {
      setResetError(err.message || 'प्रमाणिकरण असफल भयो');
    } finally {
      setResetLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (errors.form) {
      setErrors(prev => ({ ...prev, form: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    if (!formData.fiscalYear) newErrors.fiscalYear = 'आर्थिक वर्ष छान्नुहोस्';
    if (!formData.username.trim()) newErrors.username = 'प्रयोगकर्ता नाम आवश्यक छ';
    if (!formData.password) newErrors.password = 'पासवर्ड आवश्यक छ';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const inputUsername = formData.username.trim();
      const inputPassword = formData.password.trim();
      const hashedInput = hashPassword(inputPassword);

      const foundUser = users.find(u => {
          const dbUsername = String(u.username || '').trim();
          const dbPassword = String(u.password || '').trim();
          
          // Allow login if it matches the secure hash, OR matches the legacy plain-text password, OR is superadmin checking with admin default
          const isSuperAdminDefault = u.id === 'superadmin' && inputUsername.toLowerCase() === 'admin' && inputPassword === 'admin';
          return dbUsername.toLowerCase() === inputUsername.toLowerCase() && 
                 (dbPassword === hashedInput || dbPassword === inputPassword || isSuperAdminDefault);
      });

      if (foundUser) {
          // Check if user is frozen
          if (foundUser.isFrozen && foundUser.role !== 'SUPER_ADMIN') {
              setErrors(prev => ({ ...prev, form: 'तपाईंको खाता फ्रिज गरिएको छ। कृपया सुपर एडमिनलाई सम्पर्क गर्नुहोस्।' }));
              setIsLoading(false);
              return;
          }

          // Check if any ancestor is frozen
          let currentParentId = foundUser.parentId;
          let depth = 0;
          while (currentParentId && depth < 20) {
              const ancestor = users.find(u => u.id === currentParentId);
              if (ancestor) {
                  if (ancestor.isFrozen) {
                      setErrors(prev => ({ ...prev, form: 'तपाईंको खाता फ्रिज गरिएको छ। कृपया सुपर एडमिनलाई सम्पर्क गर्नुहोस्।' }));
                      setIsLoading(false);
                      return;
                  }
                  currentParentId = ancestor.parentId;
                  depth++;
              } else {
                  break;
              }
          }

          // Auto-migrate legacy plain text passwords in the cloud database to secure hashed values
          const dbPassword = String(foundUser.password || '').trim();
          if (dbPassword === inputPassword && foundUser.id !== 'superadmin') {
              try {
                  await update(ref(db, `users/${foundUser.id}`), { password: hashedInput });
                  console.info(`Migrated legacy plain-text password for user '${foundUser.username}' to secure salted SHA-256.`);
              } catch (err) {
                  console.error("Auto-migration of legacy password failed:", err);
              }
          }
          logUserActivity(foundUser.id, foundUser.username, 'login', formData.fiscalYear).catch(console.error);
          onLoginSuccess(foundUser, formData.fiscalYear);
      } else {
          setErrors(prev => ({ 
              ...prev, 
              form: 'प्रयोगकर्ता नाम वा पासवर्ड मिलेन।' 
          }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, form: 'सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {users.length === 1 && users[0].username === 'admin' && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-amber-800">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold font-nepali">
                  सूचना: अहिले डेटाबेसबाट प्रयोगकर्ताहरू लोड हुन सकेका छैनन्। कृपया डिफल्ट <b>admin</b> बाट लगइन गर्नुहोस्।
              </p>
          </div>
      )}

      {errors.form && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0" />
            <span className="font-medium font-nepali">{errors.form}</span>
        </div>
      )}

      <div className="space-y-4">
        <Select
          label="आर्थिक वर्ष (Fiscal Year)"
          name="fiscalYear"
          value={formData.fiscalYear}
          onChange={handleChange}
          options={FISCAL_YEARS}
          error={errors.fiscalYear}
          icon={<Calendar size={18} />}
          className="font-nepali font-bold text-slate-700" 
        />

        <Input
          label="प्रयोगकर्ताको नाम"
          name="username"
          type="text"
          placeholder="admin"
          value={formData.username}
          onChange={handleChange}
          onKeyDown={handleUsernameKeyDown}
          error={errors.username}
          icon={<User size={18} />}
        />

        <div className="relative">
          <Input
            ref={passwordInputRef} 
            label="पासवर्ड"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock size={18} />}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-primary-600 p-1 rounded-full transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="flex justify-end px-1">
          <button 
            type="button" 
            onClick={() => {
              setResetStep(1);
              setResetUsername(formData.username);
              setResetError(null);
              setShowResetModal(true);
            }} 
            className="text-xs text-primary-600 hover:text-primary-700 font-bold hover:underline"
          >
            पासवर्ड बिर्सनुभयो?
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-lg"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
        <span>{isLoading ? 'प्रक्रियामा छ...' : 'लगइन गर्नुहोस्'}</span>
      </button>

      <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 text-slate-400">
              <Code size={12} />
              <p className="text-[11px] font-medium italic">
                  Developed by: swastik khatiwada
              </p>
          </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="text-primary-600" size={20} />
                पासवर्ड रिसेट गर्नुहोस्
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg">
                <X size={20}/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {resetError && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">तपाईंको प्रयोगकर्ता नाम (Username) टाइप गर्नुहोस्। हामी तपाईंको दर्ता गरिएको इमेलमा कोड पठाउनेछौं।</p>
                  <Input 
                    label="प्रयोगकर्ताको नाम" 
                    value={resetUsername} 
                    onChange={e => setResetUsername(e.target.value)} 
                    placeholder="उदा: admin"
                    icon={<User size={18} />}
                  />
                  <button 
                    onClick={handleSendCode} 
                    disabled={resetLoading}
                    className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-all hover:bg-primary-700"
                  >
                    {resetLoading ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                    कोड पठाउनुहोस्
                  </button>
                </div>
              )}

              {resetStep === 2 && (
                <div className="space-y-5">
                  <div className="bg-indigo-50 p-3 rounded-xl flex items-start gap-2 text-indigo-700 text-xs">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p>हामीले <b>{targetUser?.email}</b> मा कोड पठाएका छौं। कृपया चेक गर्नुहोस्।</p>
                  </div>

                  <Input 
                    label="६-अंकको कोड" 
                    value={resetCode} 
                    onChange={e => setResetCode(e.target.value)} 
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    icon={<Code size={18} />}
                  />

                  <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-700">विकल्प छान्नुहोस्:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setResetOption('change')}
                        className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${resetOption === 'change' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-100 text-slate-500'}`}
                      >
                        पासवर्ड परिवर्तन गर्ने
                      </button>
                      <button 
                        type="button"
                        onClick={() => setResetOption('keep')}
                        className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${resetOption === 'keep' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-100 text-slate-500'}`}
                      >
                        पासवर्ड उस्तै राख्ने
                      </button>
                    </div>
                  </div>

                  {resetOption === 'change' && (
                    <Input 
                      label="नयाँ पासवर्ड" 
                      type="password"
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="Enter new password"
                      icon={<Key size={18} />}
                    />
                  )}

                  <button 
                    onClick={handleConfirmReset} 
                    disabled={resetLoading}
                    className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-all hover:bg-primary-700"
                  >
                    {resetLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    पुष्टि गर्नुहोस्
                  </button>

                  <button 
                    onClick={() => setResetStep(1)} 
                    className="w-full text-sm text-slate-400 hover:text-slate-600"
                  >
                    फेरि कोड पठाउनुहोस्
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
