import { AmbulanceRecord } from '../types';

export interface DriverIncentiveResult {
  matchedTrips: AmbulanceRecord[];
  tripCount: number;
  totalFare: number;
  incentiveAmount: number;
}

/**
 * EXACTLY ONE single source of truth for ambulance driver incentive calculation across:
 * 1) LabBillingReport.tsx
 * 2) AmbulanceProtsahanBharpaiModal.tsx
 * 3) TalabiBharpai.tsx
 */
export function getDriverMonthlyIncentive(
  ambulanceRecords: AmbulanceRecord[],
  driverName: string,
  fiscalYear: string,
  monthCode: string, // '01'..'12'
  incentivePercent: number
): DriverIncentiveResult {
  const normName = (driverName || '').trim().toLowerCase();
  const normFy = (fiscalYear || '').trim();
  const targetMonth = parseInt(monthCode, 10);

  const matchedTrips = (ambulanceRecords || []).filter(r => {
    if (!r) return false;
    if ((r.fiscalYear || '').trim() !== normFy) return false;
    if ((r.driverName || '').trim().toLowerCase() !== normName) return false; // EXACT match, कहिल्यै .includes() होइन

    const dateStr = r.dateBs || '';
    const parts = dateStr.split(/[-/]/); // dash AND slash दुवै समात्ने
    if (parts.length < 2) return false;
    const recordMonth = parseInt(parts[1], 10);
    return recordMonth === targetMonth;
  });

  const totalFare = matchedTrips.reduce((sum, t) => sum + (Number(t.receivedAmount) || 0), 0);
  const percent = incentivePercent > 0 ? incentivePercent : 15;
  const incentiveAmount = Math.round(totalFare * (percent / 100));

  return { matchedTrips, tripCount: matchedTrips.length, totalFare, incentiveAmount };
}

/**
 * Strict Role Gating: चालक-मात्र
 */
export function isAmbulanceDriver(designation?: string, employeeName?: string): boolean {
  const d = (designation || '').toLowerCase();
  const n = (employeeName || '').toLowerCase();
  return (
    d.includes('चालक') ||
    d.includes('driver') ||
    d.includes('एम्बुलेन्स') ||
    n.includes('चालक') ||
    n.includes('driver')
  );
}
