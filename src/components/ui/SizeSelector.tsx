import { Check } from 'lucide-react'
import type { Size } from '../../types'

interface SizeSelectorProps {
  sizes: Size[]
  value: string
  onChange: (value: string) => void
}

interface TierConfig {
  id: string
  title: string
  subtitle: string
  badge?: string
  badgeColor?: string
  memory: number // in MB
  vcpus: number
}

const TIER_CONFIGS: TierConfig[] = [
  {
    id: 'budget',
    title: 'Budget',
    subtitle: '1-4 players, light modules',
    memory: 1024,
    vcpus: 1,
  },
  {
    id: 'standard',
    title: 'Standard',
    subtitle: '4-6 players, typical usage',
    badge: 'Recommended',
    badgeColor: 'bg-blue-500',
    memory: 2048,
    vcpus: 1,
  },
  {
    id: 'performance',
    title: 'Performance',
    subtitle: '7+ players, heavy modules',
    badge: 'Overkill',
    badgeColor: 'bg-purple-500',
    memory: 4096,
    vcpus: 2,
  },
]

function getSizesForTier(sizes: Size[], memory: number, vcpus: number): Size[] {
  const filtered = sizes
    .filter((s) => s.memory === memory && s.vcpus === vcpus)
    // Exclude premium CPU-optimized tiers (c-*, c2-*)
    .filter((s) => !s.slug.startsWith('c-') && !s.slug.startsWith('c2-'))
    .sort((a, b) => a.priceMonthly - b.priceMonthly)

  // Remove duplicates at same price point (keep first one, prefer AMD over Intel at same price)
  const seen = new Map<number, Size>()
  for (const size of filtered) {
    if (!seen.has(size.priceMonthly)) {
      seen.set(size.priceMonthly, size)
    }
  }

  return Array.from(seen.values())
}

interface SizeRating {
  cpuStars: number
  diskStars: number
  cpuTooltip: string
  diskTooltip: string
}

function getSizeLabel(size: Size): { label: string; sublabel?: string } {
  const isAmd = size.slug.includes('-amd')
  const isIntel = size.slug.includes('-intel')

  if (isAmd) return { label: 'AMD' }
  if (isIntel) return { label: 'Intel', sublabel: 'More storage' }
  return { label: 'Basic' }
}

function getSizeRating(size: Size): SizeRating {
  const isAmd = size.slug.includes('-amd')
  const isIntel = size.slug.includes('-intel')

  if (isAmd) {
    return {
      cpuStars: 3,
      diskStars: 2,
      cpuTooltip: 'Dedicated AMD CPU - better performance in benchmarks',
      diskTooltip: 'Fast NVMe SSD storage',
    }
  }
  if (isIntel) {
    return {
      cpuStars: 2,
      diskStars: 3,
      cpuTooltip: 'Dedicated Intel CPU - reliable performance',
      diskTooltip: 'Fast NVMe SSD with more capacity at same speed',
    }
  }
  // Basic shared CPU
  return {
    cpuStars: 1,
    diskStars: 1,
    cpuTooltip: 'Shared CPU - good for light usage',
    diskTooltip: 'Standard SSD storage',
  }
}

function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={i < count ? 'text-yellow-400' : 'text-slate-600'}
        >
          ★
        </span>
      ))}
    </span>
  )
}

export function SizeSelector({ sizes, value, onChange }: SizeSelectorProps) {
  // Build tiers dynamically from available sizes
  const tiers = TIER_CONFIGS.map((config) => {
    const tierSizes = getSizesForTier(sizes, config.memory, config.vcpus)
    return { ...config, sizes: tierSizes }
  }).filter((tier) => tier.sizes.length > 0)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Server Size
        </label>
        <p className="text-sm text-slate-500">
          Choose based on your group size and module usage
        </p>
      </div>

      <div className="p-3 bg-slate-800/50 rounded-lg text-sm text-slate-400">
        <p className="mb-2">
          <strong className="text-slate-300">About sizing:</strong> Foundry officially recommends 2GB RAM,
          but in my experience 1GB runs games with 2-5 players smoothly. Node.js is lightweight!
        </p>
        <p className="mb-2">
          You can always <strong className="text-slate-300">upgrade later</strong> if needed.
          Note: downsizing disk space isn't possible, only CPU/RAM.
        </p>
        <p>
          The <strong className="text-slate-300">Intel and AMD</strong> options are noticeably snappier than Basic.
          Only choose Basic if budget is a major concern.
        </p>
      </div>

      <div className="space-y-4">
        {tiers.map((tier) => {
          const isTierSelected = tier.sizes.some((s) => s.slug === value)
          const firstSize = tier.sizes[0]

          return (
            <div key={tier.id} className="relative">
              {tier.badge && (
                <span
                  className={`absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium text-white rounded-full z-10 ${tier.badgeColor}`}
                >
                  {tier.badge}
                </span>
              )}

              <div
                className={`rounded-lg border p-4 transition-all ${
                  isTierSelected
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                {/* Tier header */}
                <div className="mb-3">
                  <span className="font-semibold text-white">{tier.title}</span>
                  <p className="text-sm text-slate-400">{tier.subtitle}</p>
                </div>

                {/* Variant boxes */}
                <div className={`grid gap-2 ${tier.sizes.length === 1 ? 'grid-cols-1' : tier.sizes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {tier.sizes.map((size) => {
                    const isSelected = value === size.slug
                    const rating = getSizeRating(size)
                    const sizeLabel = getSizeLabel(size)

                    return (
                      <button
                        key={size.slug}
                        type="button"
                        onClick={() => onChange(size.slug)}
                        className={`relative p-3 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                        }`}
                      >
                        {/* Selection indicator */}
                        <div
                          className={`absolute top-2 right-2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>

                        {/* Label */}
                        <div className="text-xs font-medium text-slate-300 mb-1">
                          {sizeLabel.label}
                          {sizeLabel.sublabel && (
                            <span className="block text-[10px] text-slate-500 font-normal">{sizeLabel.sublabel}</span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-xl font-bold text-white">
                          ${size.priceMonthly}
                          <span className="text-xs font-normal text-slate-400">/mo</span>
                        </div>

                        {/* Specs */}
                        <div className="text-xs text-slate-300 mt-1">
                          {size.vcpus} CPU / {size.memory / 1024}GB RAM / {size.disk}GB Disk
                        </div>

                        {/* Star ratings */}
                        <div className="mt-2 space-y-0.5 text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-500 cursor-help" title={rating.cpuTooltip}>CPU</span>
                            <Stars count={rating.cpuStars} />
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-500 cursor-help" title={rating.diskTooltip}>Disk</span>
                            <Stars count={rating.diskStars} />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
