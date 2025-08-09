let sock: WebSocket | null = null
let timer: number | null = null

export function startPresence() {
  try {
    const token = localStorage.getItem('access')
    if (!token) return
    const wsBase = (import.meta.env.VITE_WS_BASE as string) || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
    sock = new WebSocket(`${wsBase}/ws/presence/?token=${token}`)
    sock.onopen = () => {
      // ping every 25s to refresh TTL
      timer = window.setInterval(() => {
        if (sock && sock.readyState === WebSocket.OPEN) {
          sock.send(JSON.stringify({ type: 'ping' }))
          // console.debug('[WS OUT] presence ping')
        }
      }, 25000)
    }
    sock.onclose = () => {
      if (timer) window.clearInterval(timer)
      timer = null
      sock = null
      // optional: try to reconnect after 5s
      setTimeout(startPresence, 5000)
    }
  } catch {}
}

export function stopPresence() {
  if (timer) window.clearInterval(timer)
  timer = null
  sock?.close()
  sock = null
}
