// Generá tus claves con: npx web-push generate-vapid-keys
// Luego agregá NEXT_PUBLIC_VAPID_PUBLIC_KEY en .github/workflows/deploy.yml
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function getPushState(): Promise<'unsupported' | 'denied' | 'granted' | 'default'> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  return Notification.permission as 'denied' | 'granted' | 'default'
}

export async function subscribeToPush(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const reg = await navigator.serviceWorker.register('/Prode-Mundial-2026/sw.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: userId, subscription: sub.toJSON() }, { onConflict: 'user_id' })

    return true
  } catch {
    return false
  }
}
