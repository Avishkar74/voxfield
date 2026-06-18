import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DetailPageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  /** Where the back link points. Defaults to the role dashboard via the browser back affordance. */
  backHref?: string;
}

export function DetailPageHeader({ title, subtitle, count, backHref }: DetailPageHeaderProps) {
  return (
    <header className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="flex-shrink-0 p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && <p className="text-xs md:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {typeof count === "number" && (
        <span className="self-start sm:self-auto text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-[#FAF0ED] text-[#D14923] rounded-full border border-[#FAD5C5]">
          {count} total
        </span>
      )}
    </header>
  );
}
