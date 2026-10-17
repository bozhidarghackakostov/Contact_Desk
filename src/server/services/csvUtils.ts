/**
 * RFC 4180 compliant CSV parser and serializer with CSV Formula Injection protection.
 * Completely offline, zero external dependencies.
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitize a field to prevent CSV Formula Injection in Excel/Sheets/Calc.
 * If the string starts with =, +, -, @, tab, or carriage return, prepend a single quote.
 */
export function sanitizeForFormulaInjection(val: string): string {
  if (!val || typeof val !== 'string') return val;
  const firstChar = val.charAt(0);
  if (FORMULA_PREFIXES.includes(firstChar)) {
    return `'${val}`;
  }
  return val;
}

/**
 * Format a single value as a CSV cell, escaping quotes and wrapping with double quotes if needed.
 */
export function formatCsvCell(val: any, sanitize: boolean = true): string {
  if (val === null || val === undefined) return '';

  let str = String(val);
  if (sanitize) {
    str = sanitizeForFormulaInjection(str);
  }

  // If contains delimiter, quote, or newline, escape quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Generate RFC 4180 compliant CSV string from an array of headers and rows.
 */
export function generateCsv(headers: string[], rows: any[][], sanitize: boolean = true): string {
  const headerLine = headers.map((h) => formatCsvCell(h, false)).join(',');
  const dataLines = rows.map((row) =>
    row.map((cell) => formatCsvCell(cell, sanitize)).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * Parse an RFC 4180 compliant CSV string into an array of string arrays.
 * Correctly handles commas inside quotes, multi-line quoted values, and escaped quotes ("").
 */
export function parseCsv(csvText: string): string[][] {
  if (!csvText) return [];

  // Strip UTF-8 BOM if present
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last field and row if any content remains
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}
