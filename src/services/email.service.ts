import nodemailer from 'nodemailer';
import { sentEmailRepository } from '@/repositories';
import { logActivity } from '@/lib/audit-log';
import { generateId } from '@/lib/utils';

const GMAIL_USER = process.env.SMTP_GMAIL_USER;
const GMAIL_PASS = process.env.SMTP_GMAIL_PASS;
const DAILY_LIMIT = 500;

interface SendResult {
  success: boolean;
  provider?: string;
  error?: string;
}

export async function sendEmail(
  to: string[],
  subject: string,
  htmlBody: string,
  sentBy: string,
  from?: string,
): Promise<SendResult> {
  if (!GMAIL_USER || !GMAIL_PASS) {
    return { success: false, error: 'Gmail SMTP credentials not configured' };
  }

  const todayCount = await sentEmailRepository.countTodayByProvider('gmail');
  if (todayCount >= DAILY_LIMIT) {
    return { success: false, error: 'Daily email limit reached (500/day)' };
  }

  const recipientList = to.join(', ');
  const fromAddress = from || GMAIL_USER;

  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    await transport.sendMail({
      from: fromAddress,
      to: recipientList,
      subject,
      html: htmlBody,
    });

    await sentEmailRepository.create({
      to: recipientList,
      subject,
      body: htmlBody,
      provider: 'gmail',
      status: 'sent',
      sentBy,
    });

    logActivity({
      userEmail: sentBy,
      action: 'create',
      entityType: 'Email',
      entityId: generateId(),
      entityLabel: subject,
      description: `Sent email to ${recipientList} via gmail`,
    });

    return { success: true, provider: 'gmail' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await sentEmailRepository.create({
      to: recipientList,
      subject,
      body: htmlBody,
      provider: 'gmail',
      status: 'failed',
      error: errorMessage,
      sentBy,
    });

    return { success: false, error: errorMessage };
  }
}
