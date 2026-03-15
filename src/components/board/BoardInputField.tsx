import { forwardRef } from "react";

type BoardInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  error?: string;
};

const BoardInputField = forwardRef<HTMLInputElement, BoardInputProps>(
  function BoardInputField({ id, label, value, onChange, placeholder, error }, ref) {
    const errorId = error ? `${id}-error` : undefined;

    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label htmlFor={id}>{label}</label>
          {error && (
            <span id={errorId} role="alert" className="text-red-500 text-xs">
              {error}
            </span>
          )}
        </div>
        <input
          ref={ref}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={errorId}
          aria-invalid={!!error}
          className="block w-full border p-2 rounded mb-2 border-gray-700"
        />
      </div>
    );
  }
);

export default BoardInputField;