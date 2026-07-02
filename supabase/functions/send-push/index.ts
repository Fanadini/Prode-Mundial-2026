import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidEmail = Deno.env.get('VAPID_EMAIL') ?? 'admin@example.com'

webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 })

  const { title, body, url } = await req.json()

  const { data: subs } = await supabase
    .from('push_subscriptions').select('id, subscription')

  let sent = 0
  const toDelete: number[] = []

  await Promise.all(
    (subs ?? []).map(async ({ id, subscription }: { id: number; subscription: object }) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) toDelete.push(id)
      }
    })
  )

  if (toDelete.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', toDelete)
  }

  return new Response(JSON.stringify({ sent, removed: toDelete.length }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
