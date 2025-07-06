// This file contains all the core game logic for Pico Chess
// It handles piece movement, game rules, and win/lose conditions

import type { GameState, Piece, PieceType, PlayerColor, Position } from "./types"

/**
 * Creates and returns the initial game state when a new game starts
 * Sets up the 6x6 board with pieces in their starting positions
 */
export function getInitialGameState(): GameState {
  // Create an empty 6x6 board filled with null values
  const board: (Piece | null)[][] = Array(6)
    .fill(null)
    .map(() => Array(6).fill(null))

  // Set up White pieces in their starting positions (bottom-left corner)
  board[0][0] = { type: "KING", color: "WHITE" } // King at bottom-left
  board[0][1] = { type: "ROOK", color: "WHITE" } // Rook next to king
  board[0][2] = { type: "KNIGHT", color: "WHITE" } // Knight next to rook
  board[0][3] = { type: "BISHOP", color: "WHITE" } // Bishop next to knight
  board[1][0] = { type: "PAWN", color: "WHITE" } // Pawn in front of king

  // Set up Black pieces in their starting positions (top-right corner)
  board[5][5] = { type: "KING", color: "BLACK" } // King at top-right
  board[5][4] = { type: "ROOK", color: "BLACK" } // Rook next to king
  board[5][3] = { type: "KNIGHT", color: "BLACK" } // Knight next to rook
  board[5][2] = { type: "BISHOP", color: "BLACK" } // Bishop next to knight
  board[4][5] = { type: "PAWN", color: "BLACK" } // Pawn in front of king

  // Return the complete initial game state
  return {
    board,
    currentPlayer: "WHITE", // White always goes first in chess
    // Both players start with empty hands (no captured pieces)
    player1Hand: { KING: 0, QUEEN: 0, ROOK: 0, BISHOP: 0, KNIGHT: 0, PAWN: 0 },
    player2Hand: { KING: 0, QUEEN: 0, ROOK: 0, BISHOP: 0, KNIGHT: 0, PAWN: 0 },
    lastMove: null, // No moves have been made yet
    checkedKingPosition: null, // No king is in check at the start
  }
}

/**
 * Checks if a move is legal and returns all legal destination positions
 * This is the main function used to validate moves and show possible moves
 *
 * @param gameState - Current state of the game
 * @param from - Position of the piece to move
 * @param to - Specific destination to check (optional)
 * @param getAllLegalMoves - If true, returns all legal moves instead of checking one specific move
 * @returns Array of legal destination positions
 */
export function isLegalMove(
  gameState: GameState,
  from: Position,
  to: Position | null,
  getAllLegalMoves = false,
): Position[] {
  // Get the piece at the starting position
  const piece = gameState.board[from.row][from.col]

  // Can't move if there's no piece or if it's not the current player's piece
  if (!piece || piece.color !== gameState.currentPlayer) {
    return []
  }

  const legalMoves: Position[] = []

  // Get all potential moves based on the piece's movement rules
  const potentialMoves = getPotentialMoves(gameState, from)

  // Filter out moves that would put or leave the king in check
  // This is important because you can't make a move that puts your own king in danger
  for (const move of potentialMoves) {
    if (!wouldKingBeInCheck(gameState, from, move)) {
      legalMoves.push(move)
    }
  }

  // If we're checking a specific destination, filter to just that move
  if (to && !getAllLegalMoves) {
    return legalMoves.filter((move) => move.row === to.row && move.col === to.col)
  }

  return legalMoves
}

/**
 * Gets all potential moves for a piece based on its movement rules
 * This doesn't consider check - it just follows the basic movement patterns
 *
 * @param gameState - Current state of the game
 * @param from - Position of the piece to get moves for
 * @returns Array of potential destination positions
 */
function getPotentialMoves(gameState: GameState, from: Position): Position[] {
  const piece = gameState.board[from.row][from.col]
  if (!piece) return []

  const moves: Position[] = []

  // Each piece type has different movement rules
  switch (piece.type) {
    case "KING":
      // King moves one square in any direction (8 possible moves)
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
          // Skip the current position (no offset)
          if (rowOffset === 0 && colOffset === 0) continue

          const newRow = from.row + rowOffset
          const newCol = from.col + colOffset

          // Check if the new position is within the board boundaries
          if (isValidPosition(newRow, newCol)) {
            const targetPiece = gameState.board[newRow][newCol]
            // Can move to empty squares or capture enemy pieces
            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({ row: newRow, col: newCol })
            }
          }
        }
      }
      break

    case "ROOK":
      // Rook moves horizontally or vertically any number of squares

      // Check horizontal moves (left and right)
      for (let direction = -1; direction <= 1; direction += 2) {
        for (let offset = 1; offset < 6; offset++) {
          const newCol = from.col + direction * offset
          if (!isValidPosition(from.row, newCol)) break

          const targetPiece = gameState.board[from.row][newCol]
          if (!targetPiece) {
            // Empty square - can move here and continue
            moves.push({ row: from.row, col: newCol })
          } else {
            // There's a piece here
            if (targetPiece.color !== piece.color) {
              // Enemy piece - can capture it
              moves.push({ row: from.row, col: newCol })
            }
            // Can't move past any piece (friend or foe)
            break
          }
        }
      }

      // Check vertical moves (up and down)
      for (let direction = -1; direction <= 1; direction += 2) {
        for (let offset = 1; offset < 6; offset++) {
          const newRow = from.row + direction * offset
          if (!isValidPosition(newRow, from.col)) break

          const targetPiece = gameState.board[newRow][from.col]
          if (!targetPiece) {
            // Empty square - can move here and continue
            moves.push({ row: newRow, col: from.col })
          } else {
            // There's a piece here
            if (targetPiece.color !== piece.color) {
              // Enemy piece - can capture it
              moves.push({ row: newRow, col: from.col })
            }
            // Can't move past any piece (friend or foe)
            break
          }
        }
      }
      break

    case "BISHOP":
      // Bishop moves diagonally any number of squares
      for (let rowDirection = -1; rowDirection <= 1; rowDirection += 2) {
        for (let colDirection = -1; colDirection <= 1; colDirection += 2) {
          for (let offset = 1; offset < 6; offset++) {
            const newRow = from.row + rowDirection * offset
            const newCol = from.col + colDirection * offset

            if (!isValidPosition(newRow, newCol)) break

            const targetPiece = gameState.board[newRow][newCol]
            if (!targetPiece) {
              // Empty square - can move here and continue
              moves.push({ row: newRow, col: newCol })
            } else {
              // There's a piece here
              if (targetPiece.color !== piece.color) {
                // Enemy piece - can capture it
                moves.push({ row: newRow, col: newCol })
              }
              // Can't move past any piece (friend or foe)
              break
            }
          }
        }
      }
      break

    case "KNIGHT":
      // Knight moves in an L shape: 2 squares in one direction, 1 square perpendicular
      const knightMoves = [
        { row: from.row - 2, col: from.col - 1 }, // Up 2, left 1
        { row: from.row - 2, col: from.col + 1 }, // Up 2, right 1
        { row: from.row - 1, col: from.col - 2 }, // Up 1, left 2
        { row: from.row - 1, col: from.col + 2 }, // Up 1, right 2
        { row: from.row + 1, col: from.col - 2 }, // Down 1, left 2
        { row: from.row + 1, col: from.col + 2 }, // Down 1, right 2
        { row: from.row + 2, col: from.col - 1 }, // Down 2, left 1
        { row: from.row + 2, col: from.col + 1 }, // Down 2, right 1
      ]

      for (const move of knightMoves) {
        if (isValidPosition(move.row, move.col)) {
          const targetPiece = gameState.board[move.row][move.col]
          // Can move to empty squares or capture enemy pieces
          if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push(move)
          }
        }
      }
      break

    case "PAWN":
      // Pawn movement is more complex - it moves forward but captures diagonally
      const direction = piece.color === "WHITE" ? 1 : -1 // White moves up, black moves down
      const newRow = from.row + direction

      // Forward move (no capture) - pawns can only move forward to empty squares
      if (isValidPosition(newRow, from.col) && !gameState.board[newRow][from.col]) {
        moves.push({ row: newRow, col: from.col })
      }

      // Diagonal captures - pawns can only capture diagonally
      for (let colOffset = -1; colOffset <= 1; colOffset += 2) {
        const newCol = from.col + colOffset
        if (isValidPosition(newRow, newCol)) {
          const targetPiece = gameState.board[newRow][newCol]
          // Can only capture enemy pieces (not move to empty diagonal squares)
          if (targetPiece && targetPiece.color !== piece.color) {
            moves.push({ row: newRow, col: newCol })
          }
        }
      }
      break
  }

  return moves
}

/**
 * Checks if a position is within the board boundaries
 * Our board is 6x6, so valid positions are 0-5 for both row and col
 */
function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 6 && col >= 0 && col < 6
}

/**
 * Checks if making a move would put or leave the king in check
 * This is used to filter out illegal moves that would endanger the king
 *
 * @param gameState - Current state of the game
 * @param from - Starting position of the move
 * @param to - Ending position of the move
 * @returns true if the king would be in check after this move
 */
function wouldKingBeInCheck(gameState: GameState, from: Position, to: Position): boolean {
  // Create a copy of the game state to simulate the move
  const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState
  const movingPiece = newGameState.board[from.row][from.col]

  // Find where the king will be after this move
  let kingPosition: Position | null = null
  if (movingPiece?.type === "KING") {
    // If we're moving the king, it will be at the destination
    kingPosition = to
  } else {
    // Otherwise, find the king's current position
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const piece = newGameState.board[row][col]
        if (piece?.type === "KING" && piece.color === gameState.currentPlayer) {
          kingPosition = { row, col }
          break
        }
      }
      if (kingPosition) break
    }
  }

  if (!kingPosition) return false // Should never happen in a valid game

  // Simulate the move in our copy of the game state
  const capturedPiece = newGameState.board[to.row][to.col]
  newGameState.board[to.row][to.col] = movingPiece
  newGameState.board[from.row][from.col] = null

  // Switch the current player to check if the opponent can capture the king
  newGameState.currentPlayer = newGameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"

  // Check if any opponent piece can capture the king
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const piece = newGameState.board[row][col]
      if (piece && piece.color === newGameState.currentPlayer) {
        const attackMoves = getPotentialMoves(newGameState, { row, col })
        for (const attackMove of attackMoves) {
          if (attackMove.row === kingPosition.row && attackMove.col === kingPosition.col) {
            return true // King would be in check
          }
        }
      }
    }
  }

  return false // King would be safe
}

/**
 * Executes a move and returns the new game state
 * This function handles moving pieces, capturing, and switching turns
 *
 * @param gameState - Current state of the game
 * @param from - Starting position of the move
 * @param to - Ending position of the move
 * @returns New game state after the move
 */
export function makeMove(gameState: GameState, from: Position, to: Position): GameState {
  // Create a copy of the game state to avoid modifying the original
  const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState
  const movingPiece = newGameState.board[from.row][from.col]
  const capturedPiece = newGameState.board[to.row][to.col]

  // Move the piece to its new position
  newGameState.board[to.row][to.col] = movingPiece
  newGameState.board[from.row][from.col] = null

  // Handle capture - add captured piece to the current player's hand
  if (capturedPiece) {
    const handToUpdate = newGameState.currentPlayer === "WHITE" ? newGameState.player1Hand : newGameState.player2Hand
    handToUpdate[capturedPiece.type] = (handToUpdate[capturedPiece.type] || 0) + 1
  }

  // Record this move for highlighting purposes
  newGameState.lastMove = { from, to }

  // Check if this is a pawn promotion (pawn reaching the opposite end)
  const isPawnPromotion =
    movingPiece?.type === "PAWN" &&
    ((movingPiece.color === "WHITE" && to.row === 5) || (movingPiece.color === "BLACK" && to.row === 0))

  // Switch turns only if it's not a pawn promotion (promotion is handled separately)
  if (!isPawnPromotion) {
    newGameState.currentPlayer = newGameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"
  }

  return newGameState
}

/**
 * Drops a piece from a player's hand onto the board
 * This is a special feature of Pico Chess - captured pieces can be dropped back
 *
 * @param gameState - Current state of the game
 * @param pieceType - Type of piece to drop
 * @param to - Position where to drop the piece
 * @returns New game state if the drop is legal, null otherwise
 */
export function dropPiece(gameState: GameState, pieceType: PieceType, to: Position): GameState | null {
  const handToUpdate = gameState.currentPlayer === "WHITE" ? gameState.player1Hand : gameState.player2Hand

  // Check if the player has this piece in their hand
  if (!handToUpdate[pieceType] || handToUpdate[pieceType] === 0) {
    return null
  }

  // Check if the target square is empty (can't drop on occupied squares)
  if (gameState.board[to.row][to.col]) {
    return null
  }

  // Special rule: pawns can't be dropped on the promotion rank
  if (
    pieceType === "PAWN" &&
    ((gameState.currentPlayer === "WHITE" && to.row === 5) || (gameState.currentPlayer === "BLACK" && to.row === 0))
  ) {
    return null
  }

  // Create a new game state with the dropped piece
  const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState

  // Place the piece on the board
  newGameState.board[to.row][to.col] = {
    type: pieceType,
    color: gameState.currentPlayer,
  }

  // Remove the piece from the player's hand
  const newHand = gameState.currentPlayer === "WHITE" ? newGameState.player1Hand : newGameState.player2Hand
  newHand[pieceType] = newHand[pieceType]! - 1

  // Record the "move" (using special values to indicate a drop)
  newGameState.lastMove = {
    from: { row: -1, col: -1 }, // Special value to indicate a drop
    to,
  }

  // Switch turns
  newGameState.currentPlayer = newGameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"

  return newGameState
}

/**
 * Checks if a king is currently in check
 * A king is in check when an enemy piece can capture it on the next move
 *
 * @param gameState - Current state of the game
 * @param kingColor - Color of the king to check
 * @returns true if the king is in check
 */
export function isKingInCheck(gameState: GameState, kingColor: PlayerColor): boolean {
  // Find the king's position on the board
  let kingPosition: Position | null = null
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const piece = gameState.board[row][col]
      if (piece?.type === "KING" && piece.color === kingColor) {
        kingPosition = { row, col }
        break
      }
    }
    if (kingPosition) break
  }

  if (!kingPosition) return false // Should never happen in a valid game

  // Check if any opponent piece can capture the king
  const opponentColor = kingColor === "WHITE" ? "BLACK" : "WHITE"

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const piece = gameState.board[row][col]
      if (piece && piece.color === opponentColor) {
        // Get all moves this opponent piece can make
        const attackMoves = getPotentialMoves({ ...gameState, currentPlayer: opponentColor }, { row, col })

        // Check if any of these moves can capture the king
        for (const attackMove of attackMoves) {
          if (attackMove.row === kingPosition.row && attackMove.col === kingPosition.col) {
            return true // King is in check
          }
        }
      }
    }
  }

  return false // King is safe
}

/**
 * Checks if a player is in checkmate
 * Checkmate occurs when the king is in check and there are no legal moves to escape
 *
 * @param gameState - Current state of the game
 * @param playerColor - Color of the player to check
 * @returns true if the player is in checkmate
 */
export function isCheckmate(gameState: GameState, playerColor: PlayerColor): boolean {
  // If the king is not in check, it's not checkmate
  if (!isKingInCheck(gameState, playerColor)) {
    return false
  }

  // Check if any piece can make a legal move to get out of check
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const piece = gameState.board[row][col]
      if (piece && piece.color === playerColor) {
        const legalMoves = isLegalMove({ ...gameState, currentPlayer: playerColor }, { row, col }, null, true)

        if (legalMoves.length > 0) {
          return false // There's at least one legal move to escape check
        }
      }
    }
  }

  // Check if any piece from hand can be dropped to block check
  const hand = playerColor === "WHITE" ? gameState.player1Hand : gameState.player2Hand

  for (const [pieceType, count] of Object.entries(hand)) {
    if (count && count > 0) {
      // Try dropping this piece on every empty square
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          if (!gameState.board[row][col]) {
            // Skip pawn drops on promotion rank
            if (
              pieceType === "PAWN" &&
              ((playerColor === "WHITE" && row === 5) || (playerColor === "BLACK" && row === 0))
            ) {
              continue
            }

            // Simulate the drop and check if the king is still in check
            const newGameState = JSON.parse(JSON.stringify(gameState)) as GameState
            newGameState.board[row][col] = {
              type: pieceType as PieceType,
              color: playerColor,
            }

            // If this drop gets the king out of check, it's not checkmate
            if (!isKingInCheck(newGameState, playerColor)) {
              return false
            }
          }
        }
      }
    }
  }

  return true // No move or drop can get the king out of check - it's checkmate
}

/**
 * Checks if a player is in stalemate
 * Stalemate occurs when a player has no legal moves but their king is not in check
 * In Pico Chess, stalemate is treated as a loss for the stalemated player
 *
 * @param gameState - Current state of the game
 * @param playerColor - Color of the player to check
 * @returns true if the player is in stalemate
 */
export function isStalemate(gameState: GameState, playerColor: PlayerColor): boolean {
  // If the king is in check, it's not stalemate (it would be checkmate)
  if (isKingInCheck(gameState, playerColor)) {
    return false
  }

  // Check if any piece can make a legal move
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const piece = gameState.board[row][col]
      if (piece && piece.color === playerColor) {
        const legalMoves = isLegalMove({ ...gameState, currentPlayer: playerColor }, { row, col }, null, true)

        if (legalMoves.length > 0) {
          return false // There's at least one legal move
        }
      }
    }
  }

  // Check if any piece from hand can be dropped
  const hand = playerColor === "WHITE" ? gameState.player1Hand : gameState.player2Hand

  for (const [pieceType, count] of Object.entries(hand)) {
    if (count && count > 0) {
      // Check if there's any empty square where this piece can be dropped
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          if (!gameState.board[row][col]) {
            // Skip pawn drops on promotion rank
            if (
              pieceType === "PAWN" &&
              ((playerColor === "WHITE" && row === 5) || (playerColor === "BLACK" && row === 0))
            ) {
              continue
            }

            return false // There's at least one legal drop
          }
        }
      }
    }
  }

  return true // No legal moves or drops - it's stalemate
}
