import { Parser } from 'hot-formula-parser';

export interface EvaluatedTable {
  headers: string[];
  rows: string[][];
  rawRows: string[][];
}

/**
 * Evaluates a single cell within the context of a table.
 * Supports Excel-like formulas starting with '='.
 * Handles cell references (e.g., A1, B2) and range operations (e.g., SUM(A1:A5)).
 */
export function getEvaluatedCell(rows: string[][], colIndex: number, rowIndex: number, visited = new Set<string>()): any {
  const cellId = `${rowIndex}-${colIndex}`;
  if (visited.has(cellId)) return '#CYCLE!';
  visited.add(cellId);

  const val = rows[rowIndex]?.[colIndex];
  if (!val) return '';
  
  if (val.toString().startsWith('=')) {
    const parser = new Parser();
    
    // Register cell value getter for the parser to handle references
    parser.on('callCellValue', (cellCoord, done) => {
      const targetCol = cellCoord.column.index;
      const targetRow = cellCoord.row.index;
      // Recursively evaluate the target cell, passing along the visited set for cycle detection
      done(getEvaluatedCell(rows, targetCol, targetRow, new Set(visited)));
    });

    // Register range value getter for the parser to handle functions like SUM(A1:B5)
    parser.on('callRangeValue', (startCell, endCell, done) => {
      const rangeValues: any[][] = [];
      for (let r = startCell.row.index; r <= endCell.row.index; r++) {
        const rowValues: any[] = [];
        for (let c = startCell.column.index; c <= endCell.column.index; c++) {
          rowValues.push(getEvaluatedCell(rows, c, r, new Set(visited)));
        }
        rangeValues.push(rowValues);
      }
      done(rangeValues);
    });

    const result = parser.parse(val.toString().substring(1));
    if (result.error) return result.error;
    
    // Handle numeric results to avoid messy floating points if needed
    if (typeof result.result === 'number') {
        return Number(result.result.toFixed(2));
    }
    
    return result.result;
  }

  // If not a formula, try to return as a number if applicable
  const num = parseFloat(val);
  return isNaN(num) ? val : num;
}

/**
 * Converts English digits in a string to Nepali digits.
 */
export function toNepaliDigits(str: string | number): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.toString().replace(/\d/g, (digit) => nepaliDigits[parseInt(digit)]);
}

/**
 * Evaluates an entire grid of data.
 */
export function evaluateTableData(rows: string[][], convertToNepali = false): string[][] {
  if (!rows || rows.length === 0) return [];
  
  return rows.map((row, rIdx) => {
    return row.map((cell, cIdx) => {
      let finalValue = cell;
      if (cell && cell.toString().startsWith('=')) {
        const val = getEvaluatedCell(rows, cIdx, rIdx);
        finalValue = val !== null && val !== undefined ? val.toString() : '';
      }
      
      if (convertToNepali && finalValue) {
        return toNepaliDigits(finalValue);
      }
      return finalValue;
    });
  });
}
