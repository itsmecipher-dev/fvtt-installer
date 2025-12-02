import { useState } from 'react'
import { Globe, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { siDigitalocean, siCloudflare } from 'simple-icons'

interface Step {
  id: number
  title: string
  description: string
  highlight: ('user' | 'dns' | 'cloudflare' | 'server' | 'foundry')[]
  connectionActive: ('user-dns' | 'dns-cloudflare' | 'cloudflare-server' | 'server-foundry')[]
}

function BrandIcon({ svg, color, className = "w-8 h-8" }: { svg: string; color: string; className?: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: svg.replace('<svg', `<svg fill="${color}" class="${className}"`)
      }}
    />
  )
}

const STEPS: Step[] = [
  {
    id: 0,
    title: 'Your players visit your domain',
    description: 'When someone types foundry.yourdomain.com in their browser, the journey begins.',
    highlight: ['user'],
    connectionActive: [],
  },
  {
    id: 1,
    title: 'DNS lookup via Cloudflare',
    description: 'The browser asks "Where is this domain?" Cloudflare\'s DNS servers answer with your server\'s IP address.',
    highlight: ['dns'],
    connectionActive: ['user-dns'],
  },
  {
    id: 2,
    title: 'SSL encryption kicks in',
    description: 'Cloudflare provides a free SSL certificate, encrypting all traffic with HTTPS. Your data is secure.',
    highlight: ['cloudflare'],
    connectionActive: ['user-dns', 'dns-cloudflare'],
  },
  {
    id: 3,
    title: 'DDoS protection active',
    description: 'Cloudflare shields your server from attacks and malicious traffic, so only legitimate requests get through.',
    highlight: ['cloudflare'],
    connectionActive: ['user-dns', 'dns-cloudflare'],
  },
  {
    id: 4,
    title: 'Traffic reaches your server',
    description: 'Your DigitalOcean Droplet (a virtual server in the cloud) receives the request. It\'s always on, 24/7.',
    highlight: ['server'],
    connectionActive: ['user-dns', 'dns-cloudflare', 'cloudflare-server'],
  },
  {
    id: 5,
    title: 'Foundry VTT responds',
    description: 'Foundry VTT running on your server sends back the game interface. Your players can now join your session!',
    highlight: ['foundry'],
    connectionActive: ['user-dns', 'dns-cloudflare', 'cloudflare-server', 'server-foundry'],
  },
]

export function InfrastructureExplainer() {
  const [currentStep, setCurrentStep] = useState(0)

  const step = STEPS[currentStep]

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  const isHighlighted = (component: Step['highlight'][number]) =>
    step.highlight.includes(component)

  const isConnectionActive = (connection: Step['connectionActive'][number]) =>
    step.connectionActive.includes(connection)

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">How it all works together</h3>
        <span className="text-xs text-slate-500">{currentStep + 1} / {STEPS.length}</span>
      </div>

      {/* Diagram */}
      <div className="relative py-8">
        <div className="flex items-center justify-between gap-2">
          {/* User/Browser */}
          <div
            className={`flex flex-col items-center gap-2 transition-all duration-500 ${
              isHighlighted('user') ? 'scale-110' : 'opacity-40'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                isHighlighted('user')
                  ? 'bg-purple-500 shadow-lg shadow-purple-500/30'
                  : 'bg-slate-700'
              }`}
            >
              <Globe className="w-8 h-8 text-white" />
            </div>
            <span className="text-xs text-slate-400 text-center">Player's<br/>Browser</span>
          </div>

          {/* Connection: User -> DNS */}
          <div className="flex-1 flex items-center justify-center">
            <div
              className={`h-1 flex-1 rounded transition-all duration-500 ${
                isConnectionActive('user-dns')
                  ? 'bg-gradient-to-r from-purple-500 to-orange-500'
                  : 'bg-slate-700'
              }`}
            />
            <ArrowRight
              className={`w-5 h-5 mx-1 transition-colors duration-500 ${
                isConnectionActive('user-dns') ? 'text-orange-500' : 'text-slate-700'
              }`}
            />
          </div>

          {/* DNS/Cloudflare */}
          <div
            className={`flex flex-col items-center gap-2 transition-all duration-500 ${
              isHighlighted('dns') || isHighlighted('cloudflare') ? 'scale-110' : 'opacity-40'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                isHighlighted('dns') || isHighlighted('cloudflare')
                  ? 'bg-orange-500 shadow-lg shadow-orange-500/30'
                  : 'bg-slate-700'
              }`}
            >
              <BrandIcon svg={siCloudflare.svg} color="white" />
            </div>
            <span className="text-xs text-slate-400 text-center">Cloudflare<br/>DNS + SSL</span>
          </div>

          {/* Connection: Cloudflare -> Server */}
          <div className="flex-1 flex items-center justify-center">
            <div
              className={`h-1 flex-1 rounded transition-all duration-500 ${
                isConnectionActive('cloudflare-server')
                  ? 'bg-gradient-to-r from-orange-500 to-blue-500'
                  : 'bg-slate-700'
              }`}
            />
            <ArrowRight
              className={`w-5 h-5 mx-1 transition-colors duration-500 ${
                isConnectionActive('cloudflare-server') ? 'text-blue-500' : 'text-slate-700'
              }`}
            />
          </div>

          {/* DigitalOcean Server */}
          <div
            className={`flex flex-col items-center gap-2 transition-all duration-500 ${
              isHighlighted('server') ? 'scale-110' : 'opacity-40'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                isHighlighted('server')
                  ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                  : 'bg-slate-700'
              }`}
            >
              <BrandIcon svg={siDigitalocean.svg} color="white" />
            </div>
            <span className="text-xs text-slate-400 text-center">DigitalOcean<br/>Droplet</span>
          </div>

          {/* Connection: Server -> Foundry */}
          <div className="flex-1 flex items-center justify-center">
            <div
              className={`h-1 flex-1 rounded transition-all duration-500 ${
                isConnectionActive('server-foundry')
                  ? 'bg-gradient-to-r from-blue-500 to-green-500'
                  : 'bg-slate-700'
              }`}
            />
            <ArrowRight
              className={`w-5 h-5 mx-1 transition-colors duration-500 ${
                isConnectionActive('server-foundry') ? 'text-green-500' : 'text-slate-700'
              }`}
            />
          </div>

          {/* Foundry VTT */}
          <div
            className={`flex flex-col items-center gap-2 transition-all duration-500 ${
              isHighlighted('foundry') ? 'scale-110' : 'opacity-40'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                isHighlighted('foundry')
                  ? 'bg-green-500 shadow-lg shadow-green-500/30'
                  : 'bg-slate-700'
              }`}
            >
              <img
                src="https://r2.foundryvtt.com/website-static-public/assets/icons/fvtt.png"
                alt="Foundry VTT"
                className="w-8 h-8 object-contain"
              />
            </div>
            <span className="text-xs text-slate-400 text-center">Foundry<br/>VTT</span>
          </div>
        </div>

      </div>

      {/* Step info */}
      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <h4 className="font-medium text-white mb-1">{step.title}</h4>
        <p className="text-sm text-slate-400">{step.description}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            currentStep === 0
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-4 bg-blue-500'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          disabled={currentStep === STEPS.length - 1}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            currentStep === STEPS.length - 1
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
