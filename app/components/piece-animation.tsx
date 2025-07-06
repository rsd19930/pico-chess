"use client"

import { useEffect } from "react"
import type { PieceType, PlayerColor, Position } from "@/lib/types"

interface PieceAnimationProps {
  piece: { type: PieceType; color: PlayerColor }
  fromPosition: Position
  toPosition: Position
  onComplete: () => void
}

export function PieceAnimation({ piece, fromPosition, toPosition, onComplete }: PieceAnimationProps) {
  /**
   * Calculates the path that a piece should follow when moving
   * Different pieces move differently (e.g., rooks move in straight lines, bishops diagonally)
   */
  const calculatePath = (piece: { type: PieceType; color: PlayerColor }, from: Position, to: Position): Position[] => {
    const path: Position[] = [from] // Start with the starting position

    switch (piece.type) {
      case "KNIGHT":
        // Knight moves in L-shape, so it goes directly (no intermediate points needed for visual)
        path.push(to)
        break

      case "ROOK":
        // Rook moves in straight lines (horizontal or vertical)
        if (from.row === to.row) {
          // Horizontal movement - add each square along the way
          const step = from.col < to.col ? 1 : -1
          for (let col = from.col + step; col !== to.col; col += step) {
            path.push({ row: from.row, col })
          }
        } else {
          // Vertical movement - add each square along the way
          const step = from.row < to.row ? 1 : -1
          for (let row = from.row + step; row !== to.row; row += step) {
            path.push({ row, col: from.col })
          }
        }
        path.push(to)
        break

      case "BISHOP":
        // Bishop moves diagonally - add each square along the diagonal
        const rowStep = from.row < to.row ? 1 : -1
        const colStep = from.col < to.col ? 1 : -1
        let currentRow = from.row + rowStep
        let currentCol = from.col + colStep

        while (currentRow !== to.row && currentCol !== to.col) {
          path.push({ row: currentRow, col: currentCol })
          currentRow += rowStep
          currentCol += colStep
        }
        path.push(to)
        break

      case "KING":
      case "PAWN":
      default:
        // King and Pawn move directly to adjacent squares
        path.push(to)
        break
    }

    return path
  }

  // Calculate the path for this specific piece movement
  const path = calculatePath(piece, fromPosition, toPosition)

  /**
   * Converts a board position (row, col) to pixel coordinates for animation
   * Takes into account that the board is visually flipped and responsive sizing
   */
  const getPixelPosition = (position: Position) => {
    // Account for the flipped board (5 - row) so white pieces appear at bottom
    const visualRow = 5 - position.row
    // Use responsive sizing - 50px per square on mobile, 60px on desktop
    const squareSize = window.innerWidth < 768 ? 50 : 60
    const centerOffset = squareSize / 2

    return {
      x: position.col * squareSize + centerOffset,
      y: visualRow * squareSize + centerOffset,
    }
  }

  /**
   * Creates an SVG path string that the piece will follow during animation
   * This creates a smooth line connecting all the positions in the path
   */
  const createSVGPath = () => {
    const pixelPath = path.map(getPixelPosition)
    let pathString = `M ${pixelPath[0].x} ${pixelPath[0].y}` // Move to starting position

    // Add line segments to each subsequent position
    for (let i = 1; i < pixelPath.length; i++) {
      pathString += ` L ${pixelPath[i].x} ${pixelPath[i].y}`
    }

    return pathString
  }

  const svgPath = createSVGPath()

  // Set up the animation timer
  useEffect(() => {
    // Start slide animation and complete after it finishes
    const slideTimer = setTimeout(() => {
      onComplete() // Tell the parent component that animation is done
    }, 300) // Animation duration: 300 milliseconds (0.3 seconds)

    // Cleanup function to cancel the timer if component unmounts
    return () => clearTimeout(slideTimer)
  }, [onComplete])

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

  const boardSize = window.innerWidth < 768 ? 300 : 360

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* SVG element that covers the entire board for animation */}
      <svg width={boardSize} height={boardSize} className="absolute inset-0">
        {/* Animated piece group */}
        <g>
          {/* This makes the piece follow the calculated path over 0.3 seconds */}
          <animateMotion dur="0.3s" path={svgPath} fill="freeze" />
          {/* The actual piece image that moves along the path */}
          <image
            href={pieceIcons[piece.color][piece.type]}
            x="-15"
            y="-15"
            width="30"
            height="30"
            className="md:w-10 md:h-10"
          />
        </g>
      </svg>
    </div>
  )
}
