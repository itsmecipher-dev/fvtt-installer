import { WizardLayout } from './components/WizardLayout'
import { OverviewStep } from './components/steps/OverviewStep'
import { AccountsStep } from './components/steps/AccountsStep'
import { DigitalOceanStep } from './components/steps/DigitalOceanStep'
import { CloudflareStep } from './components/steps/CloudflareStep'
import { SpacesStep } from './components/steps/SpacesStep'
import { FoundryStep } from './components/steps/FoundryStep'
import { ReviewStep } from './components/steps/ReviewStep'
import { ProvisioningStep } from './components/steps/ProvisioningStep'
import { SummaryStep } from './components/steps/SummaryStep'
import { useWizard } from './hooks/useWizard'

const STEPS = [
  { title: 'Overview', description: '' },
  { title: 'Accounts', description: 'Create required accounts' },
  { title: 'DigitalOcean', description: 'Connect your DigitalOcean account' },
  { title: 'Spaces', description: 'Optional external storage' },
  { title: 'Cloudflare', description: 'Configure your domain' },
  { title: 'Foundry VTT', description: 'Provide your Foundry license' },
  { title: 'Review', description: 'Confirm your configuration' },
  { title: 'Deploy', description: 'Creating your server' },
  { title: 'Complete', description: 'Server reference info' },
]

function App() {
  const {
    state,
    nextStep,
    prevStep,
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

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return <OverviewStep onNext={nextStep} />
      case 1:
        return <AccountsStep onNext={nextStep} onBack={prevStep} />
      case 2:
        return (
          <DigitalOceanStep
            state={state}
            setDigitalOcean={setDigitalOcean}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 3:
        return (
          <SpacesStep
            state={state}
            setSpaces={setSpaces}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 4:
        return (
          <CloudflareStep
            state={state}
            setCloudflare={setCloudflare}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 5:
        return (
          <FoundryStep
            state={state}
            setFoundry={setFoundry}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 6:
        return (
          <ReviewStep
            state={state}
            setServer={setServer}
            setMaintenance={setMaintenance}
            onNext={nextStep}
            onBack={prevStep}
          />
        )
      case 7:
        return (
          <ProvisioningStep
            state={state}
            setProvisioning={setProvisioning}
            setSshKeyPair={setSshKeyPair}
            addLog={addLog}
            onNext={nextStep}
          />
        )
      case 8:
        return <SummaryStep state={state} />
      default:
        return null
    }
  }

  return (
    <WizardLayout steps={STEPS} currentStep={state.currentStep}>
      {renderStep()}
    </WizardLayout>
  )
}

export default App
