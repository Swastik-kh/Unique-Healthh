export interface FCHVReport {
    id?: string;
    fchvId: string;
    fiscalYear: string;
    month: string;
    createdAt: number;
    updatedAt: number;
    
    // सुरक्षित मातृत्व/ परिवार नियोजन कार्यक्रम
    safeMotherhood: {
        amaGroupMeeting: number;
        pregnantMet: number;
        ironDistribution: number;
        homeDelivery: {
            misoprostolEnsured: number;
            liveBirth: number;
            stillBirth: number;
            asphyxiaManagement: number;
            skinToSkin: number;
            chlorhexidine: number;
            breastfeeding1Hr: number;
            lowBirthWeight: number;
            veryLowBirthWeight: number;
            checkup24Hr: number;
            checkup3rdDay: number;
            checkup7thDay: number;
        };
        vitADistributionPostnatal: number;
        condomDistribution: number;
        pillsDistribution: number;
        ecpDose: number;
        ecpWomen: number;
    };

    // मातृ मृत्यु (स्वास्थ्य संस्था बाहेक)
    maternalDeath: {
        pregnancy: number;
        delivery: number;
        postnatal: number;
    };

    // नवशिशु तथा बालरोगको एकीकृत व्यवस्थापन (IMNCI)
    imnci: {
        under2Months: {
            u28Days: number;
            d29_59Days: number;
        };
        m2_59Months: {
            respiratoryTotal: number;
            noPneumonia: number;
            diarrhea: number;
            treatedOrsZinc: number;
            orsUsed: number;
            zincUsed: number;
        };
        death: {
            d0_7Days: number;
            d8_28Days: number;
            d29_59Days: number;
            m2_11Months: number;
            m12_59Months: number;
        };
    };

    // शिघ्र कुपोषणको एकीकृत व्यवस्थापन (IMAM)
    imam: {
        muac: {
            green: number;
            yellow: number;
            red: number;
            edema: number;
        };
        followUp: {
            recoveredSAM: number;
            noWeightGainSAM: number;
            droppedOutSAM: number;
        };
    };
}
