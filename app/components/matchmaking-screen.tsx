"use client"

// Online-only matchmaking screen with WebSocket integration
// Connects players through WebSocket server for real-time multiplayer

import { useState, useEffect, useRef } from "react"
import { WebSocketClient } from "@/lib/websocket-client"
import { soundManager } from "@/lib/sound-manager"
import { getInitialGameState } from "@/lib/game-logic"

function createOfflineRoom(playerId: string) {
  const you = {
    id: playerId,
    name: "You",
    color: "WHITE",
    isBot: false,
    isConnected: true,
  }
  const bot = {
    id: "bot_kodiak",
    name: "Kodiak",
    color: "BLACK",
    isBot: true,
    isConnected: true,
  }
  return {
    room: {
      id: `offline_${Date.now()}`,
      players: [you, bot],
      gameState: getInitialGameState(),
      isGameStarted: true,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    },
    you,
  }
}

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

  // -- callbacks for websocket events -------------------------------
  const onWaiting = (data: any) => {
    console.log("Waiting for opponent:", data)
    setCurrentRoom(data.room)
    setCurrentPlayer(data.yourPlayer)
    setMatchmakingState("waiting")
    setWaitingTime(0)
  }

  const onFound = (data: any) => {
    console.log("Game found:", data)
    setCurrentRoom(data.room)
    setCurrentPlayer(data.yourPlayer)
    setMatchmakingState("found")
    soundManager.play("game_start")
    setTimeout(() => onMatchFound(data.room, data.yourPlayer, wsClientRef.current!), 2_000)
  }

  const onLost = () => {
    setConnectionError("Connection lost. Please try again.")
    setMatchmakingState("connecting")
  }

  const onUnavailable = () => {
    console.warn("No WebSocket server reachable – showing connection error")
    setConnectionError("Unable to connect to game servers. Please check your internet connection and try again.")
    setMatchmakingState("connecting")
  }

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

      // Create client & hook events
      const wsClient = new WebSocketClient()
      wsClientRef.current = wsClient

      wsClient.on("waiting_for_opponent", onWaiting)
      wsClient.on("game_found", onFound)
      wsClient.on("connection_lost", onLost)
      wsClient.on("connection_unavailable", onUnavailable)

      // Attempt connection *after* handlers are ready
      await wsClient.connect()

      // If connection successful, join matchmaking
      if (wsClient.isConnected) {
        setMatchmakingState("searching")
        wsClient.send("join_matchmaking", { playerId })
      }
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

  // Handle bot timeout after 60 seconds of waiting
  useEffect(() => {
    if (matchmakingState === "waiting" && waitingTime >= MAX_WAIT_TIME) {
      console.log("60 seconds elapsed, starting game with bot")

      // Create offline room with bot
      const { room, you } = createOfflineRoom(playerId)

      // Create dummy WebSocket client for offline play
      const dummyWsClient = {
        send: () => {},
        on: () => {},
        off: () => {},
        disconnect: () => {},
        get isConnected() {
          return false
        },
      } as unknown as WebSocketClient

      setMatchmakingState("found")
      setCurrentRoom(room)
      setCurrentPlayer(you)

      soundManager.play("game_start")
      setTimeout(() => onMatchFound(room, you, dummyWsClient), 2000)
    }
  }, [matchmakingState, waitingTime, MAX_WAIT_TIME, playerId, onMatchFound])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Online Multiplayer</h1>
          <p className="text-sm md:text-base text-gray-600">
            Player: <span className="font-semibold">{currentPlayer?.name || "You"}</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">🌐 Real-time WebSocket multiplayer</p>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="mb-6 p-3 md:p-4 bg-red-100 border border-red-300 rounded-lg">
            <h3 className="text-red-700 font-semibold mb-2 text-sm md:text-base">Connection Error</h3>
            <p className="text-red-600 text-xs md:text-sm mb-3">{connectionError}</p>
            <button
              onClick={handleRetry}
              className="px-3 md:px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm md:text-base"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Rest of the matchmaking states remain the same but with responsive text sizes */}
        {matchmakingState === "connecting" && !connectionError && (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-2">Connecting to server...</h2>
            <p className="text-sm md:text-base text-gray-500">Establishing WebSocket connection</p>
          </div>
        )}

        {matchmakingState === "searching" && (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-2">Searching for opponent...</h2>
            <p className="text-sm md:text-base text-gray-500">Looking for available players worldwide</p>
          </div>
        )}

        {matchmakingState === "waiting" && (
          <div className="mb-6">
            <div className="relative w-12 h-12 md:w-16 md:h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div
                className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs md:text-sm font-bold text-gray-700">{MAX_WAIT_TIME - waitingTime}</span>
              </div>
            </div>
            <h2 className="text-base md:text-lg font-semibold text-gray-700 mb-2">Waiting for opponent...</h2>
            <p className="text-sm md:text-base text-gray-500 mb-4">
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
            <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl md:text-2xl">✓</span>
            </div>
            <h2 className="text-base md:text-lg font-semibold text-green-700 mb-2">Match Found!</h2>
            <p className="text-sm md:text-base text-gray-500">
              {currentRoom?.players[1]?.isBot
                ? "You'll be playing against Kodiak (Bot)"
                : `Opponent: ${currentRoom?.players[1]?.name}`}
            </p>
            <p className="text-xs md:text-sm text-gray-400 mt-2">Starting game...</p>
          </div>
        )}

        {/* Room Info */}
        {currentRoom && (
          <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Game Room</h3>
            <p className="text-xs md:text-sm text-gray-600">Room ID: {currentRoom.id.slice(-8)}</p>
            <p className="text-xs md:text-sm text-gray-600">Players: {currentRoom.players?.length || 0}/2</p>
            {currentRoom.players?.map((player: any) => (
              <div key={player.id} className="flex items-center justify-between mt-2">
                <span className="text-xs md:text-sm">
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
                <span className="text-xs md:text-sm">⏳ Waiting for player...</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-100">BLACK</span>
              </div>
            )}
          </div>
        )}

        {/* Cancel Button */}
        {matchmakingState !== "found" && (
          <button
            onClick={handleCancel}
            className="px-4 md:px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm md:text-base"
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
