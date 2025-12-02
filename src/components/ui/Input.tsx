import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  secret?: boolean
}

export function Input({
  label,
  error,
  hint,
  secret = false,
  className = '',
  ...props
}: InputProps) {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          type={secret && !showSecret ? 'password' : 'text'}
          className={`w-full px-4 py-2.5 bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            error ? 'border-red-500' : 'border-slate-600'
          } ${secret ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
          >
            {showSecret ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p className="text-sm text-slate-500">{hint}</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
