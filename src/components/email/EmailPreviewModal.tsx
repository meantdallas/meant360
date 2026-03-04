'use client';

import Modal from '@/components/ui/Modal';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  from?: string;
  to: string[];
  subject: string;
  body: string;
}

export default function EmailPreviewModal({
  open,
  onClose,
  onSend,
  sending,
  from,
  to,
  subject,
  body,
}: EmailPreviewModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Preview Email" size="lg">
      <div className="space-y-4">
        {from && (
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">From</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{from}</p>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">To</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">{to.join(', ')}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">{subject}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Body</p>
          <div
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 prose dark:prose-invert max-w-none text-sm max-h-[400px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={sending}>
            Cancel
          </button>
          <button type="button" onClick={onSend} disabled={sending} className="btn-primary">
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
