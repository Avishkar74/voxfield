interface AlertProps {
  message: string;
  variant?: "error" | "success" | "info";
}

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  info: "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

export function Alert({ message, variant = "error" }: AlertProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]}`}
      role="alert"
    >
      {message}
    </div>
  );
}
