import { siDigitalocean } from 'simple-icons'
import { Check } from 'lucide-react'
import { Button } from '../ui/Button'
import type { ProviderId } from '../../api/providers/types'
import { getAllProviders, getProviderMetadata } from '../../api/providers'
import { providerDisplayInfo, providerFeatures, providerPricingTiers } from '../../api/providers/metadata'

const digitalOceanSvg = siDigitalocean.svg

interface Props {
  selectedProvider: ProviderId
  onSelectProvider: (provider: ProviderId) => void
  onNext: () => void
  onBack: () => void
}

const hetznerSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0v24h24V0zm18.08 18.45h-2.15v-5.93h-2.74l-.01 2.06c-.01 2.12-.08 3.08-.38 3.64-.42.76-1.2 1.06-2.14 1.06-.42 0-.94-.08-1.33-.22l.19-1.74c.22.08.44.12.68.12.51 0 .82-.3.95-.87.08-.38.1-.87.1-2.49l.02-3.3h6.81zm-9.87 0H5.92V5.55h2.29v5.26h3.56V5.55h2.29v12.9h-2.29v-5.61H8.21z"/></svg>`

function ProviderIcon({ provider, size = 'lg' }: { provider: ProviderId; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
  const innerSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'

  if (provider === 'digitalocean') {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center`}
        dangerouslySetInnerHTML={{
          __html: digitalOceanSvg.replace('<svg', `<svg fill="#0080FF" class="${innerSize}"`)
        }}
      />
    )
  }

  if (provider === 'hetzner') {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center`}
        dangerouslySetInnerHTML={{
          __html: hetznerSvg.replace('<svg', `<svg fill="#D50C2D" class="${innerSize}"`)
        }}
      />
    )
  }

  return null
}

export function ProviderSelectionStep({ selectedProvider, onSelectProvider, onNext, onBack }: Props) {
  const providers = getAllProviders()

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Choose Your Cloud Provider</h2>
        <p className="text-slate-400">
          Select where you want to host your Foundry VTT server
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const display = providerDisplayInfo[provider.id]
          const features = providerFeatures[provider.id]
          const pricing = providerPricingTiers[provider.id]
          const isSelected = selectedProvider === provider.id
          const minPrice = pricing?.reduce((min, p) => p.priceMonthly < min ? p.priceMonthly : min, pricing[0]?.priceMonthly || 0)

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectProvider(provider.id)}
              className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <ProviderIcon provider={provider.id} />
                <div>
                  <h3 className="text-lg font-semibold text-white">{display.displayName}</h3>
                  <p className="text-sm text-slate-400">{display.tagline}</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-4">{display.description}</p>

              <div className="space-y-2 mb-4">
                {features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={feature.supported ? 'text-green-400' : 'text-slate-500'}>
                      {feature.supported ? '✓' : '—'}
                    </span>
                    <span className={feature.supported ? 'text-slate-300' : 'text-slate-500'}>
                      {feature.name}
                      {feature.note && (
                        <span className="text-slate-500 ml-1">({feature.note})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Starting from</span>
                  <span className="text-lg font-semibold text-white">
                    {provider.pricing.currency === 'EUR' ? '€' : '$'}
                    {minPrice || provider.pricing.minMonthly}
                    <span className="text-sm font-normal text-slate-400">/mo</span>
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <h3 className="font-medium text-white mb-3">Provider Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Feature</th>
                {providers.map(p => (
                  <th key={p.id} className="pb-2 text-center">
                    <ProviderIcon provider={p.id} size="sm" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr>
                <td className="py-1.5">Compute Regions</td>
                <td className="py-1.5 text-center">11 worldwide</td>
                <td className="py-1.5 text-center">5 (EU + US)</td>
              </tr>
              <tr>
                <td className="py-1.5">Storage Regions</td>
                <td className="py-1.5 text-center">6</td>
                <td className="py-1.5 text-center">3 (EU only)</td>
              </tr>
              <tr>
                <td className="py-1.5">Auto S3 Key Creation</td>
                <td className="py-1.5 text-center text-green-400">✓</td>
                <td className="py-1.5 text-center text-slate-500">Manual</td>
              </tr>
              <tr>
                <td className="py-1.5">Built-in Monitoring</td>
                <td className="py-1.5 text-center text-green-400">✓</td>
                <td className="py-1.5 text-center text-slate-500">—</td>
              </tr>
              <tr>
                <td className="py-1.5">Min Server Price</td>
                <td className="py-1.5 text-center">$6/mo</td>
                <td className="py-1.5 text-center">€3.79/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
        <h3 className="font-medium text-blue-400 mb-2">Not sure which to pick?</h3>
        <p className="text-sm text-slate-300">
          <strong>DigitalOcean</strong> is recommended for beginners — it has more regions,
          automated storage setup, and excellent documentation. <strong>Hetzner</strong> offers
          better value in Europe with competitive pricing, but requires manual S3 key configuration.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue with {getProviderMetadata(selectedProvider).displayName}
        </Button>
      </div>
    </div>
  )
}
