// Simple AI implementation for the bot player "Kodiak"
// Plays at an easy level while following all game rules

import type { GameState, Position, PieceType, PlayerColor } from "./types"
import { isLegalMove, dropPiece } from "./game-logic"

// Piece values for the bot's decision making
const PIECE_VALUES = {
  PAWN: 1,
  KNIGHT: 3,
  BISHOP: 3,
  ROOK: 5,
  QUEEN: 9,
  KING: 100, // Very high value to avoid losing the king
}

/**
 * Main function that determines the bot's next move
 * Returns the move to make, or null if no moves available
 */
export function getBotMove(
  gameState: GameState,
  botColor: PlayerColor,
): {
  type: "move" | "drop"
  from?: Position
  to: Position
  pieceType?: PieceType
} | null {
  // First, try to make a regular piece move
  const moveAction = getBestMove(gameState, botColor)
  if (moveAction) {
    return moveAction
  }

  // If no good moves, try dropping a piece from hand
  const dropAction = getBestDrop(gameState, botColor)
  if (dropAction) {
    return dropAction
  }

  return null // No moves available (shouldn't happen in a valid game)
}

/**
 * Finds the best regular move for the bot
 * Prioritizes captures, then safe moves
 */
function getBestMove(
  gameState: GameState,
  botColor: PlayerColor,
): {
  type: "move"
  from: Position
  to: Position
} | null {
  const allMoves: { from: Position; to: Position; score: number }[] = []

  // Find all possible moves for the bot's pieces
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const piece = gameState.board[row][col]
      if (piece && piece.color === botColor) {
        const from = { row, col }
        const legalMoves = isLegalMove(gameState, from, null, true)

        for (const to of legalMoves) {
          const score = evaluateMove(gameState, from, to, botColor)
          allMoves.push({ from, to, score })
        }
      }
    }
  }

  if (allMoves.length === 0) {
    return null
  }

  // Sort moves by score (highest first) and add some randomness for easy difficulty
  allMoves.sort((a, b) => b.score - a.score)

  // Easy mode: Sometimes pick a random move instead of the best one
  if (Math.random() < 0.3) {
    // 30% chance to make a random move
    const randomIndex = Math.floor(Math.random() * Math.min(3, allMoves.length))
    const move = allMoves[randomIndex]
    return { type: "move", from: move.from, to: move.to }
  }

  // Otherwise, pick the best move
  const bestMove = allMoves[0]
  return { type: "move", from: bestMove.from, to: bestMove.to }
}

/**
 * Evaluates how good a move is by assigning it a score
 * Higher scores are better moves
 */
function evaluateMove(gameState: GameState, from: Position, to: Position, botColor: PlayerColor): number {
  let score = 0

  const movingPiece = gameState.board[from.row][from.col]
  const targetPiece = gameState.board[to.row][to.col]

  // Bonus for capturing enemy pieces
  if (targetPiece && targetPiece.color !== botColor) {
    score += PIECE_VALUES[targetPiece.type] * 10 // High bonus for captures
  }

  // Small bonus for moving pieces toward the center
  const centerDistance = Math.abs(to.row - 2.5) + Math.abs(to.col - 2.5)
  score += (6 - centerDistance) * 0.5

  // Bonus for moving pawns forward
  if (movingPiece?.type === "PAWN") {
    if (botColor === "BLACK" && to.row < from.row) {
      score += 2 // Black pawns moving down (toward white)
    } else if (botColor === "WHITE" && to.row > from.row) {
      score += 2 // White pawns moving up (toward black)
    }
  }

  // Small penalty for moving the king early in the game
  if (movingPiece?.type === "KING") {
    score -= 1
  }

  return score
}

/**
 * Finds the best piece to drop from the bot's hand
 */
function getBestDrop(
  gameState: GameState,
  botColor: PlayerColor,
): {
  type: "drop"
  to: Position
  pieceType: PieceType
} | null {
  const hand = botColor === "WHITE" ? gameState.player1Hand : gameState.player2Hand
  const availableDrops: { to: Position; pieceType: PieceType; score: number }[] = []

  // Check each piece type in hand
  for (const [pieceType, count] of Object.entries(hand)) {
    if (count && count > 0) {
      // Find all valid drop positions for this piece type
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const to = { row, col }

          // Test if we can drop this piece here
          const testGameState = dropPiece(gameState, pieceType as PieceType, to)
          if (testGameState) {
            const score = evaluateDrop(gameState, to, pieceType as PieceType, botColor)
            availableDrops.push({ to, pieceType: pieceType as PieceType, score })
          }
        }
      }
    }
  }

  if (availableDrops.length === 0) {
    return null
  }

  // Sort by score and pick the best drop (with some randomness for easy mode)
  availableDrops.sort((a, b) => b.score - a.score)

  // Easy mode: Sometimes pick a random drop
  if (Math.random() < 0.4) {
    // 40% chance for random drop
    const randomIndex = Math.floor(Math.random() * Math.min(3, availableDrops.length))
    const drop = availableDrops[randomIndex]
    return { type: "drop", to: drop.to, pieceType: drop.pieceType }
  }

  const bestDrop = availableDrops[0]
  return { type: "drop", to: bestDrop.to, pieceType: bestDrop.pieceType }
}

/**
 * Evaluates how good a piece drop is
 */
function evaluateDrop(gameState: GameState, to: Position, pieceType: PieceType, botColor: PlayerColor): number {
  let score = PIECE_VALUES[pieceType] // Base value of the piece

  // Prefer dropping pieces in the center
  const centerDistance = Math.abs(to.row - 2.5) + Math.abs(to.col - 2.5)
  score += (6 - centerDistance) * 0.5

  // Prefer dropping attacking pieces closer to the enemy
  if (pieceType !== "PAWN") {
    if (botColor === "BLACK" && to.row < 3) {
      score += 2 // Black pieces closer to white side
    } else if (botColor === "WHITE" && to.row > 2) {
      score += 2 // White pieces closer to black side
    }
  }

  return score
}

/**
 * Adds a small delay to make the bot feel more human-like
 * Returns a promise that resolves after the delay
 */
export function getBotMoveWithDelay(
  gameState: GameState,
  botColor: PlayerColor,
): Promise<{
  type: "move" | "drop"
  from?: Position
  to: Position
  pieceType?: PieceType
} | null> {
  return new Promise((resolve) => {
    // Random delay between 1-3 seconds to make bot feel more natural
    const delay = 1000 + Math.random() * 2000

    setTimeout(() => {
      const move = getBotMove(gameState, botColor)
      resolve(move)
    }, delay)
  })
}
