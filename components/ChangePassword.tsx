

import React, { useState, useMemo } from 'react';
import { User } from '../types/coreTypes'; // Corrected import path
import { Input } from './Input';
import { Select } from './Select';
import { KeyRound, Save, AlertCircle, CheckCircle2, Lock, UserCog, ShieldAlert } from 'lucide-react';

interface ChangePasswordProps {
  currentUser: User;
  users: User[];
  onChangePassword: (userId: string, newPassword: string) => void;
  onUpdateUser?: (user: User) => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ currentUser, users, onChangePassword, onUpdateUser }) => {
  // Can reset others if SUPER_ADMIN or ADMIN
  const isPrivileged = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [formData, setFormData] = useState({
    currentPassword: '', 
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter users that this user is allowed to manage
  const userOptions = useMemo(() => {
    return users
      .filter(u => {
          // Admin can only reset staff/storekeeper/account/approval in their own org
          if (currentUser.role === 'ADMIN') {
              return u.organizationName === currentUser.organizationName && u.id !== currentUser.id;
          }
          // Super admin can reset everyone
          return u.id !== currentUser.id;
      })
      .map(u => ({
        id: u.id,
        value: u.id,
        label: `${u.fullName} (${u.username}) - ${u.role}`
      }));
  }, [users, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 1. Validation Logic
    if (isPrivileged && selectedUserId) {
        // Mode: Admin Resetting Someone Else
        if (!formData.newPassword || !formData.confirmPassword) {
            setError('कृपया नयाँ पासवर्ड भर्नुहोस्');
            return;
        }
    } else {
        // Mode: User Changing Their Own Password
        if (!formData.currentPassword) {
            setError('हालको पासवर्ड आवश्यक छ');
            return;
        }
        if (formData.currentPassword !== currentUser.password) {
            setError('हालको पासवर्ड मिलेन');
            return;
        }
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('नयाँ पासवर्ड मेल खाएन');
      return;
    }

    if (formData.newPassword.length < 4) {
        setError('पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्sछ');
        return;
    }

    // 2. Execution
    const targetUserId = (isPrivileged && selectedUserId) ? selectedUserId : currentUser.id;
    const targetUser = users.find(u => u.id === targetUserId);

    if (!targetUser) {
        setError('प्रयोगकर्ता फेला परेन');
        return;
    }

    onChangePassword(targetUserId, formData.newPassword);
    
    setSuccess(
        (isPrivileged && selectedUserId)
        ? `${targetUser.fullName} को पासवर्ड सफलतापूर्वक रिसेट भयो`
        : 'तपाईंको पासवर्ड सफलतापूर्वक परिवर्तन भयो'
    );

    // Reset Form
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    if (!selectedUserId) setSelectedUserId('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
          {isPrivileged ? <UserCog className="text-primary-600" /> : <KeyRound className="text-primary-600" />}
          {isPrivileged ? 'पासवर्ड व्यवस्थापन (Password Management)' : 'सुरक्षा सेटअप (Security Setup)'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isPrivileged 
            ? 'तपाईं आफ्नो वा मातहतका प्रयोगकर्ताको पासवर्ड परिवर्तन गर्न सक्नुहुन्छ।' 
            : 'आफ्नो खाताको सुरक्षाको लागि पासवर्ड परिवर्तन गर्नुहोस्।'}
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-100 flex items-center gap-3 animate-pulse">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-medium font-nepali">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-600 text-sm p-4 rounded-lg border border-green-100 flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0" />
            <span className="font-medium font-nepali">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {isPrivileged && userOptions.length > 0 && (
             <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-start gap-3">
                   <ShieldAlert className="text-primary-600 shrink-0 mt-1" size={20} />
                   <div>
                      <h3 className="font-bold text-slate-800 text-sm font-nepali">प्रयोगकर्ता पासवर्ड रिसेट</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        यदि तपाईं अरुको पासवर्ड परिवर्तन गर्न चाहनुहुन्छ भने तलबाट नाम छान्नुहोस्। अन्यथा खाली छोड्नुहोस्।
                      </p>
                   </div>
                </div>
                
                <Select
                  label="प्रयोगकर्ता छान्नुहोस् (Select User to Reset)"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  options={[{id: 'self', value: '', label: '-- मेरो आफ्नै (Self) --'}, ...userOptions]}
                  icon={<UserCog size={16} />}
                />
             </div>
          )}

          {!selectedUserId && (
             <div className="space-y-4">
                <Input
                  label="हालको पासवर्ड (Current Password)"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                  placeholder="••••••"
                  icon={<Lock size={16} />}
                  required
                />
                <div className="border-t border-slate-100 my-4"></div>
             </div>
          )}

          <div className="space-y-4">
            <Input
              label="नयाँ पासवर्ड (New Password)"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              placeholder="••••••"
              icon={<KeyRound size={16} />}
              required
            />

            <Input
              label="नयाँ पासवर्ड पुनः पुष्टि (Confirm Password)"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="••••••"
              icon={<KeyRound size={16} />}
              required
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 font-bold font-nepali active:scale-95"
            >
              <Save size={20} />
              {selectedUserId ? 'पासवर्ड रिसेट गर्नुहोस्' : 'पासवर्ड परिवर्तन गर्नुहोस्'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
