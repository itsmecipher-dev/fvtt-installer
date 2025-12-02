import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
  sublabel?: string
}

interface SelectProps {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  placeholder?: string
}

export function Select({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  placeholder = 'Select an option...',
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer ${
            error ? 'border-red-500' : 'border-slate-600'
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.sublabel ? ` - ${option.sublabel}` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      </div>
      {hint && !error && <p className="text-sm text-slate-500">{hint}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
