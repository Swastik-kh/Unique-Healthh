import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ServiceSeekerRecord } from '../types/coreTypes';

interface PatientStickerProps {
  record: ServiceSeekerRecord;
}

export const PatientSticker: React.FC<PatientStickerProps> = ({ record }) => {
  const stickerData = `ID: ${record.uniquePatientId}\nName: ${record.name}\nAge: ${record.age}\nGender: ${record.gender}`;

  return (
    <div className="sticker-print" style={{ 
      width: '4in', 
      height: '2in', 
      padding: '0.1in', 
      border: '1px solid #000', 
      display: 'flex', 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: '0.1in', 
      fontSize: '12px', 
      fontFamily: 'sans-serif',
      pageBreakAfter: 'always'
    }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{record.name}</h3>
        <p style={{ margin: '2px 0' }}><strong>ID:</strong> {record.uniquePatientId}</p>
        <p style={{ margin: '2px 0' }}><strong>Reg No:</strong> {record.registrationNumber}</p>
        <p style={{ margin: '2px 0' }}><strong>Age/Gender:</strong> {record.age} / {record.gender}</p>
        <p style={{ margin: '2px 0' }}><strong>Date:</strong> {(() => {
          const dateStr = record.date || '';
          const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
          return dateStr.replace(/[0-9]/g, (digit) => nepaliDigits[parseInt(digit)]);
        })()}</p>
      </div>
      <div style={{ width: '1.5in', height: '1.5in' }}>
        <QRCodeSVG value={stickerData} size={100} />
      </div>
    </div>
  );
};
