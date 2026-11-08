import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-bubble font-bold " +
  "min-h-[44px] min-w-[44px] px-5 py-3 text-lg transition-colors " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-garden-leaf text-white hover:bg-[#276f3e]",
  secondary: "bg-white text-garden-ink border-2 border-garden-leaf hover:bg-garden-sky",
  ghost: "bg-transparent text-garden-ink hover:bg-white/60",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
