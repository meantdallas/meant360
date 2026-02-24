/**
 * One-time seed script to import members from PDF-extracted text.
 * Run: npx tsx scripts/seed-members.ts
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { google } from 'googleapis';

// --- Google Sheets setup ---
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const SHEET_NAME = 'Members';
const SCHEMA = [
  'id', 'name', 'address', 'email', 'phone',
  'spouseName', 'spouseEmail', 'spousePhone', 'children',
  'membershipType', 'membershipYears', 'registrationDate', 'renewalDate',
  'status', 'notes', 'createdAt', 'updatedAt',
];

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `MBR-${Date.now()}-${idCounter.toString().padStart(4, '0')}`;
}

// --- Parse membership status from trailing tokens ---
function parseStatus(tokens: string[]): { isLife: boolean; yearStatuses: Record<string, string> } {
  let isLife = false;
  const yearStatuses: Record<string, string> = {};

  // Find YES/NO token
  const yesNoIdx = tokens.findIndex(t => t === 'YES' || t === 'NO');
  if (yesNoIdx !== -1) {
    isLife = tokens[yesNoIdx] === 'YES';
    // After YES/NO come the year status columns: 2024, 2025, 2026, 2027, 2028, 2029
    const statusTokens = tokens.slice(yesNoIdx + 1);
    const years = ['2024', '2025', '2026', '2027', '2028', '2029'];

    let yearIdx = 0;
    let i = 0;
    while (i < statusTokens.length && yearIdx < years.length) {
      const tok = statusTokens[i];
      if (tok === 'LIFE' && i + 1 < statusTokens.length && statusTokens[i + 1] === 'MEMBER') {
        yearStatuses[years[yearIdx]] = 'LIFE MEMBER';
        i += 2;
        yearIdx++;
      } else if (tok === 'CURRENT') {
        // Check for "(2023 Honoured for 2024)" type suffixes
        let val = 'CURRENT';
        if (i + 1 < statusTokens.length && statusTokens[i + 1]?.startsWith('(')) {
          // Skip the parenthetical
          while (i + 1 < statusTokens.length && !statusTokens[i].endsWith(')')) {
            i++;
          }
        }
        yearStatuses[years[yearIdx]] = val;
        i++;
        yearIdx++;
      } else if (tok === 'ACTIVE' || tok === 'Active') {
        yearStatuses[years[yearIdx]] = 'ACTIVE';
        i++;
        yearIdx++;
      } else if (tok === 'CURRENT_INDIVIDUAL') {
        yearStatuses[years[yearIdx]] = 'CURRENT';
        i++;
        yearIdx++;
      } else if (tok === 'N/A' || tok === 'NO') {
        i++;
        yearIdx++;
      } else if (tok === '-' || tok === '' || tok === 'no') {
        i++;
        yearIdx++;
      } else {
        // Skip unrecognized tokens within status area
        i++;
      }
    }
  }

  return { isLife, yearStatuses };
}

interface MemberData {
  name: string;
  email: string;
  phone: string;
  spouseName: string;
  membershipType: 'Life Member' | 'Yearly';
  membershipYears: string;
  registrationDate: string;
  status: 'Active' | 'Not Renewed' | 'Expired';
}

function parseLine(line: string): MemberData | null {
  line = line.trim();
  if (!line) return null;

  // Skip header lines
  if (line.startsWith('Submission Date')) return null;

  // Find the email address
  const emailMatch = line.match(/\S+@\S+\.\S+/i);
  if (!emailMatch) {
    // Lines without email - try to extract minimal info
    // e.g. "Jerry George NO NO ACTIVE"
    const noEmailMatch = line.match(/^(?:\d{4}[-/]\S+\s+\S+\s+)?(.+?)\s+(YES|NO)\s/i);
    if (noEmailMatch) {
      const nameText = noEmailMatch[1].trim();
      const afterName = line.substring(line.indexOf(noEmailMatch[2]));
      const tokens = afterName.split(/\s+/);
      const { isLife, yearStatuses } = parseStatus(tokens);
      const activeYears = Object.entries(yearStatuses)
        .filter(([, v]) => v === 'LIFE MEMBER' || v === 'CURRENT' || v === 'ACTIVE')
        .map(([y]) => y);
      const membershipType: 'Life Member' | 'Yearly' = isLife ? 'Life Member' : 'Yearly';
      const status = determineStatus(yearStatuses, isLife);

      return {
        name: cleanName(nameText),
        email: '',
        phone: '',
        spouseName: '',
        membershipType,
        membershipYears: activeYears.join(','),
        registrationDate: '',
        status,
      };
    }
    // Try simple name-only lines like "Vaisakh Nair Active" or "Anitha Purushothaman"
    const simpleMatch = line.match(/^([A-Za-z\s]+?)(?:\s+(Active|ACTIVE|NO))?$/);
    if (simpleMatch) {
      const active = simpleMatch[2]?.toLowerCase() === 'active';
      return {
        name: cleanName(simpleMatch[1]),
        email: '',
        phone: '',
        spouseName: '',
        membershipType: 'Yearly',
        membershipYears: active ? '2026' : '',
        registrationDate: '',
        status: active ? 'Active' : 'Not Renewed',
      };
    }
    return null;
  }

  const email = emailMatch[0].replace(/,$/, '');
  const emailIdx = line.indexOf(email);

  // Extract date from start
  let registrationDate = '';
  let nameStart = 0;
  const dateMatch = line.match(/^(\d{4}[-/]\d{2}[-/]\d{2})\s+(?:\d{1,2}:\d{2}:\d{2}\s+)?/);
  if (dateMatch) {
    registrationDate = dateMatch[1];
    nameStart = dateMatch[0].length;
  } else {
    // Try alternate date format like "11/27/2023 8:58:07"
    const altDateMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:\d{1,2}:\d{2}:\d{2}\s+)?/);
    if (altDateMatch) {
      const parts = altDateMatch[1].split('/');
      registrationDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      nameStart = altDateMatch[0].length;
    } else {
      // Try "2021 " prefix
      const yearOnlyMatch = line.match(/^(\d{4})\s+/);
      if (yearOnlyMatch) {
        registrationDate = `${yearOnlyMatch[1]}-01-01`;
        nameStart = yearOnlyMatch[0].length;
      }
    }
  }

  // Text before email = names
  const beforeEmail = line.substring(nameStart, emailIdx).trim();

  // Text after email = phones + YES/NO + statuses
  const afterEmail = line.substring(emailIdx + email.length).trim();

  // Extract phone numbers from afterEmail
  const phones: string[] = [];
  let remaining = afterEmail;

  // Match phone patterns: (xxx) xxx-xxxx, (xxx) xxxxxxx, xxx.xxx.xxxx, xxx-xxx-xxxx, (+x) xxxxxxxxxx
  const phoneRegex = /\([\+]?\d+\)\s*\d[\d-]+|\d{3}[.-]\d{3}[.-]\d{4}/g;
  let phoneMatch;
  let lastPhoneEnd = 0;
  const phoneMatches: { match: string; end: number }[] = [];
  while ((phoneMatch = phoneRegex.exec(afterEmail)) !== null) {
    phoneMatches.push({ match: phoneMatch[0], end: phoneMatch.index + phoneMatch[0].length });
    phones.push(phoneMatch[0]);
  }

  if (phoneMatches.length > 0) {
    remaining = afterEmail.substring(phoneMatches[phoneMatches.length - 1].end).trim();
  }

  // Parse YES/NO and statuses from remaining
  const remainingTokens = remaining.split(/\s+/).filter(Boolean);
  const { isLife, yearStatuses } = parseStatus(remainingTokens);

  // Compute membership years
  const activeYears = Object.entries(yearStatuses)
    .filter(([, v]) => v === 'LIFE MEMBER' || v === 'CURRENT' || v === 'ACTIVE')
    .map(([y]) => y);

  const membershipType: 'Life Member' | 'Yearly' = isLife ? 'Life Member' : 'Yearly';
  const status = determineStatus(yearStatuses, isLife);

  // Parse names - split before email text into member name and spouse name
  const { memberName, spouseName } = splitNames(beforeEmail);

  return {
    name: memberName,
    email: email.toLowerCase() === email ? email : email, // preserve case
    phone: phones[0] || '',
    spouseName,
    membershipType,
    membershipYears: isLife
      ? ['2024', '2025', '2026', '2027', '2028', '2029'].join(',')
      : activeYears.join(','),
    registrationDate,
    status,
  };
}

function determineStatus(
  yearStatuses: Record<string, string>,
  isLife: boolean,
): 'Active' | 'Not Renewed' | 'Expired' {
  if (isLife) return 'Active';

  // Check most recent years first
  for (const year of ['2026', '2025', '2024']) {
    const val = yearStatuses[year];
    if (val === 'CURRENT' || val === 'ACTIVE' || val === 'LIFE MEMBER') {
      return 'Active';
    }
  }

  // If they have any year status at all but nothing recent
  const hasAnyStatus = Object.values(yearStatuses).some(
    v => v === 'CURRENT' || v === 'ACTIVE' || v === 'LIFE MEMBER',
  );
  if (hasAnyStatus) return 'Not Renewed';

  return 'Expired';
}

function cleanName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\bNA\b/gi, '')
    .replace(/\bN\/A\b/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitNames(text: string): { memberName: string; spouseName: string } {
  // Clean N/A, NA markers
  let cleaned = text
    .replace(/\bNA\b/g, '')
    .replace(/\bN\/A\b/g, '')
    .replace(/\bNIL\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return { memberName: '', spouseName: '' };

  const words = cleaned.split(' ').filter(Boolean);

  if (words.length <= 2) {
    return { memberName: words.join(' '), spouseName: '' };
  }

  // Heuristic: first 2 words = member name, rest = spouse
  // But handle cases like "First Middle Last Spouse1 Spouse2"
  // For 3 words: could be "First Last Spouse" or "First Middle Last"
  // For 4 words: most likely "First Last SpouseFirst SpouseLast"
  if (words.length === 3) {
    // Could be either way - default to first 2 = name, last 1 = spouse
    return { memberName: `${words[0]} ${words[1]}`, spouseName: words[2] };
  }

  if (words.length === 4) {
    return {
      memberName: `${words[0]} ${words[1]}`,
      spouseName: `${words[2]} ${words[3]}`,
    };
  }

  // For 5+ words, take first 2-3 as member name
  // Look for common patterns
  const midpoint = Math.ceil(words.length / 2);
  return {
    memberName: words.slice(0, midpoint).join(' '),
    spouseName: words.slice(midpoint).join(' '),
  };
}

async function main() {
  // Load environment from .env.local
  const envPath = new URL('../.env.local', import.meta.url).pathname;
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }

  if (!process.env.GOOGLE_SPREADSHEET_ID) {
    console.error('Missing GOOGLE_SPREADSHEET_ID in .env.local');
    process.exit(1);
  }

  const rawText = readFileSync('/tmp/members_raw.txt', 'utf-8');
  const lines = rawText.split('\n');

  console.log(`Parsing ${lines.length} lines...`);

  const members: MemberData[] = [];
  const seen = new Set<string>(); // dedupe by email

  for (const line of lines) {
    const member = parseLine(line);
    if (!member) continue;
    if (!member.name) continue;

    // Dedupe by email (keep first occurrence) or by name if no email
    const key = member.email ? member.email.toLowerCase() : member.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    members.push(member);
  }

  console.log(`Parsed ${members.length} unique members`);
  console.log(`Life Members: ${members.filter(m => m.membershipType === 'Life Member').length}`);
  console.log(`Active: ${members.filter(m => m.status === 'Active').length}`);
  console.log(`Not Renewed: ${members.filter(m => m.status === 'Not Renewed').length}`);
  console.log(`Expired: ${members.filter(m => m.status === 'Expired').length}`);

  // Prepare rows for Google Sheets
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  // First, check if Members sheet exists and has headers
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A:A`,
    });
    const existingRows = existing.data.values || [];
    if (existingRows.length > 1) {
      console.log(`\nMembers sheet already has ${existingRows.length - 1} rows of data.`);
      console.log('Clearing existing data rows (keeping headers)...');

      // Clear existing data (keep header)
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${SHEET_NAME}!A2:Z`,
      });
    }

    // Ensure headers match the new schema
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [SCHEMA] },
    });
  } catch (err: any) {
    if (err.message?.includes('Unable to parse range')) {
      console.log('Members sheet not found, creating...');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [SCHEMA] },
      });
    } else {
      throw err;
    }
  }

  // Build all rows
  const now = new Date().toISOString();
  const rows = members.map((m) => {
    const record: Record<string, string> = {
      id: generateId(),
      name: m.name,
      address: '',
      email: m.email,
      phone: m.phone,
      spouseName: m.spouseName,
      spouseEmail: '',
      spousePhone: '',
      children: '[]',
      membershipType: m.membershipType,
      membershipYears: m.membershipYears,
      registrationDate: m.registrationDate,
      renewalDate: '',
      status: m.status,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    return SCHEMA.map(col => record[col] || '');
  });

  // Batch append in chunks of 100
  const CHUNK_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk },
    });
    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${rows.length} members...`);
  }

  console.log(`\nDone! ${inserted} members imported to the Members sheet.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
