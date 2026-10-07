import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { CheckCircle2, Globe, Info, Server, TriangleAlert, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  connectionAtom,
  credentialsAtom,
  DEFAULT_RPC_PATH,
  isRememberedInTab,
  isSameOrigin,
  normalizeRpcUrl,
  offerToPasswordManager,
  rpcUrlFor,
  setCredentials,
  usesDevProxy,
} from '@/lib/connection'
import { TransmissionClient } from '@/lib/rpc/client'
import { signInDismissedAtom } from '@/lib/ui'
import { PageShell, SettingsRow, SettingsSection } from './page-shell'

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; version: string }
  | { status: 'failed'; message: string }

/** Add or edit the daemon connection (the iOS app's server setup). */
export function ConnectPage() {
  const config = useSelector(connectionAtom)
  const credentials = useSelector(credentialsAtom)
  const navigate = useNavigate()
  const id = useId()
  const [test, setTest] = useState<TestState>({ status: 'idle' })

  const form = useForm({
    defaultValues: {
      mode: isSameOrigin(config) ? ('same-origin' as const) : ('custom' as const),
      url: isSameOrigin(config) ? '' : config.url,
      username: config.username,
      password: credentials?.password ?? '',
      remember: isRememberedInTab(),
    },
    // Any edit invalidates a previous test result.
    listeners: { onChange: () => setTest({ status: 'idle' }) },
    validators: {
      onSubmit: ({ value }) => {
        if (value.mode === 'custom' && !normalizeRpcUrl(value.url)) {
          return { fields: { url: 'Enter a server address, like 192.168.1.10:9091 or https://nas.example.com.' } }
        }
        return undefined
      },
    },
    onSubmit: ({ value }) => {
      const url = value.mode === 'custom' ? (normalizeRpcUrl(value.url) ?? '') : ''
      const username = value.username.trim()
      connectionAtom.set({ url, username })
      const creds = username || value.password ? { username, password: value.password } : null
      setCredentials(creds, { rememberInTab: value.remember })
      if (creds) void offerToPasswordManager(creds)
      signInDismissedAtom.set(false)
      navigate({ to: '/' })
    },
  })

  const runTest = async () => {
    const { mode, url, username, password } = form.state.values
    const target = mode === 'custom' ? normalizeRpcUrl(url) : ''
    if (target === null) {
      setTest({ status: 'failed', message: 'That address doesn’t look right.' })
      return
    }
    setTest({ status: 'testing' })
    const creds = username.trim() ? { username: username.trim(), password } : null
    try {
      const session = await new TransmissionClient(rpcUrlFor({ url: target, username }), creds).session()
      setTest({ status: 'ok', version: `Transmission ${session.version.split(' ')[0]}` })
    } catch (error) {
      setTest({ status: 'failed', message: (error as Error).message })
    }
  }

  return (
    <PageShell title="Connection">
      <form
        id={id}
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="mode">
          {(field) => (
            <SettingsSection
              title="Server"
              footer={
                field.state.value === 'same-origin'
                  ? `Uses ${DEFAULT_RPC_PATH} on the address this page was loaded from — e.g. when installed as Transmission’s web interface. No extra setup needed.`
                  : import.meta.env.DEV
                    ? 'In production builds, the server must allow cross-origin requests from this page (CORS), or both must sit behind the same reverse proxy.'
                    : 'The server must allow cross-origin requests from this page (CORS), including the X-Transmission-Session-Id header. Putting both behind the same reverse proxy avoids that.'
              }
            >
              <fieldset aria-label="Server" className="divide-y">
                <ModeOption
                  checked={field.state.value === 'same-origin'}
                  onSelect={() => field.handleChange('same-origin')}
                  icon={<Server className="size-4" />}
                  title="This server"
                  description={globalThis.location?.host}
                />
                <ModeOption
                  checked={field.state.value === 'custom'}
                  onSelect={() => field.handleChange('custom')}
                  icon={<Globe className="size-4" />}
                  title="Another server"
                  description="Connect to a daemon at a different address"
                />
              </fieldset>
              {field.state.value === 'custom' && (
                <form.Field name="url">
                  {(urlField) => {
                    const normalized = normalizeRpcUrl(urlField.state.value)
                    const target = normalized ? { url: normalized, username: '' } : null
                    const crossOrigin = target && !isSameOrigin(target)
                    const devProxy = target && usesDevProxy(target)
                    return (
                      <div className="flex flex-col gap-1.5 px-5 py-3.5">
                        <label htmlFor={`${id}-url`} className="text-sm">
                          Address
                        </label>
                        <Input
                          id={`${id}-url`}
                          inputMode="url"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          autoFocus
                          placeholder="192.168.1.10:9091 or https://nas.example.com"
                          value={urlField.state.value}
                          onChange={(event) => urlField.handleChange(event.target.value)}
                          aria-invalid={urlField.state.meta.errors.length > 0}
                        />
                        {urlField.state.meta.errors.length > 0 ? (
                          <p className="text-destructive text-xs">{String(urlField.state.meta.errors[0])}</p>
                        ) : (
                          normalized && (
                            <p className="break-all font-mono text-muted-foreground text-xs">{normalized}</p>
                          )
                        )}
                        {devProxy ? (
                          <p className="flex items-start gap-1.5 text-muted-foreground text-xs">
                            <Info className="mt-px size-3.5 shrink-0" />
                            Development: requests go through the Vite dev server, so CORS isn’t needed.
                          </p>
                        ) : (
                          crossOrigin && (
                            <p className="flex items-start gap-1.5 text-status-checking text-xs">
                              <TriangleAlert className="mt-px size-3.5 shrink-0" />
                              Different origin — requires CORS on the server (see below).
                            </p>
                          )
                        )}
                      </div>
                    )
                  }}
                </form.Field>
              )}
            </SettingsSection>
          )}
        </form.Field>

        <SettingsSection
          title="Authentication"
          footer="Leave blank if your server doesn’t require a password, or to let your browser ask. The password is never saved by this app."
        >
          <form.Field name="username">
            {(field) => (
              <SettingsRow label="Username" htmlFor={`${id}-username`}>
                <Input
                  id={`${id}-username`}
                  name="username"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="w-48 sm:w-64"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </SettingsRow>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <SettingsRow label="Password" htmlFor={`${id}-password`}>
                <Input
                  id={`${id}-password`}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-48 sm:w-64"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </SettingsRow>
            )}
          </form.Field>
          <form.Field name="remember">
            {(field) => (
              <SettingsRow
                label="Stay signed in for this tab"
                htmlFor={`${id}-remember`}
                description="Kept in session storage until the tab closes."
              >
                <Checkbox
                  id={`${id}-remember`}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked === true)}
                />
              </SettingsRow>
            )}
          </form.Field>
        </SettingsSection>

        <SettingsSection>
          <SettingsRow label="Test Connection">
            <TestStatus test={test} />
            <Button type="button" variant="outline" size="sm" onClick={runTest} disabled={test.status === 'testing'}>
              Test
            </Button>
          </SettingsRow>
        </SettingsSection>
        {test.status === 'failed' && <p className="-mt-4 px-5 text-destructive text-xs">{test.message}</p>}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg">
            Save & Connect
          </Button>
          {credentials && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => {
                setCredentials(null)
                form.setFieldValue('password', '')
              }}
            >
              Sign Out
            </Button>
          )}
        </div>
      </form>
    </PageShell>
  )
}

function ModeOption({
  checked,
  onSelect,
  icon,
  title,
  description,
}: {
  checked: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <label className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 hover:bg-muted/50 has-[:focus-visible]:bg-muted/50">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm">{title}</span>
        {description && <span className="truncate text-muted-foreground text-xs">{description}</span>}
      </span>
      <input
        type="radio"
        name="connection-mode"
        checked={checked}
        onChange={onSelect}
        className="size-4 accent-primary"
      />
    </label>
  )
}

function TestStatus({ test }: { test: TestState }) {
  switch (test.status) {
    case 'testing':
      return <Spinner />
    case 'ok':
      return (
        <span className="inline-flex items-center gap-1 text-status-seeding text-xs">
          <CheckCircle2 className="size-4" /> {test.version}
        </span>
      )
    case 'failed':
      return <XCircle className="size-4 text-status-error" />
    default:
      return null
  }
}
