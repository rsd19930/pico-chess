"use client"

import type React from "react"

// This component creates a flying animation when a piece is captured
// The captured piece flies from its board position to the opponent's hand area

import { useEffect, useRef } from "react"
import type { PieceType, PlayerColor, Position } from "@/lib/types"

interface CaptureAnimationProps {
  piece: { type: PieceType; color: PlayerColor } // The piece that was captured
  fromPosition: Position // Where the piece was captured on the board
  toPlayerColor: PlayerColor // Which player captured it (where it should fly to)
  onComplete: () => void // Called when animation finishes
  player1HandRef: React.RefObject<HTMLDivElement> // Reference to Player 1's hand area
  player2HandRef: React.RefObject<HTMLDivElement> // Reference to Player 2's hand area
  boardRef: React.RefObject<HTMLDivElement> // Reference to the chess board
}

export function CaptureAnimation({
  piece,
  fromPosition,
  toPlayerColor,
  onComplete,
  player1HandRef,
  player2HandRef,
  boardRef,
}: CaptureAnimationProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  /**
   * Converts a board position to pixel coordinates relative to the board
   * Takes into account that the board is visually flipped
   */
  const getBoardPixelPosition = (position: Position) => {
    if (!boardRef.current) return { x: 0, y: 0 }

    const boardRect = boardRef.current.getBoundingClientRect()
    // Account for the flipped board (5 - row) so white pieces appear at bottom
    const visualRow = 5 - position.row

    return {
      x: position.col * 60 + 30, // 60px per square, center of square
      y: visualRow * 60 + 30,
    }
  }

  /**
   * Gets the pixel coordinates of the player's hand area relative to the SVG
   * This calculates the real position of the hand container
   */
  const getHandPixelPosition = (playerColor: PlayerColor) => {
    const handRef = playerColor === "WHITE" ? player1HandRef : player2HandRef

    if (!handRef.current || !boardRef.current || !svgRef.current) {
      // Fallback positions if refs aren't available
      return playerColor === "WHITE" ? { x: 180, y: 500 } : { x: 180, y: 60 }
    }

    // Get the bounding rectangles of the hand area and board
    const handRect = handRef.current.getBoundingClientRect()
    const boardRect = boardRef.current.getBoundingClientRect()
    const svgRect = svgRef.current.getBoundingClientRect()

    // Calculate the center of the hand area relative to the SVG coordinate system
    const handCenterX = handRect.left + handRect.width / 2 - svgRect.left
    const handCenterY = handRect.top + handRect.height / 2 - svgRect.top

    return {
      x: handCenterX,
      y: handCenterY,
    }
  }

  // Calculate start and end positions for the animation
  const startPos = getBoardPixelPosition(fromPosition)
  const endPos = getHandPixelPosition(toPlayerColor)

  // Create SVG path for the flying animation with a smooth curve
  const createFlyingPath = () => {
    // Calculate control point for a smooth curve
    const controlX = (startPos.x + endPos.x) / 2
    const controlY = Math.min(startPos.y, endPos.y) - 80 // Higher curve for better visibility

    // Create a smooth quadratic bezier curve
    return `M ${startPos.x} ${startPos.y} Q ${controlX} ${controlY} ${endPos.x} ${endPos.y}`
  }

  const flyingPath = createFlyingPath()

  // Set up the animation timer
  useEffect(() => {
    // Animation duration for the flying effect
    const flyingTimer = setTimeout(() => {
      onComplete() // Tell the parent component that animation is done
    }, 1200) // Slightly longer for better visibility

    // Cleanup function to cancel the timer if component unmounts
    return () => clearTimeout(flyingTimer)
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

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {/* SVG element that covers the entire viewport for accurate positioning */}
      <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0" style={{ overflow: "visible" }}>
        {/* Animated captured piece group */}
        <g>
          {/* This makes the piece follow the curved flying path */}
          <animateMotion dur="1.2s" path={flyingPath} fill="freeze" />
          {/* Add a subtle scaling animation to show the piece getting smaller as it reaches the hand */}
          <animateTransform attributeName="transform" type="scale" values="1;0.9;0.7" dur="1.2s" fill="freeze" />
          {/* The actual captured piece image that flies - NO FADING */}
          <image href={pieceIcons[piece.color][piece.type]} x="-20" y="-20" width="40" height="40" />
        </g>
      </svg>
    </div>
  )
}
