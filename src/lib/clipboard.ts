import { toast } from 'sonner'

/**
 * Copies text, falling back to `execCommand` where the async Clipboard API isn't available —
 * notably plain-HTTP LAN addresses (it requires a secure context), which is how most people
 * reach their Transmission box.
 */
export async function copyText(text: string, message = 'Copied'): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      textarea.remove()
      if (!ok) throw new Error('Copy command was rejected')
    }
    toast.success(message)
  } catch {
    toast.error('Couldn’t copy to the clipboard')
  }
}
