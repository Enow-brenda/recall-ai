import { Icon } from './Icon'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  busy?: boolean
  disabled?: boolean
}

export function ToggleSwitch({ checked, onChange, label, busy = false, disabled }: ToggleSwitchProps) {
  const disabledNow = busy || disabled
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabledNow}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        checked ? 'bg-accent' : 'bg-neutral'
      } ${disabledNow ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
    >
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center text-on-accent">
          <Icon name="sync" size={14} className="animate-spin" />
        </span>
      ) : (
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      )}
    </button>
  )
}