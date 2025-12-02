import { useState } from 'react'
import { Globe, Building2, Server, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { siDigitalocean, siCloudflare } from 'simple-icons'

function BrandIcon({ svg, color, className = "w-6 h-6" }: { svg: string; color: string; className?: string }) {
  return (
    <div
      className="flex items-center justify-center"
      dangerouslySetInnerHTML={{
        __html: svg.replace('<svg', `<svg fill="${color}" class="${className}"`)
      }}
    />
  )
}

interface Slide {
  id: number
  title: string
  content: React.ReactNode
}

const SLIDES: Slide[] = [
  {
    id: 0,
    title: 'What is a Domain?',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="px-4 py-2 bg-slate-700 rounded-lg font-mono text-blue-400">
            foundry.yourdomain.com
          </div>
        </div>
        <p className="text-slate-300 text-sm">
          A domain is a human-readable address for a website. Instead of remembering
          <code className="px-1.5 py-0.5 bg-slate-800 rounded mx-1">167.99.123.45</code>,
          you can just type <code className="px-1.5 py-0.5 bg-slate-800 rounded mx-1">yourdomain.com</code>.
        </p>
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-300 text-sm">
            <strong>Important:</strong> Domains are <em>rented</em>, not owned. You pay a yearly fee
            (typically $10-15/year) to keep your domain. If you don't renew, someone else can register it!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    title: 'What is a Registrar?',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-slate-400">Registrar</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500" />
          <div className="px-3 py-2 bg-slate-700 rounded-lg">
            <span className="font-mono text-sm text-green-400">yourdomain.com</span>
          </div>
        </div>
        <p className="text-slate-300 text-sm">
          A <strong>registrar</strong> is a company authorized to sell domain names. Popular registrars include:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Namecheap', 'Google Domains', 'GoDaddy', 'Cloudflare', 'Porkbun'].map((name) => (
            <span key={name} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
              {name}
            </span>
          ))}
        </div>
        <p className="text-slate-400 text-sm">
          You can buy your domain from any registrar — the choice doesn't affect how your site works.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    title: 'What is DNS?',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-slate-400">Browser</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] text-slate-500">asks</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center">
              <Server className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-slate-400">DNS Server</span>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] text-slate-500">returns</span>
          </div>
          <div className="px-2 py-1 bg-slate-700 rounded font-mono text-xs text-green-400">
            167.99.123.45
          </div>
        </div>
        <p className="text-slate-300 text-sm">
          <strong>DNS</strong> (Domain Name System) is like a phone book for the internet.
          When you type a domain, DNS servers translate it into an IP address that computers understand.
        </p>
        <p className="text-slate-400 text-sm">
          Every domain needs DNS records that point to the right server. This is where Cloudflare comes in...
        </p>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Where Cloudflare Fits In',
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg bg-purple-600/30 border border-purple-500/50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-300" />
            </div>
            <span className="text-[10px] text-slate-500">Registrar</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg bg-orange-500/30 border border-orange-500/50 flex items-center justify-center">
              <BrandIcon svg={siCloudflare.svg} color="#F38020" className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-500">Cloudflare</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg bg-blue-500/30 border border-blue-500/50 flex items-center justify-center">
              <BrandIcon svg={siDigitalocean.svg} color="#0080FF" className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-slate-500">DigitalOcean</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-slate-300">
            <strong className="text-orange-400">Cloudflare</strong> acts as your DNS provider. You point your domain's
            nameservers to Cloudflare, and they handle:
          </p>
          <ul className="space-y-1 text-slate-400 ml-4">
            <li>• <span className="text-slate-300">DNS records</span> — pointing your domain to your server</li>
            <li>• <span className="text-slate-300">Free SSL certificates</span> — enabling HTTPS</li>
            <li>• <span className="text-slate-300">DDoS protection</span> — blocking attacks</li>
            <li>• <span className="text-slate-300">Caching</span> — making your site faster</li>
          </ul>
        </div>
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-300 text-sm">
            <strong>Best part:</strong> All these features are included in Cloudflare's free tier!
          </p>
        </div>
      </div>
    ),
  },
]

export function DnsExplainer() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1))
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0))

  const slide = SLIDES[currentSlide]

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">{slide.title}</h3>
        <span className="text-xs text-slate-500">{currentSlide + 1} / {SLIDES.length}</span>
      </div>

      <div className="min-h-[200px]">
        {slide.content}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            currentSlide === 0
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-4 bg-blue-500'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlide === SLIDES.length - 1}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            currentSlide === SLIDES.length - 1
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
