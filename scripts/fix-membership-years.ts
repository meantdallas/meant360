/**
 * Fix membershipYears by re-parsing the layout PDF text with
 * position-based column extraction for year status columns.
 * Run: npx tsx scripts/fix-membership-years.ts
 */
import { readFileSync } from 'fs';
import { google } from 'googleapis';

// --- Load env ---
const envContent = readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

interface ColBounds {
  lifeStart: number;
  lifeEnd: number;
  y2024Start: number;
  y2024End: number;
  y2025Start: number;
  y2025End: number;
  y2026Start: number;
  y2026End: number;
  y2027Start: number;
  y2027End: number;
  y2028Start: number;
  y2028End: number;
  y2029Start: number;
  y2029End: number;
}

function calcBounds(headerLine: string): ColBounds | null {
  const life = headerLine.indexOf('LIFE Member');
  const y2024 = headerLine.indexOf('2024 Membership');
  const y2025 = headerLine.indexOf('2025 Membership');
  const y2026 = headerLine.indexOf('2026 Membership');
  const y2027 = headerLine.indexOf('2027 Membership');
  const y2028 = headerLine.indexOf('2028 Membership');
  const y2029 = headerLine.indexOf('2029 Membership');
  const typeQ = headerLine.indexOf('Type a question');

  if (life === -1 || y2024 === -1) return null;

  // Use midpoints between column headers as boundaries, with tolerance
  const T = 5; // tolerance
  return {
    lifeStart: life - T,
    lifeEnd: Math.floor((life + y2024) / 2),
    y2024Start: Math.floor((life + y2024) / 2),
    y2024End: y2025 !== -1 ? Math.floor((y2024 + y2025) / 2) : y2024 + 27,
    y2025Start: y2025 !== -1 ? Math.floor((y2024 + y2025) / 2) : y2024 + 22,
    y2025End: y2026 !== -1 ? Math.floor((y2025 + y2026) / 2) : y2024 + 55,
    y2026Start: y2026 !== -1 ? Math.floor((y2025 + y2026) / 2) : y2024 + 50,
    y2026End: y2027 !== -1 ? Math.floor((y2026 + y2027) / 2) : y2024 + 83,
    y2027Start: y2027 !== -1 ? Math.floor((y2026 + y2027) / 2) : y2024 + 78,
    y2027End: y2028 !== -1 ? Math.floor((y2027 + y2028) / 2) : y2024 + 111,
    y2028Start: y2028 !== -1 ? Math.floor((y2027 + y2028) / 2) : y2024 + 106,
    y2028End: y2029 !== -1 ? Math.floor((y2028 + y2029) / 2) : y2024 + 139,
    y2029Start: y2029 !== -1 ? Math.floor((y2028 + y2029) / 2) : y2024 + 134,
    y2029End: typeQ !== -1 ? typeQ : (y2029 !== -1 ? y2029 + 27 : y2024 + 167),
  };
}

function sliceCol(line: string, start: number, end: number): string {
  if (start >= line.length) return '';
  return line.substring(Math.max(0, start), Math.min(end, line.length)).trim();
}

function isActive(val: string): boolean {
  const v = val.toUpperCase();
  return v.includes('LIFE MEMBER') || v.includes('CURRENT') || v.includes('ACTIVE');
}

interface MemberYearData {
  email: string;
  nameFragment: string; // first word(s) for fallback matching
  isLife: boolean;
  years: string[];
}

function parseMembersFromLayout(layoutText: string): MemberYearData[] {
  const lines = layoutText.split('\n');
  const results: MemberYearData[] = [];
  let bounds: ColBounds | null = null;

  for (const line of lines) {
    // Detect header lines and update column bounds
    if (line.includes('2024 Membership') && line.includes('LIFE Member')) {
      bounds = calcBounds(line);
      continue;
    }

    if (!bounds) continue;
    if (!line.trim()) continue;

    // Must be a data line — check for date at start or alphabetic start with sufficient length
    const isDataLine =
      /^\s*\d{4}[-/]/.test(line) ||
      /^\s*\d{1,2}\/\d{1,2}\/\d{4}/.test(line) ||
      (/^\s*[A-Za-z]/.test(line) && line.length > 80);

    if (!isDataLine) continue;

    // Skip if line is too short to have LIFE column
    if (line.length < bounds.lifeStart) continue;

    // Extract email
    const emailMatch = line.match(/\S+@\S+\.\S+/i);
    const email = emailMatch ? emailMatch[0].replace(/,$/, '') : '';

    // Extract name fragment (first recognizable name after date)
    let nameFragment = '';
    const nameMatch = line.match(/^\s*(?:\d{4}[-/]\d{2}[-/]\d{2}\s+(?:\d{1,2}:\d{2}:\d{2}\s+)?|\d{1,2}\/\d{1,2}\/\d{4}\s+(?:\d{1,2}:\d{2}:\d{2}\s+)?|\d{4}\s+)?([A-Za-z][A-Za-z .]+?)(?:\s{3,})/);
    if (nameMatch) {
      nameFragment = nameMatch[1].trim();
    }

    // Extract LIFE member flag
    const lifeVal = sliceCol(line, bounds.lifeStart, bounds.lifeEnd);
    const isLife = /\bYES\b/.test(lifeVal);

    // Extract each year status
    const years: string[] = [];
    if (isActive(sliceCol(line, bounds.y2024Start, bounds.y2024End))) years.push('2024');
    if (isActive(sliceCol(line, bounds.y2025Start, bounds.y2025End))) years.push('2025');
    if (isActive(sliceCol(line, bounds.y2026Start, bounds.y2026End))) years.push('2026');
    if (isActive(sliceCol(line, bounds.y2027Start, bounds.y2027End))) years.push('2027');
    if (isActive(sliceCol(line, bounds.y2028Start, bounds.y2028End))) years.push('2028');
    if (isActive(sliceCol(line, bounds.y2029Start, bounds.y2029End))) years.push('2029');

    if (!email && !nameFragment) continue;

    results.push({ email, nameFragment, isLife, years });
  }

  return results;
}

async function main() {
  const layoutText = readFileSync('/tmp/members_layout.txt', 'utf-8');

  console.log('Parsing layout text for year columns...');
  const pdfMembers = parseMembersFromLayout(layoutText);
  console.log(`Parsed ${pdfMembers.length} member entries from PDF`);

  const lifeCount = pdfMembers.filter(m => m.isLife).length;
  const withYears = pdfMembers.filter(m => m.years.length > 0).length;
  console.log(`Life members: ${lifeCount}`);
  console.log(`Members with active years: ${withYears}`);

  console.log('\nSample entries:');
  for (const m of pdfMembers.slice(0, 15)) {
    console.log(`  ${(m.nameFragment || '?').padEnd(20)} | ${(m.email || 'no-email').padEnd(35)} | Life: ${m.isLife ? 'Y' : 'N'} | Years: ${m.years.join(',') || 'none'}`);
  }

  // Show some later entries (page 2+)
  console.log('  ...');
  for (const m of pdfMembers.slice(130, 140)) {
    console.log(`  ${(m.nameFragment || '?').padEnd(20)} | ${(m.email || 'no-email').padEnd(35)} | Life: ${m.isLife ? 'Y' : 'N'} | Years: ${m.years.join(',') || 'none'}`);
  }

  // --- Google Sheets update ---
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  const sheetData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Members!A:Q',
  });

  const rows = sheetData.data.values || [];
  if (rows.length <= 1) {
    console.log('No member data in sheet!');
    return;
  }

  const headers = rows[0];
  const emailCol = headers.indexOf('email');
  const nameCol = headers.indexOf('name');
  const membershipYearsCol = headers.indexOf('membershipYears');
  const membershipTypeCol = headers.indexOf('membershipType');
  const statusCol = headers.indexOf('status');

  console.log(`\nSheet has ${rows.length - 1} members`);

  // Build lookup maps from PDF data
  const pdfByEmail = new Map<string, MemberYearData>();
  const pdfByNameFrag = new Map<string, MemberYearData>();

  for (const pm of pdfMembers) {
    if (pm.email) {
      const key = pm.email.toLowerCase();
      const existing = pdfByEmail.get(key);
      if (!existing || pm.years.length > existing.years.length) {
        pdfByEmail.set(key, pm);
      }
    }
    if (pm.nameFragment) {
      const key = pm.nameFragment.toLowerCase().replace(/\s+/g, ' ');
      const existing = pdfByNameFrag.get(key);
      if (!existing || pm.years.length > existing.years.length) {
        pdfByNameFrag.set(key, pm);
      }
    }
  }

  // Update each row
  let updated = 0;
  let matched = 0;
  const updatedRows: { range: string; values: string[][] }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sheetEmail = (row[emailCol] || '').toLowerCase().trim();
    const sheetName = (row[nameCol] || '').trim();

    // Match by email first, then by name fragment
    let pdfEntry = sheetEmail ? pdfByEmail.get(sheetEmail) : undefined;
    if (!pdfEntry && sheetName) {
      const nameWords = sheetName.toLowerCase().split(/\s+/);
      // Try full name
      pdfEntry = pdfByNameFrag.get(sheetName.toLowerCase());
      // Try first two words
      if (!pdfEntry && nameWords.length >= 2) {
        pdfEntry = pdfByNameFrag.get(nameWords.slice(0, 2).join(' '));
      }
      // Try first word (for single-name fragments)
      if (!pdfEntry) {
        pdfEntry = pdfByNameFrag.get(nameWords[0]);
      }
    }

    if (!pdfEntry) continue;
    matched++;

    const currentType = row[membershipTypeCol] || '';
    const isLife = pdfEntry.isLife || currentType === 'Life Member';

    // Determine membershipYears
    let newYears: string;
    if (isLife) {
      newYears = '2024,2025,2026,2027,2028,2029';
    } else {
      newYears = pdfEntry.years.join(',');
    }

    // Determine status
    let newStatus: string;
    if (isLife) {
      newStatus = 'Active';
    } else if (pdfEntry.years.includes('2026') || pdfEntry.years.includes('2025')) {
      newStatus = 'Active';
    } else if (pdfEntry.years.length > 0) {
      newStatus = 'Not Renewed';
    } else {
      newStatus = 'Expired';
    }

    const currentYears = row[membershipYearsCol] || '';
    const currentStatus = row[statusCol] || '';

    if (newYears !== currentYears || newStatus !== currentStatus) {
      const updatedRow = [...row];
      while (updatedRow.length < headers.length) updatedRow.push('');
      updatedRow[membershipYearsCol] = newYears;
      updatedRow[statusCol] = newStatus;

      // Also fix membershipType if needed
      if (isLife && updatedRow[membershipTypeCol] !== 'Life Member') {
        updatedRow[membershipTypeCol] = 'Life Member';
      }

      updatedRows.push({
        range: `Members!A${i + 1}:Q${i + 1}`,
        values: [updatedRow],
      });
      updated++;
    }
  }

  console.log(`Matched ${matched}/${rows.length - 1} members with PDF data`);
  console.log(`${updated} members need updates`);

  if (updated === 0) {
    console.log('No updates needed!');
    return;
  }

  // Batch update
  const CHUNK = 100;
  for (let i = 0; i < updatedRows.length; i += CHUNK) {
    const chunk = updatedRows.slice(i, i + CHUNK);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: chunk,
      },
    });
    console.log(`Updated ${Math.min(i + CHUNK, updatedRows.length)}/${updatedRows.length}...`);
  }

  // Print summary
  const statusCounts: Record<string, number> = {};
  const yearCounts: Record<string, number> = {};
  for (const r of updatedRows) {
    const st = r.values[0][statusCol];
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    const yrs = r.values[0][membershipYearsCol];
    for (const y of yrs.split(',').filter(Boolean)) {
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
  }

  console.log('\nStatus distribution (updated members):');
  for (const [st, count] of Object.entries(statusCounts).sort()) {
    console.log(`  ${st}: ${count}`);
  }
  console.log('\nYear distribution (updated members):');
  for (const [year, count] of Object.entries(yearCounts).sort()) {
    console.log(`  ${year}: ${count}`);
  }

  console.log(`\nDone! Updated ${updated} members.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
