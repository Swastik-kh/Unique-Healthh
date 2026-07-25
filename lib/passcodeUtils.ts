/**
 * Utility to generate an 8-character unique passcode containing 2 alphabets and 6 digits.
 * Example outputs: '92A84B10', 'KP841290', '1928AB34', etc.
 */
export const generateOnlinePasscode = (): string => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const chars: string[] = new Array(8);
  
  // Pick 2 distinct random positions (0-7) for letters
  const idx1 = Math.floor(Math.random() * 8);
  let idx2 = Math.floor(Math.random() * 8);
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * 8);
  }

  for (let i = 0; i < 8; i++) {
    if (i === idx1 || i === idx2) {
      chars[i] = letters.charAt(Math.floor(Math.random() * letters.length));
    } else {
      chars[i] = digits.charAt(Math.floor(Math.random() * digits.length));
    }
  }
  return chars.join('');
};
