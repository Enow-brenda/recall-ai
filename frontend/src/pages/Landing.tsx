import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api, USE_MOCK_API } from '../api/client'
import { Icon } from '../components/Icon'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

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
    disabled: false,
    highlighted: false,
    features: ['25 queries / day', '0.5 GB storage', 'Basic conversational search', 'Full source citations'],
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    cta: 'Upgrade to Pro',
    disabled: true,
    highlighted: true,
    features: ['Unlimited queries', '50 GB storage', 'Advanced document parsing', 'Priority support'],
  },
]

const SOURCES = [
  { key: 'gmail', label: 'Gmail', icon: 'mail', now: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'forum', now: false },
  { key: 'slack', label: 'Slack', icon: 'tag', now: false },
  { key: 'sms', label: 'SMS', icon: 'sms', now: false },
]

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
]

export function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const [contact, setContact] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (!loading && isAuthenticated) return <Navigate to="/chat" replace />

  const goToApp = () => {
    if (USE_MOCK_API) {
      navigate('/chat')
    } else {
      const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
      window.location.href = `${base}/auth/login`
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      await api.support.send({
        name: contact.name.trim(),
        email: contact.email.trim(),
        message: contact.message.trim(),
      })
      setContact({ name: '', email: '', message: '' })
      setSent(true)
      window.setTimeout(() => setSent(false), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface text-primary">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Logo text="Recall" tagline="Intelligent memory" />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-body-sm text-muted transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToApp}
              className="rounded-lg border border-border bg-card px-4 py-2 text-label-md text-primary transition-colors hover:bg-surface-low"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={goToApp}
              className="hidden rounded-lg bg-accent px-4 py-2 text-label-md font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover sm:block"
            >
              Connect Gmail
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 text-center md:px-8 md:pt-24">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-label-sm uppercase tracking-wider text-muted">
          <Icon name="graphic_eq" size={14} className="text-accent" filled />
          AI Memory for your inbox
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-display-lg-mobile font-bold tracking-tight md:text-display-lg">
          Your Inbox Remembers. <br />
          <span className="text-accent">You Don't Have To.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-lg text-muted">
          Recall is a chat-based memory layer for your email. Ask plain questions, get exact answers
          with <span className="font-medium text-accent">verified sources</span> instantly.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={goToApp}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-body-md font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover sm:w-auto"
          >
            <Icon name="mail" size={18} />
            Connect Gmail
          </button>
          <a
            href="#interface"
            className="w-full rounded-lg border border-border bg-card px-6 py-3 text-body-md text-primary transition-colors hover:bg-surface-low sm:w-auto"
          >
            See it in action
          </a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 opacity-80">
          <span className="flex items-center gap-1.5 text-label-sm text-muted">
            <Icon name="lock" size={14} /> Read-only access
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <span className="flex items-center gap-1.5 text-label-sm text-muted">
            <Icon name="verified_user" size={14} /> Google OAuth Secured
          </span>
        </div>
      </section>

      {/* Interface mockup */}
      <section id="interface" className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-[800px] overflow-hidden rounded-xl border border-border bg-card text-left shadow-overlay">
          <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral/40" />
            </span>
            <span className="text-label-sm text-muted">Recall Interface</span>
          </div>
          <div className="flex flex-col gap-4 bg-surface p-5 sm:p-7">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg rounded-tr-none bg-primary px-4 py-2.5 text-body-md text-on-primary">
                What did Sarah say about the Q3 budget requirements?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-lg rounded-tl-none border border-border bg-card px-4 py-3 shadow-card">
                <p className="text-body-md text-primary">
                  Sarah indicated that the Q3 budget needs to prioritize{' '}
                  <span className="font-medium text-accent">cloud infrastructure upgrades</span> and a 15% allocation
                  for new marketing channels.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-label-sm uppercase tracking-wider text-muted">Sources</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-label-md text-primary">
                    <Icon name="description" size={13} className="text-accent" />
                    Q3 Planning Thread — Oct 12
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-2 pr-1.5 shadow-card">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-muted">
                <Icon name="attach_file" size={18} />
              </span>
              <span className="flex-1 text-body-md text-neutral">Ask about your email…</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent">
                <Icon name="arrow_upward" size={18} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-border bg-card/60">
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

      {/* Sources */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
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

      {/* Security */}
      <section id="security" className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <h2 className="text-center text-headline-md">Your memory, locked down</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-body-sm text-muted">
            Recall never writes to your mailbox and never trains on your data.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
            {[
              { icon: 'lock', title: 'Read-only access', body: 'We only ever read; you keep full control of your account.' },
              { icon: 'verified_user', title: 'Google OAuth', body: 'Secure sign-in with Google — no passwords stored.' },
              { icon: 'shield', title: 'Your data stays yours', body: 'Indexed memory is private and can be deleted anytime.' },
            ].map((s) => (
              <div key={s.title} className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft">
                  <Icon name={s.icon} size={20} className="text-accent" />
                </span>
                <h3 className="mt-3 text-headline-sm">{s.title}</h3>
                <p className="mt-2 text-body-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-center text-headline-md">Simple pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-body-sm text-muted">
            Start free. Upgrade when your memory needs to grow.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[8px] border p-6 shadow-card ${
                  plan.highlighted ? 'border-accent bg-card ring-1 ring-accent' : 'border-border bg-card'
                }`}
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
                  disabled={plan.disabled}
                  title={plan.disabled ? 'Upgrade coming soon' : undefined}
                  onClick={goToApp}
                  className={`mt-7 w-full rounded-lg py-2.5 text-label-md font-medium transition-colors ${
                    plan.highlighted
                      ? plan.disabled
                        ? 'cursor-not-allowed bg-surface-low text-muted'
                        : 'bg-accent text-on-accent hover:bg-accent-hover'
                      : 'border border-border bg-card text-primary hover:bg-surface-low'
                  }`}
                >
                  {plan.cta}
                </button>
                {plan.disabled && (
                  <p className="mt-2 text-center text-label-sm text-muted">Coming soon</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leave a Message */}
      <section id="contact" className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-[600px] rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-headline-md">Leave a Message</h2>
            <p className="mt-1.5 text-body-md text-muted">
              Have questions or need support? We'd love to hear from you.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="contact-name" className="mb-1 block text-label-sm text-muted">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                placeholder="Jane Doe"
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-primary outline-none transition-colors placeholder:text-neutral focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1 block text-label-sm text-muted">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                placeholder="jane@example.com"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-primary outline-none transition-colors placeholder:text-neutral focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1 block text-label-sm text-muted">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                placeholder="How can we help?"
                value={contact.message}
                onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-primary outline-none transition-colors placeholder:text-neutral focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-lg bg-primary py-2.5 text-label-md font-medium text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>
            {error && <p className="text-center text-label-md text-danger">{error}</p>}
            {sent && (
              <p className="text-center text-label-md text-success">
                Thanks — your message has been received.
              </p>
            )}
          </form>
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
          <Icon name="mail" size={18} />
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
            <a href="#contact" className="transition-colors hover:text-primary">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}