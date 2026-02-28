'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  filterable?: boolean;
  sortFn?: (a: T, b: T) => number;
  filterOptions?: string[];
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

type SortDir = 'asc' | 'desc' | null;

const SortIcon = ({ dir }: { dir: SortDir }) => (
  <svg className="inline w-3 h-3 ml-1" viewBox="0 0 10 14" fill="none">
    <path d="M5 0L9 5H1L5 0Z" fill={dir === 'asc' ? 'currentColor' : 'currentColor'} opacity={dir === 'asc' ? 1 : 0.25} />
    <path d="M5 14L1 9H9L5 14Z" fill={dir === 'desc' ? 'currentColor' : 'currentColor'} opacity={dir === 'desc' ? 1 : 0.25} />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1.5 2.5h13M4 6h8M6 9.5h4M7 13h2" strokeLinecap="round" />
  </svg>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = 'No records found',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const hasFilterable = columns.some((c) => c.filterable);

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFilters = () => {
    if (showFilters) {
      setFilters({});
    }
    setShowFilters((v) => !v);
  };

  const processedData = useMemo(() => {
    let result = [...data];

    for (const col of columns) {
      const val = filters[col.key];
      if (!val || !col.filterable) continue;
      if (col.filterOptions) {
        result = result.filter((item) => String(item[col.key] ?? '') === val);
      } else {
        const lower = val.toLowerCase();
        result = result.filter((item) => String(item[col.key] ?? '').toLowerCase().includes(lower));
      }
    }

    if (sortKey && sortDir) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        result.sort((a, b) => {
          let cmp: number;
          if (col.sortFn) {
            cmp = col.sortFn(a, b);
          } else {
            cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { numeric: true });
          }
          return sortDir === 'desc' ? -cmp : cmp;
        });
      }
    }

    return result;
  }, [data, columns, filters, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const isFiltered = Object.values(filters).some((v) => v);

  return (
    <div className="card overflow-hidden">
      {hasFilterable && (
        <div className="px-2 py-1.5 md:px-4 md:py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end">
          <button
            onClick={toggleFilters}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              showFilters
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50',
            )}
          >
            <FilterIcon />
            {showFilters ? 'Hide Filters' : 'Filter'}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
                    col.className,
                  )}
                  onClick={() => handleSort(col)}
                >
                  {col.header}
                  {col.sortable && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                </th>
              ))}
            </tr>
            {hasFilterable && showFilters && (
              <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                {columns.map((col) => (
                  <th key={col.key} className="px-2 py-1 md:px-4">
                    {col.filterable ? (
                      col.filterOptions ? (
                        <select
                          value={filters[col.key] || ''}
                          onChange={(e) => setFilter(col.key, e.target.value)}
                          className="w-full text-xs px-1.5 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          <option value="">All</option>
                          {col.filterOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={filters[col.key] || ''}
                          onChange={(e) => setFilter(col.key, e.target.value)}
                          placeholder="Filter..."
                          className="w-full text-xs px-1.5 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400"
                        />
                      )
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-8 md:px-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {isFiltered ? 'No matching records' : emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map((item, idx) => (
                <tr
                  key={String(item.id || idx)}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-2 py-2 md:px-4 md:py-3 text-sm text-gray-900 dark:text-gray-100', col.className)}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data.length > 0 && (
        <div className="px-2 py-2 md:px-4 md:py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {isFiltered
            ? `Showing ${processedData.length} of ${data.length} records`
            : `Showing ${data.length} ${data.length === 1 ? 'record' : 'records'}`}
        </div>
      )}
    </div>
  );
}
