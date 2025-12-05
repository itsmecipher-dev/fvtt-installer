import { WizardLayout } from './components/WizardLayout'
import { OverviewStep } from './components/steps/OverviewStep'
import { ProviderSelectionStep } from './components/steps/ProviderSelectionStep'
import { AccountsStep } from './components/steps/AccountsStep'
import { DigitalOceanStep } from './components/steps/DigitalOceanStep'
import { HetznerStep } from './components/steps/HetznerStep'
import { CloudflareStep } from './components/steps/CloudflareStep'
import { SpacesStep } from './components/steps/SpacesStep'
import { FoundryStep } from './components/steps/FoundryStep'
import { ReviewStep } from './components/steps/ReviewStep'
import { ProvisioningStep } from './components/steps/ProvisioningStep'
import { SummaryStep } from './components/steps/SummaryStep'
import { useWizard } from './hooks/useWizard'
import { getProviderMetadata } from './api/providers'

function getSteps(provider: 'digitalocean' | 'hetzner') {
  const providerName = getProviderMetadata(provider).displayName
  return [
    { title: 'Overview', description: '' },
    { title: 'Provider', description: 'Choose your cloud provider' },
    { title: 'Accounts', description: 'Create required accounts' },
    { title: providerName, description: `Connect your ${providerName} account` },
    { title: 'Storage', description: 'Optional external storage' },
    { title: 'Cloudflare', description: 'Configure your domain' },
    { title: 'Foundry VTT', description: 'Provide your Foundry license' },
    { title: 'Review', description: 'Confirm your configuration' },
    { title: 'Deploy', description: 'Creating your server' },
    { title: 'Complete', description: 'Server reference info' },
  ]
}

function App() {
  const {
    state,
    nextStep,
    prevStep,
    setProvider,
    setCompute,
    setDigitalOcean,
    setCloudflare,
    setSpaces,
    setFoundry,
    setServer,
    setSshKeyPair,
    setProvisioning,
    setMaintenance,
    addLog,
  } = useWizard()

  const steps = getSteps(state.provider)

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <OverviewStep onNext={nextStep} />
      case 1:
        return (
          <ProviderSelectionStep
            selectedProvider={state.provider}
            onSelectProvider={setProvider}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 2:
        return <AccountsStep provider={state.provider} onNext={nextStep} onBack={prevStep} />
      case 3:
        if (state.provider === 'hetzner') {
          return (
            <HetznerStep
              state={state}
              setCompute={setCompute}
              onNext={nextStep}
              onBack={prevStep}
            />
          )
        }
        return (
          <DigitalOceanStep
            state={state}
            setDigitalOcean={setDigitalOcean}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 4:
        return (
          <SpacesStep
            state={state}
            setSpaces={setSpaces}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 5:
        return (
          <CloudflareStep
            state={state}
            setCloudflare={setCloudflare}
            setServer={setServer}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 6:
        return (
          <FoundryStep
            state={state}
            setFoundry={setFoundry}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 7:
        return (
          <ReviewStep
            state={state}
            setServer={setServer}
            setMaintenance={setMaintenance}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 8:
        return (
          <ProvisioningStep
            state={state}
            setProvisioning={setProvisioning}
            setSpaces={setSpaces}
            setSshKeyPair={setSshKeyPair}
            addLog={addLog}
            onNext={nextStep}
          />
        )
      case 9:
        return <SummaryStep state={state} />
      default:
        return null
    }
  }

  return (
    <WizardLayout steps={steps} currentStep={state.currentStep}>
      {renderStep()}
    </WizardLayout>
  )
}

export default App
