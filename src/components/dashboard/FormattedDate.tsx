"use client";

import { useEffect, useState } from "react";

interface FormattedDateProps {
  date: string | Date;
  includeTime?: boolean;
}

export function FormattedDate({ date, includeTime = false }: FormattedDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a consistent layout/placeholder during SSR
    return <span className="opacity-0">Loading...</span>;
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return <span>Invalid Date</span>;
  }

  if (includeTime) {
    return <span>{dateObj.toLocaleString()}</span>;
  }

  return <span>{dateObj.toLocaleDateString()}</span>;
}
