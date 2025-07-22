// Robust WebSocket client that tries several fallback URLs.
// Works in local dev, Vercel preview, and production deployments.

type MessageHandler = (data: any) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private isConnecting = false
  private urlIndex = 0
  private urls: string[]

  private readonly handlers = new Map<string, MessageHandler>()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 2_000 // ms

  constructor() {
    this.urls = []
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  async connect(): Promise<void> {
    // Build URLs when connecting (not in constructor) to get current window.location
    this.buildWebSocketUrls()
    
    if (this.isConnecting) {
      console.warn("WebSocket already connecting, skipping...")
      return
    }
    
    if (this.isConnected) {
      console.log("WebSocket already connected")
      return
    }

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
      console.warn("WebSocket not connected, cannot send message:", type)
      return
    }
    this.ws.send(JSON.stringify({ type, data }))
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts // stop auto-retry
    if (this.ws) {
      this.ws.close()
    }
    this.ws = null
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                   */
  /* ------------------------------------------------------------------ */

  private buildWebSocketUrls(): void {
    if (typeof window === 'undefined') return []
    
    // Get current port from window.location
    const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    const currentHost = window.location.hostname
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    
    // Build WebSocket URLs - try current host with port 8080, then localhost fallbacks
    this.urls = [
      `${protocol}//${currentHost}:8080`,
      `ws://localhost:8080`,
      `ws://127.0.0.1:8080`
    ]
    
    console.log('WebSocket URLs to try:', this.urls)
  }

  private async tryConnectSequentially(): Promise<void> {
    while (this.urlIndex < this.urls.length) {
      const url = this.urls[this.urlIndex]
      console.log(`Trying to connect to: ${url}`)
      try {
        await this.openWebSocket(url)
        console.log(`[ws] ✅ Connected → ${url}`)
        this.isConnecting = false
        return
      } catch (err) {
        console.warn(`[ws] ❌  Connection failed (${url}):`, (err as Error).message)
        this.urlIndex += 1
      }
    }

    // All attempts failed
    console.error('[ws] All connection attempts failed')
    this.handlers.get("connection_unavailable")?.(null)
    this.isConnecting = false
  }

  private openWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url)
      let settled = false
      
      // Set a connection timeout
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          ws.close()
          reject(new Error("Connection timeout"))
        }
      }, 5000) // 5 second timeout

      const cleanup = () => {
        clearTimeout(timeout)
        ws.onopen = ws.onerror = ws.onclose = ws.onmessage = null
      }

      ws.onopen = () => {
        console.log(`WebSocket connected to ${url}`)
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
          reject(new Error(`WebSocket error for ${url}`))
        } else {
          console.error("WebSocket runtime error:", evt)
        }
      }

      ws.onclose = () => {
        if (!settled) {
          settled = true
          cleanup()
          reject(new Error(`WebSocket closed before opening for ${url}`))
        } else {
          console.log("WebSocket connection closed")
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
    this.ws = null
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[ws] Max reconnection attempts reached")
      this.handlers.get("connection_lost")?.({ reason: "max_retries" })
      return
    }
    
    this.reconnectAttempts += 1
    const delay = this.reconnectDelay * this.reconnectAttempts
    console.warn(`[ws] Lost connection – retrying in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.isConnecting = false // Reset connecting state
      this.tryConnectSequentially().catch((err) => {
        console.error("[ws] Reconnect attempt failed:", err)
      })
    }, delay)
  }
}