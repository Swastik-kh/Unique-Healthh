import React from 'react';
import { 
  LayoutDashboard, Stethoscope, ClipboardList, UserPlus, Building2, Siren, Baby, FileText, 
  FlaskConical, Pill, Users, Scan, Activity, Waves, Accessibility, Truck, Send, MapPin, 
  Calculator, Calendar, Syringe, HeartHandshake, CheckCircle2, Package, Warehouse, 
  ClipboardCheck, FilePlus, ShoppingCart, FileOutput, Archive, Book, BookOpen, RotateCcw, 
  Wrench, Trash2, Scroll, FileSpreadsheet, BarChart3, MessageSquare, Settings, Sliders, 
  ShieldCheck, Store, KeyRound, Database
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: MenuItem[];
  badgeCount?: number;
}

export const ALL_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'ड्यासबोर्ड', icon: <LayoutDashboard size={20} /> },
  { 
    id: 'services', 
    label: 'सेवा (Services)', 
    icon: <Stethoscope size={20} />, 
    subItems: [ 
      { id: 'mul_darta', label: 'मूल दर्ता सेवा', icon: <ClipboardList size={16} /> },
      { id: 'opd_sewa', label: 'ओ.पी.डी. सेवा', icon: <UserPlus size={16} /> },
      { id: 'ipd_sewa', label: 'आई.पी.डी. सेवा (IPD)', icon: <Building2 size={16} /> },
      { id: 'emergency_sewa', label: 'आकस्मिक सेवा (Emergency)', icon: <Siren size={16} /> },
      { id: 'cbimnci_sewa', label: 'CBIMNCI सेवा', icon: <Baby size={16} /> },
      { id: 'service_billing', label: 'सेवा बिलिङ (Service Billing)', icon: <FileText size={16} /> },
      { id: 'prayogsala_sewa', label: 'प्रयोगशाला सेवा', icon: <FlaskConical size={16} /> },
      { id: 'dispensory_sewa', label: 'डिस्पेन्सरी सेवा', icon: <Pill size={16} /> },
      { id: 'pariwar_niyojan', label: 'परिवार नियोजन सेवा', icon: <Users size={16} /> },
      { id: 'xray_sewa', label: 'एक्स-रे सेवा', icon: <Scan size={16} /> },
      { id: 'ecg_sewa', label: 'ई.सी.जी. सेवा', icon: <Activity size={16} /> },
      { id: 'usg_sewa', label: 'यु.एस.जी. सेवा', icon: <Waves size={16} /> },
      { id: 'phisiotherapy', label: 'फिजियोथेरापी सेवा', icon: <Accessibility size={16} /> },
      { id: 'ambulance_sewa', label: 'एम्बुलेन्स सेवा', icon: <Truck size={16} /> },
      { 
        id: 'administration', 
        label: 'प्रशासन', 
        icon: <Users size={16} />,
        subItems: [
          { id: 'darta', label: 'दर्ता', icon: <FileText size={16} /> },
          { id: 'chalani', label: 'चलानी', icon: <Send size={16} /> },
          { id: 'bharman_adesh', label: 'भ्रमण आदेश दर्ता', icon: <MapPin size={16} /> },
          { id: 'lekha_prashasan', label: 'लेखा प्रशासन', icon: <Calculator size={16} /> },
          { id: 'bida_abedan', label: 'बिदा आवेदन', icon: <Calendar size={16} /> },
        ]
      },
      { 
        id: 'tb_leprosy_group', 
        label: 'क्षयरोग/कुष्ठरोग', 
        icon: <Activity size={16} />,
        subItems: [
          { id: 'tb_leprosy', label: 'बिरामी दर्ता', icon: <UserPlus size={16} /> },
        ]
      },
      { id: 'khop_sewa', label: 'खोप सेवा', icon: <Baby size={16} /> }, 
      { id: 'rabies', label: 'रेबिज़ खोप क्लिनिक', icon: <Syringe size={16} /> }, 
      { 
        id: 'surakshit_matritwo', 
        label: 'सुरक्षित मातृत्व सेवा', 
        icon: <Baby size={16} />,
        subItems: [
          { id: 'garbhawoti_sewa', label: 'गर्भवती सेवा', icon: <HeartHandshake size={16} /> },
          { id: 'prasuti_sewa', label: 'प्रसूति सेवा', icon: <Baby size={16} /> },
          { id: 'uttar_prasuti_sewa', label: 'उत्तर प्रसूति सेवा', icon: <Baby size={16} /> },
        ]
      },
      { id: 'immunization_tracking', label: 'खोप अनुगमन', icon: <Baby size={16} /> },
      { 
        id: 'karyakram', 
        label: 'कार्यक्रम (Programs)', 
        icon: <Activity size={16} />,
        subItems: [
          { id: 'vitamin_a', label: 'भिटामिन ए कार्यक्रम', icon: <CheckCircle2 size={16} /> },
          { id: 'khop_abhiyan', label: 'खोप अभियान', icon: <Syringe size={16} /> },
          { id: 'report_microplanning', label: 'खोप माइक्रोप्लानिङ', icon: <Calendar size={16} /> }
        ]
      }
    ] 
  },
  {
    id: 'inventory',
    label: 'जिन्सी व्यवस्थापन',
    icon: <Package size={20} />,
    subItems: [
      { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात', icon: <Warehouse size={16} /> },
      { id: 'stock_entry_approval', label: 'स्टक दाखिला अनुमति', icon: <ClipboardCheck size={16} /> },
      { id: 'mag_faram', label: 'माग फारम', icon: <FilePlus size={16} /> },
      { id: 'kharid_adesh', label: 'खरिद आदेश', icon: <ShoppingCart size={16} /> },
      { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन', icon: <FileOutput size={16} /> },
      { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन', icon: <Archive size={16} /> },
      { id: 'jinshi_khata', label: 'जिन्सी खाता', icon: <Book size={16} /> },
      { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता', icon: <BookOpen size={16} /> },
      { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता', icon: <RotateCcw size={16} /> },
      { id: 'marmat_adesh', label: 'मर्मत आवेदन', icon: <Wrench size={16} /> },
      { id: 'dhuliyauna_faram', label: 'लिलाम/धुल्याउने', icon: <Trash2 size={16} /> },
      { id: 'log_book', label: 'लग बुक', icon: <Scroll size={16} /> },
      { id: 'form_suchikaran', label: 'फर्म सुचीकरण', icon: <ClipboardList size={16} /> },
      { id: 'quotation', label: 'सामानको कोटेशन', icon: <FileSpreadsheet size={16} /> },
    ]
  },
  {
    id: 'reports',
    label: 'रिपोर्टहरू',
    icon: <BarChart3 size={20} />,
    subItems: [
      { 
        id: 'report_khop_group', 
        label: 'खोप रिपोर्ट', 
        icon: <Baby size={16} />,
        subItems: [
           { id: 'report_khop', label: 'खोप रिपोर्ट (Main)', icon: <Baby size={16} /> },
           { id: 'report_microplanning', label: 'खोप माइक्रोप्लानिङ', icon: <Calendar size={16} /> }
        ]
      },
      { id: 'report_rabies', label: 'रेबिज़ रिपोर्ट', icon: <Syringe size={16} /> },
      { id: 'report_cbimnci', label: 'CBIMNCI रिपोर्ट', icon: <FileText size={16} /> },
      { id: 'report_reporting_status', label: 'रिपोर्टिङ स्थिति', icon: <FileText size={16} /> },
      { id: 'report_pariwar_niyojan', label: 'परिवार नियोजन रिपोर्ट', icon: <Users size={16} /> },
      { id: 'report_gesi', label: 'Gender Equity and social inclusion', icon: <FileText size={16} /> },
      { id: 'report_gesi_opd', label: 'GESI OPD सेवा रिपोर्ट', icon: <FileText size={16} /> },
      { id: 'report_gesi_cbimnci', label: 'GESI CBIMNCI रिपोर्ट', icon: <FileText size={16} /> },
      { id: 'report_mch', label: 'MCH रिपोर्ट', icon: <Baby size={16} /> },
      { id: 'report_tb_dst', label: 'TBDST रिपोर्ट', icon: <FileText size={16} /> },
      { id: 'report_inventory_monthly', label: 'जिन्सी मासिक रिपोर्ट', icon: <FileText size={16} /> },
      { id: 'report_drug_quantification', label: 'Drug Quantification', icon: <Pill size={16} /> },
      { id: 'report_lab_billing', label: 'बिलिङ रिपोर्ट', icon: <FileText size={16} /> },
      { 
        id: 'report_dhis', 
        label: 'DHIS रिपोर्ट',
        icon: <BarChart3 size={16} />,
        subItems: [
            { id: 'report_dhis_general', label: 'DHIS सामान्य रिपोर्ट', icon: <FileText size={16} /> }
        ]
      }
    ]
  },
  {
    id: 'conference',
    label: 'कन्फरेन्स (Conference)',
    icon: <MessageSquare size={20} />,
  },
  {
    id: 'talim_byabasthapan',
    label: 'तालिम व्यवस्थापन',
    icon: <BookOpen size={20} />
  },
  {
    id: 'settings',
    label: 'सेटिङ',
    icon: <Settings size={20} />,
    subItems: [
      { id: 'general_setting', label: 'सामान्य सेटिङ', icon: <Sliders size={16} /> },
      { id: 'organization_management', label: 'संस्था व्यवस्थापन', icon: <Building2 size={16} /> },
      { id: 'hib_settings', label: 'HIB सेटिङ', icon: <ShieldCheck size={16} /> },
      { id: 'service_settings', label: 'सेवा सेटिङ (Service Settings)', icon: <Activity size={16} /> },
      { id: 'store_setup', label: 'स्टोर सेटअप', icon: <Store size={16} /> },
      { id: 'user_management', label: 'प्रयोगकर्ता व्यवस्थापन', icon: <Users size={16} /> },
      { id: 'user_history', label: 'इतिहास', icon: <Activity size={16} /> },
      { id: 'change_password', label: 'पासवर्ड परिवर्तन', icon: <KeyRound size={16} /> },
      { id: 'database_management', label: 'डाटाबेस व्यवस्थापन', icon: <Database size={16} /> },
    ]
  }
];
