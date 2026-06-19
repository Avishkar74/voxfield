import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ label: string; value: string }>;
}

export function Select({
  label,
  error,
  id,
  options,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <select
        id={selectId}
        className={`h-11 min-h-11 rounded-lg border border-[#E5E1D8] bg-white px-3 text-base text-[#1A1A1A] outline-none transition focus:border-[#D14923] focus:ring-2 focus:ring-[#FAF0ED] ${error ? "border-red-500" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
