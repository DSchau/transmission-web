import { Link } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { ChevronRight, Turtle } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { connectionAtom, displayNameFor } from '@/lib/connection'
import { formatKBps } from '@/lib/format'
import { useSessionMutation } from '@/lib/mutations'
import { preferencesAtom, REFRESH_INTERVALS, type Theme, updatePreferences } from '@/lib/preferences'
import { useConnectionState, useSession } from '@/lib/queries'
import type { SessionInfo, SessionUpdate } from '@/lib/rpc/types'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { PageShell, SettingsRow, SettingsSection } from './page-shell'

export function SettingsPage() {
  const { data: session } = useSession()
  return (
    <PageShell title="Settings">
      <ServerSection />
      {session ? (
        <>
          <SpeedSection session={session} />
          <DownloadsSection session={session} />
        </>
      ) : (
        <Skeleton className="h-48 rounded-xl" />
      )}
      <AppSection />
      <SettingsSection title="About">
        {session && (
          <>
            <SettingsRow label="Transmission">
              <span className="text-muted-foreground text-sm">{session.version}</span>
            </SettingsRow>
            <SettingsRow label="RPC Version">
              <span className="text-muted-foreground text-sm">{session['rpc-version']}</span>
            </SettingsRow>
          </>
        )}
        <SettingsRow label="App Version">
          <span className="text-muted-foreground text-sm">{__APP_VERSION__}</span>
        </SettingsRow>
      </SettingsSection>
    </PageShell>
  )
}

function ServerSection() {
  const config = useSelector(connectionAtom)
  const state = useConnectionState()
  const [label, color] =
    state.status === 'connected'
      ? ['Connected', 'text-status-seeding']
      : state.status === 'connecting'
        ? ['Connecting…', 'text-muted-foreground']
        : state.status === 'unauthorized'
          ? ['Sign in required', 'text-status-checking']
          : [state.message, 'text-status-error']

  return (
    <SettingsSection title="Server">
      <Link to="/connect" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{displayNameFor(config)}</span>
          <span className={cn('truncate text-xs', color)}>{label}</span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </SettingsSection>
  )
}

function useSessionSetting() {
  const { mutate } = useSessionMutation()
  return (update: SessionUpdate) => mutate(update)
}

function SpeedSection({ session }: { session: SessionInfo }) {
  const update = useSessionSetting()
  const id = useId()
  return (
    <SettingsSection title="Speed">
      <SettingsRow
        htmlFor={`${id}-alt`}
        label={
          <span className="inline-flex items-center gap-2">
            <Turtle className="size-4 text-status-checking" /> Alternative Speeds
          </span>
        }
        description={`↓ ${formatKBps(session['alt-speed-down'])} · ↑ ${formatKBps(session['alt-speed-up'])}`}
      >
        <Switch
          id={`${id}-alt`}
          checked={session['alt-speed-enabled']}
          onCheckedChange={(v) => update({ 'alt-speed-enabled': v })}
        />
      </SettingsRow>
      <SettingsRow htmlFor={`${id}-down`} label="Limit Download">
        <Switch
          id={`${id}-down`}
          checked={session['speed-limit-down-enabled']}
          onCheckedChange={(v) => update({ 'speed-limit-down-enabled': v })}
        />
      </SettingsRow>
      {session['speed-limit-down-enabled'] && (
        <SettingsRow label="Download Limit" className="pl-9">
          <NumberField
            value={session['speed-limit-down']}
            unit="kB/s"
            label="Download limit"
            onCommit={(v) => update({ 'speed-limit-down': v })}
          />
        </SettingsRow>
      )}
      <SettingsRow htmlFor={`${id}-up`} label="Limit Upload">
        <Switch
          id={`${id}-up`}
          checked={session['speed-limit-up-enabled']}
          onCheckedChange={(v) => update({ 'speed-limit-up-enabled': v })}
        />
      </SettingsRow>
      {session['speed-limit-up-enabled'] && (
        <SettingsRow label="Upload Limit" className="pl-9">
          <NumberField
            value={session['speed-limit-up']}
            unit="kB/s"
            label="Upload limit"
            onCommit={(v) => update({ 'speed-limit-up': v })}
          />
        </SettingsRow>
      )}
    </SettingsSection>
  )
}

function DownloadsSection({ session }: { session: SessionInfo }) {
  const update = useSessionSetting()
  const id = useId()
  return (
    <SettingsSection title="Downloads">
      <div className="flex flex-col gap-1.5 px-5 py-3">
        <label htmlFor={`${id}-dir`} className="text-sm">
          Download Folder
        </label>
        <CommitInput
          id={`${id}-dir`}
          value={session['download-dir']}
          onCommit={(v) => update({ 'download-dir': v })}
          className="font-mono text-xs"
        />
      </div>
      <SettingsRow htmlFor={`${id}-start`} label="Start Added Torrents">
        <Switch
          id={`${id}-start`}
          checked={session['start-added-torrents']}
          onCheckedChange={(v) => update({ 'start-added-torrents': v })}
        />
      </SettingsRow>
      <SettingsRow htmlFor={`${id}-ratio`} label="Stop Seeding at Ratio">
        <Switch
          id={`${id}-ratio`}
          checked={session.seedRatioLimited}
          onCheckedChange={(v) => update({ seedRatioLimited: v })}
        />
      </SettingsRow>
      {session.seedRatioLimited && (
        <SettingsRow label="Ratio" className="pl-9">
          <NumberField
            value={session.seedRatioLimit}
            step={0.1}
            label="Seed ratio limit"
            onCommit={(v) => update({ seedRatioLimit: v })}
          />
        </SettingsRow>
      )}
    </SettingsSection>
  )
}

function AppSection() {
  const refreshInterval = useSelector(preferencesAtom, (p) => p.refreshInterval)
  const { theme, setTheme } = useTheme()
  return (
    <SettingsSection title="App" footer="These preferences are stored in this browser.">
      <SettingsRow label="Refresh Every">
        <Select
          value={String(refreshInterval)}
          onValueChange={(v) => updatePreferences({ refreshInterval: Number(v) })}
        >
          <SelectTrigger className="w-28" aria-label="Refresh interval">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {REFRESH_INTERVALS.map((seconds) => (
              <SelectItem key={seconds} value={String(seconds)}>
                {seconds} sec
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
      <SettingsRow label="Appearance">
        <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <SelectTrigger className="w-28" aria-label="Appearance">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
    </SettingsSection>
  )
}

/** Text input that only commits on Enter / blur, and follows server-side changes otherwise. */
function CommitInput({
  value,
  onCommit,
  ...props
}: { value: string; onCommit: (value: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange'
>) {
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(value)
  }, [value, focused])

  const commit = () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    else setText(value)
  }

  return (
    <Input
      {...props}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

function NumberField({
  value,
  onCommit,
  unit,
  step = 1,
  label,
}: {
  value: number
  onCommit: (value: number) => void
  unit?: string
  step?: number
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <CommitInput
        value={String(value)}
        onCommit={(text) => {
          const parsed = Number(text)
          if (Number.isFinite(parsed) && parsed >= 0) onCommit(step < 1 ? parsed : Math.round(parsed))
        }}
        inputMode={step < 1 ? 'decimal' : 'numeric'}
        aria-label={label}
        className="w-24 text-right tabular-nums"
      />
      {unit && <span className="w-9 text-muted-foreground text-sm">{unit}</span>}
    </div>
  )
}
