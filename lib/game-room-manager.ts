// Manages game rooms and matchmaking functionality
// Simulates a backend service for room management

import type { GameRoom, Player } from "./multiplayer-types"
import { getInitialGameState } from "./game-logic"

// Simulated database of active game rooms
const gameRooms: Map<string, GameRoom> = new Map()

// Generate a unique room ID
function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate a unique player ID
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Searches for an available game room that needs a second player
 * Returns the room if found, null otherwise
 */
export function findAvailableRoom(): GameRoom | null {
  for (const room of gameRooms.values()) {
    // Room is available if it has exactly 1 player and game hasn't started
    if (room.players.length === 1 && !room.isGameStarted) {
      // Check if room is still fresh (not older than 5 minutes)
      const roomAge = Date.now() - room.createdAt
      if (roomAge < 5 * 60 * 1000) {
        // 5 minutes
        return room
      }
    }
  }
  return null
}

/**
 * Creates a new game room with the given player as the first player
 */
export function createGameRoom(playerName: string): { room: GameRoom; player: Player } {
  const playerId = generatePlayerId()
  const roomId = generateRoomId()

  const player: Player = {
    id: playerId,
    name: playerName,
    color: "WHITE", // First player is always white
    isBot: false,
    isConnected: true,
  }

  const room: GameRoom = {
    id: roomId,
    players: [player],
    gameState: getInitialGameState(),
    isGameStarted: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  gameRooms.set(roomId, room)
  return { room, player }
}

/**
 * Joins a player to an existing room
 */
export function joinGameRoom(room: GameRoom, playerName: string): { room: GameRoom; player: Player } {
  const playerId = generatePlayerId()

  const player: Player = {
    id: playerId,
    name: playerName,
    color: "BLACK", // Second player is always black
    isBot: false,
    isConnected: true,
  }

  room.players.push(player)
  room.lastActivity = Date.now()

  // Update the room in our "database"
  gameRooms.set(room.id, room)

  return { room, player }
}

/**
 * Adds a bot player to a room that's been waiting too long
 */
export function addBotToRoom(room: GameRoom): { room: GameRoom; botPlayer: Player } {
  const botPlayer: Player = {
    id: "bot_kodiak",
    name: "Kodiak",
    color: "BLACK", // Bot is always the second player (black)
    isBot: true,
    isConnected: true,
  }

  room.players.push(botPlayer)
  room.lastActivity = Date.now()

  // Update the room in our "database"
  gameRooms.set(room.id, room)

  return { room, botPlayer }
}

/**
 * Starts the game in a room (when both players are ready)
 */
export function startGame(roomId: string): GameRoom | null {
  const room = gameRooms.get(roomId)
  if (!room || room.players.length !== 2) {
    return null
  }

  room.isGameStarted = true
  room.lastActivity = Date.now()
  gameRooms.set(roomId, room)

  return room
}

/**
 * Updates the game state in a room
 */
export function updateGameState(roomId: string, newGameState: any): GameRoom | null {
  const room = gameRooms.get(roomId)
  if (!room) {
    return null
  }

  room.gameState = newGameState
  room.lastActivity = Date.now()
  gameRooms.set(roomId, room)

  return room
}

/**
 * Gets a room by ID
 */
export function getRoom(roomId: string): GameRoom | null {
  return gameRooms.get(roomId) || null
}

/**
 * Removes old/inactive rooms (cleanup)
 */
export function cleanupOldRooms(): void {
  const now = Date.now()
  const maxAge = 30 * 60 * 1000 // 30 minutes

  for (const [roomId, room] of gameRooms.entries()) {
    if (now - room.lastActivity > maxAge) {
      gameRooms.delete(roomId)
    }
  }
}

// Clean up old rooms every 5 minutes
setInterval(cleanupOldRooms, 5 * 60 * 1000)
