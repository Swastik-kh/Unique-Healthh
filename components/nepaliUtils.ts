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
