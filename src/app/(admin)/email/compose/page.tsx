'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import RecipientInput from '@/components/email/RecipientInput';
import RichTextEditor from '@/components/email/RichTextEditor';
import EmailPreviewModal from '@/components/email/EmailPreviewModal';
import toast from 'react-hot-toast';

interface EmailCategory {
  name: string;
  email: string;
}

export default function EmailComposePage() {
  const { data: session } = useSession();
  const role = (session?.user as Record<string, unknown>)?.role as string;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [emailCategories, setEmailCategories] = useState<EmailCategory[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
          const cats = JSON.parse(json.data['email_categories'] || '[]');
          if (Array.isArray(cats)) setEmailCategories(cats);
        }
      } catch { /* ignore */ }
    })();
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
      const payload: Record<string, unknown> = { to, subject, body };
      if (from) payload.from = from;
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      <PageHeader title="Compose Email" />

      <div className="space-y-4">
        {emailCategories.length > 0 && (
          <div>
            <label className="label">From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="select"
            >
              <option value="">Default</option>
              {emailCategories.map((cat) => (
                <option key={cat.email} value={cat.email}>
                  {cat.name} ({cat.email})
                </option>
              ))}
            </select>
          </div>
        )}

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
        from={from || undefined}
        to={to}
        subject={subject}
        body={body}
      />
    </>
  );
}
