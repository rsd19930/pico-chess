// Standalone WebSocket server for Pico Chess
// Run this with: node server/websocket-server.js

import { WebSocketServer } from "ws"
import type { WebSocket } from "ws"

// Types
interface Player {
  id: string
  name: string
  color: "WHITE" | "BLACK"
  isBot: boolean
  socket?: WebSocket
  isConnected: boolean
}

interface GameRoom {
  id: string
  players: Player[]
  gameState: any
  isGameStarted: boolean
  createdAt: number
  lastActivity: number
}

// Storage
const gameRooms = new Map<string, GameRoom>()
const playerSockets = new Map<string, WebSocket>()
const socketPlayers = new Map<WebSocket, string>()

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function getRandomPlayerName(): string {
  const names = [
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
  ]
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000)
}

function getInitialGameState() {
  // Create empty 6x6 board
  const board = Array(6)
    .fill(null)
    .map(() => Array(6).fill(null))

  // Set up White pieces (bottom-left corner)
  board[0][0] = { type: "KING", color: "WHITE" }
  board[0][1] = { type: "ROOK", color: "WHITE" }
  board[0][2] = { type: "KNIGHT", color: "WHITE" }
  board[0][3] = { type: "BISHOP", color: "WHITE" }
  board[1][0] = { type: "PAWN", color: "WHITE" }

  // Set up Black pieces (top-right corner)
  board[5][5] = { type: "KING", color: "BLACK" }
  board[5][4] = { type: "ROOK", color: "BLACK" }
  board[5][3] = { type: "KNIGHT", color: "BLACK" }
  board[5][2] = { type: "BISHOP", color: "BLACK" }
  board[4][5] = { type: "PAWN", color: "BLACK" }

  return {
    board,
    currentPlayer: "WHITE",
    player1Hand: { KING: 0, QUEEN: 0, ROOK: 0, BISHOP: 0, KNIGHT: 0, PAWN: 0 },
    player2Hand: { KING: 0, QUEEN: 0, ROOK: 0, BISHOP: 0, KNIGHT: 0, PAWN: 0 },
    lastMove: null,
    checkedKingPosition: null,
  }
}

function findOrCreateRoom(playerId: string, socket: WebSocket): { room: GameRoom; player: Player; isNewRoom: boolean } {
  // Look for available room
  for (const room of gameRooms.values()) {
    if (room.players.length === 1 && !room.isGameStarted) {
      const roomAge = Date.now() - room.createdAt
      if (roomAge < 5 * 60 * 1000) {
        // 5 minutes
        // Join this room
        const player: Player = {
          id: playerId,
          name: getRandomPlayerName(),
          color: "BLACK",
          isBot: false,
          socket,
          isConnected: true,
        }

        room.players.push(player)
        room.lastActivity = Date.now()

        return { room, player, isNewRoom: false }
      }
    }
  }

  // Create new room
  const roomId = `room_${generateId()}`
  const player: Player = {
    id: playerId,
    name: getRandomPlayerName(),
    color: "WHITE",
    isBot: false,
    socket,
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
  return { room, player, isNewRoom: true }
}

function addBotToRoom(room: GameRoom): Player {
  const bot: Player = {
    id: "bot_kodiak",
    name: "Kodiak",
    color: "BLACK",
    isBot: true,
    isConnected: true,
  }

  room.players.push(bot)
  room.isGameStarted = true
  room.lastActivity = Date.now()

  return bot
}

function sendToPlayer(playerId: string, message: any) {
  const socket = playerSockets.get(playerId)
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function broadcastToRoom(room: GameRoom, message: any) {
  room.players.forEach((player) => {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(message))
    }
  })
}

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 })

console.log("🚀 WebSocket server starting on port 8080...")

wss.on("connection", (ws: WebSocket) => {
  console.log("👤 New client connected")

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log("📨 Received:", message.type, message.data)

      switch (message.type) {
        case "join_matchmaking":
          handleJoinMatchmaking(ws, message.data.playerId)
          break

        case "game_move":
          handleGameMove(ws, message.data)
          break

        default:
          console.log("❓ Unknown message type:", message.type)
      }
    } catch (error) {
      console.error("❌ Error parsing message:", error)
    }
  })

  ws.on("close", () => {
    console.log("👋 Client disconnected")
    handleDisconnection(ws)
  })

  ws.on("error", (error) => {
    console.error("💥 WebSocket error:", error)
  })
})

function handleJoinMatchmaking(ws: WebSocket, playerId: string) {
  console.log(`🎯 Player ${playerId} joining matchmaking`)

  // Store player-socket mapping
  playerSockets.set(playerId, ws)
  socketPlayers.set(ws, playerId)

  const { room, player, isNewRoom } = findOrCreateRoom(playerId, ws)

  if (room.players.length === 2) {
    // Room is full, start game
    room.isGameStarted = true
    console.log(`🎮 Starting game in room ${room.id}`)

    broadcastToRoom(room, {
      type: "game_found",
      data: {
        room,
        yourPlayer: player,
      },
    })

    broadcastToRoom(room, {
      type: "game_state_update",
      data: {
        gameState: room.gameState,
        room,
      },
    })
  } else {
    // Waiting for second player
    console.log(`⏳ Player ${playerId} waiting in room ${room.id}`)

    sendToPlayer(playerId, {
      type: "waiting_for_opponent",
      data: {
        room,
        yourPlayer: player,
        waitTime: 60,
      },
    })

    // Set timeout for bot
    setTimeout(() => {
      console.log(`🤖 Checking timeout for room ${room.id}`)
      if (room.players.length === 1 && !room.isGameStarted) {
        console.log(`🤖 Adding bot to room ${room.id}`)

        const bot = addBotToRoom(room)

        sendToPlayer(playerId, {
          type: "game_found",
          data: {
            room,
            yourPlayer: player,
          },
        })

        sendToPlayer(playerId, {
          type: "game_state_update",
          data: {
            gameState: room.gameState,
            room,
          },
        })
      }
    }, 60000) // 60 seconds
  }
}

function handleGameMove(ws: WebSocket, data: any) {
  console.log("🎯 Handling game move:", data)

  // Find the room and player
  const playerId = socketPlayers.get(ws)
  if (!playerId) return

  let room: GameRoom | undefined
  for (const r of gameRooms.values()) {
    if (r.players.some((p) => p.id === playerId)) {
      room = r
      break
    }
  }

  if (!room || !room.isGameStarted) return

  // Verify it's the player's turn
  const player = room.players.find((p) => p.id === playerId)
  if (!player || room.gameState.currentPlayer !== player.color) {
    console.log("❌ Not player turn")
    return
  }

  // Simple move processing (you can enhance this)
  console.log("✅ Processing move:", data.move)

  // Switch turns
  room.gameState.currentPlayer = room.gameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"
  room.lastActivity = Date.now()

  // Broadcast new state
  broadcastToRoom(room, {
    type: "game_state_update",
    data: {
      gameState: room.gameState,
      room,
      lastMove: data.move,
    },
  })

  // If opponent is bot, make bot move after delay
  const opponent = room.players.find((p) => p.id !== playerId)
  if (opponent?.isBot && room.gameState.currentPlayer === opponent.color) {
    setTimeout(() => {
      // Simple bot move - just switch turns back
      room.gameState.currentPlayer = room.gameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"

      broadcastToRoom(room, {
        type: "game_state_update",
        data: {
          gameState: room.gameState,
          room,
          lastMove: { type: "bot_move", from: { row: 0, col: 0 }, to: { row: 1, col: 1 } },
        },
      })
    }, 2000)
  }
}

function handleDisconnection(ws: WebSocket) {
  const playerId = socketPlayers.get(ws)
  if (playerId) {
    playerSockets.delete(playerId)
    socketPlayers.delete(ws)

    // Remove player from rooms
    for (const room of gameRooms.values()) {
      room.players = room.players.filter((p) => p.id !== playerId)
      if (room.players.length === 0) {
        gameRooms.delete(room.id)
      }
    }
  }
}

// Cleanup old rooms
setInterval(
  () => {
    const now = Date.now()
    for (const [roomId, room] of gameRooms.entries()) {
      if (now - room.lastActivity > 30 * 60 * 1000) {
        // 30 minutes
        gameRooms.delete(roomId)
      }
    }
  },
  5 * 60 * 1000,
) // Every 5 minutes

console.log("✅ WebSocket server ready on ws://localhost:8080")
