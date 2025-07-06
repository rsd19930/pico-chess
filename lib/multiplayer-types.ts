// Types specific to multiplayer functionality
// These extend the base game types to support online play

import type { PlayerColor, GameState } from "./types"

// Represents a player in the multiplayer system
export interface Player {
  id: string // Unique identifier for the player
  name: string // Display name
  color: PlayerColor // Which color they're playing (WHITE or BLACK)
  isBot: boolean // Whether this is a bot player
  isConnected: boolean // Whether the player is currently connected
}

// Represents a game room where two players can play
export interface GameRoom {
  id: string // Unique room identifier
  players: Player[] // Array of players (max 2)
  gameState: GameState // Current state of the chess game
  isGameStarted: boolean // Whether the game has begun
  createdAt: number // Timestamp when room was created
  lastActivity: number // Timestamp of last activity
}

// Different states the matchmaking can be in
export type MatchmakingState =
  | "searching" // Looking for existing rooms to join
  | "waiting" // Waiting for a second player to join our room
  | "found" // Found a match and ready to start
  | "timeout" // Timed out, will add bot player

// Represents a move made by a player
export interface MultiplayerMove {
  playerId: string // Who made the move
  type: "move" | "drop" | "promotion" // Type of action
  from?: { row: number; col: number } // Starting position (for moves)
  to: { row: number; col: number } // Ending position
  pieceType?: string // For drops and promotions
  timestamp: number // When the move was made
}

// Messages sent between players
export interface GameMessage {
  type: "move" | "draw_offer" | "draw_response" | "resign" | "chat"
  data: any // Message-specific data
  from: string // Player ID who sent the message
  timestamp: number
}
