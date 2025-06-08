// This file defines all the TypeScript types used throughout the chess game
// Types help ensure our code is correct and provide better development experience

// Represents the different types of chess pieces
export type PieceType = "KING" | "QUEEN" | "ROOK" | "BISHOP" | "KNIGHT" | "PAWN"

// Represents the two player colors in chess
export type PlayerColor = "WHITE" | "BLACK"

// Represents a position on the chess board
// row and col are numbers from 0 to 5 (since we have a 6x6 board)
export interface Position {
  row: number
  col: number
}

// Represents a chess move from one position to another
export interface Move {
  from: Position // Where the piece started
  to: Position // Where the piece moved to
}

// Represents a chess piece with its type and color
export interface Piece {
  type: PieceType
  color: PlayerColor
}

// Represents the complete state of the game at any point in time
export interface GameState {
  // 6x6 grid representing the chess board
  // Each cell can either contain a Piece or be null (empty)
  board: (Piece | null)[][]

  // Which player's turn it is currently
  currentPlayer: PlayerColor

  // Pieces that Player 1 (WHITE) has captured and can drop back on the board
  // The number represents how many of each piece type they have
  player1Hand: Record<PieceType, number>

  // Pieces that Player 2 (BLACK) has captured and can drop back on the board
  player2Hand: Record<PieceType, number>

  // The most recent move made in the game (used for highlighting)
  lastMove: Move | null

  // Position of the king if it's currently in check (used for highlighting)
  checkedKingPosition: Position | null
}
