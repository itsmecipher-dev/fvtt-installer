import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
}

export function Alert({ type, title, children }: AlertProps) {
  const styles = {
    info: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      icon: <Info className="w-5 h-5 text-blue-400" />,
      title: 'text-blue-400',
    },
    success: {
      bg: 'bg-green-500/10 border-green-500/30',
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      title: 'text-green-400',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
      title: 'text-amber-400',
    },
    error: {
      bg: 'bg-red-500/10 border-red-500/30',
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      title: 'text-red-400',
    },
  }

  const style = styles[type]

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${style.bg}`}>
      <div className="shrink-0">{style.icon}</div>
      <div className="space-y-1">
        {title && (
          <p className={`font-medium ${style.title}`}>{title}</p>
        )}
        <div className="text-sm text-slate-300">{children}</div>
      </div>
    </div>
  )
}
