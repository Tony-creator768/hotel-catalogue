/**
 * GU-Q Hotel & Serviced Apartment Catalogue API
 * 
 * Use this inside Google Sheets:
 * 1. Open the Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this file.
 * 4. Deploy > New deployment > Web app.
 * 5. Execute as: Me.
 * 6. Who has access: Anyone with the link OR your organization only.
 * 7. Copy the web app URL into website/config.js.
 */

const SHEET_NAME = 'Catalogue_View';
const APPROVED_ONLY_DEFAULT = true;

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const includeAll = String(params.all || '').toLowerCase() === 'true';
  const callback = params.callback;

  const payload = getCataloguePayload_(!includeAll && APPROVED_ONLY_DEFAULT);

  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getCataloguePayload_(approvedOnly) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return {
      ok: false,
      error: `Sheet '${SHEET_NAME}' was not found.`,
      updatedAt: new Date().toISOString(),
      count: 0,
      rows: []
    };
  }

  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    return {
      ok: true,
      updatedAt: new Date().toISOString(),
      count: 0,
      rows: []
    };
  }

  const headers = values[0].map(h => String(h || '').trim());
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const rowValues = values[i];
    const row = {};

    headers.forEach((header, index) => {
      row[header] = cleanValue_(rowValues[index]);
    });

    const hasProperty = String(row['Property Name'] || '').trim() !== '';
    const hasUnit = String(row['Unit Type'] || '').trim() !== '';
    if (!hasProperty && !hasUnit) continue;

    const status = String(row['Approval Status'] || '').trim().toLowerCase();
    if (approvedOnly && status !== 'approved') continue;

    rows.push(row);
  }

  return {
    ok: true,
    source: ss.getName(),
    sheet: SHEET_NAME,
    updatedAt: new Date().toISOString(),
    count: rows.length,
    rows
  };
}

function cleanValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Optional test function. Run this once in Apps Script editor to verify data.
 */
function testCatalogueAPI() {
  const data = getCataloguePayload_(true);
  Logger.log(JSON.stringify(data, null, 2));
}
