
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, User, Lock, LogIn, Eye, EyeOff, Loader2, AlertCircle, Info, Code, ShieldAlert } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { LoginFormData } from '../types/coreTypes';
import { LoginFormProps } from '../types/dashboardTypes';

export const LoginForm: React.FC<LoginFormProps> = ({ users, onLoginSuccess, initialFiscalYear }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    fiscalYear: initialFiscalYear || '2082/083',
    username: '',
    password: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const inputUsername = formData.username.trim();
      const inputPassword = formData.password.trim();

      const foundUser = users.find(u => {
          const dbUsername = String(u.username || '').trim();
          const dbPassword = String(u.password || '').trim();
          return dbUsername === inputUsername && dbPassword === inputPassword;
      });

      if (foundUser) {
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
