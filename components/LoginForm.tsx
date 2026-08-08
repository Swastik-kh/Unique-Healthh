
import React, { useState, useRef, useEffect } from 'react';
import NepaliDate from 'nepali-date-converter';
import { Calendar, User, Lock, LogIn, Eye, EyeOff, Loader2, AlertCircle, Info, Code, ShieldAlert, Mail, ArrowLeft, RefreshCw, KeyRound, Save } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { LoginFormData, User as AppUser, OrganizationSettings } from '../types/coreTypes';
import { logUserActivity } from '../lib/logger';
import { db } from '../firebase';
import { ref, update, get, set, remove, child } from 'firebase/database';
import { hashPassword } from '../lib/crypto';
import axios from 'axios';

interface LoginFormProps {
  users: AppUser[];
  onLoginSuccess: (user: AppUser, fiscalYear: string) => void;
  initialFiscalYear: string;
  settings: OrganizationSettings;
}

export const LoginForm: React.FC<LoginFormProps> = ({ users, onLoginSuccess, initialFiscalYear, settings }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    fiscalYear: initialFiscalYear || '2083/084',
    username: '',
    password: '',
  });

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetStep, setResetStep] = useState<'verify' | 'send' | 'reset'>('verify');
  const [resetData, setResetData] = useState({
    username: '',
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    userId: ''
  });

  const [errors, setErrors] = useState<Partial<LoginFormData & { form: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordMsg, setShowForgotPasswordMsg] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

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

  const handleResetDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData(prev => ({ ...prev, [name]: value }));
  };

  const handleVerifyIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const { username, email } = resetData;
      if (!username || !email) {
        setErrors({ form: 'Username र Email दुवै आवश्यक छ।' });
        setIsLoading(false);
        return;
      }

      const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      
      if (!foundUser) {
        setErrors({ form: 'यो Username भएको प्रयोगकर्ता भेटिएन।' });
        setIsLoading(false);
        return;
      }

      if (foundUser.id === 'superadmin') {
        setErrors({ form: 'सुरक्षा कारणले Super Admin को पासवर्ड यसरी रिसेट गर्न सकिँदैन।' });
        setIsLoading(false);
        return;
      }

      if (!foundUser.email || foundUser.email.toLowerCase() !== email.toLowerCase()) {
        setErrors({ form: 'Username र Email मिलेन।' });
        setIsLoading(false);
        return;
      }

      // Check if frozen (reusing logic from handleSubmit)
      if (foundUser.isFrozen && foundUser.role !== 'SUPER_ADMIN') {
        setErrors({ form: 'तपाईंको खाता फ्रिज गरिएको छ। कृपया सुपर एडमिनलाई सम्पर्क गर्नुहोस्।' });
        setIsLoading(false);
        return;
      }

      let currentParentId = foundUser.parentId;
      let depth = 0;
      while (currentParentId && depth < 20) {
        const ancestor = users.find(u => u.id === currentParentId);
        if (ancestor) {
          if (ancestor.isFrozen) {
            setErrors({ form: 'तपाईंको खाता फ्रिज गरिएको छ। कृपया सुपर एडमिनलाई सम्पर्क गर्नुहोस्।' });
            setIsLoading(false);
            return;
          }
          currentParentId = ancestor.parentId;
          depth++;
        } else {
          break;
        }
      }

      // Rate limit check
      const resetRef = ref(db, `passwordResets/${foundUser.id}`);
      const snapshot = await get(resetRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (Date.now() - data.createdAt < 60000) {
          setErrors({ form: 'कृपया १ मिनेट पर्खनुहोस् र पुनः प्रयास गर्नुहोस्।' });
          setIsLoading(false);
          return;
        }
      }

      // Generate Code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = hashPassword(code);

      // Save to Firebase
      await set(resetRef, {
        codeHash: hashedCode,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        createdAt: Date.now()
      });

      // Send Email
      if (!settings.emailApiKey || !settings.emailSenderAddress) {
        setErrors({ form: 'प्रणालीमा Email सेटिङ मिलाइएको छैन। कृपया एडमिनलाई सम्पर्क गर्नुहोस्।' });
        setIsLoading(false);
        return;
      }

      const emailResponse = await axios.post('/api/email/send', {
        apiKey: settings.emailApiKey,
        senderAddress: settings.emailSenderAddress,
        senderName: settings.emailSenderName || 'Unique Health',
        to: foundUser.email,
        subject: "पासवर्ड रिसेट कोड - Unique Health",
        htmlBody: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #4f46e5;">पासवर्ड रिसेट कोड</h2>
            <p>तपाईंको पासवर्ड रिसेट गर्नको लागि निम्न ६-अंकको कोड प्रयोग गर्नुहोस्:</p>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">यो कोड १० मिनेटसम्म मात्र मान्य रहनेछ।</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, कृपया यो ईमेल बेवास्ता गर्नुहोस्।</p>
          </div>
        `
      });

      if (emailResponse.data.success) {
        setResetData(prev => ({ ...prev, userId: foundUser.id }));
        setResetStep('send');
      } else {
        throw new Error(emailResponse.data.error || 'Email पठाउन सकिएन।');
      }

    } catch (error: any) {
      console.error("Forgot password error:", error);
      setErrors({ form: error.message || 'सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const resetRef = ref(db, `passwordResets/${resetData.userId}`);
      const snapshot = await get(resetRef);
      
      if (!snapshot.exists()) {
        setErrors({ form: 'रिसेट डाटा भेटिएन। कृपया फेरि कोड पठाउनुहोस्।' });
        setResetStep('verify');
        setIsLoading(false);
        return;
      }

      const data = snapshot.val();

      if (Date.now() > data.expiresAt) {
        setErrors({ form: 'कोडको म्याद सकियो। कृपया फेरि कोड पठाउनुहोस्।' });
        setResetStep('verify');
        setIsLoading(false);
        return;
      }

      if (data.blockedUntil && Date.now() < data.blockedUntil) {
        const remaining = Math.ceil((data.blockedUntil - Date.now()) / 60000);
        setErrors({ form: `धेरै पटक गलत कोड प्रयोग गरियो। कृपया ${remaining} मिनेट पछि प्रयास गर्नुहोस्।` });
        setIsLoading(false);
        return;
      }

      if (data.attempts >= 5) {
        const blockedUntil = Date.now() + 5 * 60 * 1000;
        await update(resetRef, { blockedUntil, attempts: 0 });
        setErrors({ form: 'धेरै पटक गलत कोड प्रयोग गरियो। ५ मिनेटको लागि ब्लक गरिएको छ।' });
        setIsLoading(false);
        return;
      }

      const hashedInput = hashPassword(resetData.code);
      if (hashedInput === data.codeHash) {
        setResetStep('reset');
      } else {
        const newAttempts = (data.attempts || 0) + 1;
        await update(resetRef, { attempts: newAttempts });
        setErrors({ form: `गलत कोड। तपाईंले अझै ${5 - newAttempts} पटक प्रयास गर्न सक्नुहुन्छ।` });
      }
    } catch (error) {
      setErrors({ form: 'कोड पुष्टि गर्न सकिएन।' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const { newPassword, confirmPassword, userId } = resetData;

    if (newPassword.length < 6) {
      setErrors({ form: 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ।' });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ form: 'पासवर्ड मिलेन।' });
      setIsLoading(false);
      return;
    }

    try {
      const hashedNewPassword = hashPassword(newPassword);
      await update(ref(db, `users/${userId}`), { password: hashedNewPassword });
      await remove(ref(db, `passwordResets/${userId}`));
      
      alert('पासवर्ड सफलतापूर्वक परिवर्तन भयो। नयाँ पासवर्ड प्रयोग गरेर लगइन गर्नुहोस्।');
      setMode('login');
      setResetStep('verify');
      setResetData({
        username: '',
        email: '',
        code: '',
        newPassword: '',
        confirmPassword: '',
        userId: ''
      });
    } catch (error) {
      setErrors({ form: 'पासवर्ड परिवर्तन गर्न सकिएन।' });
    } finally {
      setIsLoading(false);
    }
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

  if (mode === 'forgot') {
    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
                <button 
                    onClick={() => setMode('login')}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">पासवर्ड रिसेट गर्नुहोस्</h2>
            </div>

            {errors.form && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="font-medium font-nepali">{errors.form}</span>
                </div>
            )}

            {resetStep === 'verify' && (
                <form onSubmit={handleVerifyIdentity} className="space-y-4">
                    <p className="text-sm text-slate-500 font-nepali">तपाईंको प्रयोगकर्ता नाम र ईमेल ठेगाना भर्नुहोस्।</p>
                    <Input
                        label="प्रयोगकर्ताको नाम"
                        name="username"
                        value={resetData.username}
                        onChange={handleResetDataChange}
                        icon={<User size={18} />}
                        placeholder="username"
                        required
                    />
                    <Input
                        label="Email ठेगाना"
                        name="email"
                        type="email"
                        value={resetData.email}
                        onChange={handleResetDataChange}
                        icon={<Mail size={18} />}
                        placeholder="example@mail.com"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                        <span className="font-nepali">कोड पठाउनुहोस्</span>
                    </button>
                </form>
            )}

            {resetStep === 'send' && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-green-700 text-sm font-nepali flex items-center gap-3 mb-2">
                        <Mail size={20} />
                        <p>तपाईंको Email मा ६-अंकको कोड पठाइएको छ। कृपया चेक गर्नुहोस्।</p>
                    </div>
                    <Input
                        label="Verification Code"
                        name="code"
                        value={resetData.code}
                        onChange={handleResetDataChange}
                        icon={<Code size={18} />}
                        placeholder="123456"
                        maxLength={6}
                        required
                        className="text-center text-2xl tracking-[1em] font-mono"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ShieldAlert size={20} />}
                        <span className="font-nepali">पुष्टि गर्नुहोस्</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => setResetStep('verify')}
                        className="w-full text-sm text-slate-500 hover:text-primary-600 font-nepali py-1"
                    >
                        फेरि कोड पठाउनुहोस्?
                    </button>
                </form>
            )}

            {resetStep === 'reset' && (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-700 text-sm font-nepali flex items-center gap-3 mb-2">
                        <KeyRound size={20} />
                        <p>कोड पुष्टि भयो। अब नयाँ पासवर्ड राख्नुहोस्।</p>
                    </div>
                    <Input
                        label="नयाँ पासवर्ड"
                        name="newPassword"
                        type="password"
                        value={resetData.newPassword}
                        onChange={handleResetDataChange}
                        icon={<Lock size={18} />}
                        placeholder="••••••••"
                        required
                    />
                    <Input
                        label="पासवर्ड पुष्टि गर्नुहोस्"
                        name="confirmPassword"
                        type="password"
                        value={resetData.confirmPassword}
                        onChange={handleResetDataChange}
                        icon={<ShieldAlert size={18} />}
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        <span className="font-nepali">पासवर्ड सुरक्षित गर्नुहोस्</span>
                    </button>
                </form>
            )}
        </div>
    );
  }

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
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-lg"
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
        <span>{isLoading ? 'प्रक्रियामा छ...' : 'लगइन गर्नुहोस्'}</span>
      </button>

      <div className="text-center">
          <button 
            type="button" 
            onClick={() => {
                setMode('forgot');
                setResetStep('verify');
                setErrors({});
            }}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline transition-all font-nepali"
          >
            पासवर्ड बिर्सनुभयो?
          </button>
      </div>

      <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-1.5 text-slate-400">
              <Code size={12} />
              <p className="text-[11px] font-medium italic">
                  Developed by: swastik khatiwada
              </p>
          </div>
      </div>
    </form>
  );
};
