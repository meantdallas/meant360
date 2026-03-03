'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface TemplateSelectorProps {
  onSelect: (template: { subject: string; body: string }) => void;
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/email/templates');
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const template = templates.find((t) => t.id === e.target.value);
    if (template) {
      onSelect({ subject: template.subject, body: template.body });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        onChange={handleChange}
        defaultValue=""
        className="select text-sm"
      >
        <option value="" disabled>Load template...</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <Link
        href="/email/templates"
        className="text-sm text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap"
      >
        Manage
      </Link>
    </div>
  );
}
