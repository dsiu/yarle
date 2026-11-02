// The GFM plugin's tableShouldBeSkipped: a table with a nested table, or with a single cell, is
// written as its content (a layout table), not as a Markdown table.
export const isFlattenedTable = (table: any): boolean => !table || !table.rows
  || (table.rows.length === 1 && table.rows[0].childNodes.length <= 1) || !!table.querySelector('table');
