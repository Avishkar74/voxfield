import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-[#57534E]"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={`h-11 min-h-11 rounded-lg border border-[#E5E1D8] bg-white px-3 text-base text-[#131212] outline-none transition focus:border-[#D14923] focus:ring-2 focus:ring-[#FAF0ED] ${error ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}