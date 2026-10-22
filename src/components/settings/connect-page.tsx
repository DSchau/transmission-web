import { useForm } from '@tanstack/react-form'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { Check, CheckCircle2, ChevronRight, Globe, Info, Plus, Server, TriangleAlert, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { HoldButton } from '@/components/hold-button'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  activeServer,
  addServer,
  credentialsFor,
  DEFAULT_RPC_PATH,
  displayNameFor,
  hostFor,
  isRememberedInTab,
  isSameOrigin,
  normalizeRpcUrl,
  offerToPasswordManager,
  removeServer,
  rpcUrlFor,
  type ServerProfile,
  serversAtom,
  setCredentials,
  switchServer,
  updateServer,
  usesDevProxy,
} from '@/lib/connection'
import { TransmissionClient } from '@/lib/rpc/client'
import { signInDismissedAtom } from '@/lib/ui'
import { cn } from '@/lib/utils'
import { PageShell, SettingsRow, SettingsSection } from './page-shell'

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; version: string }
  | { status: 'failed'; message: string }

/** Saved servers, and adding or editing one (the iOS app's server setup). */
export function ConnectPage() {
  const state = useSelector(serversAtom)
  const { server: param } = useSearch({ from: '/connect' })
  const editing = param === 'new' ? null : (state.servers.find((s) => s.id === param) ?? activeServer(state))

  return (
    <PageShell title={editing ? 'Connection' : 'Add Server'}>
      <ServerList servers={state.servers} activeId={state.activeId} editingId={editing?.id} />
      <ServerForm key={editing?.id ?? 'new'} server={editing} canDelete={state.servers.length > 1} />
    </PageShell>
  )
}

function ServerList({
  servers,
  activeId,
  editingId,
}: {
  servers: ServerProfile[]
  activeId: string
  editingId?: string
}) {
  const navigate = useNavigate()
  const row =
    'flex w-full items-center gap-3 px-5 py-3 text-left outline-none hover:bg-muted/50 focus-visible:bg-muted/50'
  return (
    <SettingsSection title="Servers">
      {servers.map((server) => (
        <button
          key={server.id}
          type="button"
          aria-current={server.id === editingId ? 'true' : undefined}
          className={cn(row, server.id === editingId && 'bg-muted/60')}
          onClick={() => navigate({ to: '/connect', search: { server: server.id }, replace: true })}
        >
          <span className="flex size-4 shrink-0 items-center justify-center text-primary">
            {server.id === activeId && <Check className="size-4" aria-label="In use" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{displayNameFor(server)}</span>
            {server.name.trim() && (
              <span className="truncate font-mono text-[11px] text-muted-foreground">{hostFor(server)}</span>
            )}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      ))}
      <button
        type="button"
        aria-current={editingId === undefined ? 'true' : undefined}
        className={cn(row, 'text-primary', editingId === undefined && 'bg-muted/60')}
        onClick={() => navigate({ to: '/connect', search: { server: 'new' }, replace: true })}
      >
        <Plus className="size-4" />
        <span className="text-sm">Add Server</span>
      </button>
    </SettingsSection>
  )
}

/** Edits `server`, or adds a new one when it's `null`. Saving connects to it. */
function ServerForm({ server, canDelete }: { server: ServerProfile | null; canDelete: boolean }) {
  const activeId = useSelector(serversAtom, (s) => s.activeId)
  const navigate = useNavigate()
  const id = useId()
  const [test, setTest] = useState<TestState>({ status: 'idle' })
  const [credentials, setSavedCredentials] = useState(() => (server ? credentialsFor(server.id) : null))
  const isActive = server?.id === activeId

  const form = useForm({
    defaultValues: {
      name: server?.name ?? '',
      mode: server && isSameOrigin(server) ? ('same-origin' as const) : ('custom' as const),
      url: server && !isSameOrigin(server) ? server.url : '',
      username: server?.username ?? '',
      password: credentials?.password ?? '',
      remember: server ? isRememberedInTab(server.id) : false,
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
      const profile = { name: value.name.trim(), url, username: value.username.trim() }
      const target = server ? server.id : addServer(profile).id
      if (server) updateServer(server.id, profile)
      const creds = profile.username || value.password ? { username: profile.username, password: value.password } : null
      setCredentials(creds, { rememberInTab: value.remember, id: target })
      switchServer(target)
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
            title={server ? 'Server' : 'New Server'}
            footer={
              field.state.value === 'same-origin'
                ? `Uses ${DEFAULT_RPC_PATH} on the address this page was loaded from — e.g. when installed as Transmission’s web interface. No extra setup needed.`
                : import.meta.env.DEV
                  ? 'In production builds, the server must allow cross-origin requests from this page (CORS), or both must sit behind the same reverse proxy.'
                  : 'The server must allow cross-origin requests from this page (CORS), including the X-Transmission-Session-Id header. Putting both behind the same reverse proxy avoids that.'
            }
          >
            <form.Field name="name">
              {(nameField) => (
                <SettingsRow label="Name" htmlFor={`${id}-name`}>
                  <form.Subscribe selector={(s) => [s.values.mode, s.values.url] as const}>
                    {([mode, url]) => (
                      <Input
                        id={`${id}-name`}
                        autoComplete="off"
                        className="w-48 sm:w-64"
                        placeholder={hostFor({
                          url: mode === 'custom' ? (normalizeRpcUrl(url) ?? url) : '',
                          username: '',
                        })}
                        value={nameField.state.value}
                        onChange={(event) => nameField.handleChange(event.target.value)}
                      />
                    )}
                  </form.Subscribe>
                </SettingsRow>
              )}
            </form.Field>
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
                        normalized && <p className="break-all font-mono text-muted-foreground text-xs">{normalized}</p>
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
          {server ? 'Save & Connect' : 'Add & Connect'}
        </Button>
        {isActive && credentials && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => {
              setCredentials(null)
              setSavedCredentials(null)
              form.setFieldValue('password', '')
            }}
          >
            Sign Out
          </Button>
        )}
        {server && canDelete && (
          <HoldButton
            type="button"
            variant="ghost"
            size="lg"
            className="text-destructive sm:mr-auto"
            title="Hold to delete"
            onConfirm={() => {
              removeServer(server.id)
              navigate({ to: '/connect', search: {}, replace: true })
            }}
          >
            Delete Server
          </HoldButton>
        )}
      </div>
    </form>
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
