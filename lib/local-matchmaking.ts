// This file provides a browser-based matchmaking system
// It uses localStorage to share room information between different tabs/windows

import { getInitialGameState } from "./game-logic"

// Key for storing rooms in localStorage
const ROOMS_STORAGE_KEY = "pico_chess_rooms"

// Room cleanup interval (in milliseconds)
const CLEANUP_INTERVAL = 30000 // 30 seconds

// Room expiration time (in milliseconds)
const ROOM_EXPIRATION = 120000 // 2 minutes

// Interface for room data stored in localStorage
interface StoredRoom {
  id: string
  createdAt: number
  lastActivity: number
  hasSlot: boolean // Whether the room has an open slot
  creatorId: string // ID of the player who created the room
}

/**
 * Initializes the matchmaking system
 */
export function initMatchmaking() {
  // Clean up old rooms periodically
  setInterval(cleanupOldRooms, CLEANUP_INTERVAL)

  // Initial cleanup
  cleanupOldRooms()
}

/**
 * Finds an available room or creates a new one
 */
export function findOrCreateRoom(playerId: string) {
  // First, look for an available room
  const availableRoom = findAvailableRoom(playerId)

  if (availableRoom) {
    console.log("Found available room:", availableRoom.id)
    return joinRoom(availableRoom.id, playerId)
  }

  // If no available room, create a new one
  console.log("No available room found, creating new room")
  return createRoom(playerId)
}

/**
 * Finds an available room that's waiting for a player
 */
function findAvailableRoom(playerId: string): StoredRoom | null {
  const rooms = getAllRooms()

  // Find the oldest room that has an open slot and isn't created by this player
  const availableRoom = rooms.find(
    (room) => room.hasSlot && room.creatorId !== playerId && Date.now() - room.createdAt < ROOM_EXPIRATION,
  )

  return availableRoom || null
}

/**
 * Creates a new room with the given player as the first player
 */
function createRoom(playerId: string) {
  // Generate room ID
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Create player
  const player = {
    id: playerId,
    name: "You",
    color: "WHITE", // First player is always white
    isBot: false,
    isConnected: true,
  }

  // Create room
  const room = {
    id: roomId,
    players: [player],
    gameState: getInitialGameState(),
    isGameStarted: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  // Store room info in localStorage
  const storedRoom: StoredRoom = {
    id: roomId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    hasSlot: true, // Room has an open slot
    creatorId: playerId,
  }

  // Add to localStorage
  const rooms = getAllRooms()
  rooms.push(storedRoom)
  saveRooms(rooms)

  return { room, player, isNewRoom: true }
}

/**
 * Joins a player to an existing room
 */
function joinRoom(roomId: string, playerId: string) {
  // Create player
  const player = {
    id: playerId,
    name: "You",
    color: "BLACK", // Second player is always black
    isBot: false,
    isConnected: true,
  }

  // Update room in localStorage to show it's full
  const rooms = getAllRooms()
  const roomIndex = rooms.findIndex((r) => r.id === roomId)

  if (roomIndex === -1) {
    console.error("Room not found:", roomId)
    return createRoom(playerId) // Fallback to creating a new room
  }

  // Mark room as no longer having an open slot
  rooms[roomIndex].hasSlot = false
  rooms[roomIndex].lastActivity = Date.now()
  saveRooms(rooms)

  // Create the opponent player (the room creator)
  const opponent = {
    id: rooms[roomIndex].creatorId,
    name: "Opponent",
    color: "WHITE",
    isBot: false,
    isConnected: true,
  }

  // Create room object
  const room = {
    id: roomId,
    players: [opponent, player], // First player is the creator (WHITE), second is joiner (BLACK)
    gameState: getInitialGameState(),
    isGameStarted: true,
    createdAt: rooms[roomIndex].createdAt,
    lastActivity: Date.now(),
  }

  return { room, player, isNewRoom: false }
}

/**
 * Removes a room from matchmaking
 */
export function removeRoom(roomId: string) {
  const rooms = getAllRooms()
  const filteredRooms = rooms.filter((room) => room.id !== roomId)
  saveRooms(filteredRooms)
}

/**
 * Checks if a room has been joined by another player
 */
export function checkRoomJoined(roomId: string): boolean {
  const rooms = getAllRooms()
  const room = rooms.find((r) => r.id === roomId)

  // If room not found or still has a slot, it hasn't been joined
  if (!room || room.hasSlot) {
    return false
  }

  return true
}

/**
 * Gets all active rooms from localStorage
 */
function getAllRooms(): StoredRoom[] {
  try {
    const roomsJson = localStorage.getItem(ROOMS_STORAGE_KEY)
    return roomsJson ? JSON.parse(roomsJson) : []
  } catch (error) {
    console.error("Error reading rooms from localStorage:", error)
    return []
  }
}

/**
 * Saves rooms to localStorage
 */
function saveRooms(rooms: StoredRoom[]) {
  try {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms))
  } catch (error) {
    console.error("Error saving rooms to localStorage:", error)
  }
}

/**
 * Removes old/expired rooms
 */
function cleanupOldRooms() {
  const rooms = getAllRooms()
  const now = Date.now()

  const activeRooms = rooms.filter((room) => now - room.lastActivity < ROOM_EXPIRATION)

  if (activeRooms.length !== rooms.length) {
    console.log(`Cleaned up ${rooms.length - activeRooms.length} expired rooms`)
    saveRooms(activeRooms)
  }
}
