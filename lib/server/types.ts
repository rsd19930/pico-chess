// Server-side types for multiplayer functionality
// These are used by the backend WebSocket server

export interface ServerPlayer {
  id: string
  name: string
  color: "WHITE" | "BLACK"
  isBot: boolean
  socketId?: string
  isConnected: boolean
}

export interface ServerGameRoom {
  id: string
  players: ServerPlayer[]
  gameState: any // The chess game state
  isGameStarted: boolean
  createdAt: number
  lastActivity: number
}

export interface WebSocketMessage {
  type: string
  data: any
  playerId?: string
  roomId?: string
}

export interface MatchmakingRequest {
  type: "join_matchmaking"
  playerId: string
}

export interface GameMoveMessage {
  type: "game_move"
  roomId: string
  playerId: string
  move: {
    type: "move" | "drop" | "promotion"
    from?: { row: number; col: number }
    to: { row: number; col: number }
    pieceType?: string
  }
}

export interface GameStateUpdate {
  type: "game_state_update"
  roomId: string
  gameState: any
  currentPlayer: string
}
