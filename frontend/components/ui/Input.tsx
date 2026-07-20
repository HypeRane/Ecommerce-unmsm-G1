import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full rounded-lg border bg-background-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold disabled:opacity-50 disabled:cursor-not-allowed ${icon ? "pl-10" : ""} ${error ? "border-red" : "border-border-light hover:border-border-light"} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
