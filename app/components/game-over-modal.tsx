"use client"

// This modal appears when the game ends (checkmate, stalemate, draw, etc.)
// It shows the result and gives options to play again or return to main menu

import type { PlayerColor } from "@/lib/types"

// Props that this component receives
interface GameOverModalProps {
  winner: PlayerColor | null // Who won the game (null for draw)
  reason: string // How the game ended (checkmate, stalemate, etc.)
  onPlayAgain: () => void // Function to call when player wants to play again
  onMainMenu: () => void // Function to call when player wants to return to main menu
}

export function GameOverModal({ winner, reason, onPlayAgain, onMainMenu }: GameOverModalProps) {
  // Create the appropriate message based on who won and how
  let message = ""

  if (winner === "WHITE") {
    message = `Player 1 wins by ${reason}!`
  } else if (winner === "BLACK") {
    message = `Player 2 wins by ${reason}!`
  } else {
    // No winner means it's a draw
    message = "It's a draw!"
  }

  return (
    // Dark overlay that covers the entire screen
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* The actual modal content */}
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Game Over</h2>
        <p className="text-xl text-center mb-6">{message}</p>

        {/* Action buttons */}
        <div className="flex justify-center space-x-4">
          <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" onClick={onMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}
