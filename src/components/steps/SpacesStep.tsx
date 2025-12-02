import { useState } from 'react'
import { HardDrive, Database, Loader2, CheckCircle2, Shield } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Alert } from '../ui/Alert'
import * as doApi from '../../api/digitalocean'
import * as spacesApi from '../../api/spaces'
import type { WizardState } from '../../types'

type ActionStep = 'idle' | 'creating-bucket' | 'creating-scoped-key' | 'done'

interface Props {
  state: WizardState
  setSpaces: (updates: Partial<WizardState['spaces']>) => void
  onNext: () => void
  onBack: () => void
}

// Estimate ~4GB used by OS + Foundry + dependencies
const SYSTEM_OVERHEAD_GB = 4

const ACTION_LABELS: Record<ActionStep, string> = {
  'idle': '',
  'creating-bucket': 'Creating Space bucket...',
  'creating-scoped-key': 'Creating secure access key...',
  'done': 'Complete!',
}

export function SpacesStep({ state, setSpaces, onNext, onBack }: Props) {
  const [spaceName, setSpaceName] = useState(state.spaces.newSpaceName)
  const [actionStep, setActionStep] = useState<ActionStep>('idle')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get disk info from selected size
  const selectedSize = state.digitalOcean.selectedSize
  const diskTotal = selectedSize.includes('35gb') ? 35
    : selectedSize.includes('70gb') ? 70
    : selectedSize.includes('90gb') ? 90
    : selectedSize.includes('120gb') ? 120
    : selectedSize.includes('2gb') ? 50
    : selectedSize.includes('4gb') ? 80
    : 25
  const diskFree = diskTotal - SYSTEM_OVERHEAD_GB

  // Get Spaces region based on selected droplet region
  const spacesRegions = doApi.getSpacesRegions()
  const selectedRegion = state.digitalOcean.selectedRegion
  const defaultSpacesRegion = spacesRegions.includes(selectedRegion) ? selectedRegion : spacesRegions[0]

  const handleSkip = () => {
    setSpaces({ enabled: false })
    onNext()
  }

  const handleSpaceNameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSpaceName(sanitized)
    setSpaces({ newSpaceName: sanitized })
    setError(null)
  }

  const handleCreate = async () => {
    if (spaceName.length < 3) {
      setError('Space name must be at least 3 characters')
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      // Create temporary full-access key for bucket creation
      const tempKey = await doApi.createSpacesKey(
        state.digitalOcean.apiKey,
        `foundry-temp-${Date.now()}`
      )

      // Create the bucket
      setActionStep('creating-bucket')
      await spacesApi.createSpace(
        { accessKeyId: tempKey.accessKeyId, secretAccessKey: tempKey.secretAccessKey },
        defaultSpacesRegion,
        spaceName
      )

      // Delete temp key
      await doApi.deleteSpacesKey(state.digitalOcean.apiKey, tempKey.id)

      // Create scoped key for the bucket
      setActionStep('creating-scoped-key')
      const scopedKey = await doApi.createSpacesKey(
        state.digitalOcean.apiKey,
        `foundry-${spaceName}`,
        spaceName,
        defaultSpacesRegion
      )

      setActionStep('done')
      setSpaces({
        enabled: true,
        credentials: {
          accessKeyId: scopedKey.accessKeyId,
          secretAccessKey: scopedKey.secretAccessKey,
        },
        newSpaceName: spaceName,
        selectedSpace: spaceName,
        selectedRegion: defaultSpacesRegion,
      })

      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Space')
      setActionStep('idle')
    } finally {
      setActionLoading(false)
    }
  }

  // Already configured - show success state
  if (state.spaces.enabled && state.spaces.credentials) {
    const configuredRegion = state.spaces.selectedRegion || defaultSpacesRegion

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
          <div>
            <p className="font-medium text-green-400">Space created successfully</p>
            <p className="text-sm text-slate-400">
              {state.spaces.newSpaceName}.{configuredRegion}.digitaloceanspaces.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <Shield className="w-6 h-6 text-blue-400 shrink-0" />
          <div>
            <p className="font-medium text-blue-400">Secure access key created</p>
            <p className="text-sm text-slate-400">
              Your server will only have access to this specific bucket, not your entire Spaces account.
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => setSpaces({ enabled: false, credentials: null })}>
            Back
          </Button>
          <Button onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">
          External Asset Storage
        </h2>
        <p className="text-slate-400">
          Create a Space for your game assets
        </p>
      </div>

      {/* Storage info */}
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <HardDrive className="w-6 h-6 text-blue-400" />
          <div>
            <p className="font-medium text-white">Your server has {diskTotal}GB storage</p>
            <p className="text-sm text-slate-400">~{diskFree}GB free after installation</p>
          </div>
        </div>
      </div>

      {/* Create form */}
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <Input
          label="Space Name"
          placeholder="foundry-assets"
          value={spaceName}
          onChange={(e) => handleSpaceNameChange(e.target.value)}
          hint={spaceName ? `https://${spaceName}.${defaultSpacesRegion}.digitaloceanspaces.com` : 'Enter a unique name for your Space (must be globally unique)'}
        />
        <p className="mt-2 text-xs text-slate-500">
          $5/month for 250GB storage + CDN
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} disabled={actionLoading}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSkip} disabled={actionLoading}>
            Skip
          </Button>
          <Button
            onClick={handleCreate}
            disabled={actionLoading || !spaceName || spaceName.length < 3}
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {ACTION_LABELS[actionStep] || 'Creating...'}
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Create Space (+$5/mo)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
