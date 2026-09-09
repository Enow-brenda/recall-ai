import { useNavigate } from 'react-router-dom'
import { USE_MOCK_API } from '../api/client'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'

const FEATURES = [
  {
    icon: 'search',
    title: 'Conversational Search',
    body: 'Ask plain-English questions about your inbox and get precise answers — no keyword guessing.',
  },
  {
    icon: 'description',
    title: 'Document Memory',
    body: 'Recall reads and indexes the PDFs and docs attached to your emails, so nothing is hidden.',
  },
  {
    icon: 'link',
    title: 'Link Awareness',
    body: 'Every link inside your messages is captured with its context, ready to resurface instantly.',
  },
  {
    icon: 'fact_check',
    title: 'Source Transparency',
    body: 'Every answer is cited. Open the exact email, attachment, or link behind any response.',
  },
]

const STEPS = [
  { n: '01', title: 'Connect your Gmail', body: 'Sign in with Google and grant read access. Takes under a minute.' },
  { n: '02', title: 'Recall indexes your inbox', body: 'Emails, attachments, and links are embedded into a private memory you own.' },
  { n: '03', title: 'Ask anything', body: '“What was the invoice amount?” — instant, cited, exactly right.' },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    cta: 'Get started',
    highlighted: false,
    features: ['25 questions / day', '1 connected account', 'Full source citations', 'Community support'],
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    cta: 'Upgrade to Pro',
    highlighted: true,
    features: ['Unlimited questions', 'Multiple Gmail accounts', 'Priority indexing speed', '50 GB memory storage', 'Email support < 24h'],
  },
]

const SOURCES = [
  { key: 'gmail', label: 'Gmail', icon: 'mail', now: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'chat', now: false },
  { key: 'slack', label: 'Slack', icon: 'forum', now: false },
  { key: 'sms', label: 'SMS', icon: 'sms', now: false },
]

export function Landing() {
  const navigate = useNavigate()

  const goToApp = () => {
    if (USE_MOCK_API) {
      navigate('/chat')
    } else {
      const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
      window.location.href = `${base}/auth/login`
    }
  }

  return (
    <div className="min-h-screen bg-surface text-primary">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Logo text="Recall" tagline="Intelligent memory" />
          <div className="flex items-center gap-3">
            <a href="#pricing" className="hidden text-body-sm text-muted transition-colors hover:text-primary md:block">
              Pricing
            </a>
            <button
              type="button"
              onClick={goToApp}
              className="rounded-lg bg-accent px-4 py-2 text-label-md font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover"
            >
              Connect Gmail
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-14 text-center md:px-8 md:pt-24">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-label-sm uppercase tracking-wider text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          AI Memory for your inbox
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-display-lg-mobile font-bold tracking-tight md:text-display-lg">
          Your Inbox <span className="text-accent">Remembers</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-lg text-muted">
          Recall is a chat-based memory layer for your email. Ask questions in plain English
          and get instant, cited answers pulled from everything you've received.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={goToApp}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-body-md font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover sm:w-auto"
          >
            <Icon name="google" size={18} />
            Connect Gmail
          </button>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="w-full rounded-lg border border-border bg-card px-6 py-3 text-body-md text-primary transition-colors hover:bg-surface-low sm:w-auto"
          >
            See it in action
          </button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-label-sm text-muted">
          <Icon name="lock" size={14} /> Read-only access. You stay in control.
        </p>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2 md:px-8 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft">
                <Icon name={f.icon} size={20} className="text-accent" />
              </span>
              <h3 className="mt-4 text-headline-sm">{f.title}</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="text-center text-headline-md">How it works</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative">
              <span className="text-display-lg font-bold text-neutral/40">{s.n}</span>
              <h3 className="mt-2 text-headline-sm">{s.title}</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-center text-headline-md">Simple pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-body-sm text-muted">
            Start free. Upgrade when your memory needs to grow.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[8px] border p-6 shadow-card ${plan.highlighted ? 'border-accent bg-card ring-1 ring-accent' : 'border-border bg-card'}`}
              >
                {plan.highlighted && (
                  <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-label-sm uppercase tracking-wider text-accent">
                    Most popular
                  </span>
                )}
                <h3 className="mt-3 text-headline-sm">{plan.name}</h3>
                <p className="mt-3">
                  <span className="text-display-lg font-bold">{plan.price}</span>
                  <span className="text-body-sm text-muted"> {plan.period}</span>
                </p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-body-sm text-primary">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={goToApp}
                  className={`mt-7 w-full rounded-lg py-2.5 text-label-md font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-accent text-on-accent hover:bg-accent-hover'
                      : 'border border-border bg-card text-primary hover:bg-surface-low'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="text-center text-headline-md">One memory, many sources</h2>
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.key}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-body-sm ${
                s.now ? 'border-border bg-card text-primary' : 'border-border bg-surface-low text-muted'
              }`}
            >
              <Icon name={s.icon} size={16} className={s.now ? 'text-accent' : 'text-neutral'} />
              {s.label}
              {s.now && (
                <span className="text-label-sm uppercase tracking-wider text-success">· Live</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-primary py-16 text-center text-on-primary">
        <h2 className="text-headline-md">Stop digging through your inbox.</h2>
        <p className="mx-auto mt-3 max-w-lg text-body-md text-on-primary/70">
          Start asking questions your email can finally answer.
        </p>
        <button
          type="button"
          onClick={goToApp}
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-body-md font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Icon name="google" size={18} />
          Connect Gmail
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-label-sm text-muted md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} Recall. Built for the hackathon.</p>
          <div className="flex items-center gap-6">
            <span className="cursor-pointer transition-colors hover:text-primary">Privacy</span>
            <span className="cursor-pointer transition-colors hover:text-primary">Terms</span>
            <span className="cursor-pointer transition-colors hover:text-primary">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  )
}