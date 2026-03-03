'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';

interface GuestRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  referredBy: string;
  eventsAttended: string;
  lastEventDate: string;
  eventNames: string[];
}

export default function GuestsPage() {
  const [records, setRecords] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ include: 'events' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/members/guests?${params}`);
      const json = await res.json();
      if (json.success) setRecords(json.data);
    } catch {
      toast.error('Failed to fetch guests');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const columns: Column<GuestRecord>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'email', header: 'Email', sortable: true, filterable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'city', header: 'City', sortable: true, filterable: true },
    { key: 'referredBy', header: 'Referred By', sortable: true, filterable: true },
    {
      key: 'eventsAttended',
      header: 'Events',
      sortable: true,
      render: (item) => {
        const count = Number(item.eventsAttended) || 0;
        return (
          <StatusBadge
            status={count > 0 ? `${count} event${count !== 1 ? 's' : ''}` : 'None'}
            className={count > 0 ? undefined : 'opacity-50'}
          />
        );
      },
    },
    {
      key: 'eventNames' as keyof GuestRecord,
      header: 'Events Attended',
      render: (item) => {
        if (!item.eventNames || item.eventNames.length === 0) {
          return <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {item.eventNames.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
              >
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'lastEventDate',
      header: 'Last Event',
      sortable: true,
      render: (item) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {item.lastEventDate ? formatDate(item.lastEventDate) : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Guests"
        description={`${records.length} guest${records.length !== 1 ? 's' : ''} across all events`}
      />

      <div className="mb-4">
        <div className="relative max-w-sm">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
      </div>

      <DataTable columns={columns} data={records} loading={loading} emptyMessage="No guests found" />
    </>
  );
}
