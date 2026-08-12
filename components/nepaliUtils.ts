export const toNepaliNumber = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = val.toString();
  const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const nepali = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  
  let result = '';
  for (let char of str) {
    const index = english.indexOf(char);
    if (index !== -1) {
      result += nepali[index];
    } else {
      result += char;
    }
  }
  return result;
};

export const matchRegNo = (regNo: string | undefined | null, searchInput: string | undefined | null): boolean => {
  if (!regNo || !searchInput) return false;

  const rawQuery = searchInput.trim();
  if (!rawQuery) return false;

  // Convert Nepali digits to English digits
  const toEng = (s: string) => {
    const nep = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return s.split('').map(c => {
      const idx = nep.indexOf(c);
      return idx !== -1 ? String(idx) : c;
    }).join('');
  };

  const regEng = toEng(regNo).toLowerCase();
  const queryEng = toEng(rawQuery).toLowerCase();

  // Standard substring check
  if (regEng.includes(queryEng)) return true;

  // Remove hyphens/slashes/spaces and check inclusion
  const cleanReg = regEng.replace(/[-/\s]/g, '');
  const cleanQuery = queryEng.replace(/[-/\s]/g, '');
  if (cleanQuery && cleanReg.includes(cleanQuery)) return true;

  // Match numeric parts split by hyphens or slashes
  const parts = regEng.split(/[-/\s]+/);
  for (const part of parts) {
    if (part === queryEng || part === cleanQuery) return true;

    // Compare as integer if both part and cleanQuery are digits
    if (/^\d+$/.test(part) && /^\d+$/.test(cleanQuery)) {
      if (parseInt(part, 10) === parseInt(cleanQuery, 10)) {
        return true;
      }
    }
  }

  // Also match numeric suffix at the end of regNo
  if (/^\d+$/.test(cleanQuery)) {
    const numericMatch = regEng.match(/\d+$/);
    if (numericMatch) {
      if (parseInt(numericMatch[0], 10) === parseInt(cleanQuery, 10)) {
        return true;
      }
    }
  }

  return false;
};

export const callPatientSpeech = (clickedPatient: { name: string; paloNo?: string; uniquePatientId?: string }, nextPatient?: { name: string; paloNo?: string; uniquePatientId?: string }) => {
  if (typeof window !== 'undefined' && localStorage.getItem('queue_voice_muted') === 'true') {
    return;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    // Use paloNo/token, fallback to uniquePatientId/ID
    const clickedToken = clickedPatient.paloNo || clickedPatient.uniquePatientId || '';
    const clickedTokenText = clickedToken ? `पालो नम्बर ${clickedToken}` : '';
    
    // Primary call for the clicked patient
    let textToSpeak = `${clickedPatient.name}, ${clickedTokenText}, कृपया भित्र आउनुहोला।`;
    
    // Call the next patient in queue to be ready
    if (nextPatient) {
      const nextToken = nextPatient.paloNo || nextPatient.uniquePatientId || '';
      const nextTokenText = nextToken ? `पालो नम्बर ${nextToken}` : '';
      textToSpeak += ` अर्को पालो, ${nextPatient.name}, ${nextTokenText}, कृपया तयारी अवस्थामा रहनुहोला।`;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ne-NP';
    utterance.rate = 0.85; // slightly slower for high clarity

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('ne') || v.lang.startsWith('hi') || v.lang.startsWith('en-IN'));
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  }
};

