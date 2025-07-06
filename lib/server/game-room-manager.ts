// Server-side game room management
// Handles creating, joining, and managing game rooms

import type { ServerGameRoom, ServerPlayer } from "./types"
import { getInitialGameState } from "../game-logic"

// In-memory storage for game rooms
const gameRooms = new Map<string, ServerGameRoom>()
const playerRooms = new Map<string, string>() // playerId -> roomId

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Generate random player names
const playerNames = [
  "ChessKnight",
  "PawnMaster",
  "RookRider",
  "BishopBoss",
  "QueenSlayer",
  "KingDefender",
  "ChessWizard",
  "BoardMaster",
  "TacticalGenius",
  "StrategicMind",
  "ChessLegend",
  "GameChanger",
  "PiecePlayer",
  "Movemaker",
  "ChessChamp",
  "BoardWarrior",
  "TacticTitan",
  "StrategyKing",
]

function getRandomPlayerName(): string {
  return playerNames[Math.floor(Math.random() * playerNames.length)] + Math.floor(Math.random() * 1000)
}

/**
 * Finds an available room or creates a new one for a player
 */
export function findOrCreateRoom(
  playerId: string,
  socketId: string,
): { room: ServerGameRoom; player: ServerPlayer; isNewRoom: boolean } {
  // Check if player is already in a room
  const existingRoomId = playerRooms.get(playerId)
  if (existingRoomId) {
    const existingRoom = gameRooms.get(existingRoomId)
    if (existingRoom) {
      const player = existingRoom.players.find((p) => p.id === playerId)
      if (player) {
        player.socketId = socketId
        player.isConnected = true
        return { room: existingRoom, player, isNewRoom: false }
      }
    }
  }

  // Look for an available room
  for (const room of gameRooms.values()) {
    if (room.players.length === 1 && !room.isGameStarted) {
      // Check if room is still fresh (not older than 5 minutes)
      const roomAge = Date.now() - room.createdAt
      if (roomAge < 5 * 60 * 1000) {
        // Join this room as player 2
        const player: ServerPlayer = {
          id: playerId,
          name: getRandomPlayerName(),
          color: "BLACK",
          isBot: false,
          socketId,
          isConnected: true,
        }

        room.players.push(player)
        room.lastActivity = Date.now()
        playerRooms.set(playerId, room.id)

        return { room, player, isNewRoom: false }
      }
    }
  }

  // No available room, create a new one
  const roomId = `room_${generateId()}`
  const player: ServerPlayer = {
    id: playerId,
    name: getRandomPlayerName(),
    color: "WHITE",
    isBot: false,
    socketId,
    isConnected: true,
  }

  const room: ServerGameRoom = {
    id: roomId,
    players: [player],
    gameState: getInitialGameState(),
    isGameStarted: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  gameRooms.set(roomId, room)
  playerRooms.set(playerId, roomId)

  return { room, player, isNewRoom: true }
}

/**
 * Adds a bot player to a room
 */
export function addBotToRoom(roomId: string): ServerGameRoom | null {
  const room = gameRooms.get(roomId)
  if (!room || room.players.length !== 1) {
    return null
  }

  const botPlayer: ServerPlayer = {
    id: "bot_kodiak",
    name: "Kodiak",
    color: "BLACK",
    isBot: true,
    isConnected: true,
  }

  room.players.push(botPlayer)
  room.lastActivity = Date.now()

  return room
}

/**
 * Starts a game in a room
 */
export function startGame(roomId: string): ServerGameRoom | null {
  const room = gameRooms.get(roomId)
  if (!room || room.players.length !== 2) {
    return null
  }

  room.isGameStarted = true
  room.lastActivity = Date.now()

  return room
}

/**
 * Updates game state in a room
 */
export function updateGameState(roomId: string, newGameState: any): ServerGameRoom | null {
  const room = gameRooms.get(roomId)
  if (!room) {
    return null
  }

  room.gameState = newGameState
  room.lastActivity = Date.now()

  return room
}

/**
 * Gets a room by ID
 */
export function getRoom(roomId: string): ServerGameRoom | null {
  return gameRooms.get(roomId) || null
}

/**
 * Gets room by player ID
 */
export function getRoomByPlayer(playerId: string): ServerGameRoom | null {
  const roomId = playerRooms.get(playerId)
  if (!roomId) return null
  return gameRooms.get(roomId) || null
}

/**
 * Removes a player from their room
 */
export function removePlayerFromRoom(playerId: string): void {
  const roomId = playerRooms.get(playerId)
  if (!roomId) return

  const room = gameRooms.get(roomId)
  if (room) {
    room.players = room.players.filter((p) => p.id !== playerId)

    // If room is empty, delete it
    if (room.players.length === 0) {
      gameRooms.delete(roomId)
    }
  }

  playerRooms.delete(playerId)
}

/**
 * Cleanup old rooms
 */
export function cleanupOldRooms(): void {
  const now = Date.now()
  const maxAge = 30 * 60 * 1000 // 30 minutes

  for (const [roomId, room] of gameRooms.entries()) {
    if (now - room.lastActivity > maxAge) {
      // Remove all players from this room
      for (const player of room.players) {
        playerRooms.delete(player.id)
      }
      gameRooms.delete(roomId)
    }
  }
}

// Clean up old rooms every 5 minutes
setInterval(cleanupOldRooms, 5 * 60 * 1000)
