"use client"

// This modal appears when a pawn reaches the opposite end of the board
// The player must choose what piece type to promote the pawn to

import type { PieceType, PlayerColor } from "@/lib/types"

// Props that this component receives
interface PromotionModalProps {
  color: PlayerColor // Color of the pawn being promoted
  onSelect: (pieceType: PieceType) => void // Function to call when player selects a piece type
}

export function PromotionModal({ color, onSelect }: PromotionModalProps) {
  // In Pico Chess, pawns can only promote to these three piece types
  const pieceOptions: PieceType[] = ["ROOK", "KNIGHT", "BISHOP"]

  // Object mapping piece types and colors to their SVG image files
  const pieceIcons = {
    WHITE: {
      ROOK: "/rook-white.svg",
      BISHOP: "/bishop-white.svg",
      KNIGHT: "/knight-white.svg",
    },
    BLACK: {
      ROOK: "/rook-black.svg",
      BISHOP: "/bishop-black.svg",
      KNIGHT: "/knight-black.svg",
    },
  }

  return (
    // Dark overlay that covers the entire screen
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* The actual modal content */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Promote to:</h2>

        {/* Row of buttons for each promotion option */}
        <div className="flex space-x-4">
          {pieceOptions.map((pieceType) => (
            <button
              key={pieceType}
              className="w-16 h-16 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
              onClick={() => onSelect(pieceType)} // Call the parent function when clicked
            >
              {/* Show the piece image */}
              <img
                src={pieceIcons[color][pieceType] || "/placeholder.svg"}
                alt={`${color} ${pieceType}`}
                className="w-12 h-12"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
