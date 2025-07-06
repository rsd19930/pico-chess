"use client"

// This component represents a single square on the chess board
// It handles displaying the piece, highlighting, and click events

import type { PieceType, PlayerColor } from "@/lib/types"

// Props (properties) that this component receives from its parent
interface SquareProps {
  isLight: boolean // Whether this is a light or dark square (for checkerboard pattern)
  piece: { type: PieceType; color: PlayerColor } | null // The piece on this square (null if empty)
  isSelected: boolean // Whether this square is currently selected by the player
  isLegalMove: boolean // Whether this square is a legal destination for the selected piece
  isLastMoveFrom: boolean // Whether this square was the starting point of the last move
  isLastMoveTo: boolean // Whether this square was the destination of the last move
  isCheck: boolean // Whether this square contains a king that is in check
  onClick: () => void // Function to call when this square is clicked
  isAnimatingFrom?: boolean // Whether a piece is currently animating away from this square
}

export function Square({
  isLight,
  piece,
  isSelected,
  isLegalMove,
  isLastMoveFrom,
  isLastMoveTo,
  isCheck,
  onClick,
  isAnimatingFrom = false,
}: SquareProps) {
  // Determine the base color of the square (light or dark)
  const baseColor = isLight ? "bg-[#eeeeda]" : "bg-[#769656]"

  // Determine highlight color based on the square's state
  let highlightColor = ""
  if (isSelected) {
    // Blue highlight for the currently selected square
    highlightColor = "bg-blue-300 bg-opacity-50"
  } else if (isLegalMove) {
    // Different colors for legal moves: red for captures, green for empty squares
    highlightColor = piece ? "bg-red-300 bg-opacity-50" : "bg-green-300 bg-opacity-50"
  } else if (isLastMoveFrom || isLastMoveTo) {
    // Yellow highlight for the last move made
    highlightColor = "bg-yellow-300 bg-opacity-30"
  }

  // Red ring around the square if it contains a king in check
  const checkHighlight = isCheck ? "ring-4 ring-red-500 ring-opacity-70" : ""

  // Object mapping piece types and colors to their SVG image files
  const pieceIcons = {
    WHITE: {
      KING: "/king-white.svg",
      QUEEN: "/queen-white.svg",
      ROOK: "/rook-white.svg",
      BISHOP: "/bishop-white.svg",
      KNIGHT: "/knight-white.svg",
      PAWN: "/pawn-white.svg",
    },
    BLACK: {
      KING: "/king-black.svg",
      QUEEN: "/queen-black.svg",
      ROOK: "/rook-black.svg",
      BISHOP: "/bishop-black.svg",
      KNIGHT: "/knight-black.svg",
      PAWN: "/pawn-black.svg",
    },
  }

  // Only show the piece if there is one and it's not currently animating away
  const showPiece = piece && !isAnimatingFrom

  return (
    <div
      className={`relative w-[60px] h-[60px] ${baseColor} ${highlightColor} ${checkHighlight} flex items-center justify-center cursor-pointer`}
      onClick={onClick}
    >
      {/* Render the piece image if there's a piece to show */}
      {showPiece && (
        <img
          src={pieceIcons[piece.color][piece.type] || "/placeholder.svg"}
          alt={`${piece.color} ${piece.type}`}
          className="w-10 h-10 object-contain"
          draggable={false} // Prevent the image from being dragged
        />
      )}

      {/* Show a green dot for legal moves to empty squares */}
      {isLegalMove && !piece && <div className="absolute w-4 h-4 rounded-full bg-green-500 bg-opacity-50"></div>}

      {/* Show a red border for legal moves that would capture a piece */}
      {isLegalMove && piece && <div className="absolute inset-0 border-2 border-red-500 border-opacity-70"></div>}
    </div>
  )
}
