
import React from 'react';
import { toNepaliNumber } from './nepaliUtils';
import { MonthlySalaryReceipt, SalaryEmployeeItem } from '../types/financeTypes';
import { PrintBharpaiOptions } from './PrintBharpaiOptionsModal';

export const getBharpaiPrintHtml = (
  employeesList: SalaryEmployeeItem[],
  grandTotals: any,
  options: PrintBharpaiOptions,
  monthObj: any,
  selectedFiscalYear: string,
  receiptNumber: string,
  currentReceiptDate: string,
  budgetHeadName: string,
  paymentMethod: string,
  bankName: string,
  chequeOrVoucherNo: string,
  generalSettings: any,
  totalWords: string,
  preparedByName: string,
  preparedByDesignation: string,
  verifiedByName: string,
  verifiedByDesignation: string,
  approvedByName: string,
  approvedByDesignation: string
): string => {
  const logoUrl = generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png';

  // Calculate dynamic colspan based on visible columns
  let allowanceColspan = 0;
  if (options.showDearness) allowanceColspan++;
  if (options.showFestival) allowanceColspan++;
  if (options.showIncentive) allowanceColspan++;
  if (options.showFieldDressMedicalOther) allowanceColspan++;

  let deductionColspan = 0;
  if (options.showPF) deductionColspan++;
  if (options.showCIT) deductionColspan++;
  if (options.showInsurance) deductionColspan++;
  if (options.showTax) deductionColspan++;
  if (options.showDeductionsOther) deductionColspan++;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>मासिक तलबी भरपाई</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        body { font-family: 'Mukta', sans-serif; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #475569; padding: 4px; text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
      </style>
    </head>
    <body>
      <h1>${generalSettings?.orgNameNepali || 'तलब भरपाई'}</h1>
      <table>
        <thead>
          <tr>
            <th rowspan="2">क्र.सं.</th>
            <th rowspan="2">कर्मचारीको नाम</th>
            <th colspan="3">तलब विवरण</th>
            ${allowanceColspan > 0 ? `<th colspan="${allowanceColspan}">भत्ता विवरण</th>` : ''}
            <th rowspan="2">जम्मा पारिश्रमिक</th>
            ${deductionColspan > 0 ? `<th colspan="${deductionColspan}">कट्टी विवरण</th>` : ''}
            <th rowspan="2">जम्मा कट्टी</th>
            <th rowspan="2">पाउने खुद रकम</th>
          </tr>
          <tr>
            <th>सुरु तलब</th><th>ग्रेड</th><th>जम्मा तलब</th>
            ${options.showDearness ? '<th>महङ्गी</th>' : ''}
            ${options.showFestival ? '<th>चाडपर्व</th>' : ''}
            ${options.showIncentive ? '<th>प्रोत्साहन</th>' : ''}
            ${options.showFieldDressMedicalOther ? '<th>अन्य भत्ता</th>' : ''}
            ${options.showPF ? '<th>क.सं.को.</th>' : ''}
            ${options.showCIT ? '<th>ना.ल.को.</th>' : ''}
            ${options.showInsurance ? '<th>बीमा</th>' : ''}
            ${options.showTax ? '<th>कर</th>' : ''}
            ${options.showDeductionsOther ? '<th>अन्य</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${employeesList.map((emp, i) => `
            <tr>
              <td>${toNepaliNumber(i + 1)}</td>
              <td class="text-left">${emp.employeeName}</td>
              <td>${toNepaliNumber(emp.basicScale.toLocaleString())}</td>
              <td>${toNepaliNumber(emp.gradeAmount.toLocaleString())}</td>
              <td>${toNepaliNumber(emp.totalBasicSalary.toLocaleString())}</td>
              ${options.showDearness ? `<td>${toNepaliNumber(emp.dearnessAllowance.toLocaleString())}</td>` : ''}
              ${options.showFestival ? `<td>${toNepaliNumber((emp.festivalAllowance || 0).toLocaleString())}</td>` : ''}
              ${options.showIncentive ? `<td>${toNepaliNumber((emp.incentiveAllowance || 0).toLocaleString())}</td>` : ''}
              ${options.showFieldDressMedicalOther ? `<td>${toNepaliNumber(((emp.fieldAllowance || 0) + (emp.dressAllowance || 0) + (emp.medicalAllowance || 0) + (emp.otherAllowances || 0)).toLocaleString())}</td>` : ''}
              <td class="text-right">${toNepaliNumber(emp.grossSalary.toLocaleString())}</td>
              ${options.showPF ? `<td>${toNepaliNumber(emp.providentFund.toLocaleString())}</td>` : ''}
              ${options.showCIT ? `<td>${toNepaliNumber(emp.citDeduction.toLocaleString())}</td>` : ''}
              ${options.showInsurance ? `<td>${toNepaliNumber(emp.insuranceDeduction.toLocaleString())}</td>` : ''}
              ${options.showTax ? `<td>${toNepaliNumber(emp.taxDeduction.toLocaleString())}</td>` : ''}
              ${options.showDeductionsOther ? `<td>${toNepaliNumber(((emp.loanOrAdvanceDeduction || 0) + (emp.otherDeductions || 0)).toLocaleString())}</td>` : ''}
              <td class="text-right">${toNepaliNumber(emp.totalDeductions.toLocaleString())}</td>
              <td class="text-right">${toNepaliNumber(emp.netPayable.toLocaleString())}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};
