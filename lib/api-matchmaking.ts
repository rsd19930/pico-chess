// API-based matchmaking that works across devices
// Uses HTTP requests to communicate with the backend

import { getInitialGameState } from "./game-logic"

const API_BASE = "/api"

/**
 * Finds an available room or creates a new one using the backend API
 */
export async function findOrCreateRoom(playerId: string, playerName = "Player") {
  try {
    // First, try to find an available room
    console.log("Looking for available rooms...")
    const availableRooms = await getAvailableRooms()

    if (availableRooms.length > 0) {
      // Join the first available room
      const roomToJoin = availableRooms[0]
      console.log("Found available room, joining:", roomToJoin.id)

      const joinResult = await joinRoom(roomToJoin.id, playerId, playerName)

      if (joinResult.success) {
        return {
          room: {
            ...joinResult.room,
            gameState: getInitialGameState(),
          },
          player: joinResult.player,
          isNewRoom: false,
        }
      }
    }

    // No available rooms or join failed, create a new one
    console.log("No available rooms found or join failed, creating new room...")
    const createResult = await createRoom(playerId, playerName)

    if (createResult.success) {
      return {
        room: {
          ...createResult.room,
          gameState: getInitialGameState(),
        },
        player: createResult.player,
        isNewRoom: true,
      }
    }

    throw new Error("Failed to create room")
  } catch (error) {
    console.error("Error in findOrCreateRoom:", error)
    // Fallback to local room creation
    return createLocalRoom(playerId, playerName)
  }
}

/**
 * Gets all available rooms from the backend
 */
async function getAvailableRooms() {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch rooms")
    }

    return data.rooms || []
  } catch (error) {
    console.error("Error fetching available rooms:", error)
    return []
  }
}

/**
 * Creates a new room on the backend
 */
async function createRoom(playerId: string, playerName: string) {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId,
        playerName,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Failed to create room")
    }

    return data
  } catch (error) {
    console.error("Error creating room:", error)
    throw error
  }
}

/**
 * Joins an existing room on the backend
 */
async function joinRoom(roomId: string, playerId: string, playerName: string) {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        playerId,
        playerName,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "Failed to join room")
    }

    return data
  } catch (error) {
    console.error("Error joining room:", error)
    throw error
  }
}

/**
 * Removes a room from the backend
 */
export async function removeRoom(roomId: string) {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
      }),
    })

    if (!response.ok) {
      console.warn(`Failed to delete room ${roomId}: ${response.status}`)
      return
    }

    const data = await response.json()

    if (!data.success) {
      console.warn(`Failed to delete room ${roomId}: ${data.error}`)
    }
  } catch (error) {
    console.error("Error removing room:", error)
  }
}

/**
 * Checks if a room has been joined by polling the backend
 */
export async function checkRoomStatus(roomId: string) {
  try {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return { joined: false, room: null }
    }

    const data = await response.json()

    if (!data.success) {
      return { joined: false, room: null }
    }

    const room = data.rooms?.find((r: any) => r.id === roomId)

    if (!room) {
      return { joined: false, room: null }
    }

    // Room is considered joined if it has 2 players or is started
    const joined = room.players.length >= 2 || room.isGameStarted

    return { joined, room }
  } catch (error) {
    console.error("Error checking room status:", error)
    return { joined: false, room: null }
  }
}

/**
 * Fallback to create a local room if API fails
 */
function createLocalRoom(playerId: string, playerName: string) {
  console.log("Creating local fallback room")

  const player = {
    id: playerId,
    name: playerName,
    color: "WHITE",
    isBot: false,
    isConnected: true,
  }

  const room = {
    id: `local_room_${Date.now()}`,
    players: [player],
    gameState: getInitialGameState(),
    isGameStarted: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  return { room, player, isNewRoom: true }
}
