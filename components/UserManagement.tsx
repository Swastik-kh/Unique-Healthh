
import React, { useState, useMemo } from 'react'; 
import { User, UserRole, Option } from '../types/coreTypes'; 
import { UserManagementProps } from '../types/dashboardTypes'; 
import { Plus, Trash2, Shield, User as UserIcon, Building2, Save, X, Phone, Briefcase, IdCard, Users, Pencil, CheckSquare, Square, ChevronDown, ChevronRight, CornerDownRight, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';

const PERMISSION_STRUCTURE = [
    { 
        id: 'services', 
        label: 'सेवा (Services)',
        children: [
            { id: 'mul_darta', label: 'मूल दर्ता सेवा (Main Registration)' },
            { 
                id: 'karyakram', 
                label: 'कार्यक्रम (Programs)',
                children: [
                    { id: 'vitamin_a', label: 'भिटामिन ए कार्यक्रम (Vitamin A)' },
                ] 
            },
            { id: 'opd_sewa', label: 'ओ.पी.डी. सेवा (OPD Service)' },
            { id: 'ipd_sewa', label: 'आई.पी.डी. सेवा (IPD Service)' },
            { id: 'service_billing', label: 'सेवा बिलिङ (Service Billing)' },
            { id: 'emergency_sewa', label: 'आकस्मिक सेवा (Emergency Service)' },
            { id: 'cbimnci_sewa', label: 'CBIMNCI सेवा (CBIMNCI Service)' },
            { 
                id: 'prayogsala_sewa', 
                label: 'प्रयोगशाला सेवा (Lab Service)',
                children: [
                    { id: 'namuna_sankalan', label: 'नमुना संकलन (Sample Collection)' },
                    { id: 'report_prabisti', label: 'रिपोर्ट प्रविष्टि (Result Entry)' },
                ]
            },
            { id: 'dispensory_sewa', label: 'डिस्पेन्सरी सेवा (Dispensary Service)' },
            { id: 'pariwar_niyojan', label: 'परिवार नियोजन सेवा (Family Planning)' },
            { id: 'xray_sewa', label: 'एक्स-रे सेवा (X-ray Service)' },
            { id: 'ecg_sewa', label: 'ई.सी.जी. सेवा (ECG Service)' },
            { id: 'usg_sewa', label: 'यु.एस.जी. सेवा (USG Service)' },
            { id: 'phisiotherapy', label: 'फिजियोथेरापी सेवा (Physiotherapy)' },
            { 
                id: 'administration', 
                label: 'प्रशासन (Administration)',
                children: [
                    { id: 'darta', label: 'दर्ता (Darta)' },
                    { id: 'chalani', label: 'चलानी (Chalani)' },
                    { id: 'bharman_adesh', label: 'भ्रमण आदेश दर्ता (Travel Order)' },
                    { id: 'lekha_prashasan', label: 'लेखा प्रशासन (Lekha Prashasan)' },
                    { id: 'bida_abedan', label: 'बिदा आवेदन (Leave Application)' },
                ]
            },
            { 
                id: 'tb_leprosy_group', 
                label: 'क्षयरोग/कुष्ठरोग (TB/Leprosy)',
                children: [
                    { id: 'tb_leprosy', label: 'बिरामी दर्ता (Patient Registration)' },
                    { id: 'tb_medicine_status', label: 'औषधि अवस्था (Medicine Status)' },
                ]
            },
            { id: 'khop_sewa', label: 'खोप सेवा (Vaccination Service)' }, 
            { id: 'rabies', label: 'रेबिज़ खोप क्लिनिक (Rabies Vaccine)' },
            { 
                id: 'surakshit_matritwo', 
                label: 'सुरक्षित मातृत्व सेवा (Safe Motherhood)',
                children: [
                    { id: 'garbhawoti_sewa', label: 'गर्भवती सेवा (Pregnancy Service)' },
                    { id: 'prasuti_sewa', label: 'प्रसूति सेवा (Delivery Service)' },
                    { id: 'uttar_prasuti_sewa', label: 'उत्तर प्रसूति सेवा (Post-Natal Service)' },
                ]
            },
            { id: 'immunization_tracking', label: 'खोप अनुगमन (Immunization Tracking)' }
        ]
    },
    { 
        id: 'inventory', 
        label: 'जिन्सी व्यवस्थापन (Inventory)',
        children: [
            { id: 'stock_entry_approval', label: 'स्टक प्रविष्टि अनुरोध (Stock Requests)' },
            { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात (Inventory Stock)' }, 
            { id: 'form_suchikaran', label: 'फर्म सुचीकरण (Firm Listing)' },
            { id: 'quotation', label: 'सामानको कोटेशन (Quotation)' },
            { id: 'mag_faram', label: 'माग फारम (Demand Form)' },
            { id: 'kharid_adesh', label: 'खरिद आदेश (Purchase Order)' },
            { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन (Issue Report)' },
            { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता (Sub. Ledger)' },
            { id: 'jinshi_khata', label: 'जिन्सी खाता (Inventory Ledger)' },
            { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन (Entry Report)' },
            { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता खाता (Return Ledger)' },
            { id: 'marmat_adesh', label: 'मर्मत आवेदन/आदेश (Maintenance)' },
            { id: 'dhuliyauna_faram', label: 'लिलाम / धुल्याउने (Disposal)' },
            { id: 'log_book', label: 'लग बुक (Log Book)' },
        ]
    },
    { 
        id: 'reports', 
        label: 'रिपोर्ट (Report)',
        children: [
            { id: 'report_tb_leprosy', label: 'क्षयरोग/कुष्ठरोग रिपोर्ट (TB/Leprosy)' },
            { id: 'report_rabies', label: 'रेबिज़ रिपोर्ट (Rabies Report)' },
            { id: 'report_khop', label: 'खोप रिपोर्ट (Immunization Report)' }, 
            { id: 'report_microplanning', label: 'Microplanning रिपोर्ट' },
            { id: 'report_cbimnci', label: 'CBIMNCI रिपोर्ट (CBIMNCI Report)' },
            { id: 'report_reporting_status', label: 'रिपोर्टिङ स्थिति (Reporting Status)' },
            { id: 'report_pariwar_niyojan', label: 'परिवार नियोजन रिपोर्ट (Family Planning)' },
            { id: 'report_gesi', label: 'GESI रिपोर्ट (GESI Report)' },
            { id: 'report_gesi_opd', label: 'GESI OPD सेवा रिपोर्ट (GESI OPD Report)' },
            { id: 'report_gesi_cbimnci', label: 'GESI CBIMNCI रिपोर्ट (GESI CBIMNCI Report)' },
            { id: 'report_mch', label: 'MCH रिपोर्ट (MCH Report)' },
            { id: 'report_tb_dst', label: 'TBDST रिपोर्ट (TBDST Report)' },
            { id: 'report_inventory_monthly', label: 'जिन्सी मासिक प्रतिवेदन (Monthly Report)' },
            { 
                id: 'report_dhis', 
                label: 'DHIS रिपोर्ट (DHIS Report)',
                children: [
                    { id: 'report_dhis_general', label: 'DHIS सामान्य रिपोर्ट (DHIS General Report)' }
                ]
            }
        ]
    },
    {
        id: 'conference',
        label: 'कन्फरेन्स (Conference)',
        children: []
    },
    { 
        id: 'settings', 
        label: 'सेटिङ (Settings)',
        children: [
            { id: 'general_setting', label: 'सामान्य सेटिङ (General Setting)' },
            { id: 'service_settings', label: 'सेवा सेटिङ (Service Settings)' },
            { id: 'store_setup', label: 'स्टोर सेटअप (Store Setup)' },
            { id: 'database_management', label: 'डाटाबेस व्यवस्थापन (Database)' },
            { id: 'user_management', label: 'प्रयोगकर्ता सेटअप (User Setup)' },
            { id: 'change_password', label: 'पासवर्ड परिवर्तन (Change Password)' },
        ]
    }
];

export const UserManagement: React.FC<UserManagementProps> = ({ 
  currentUser, 
  users, 
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  isDbLocked
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedPermissions, setExpandedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const allCreatableRoles: Option[] = [
    { id: 'health_section', value: 'HEALTH_SECTION', label: 'स्वास्थ्य शाखा (Health Section)' },
    { id: 'admin', value: 'ADMIN', label: 'एडमिन (Admin)' },
    { id: 'staff', value: 'STAFF', label: 'कर्मचारी (Staff)' },
    { id: 'storekeeper', value: 'STOREKEEPER', label: 'जिन्सी शाखा (Storekeeper)' },
    { id: 'account', value: 'ACCOUNT', label: 'लेखा शाखा (Account)' },
    { id: 'approval', value: 'APPROVAL', label: 'स्वीकृत गर्ने (Approval/Head)' },
  ];

  const rolesForDropdown = useMemo(() => {
    if (currentUser.role === 'SUPER_ADMIN') return allCreatableRoles;
    if (currentUser.role === 'HEALTH_SECTION') return allCreatableRoles.filter(opt => opt.value === 'ADMIN');
    if (currentUser.role === 'ADMIN') return allCreatableRoles.filter(opt => !['ADMIN', 'HEALTH_SECTION'].includes(opt.value));
    return [];
  }, [currentUser.role]);

  const [formData, setFormData] = useState<{
    id: string;
    username: string;
    password: string;
    fullName: string;
    designation: string;
    phoneNumber: string;
    organizationName: string;
    role: UserRole;
    allowedMenus: string[];
    serviceType: 'Permanent' | 'Temporary' | 'Contract';
    parentId?: string;
  }>({
    id: '',
    username: '',
    password: '',
    fullName: '',
    designation: '',
    phoneNumber: '',
    organizationName: currentUser.role === 'ADMIN' ? currentUser.organizationName : '',
    role: (rolesForDropdown.length > 0 ? (rolesForDropdown[0].value as UserRole) : 'STAFF'),
    allowedMenus: ['dashboard'],
    serviceType: 'Permanent',
    parentId: currentUser.id
  });

  const canManageUsers = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'HEALTH_SECTION';

  // FIXED: Visibility logic for managed users
  const managedUsers = useMemo(() => {
      return users.filter(u => {
          if (currentUser.role === 'SUPER_ADMIN') return true; // Super admin sees everyone
          if (currentUser.role === 'HEALTH_SECTION') {
              // Health section sees users they created (their admins)
              return u.parentId === currentUser.id;
          }
          if (currentUser.role === 'ADMIN') {
              // Admin sees users in their organization
              return u.organizationName === currentUser.organizationName;
          }
          return false;
      });
  }, [users, currentUser]);

  const generateUniqueId = () => {
      const prefix = 'EMP';
      const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 digit random
      let newId = `${prefix}-${randomPart}`;
      // Ensure uniqueness
      while (users.some(u => u.id === newId)) {
          const newRandom = Math.floor(1000 + Math.random() * 9000);
          newId = `${prefix}-${newRandom}`;
      }
      return newId;
  };

  const resetForm = () => {
      setFormData({ 
        id: generateUniqueId(), 
        username: '', password: '', fullName: '', designation: '', phoneNumber: '',
        organizationName: currentUser.role === 'ADMIN' ? currentUser.organizationName : '',
        role: (rolesForDropdown.length > 0 ? (rolesForDropdown[0].value as UserRole) : 'STAFF'),
        allowedMenus: ['dashboard'],
        serviceType: 'Permanent',
        parentId: currentUser.id
      });
      setEditingId(null);
      setLocalError(null);
  };

  const handleEditClick = (user: User) => {
      setEditingId(user.id);
      setFormData({
          id: user.id,
          username: user.username, password: user.password, fullName: user.fullName,
          designation: user.designation, phoneNumber: user.phoneNumber,
          organizationName: user.organizationName,
          role: user.role,
          allowedMenus: user.allowedMenus || ['dashboard'],
          serviceType: user.serviceType || 'Permanent',
          parentId: user.parentId
      });
      setShowForm(true);
  };

  const togglePermission = (menuId: string) => {
      setFormData(prev => {
          const current = prev.allowedMenus;
          if (current.includes(menuId)) {
              return { ...prev, allowedMenus: current.filter(id => id !== menuId) };
          } else {
              return { ...prev, allowedMenus: [...current, menuId] };
          }
      });
  };

  const flattenDescendantIds = (item: any): string[] => {
    if (!item.children) return [item.id];
    return [item.id, ...item.children.flatMap((child: any) => flattenDescendantIds(child))];
  };

  const toggleParentPermission = (parentId: string, groupChildren: any[]) => {
      setFormData(prev => {
          let newMenus = [...prev.allowedMenus];
          const allDescendantIds = groupChildren.flatMap((child: any) => flattenDescendantIds(child));
          const isParentCurrentlyChecked = newMenus.includes(parentId) && allDescendantIds.every(id => newMenus.includes(id));
          if (isParentCurrentlyChecked) {
              newMenus = newMenus.filter(id => id !== parentId && !allDescendantIds.includes(id));
          } else {
              newMenus = Array.from(new Set([...newMenus, parentId, ...allDescendantIds]));
          }
          return { ...prev, allowedMenus: newMenus };
      });
  };

  const renderPermissionGroup = (group: any, level: number = 0) => {
    const allDescendantIds = group.children ? group.children.flatMap((child: any) => flattenDescendantIds(child)) : [];
    const isParentChecked = formData.allowedMenus.includes(group.id) && allDescendantIds.every(id => formData.allowedMenus.includes(id));
    const someChildrenChecked = allDescendantIds.some(id => formData.allowedMenus.includes(id)) && !isParentChecked;

    return (
        <div key={group.id} className={`${level > 0 ? 'ml-4 border-l border-slate-200' : ''}`}>
            <div className={`flex items-center justify-between p-3 ${level === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                    {group.children && (
                        <button type="button" onClick={() => setExpandedPermissions(prev => prev.includes(group.id) ? prev.filter(x => x !== group.id) : [...prev, group.id])} className="text-slate-400">
                            {expandedPermissions.includes(group.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}
                    <div onClick={() => toggleParentPermission(group.id, group.children || [])} className="flex items-center gap-2 cursor-pointer">
                        <div className={isParentChecked ? 'text-primary-600' : 'text-slate-300'}>{isParentChecked ? <CheckSquare size={18} /> : (someChildrenChecked ? <div className="w-[18px] h-[18px] bg-primary-100 border-2 border-primary-600 rounded flex items-center justify-center"><div className="w-2 h-2 bg-primary-600 rounded-sm"></div></div> : <Square size={18} />)}</div>
                        <span className="font-medium text-slate-700 text-sm">{group.label}</span>
                    </div>
                </div>
            </div>
            {group.children && expandedPermissions.includes(group.id) && (
                <div className="bg-white">
                    {group.children.map((child: any) => (
                        child.children ? renderPermissionGroup(child, level + 1) : (
                            <div key={child.id} onClick={() => togglePermission(child.id)} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer ml-4">
                                <div className="text-slate-300"><CornerDownRight size={14} /></div>
                                <div className={formData.allowedMenus.includes(child.id) ? 'text-primary-600' : 'text-slate-300'}>{formData.allowedMenus.includes(child.id) ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                                <span className={`text-sm ${formData.allowedMenus.includes(child.id) ? 'text-slate-800' : 'text-slate-500'}`}>{child.label}</span>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || isSaving) return;
    
    setIsSaving(true);
    setLocalError(null);

    const newId = formData.id.trim();

    // Validation: Check for duplicate ID (exclude current user if editing)
    const idExists = users.some(u => u.id === newId && u.id !== editingId);
    if (idExists) {
        setLocalError("यो कर्मचारी संकेत नं. (ID) पहिले नै प्रयोगमा छ। कृपया अर्को ID प्रयोग गर्नुहोस्।");
        setIsSaving(false);
        return;
    }

    const finalMenus = Array.from(new Set([...formData.allowedMenus, 'dashboard']));
    const userToSave: User = {
        id: newId,
        username: formData.username.trim().toLowerCase(), 
        password: formData.password.trim(),
        role: formData.role, 
        fullName: formData.fullName.trim(), 
        designation: formData.designation.trim(),
        phoneNumber: formData.phoneNumber.trim(), 
        organizationName: formData.organizationName.trim(),
        allowedMenus: finalMenus,
        serviceType: formData.serviceType,
        parentId: formData.parentId || currentUser.id
    };

    try {
        if (editingId && editingId !== newId) {
            // ID changed: Create new user with new ID, then delete old user
            if (window.confirm("तपाईंले कर्मचारी संकेत नं. (ID) परिवर्तन गर्दै हुनुहुन्छ। यसले पुरानो ID को रेकर्ड हटाएर नयाँ ID मा सार्नेछ। के तपाईं निश्चित हुनुहुन्छ?")) {
                await onAddUser(userToSave); // Create new
                await onDeleteUser(editingId); // Delete old
            } else {
                setIsSaving(false);
                return;
            }
        } else {
            // ID unchanged or New User
            if (editingId) await onUpdateUser(userToSave);
            else await onAddUser(userToSave);
        }
        
        setShowForm(false);
        resetForm();
        alert("प्रयोगकर्ता सफलतापूर्वक सुरक्षित गरियो।");
    } catch (err: any) {
        setLocalError(err.message || "डेटाबेस जडानमा त्रुटि आयो।");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रयोगकर्ता व्यवस्थापन (User Management)</h2>
          <p className="text-sm text-slate-500">पहुँच अधिकार र प्रयोगकर्ता सेटअप</p>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-sm flex items-center gap-2 transition-all active:scale-95"><Plus size={18} />नयाँ प्रयोगकर्ता</button>
        )}
      </div>

      {isDbLocked && (
          <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-lg shadow-red-500/10 flex items-start gap-4 animate-pulse">
              <ShieldAlert className="text-red-600 shrink-0" size={32} />
              <div>
                  <h3 className="font-black text-red-800 font-nepali text-lg">डेटाबेस अनुमति त्रुटि (Database Locked)</h3>
                  <p className="text-red-700 text-sm mt-1 leading-relaxed">
                      तपाईँको डेटाबेस 'Read/Write' मोडमा छैन। नयाँ प्रयोगकर्ताहरू थप्न वा भएका युजरहरू सच्याउन मिल्दैन।
                  </p>
                  <p className="mt-3 text-xs font-bold bg-white/50 inline-block px-2 py-1 rounded border border-red-200">
                      उपचार: Firebase Console मा गएर Rules लाई Public (.read: true, .write: true) बनाउनुहोस्।
                  </p>
              </div>
          </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">{editingId ? 'विवरण सम्पादन' : 'नयाँ प्रयोगकर्ता थप्नुहोस्'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
          </div>

          {localError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700 text-xs flex items-start gap-3">
                  <AlertCircle className="shrink-0" size={18} />
                  <div>
                      <p className="font-bold">सुरक्षित गर्न सकिएन:</p>
                      <p>{localError}</p>
                  </div>
              </div>
          )}

          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <Input 
                label="कर्मचारी संकेत नं. (User ID)" 
                value={formData.id} 
                onChange={e => setFormData({...formData, id: e.target.value})} 
                required 
                icon={<IdCard size={16} />} 
                disabled={isSaving} 
                placeholder="Unique Employee ID"
            />
            <Input label="पूरा नाम" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required icon={<UserIcon size={16} />} disabled={isSaving} />
            <Select 
                label="सेवाको प्रकार" 
                value={formData.serviceType} 
                onChange={e => setFormData({...formData, serviceType: e.target.value as any})} 
                options={[
                    { id: 'Permanent', value: 'Permanent', label: 'स्थायी (Permanent)' },
                    { id: 'Temporary', value: 'Temporary', label: 'अस्थायी (Temporary)' },
                    { id: 'Contract', value: 'Contract', label: 'करार (Contract)' }
                ]} 
                required 
                icon={<Briefcase size={16} />} 
                disabled={isSaving}
            />
            <Input label="पद" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required icon={<Briefcase size={16} />} disabled={isSaving} />
            <Input label="फोन नं." value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} required icon={<Phone size={16} />} disabled={isSaving} />
            <Input 
                label="संस्था (कार्यालयको नाम)" 
                value={formData.organizationName} 
                onChange={e => setFormData({...formData, organizationName: e.target.value})} 
                required 
                readOnly={currentUser.role === 'ADMIN'} 
                className={currentUser.role === 'ADMIN' ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''} 
                icon={<Building2 size={16} />} 
                disabled={isSaving}
                placeholder="उदा: स्वास्थ्य चौकी, प्राथमिक स्वास्थ्य केन्द्र..."
            />
            {(canManageUsers) && (
              <Select 
                  label="भूमिका" 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})} 
                  options={rolesForDropdown} 
                  icon={<Users size={16} />} 
                  disabled={isSaving}
              />
            )}
            <Input label="प्रयोगकर्ता नाम" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required icon={<UserIcon size={16} />} disabled={isSaving} />
            <Input label="पासवर्ड" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required type="password" disabled={isSaving} />

            <div className="md:col-span-2 mt-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Shield size={16} className="text-primary-600"/>मेनु र सब-मेनु पहुँच अधिकार (Permissions)</h4>
                <div className="space-y-3">
                    {PERMISSION_STRUCTURE.map((group) => (
                        <div key={group.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                            {renderPermissionGroup(group)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm" disabled={isSaving}>रद्द</button>
              <button type="submit" disabled={isSaving || isDbLocked} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 text-sm shadow-sm flex items-center gap-2 disabled:opacity-70">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? (isSaving ? 'अपडेट गर्दै...' : 'अपडेट गर्नुहोस्') : (isSaving ? 'सुरक्षित गर्दै...' : 'सुरक्षित गर्नुहोस्')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-700 font-nepali">प्रयोगकर्ताहरूको सूची</h3>
            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Total: {managedUsers.length}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
                <tr><th className="px-6 py-4">प्रयोगकर्ता</th><th className="px-6 py-4">भूमिका</th><th className="px-6 py-4">संस्था</th><th className="px-6 py-4 text-right">कार्य</th></tr>
            </thead>
            <tbody className="divide-y">
                {managedUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">कुनै प्रयोगकर्ता भेटिएन।</td></tr>
                ) : (
                    managedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4"><div><p className="font-bold text-slate-800">{user.fullName}</p><p className="text-xs text-slate-400">@{user.username}</p></div></td>
                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">{user.role}</span></td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">{user.organizationName}</td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => handleEditClick(user)} className="text-primary-400 hover:text-primary-600 p-1.5 hover:bg-primary-50 rounded-full transition-colors"><Pencil size={18}/></button>
                            <button onClick={() => { if(window.confirm('के तपाईं यो प्रयोगकर्ता हटाउन चाहनुहुन्छ?')) onDeleteUser(user.id); }} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18}/></button>
                        </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
