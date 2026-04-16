import React from 'react';
import { ServiceSeekerRecord, OrganizationSettings, OPDRecord } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MedicineSlipPrintProps {
  record: ServiceSeekerRecord;
  generalSettings: OrganizationSettings;
  opdRecord: OPDRecord;
}

export const MedicineSlipPrint: React.FC<MedicineSlipPrintProps> = ({ record, generalSettings, opdRecord }) => {
  return (
    <div className="medicine-slip-print" style={{ 
      width: '148mm', 
      minHeight: '210mm', 
      padding: '10mm', 
      fontFamily: 'serif',
      fontSize: '11pt',
      boxSizing: 'border-box',
      backgroundColor: '#fff',
      color: '#000'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '18pt' }}>{generalSettings?.orgNameNepali || 'आधारभूत नगर अस्पताल बेल्टार'}</h1>
        <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali || 'उदयपुर, कोशी प्रदेश'}</p>
        <div style={{ fontWeight: 'bold', fontSize: '14pt', marginTop: '10px', textDecoration: 'underline' }}>औषधि सिफारिस पुर्जा (Medicine Recommendation)</div>
      </div>

      {/* Patient Info */}
      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
        <div><strong>Name:</strong> {record.name}</div>
        <div><strong>ID:</strong> {record.uniquePatientId}</div>
        <div><strong>Age/Sex:</strong> {record.age} / {record.gender}</div>
        <div><strong>Date:</strong> {opdRecord.visitDate}</div>
        <div style={{ gridColumn: 'span 2' }}><strong>Address:</strong> {record.address}</div>
      </div>

      {/* Prescription */}
      <div style={{ minHeight: '400px' }}>
        <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '5px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '24pt', marginRight: '10px' }}>Rx</span> Prescription
        </h3>
        <div style={{ marginTop: '20px' }}>
          {opdRecord.prescriptions && opdRecord.prescriptions.length > 0 ? (
            opdRecord.prescriptions.map((p, i) => (
              <div key={i} style={{ marginBottom: '15px', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>{i + 1}. {p.medicineName} {p.dosage}</div>
                <div style={{ marginLeft: '30px', marginTop: '5px' }}>
                  <span style={{ background: '#f9f9f9', padding: '2px 8px', borderRadius: '4px' }}>{p.frequency}</span> 
                  <span style={{ margin: '0 10px' }}>x</span> 
                  <span style={{ fontWeight: 'bold' }}>{p.duration}</span>
                  {p.instructions && <div style={{ fontSize: '10pt', color: '#555', marginTop: '3px' }}>Note: {p.instructions}</div>}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontStyle: 'italic', color: '#888' }}>No medicines prescribed.</div>
          )}
        </div>
        
        {opdRecord.advice && (
          <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <strong>Advice / सल्लाह:</strong>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '5px', fontSize: '10pt' }}>{opdRecord.advice}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '8pt', color: '#888' }}>
          Printed on: {new Date().toLocaleString()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', width: '180px', marginTop: '40px' }}></div>
          <div style={{ fontWeight: 'bold', marginTop: '5px' }}>चिकित्सकको हस्ताक्षर</div>
          <div style={{ fontSize: '9pt' }}>(Doctor's Signature)</div>
        </div>
      </div>
    </div>
  );
};
