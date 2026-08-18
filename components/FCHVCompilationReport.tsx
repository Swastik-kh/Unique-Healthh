import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FCHVReport } from '../types/fchvTypes';
import { FCHV } from '../types/vitaminATypes';
import { OrganizationSettings } from '../types/coreTypes';
import { Printer, Filter, Users, FileText, Calendar, RefreshCw, Plus } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import axios from 'axios';
import { getDhis2CellMapping } from '../lib/dhis2Utils';
import { DHIS2_DATASETS } from '../constants/dhis2Metadata';

interface FCHVCompilationReportProps {
    safeOrgName: string;
    currentFiscalYear: string;
    generalSettings: OrganizationSettings;
    currentUser: any;
}

const MONTHS = [
    { id: '04', name: 'साउन' },
    { id: '05', name: 'भदौ' },
    { id: '06', name: 'असोज' },
    { id: '07', name: 'कात्तिक' },
    { id: '08', name: 'मंसिर' },
    { id: '09', name: 'पुस' },
    { id: '10', name: 'माघ' },
    { id: '11', name: 'फागुन' },
    { id: '12', name: 'चैत' },
    { id: '01', name: 'वैशाख' },
    { id: '02', name: 'जेठ' },
    { id: '03', name: 'असार' },
];

export const FCHVCompilationReport: React.FC<FCHVCompilationReportProps> = ({ safeOrgName, currentFiscalYear, generalSettings, currentUser }) => {
    const [reports, setReports] = useState<FCHVReport[]>([]);
    const [fchvs, setFchvs] = useState<FCHV[]>([]);
    const [selectedFchvId, setSelectedFchvId] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
    const [loading, setLoading] = useState(true);
    const [isPushing, setIsPushing] = useState(false);
    const componentRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch FCHVs for the dropdown
                const fchvCol = await getDocs(collection(db, 'orgData', safeOrgName, 'fchvs'));
                setFchvs(fchvCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHV)));

                // Fetch Reports
                let q = query(collection(db, 'orgData', safeOrgName, 'fchvReports'), where('fiscalYear', '==', selectedFiscalYear));
                
                if (selectedMonth !== 'all') {
                    q = query(q, where('month', '==', selectedMonth));
                }
                if (selectedFchvId !== 'all') {
                    q = query(q, where('fchvId', '==', selectedFchvId));
                }

                const reportCol = await getDocs(q);
                setReports(reportCol.docs.map(doc => ({ id: doc.id, ...doc.data() } as FCHVReport)));
            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [safeOrgName, selectedFiscalYear, selectedMonth, selectedFchvId]);

    const compiledData = useMemo(() => {
        const sum = (path: string) => {
            return reports.reduce((acc, report) => {
                const keys = path.split('.');
                let val: any = report;
                for (const key of keys) val = val?.[key];
                return acc + (val || 0);
            }, 0);
        };

        return {
            safeMotherhood: {
                amaGroupMeeting: sum('safeMotherhood.amaGroupMeeting'),
                pregnantMet: sum('safeMotherhood.pregnantMet'),
                ironDistribution: sum('safeMotherhood.ironDistribution'),
                homeDelivery: {
                    misoprostolEnsured: sum('safeMotherhood.homeDelivery.misoprostolEnsured'),
                    liveBirth: sum('safeMotherhood.homeDelivery.liveBirth'),
                    stillBirth: sum('safeMotherhood.homeDelivery.stillBirth'),
                    asphyxiaManagement: sum('safeMotherhood.homeDelivery.asphyxiaManagement'),
                    skinToSkin: sum('safeMotherhood.homeDelivery.skinToSkin'),
                    chlorhexidine: sum('safeMotherhood.homeDelivery.chlorhexidine'),
                    breastfeeding1Hr: sum('safeMotherhood.homeDelivery.breastfeeding1Hr'),
                    lowBirthWeight: sum('safeMotherhood.homeDelivery.lowBirthWeight'),
                    veryLowBirthWeight: sum('safeMotherhood.homeDelivery.veryLowBirthWeight'),
                    checkup24Hr: sum('safeMotherhood.homeDelivery.checkup24Hr'),
                    checkup3rdDay: sum('safeMotherhood.homeDelivery.checkup3rdDay'),
                    checkup7thDay: sum('safeMotherhood.homeDelivery.checkup7thDay'),
                },
                vitADistributionPostnatal: sum('safeMotherhood.vitADistributionPostnatal'),
                condomDistribution: sum('safeMotherhood.condomDistribution'),
                pillsDistribution: sum('safeMotherhood.pillsDistribution'),
                ecpDose: sum('safeMotherhood.ecpDose'),
                ecpWomen: sum('safeMotherhood.ecpWomen'),
            },
            maternalDeath: {
                pregnancy: sum('maternalDeath.pregnancy'),
                delivery: sum('maternalDeath.delivery'),
                postnatal: sum('maternalDeath.postnatal'),
            },
            imnci: {
                under2Months: {
                    u28Days: sum('imnci.under2Months.u28Days'),
                    d29_59Days: sum('imnci.under2Months.d29_59Days'),
                },
                m2_59Months: {
                    respiratoryTotal: sum('imnci.m2_59Months.respiratoryTotal'),
                    noPneumonia: sum('imnci.m2_59Months.noPneumonia'),
                    diarrhea: sum('imnci.m2_59Months.diarrhea'),
                    treatedOrsZinc: sum('imnci.m2_59Months.treatedOrsZinc'),
                    orsUsed: sum('imnci.m2_59Months.orsUsed'),
                    zincUsed: sum('imnci.m2_59Months.zincUsed'),
                },
                death: {
                    d0_7Days: sum('imnci.death.d0_7Days'),
                    d8_28Days: sum('imnci.death.d8_28Days'),
                    d29_59Days: sum('imnci.death.d29_59Days'),
                    m2_11Months: sum('imnci.death.m2_11Months'),
                    m12_59Months: sum('imnci.death.m12_59Months'),
                },
            },
            imam: {
                muac: {
                    green: sum('imam.muac.green'),
                    yellow: sum('imam.muac.yellow'),
                    red: sum('imam.muac.red'),
                    edema: sum('imam.muac.edema'),
                },
                followUp: {
                    recoveredSAM: sum('imam.followUp.recoveredSAM'),
                    noWeightGainSAM: sum('imam.followUp.noWeightGainSAM'),
                    droppedOutSAM: sum('imam.followUp.droppedOutSAM'),
                },
            },
        };
    }, [reports]);

    const pushToDHIS2 = async () => {
        if (!generalSettings.dhis2BaseUrl || !generalSettings.dhis2Username || !generalSettings.dhis2Password || !generalSettings.dhis2OrgUnitId) {
            alert('DHIS2 कन्फिगरेसन पुरा भएको छैन। कृपया सेटिङमा मिलाउनुहोस्।');
            return;
        }

        setIsPushing(true);
        try {
            const dataValues: any[] = [];
            
            const mapCell = (key: string, value: number) => {
                const mapping = getDhis2CellMapping(key, generalSettings, { dataElement: 'NOT_MAPPED', categoryOptionCombo: '' });
                if (mapping.dataElement && mapping.dataElement !== 'NOT_MAPPED') {
                    dataValues.push({
                        dataElement: mapping.dataElement,
                        categoryOptionCombo: mapping.categoryOptionCombo,
                        value: String(value)
                    });
                }
            };

            // FCHV Specific Mappings (Example keys)
            mapCell('FCHV_AMA_MEETING', compiledData.safeMotherhood.amaGroupMeeting);
            mapCell('FCHV_PREGNANT_MET', compiledData.safeMotherhood.pregnantMet);
            mapCell('FCHV_IRON_DISTRIBUTION', compiledData.safeMotherhood.ironDistribution);
            mapCell('FCHV_HOME_DELIVERY_LIVE', compiledData.safeMotherhood.homeDelivery.liveBirth);
            mapCell('FCHV_VIT_A_POSTNATAL', compiledData.safeMotherhood.vitADistributionPostnatal);
            mapCell('FCHV_CONDOM_DIST', compiledData.safeMotherhood.condomDistribution);
            mapCell('FCHV_IMNCI_RESP_TOTAL', compiledData.imnci.m2_59Months.respiratoryTotal);
            mapCell('FCHV_MUAC_RED', compiledData.imam.muac.red);

            if (dataValues.length === 0) {
                alert('DHIS2 मा पठाउनको लागि कुनै डाटा म्यापिङ फेला परेन। कृपया सेटिङमा म्यापिङ मिलाउनुहोस्।');
                setIsPushing(false);
                return;
            }

            const period = selectedMonth === 'all'
                ? selectedFiscalYear.replace(/\//g, '')
                : `${selectedFiscalYear.split('/')[0]}${selectedMonth}`;

            const dataSetId = generalSettings.dhis2DatasetMappings?.['FCHV Report'] || generalSettings.dhis2DataSetId || "";
            const dataSetLabel = DHIS2_DATASETS.find(ds => ds.value === dataSetId)?.label || dataSetId;
            const orgName = generalSettings.dhis2OrgUnitName || generalSettings.orgNameNepali || generalSettings.officeName || generalSettings.orgNameEnglish || currentUser?.organizationName || 'Not Specified';

            const confirmMessage = `DHIS2 मा FCHV संकलित डाटा पठाउन चाहनुहुन्छ?\n\n` +
                `संस्था (DHIS2): ${orgName}\n` +
                `डाटासेट: ${dataSetLabel}\n` +
                `अवधि: ${period}\n` +
                `म्याप गरिएका क्षेत्रहरू: ${dataValues.length}\n\n` +
                `के तपाइँ पक्का हुनुहुन्छ?`;

            if (!window.confirm(confirmMessage)) {
                setIsPushing(false);
                return;
            }

            const payload = {
                dataSet: dataSetId,
                completeDate: new Date().toISOString().split('T')[0],
                period: period,
                orgUnit: generalSettings.dhis2OrgUnitId,
                dataValues: dataValues
            };

            await axios.post('/api/dhis2/push', {
                payload,
                baseUrl: generalSettings.dhis2BaseUrl,
                username: generalSettings.dhis2Username,
                password: generalSettings.dhis2Password
            });

            alert('DHIS2 मा सफलतापूर्वक FCHV डाटा पठाइयो।');
        } catch (error: any) {
            console.error("DHIS2 push error:", error);
            const serverErrMsg = error.response?.data?.error || error.response?.data?.description || error.message || "अज्ञात त्रुटि";
            alert("DHIS2 मा डेटा पठाउन सकिएन: " + serverErrMsg);
        } finally {
            setIsPushing(false);
        }
    };

    const TableRow = ({ label, value, unit, colIndex = 3 }: { label: string; value: number; unit?: string; colIndex?: number }) => (
        <tr className="border-b border-slate-200">
            <td className="px-4 py-2 text-sm font-nepali border-r">{label}</td>
            <td className="px-4 py-2 text-xs font-bold text-slate-500 text-center border-r">{unit}</td>
            <td className="px-4 py-2 text-sm font-bold text-slate-800 text-center">{value || 0}</td>
        </tr>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 font-nepali">FCHV मासिक संकलित रिपोर्ट</h2>
                        <p className="text-xs sm:text-sm text-slate-500">स्वयंसेविका कार्य विवरण संकलन</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                        <button 
                            onClick={pushToDHIS2}
                            disabled={isPushing}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                            {isPushing ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                            {isPushing ? 'पठाउँदै...' : 'DHIS2 मा पठाउनुहोस्'}
                        </button>
                    )}
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm"
                    >
                        <Printer size={18} /> प्रिन्ट गर्नुहोस्
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">आर्थिक वर्ष</label>
                    <input type="text" value={selectedFiscalYear} onChange={e => setSelectedFiscalYear(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">महिना</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm">
                        <option value="all">सबै महिना</option>
                        {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">स्वयंसेविका</label>
                    <select value={selectedFchvId} onChange={e => setSelectedFchvId(e.target.value)} className="w-full border p-2.5 rounded-lg text-sm">
                        <option value="all">सबै स्वयंसेविका</option>
                        {fchvs.map(f => <option key={f.id} value={f.id}>{f.name} (वडा नं {f.wardNumber})</option>)}
                    </select>
                </div>
                <div className="flex items-end text-xs text-slate-400 italic">
                    <Filter size={14} className="mr-1" /> फिल्टर गरी रिपोर्ट हेर्नुहोस्
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8" ref={componentRef}>
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 font-nepali">५. महिला सामुदायिक स्वास्थ्य स्वयं सेविका कार्यक्रम</h1>
                    <div className="flex justify-center gap-8 text-sm font-nepali text-slate-600">
                        <span>आर्थिक वर्ष: {selectedFiscalYear}</span>
                        <span>महिना: {selectedMonth === 'all' ? 'सबै' : MONTHS.find(m => m.id === selectedMonth)?.name}</span>
                        <span>स्वयंसेविका: {selectedFchvId === 'all' ? 'सबै संकलित' : fchvs.find(f => f.id === selectedFchvId)?.name}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1 */}
                    <div className="space-y-6">
                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-300">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali border-r">सुरक्षित मातृत्व/ परिवार नियोजन कार्यक्रम</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali border-r text-center w-16">इकाई</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali text-center w-16">संख्या</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <TableRow label="आमा समुहको बैठक बसेको" value={compiledData.safeMotherhood.amaGroupMeeting} unit="पटक" />
                                    <TableRow label="गर्भवती महिलालाई भेट गरेको" value={compiledData.safeMotherhood.pregnantMet} unit="जना" />
                                    <TableRow label="गर्भवती महिलालाई आईरन चक्की वितरण" value={compiledData.safeMotherhood.ironDistribution} unit="जना" />
                                    <tr className="bg-slate-50/50"><td colSpan={3} className="px-4 py-1 text-[10px] font-bold text-indigo-600 border-b uppercase">घरमा प्रसूति</td></tr>
                                    <TableRow label="मातृ सुरक्षा चक्की खाएको सुनिश्चित" value={compiledData.safeMotherhood.homeDelivery.misoprostolEnsured} unit="जना" />
                                    <TableRow label="जीवित जन्म भएका शिशु" value={compiledData.safeMotherhood.homeDelivery.liveBirth} unit="जना" />
                                    <TableRow label="मृत जन्म भएका शिशु" value={compiledData.safeMotherhood.homeDelivery.stillBirth} unit="जना" />
                                    <TableRow label="निसास्सीएको नवजात शिशुको व्यवस्थापन" value={compiledData.safeMotherhood.homeDelivery.asphyxiaManagement} unit="जना" />
                                    <TableRow label="जन्मने बित्तिकै आमाको छातीसंग टासेर राखेको" value={compiledData.safeMotherhood.homeDelivery.skinToSkin} unit="जना" />
                                    <TableRow label="नाभीमा नाभिमलम लगाइएका शिशु" value={compiledData.safeMotherhood.homeDelivery.chlorhexidine} unit="जना" />
                                    <TableRow label="जन्मेको १ घण्टाभित्र स्तनपान गराएको" value={compiledData.safeMotherhood.homeDelivery.breastfeeding1Hr} unit="जना" />
                                    <TableRow label="कम जन्म तौल भएका शिशु (१.५-२.५ के.जी.)" value={compiledData.safeMotherhood.homeDelivery.lowBirthWeight} unit="जना" />
                                    <TableRow label="धेरै कम जन्म तौल भएका शिशु (<१.५ के.जी.)" value={compiledData.safeMotherhood.homeDelivery.veryLowBirthWeight} unit="जना" />
                                    <tr className="bg-slate-50/50"><td colSpan={3} className="px-4 py-1 text-[10px] font-bold text-slate-500 border-b uppercase">नवजात शिशु र सुत्केरी महिलालाई जाँच भेट:</td></tr>
                                    <TableRow label="जन्मेको २४ घण्टा भित्र" value={compiledData.safeMotherhood.homeDelivery.checkup24Hr} unit="जना" />
                                    <TableRow label="जन्मेको तेस्रो दिन" value={compiledData.safeMotherhood.homeDelivery.checkup3rdDay} unit="जना" />
                                    <TableRow label="जन्मेको सातौ दिन" value={compiledData.safeMotherhood.homeDelivery.checkup7thDay} unit="जना" />
                                    <TableRow label="भिटामिन ए वितरण गरिएका सुत्केरी महिला" value={compiledData.safeMotherhood.vitADistributionPostnatal} unit="जना" />
                                    <TableRow label="कण्डम वितरण गरेको" value={compiledData.safeMotherhood.condomDistribution} unit="गोटा" />
                                    <TableRow label="पिल्स वितरण गरेको" value={compiledData.safeMotherhood.pillsDistribution} unit="साईकल" />
                                    <TableRow label="आकस्मिक गर्भनिरोधक चक्की वितरण डोज" value={compiledData.safeMotherhood.ecpDose} unit="डोज" />
                                    <TableRow label="आकस्मिक गर्भनिरोधक चक्की महिला संख्या" value={compiledData.safeMotherhood.ecpWomen} unit="जना" />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-6">
                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-300">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali border-r">मातृ मृत्यु (स्वास्थ्य संस्था बाहेक)</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali text-center w-16">संख्या</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">गर्भावस्था</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.maternalDeath.pregnancy}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">प्रसुती अवस्था</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.maternalDeath.delivery}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">सुत्केरी अवस्था</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.maternalDeath.postnatal}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-300">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali border-r">नवशिशु तथा बालरोगको एकीकृत व्यवस्थापन (IMNCI)</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali text-center w-16">संख्या</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-slate-50/50"><td colSpan={2} className="px-4 py-1 text-[10px] font-bold text-sky-600 border-b uppercase">२ महिना भन्दा कम (उमेर)</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">≤ २८ दिन</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.under2Months.u28Days}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">२९-५९ दिन</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.under2Months.d29_59Days}</td></tr>
                                    <tr className="bg-slate-50/50"><td colSpan={2} className="px-4 py-1 text-[10px] font-bold text-sky-600 border-b uppercase">२-५९ महिना</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">स्वासप्रस्वास रोगका जम्मा बिरामी</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.m2_59Months.respiratoryTotal}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">निमोनिया नभएका बिरामी</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.m2_59Months.noPneumonia}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">झाडापखाला भएका बिरामी</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.m2_59Months.diarrhea}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">ओ.आर.एस. र जिंक चक्कीबाट उपचार</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.m2_59Months.treatedOrsZinc}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">ओ.आर.एस. खर्च (पुरिया)</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.m2_59Months.orsUsed}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">जिंक चक्की खर्च (चक्की)</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.m2_59Months.zincUsed}</td></tr>
                                    <tr className="bg-slate-50/50"><td colSpan={2} className="px-4 py-1 text-[10px] font-bold text-rose-600 border-b uppercase text-right">मृत्यु</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">०-७ दिन</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.death.d0_7Days}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">८-२८ दिन</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.death.d8_28Days}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">२९-५९ दिन</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.death.d29_59Days}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">२-११ महिना</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.death.m2_11Months}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">१२-५९ महिना</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imnci.death.m12_59Months}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-300">
                                    <tr>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali border-r">शिघ्र कुपोषणको एकीकृत व्यवस्थापन (IMAM)</th>
                                        <th className="px-4 py-2 text-xs font-bold text-slate-600 font-nepali text-center w-16">संख्या</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-slate-50/50"><td colSpan={2} className="px-4 py-1 text-[10px] font-bold text-green-600 border-b uppercase">एम.यु.ए.सी. छनौट</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">हरियो (ह्रष्टपुष्ट)</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.muac.green}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">पहेलो (मध्यम शिघ्र कुपोषण)</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.muac.yellow}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">रातो (कडा शिघ्र कुपोषण)</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.muac.red}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">फुकेनास</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.muac.edema}</td></tr>
                                    <tr className="bg-slate-50/50"><td colSpan={2} className="px-4 py-1 text-[10px] font-bold text-green-600 border-b uppercase">घरधुरी भेट र आनुगमन</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">रातो: उपचार पछि निको भएको</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.followUp.recoveredSAM}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">रातो: उपचार गर्दा गर्दै तौल वृद्धि नभएको</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.followUp.noWeightGainSAM}</td></tr>
                                    <tr className="border-b"><td className="px-4 py-2 text-sm font-nepali border-r">रातो: उपचार गर्दा गर्दै स्वास्थ्य संस्था जान छाडेको</td><td className="px-4 py-2 text-sm font-bold text-center">{compiledData.imam.followUp.droppedOutSAM}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
