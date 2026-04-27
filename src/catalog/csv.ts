export function parseCsvRows(input: string): Array<Array<string>> {
  const rows: Array<Array<string>> = [];
  let field = '';
  let row: Array<string> = [];
  let isQuoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }

      continue;
    }

    if (char === ',' && !isQuoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !isQuoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      field = '';
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function parseCsvObjects(input: string): Array<Record<string, string>> {
  const [headers, ...rows] = parseCsvRows(input);

  if (!headers) {
    return [];
  }

  return rows
    .filter((row: Array<string>): boolean => {
      return row.some((value: string): boolean => {
        return value.trim().length > 0;
      });
    })
    .map((row: Array<string>): Record<string, string> => {
      return headers.reduce<Record<string, string>>(
        (record, header, index): Record<string, string> => {
          record[header.trim()] = row[index]?.trim() ?? '';

          return record;
        },
        {},
      );
    });
}
