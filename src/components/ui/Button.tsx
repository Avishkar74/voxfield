import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[#D14923] text-white hover:bg-[#B73D1C] disabled:bg-[#E8C3B5]",
  secondary:
    "border border-[#E5E1D8] bg-white text-[#1A1A1A] hover:bg-[#FAF9F5]",
  ghost: "text-[#57534E] hover:bg-[#FAF0ED]",
};

export function Button({
  variant = "primary",
  isLoading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D14923] disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {isLoading ? "Please wait..." : children}
    </button>
  );
}