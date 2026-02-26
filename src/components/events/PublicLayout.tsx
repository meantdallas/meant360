'use client';

interface PublicLayoutProps {
  eventName?: string;
  children: React.ReactNode;
}

export default function PublicLayout({ eventName, children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50">
      {/* Compact header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">NT</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {eventName || 'Event'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
