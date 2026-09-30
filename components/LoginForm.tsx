import React, { useState, useRef, useEffect } from 'react';
import { Calendar, User, Lock, LogIn, Eye, EyeOff, Loader2, AlertCircle, Info, Code, ShieldAlert, Mail, ArrowLeft, RefreshCw, KeyRound, Save, Sparkles } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { LoginFormData, User as AppUser, OrganizationSettings } from '../types/coreTypes';
import { logUserActivity } from '../lib/logger';
import { auth, db, signInWithCustomToken } from '../firebase';
import { ref, onValue } from 'firebase/database';
import axios from 'axios';

interface LoginFormProps {
  users?: AppUser[];
  onLoginSuccess: (user: AppUser, fiscalYear: string) => void;
  initialFiscalYear: string;
  settings?: OrganizationSettings;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, initialFiscalYear, settings }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    fiscalYear: initialFiscalYear || '2083/084',
    username: '',
    password: '',
  });

  const [ribbonConfig, setRibbonConfig] = useState<{
    enable: boolean;
    message: string;
  }>({
    enable: settings?.enableLoginRibbonMessage ?? false,
    message: settings?.loginRibbonMessage ?? '',
  });

  useEffect(() => {
    if (settings) {
      setRibbonConfig(prev => ({
        enable: settings.enableLoginRibbonMessage !== undefined ? !!settings.enableLoginRibbonMessage : prev.enable,
        message: settings.loginRibbonMessage !== undefined ? (settings.loginRibbonMessage || '') : prev.message,
      }));
    }
  }, [settings?.enableLoginRibbonMessage, settings?.loginRibbonMessage]);

  useEffect(() => {
    const ribbonRef = ref(db, 'globalData/loginRibbon');
    const unsub = onValue(ribbonRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (typeof val === 'object' && val !== null) {
          setRibbonConfig({
            enable: !!val.enable,
            message: val.message || '',
          });
        } else if (typeof val === 'string') {
          setRibbonConfig({
            enable: true,
            message: val,
          });
        }
      }
    });
    return () => unsub();
  }, []);

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
      if (!username.trim() || !email.trim()) {
        setErrors({ form: 'Username र Email दुवै आवश्यक छ।' });
        setIsLoading(false);
        return;
      }

      const res = await axios.post('/api/auth/forgot-password/send-code', {
        username: username.trim(),
        email: email.trim()
      });

      if (res.data?.success) {
        setResetData(prev => ({ ...prev, userId: res.data.userId }));
        setResetStep('send');
      } else {
        throw new Error(res.data?.error || 'Email पठाउन सकिएन।');
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      const errMsg = error.response?.data?.error || error.message || 'सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्';
      setErrors({ form: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      if (!resetData.code.trim()) {
        setErrors({ form: 'कृपया ६-अंकको कोड राख्नुहोस्।' });
        setIsLoading(false);
        return;
      }

      const res = await axios.post('/api/auth/forgot-password/verify-code', {
        userId: resetData.userId,
        code: resetData.code.trim()
      });

      if (res.data?.success) {
        setResetStep('reset');
      } else {
        throw new Error(res.data?.error || 'कोड पुष्टि गर्न सकिएन।');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'कोड पुष्टि गर्न सकिएन।';
      setErrors({ form: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const { newPassword, confirmPassword, userId, code } = resetData;

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
      const res = await axios.post('/api/auth/forgot-password/reset', {
        userId,
        code: code.trim(),
        newPassword: newPassword.trim()
      });

      if (res.data?.success) {
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
      } else {
        throw new Error(res.data?.error || 'पासवर्ड परिवर्तन गर्न सकिएन।');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'पासवर्ड परिवर्तन गर्न सकिएन।';
      setErrors({ form: errMsg });
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
      const response = await axios.post('/api/auth/login', {
        username: formData.username.trim(),
        password: formData.password.trim(),
        fiscalYear: formData.fiscalYear
      });

      if (response.data?.success && response.data.user) {
        const token = response.data.token;
        if (token) {
          localStorage.setItem('auth_token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        if (response.data.customToken) {
          signInWithCustomToken(auth, response.data.customToken).catch((err) => {
            console.warn("Firebase custom token optional sign-in:", err.message);
          });
        }

        const loggedInUser: AppUser = response.data.user;

        // Log login activity
        logUserActivity(loggedInUser.id, loggedInUser.username, 'login', formData.fiscalYear).catch(console.error);

        // Notify parent of successful login
        onLoginSuccess(loggedInUser, formData.fiscalYear);
      } else {
        throw new Error(response.data?.error || 'लगइन असफल भयो');
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        'प्रयोगकर्ता नाम वा पासवर्ड मिलेन।';
      setErrors(prev => ({ ...prev, form: errMsg }));
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
      {errors.form && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span className="font-medium font-nepali">{errors.form}</span>
        </div>
      )}

      {/* Universal Kudos / Notice Scrolling Ribbon */}
      {ribbonConfig.enable && ribbonConfig.message?.trim() && (
        <div className="w-full overflow-hidden bg-rose-50/90 border border-rose-200 rounded-xl py-2 px-3 shadow-xs flex items-center gap-2 select-none group">
          <div className="flex items-center gap-1 shrink-0 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md font-nepali shadow-xs">
            <Sparkles size={12} className="animate-pulse" />
            <span>सूचना:</span>
          </div>
          <div className="relative overflow-hidden w-full h-5 flex items-center">
            <div className="whitespace-nowrap inline-block font-bold text-rose-600 text-xs sm:text-sm font-nepali animate-marquee-rtl group-hover:[animation-play-state:paused]">
              {ribbonConfig.message}
            </div>
          </div>
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
        <div className="flex justify-end -mt-2">
          <button 
            type="button" 
            onClick={() => {
              setMode('forgot');
              setResetStep('verify');
              setErrors({});
            }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline transition-all font-nepali"
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
    </form>
  );
};
