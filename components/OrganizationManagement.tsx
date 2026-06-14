import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types/coreTypes';
import { 
  Building2, Users, Pencil, Trash2, X, Plus, Shield, 
  Phone, Briefcase, KeyRound, Save, Loader2, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';

interface OrganizationManagementProps {
  currentUser: User | null;
  users: User[];
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onDeleteOrganization: (orgName: string) => Promise<void>;
}

export const OrganizationManagement: React.FC<OrganizationManagementProps> = ({
  currentUser,
  users,
  onUpdateUser,
  onDeleteUser,
  onDeleteOrganization
}) => {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [confirmDeleteOrgInput, setConfirmDeleteOrgInput] = useState('');
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<string | null>(null);

  // User form data state
  const [userIdInput, setUserIdInput] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userDesignation, setUserDesignation] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('STAFF');
  const [userError, setUserError] = useState<string | null>(null);

  // Group users by organization
  const organizationsMap = useMemo(() => {
    const map = new Map<string, User[]>();
    users.forEach(u => {
      const org = u.organizationName || 'नाम नभएको संस्था';
      if (!map.has(org)) {
        map.set(org, []);
      }
      map.get(org)!.push(u);
    });
    return map;
  }, [users]);

  // List of unique organizations info
  const organizationsList = useMemo(() => {
    return Array.from(organizationsMap.entries()).map(([name, orgUsers]) => {
      return {
        name,
        userCount: orgUsers.length,
        admins: orgUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').map(u => u.fullName).join(', ') || 'छैन'
      };
    });
  }, [organizationsMap]);

  // Handle opening user Edit form
  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setUserIdInput(user.id);
    setUserFullName(user.fullName || '');
    setUserUsername(user.username || '');
    setUserPassword(user.password || '');
    setUserDesignation(user.designation || '');
    setUserPhone(user.phoneNumber || '');
    setUserRole(user.role || 'STAFF');
    setUserError(null);
  };

  // Handle saving the user form
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!userFullName.trim() || !userUsername.trim() || !userPassword.trim() || !userIdInput.trim()) {
      setUserError('कृपया सबै अनिवार्य स्थानहरू भर्नुहोस्।');
      return;
    }

    setIsSavingUser(true);
    setUserError(null);

    const userToSave: User = {
      ...editingUser,
      id: userIdInput.trim(),
      fullName: userFullName.trim(),
      username: userUsername.trim().toLowerCase(),
      password: userPassword.trim(),
      designation: userDesignation.trim(),
      phoneNumber: userPhone.trim(),
      role: userRole
    };

    try {
      if (editingUser.id !== userToSave.id) {
        // If ID has changed, add the new user and delete the old one
        await onUpdateUser(userToSave);
        await onDeleteUser(editingUser.id);
      } else {
        await onUpdateUser(userToSave);
      }
      
      setEditingUser(null);
      alert('प्रयोगकर्ताको विवरण सफलतापूर्वक सुरक्षित गरियो!');
    } catch (err: any) {
      setUserError(err.message || 'फायरबेस अपडेट गर्दा समस्या आयो।');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Safe user deletion check
  const handleDeleteUserClick = async (userToDelete: User) => {
    if (!currentUser) return;
    if (userToDelete.id === currentUser.id) {
      alert('तपाईंले अहिले लगइन गरिरहनुभएको प्रयोगकर्ता आफैलाई हटाउन सक्नुहुन्न।');
      return;
    }
    if (userToDelete.role === 'SUPER_ADMIN' || userToDelete.username === 'admin') {
      alert('सुरक्षा कारणले अर्को Super Admin वा मूल admin प्रयोगकर्ता हटाउन अनुमति छैन।');
      return;
    }

    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि प्रयोगकर्ता "${userToDelete.fullName}" हटाउन चाहनुहुन्छ?`)) {
      try {
        await onDeleteUser(userToDelete.id);
        alert('प्रयोगकर्ता सफलतापूर्वक हटाइयो।');
      } catch (err: any) {
        alert(`प्रयोगकर्ता हटाउन सकिएन: ${err.message}`);
      }
    }
  };

  // Secure entire organization delete process
  const handleDeleteOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirmDeleteModal) return;

    if (confirmDeleteOrgInput.trim() !== showConfirmDeleteModal.trim()) {
      alert('प्रविष्टि गरिएको संस्थाको नाम मिलेन, कृपया पुन: प्रयास गर्नुहोस्।');
      return;
    }

    setIsDeletingOrg(true);
    try {
      await onDeleteOrganization(showConfirmDeleteModal);
      setShowConfirmDeleteModal(null);
      setSelectedOrg(null);
      setConfirmDeleteOrgInput('');
    } catch (err: any) {
      alert(`संस्था हटाउन समस्या आयो: ${err.message}`);
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const getNepaliRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'सुपर एड्मिन (Super Admin)';
      case 'HEALTH_SECTION': return 'स्वास्थ्य शाखा (Health Section)';
      case 'ADMIN': return 'एडमिन (Admin)';
      case 'STAFF': return 'कर्मचारी (Staff)';
      case 'STOREKEEPER': return 'जिन्सी शाखा (Storekeeper)';
      case 'ACCOUNT': return 'लेखा शाखा (Account)';
      case 'APPROVAL': return 'स्वीकृत गर्ने (Approval)';
      default: return role;
    }
  };

  const currentOrgUsers = selectedOrg ? (organizationsMap.get(selectedOrg) || []) : [];

  return (
    <div className="space-y-6">
      {/* Upper header segment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
            <Building2 className="text-primary-600" size={24} />
            संस्था व्यवस्थापन (Organization Management)
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            सिस्टम भित्र आबद्ध रहेका विभिन्न संस्थाहरूको निगरानी, प्रयोगकर्ताहरूको सूची र सङ्घीय संस्थाहरू व्यवस्थापन गर्ने केन्द्र।
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
          <ShieldCheck size={16} /> Super Admin Control Mode
        </div>
      </div>

      {/* Grid of registered organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizationsList.map(org => {
          const isMainOrg = currentUser?.organizationName === org.name;
          return (
            <div 
              key={org.name}
              className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                isMainOrg ? 'border-primary-300 ring-2 ring-primary-50' : 'border-slate-100'
              }`}
            >
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${isMainOrg ? 'bg-primary-50 text-primary-600' : 'bg-slate-50 text-slate-500'}`}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm leading-tight line-clamp-1">
                        {org.name}
                      </h3>
                      {isMainOrg && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary-150 text-primary-700 text-[10px] font-black rounded uppercase">
                          तपाईँको मुख्य संस्था (Current)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-50">
                  <div className="p-2.5 bg-slate-50/60 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">आबद्ध प्रयोगकर्ता</p>
                    <p className="text-lg font-black text-slate-700 mt-0.5">{org.userCount}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50/60 rounded-xl text-center flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">मुख्य एड्मिनहरू</p>
                    <p className="text-xs font-bold text-slate-700 mt-1 truncate max-w-full" title={org.admins}>
                      {org.admins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 px-5 py-3.5 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => setSelectedOrg(org.name)}
                  className="flex-1 py-1.5 px-3 bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 rounded-xl text-xs flex justify-center items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Users size={14} /> विवरण र कर्मचारीहरू
                </button>
                <button
                  type="button"
                  title={isMainOrg ? "सुरक्षा कारणले मुख्य संस्था मेटाउन मिल्दैन।" : "यस संस्थाका सबै विवरण हटाउनुहोस्"}
                  disabled={isMainOrg}
                  onClick={() => {
                    setConfirmDeleteOrgInput('');
                    setShowConfirmDeleteModal(org.name);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs flex justify-center items-center gap-1.5 font-bold border transition-colors ${
                    isMainOrg 
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-red-50 hover:bg-red-100 border-red-100 text-red-600'
                  }`}
                >
                  <Trash2 size={14} /> संस्था हटाउनुहोस्
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users of selected organization Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Modal Overlay backdrop */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setSelectedOrg(null)}>
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
            </div>

            {/* Trick browser to center */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            {/* Modal Container */}
            <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base leading-tight font-nepali">
                      {selectedOrg} का प्रयोगकर्ताहरू
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                      कर्मचारीहरूको सूची, भूमिका सम्पादन र पहुँच नियन्त्रण
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-250 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-x-auto">
                {currentOrgUsers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 italic font-nepali">
                    यस संस्थामा हाल कुनै प्रयोगकर्ता थपिएको छैन।
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-extrabold text-[12px] uppercase">
                        <th className="pb-3 text-left">सङ्केत नं. (ID)</th>
                        <th className="pb-3 text-left">प्रयोगकर्ताको नाम</th>
                        <th className="pb-3 text-left">युजरनेम (Username)</th>
                        <th className="pb-3 text-left">भूमिका (Role)</th>
                        <th className="pb-3 text-left">पद र फोन</th>
                        <th className="pb-3 text-right">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-nepali text-slate-700">
                      {currentOrgUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold text-slate-900">{u.id}</td>
                          <td className="py-3 font-bold text-slate-800">{u.fullName}</td>
                          <td className="py-3 font-mono text-xs">{u.username}</td>
                          <td className="py-3">
                            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                              {getNepaliRoleLabel(u.role)}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-500">
                            <div>{u.designation || '-'}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">{u.phoneNumber || '-'}</div>
                          </td>
                          <td className="py-3 text-right space-x-1">
                            <button
                              onClick={() => handleStartEditUser(u)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50/80 rounded-lg transition-colors"
                              title="विवरण सम्पादन गर्नुहोस्"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteUserClick(u)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="प्रयोगकर्ता हटाउनुहोस्"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="px-5 py-2 border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 rounded-xl text-xs transition-colors shadow-sm"
                >
                  बन्द गर्नुहोस्
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Edit Mini Form Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[60] overflow-y-auto no-print">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setEditingUser(null)}>
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSaveUserEdit}>
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Pencil className="text-indigo-600" size={18} />
                    <h3 className="font-bold text-slate-800 text-sm font-nepali">
                      प्रयोगकर्ता सम्पादन: {editingUser.fullName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4 font-nepali">
                  {userError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                      <AlertTriangle size={16} /> {userError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">कर्मचारी संङ्केत नं. (ID) *</label>
                      <Input
                        value={userIdInput}
                        onChange={(e) => setUserIdInput(e.target.value)}
                        placeholder="संकेत कोड"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">युजरनेम (Username) *</label>
                      <Input
                        value={userUsername}
                        onChange={(e) => setUserUsername(e.target.value)}
                        placeholder="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">पुरा नाम *</label>
                      <Input
                        value={userFullName}
                        onChange={(e) => setUserFullName(e.target.value)}
                        placeholder="नाम थर"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">पासवर्ड (Password) *</label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="पासवर्ड"
                          required
                        />
                        <KeyRound className="absolute right-3 top-2.5 text-slate-300" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">पद (Designation)</label>
                      <div className="relative">
                        <Input
                          value={userDesignation}
                          onChange={(e) => setUserDesignation(e.target.value)}
                          placeholder="उदा: अधिकृत"
                        />
                        <Briefcase className="absolute right-3 top-2.5 text-slate-300" size={16} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">फोन नम्बर</label>
                      <div className="relative">
                        <Input
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="९८xxxxxxxx"
                        />
                        <Phone className="absolute right-3 top-2.5 text-slate-300" size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">भूमिका (User Role) *</label>
                    <Select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as UserRole)}
                      options={[
                        { id: 'SUPER_ADMIN', value: 'SUPER_ADMIN', label: 'सुपर एड्मिन (SUPER_ADMIN)' },
                        { id: 'HEALTH_SECTION', value: 'HEALTH_SECTION', label: 'स्वास्थ्य शाखा (HEALTH_SECTION)' },
                        { id: 'ADMIN', value: 'ADMIN', label: 'एड्मिन (ADMIN)' },
                        { id: 'STAFF', value: 'STAFF', label: 'कर्मचारी (STAFF)' },
                        { id: 'STOREKEEPER', value: 'STOREKEEPER', label: 'जिन्सी शाखा (STOREKEEPER)' },
                        { id: 'ACCOUNT', value: 'ACCOUNT', label: 'लेखा शाखा (ACCOUNT)' },
                        { id: 'APPROVAL', value: 'APPROVAL', label: 'स्वीकृत गर्ने (APPROVAL)' }
                      ]}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors shadow-xs"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 font-bold text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    {isSavingUser ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> सुरक्षित हुँदै...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> परिवर्तन सुरक्षित गर्नुहोस्
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Safe Organization Deletion Confirmation Modal */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowConfirmDeleteModal(null)}>
              <div className="absolute inset-0 bg-red-950/20 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-red-100">
              <form onSubmit={handleDeleteOrgSubmit}>
                <div className="bg-red-50/50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle size={18} />
                    <h3 className="font-extrabold text-sm font-nepali">
                      संस्था पूर्ण रूपमा हटाउने पुष्टि
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteModal(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 space-y-4 font-nepali">
                  <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 space-y-2">
                    <h4 className="font-black text-xs uppercase flex items-center gap-1.5">
                      <Shield className="shrink-0" size={14} /> ध्यान दिनुहोस् (CRITICAL WARNING)
                    </h4>
                    <p className="text-xs leading-relaxed font-semibold">
                      यो संस्था हटाउनाले उक्त संस्थासँग सम्बन्धित <strong>सबै डाटाबेस विवरणहरू</strong> (जिन्सी, दर्ता, चलानी, माग फारम आदि) र यस अन्तर्गतका <strong>सबै प्रयोगकर्ताहरू पूर्ण रूपमा मेटिनेछन्</strong>। यो कार्य उल्ट्याउन मिल्ने छैन।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 leading-relaxed">
                      पुष्टि गर्न तथा अघि बढ्न संस्थाको पूरा नाम <strong>{showConfirmDeleteModal}</strong> यहाँ टाइप गर्नुहोस्:
                    </label>
                    <Input
                      value={confirmDeleteOrgInput}
                      onChange={(e) => setConfirmDeleteOrgInput(e.target.value)}
                      placeholder="संस्थाको नाम भर्नुहोस्"
                      required
                    />
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmDeleteModal(null);
                      setConfirmDeleteOrgInput('');
                    }}
                    className="px-4 py-2 border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors shadow-xs"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="submit"
                    disabled={isDeletingOrg || confirmDeleteOrgInput.trim() !== showConfirmDeleteModal.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-200 disabled:text-red-400 disabled:border-transparent disabled:cursor-not-allowed font-bold text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    {isDeletingOrg ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> हटाउँदै...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> पूर्ण रूपमा हटाउनुहोस्
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
