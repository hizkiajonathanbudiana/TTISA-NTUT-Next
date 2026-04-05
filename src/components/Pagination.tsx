import { Fragment } from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
}

const buildVisiblePages = (current: number, total: number, maxVisible: number) => {
  const pages: Array<number | 'ellipsis'> = [];
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, current + half);

  if (end - start + 1 < maxVisible) {
    if (start === 1) {
      end = Math.min(total, start + maxVisible - 1);
    } else if (end === total) {
      start = Math.max(1, end - maxVisible + 1);
    }
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) {
      pages.push('ellipsis');
    }
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < total) {
    if (end < total - 1) {
      pages.push('ellipsis');
    }
    pages.push(total);
  }

  return pages;
};

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = buildVisiblePages(currentPage, totalPages, maxVisiblePages);

  return (
    <div className="mt-6 flex items-center justify-center space-x-1">
      {showFirstLast && currentPage > 1 && (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-neutral-50"
          aria-label="First page"
        >
          ««
        </button>
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-md border border-border px-3 py-2 text-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>

      {visiblePages.map((page, index) => (
        <Fragment key={`${page}-${index}`}>
          {page === 'ellipsis' ? (
            <span className="px-2 py-2 text-sm text-text-secondary">…</span>
          ) : (
            <button
              type="button"
              onClick={() => onPageChange(page)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                currentPage === page
                  ? 'border-primary bg-primary text-white'
                  : 'border-border text-text-secondary hover:bg-neutral-50'
              }`}
            >
              {page}
            </button>
          )}
        </Fragment>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-md border border-border px-3 py-2 text-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>

      {showFirstLast && currentPage < totalPages && (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-neutral-50"
          aria-label="Last page"
        >
          »»
        </button>
      )}
    </div>
  );
};
