import { google } from 'googleapis';
import { Readable } from 'stream';

// ========================================
// Google Drive File Upload (Receipts)
// ========================================

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

function getDrive() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  fileName: string;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<UploadResult> {
  const drive = getDrive();

  const fileMetadata = {
    name: `${Date.now()}_${fileName}`,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink',
  });

  const fileId = response.data.id!;

  // Make the file viewable by anyone with the link
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Get the updated web view link
  const fileInfo = await drive.files.get({
    fileId,
    fields: 'webViewLink',
  });

  return {
    fileId,
    webViewLink: fileInfo.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    fileName: fileMetadata.name,
  };
}

export async function deleteFile(fileId: string): Promise<void> {
  if (!fileId) return;
  const drive = getDrive();
  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error('Failed to delete file from Drive:', error);
  }
}
