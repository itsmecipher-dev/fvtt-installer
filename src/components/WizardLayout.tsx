import { CheckCircle } from 'lucide-react'

interface Step {
  title: string
  description: string
}

interface WizardLayoutProps {
  steps: Step[]
  currentStep: number
  children: React.ReactNode
}

export function WizardLayout({ steps, currentStep, children }: WizardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="" className="w-14 h-14" />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">
                Foundry VTT Cloud Installer
              </h1>
              <p className="text-slate-400">
                Deploy your own Foundry VTT server in minutes
              </p>
            </div>
          </div>
          <a
            href="/faq.html"
            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            FAQ
          </a>
        </header>

        <nav className="mb-8 overflow-x-auto">
          <ol className="flex items-center justify-center gap-1 min-w-max px-4">
            {steps.map((step, index) => (
              <li key={index} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors text-sm font-medium ${
                    index === currentStep
                      ? 'bg-blue-600 text-white'
                      : index < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                  title={step.title}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-6 h-0.5 mx-0.5 ${
                    index < currentStep ? 'bg-green-600' : 'bg-slate-700'
                  }`} />
                )}
              </li>
            ))}
          </ol>
        </nav>

        <main className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 shadow-2xl">
          {currentStep > 0 && (
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                {steps[currentStep]?.title}
              </h2>
              {steps[currentStep]?.description && (
                <p className="text-slate-400 text-sm mt-1">
                  {steps[currentStep]?.description}
                </p>
              )}
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>

        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>
            Your credentials never leave your browser. All API calls are made
            directly from your device.
          </p>
        </footer>
      </div>
    </div>
  )
}
