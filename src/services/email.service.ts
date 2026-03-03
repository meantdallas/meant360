import nodemailer from 'nodemailer';
import { sentEmailRepository } from '@/repositories';
import { logActivity } from '@/lib/audit-log';
import { generateId } from '@/lib/utils';

interface SmtpProvider {
  name: string;
  host: string;
  port: number;
  dailyLimit: number;
  user: string | undefined;
  pass: string | undefined;
}

const SMTP_PROVIDERS: SmtpProvider[] = [
  {
    name: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    dailyLimit: 500,
    user: process.env.SMTP_GMAIL_USER,
    pass: process.env.SMTP_GMAIL_PASS,
  },
  {
    name: 'brevo',
    host: 'smtp-relay.brevo.com',
    port: 587,
    dailyLimit: 300,
    user: process.env.SMTP_BREVO_USER,
    pass: process.env.SMTP_BREVO_PASS,
  },
];

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
): Promise<SendResult> {
  const recipientList = to.join(', ');

  for (const provider of SMTP_PROVIDERS) {
    if (!provider.user || !provider.pass) continue;

    try {
      const todayCount = await sentEmailRepository.countTodayByProvider(provider.name);
      if (todayCount >= provider.dailyLimit) continue;

      const transport = nodemailer.createTransport({
        host: provider.host,
        port: provider.port,
        secure: false,
        auth: { user: provider.user, pass: provider.pass },
      });

      await transport.sendMail({
        from: provider.user,
        to: recipientList,
        subject,
        html: htmlBody,
      });

      await sentEmailRepository.create({
        to: recipientList,
        subject,
        body: htmlBody,
        provider: provider.name,
        status: 'sent',
        sentBy,
      });

      logActivity({
        userEmail: sentBy,
        action: 'create',
        entityType: 'Email',
        entityId: generateId(),
        entityLabel: subject,
        description: `Sent email to ${recipientList} via ${provider.name}`,
      });

      return { success: true, provider: provider.name };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await sentEmailRepository.create({
        to: recipientList,
        subject,
        body: htmlBody,
        provider: provider.name,
        status: 'failed',
        error: errorMessage,
        sentBy,
      });

      // Try next provider
      continue;
    }
  }

  return {
    success: false,
    error: 'All email providers exhausted or unavailable',
  };
}
