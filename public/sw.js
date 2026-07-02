self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Prode Mundial 2026', {
      body: data.body ?? '',
      icon: '/Prode-Mundial-2026/icon-192-v2.png',
      badge: '/Prode-Mundial-2026/icon-192-v2.png',
      data: { url: data.url ?? '/Prode-Mundial-2026/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(event.notification.data.url)
    })
  )
})
