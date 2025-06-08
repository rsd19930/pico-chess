"use client"

// Online-only matchmaking screen with WebSocket integration
// Connects players through WebSocket server for real-time multiplayer

import { useState, useEffect, useRef } from "react"
import { WebSocketClient } from "@/lib/websocket-client"
import { soundManager } from "@/lib/sound-manager"

interface MatchmakingScreenProps {
  onMatchFound: (room: any, player: any, wsClient: WebSocketClient) => void
  onCancel: () => void
}

export function MatchmakingScreen({ onMatchFound, onCancel }: MatchmakingScreenProps) {
  const [matchmakingState, setMatchmakingState] = useState<"connecting" | "searching" | "waiting" | "found">(
    "connecting",
  )
  const [currentRoom, setCurrentRoom] = useState<any>(null)
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [waitingTime, setWaitingTime] = useState(0)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const [playerId] = useState(() => `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const wsClientRef = useRef<WebSocketClient | null>(null)
  const MAX_WAIT_TIME = 60

  // Initialize WebSocket connection
  useEffect(() => {
    initializeConnection()

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect()
      }
    }
  }, [])

  // Handle waiting timer
  useEffect(() => {
    if (matchmakingState === "waiting") {
      const timer = setInterval(() => {
        setWaitingTime((prev) => prev + 1)
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [matchmakingState])

  /**
   * Initialize WebSocket connection and set up handlers
   */
  const initializeConnection = async () => {
    try {
      // Enable sound on user interaction
      await soundManager.enable()

      setMatchmakingState("connecting")
      setConnectionError(null)

      // Create WebSocket client
      const wsClient = new WebSocketClient("ws://localhost:8080")
      wsClientRef.current = wsClient

      // Set up message handlers
      wsClient.on("waiting_for_opponent", (data) => {
        console.log("Waiting for opponent:", data)
        setCurrentRoom(data.room)
        setCurrentPlayer(data.yourPlayer)
        setMatchmakingState("waiting")
        setWaitingTime(0)
      })

      wsClient.on("game_found", (data) => {
        console.log("Game found:", data)
        setCurrentRoom(data.room)
        setCurrentPlayer(data.yourPlayer)
        setMatchmakingState("found")

        soundManager.play("game_start")

        // Start the game after a brief delay
        setTimeout(() => {
          onMatchFound(data.room, data.yourPlayer, wsClient)
        }, 2000)
      })

      wsClient.on("connection_lost", (data) => {
        console.error("Connection lost:", data)
        setConnectionError("Connection lost. Please try again.")
        setMatchmakingState("connecting")
      })

      // Connect to server
      await wsClient.connect()

      // Join matchmaking
      setMatchmakingState("searching")
      wsClient.send("join_matchmaking", { playerId })
    } catch (error) {
      console.error("Failed to connect:", error)
      setConnectionError("Failed to connect to game server. Please check your internet connection and try again.")
      setMatchmakingState("connecting")
    }
  }

  /**
   * Retry connection
   */
  const handleRetry = () => {
    initializeConnection()
  }

  /**
   * Cancel matchmaking
   */
  const handleCancel = () => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect()
    }
    onCancel()
  }

  const waitingProgress = Math.min((waitingTime / MAX_WAIT_TIME) * 100, 100)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Online Multiplayer</h1>
          <p className="text-gray-600">
            Player: <span className="font-semibold">{currentPlayer?.name || "You"}</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">🌐 Real-time WebSocket multiplayer</p>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
            <h3 className="text-red-700 font-semibold mb-2">Connection Error</h3>
            <p className="text-red-600 text-sm mb-3">{connectionError}</p>
            <button onClick={handleRetry} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Retry Connection
            </button>
          </div>
        )}

        {/* Matchmaking States */}
        {matchmakingState === "connecting" && !connectionError && (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Connecting to server...</h2>
            <p className="text-gray-500">Establishing WebSocket connection</p>
          </div>
        )}

        {matchmakingState === "searching" && (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Searching for opponent...</h2>
            <p className="text-gray-500">Looking for available players worldwide</p>
          </div>
        )}

        {matchmakingState === "waiting" && (
          <div className="mb-6">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div
                className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700">{MAX_WAIT_TIME - waitingTime}</span>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Waiting for opponent...</h2>
            <p className="text-gray-500 mb-4">
              {waitingTime < MAX_WAIT_TIME
                ? "Room created, waiting for another player to join"
                : "Adding bot opponent..."}
            </p>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${waitingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400">
              {waitingTime}s / {MAX_WAIT_TIME}s - Bot will join if no human player found
            </p>
          </div>
        )}

        {matchmakingState === "found" && (
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-lg font-semibold text-green-700 mb-2">Match Found!</h2>
            <p className="text-gray-500">
              {currentRoom?.players[1]?.isBot
                ? "You'll be playing against Kodiak (Bot)"
                : `Opponent: ${currentRoom?.players[1]?.name}`}
            </p>
            <p className="text-sm text-gray-400 mt-2">Starting game...</p>
          </div>
        )}

        {/* Room Info */}
        {currentRoom && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Game Room</h3>
            <p className="text-sm text-gray-600">Room ID: {currentRoom.id.slice(-8)}</p>
            <p className="text-sm text-gray-600">Players: {currentRoom.players?.length || 0}/2</p>
            {currentRoom.players?.map((player: any) => (
              <div key={player.id} className="flex items-center justify-between mt-2">
                <span className="text-sm">
                  {player.isBot ? "🤖" : "👤"} {player.name}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    player.color === "WHITE" ? "bg-gray-200 text-gray-700" : "bg-gray-800 text-white"
                  }`}
                >
                  {player.color}
                </span>
              </div>
            ))}
            {currentRoom.players?.length === 1 && matchmakingState === "waiting" && (
              <div className="flex items-center justify-between mt-2 text-gray-400">
                <span className="text-sm">⏳ Waiting for player...</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-100">BLACK</span>
              </div>
            )}
          </div>
        )}

        {/* Cancel Button */}
        {matchmakingState !== "found" && (
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Sound Status */}
        <div className="mt-4 text-xs text-gray-500">
          {soundManager.enabled ? "🔊 Sound enabled" : "🔇 Click to enable sound"}
        </div>
      </div>
    </div>
  )
}
