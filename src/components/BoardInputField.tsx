type BoardInputProps = {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
};

export default function BoardInputField({ value, onChange, placeholder }: BoardInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="block w-full border border-gray-700 p-2 rounded mb-2"
    />
  );
}