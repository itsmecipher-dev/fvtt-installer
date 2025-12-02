import { Info } from 'lucide-react'
import { useState } from 'react'

interface Props {
  content: string
}

export function InfoTooltip({ content }: Props) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-slate-500 hover:text-slate-400 transition-colors ml-1"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-slate-200 bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </span>
  )
}
