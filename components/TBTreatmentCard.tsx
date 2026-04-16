import React from 'react';
import { Activity } from 'lucide-react';
import { TBPatient } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface TBTreatmentCardProps {
  tbPatientRecord: TBPatient;
}

export const TBTreatmentCard: React.FC<TBTreatmentCardProps> = ({ tbPatientRecord }) => {
  const startDateStr = tbPatientRecord.treatmentStartDate || tbPatientRecord.registrationDate;
  if (!startDateStr) return null;

  const parts = startDateStr.split('-');
  if (parts.length !== 3) return null;
  
  const startYear = parseInt(parts[0]);
  const startMonth = parseInt(parts[1]) - 1; // 0-indexed
  const startDay = parseInt(parts[2]);
  
  const startAdDate = new NepaliDate(startYear, startMonth, startDay).toJsDate();
  const todayAd = new Date();
  todayAd.setHours(0, 0, 0, 0);
  const statusAdDate = tbPatientRecord.statusDateBs ? new NepaliDate(parseInt(tbPatientRecord.statusDateBs.split('-')[0]), parseInt(tbPatientRecord.statusDateBs.split('-')[1]) - 1, parseInt(tbPatientRecord.statusDateBs.split('-')[2])).toJsDate() : null;
  if (statusAdDate) statusAdDate.setHours(0, 0, 0, 0);
  const isStandardRegimen = tbPatientRecord.treatmentType === '2HRZE+4HR' || tbPatientRecord.treatmentType?.includes('6HRZE');
  const is6HRZE = tbPatientRecord.treatmentType?.includes('6HRZE');
  
  const intensiveDays = (is6HRZE ? 180 : 60) + (tbPatientRecord.intensivePhaseExtensionDays || 0);
  const continuationDays = is6HRZE ? 0 : (120 + (tbPatientRecord.continuationPhaseExtensionDays || 0));
  const totalDays = intensiveDays + continuationDays;

  const months = [];
  for (let i = 0; i < 12; i++) {
    let y = startYear;
    let m = startMonth + i;
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    const dateObj = new NepaliDate(y, m, 1);
    
    // Calculate days in month
    let daysInMonth = 30;
    for (let d = 32; d >= 28; d--) {
      const dObj = new NepaliDate(y, m, d);
      if (dObj.getMonth() === m) {
        daysInMonth = d;
        break;
      }
    }
    
    months.push({
      year: y,
      month: m,
      name: dateObj.format('MMMM'),
      daysInMonth
    });
  }

  return (
    <div className="mt-8 bg-white p-6 rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 font-nepali text-lg">क्षयरोग उपचार कार्ड (TB Treatment Card)</h3>
            <p className="text-xs text-slate-500">
              दैनिक औषधि सेवन रेकर्ड (Daily Medicine Intake Record) | उपचार सुरु: {tbPatientRecord.treatmentStartDate}
              {tbPatientRecord.status !== 'Active' && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                  {tbPatientRecord.status} ({tbPatientRecord.statusDateBs})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[9px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary-600 rounded-sm"></div>
            <span>सेवन गरिएको (Taken)</span>
          </div>
          {isStandardRegimen && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm"></div>
                <span>सघन चरण (Intensive: {intensiveDays} Days)</span>
              </div>
              {!is6HRZE && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded-sm"></div>
                  <span>निरन्तर चरण (Continuation: {continuationDays} Days)</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border border-slate-300 rounded-sm"></div>
            <span>बाँकी (Pending)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
            <span>अमान्य/लक (Locked)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9px] border border-slate-300">
          <thead>
            <tr>
              <th className="border border-slate-300 p-1 bg-slate-100 w-24">महिना / गते</th>
              {Array.from({ length: 31 }, (_, i) => (
                <th key={i} className="border border-slate-300 p-1 bg-slate-100 w-6">{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((m, mIdx) => (
              <tr key={mIdx}>
                <td className="border border-slate-300 p-1 font-bold bg-slate-50 text-center">{m.name}</td>
                {Array.from({ length: 31 }, (_, dIdx) => {
                  const day = dIdx + 1;
                  const isValid = day <= m.daysInMonth;
                  const currentNepDate = new NepaliDate(m.year, m.month, day);
                  const currentAdDate = currentNepDate.toJsDate();
                  const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isTaken = tbPatientRecord.dailyDoses?.includes(dateStr);
                  
                  const isBeforeStart = currentAdDate < startAdDate;
                  const isFuture = currentAdDate > todayAd;
                  const isAfterStatusChange = tbPatientRecord.status !== 'Active' && statusAdDate && currentAdDate >= statusAdDate;
                  const diffTime = currentAdDate.getTime() - startAdDate.getTime();
                  const daysFromStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  
                  const isIntensive = isStandardRegimen && daysFromStart >= 1 && daysFromStart <= intensiveDays;
                  const isContinuation = !is6HRZE && isStandardRegimen && daysFromStart > intensiveDays && daysFromStart <= totalDays;

                  let cellClass = "border border-slate-300 p-0 text-center transition-colors ";
                  if (!isValid || isBeforeStart || isFuture || isAfterStatusChange) {
                    cellClass += "bg-slate-300 cursor-not-allowed ";
                  } else {
                    cellClass += "cursor-pointer hover:bg-white/50 ";
                    if (isTaken) {
                      if (isIntensive) {
                        cellClass += "bg-blue-600 text-white ";
                      } else if (isContinuation) {
                        cellClass += "bg-orange-600 text-white ";
                      } else {
                        cellClass += "bg-primary-600 text-white ";
                      }
                    } else {
                      if (isIntensive) {
                        cellClass += "bg-blue-50 ";
                      } else if (isContinuation) {
                        cellClass += "bg-orange-50 ";
                      }
                    }
                  }
                  
                  return (
                    <td 
                      key={dIdx} 
                      className={cellClass}
                    >
                      <div className="w-full h-6 flex items-center justify-center">
                        {isValid && !isBeforeStart && !isFuture ? (isTaken ? '✓' : '') : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
