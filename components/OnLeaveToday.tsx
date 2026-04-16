import React from 'react';
import { User, LeaveApplication } from '../types/coreTypes';
import { User as UserIcon, Calendar } from 'lucide-react';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface OnLeaveTodayProps {
  users: User[];
  leaveApplications: LeaveApplication[];
}

export const OnLeaveToday: React.FC<OnLeaveTodayProps> = ({ users, leaveApplications }) => {
  const today = new NepaliDate();
  const todayTime = today.toJsDate().getTime();
  
  const onLeaveApplications = leaveApplications.filter(app => {
    if (app.status !== 'Approved') return false;
    try {
      const startDate = new NepaliDate(app.startDate);
      const endDate = new NepaliDate(app.endDate);
      return todayTime >= startDate.toJsDate().getTime() && todayTime <= endDate.toJsDate().getTime();
    } catch (e) {
      return false;
    }
  });

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
        <Calendar size={18} className="text-orange-600"/>
        आज बिदामा रहेका कर्मचारीहरू (Employees on Leave Today)
      </h3>
      {onLeaveApplications.length > 0 ? (
        <div className="space-y-3">
          {onLeaveApplications.map(app => {
            const user = users.find(u => u.id === app.userId);
            return (
              <div key={app.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 flex items-center gap-4">
                <div className="bg-slate-200 p-2 rounded-full">
                    <UserIcon size={16} className="text-slate-600" />
                </div>
                <div>
                    <p className="font-bold text-slate-800">{app.employeeName}</p>
                    <p className="text-xs text-slate-500">{user?.designation || app.designation}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">{app.startDate} देखि {app.endDate}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-4">आज कोही पनि बिदामा छैनन्। (No employees are on leave today.)</p>
      )}
    </div>
  );
};
