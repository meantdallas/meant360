'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  HiOutlineCog6Tooth,
  HiOutlineCalendarDays,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [testingSquare, setTestingSquare] = useState(false);
  const [testingPayPal, setTestingPayPal] = useState(false);
  const [squareStatus, setSquareStatus] = useState<boolean | null>(null);
  const [paypalStatus, setPaypalStatus] = useState<boolean | null>(null);

  const testConnection = async (source: 'square' | 'paypal') => {
    const setTesting = source === 'square' ? setTestingSquare : setTestingPayPal;
    const setStatus = source === 'square' ? setSquareStatus : setPaypalStatus;

    setTesting(true);
    try {
      // Attempt to sync 0 days to test the connection
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: source === 'square' ? 'Square' : 'PayPal',
          startDate: today,
          endDate: today,
        }),
      });
      const json = await res.json();
      setStatus(json.success);
      if (json.success) toast.success(`${source === 'square' ? 'Square' : 'PayPal'} connection successful`);
      else toast.error(`${source === 'square' ? 'Square' : 'PayPal'} connection failed: ${json.error}`);
    } catch {
      setStatus(false);
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const role = (session?.user as Record<string, unknown>)?.role as string;

  return (
    <AppLayout>
      <PageHeader title="Settings" description="Application configuration and integrations" />

      <div className="space-y-6 max-w-2xl">
        {/* User Info */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HiOutlineCog6Tooth className="w-5 h-5" /> Account
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{session?.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{session?.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role</span>
              <span className="font-medium capitalize">{role}</span>
            </div>
          </div>
        </div>

        {/* Events Link */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HiOutlineCalendarDays className="w-5 h-5" /> Events
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Manage your events used across income, expenses, and sponsorship records.
          </p>
          <Link href="/settings/events" className="btn-secondary inline-flex items-center gap-2">
            <HiOutlineCalendarDays className="w-4 h-4" /> Manage Events
          </Link>
        </div>

        {/* Integration Status */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HiOutlineArrowPath className="w-5 h-5" /> Payment Integrations
          </h3>

          <div className="space-y-4">
            {/* Square */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">SQ</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Square</p>
                  <p className="text-xs text-gray-500">Transaction sync (read-only)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {squareStatus !== null && (
                  squareStatus ? (
                    <HiOutlineCheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <HiOutlineXCircle className="w-5 h-5 text-red-500" />
                  )
                )}
                <button
                  onClick={() => testConnection('square')}
                  disabled={testingSquare}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {testingSquare ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>

            {/* PayPal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">PP</span>
                </div>
                <div>
                  <p className="font-medium text-sm">PayPal</p>
                  <p className="text-xs text-gray-500">Transaction sync (read-only)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {paypalStatus !== null && (
                  paypalStatus ? (
                    <HiOutlineCheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <HiOutlineXCircle className="w-5 h-5 text-red-500" />
                  )
                )}
                <button
                  onClick={() => testConnection('paypal')}
                  disabled={testingPayPal}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {testingPayPal ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sheets Info */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Google Sheets Database</h3>
          <p className="text-sm text-gray-500 mb-3">
            All data is stored in Google Sheets. The following tabs are used:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {['Income', 'Sponsorship', 'Expenses', 'Reimbursements', 'Transactions', 'Events', 'Members'].map((tab) => (
              <div key={tab} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                {tab}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
