'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { parsePricingRules } from '@/lib/pricing';
import type { SocialLinks } from '@/types';
import {
  HiOutlineCheckCircle,
  HiOutlineUserGroup,
  HiOutlineCalendarDays,
  HiOutlineQrCode,
  HiOutlineClipboardDocumentCheck,
} from 'react-icons/hi2';
import { FaInstagram, FaFacebook, FaLinkedin, FaYoutube } from 'react-icons/fa6';

interface SubEvent {
  id: string;
  name: string;
  date: string;
  status: string;
  pricingRules: string;
}

interface UpcomingEvent {
  id: string;
  name: string;
  date: string;
}

interface EventData {
  id: string;
  name: string;
  date: string;
  description: string;
  status: string;
  parentEventId: string;
  parentEventName: string;
  pricingRules: string;
  totalRegistrations: number;
  totalCheckins: number;
  memberCheckins: number;
  guestCheckins: number;
  subEvents: SubEvent[];
  siblingEvents: SubEvent[];
  upcomingEvents: UpcomingEvent[];
}

const SOCIAL_PLATFORMS: { key: keyof SocialLinks; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'from-pink-500 to-purple-600' },
  { key: 'facebook', label: 'Facebook', icon: FaFacebook, color: 'from-blue-600 to-blue-700' },
  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: 'from-blue-500 to-blue-600' },
  { key: 'youtube', label: 'YouTube', icon: FaYoutube, color: 'from-red-500 to-red-600' },
];

export default function EventHomePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const json = await res.json();
      if (json.success) {
        setEvent(json.data);
      } else {
        setError('Event not found.');
      }
    } catch {
      setError('Failed to load event.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
    const interval = setInterval(fetchEvent, 30000);
    return () => clearInterval(interval);
  }, [fetchEvent]);

  // Fetch social links
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/public');
        const json = await res.json();
        if (json.success && json.data?.socialLinks) {
          const links = json.data.socialLinks as SocialLinks;
          const hasAny = Object.values(links).some((v) => v);
          if (hasAny) setSocialLinks(links);
        }
      } catch {
        // Social links are optional
      }
    })();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${eventId}/checkin`
    : '';

  const registerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${eventId}/register`
    : '';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <p className="text-red-600 font-semibold text-lg">{error || 'Event not found'}</p>
        </div>
      </div>
    );
  }

  const rules = parsePricingRules(event.pricingRules);
  const hasPricing = rules.enabled && rules.model !== 'free';
  const hasUpcomingEvents = event.upcomingEvents && event.upcomingEvents.length > 0;
  const hasSidebar = hasUpcomingEvents || !!socialLinks;
  const activeSocialPlatforms = socialLinks
    ? SOCIAL_PLATFORMS.filter((p) => socialLinks[p.key])
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className={`relative z-10 mx-auto px-4 py-8 md:py-12 min-h-screen ${
        hasSidebar
          ? 'max-w-6xl lg:grid lg:grid-cols-[minmax(0,36rem)_1fr] lg:gap-8'
          : 'max-w-xl'
      }`}>

        {/* ===== LEFT COLUMN (main content) ===== */}
        <div className="flex flex-col">

          {/* Parent event breadcrumb */}
          {event.parentEventId && event.parentEventName && (
            <div className="text-center mb-2">
              <button
                onClick={() => router.push(`/events/${event.parentEventId}/home`)}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                &larr; {event.parentEventName}
              </button>
            </div>
          )}

          {/* ===== HERO ===== */}
          <div className="text-center pt-4 pb-8 md:pb-10">
            {/* Status pill */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 bg-white/15 text-white backdrop-blur-md border border-white/20">
              <span className={`w-2 h-2 rounded-full ${
                event.status === 'Upcoming' ? 'bg-emerald-400 animate-pulse' :
                event.status === 'Completed' ? 'bg-gray-300' : 'bg-red-400'
              }`} />
              {event.status}
            </div>

            {/* Event name */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">
              {event.name}
            </h1>

            {/* Date */}
            <div className="inline-flex items-center gap-2 text-white/80 text-lg md:text-xl">
              <HiOutlineCalendarDays className="w-5 h-5 flex-shrink-0" />
              <span>{formatDate(event.date)}</span>
            </div>

            {/* Description */}
            {event.description && (
              <p className="mt-4 text-white/60 text-sm md:text-base max-w-md mx-auto leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* ===== LIVE STATS ===== */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10">
              <HiOutlineClipboardDocumentCheck className="w-7 h-7 mx-auto mb-1 text-emerald-300" />
              <p className="text-3xl font-bold text-white">{event.totalCheckins}</p>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wide">Checked In</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/10">
              <HiOutlineUserGroup className="w-7 h-7 mx-auto mb-1 text-amber-300" />
              <p className="text-3xl font-bold text-white">{event.totalRegistrations}</p>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wide">Registered</p>
            </div>
          </div>

          {/* ===== CHECK-IN BUTTON (hero CTA) ===== */}
          <button
            onClick={() => router.push(`/events/${eventId}/checkin`)}
            className="group w-full bg-white rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/20 hover:shadow-black/30 active:scale-[0.98] transition-all duration-200 mb-6"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-2xl md:text-3xl font-bold text-gray-900">Check In</p>
                <p className="text-sm md:text-base text-gray-500 mt-1">Tap to check in to the event</p>
              </div>
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                <HiOutlineCheckCircle className="w-8 h-8 md:w-9 md:h-9 text-white" />
              </div>
            </div>
          </button>

          {/* ===== QR CODE CARD ===== */}
          <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-black/10 text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HiOutlineQrCode className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Scan to Check In</h2>
            </div>
            <div className="inline-block bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-inner">
              {checkinUrl && <QRCode value={checkinUrl} size={180} level="H" />}
            </div>
            <p className="text-xs text-gray-400 mt-4">Point your phone camera at the code above</p>
          </div>

          {/* ===== PRICING INFO ===== */}
          {hasPricing && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/60 font-medium">Member</p>
                  <p className="text-2xl font-bold text-white">${rules.memberPrice}</p>
                  <p className="text-[10px] text-white/40">
                    {rules.model === 'per_family' ? 'per family' : 'per adult'}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/60 font-medium">Guest</p>
                  <p className="text-2xl font-bold text-white">${rules.guestPrice}</p>
                  <p className="text-[10px] text-white/40">
                    {rules.model === 'per_family' ? 'per family' : 'per adult'}
                  </p>
                </div>
              </div>
              {rules.kidPrice > 0 && (
                <p className="text-xs text-white/50 text-center mt-2">
                  Kids: ${rules.kidPrice} each
                  {rules.kidsFreeUnderAge > 0 && ` (under ${rules.kidsFreeUnderAge} free)`}
                </p>
              )}
            </div>
          )}

          {/* ===== SUB-EVENTS ===== */}
          {event.subEvents && event.subEvents.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Activities</h3>
              <div className="space-y-2">
                {event.subEvents.map((sub) => {
                  const subRules = parsePricingRules(sub.pricingRules);
                  const subPriceLabel = subRules.enabled && subRules.model !== 'free'
                    ? `$${subRules.memberPrice}`
                    : 'Free';
                  return (
                    <button
                      key={sub.id}
                      onClick={() => router.push(`/events/${sub.id}/home`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left border border-white/5"
                    >
                      <div>
                        <p className="font-semibold text-white text-sm">{sub.name}</p>
                        <p className="text-xs text-white/50">{formatDate(sub.date)}</p>
                      </div>
                      <span className="text-sm font-bold text-white/80">{subPriceLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== SOCIAL QR CODES (mobile — shown below main content) ===== */}
          {activeSocialPlatforms.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6 lg:hidden">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Follow Us</h3>
              <div className="grid grid-cols-2 gap-3">
                {activeSocialPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  const url = socialLinks![platform.key];
                  return (
                    <div key={platform.key} className="bg-white rounded-xl p-3 text-center">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="inline-block bg-white p-2 rounded-lg border border-gray-100">
                        <QRCode value={url} size={80} level="M" />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 font-medium">{platform.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== UPCOMING EVENTS (mobile — shown below main content) ===== */}
          {hasUpcomingEvents && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6 lg:hidden">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Upcoming Events</h3>
              <div className="space-y-2">
                {event.upcomingEvents.map((ue) => (
                  <button
                    key={ue.id}
                    onClick={() => router.push(`/events/${ue.id}/home`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left border border-white/5"
                  >
                    <p className="font-semibold text-white text-sm">{ue.name}</p>
                    <span className="text-xs text-white/60 flex-shrink-0 ml-2">{formatDateShort(ue.date)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== REGISTER BUTTON ===== */}
          {event.status === 'Upcoming' && (
            <button
              onClick={() => router.push(registerUrl.replace(window.location.origin, ''))}
              className="w-full py-4 rounded-2xl text-white font-semibold text-lg border-2 border-white/25 bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-[0.98] transition-all duration-200 mb-6"
            >
              Register for this Event
            </button>
          )}

          {/* Spacer to push footer down */}
          <div className="flex-1" />

          {/* ===== FOOTER ===== */}
          <div className="text-center py-6">
            <p className="text-xs text-white/30">
              {event.name} &middot; {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* ===== RIGHT COLUMN (sidebar — desktop only) ===== */}
        {hasSidebar && (
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Social QR Codes */}
              {activeSocialPlatforms.length > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Follow Us</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {activeSocialPlatforms.map((platform) => {
                      const Icon = platform.icon;
                      const url = socialLinks![platform.key];
                      return (
                        <div key={platform.key} className="bg-white rounded-xl p-3 text-center">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center mx-auto mb-2`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="inline-block bg-white p-2 rounded-lg border border-gray-100">
                            <QRCode value={url} size={100} level="M" />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-medium">{platform.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Events */}
              {hasUpcomingEvents && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Upcoming Events</h3>
                  <div className="space-y-2">
                    {event.upcomingEvents.map((ue) => (
                      <button
                        key={ue.id}
                        onClick={() => router.push(`/events/${ue.id}/home`)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left border border-white/5"
                      >
                        <div>
                          <p className="font-semibold text-white text-sm">{ue.name}</p>
                          <p className="text-xs text-white/50">{formatDateShort(ue.date)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
