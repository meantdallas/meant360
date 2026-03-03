'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import RecipientInput from '@/components/email/RecipientInput';
import RichTextEditor from '@/components/email/RichTextEditor';
import TemplateSelector from '@/components/email/TemplateSelector';
import EmailPreviewModal from '@/components/email/EmailPreviewModal';
import toast from 'react-hot-toast';

export default function EmailComposePage() {
  const { data: session } = useSession();
  const role = (session?.user as Record<string, unknown>)?.role as string;

  const [to, setTo] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateSelect = useCallback((template: { subject: string; body: string }) => {
    setSubject(template.subject);
    setBody(template.body);
  }, []);

  const validateForm = () => {
    if (to.length === 0) { toast.error('Add at least one recipient'); return false; }
    if (!subject.trim()) { toast.error('Subject is required'); return false; }
    if (!body.trim() || body === '<p></p>') { toast.error('Email body is required'); return false; }
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    setSending(true);
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Email sent via ${json.data.provider}`);
        setTo([]);
        setSubject('');
        setBody('');
        setShowPreview(false);
      } else {
        toast.error(json.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (role !== 'admin' && role !== 'committee') {
    return <div className="p-8 text-center text-gray-500">Access denied</div>;
  }

  return (
    <>
      <PageHeader
        title="Compose Email"
        action={
          <TemplateSelector onSelect={handleTemplateSelect} />
        }
      />

      <div className="space-y-4">
        <div>
          <label className="label">To</label>
          <RecipientInput value={to} onChange={setTo} />
        </div>

        <div>
          <label className="label">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="Email subject..."
          />
        </div>

        <div>
          <label className="label">Body</label>
          <RichTextEditor content={body} onChange={setBody} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { if (validateForm()) setShowPreview(true); }}
            className="btn-secondary"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="btn-primary"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <EmailPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onSend={handleSend}
        sending={sending}
        to={to}
        subject={subject}
        body={body}
      />
    </>
  );
}
