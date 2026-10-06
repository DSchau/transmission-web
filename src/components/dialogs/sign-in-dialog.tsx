import { useForm } from '@tanstack/react-form'
import { useLocation } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { useId, useState } from 'react'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  connectionAtom,
  displayNameFor,
  isRememberedInTab,
  offerToPasswordManager,
  rpcUrlFor,
  setCredentials,
} from '@/lib/connection'
import { useConnectionState } from '@/lib/queries'
import { TransmissionClient } from '@/lib/rpc/client'
import { signInDismissedAtom } from '@/lib/ui'

/**
 * Appears when the daemon answers 401. The password is kept in memory (optionally for this
 * tab) and never persisted; the form is set up so browser password managers can fill it.
 */
export function SignInDialog() {
  const state = useConnectionState()
  const dismissed = useSelector(signInDismissedAtom)
  const { pathname } = useLocation()
  const open = state.status === 'unauthorized' && !dismissed && pathname !== '/connect'

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => signInDismissedAtom.set(!next)}
      title="Sign In"
      description={`${displayNameFor(connectionAtom.get())} requires a username and password.`}
    >
      <SignInForm onDone={() => signInDismissedAtom.set(false)} />
    </ResponsiveDialog>
  )
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const config = useSelector(connectionAtom)
  const id = useId()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { username: config.username, password: '', remember: isRememberedInTab() },
    onSubmit: async ({ value }) => {
      setError(null)
      const credentials = { username: value.username.trim(), password: value.password }
      try {
        await new TransmissionClient(rpcUrlFor(config), credentials).session()
      } catch (e) {
        setError((e as Error).message)
        return
      }
      connectionAtom.set({ ...config, username: credentials.username })
      setCredentials(credentials, { rememberInTab: value.remember })
      void offerToPasswordManager(credentials)
      onDone()
    },
  })

  return (
    <form
      className="pb-4 md:pb-0"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="username">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`${id}-username`}>Username</FieldLabel>
              <Input
                id={`${id}-username`}
                name="username"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                autoFocus={!config.username}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
              <Input
                id={`${id}-password`}
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus={!!config.username}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="remember">
          {(field) => (
            <Field orientation="horizontal">
              <Checkbox
                id={`${id}-remember`}
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor={`${id}-remember`}>Stay signed in for this tab</FieldLabel>
                <FieldDescription>
                  Kept in session storage until the tab closes. Otherwise, reloading signs you out. Your browser’s
                  password manager can also remember it.
                </FieldDescription>
              </div>
            </Field>
          )}
        </form.Field>
        {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Sign In
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
