// API route for room management using Next.js 13+ App Router format
// Handles creating, joining, and listing game rooms

import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for game rooms (in production, use a database)
const gameRooms = new Map<string, any>()
const ROOM_EXPIRATION = 120000 // 2 minutes

// Clean up old rooms periodically
setInterval(() => {
  const now = Date.now()
  for (const [roomId, room] of gameRooms.entries()) {
    if (now - room.lastActivity > ROOM_EXPIRATION) {
      console.log(`Cleaning up expired room: ${roomId}`)
      gameRooms.delete(roomId)
    }
  }
}, 30000) // Clean up every 30 seconds

// GET - Get all available rooms
export async function GET() {
  try {
    const availableRooms = Array.from(gameRooms.values()).filter(
      (room) => room.players.length === 1 && !room.isGameStarted,
    )

    console.log(`GET /api/rooms - Found ${availableRooms.length} available rooms`)

    return NextResponse.json({
      success: true,
      rooms: availableRooms,
    })
  } catch (error) {
    console.error("Error in GET /api/rooms:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch rooms" }, { status: 500 })
  }
}

// POST - Create a new room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, playerName } = body

    if (!playerId) {
      return NextResponse.json({ success: false, error: "Player ID is required" }, { status: 400 })
    }

    // Generate room ID
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create player
    const player = {
      id: playerId,
      name: playerName || "Player",
      color: "WHITE",
      isBot: false,
      isConnected: true,
    }

    // Create room
    const room = {
      id: roomId,
      players: [player],
      gameState: null, // Will be set when game starts
      isGameStarted: false,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    }

    gameRooms.set(roomId, room)

    console.log(`POST /api/rooms - Created room ${roomId} for player ${playerId}`)

    return NextResponse.json(
      {
        success: true,
        room,
        player,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error in POST /api/rooms:", error)
    return NextResponse.json({ success: false, error: "Failed to create room" }, { status: 500 })
  }
}

// PUT - Join an existing room
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerId, playerName } = body

    if (!roomId || !playerId) {
      return NextResponse.json({ success: false, error: "Room ID and Player ID are required" }, { status: 400 })
    }

    const room = gameRooms.get(roomId)

    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 })
    }

    if (room.players.length >= 2) {
      return NextResponse.json({ success: false, error: "Room is full" }, { status: 400 })
    }

    // Create second player
    const player = {
      id: playerId,
      name: playerName || "Player",
      color: "BLACK",
      isBot: false,
      isConnected: true,
    }

    // Add player to room
    room.players.push(player)
    room.isGameStarted = true
    room.lastActivity = Date.now()

    console.log(`PUT /api/rooms - Player ${playerId} joined room ${roomId}`)

    return NextResponse.json({
      success: true,
      room,
      player,
    })
  } catch (error) {
    console.error("Error in PUT /api/rooms:", error)
    return NextResponse.json({ success: false, error: "Failed to join room" }, { status: 500 })
  }
}

// DELETE - Delete a room
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 })
    }

    const deleted = gameRooms.delete(roomId)

    console.log(`DELETE /api/rooms - ${deleted ? "Deleted" : "Failed to delete"} room ${roomId}`)

    return NextResponse.json({
      success: true,
      deleted,
    })
  } catch (error) {
    console.error("Error in DELETE /api/rooms:", error)
    return NextResponse.json({ success: false, error: "Failed to delete room" }, { status: 500 })
  }
}
