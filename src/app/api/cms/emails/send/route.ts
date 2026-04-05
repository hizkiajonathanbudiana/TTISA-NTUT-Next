import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { CmsHttpError, verifyCmsRequest } from '@/lib/cms/auth';
import { cmsErrorResponse } from '@/app/api/cms/utils';

const requestSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required.'),
  message: z.string().trim().min(1, 'Message is required.'),
  recipients: z.array(z.string().email('Invalid recipient email.')).min(1, 'Recipients are required.'),
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export async function POST(request: Request) {
  try {
    await verifyCmsRequest(request, ['admin', 'developer', 'organizer']);
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      throw new CmsHttpError(400, parsed.error.issues[0]?.message ?? 'Invalid payload.');
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      throw new CmsHttpError(500, 'Resend is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.');
    }

    const resend = new Resend(apiKey);
    const recipients = Array.from(new Set(parsed.data.recipients.map((email) => email.trim().toLowerCase())));
    const subject = parsed.data.subject.trim();
    const message = parsed.data.message.trim();
    const html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(message)}</div>`;

    const results = await Promise.allSettled(
      recipients.map((email) =>
        resend.emails.send({
          from,
          to: email,
          subject,
          html,
          text: message,
        }),
      ),
    );

    const failedRecipients = results
      .map((result, index) => (result.status === 'rejected' ? recipients[index] : null))
      .filter((value): value is string => Boolean(value));

    return NextResponse.json({
      sent: recipients.length - failedRecipients.length,
      failed: failedRecipients.length,
      failedRecipients,
    });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
