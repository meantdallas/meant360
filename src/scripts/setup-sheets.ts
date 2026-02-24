/**
 * Setup script to initialize Google Sheets with all required tabs and headers.
 *
 * Usage: npm run setup-sheets
 *
 * Make sure your .env file is configured with:
 * - GOOGLE_SPREADSHEET_ID
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { setupSpreadsheet, SHEET_SCHEMAS } from '../lib/google-sheets';

async function main() {
  console.log('Setting up Google Sheets database...\n');
  console.log('Spreadsheet ID:', process.env.GOOGLE_SPREADSHEET_ID);
  console.log('Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  console.log('');

  if (!process.env.GOOGLE_SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.error('ERROR: Missing required environment variables.');
    console.error('Please set GOOGLE_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_EMAIL in .env');
    process.exit(1);
  }

  try {
    await setupSpreadsheet();

    console.log('Sheets created/verified:');
    for (const [tabName, columns] of Object.entries(SHEET_SCHEMAS)) {
      console.log(`  - ${tabName} (${columns.length} columns)`);
    }

    console.log('\nSetup complete! Your Google Sheets database is ready.');
  } catch (error) {
    console.error('Setup failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the service account has Editor access to the spreadsheet');
    console.error('2. Verify the Spreadsheet ID is correct');
    console.error('3. Check that the private key is properly formatted');
    process.exit(1);
  }
}

main();
