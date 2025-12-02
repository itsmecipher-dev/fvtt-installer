import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface CollapsibleProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({
  title,
  children,
  defaultOpen = false,
  className = '',
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`border border-slate-600 rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-700/50 hover:bg-slate-700 transition-colors text-left"
      >
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="p-4 bg-slate-800/50 border-t border-slate-600">
          {children}
        </div>
      )}
    </div>
  )
}
