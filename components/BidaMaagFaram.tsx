import React from 'react';
import { LeaveApplication, User, OrganizationSettings } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface BidaMaagFaramProps {
  application: LeaveApplication;
  currentUser: User | null;
  accumulatedLeave?: {
    casual: number;
    sick: number;
    festival: number;
    home: number;
    other: number;
    maternity?: number;
    kiriya?: number;
    study?: number;
    extraordinary?: number;
  };
  organizationName?: string;
  generalSettings?: OrganizationSettings;
}

export const BidaMaagFaram: React.FC<BidaMaagFaramProps> = ({ 
  application, 
  currentUser, 
  accumulatedLeave = { casual: 6, sick: 12, festival: 6, home: 30, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0 },
  organizationName = 'नेपाल सरकार',
  generalSettings
}) => {
  
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const toNepaliDigits = (num: string | number) => {
    if (num === undefined || num === null || num === '') return '';
    return num.toString().split('').map(digit => {
      const d = parseInt(digit);
      return isNaN(d) ? digit : nepaliDigits[d];
    }).join('');
  };

  const leaveTypes = [
    { id: 'casual_festival', label: 'भैपरी आउने र पर्व बिदा', key: 'casual_festival' },
    { id: 'home', label: 'घर बिदा', key: 'home' },
    { id: 'sick', label: 'बिरामी बिदा', key: 'sick' },
    { id: 'maternity', label: 'प्रसुति बिदा', key: 'maternity' },
    { id: 'mourning', label: 'किरिया बिदा', key: 'kiriya' },
    { id: 'study', label: 'अध्ययन बिदा', key: 'study' },
    { id: 'extraordinary', label: 'असाधारण बिदा', key: 'extraordinary' },
    { id: 'other', label: 'अन्य बिदा', key: 'other' },
  ];

  // Helper to calculate duration
  const calculateDuration = (start: string, end: string) => {
    try {
        const d1 = new Date(new NepaliDate(start).toJsDate());
        const d2 = new Date(new NepaliDate(end).toJsDate());
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        return diffDays;
    } catch (e) {
        return '-';
    }
  };

  const duration = calculateDuration(application.startDate, application.endDate);

  // Helper to calculate reporting date (next day after end date)
  const getReportingDate = (endDate: string) => {
    try {
      const end = new NepaliDate(endDate);
      // Add 1 day
      const nextDay = new Date(end.toJsDate().getTime() + 24 * 60 * 60 * 1000);
      return new NepaliDate(nextDay).format('YYYY-MM-DD');
    } catch (e) {
      return '-';
    }
  };

  const reportingDate = getReportingDate(application.endDate);

  // Helper to map leave type to Nepali
  const getNepaliLeaveType = (type: string) => {
    if (type === 'Casual & Festival') return 'भैपरी आउने र पर्व बिदा';
    if (type === 'Sick') return 'बिरामी बिदा';
    if (type === 'Home') return 'घर बिदा';
    if (type === 'Maternity') return 'प्रसुति बिदा';
    if (type === 'Kiriya') return 'किरिया बिदा';
    if (type === 'Study') return 'अध्ययन बिदा';
    if (type === 'Extraordinary') return 'असाधारण बिदा';
    if (type === 'Other') return 'अन्य बिदा';
    return type;
  };

  // Helper to check if a leave type matches the application
  const isSelected = (label: string) => {
    if (application.leaveType === 'Casual & Festival' && label.includes('भैपरी')) return true;
    if (application.leaveType === 'Sick' && label.includes('बिरामी')) return true;
    if (application.leaveType === 'Home' && label.includes('घर')) return true;
    if (application.leaveType === 'Maternity' && label.includes('प्रसुति')) return true;
    if (application.leaveType === 'Kiriya' && label.includes('किरिया')) return true;
    if (application.leaveType === 'Study' && label.includes('अध्ययन')) return true;
    if (application.leaveType === 'Extraordinary' && label.includes('असाधारण')) return true;
    if (application.leaveType === 'Other' && label.includes('अन्य')) return true;
    return false;
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto font-nepali text-slate-900 text-sm print:p-0">
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold border-b-2 border-black inline-block pb-1 mb-1">बिदाको माग फारम</h1>
        <p className="text-sm font-medium">कर्मचारीले प्रयोग गर्ने</p>
      </div>

      {/* Section 1: Employee Details */}
      <div className="border-2 border-black mb-1">
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-2 border-r border-black flex">
            <span className="font-bold w-12">नाम:</span>
            <span>{application.employeeName}</span>
          </div>
          <div className="p-2 flex">
            <span className="font-bold w-24">मन्त्रालय/ विभाग:</span>
            <span>{generalSettings?.orgNameNepali || organizationName}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-2 border-r border-black flex">
            <span className="font-bold w-12">पद:</span>
            <span>{application.designation}</span>
          </div>
          <div className="p-2 flex">
            <span className="font-bold w-24">कार्यालय:</span>
            <span>{generalSettings?.subTitleNepali3 || organizationName}</span>
          </div>
        </div>

        {/* Leave Types Table */}
        <div className="grid grid-cols-12 border-b border-black text-center font-bold bg-slate-50">
          <div className="col-span-1 p-2 border-r border-black">चिन्ह लगाउने</div>
          <div className="col-span-4 p-2 border-r border-black">मागेको बिदाको किसिम</div>
          <div className="col-span-3 p-2 border-r border-black">बिदाको अवधि</div>
          <div className="col-span-4 p-2">कारण</div>
        </div>

        {leaveTypes.map((type, index) => {
          const selected = isSelected(type.label);
          return (
            <div key={type.id} className="grid grid-cols-12 border-b border-black text-center items-stretch">
              <div className="col-span-1 p-1 border-r border-black flex items-center justify-center">
                {selected ? '✓' : ''}
              </div>
              <div className="col-span-4 p-1 border-r border-black text-left pl-2 flex items-center">
                {toNepaliDigits(index + 1)}. {type.label}
              </div>
              {/* Merge cells for Duration and Reason for the first row, or repeat empty for others? 
                  The image shows empty rows. We'll fill the first selected row or just the first row if we want to mimic the form exactly.
                  Actually, the image implies these are input fields. Since this is a view, we should show the data where appropriate.
                  We'll put the data in the row corresponding to the selected leave type.
              */}
              <div className="col-span-3 p-1 border-r border-black flex items-center justify-center">
                {selected ? `${toNepaliDigits(duration)} दिन` : ''}
              </div>
              <div className="col-span-4 p-1 flex items-center justify-center text-left text-xs">
                {selected ? application.reason : ''}
              </div>
            </div>
          );
        })}
        
        {/* Signature Row (Merged with last few rows in image, but we'll add it at bottom of this section) */}
        <div className="grid grid-cols-12 border-b border-black">
           <div className="col-span-8 p-2 border-r border-black text-right font-bold">कर्मचारी दस्तखत</div>
           <div className="col-span-4 p-2"></div>
        </div>

        <div className="grid grid-cols-2">
           <div className="p-2 border-r border-black">
             <span className="font-bold">बिदाको मिति:</span> {toNepaliDigits(application.appliedDate)}
           </div>
           <div className="grid grid-cols-2">
             <div className="p-2 border-r border-black">
               <span className="font-bold">देखि:</span> {toNepaliDigits(application.startDate)}
             </div>
             <div className="p-2">
               <span className="font-bold">सम्म:</span> {toNepaliDigits(application.endDate)}
             </div>
           </div>
        </div>
      </div>

      {/* Section 2: Personnel Administration */}
      <div className="border-2 border-black border-t-0 mb-1">
        <div className="text-center font-bold border-b border-black p-1 bg-slate-50">
          कर्मचारी प्रशासन शाखाले प्रयोग गर्ने
        </div>
        <div className="grid grid-cols-4 border-b border-black text-center font-bold text-xs">
          <div className="p-2 border-r border-black">बिदाको किसिम</div>
          <div className="p-2 border-r border-black">अघिको बाँकी</div>
          <div className="p-2 border-r border-black">हाल मागेको</div>
          <div className="p-2">अब रहन आउने</div>
        </div>

        {leaveTypes.map((type, index) => {
           let currentDbBalance = 0;
           if (type.key === 'casual_festival') {
             currentDbBalance = (accumulatedLeave.casual || 0) + (accumulatedLeave.festival || 0);
           } else {
             // @ts-ignore
             currentDbBalance = accumulatedLeave[type.key] || 0;
           }

           const selected = isSelected(type.label);
           const requestedDays = (selected && typeof duration === 'number') ? duration : 0;
           
           let previousBalance = currentDbBalance;
           let remainingBalance = currentDbBalance;

           if (selected) {
               if (application.status === 'Approved') {
                   // DB balance is already deducted
                   previousBalance = currentDbBalance + requestedDays;
                   remainingBalance = currentDbBalance;
               } else if (application.status === 'Rejected') {
                   // DB balance is NOT deducted
                   previousBalance = currentDbBalance;
                   remainingBalance = currentDbBalance; // Should not decrease
               } else {
                   // Pending
                   previousBalance = currentDbBalance;
                   remainingBalance = currentDbBalance - requestedDays;
               }
           }

           return (
            <div key={type.id} className="grid grid-cols-4 border-b border-black text-center text-xs">
              <div className="p-1 border-r border-black text-left pl-2">
                {toNepaliDigits(index + 1)}. {type.label}
              </div>
              <div className="p-1 border-r border-black">{toNepaliDigits(previousBalance)}</div>
              <div className="p-1 border-r border-black">{selected ? toNepaliDigits(duration) : ''}</div>
              <div className="p-1">{toNepaliDigits(remainingBalance)}</div>
            </div>
           );
        })}

        <div className="p-4">
          <div className="border-t border-dotted border-black w-1/3 ml-auto mt-8 text-center pt-1">
            कर्मचारी प्रशासन शाखा
          </div>
        </div>
      </div>

      {/* Section 3: Recommendation & Approval */}
      <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
        <div>
          <div className="flex items-center gap-4 mb-2">
             <label className="flex items-center gap-1">
               <input type="checkbox" disabled /> सिफारिस भएको
             </label>
             <label className="flex items-center gap-1">
               <input type="checkbox" disabled /> सिफारिस नभएको
             </label>
          </div>
          <div className="mb-8">
            बिदा सकिने मिति: {toNepaliDigits(application.endDate)}
          </div>
          <div className="border-t border-dotted border-black w-2/3 pt-1 text-center">
            निकटतम माथिल्लो अधिकृत
          </div>
          <div className="mt-2">मिति: </div>
        </div>

        <div>
          <div className="mb-2">कुनै कुरा भए जनाउने:-</div>
          <div className="flex items-center gap-4 mb-2">
             <label className="flex items-center gap-1">
               <input type="checkbox" checked={application.status === 'Approved'} readOnly /> स्वीकृत
             </label>
             <label className="flex items-center gap-1">
               <input type="checkbox" checked={application.status === 'Rejected'} readOnly /> अस्वीकृत
             </label>
          </div>
          <div className="mb-8">
            {application.status !== 'Rejected' && (
              <>बिदा सकिने मिति: {toNepaliDigits(application.endDate)}</>
            )}
          </div>
          <div className="border-t border-dotted border-black w-2/3 pt-1 text-center">
            {application.status === 'Rejected' ? 'अस्वीकृत गर्ने अधिकृत' : 'स्वीकृति दिने अधिकृत'}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1">
            <div className="font-bold">{application.approvedBy || ''}</div>
            <div>पद: {application.approverDesignation || ''}</div>
            <div>मिति: {toNepaliDigits(application.approvalDate || '')}</div>
          </div>
        </div>
      </div>

      {/* Section 4: Notice */}
      <div className="border-2 border-black mt-6 p-2">
        <div className="text-center font-bold border-b border-black pb-1 mb-2">
          कर्मचारीको जानकारीको निमित्त<br/>
          {generalSettings?.orgNameNepali || 'नेपाल सरकार'}
        </div>
        <div className="text-center border-b border-dotted border-black pb-2 mb-2">
          ...................................................................................................<br/>
          बिदा स्वीकृतिको सूचना
        </div>
        
        <div className="flex justify-between mb-2">
          <span>प.स.</span>
          <span>मिति: {toNepaliDigits(application.approvalDate || new NepaliDate().format('YYYY-MM-DD'))}</span>
        </div>
        <div className="mb-2">
          श्री {application.employeeName}
        </div>

        <div className="border border-black">
          <div className="grid grid-cols-4 border-b border-black text-center font-bold text-xs bg-slate-50">
            <div className="p-1 border-r border-black">बिदाको किसिम</div>
            <div className="p-1 border-r border-black">अवधि</div>
            <div className="p-1 border-r border-black">शुरु हुने मिति</div>
            <div className="p-1">कार्यालयमा हाजिर हुने मिति</div>
          </div>
          <div className="grid grid-cols-4 text-center text-xs">
            <div className="p-1 border-r border-black">{application.status === 'Rejected' ? '' : getNepaliLeaveType(application.leaveType)}</div>
            <div className="p-1 border-r border-black">{application.status === 'Rejected' ? '' : `${toNepaliDigits(duration)} दिन`}</div>
            <div className="p-1 border-r border-black">{application.status === 'Rejected' ? '' : toNepaliDigits(application.startDate)}</div>
            <div className="p-1">{application.status === 'Rejected' ? '' : toNepaliDigits(reportingDate)}</div>
          </div>
        </div>

        <div className="mt-8 text-right">
          <div className="inline-block text-center">
            <div className="border-t border-dotted border-black w-40 pt-1">
              सूचना गर्ने कर्मचारीको दस्तखत
            </div>
            <div className="text-xs">कर्मचारी प्रशासन शाखा</div>
          </div>
        </div>
      </div>

    </div>
  );
};
