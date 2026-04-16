import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ServiceSeekerRecord, OrganizationSettings, OPDRecord, CBIMNCIRecord } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface PrescriptionPrintProps {
  record: ServiceSeekerRecord;
  generalSettings: OrganizationSettings;
  opdRecord?: OPDRecord;
  cbimnciRecord?: CBIMNCIRecord;
}

export const PrescriptionPrint: React.FC<PrescriptionPrintProps> = ({ record, generalSettings, opdRecord, cbimnciRecord }) => {
  const stickerData = `ID: ${record.uniquePatientId}\nName: ${record.name}\nReg: ${record.registrationNumber}`;
  
  const recordData = opdRecord || cbimnciRecord;

  return (
    <div className="prescription-print" style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '5mm', 
      fontFamily: 'serif',
      fontSize: '10pt',
      boxSizing: 'border-box',
      border: '1px solid #000'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
        <img src={generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'} style={{ width: '80px', height: '80px' }} alt="Logo" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '16pt' }}>{generalSettings?.orgNameNepali || 'आधारभूत नगर अस्पताल बेल्टार'}</h1>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali || 'उदयपुर, कोशी प्रदेश'}</p>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali2 || ''}</p>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali3 || ''}</p>
          <div style={{ fontWeight: 'bold', border: '1px solid #000', display: 'inline-block', padding: '2px 10px', borderRadius: '15px', marginTop: '5px' }}>स्वास्थ्य सेवा कार्ड</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>PAN No.: {generalSettings?.panNo || 'N/A'}</div>
          <div>HMIS1.2:</div>
          <div>Health Service Card</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', marginTop: '5px' }}>मिति : {(() => {
        const dateStr = recordData?.visitDate || new NepaliDate().format('YYYY-MM-DD');
        const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
        return dateStr.replace(/[0-9]/g, (digit) => nepaliDigits[parseInt(digit)]);
      })()}</div>

      {/* Patient Details & Diagnosis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
        <div style={{ borderRight: '1px solid #000', padding: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Name:</strong> {record.name}</div>
            <div><strong>Age/Gender:</strong> {record.age} / {record.gender}</div>
            <div><strong>ID:</strong> {record.uniquePatientId} {record.mulDartaNo && `| Mul Darta No: ${record.mulDartaNo}`}</div>
            <div><strong>Address:</strong> {record.address || 'N/A'}</div>
          </div>
          <div style={{ width: '60px', height: '60px' }}>
            <QRCodeSVG value={stickerData} size={60} />
          </div>
        </div>
        <div style={{ padding: '5px' }}>
          <div>{cbimnciRecord ? 'Classification :-' : 'Provisional/Final Diagnosis :-'}</div>
          <div style={{ minHeight: '40px', fontWeight: 'bold' }}>{recordData?.diagnosis}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div>Wt.: {cbimnciRecord?.assessmentData?.weight ? `${cbimnciRecord.assessmentData.weight} kg` : ''}</div>
            <div>BP: {cbimnciRecord?.assessmentData?.bp || ''}</div>
            <div>Pulse: {cbimnciRecord?.assessmentData?.pulse || ''}</div>
            <div>Temp: {cbimnciRecord?.assessmentData?.temperature ? `${cbimnciRecord.assessmentData.temperature} °C` : ''}</div>
            <div>RR: {cbimnciRecord?.assessmentData?.breathingRate ? `${cbimnciRecord.assessmentData.breathingRate} bpm` : ''}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', minHeight: '600px' }}>
        {/* Left Column: Investigations */}
        <div style={{ borderRight: '1px solid #000', padding: '5px' }}>
          <div><strong>Blood :-</strong></div>
          {['BS (R/F/PP)', 'GCT/HbA1C', 'CBC/HB/Blood Grouping', 'RFT', 'LFT', 'Lipd Profile', 'TFT Serology', 'ECG', 'ANC Package'].map(item => (
            <div key={item}><input type="checkbox" /> {item}</div>
          ))}
          <div>Others. ...</div>
          <br/>
          <div><strong>Urine and Stool :-</strong></div>
          <div><input type="checkbox" /> Urine RE</div>
          <div><input type="checkbox" /> Stool RE</div>
          <br/>
          <div><strong>Radiology :-</strong></div>
          <div><input type="checkbox" /> X-ray</div>
          <div><input type="checkbox" /> USG</div>
          <br/>
          <div><strong>Other Investigation :-</strong></div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '9pt' }}>{recordData?.investigation}</div>
        </div>
        {/* Right Column: C/O and Rx */}
        <div style={{ padding: '5px' }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: '100px' }}>
            <strong>C/O</strong>
            {cbimnciRecord && (
              <div style={{ fontSize: '9pt', marginBottom: '5px', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>
                <strong>Assessment ({cbimnciRecord.moduleType}):</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {cbimnciRecord.moduleType === 'Infant' ? (
                    <>
                      <div>Danger: {cbimnciRecord.assessmentData.dangerSigns?.join(', ') || 'None'}</div>
                      <div>Infection: {cbimnciRecord.assessmentData.localInfection?.join(', ') || 'None'}</div>
                      <div>Jaundice: {cbimnciRecord.assessmentData.jaundiceSigns?.join(', ') || 'None'}</div>
                      <div>Feeding: {cbimnciRecord.assessmentData.feedingProblems?.join(', ') || 'Normal'}</div>
                    </>
                  ) : (
                    <>
                      <div>Danger: {cbimnciRecord.assessmentData.generalDangerSigns?.join(', ') || 'None'}</div>
                      <div>Cough: {cbimnciRecord.assessmentData.coughDays || '0'} days</div>
                      <div>Fever: {cbimnciRecord.assessmentData.feverDays || '0'} days</div>
                      <div>Diarrhea: {cbimnciRecord.assessmentData.diarrheaDays || '0'} days</div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px' }}>{recordData?.chiefComplaints}</div>
          </div>
          <div style={{ minHeight: '400px' }}>
            <strong>Rx</strong>
            <div style={{ marginTop: '10px' }}>
              {recordData?.prescriptions?.map((p, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold' }}>{i + 1}. {p.medicineName} {p.dosage}</div>
                  <div style={{ marginLeft: '15px', fontSize: '9pt' }}>
                    {p.frequency} x {p.duration} {p.instructions && `(${p.instructions})`}
                  </div>
                </div>
              ))}
            </div>
            {recordData?.advice && (
              <div style={{ marginTop: '20px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
                <strong>Advice:</strong>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '9pt' }}>{recordData.advice}</div>
              </div>
            )}
            {recordData?.nextVisitDate && (
              <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
                Next Visit: {recordData.nextVisitDate}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CBIMNCI Specific Charts */}
      {cbimnciRecord && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #000', paddingTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ border: '1px solid #ccc', padding: '5px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9pt', borderBottom: '1px solid #ccc', marginBottom: '5px' }}>Growth Monitoring Chart</div>
              <img 
                src={record.gender === 'Male' ? 'https://raw.githubusercontent.com/swastikkhatiwada/imnci-assets/main/growth-chart-boy.png' : 'https://raw.githubusercontent.com/swastikkhatiwada/imnci-assets/main/growth-chart-girl.png'}
                alt="Growth Chart" 
                style={{ width: '100%', height: 'auto' }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div style={{ border: '1px solid #ccc', padding: '5px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '9pt', borderBottom: '1px solid #ccc', marginBottom: '5px' }}>Feeding Chart</div>
              <img 
                src="https://raw.githubusercontent.com/swastikkhatiwada/imnci-assets/main/feeding-chart.png" 
                alt="Feeding Chart" 
                style={{ width: '100%', height: 'auto' }}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #000', fontSize: '9pt' }}>
        <div>कार्यालय सम्पर्क : {generalSettings?.phone || 'N/A'} | एम्बुलेन्स सेवा : {generalSettings?.ambulancePhone || 'N/A'}</div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', padding: '2px' }}>उपलब्ध सेवाहरु</div>
        <div>{generalSettings?.availableServices?.join(' | ') || ''}</div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', padding: '2px' }}>हरेक पटक आउँदा यो पुर्जा अनिवार्य रुपमा लिई आउनु होला |</div>
      </div>
    </div>
  );
};
