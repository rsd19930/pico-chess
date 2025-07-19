import { NextRequest } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'

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
    "ChessKnight", "PawnMaster", "RookRider", "BishopBoss", "QueenSlayer",
    "KingDefender", "ChessWizard", "BoardMaster", "TacticalGenius", "StrategicMind"
  ]
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000)
}

function getInitialGameState() {
  const board = Array(6).fill(null).map(() => Array(6).fill(null))
  
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
      if (roomAge < 5 * 60 * 1000) { // 5 minutes
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

// Global WebSocket server instance
let wss: WebSocketServer | null = null

function initializeWebSocketServer() {
  if (wss) return wss

  const server = createServer()
  wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket) => {
    console.log('👤 New client connected')

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        console.log('📨 Received:', message.type)

        switch (message.type) {
          case 'join_matchmaking':
            handleJoinMatchmaking(ws, message.data.playerId)
            break
          case 'game_move':
            handleGameMove(ws, message.data)
            break
          default:
            console.log('❓ Unknown message type:', message.type)
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error)
      }
    })

    ws.on('close', () => {
      console.log('👋 Client disconnected')
      handleDisconnection(ws)
    })

    ws.on('error', (error) => {
      console.error('💥 WebSocket error:', error)
    })
  })

  // Start server on port 8080
  server.listen(8080, () => {
    console.log('🚀 WebSocket server running on port 8080')
  })

  return wss
}

function handleJoinMatchmaking(ws: WebSocket, playerId: string) {
  console.log(`🎯 Player ${playerId} joining matchmaking`)

  playerSockets.set(playerId, ws)
  socketPlayers.set(ws, playerId)

  const { room, player, isNewRoom } = findOrCreateRoom(playerId, ws)

  if (room.players.length === 2) {
    // Room is full, start game
    room.isGameStarted = true
    console.log(`🎮 Starting game in room ${room.id}`)

    broadcastToRoom(room, {
      type: 'game_found',
      data: { room, yourPlayer: player }
    })

    broadcastToRoom(room, {
      type: 'game_state_update',
      data: { gameState: room.gameState, room }
    })
  } else {
    // Waiting for second player
    console.log(`⏳ Player ${playerId} waiting in room ${room.id}`)

    sendToPlayer(playerId, {
      type: 'waiting_for_opponent',
      data: { room, yourPlayer: player, waitTime: 60 }
    })

    // Set timeout for bot
    setTimeout(() => {
      if (room.players.length === 1 && !room.isGameStarted) {
        console.log(`🤖 Adding bot to room ${room.id}`)
        const bot = addBotToRoom(room)

        sendToPlayer(playerId, {
          type: 'game_found',
          data: { room, yourPlayer: player }
        })

        sendToPlayer(playerId, {
          type: 'game_state_update',
          data: { gameState: room.gameState, room }
        })
      }
    }, 60000)
  }
}

function handleGameMove(ws: WebSocket, data: any) {
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

  const player = room.players.find((p) => p.id === playerId)
  if (!player || room.gameState.currentPlayer !== player.color) {
    return
  }

  // Switch turns (simplified for now)
  room.gameState.currentPlayer = room.gameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"
  room.lastActivity = Date.now()

  broadcastToRoom(room, {
    type: 'game_state_update',
    data: { gameState: room.gameState, room, lastMove: data.move }
  })

  // Handle bot moves
  const opponent = room.players.find((p) => p.id !== playerId)
  if (opponent?.isBot && room.gameState.currentPlayer === opponent.color) {
    setTimeout(() => {
      room.gameState.currentPlayer = room.gameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"
      broadcastToRoom(room, {
        type: 'game_state_update',
        data: { gameState: room.gameState, room, lastMove: { type: "bot_move" } }
      })
    }, 2000)
  }
}

function handleDisconnection(ws: WebSocket) {
  const playerId = socketPlayers.get(ws)
  if (playerId) {
    playerSockets.delete(playerId)
    socketPlayers.delete(ws)

    for (const room of gameRooms.values()) {
      room.players = room.players.filter((p) => p.id !== playerId)
      if (room.players.length === 0) {
        gameRooms.delete(room.id)
      }
    }
  }
}

// Initialize WebSocket server when this module loads
if (typeof window === 'undefined') {
  initializeWebSocketServer()
}

// Export for Next.js API route (though we're using the standalone server)
export async function GET() {
  return new Response('WebSocket server running on port 8080', { status: 200 })
}