// Robust WebSocket client that tries several fallback URLs.
// Works in local dev, Vercel preview, and production deployments.

type MessageHandler = (data: any) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private isConnecting = false
  private urlIndex = 0
  private readonly urls: string[]

  private readonly handlers = new Map<string, MessageHandler>()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1_000 // ms

  constructor() {
    // 1️⃣ If NEXT_PUBLIC_WS_URL is set, use it exclusively.
    const envUrl = process.env.NEXT_PUBLIC_WS_URL
    if (envUrl) {
      this.urls = [envUrl]
      return
    }

    // 2️⃣ Otherwise, build a list of sensible defaults (only on client).
    if (typeof window === "undefined") {
      this.urls = []
      return
    }

    const { host, protocol } = window.location
    const secureHostUrl = `wss://${host}/api/socket`
    const insecureHostUrl = `ws://${host}/api/socket`
    const localhostUrl = "ws://localhost:8080"

    // If we’re already on http (not https) there’s no point in trying wss first.
    this.urls =
      protocol === "https:"
        ? [secureHostUrl, insecureHostUrl, localhostUrl]
        : [insecureHostUrl, localhostUrl, secureHostUrl]
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  async connect(): Promise<void> {
    if (this.isConnecting) throw new Error("WebSocketClient: already connecting")

    this.isConnecting = true
    this.urlIndex = 0
    await this.tryConnectSequentially()
    this.isConnecting = false
  }

  on(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler)
  }

  off(type: string) {
    this.handlers.delete(type)
  }

  send(type: string, data: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected")
    }
    this.ws.send(JSON.stringify({ type, data }))
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts // stop auto-retry
    this.ws?.close()
    this.ws = null
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private async tryConnectSequentially(): Promise<void> {
    // If we’ve already told listeners that no endpoint is available,
    // don’t spam again.
    if (this.handlers.get("__unavailable_fired")) {
      this.isConnecting = false
      return
    }

    while (this.urlIndex < this.urls.length) {
      const url = this.urls[this.urlIndex]
      try {
        await this.openWebSocket(url)
        console.log(`[ws] ✅ Connected → ${url}`)
        return
      } catch (err) {
        console.warn(`[ws] ❌  Connection failed (${url}):`, (err as Error).message)
        this.urlIndex += 1
      }
    }

    // All attempts failed – let the UI handle it (quietly)
    this.handlers.get("connection_unavailable")?.(null)
    // Mark that we’ve already notified to avoid multiple logs
    this.handlers.set("__unavailable_fired", () => {})
    this.isConnecting = false
  }

  private openWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      let settled = false

      const cleanup = () => {
        ws.onopen = ws.onerror = ws.onclose = ws.onmessage = null
      }

      ws.onopen = () => {
        this.ws = ws
        this.reconnectAttempts = 0
        settled = true
        cleanup()
        resolve()
      }

      ws.onerror = (evt) => {
        if (!settled) {
          settled = true
          cleanup()
          reject(new Error("WebSocket error"))
        } else {
          console.error("WebSocket runtime error:", evt)
        }
      }

      ws.onclose = () => {
        if (!settled) {
          settled = true
          cleanup()
          reject(new Error("WebSocket closed before opening"))
        } else {
          this.handleDisconnection()
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          const handler = this.handlers.get(msg.type)
          handler?.(msg.data)
        } catch (e) {
          console.error("Failed to parse WS message:", e)
        }
      }
    })
  }

  private handleDisconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[ws] Max reconnection attempts reached")
      this.handlers.get("connection_lost")?.({ reason: "max_retries" })
      return
    }
    this.reconnectAttempts += 1
    const delay = this.reconnectDelay * this.reconnectAttempts
    console.warn(`[ws] Lost connection – retrying in ${delay} ms`)
    setTimeout(() => {
      this.tryConnectSequentially().catch((err) => {
        console.error("[ws] Reconnect attempt failed:", err)
      })
    }, delay)
  }
}
