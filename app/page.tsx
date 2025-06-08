"use client"

// Main page component for online multiplayer Pico Chess
// Handles navigation between home, matchmaking, and game screens

import { useState } from "react"
import { ChessBoard } from "@/app/components/chess-board"
import { MatchmakingScreen } from "@/app/components/matchmaking-screen"
import type { PlayerColor } from "@/lib/types"
import type { WebSocketClient } from "@/lib/websocket-client"

type AppScreen = "home" | "matchmaking" | "game"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home")
  const [currentRoom, setCurrentRoom] = useState<any>(null)
  const [currentPlayer, setCurrentPlayer] = useState<any>(null)
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null)
  const [gameResult, setGameResult] = useState<{ winner: PlayerColor | null; reason: string } | null>(null)

  /**
   * Start online matchmaking
   */
  const handleStartGame = () => {
    setCurrentScreen("matchmaking")
    setGameResult(null)
  }

  /**
   * Handle when a match is found
   */
  const handleMatchFound = (room: any, player: any, wsClientInstance: WebSocketClient) => {
    console.log("Match found:", { room, player })

    if (!room || !player || !wsClientInstance) {
      console.error("Invalid match data received")
      setCurrentScreen("home")
      return
    }

    setCurrentRoom(room)
    setCurrentPlayer(player)
    setWsClient(wsClientInstance)
    setCurrentScreen("game")
  }

  /**
   * Handle matchmaking cancellation
   */
  const handleMatchmakingCancel = () => {
    setCurrentScreen("home")
  }

  /**
   * Handle game over
   */
  const handleGameOver = (winner: PlayerColor | null, reason: string) => {
    setGameResult({ winner, reason })
  }

  /**
   * Handle exit game
   */
  const handleExitGame = () => {
    setCurrentScreen("home")
    setCurrentRoom(null)
    setCurrentPlayer(null)
    setWsClient(null)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      {/* HOME SCREEN */}
      {currentScreen === "home" && (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-blue-600">Pico Chess</h1>
            <h2 className="text-2xl text-blue-500 mt-2">- Online Multiplayer</h2>
          </div>

          <div className="mb-8">
            <img
              src="/pico-chess-homescreen.png"
              alt="Pico Chess - Two children playing chess"
              className="w-80 h-auto rounded-lg shadow-lg"
            />
          </div>

          <button
            className="px-6 py-3 bg-blue-500 text-white rounded-lg text-xl font-semibold hover:bg-blue-600 transition-colors"
            onClick={handleStartGame}
          >
            🌐 Play Online
          </button>

          {gameResult && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="font-medium">
                Last game:{" "}
                {gameResult.winner === currentPlayer?.color ? "You" : gameResult.winner ? "Opponent" : "Draw"}
                {gameResult.winner ? ` won by ${gameResult.reason}` : ` (${gameResult.reason})`}
              </p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 text-center">
            <p>🌐 Real-time multiplayer with WebSocket</p>
            <p>🎵 Enhanced with sound effects</p>
            <p>🤖 Bot opponent if no players available</p>
            <p className="mt-2 text-xs text-gray-400">Note: Requires WebSocket server running on localhost:8080</p>
          </div>
        </div>
      )}

      {/* MATCHMAKING SCREEN */}
      {currentScreen === "matchmaking" && (
        <MatchmakingScreen onMatchFound={handleMatchFound} onCancel={handleMatchmakingCancel} />
      )}

      {/* GAME SCREEN */}
      {currentScreen === "game" && (
        <div className="w-full max-w-2xl">
          {currentRoom && currentPlayer && wsClient ? (
            <ChessBoard
              gameRoom={currentRoom}
              currentPlayer={currentPlayer}
              wsClient={wsClient}
              onGameOver={handleGameOver}
              onExitGame={handleExitGame}
            />
          ) : (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>Loading game...</p>
                <button
                  onClick={() => setCurrentScreen("home")}
                  className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
