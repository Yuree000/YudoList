interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}

export function AuthField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  autoComplete,
  onChange,
}: AuthFieldProps) {
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="section-kicker">{label}</span>
      <div className="ink-input-shell">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-4 py-4 text-lg outline-none placeholder:opacity-70"
        />
      </div>
    </label>
  );
}
