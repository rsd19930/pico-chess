#!/usr/bin/env node

// Standalone WebSocket server for Pico Chess
// Run this with: npm run ws-server or node server/websocket-server.js

const { WebSocketServer } = require("ws")
const { createServer } = require("http")

// Types
// Player: { id, name, color, isBot, socket, isConnected }
// GameRoom: { id, players, gameState, isGameStarted, createdAt, lastActivity }

// Storage
const gameRooms = new Map()
const playerSockets = new Map()
const socketPlayers = new Map()

// Helper functions
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

function getRandomPlayerName() {
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

function findOrCreateRoom(playerId, socket) {
  // First check if player is already in a room
  for (const room of gameRooms.values()) {
    const existingPlayer = room.players.find(p => p.id === playerId)
    if (existingPlayer) {
      console.log(`Player ${playerId} already in room ${room.id}`)
      existingPlayer.socket = socket
      existingPlayer.isConnected = true
      return { room, player: existingPlayer, isNewRoom: false }
    }
  }

  // Look for available room
  for (const room of gameRooms.values()) {
    if (room.players.length === 1 && !room.isGameStarted) {
      const roomAge = Date.now() - room.createdAt
      if (roomAge < 5 * 60 * 1000) {
        console.log(`Found available room ${room.id} for player ${playerId}`)
        // Join this room
        const player = {
          id: playerId,
          name: getRandomPlayerName(),
          color: "BLACK",
          isBot: false,
          socket,
          isConnected: true,
        }

        room.players.push(player)
        room.lastActivity = Date.now()

        console.log(`Player ${playerId} joined room ${room.id} as second player`)
        return { room, player, isNewRoom: false }
      }
    }
  }

  console.log(`No available rooms found, creating new room for player ${playerId}`)
  // Create new room
  const roomId = `room_${generateId()}`
  const player = {
    id: playerId,
    name: getRandomPlayerName(),
    color: "WHITE",
    isBot: false,
    socket,
    isConnected: true,
  }

  const room = {
    id: roomId,
    players: [player],
    gameState: getInitialGameState(),
    isGameStarted: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  }

  gameRooms.set(roomId, room)
  console.log(`Created new room ${roomId} for player ${playerId}`)
  return { room, player, isNewRoom: true }
}

function addBotToRoom(room) {
  const bot = {
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

function sendToPlayer(playerId, message) {
  const socket = playerSockets.get(playerId)
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function broadcastToRoom(room, message) {
  room.players.forEach((player) => {
    if (player.socket && player.socket.readyState === player.socket.OPEN) {
      player.socket.send(JSON.stringify(message))
    }
  })
}

// Create HTTP server and WebSocket server
const server = createServer()
const wss = new WebSocketServer({ server })

console.log("🚀 Starting WebSocket server on port 8080...")

wss.on("connection", (ws) => {
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

function handleJoinMatchmaking(ws, playerId) {
  console.log(`🎯 Player ${playerId} joining matchmaking`)

  // Check if player already has a socket connection
  const existingSocket = playerSockets.get(playerId)
  if (existingSocket && existingSocket !== ws) {
    console.log(`Replacing existing socket for player ${playerId}`)
  }

  // Store player-socket mapping
  playerSockets.set(playerId, ws)
  socketPlayers.set(ws, playerId)

  const { room, player, isNewRoom } = findOrCreateRoom(playerId, ws)

  if (room.players.length === 2) {
    // Room is full, start game
    room.isGameStarted = true
    console.log(`🎮 Starting game in room ${room.id}`)

    // Send game_found to both players
    room.players.forEach(p => {
      if (p.socket && p.socket.readyState === p.socket.OPEN) {
        p.socket.send(JSON.stringify({
          type: "game_found",
          data: {
            room,
            yourPlayer: p,
          },
        }))
      }
    })

    // Send initial game state to both players
    room.players.forEach(p => {
      if (p.socket && p.socket.readyState === p.socket.OPEN) {
        p.socket.send(JSON.stringify({
          type: "game_state_update",
          data: {
            gameState: room.gameState,
            room,
          },
        }))
      }
    })
  } else {
    // Waiting for second player
    console.log(`⏳ Player ${playerId} waiting in room ${room.id}`)

    if (player.socket && player.socket.readyState === player.socket.OPEN) {
      player.socket.send(JSON.stringify({
        type: "waiting_for_opponent",
        data: {
          room,
          yourPlayer: player,
          waitTime: 60,
        },
      }))
    }

    // Set timeout for bot
    setTimeout(() => {
      console.log(`🤖 Checking timeout for room ${room.id}`)
      const currentRoom = gameRooms.get(room.id)
      if (currentRoom && currentRoom.players.length === 1 && !currentRoom.isGameStarted) {
        console.log(`🤖 Adding bot to room ${room.id}`)

        const bot = addBotToRoom(currentRoom)

        if (player.socket && player.socket.readyState === player.socket.OPEN) {
          player.socket.send(JSON.stringify({
            type: "game_found",
            data: {
              room: currentRoom,
              yourPlayer: player,
            },
          }))

          player.socket.send(JSON.stringify({
            type: "game_state_update",
            data: {
              gameState: currentRoom.gameState,
              room: currentRoom,
            },
          }))
        }
      }
    }, 60000) // 60 seconds
  }
}

function handleGameMove(ws, data) {
  console.log("🎯 Handling game move:", data)

  // Find the room and player
  const playerId = socketPlayers.get(ws)
  if (!playerId) return

  let room
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

function handleDisconnection(ws) {
  const playerId = socketPlayers.get(ws)
  if (playerId) {
    console.log(`👋 Player ${playerId} disconnected`)
    playerSockets.delete(playerId)
    socketPlayers.delete(ws)

    // Remove player from rooms
    for (const room of gameRooms.values()) {
      const playerIndex = room.players.findIndex(p => p.id === playerId)
      if (playerIndex !== -1) {
        console.log(`Removing player ${playerId} from room ${room.id}`)
        room.players.splice(playerIndex, 1)
      }
      if (room.players.length === 0) {
        console.log(`Deleting empty room ${room.id}`)
        gameRooms.delete(room.id)
      }
    }
  } else {
    console.log(`👋 Unknown client disconnected`)
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

// Start the server
server.listen(8080, () => {
  console.log("✅ WebSocket server ready on ws://localhost:8080")
  console.log("🎮 Ready for multiplayer chess connections!")
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})