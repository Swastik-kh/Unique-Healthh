export interface VitaminATarget {
    fiscalYear: string;
    target6to11Months: number;
    target12to23Months: number;
    target24to59Months: number;
}

export interface FCHV {
    id: string;
    name: string;
    wardNumber: string;
}

export interface ProgramDate {
    round: '1st' | '2nd';
    startDate: string;
    endDate: string;
}

export interface VitaminATarget {
    fiscalYear: string;
    target6to11Months: number;
    target12to23Months: number;
    target24to59Months: number;
}

export interface FCHV {
    id: string;
    name: string;
    wardNumber: string;
}

export interface ProgramDate {
    round: '1st' | '2nd';
    startDate: string;
    endDate: string;
}

export interface AgeGroupData {
    maleVitaminA: number;
    femaleVitaminA: number;
    totalVitaminA: number;
    maleAlbendazole: number;
    femaleAlbendazole: number;
    totalAlbendazole: number;
    muacGreen: number;
    muacYellow: number;
    muacRed: number;
}

export interface VitaminADistributionRecord {
    id: string;
    date: string;
    fiscalYear: string;
    round: '1st' | '2nd';
    fchvId: string;
    data: {
        '6-11months': AgeGroupData;
        '12-23months': AgeGroupData;
        '24-59months': AgeGroupData;
    };
}
