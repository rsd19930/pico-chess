// Enhanced WebSocket client for real-time multiplayer chess
// Handles all communication between client and server

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandlers = new Map<string, (data: any) => void>()
  private isConnecting = false

  constructor(private url: string) {}

  /**
   * Connects to the WebSocket server
   */
  connect(): Promise<void> {
    if (this.isConnecting) {
      return Promise.reject(new Error("Already connecting"))
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        const timeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close()
            this.isConnecting = false
            reject(new Error("WebSocket connection timeout"))
          }
        }, 10000) // 10 second timeout

        this.ws.onopen = () => {
          console.log("Connected to WebSocket server")
          clearTimeout(timeout)
          this.reconnectAttempts = 0
          this.isConnecting = false
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error("Error parsing WebSocket message:", error)
          }
        }

        this.ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason)
          this.isConnecting = false
          this.handleDisconnection()
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          clearTimeout(timeout)
          this.isConnecting = false
          reject(new Error("WebSocket connection failed"))
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * Handles incoming messages from the server
   */
  private handleMessage(message: any) {
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      handler(message.data)
    } else {
      console.log("Unhandled message type:", message.type, message)
    }
  }

  /**
   * Handles disconnection and potential reconnection
   */
  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error)
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      console.error("Max reconnection attempts reached")
      // Notify handlers about permanent disconnection
      const handler = this.messageHandlers.get("connection_lost")
      if (handler) {
        handler({ reason: "Max reconnection attempts reached" })
      }
    }
  }

  /**
   * Registers a message handler for a specific message type
   */
  on(messageType: string, handler: (data: any) => void) {
    this.messageHandlers.set(messageType, handler)
  }

  /**
   * Removes a message handler
   */
  off(messageType: string) {
    this.messageHandlers.delete(messageType)
  }

  /**
   * Sends a message to the server
   */
  send(messageType: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: messageType,
          data,
        }),
      )
    } else {
      console.error("WebSocket not connected, cannot send message:", messageType)
      throw new Error("WebSocket not connected")
    }
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
  }

  /**
   * Gets the current connection state
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
