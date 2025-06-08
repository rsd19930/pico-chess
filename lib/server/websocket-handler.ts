// WebSocket message handler for the game server
// Handles all real-time communication between clients and server

import { WebSocket } from "ws"
import type { WebSocketMessage, GameMoveMessage } from "./types"
import {
  findOrCreateRoom,
  addBotToRoom,
  startGame,
  updateGameState,
  removePlayerFromRoom,
  getRoomByPlayer,
} from "./game-room-manager"
import { getBotMoveWithDelay } from "./bot-ai"
import { makeMove, dropPiece, getInitialGameState } from "../game-logic"

// Store WebSocket connections
const connections = new Map<string, WebSocket>()
const playerSockets = new Map<string, string>() // playerId -> socketId

/**
 * Handles new WebSocket connections
 */
export function handleConnection(ws: WebSocket, socketId: string) {
  connections.set(socketId, ws)

  console.log(`Client connected: ${socketId}`)

  ws.on("message", (data) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString())
      handleMessage(ws, socketId, message)
    } catch (error) {
      console.error("Error parsing message:", error)
    }
  })

  ws.on("close", () => {
    handleDisconnection(socketId)
  })

  ws.on("error", (error) => {
    console.error("WebSocket error:", error)
    handleDisconnection(socketId)
  })
}

/**
 * Handles incoming WebSocket messages
 */
function handleMessage(ws: WebSocket, socketId: string, message: WebSocketMessage) {
  switch (message.type) {
    case "join_matchmaking":
      handleJoinMatchmaking(ws, socketId, message.data.playerId)
      break

    case "game_move":
      handleGameMove(socketId, message as GameMoveMessage)
      break

    case "draw_offer":
      handleDrawOffer(socketId, message.data)
      break

    case "draw_response":
      handleDrawResponse(socketId, message.data)
      break

    case "resign":
      handleResign(socketId, message.data)
      break

    default:
      console.log("Unknown message type:", message.type)
  }
}

/**
 * Handles player joining matchmaking
 */
function handleJoinMatchmaking(ws: WebSocket, socketId: string, playerId: string) {
  console.log(`Player ${playerId} joining matchmaking`)
  playerSockets.set(playerId, socketId)

  const { room, player, isNewRoom } = findOrCreateRoom(playerId, socketId)

  // Ensure room has valid game state
  if (!room.gameState) {
    console.warn("Room missing game state, initializing...")
    room.gameState = getInitialGameState()
  }

  if (room.players.length === 2) {
    // Room is full, start the game immediately
    const startedRoom = startGame(room.id)
    if (startedRoom) {
      console.log(`Starting game in room ${room.id}`)
      // Notify both players
      broadcastToRoom(room.id, {
        type: "game_found",
        data: {
          room: startedRoom,
          yourPlayer: player,
        },
      })

      // Send initial game state
      broadcastToRoom(room.id, {
        type: "game_state_update",
        data: {
          gameState: startedRoom.gameState,
          room: startedRoom,
        },
      })
    }
  } else {
    // Waiting for second player
    console.log(`Player ${playerId} waiting in room ${room.id}`)
    sendToPlayer(playerId, {
      type: "waiting_for_opponent",
      data: {
        room,
        yourPlayer: player,
        waitTime: 60, // 60 seconds
      },
    })

    // Set timeout for bot
    setTimeout(() => {
      console.log(`Checking timeout for room ${room.id}`)
      const currentRoom = getRoomByPlayer(playerId)
      if (currentRoom && currentRoom.players.length === 1 && !currentRoom.isGameStarted) {
        console.log(`Adding bot to room ${room.id}`)
        // Add bot and start game
        const roomWithBot = addBotToRoom(currentRoom.id)
        if (roomWithBot) {
          const startedRoom = startGame(roomWithBot.id)
          if (startedRoom) {
            sendToPlayer(playerId, {
              type: "game_found",
              data: {
                room: startedRoom,
                yourPlayer: player,
              },
            })

            // Send initial game state
            sendToPlayer(playerId, {
              type: "game_state_update",
              data: {
                gameState: startedRoom.gameState,
                room: startedRoom,
              },
            })
          }
        }
      }
    }, 60000) // 60 seconds
  }
}

/**
 * Handles game moves from players
 */
function handleGameMove(socketId: string, message: GameMoveMessage) {
  const room = getRoomByPlayer(message.playerId)
  if (!room || !room.isGameStarted) {
    return
  }

  // Verify it's the player's turn
  const player = room.players.find((p) => p.id === message.playerId)
  if (!player || room.gameState.currentPlayer !== player.color) {
    return
  }

  let newGameState = null

  // Execute the move
  if (message.move.type === "move" && message.move.from) {
    newGameState = makeMove(room.gameState, message.move.from, message.move.to)
  } else if (message.move.type === "drop" && message.move.pieceType) {
    newGameState = dropPiece(room.gameState, message.move.pieceType as any, message.move.to)
  }

  if (newGameState) {
    // Update room state
    const updatedRoom = updateGameState(room.id, newGameState)
    if (updatedRoom) {
      // Broadcast new state to all players
      broadcastToRoom(room.id, {
        type: "game_state_update",
        data: {
          gameState: newGameState,
          room: updatedRoom,
          lastMove: message.move,
        },
      })

      // If opponent is bot and it's bot's turn, make bot move
      const opponent = room.players.find((p) => p.id !== message.playerId)
      if (opponent?.isBot && newGameState.currentPlayer === opponent.color) {
        setTimeout(() => {
          handleBotMove(room.id, opponent.id)
        }, 1000)
      }
    }
  }
}

/**
 * Handles bot moves
 */
async function handleBotMove(roomId: string, botId: string) {
  const room = getRoomByPlayer(botId)
  if (!room || !room.isGameStarted) {
    return
  }

  const bot = room.players.find((p) => p.id === botId)
  if (!bot || !bot.isBot) {
    return
  }

  try {
    const botMove = await getBotMoveWithDelay(room.gameState, bot.color)
    if (botMove) {
      let newGameState = null

      if (botMove.type === "move" && botMove.from) {
        newGameState = makeMove(room.gameState, botMove.from, botMove.to)
      } else if (botMove.type === "drop" && botMove.pieceType) {
        newGameState = dropPiece(room.gameState, botMove.pieceType, botMove.to)
      }

      if (newGameState) {
        const updatedRoom = updateGameState(roomId, newGameState)
        if (updatedRoom) {
          broadcastToRoom(roomId, {
            type: "game_state_update",
            data: {
              gameState: newGameState,
              room: updatedRoom,
              lastMove: botMove,
            },
          })
        }
      }
    }
  } catch (error) {
    console.error("Bot move error:", error)
  }
}

/**
 * Handles draw offers
 */
function handleDrawOffer(socketId: string, data: any) {
  // Implementation for draw offers
  console.log("Draw offer:", data)
}

/**
 * Handles draw responses
 */
function handleDrawResponse(socketId: string, data: any) {
  // Implementation for draw responses
  console.log("Draw response:", data)
}

/**
 * Handles player resignation
 */
function handleResign(socketId: string, data: any) {
  // Implementation for resignation
  console.log("Player resigned:", data)
}

/**
 * Handles player disconnection
 */
function handleDisconnection(socketId: string) {
  console.log(`Client disconnected: ${socketId}`)

  // Find player by socket ID
  let disconnectedPlayerId = null
  for (const [playerId, playerSocketId] of playerSockets.entries()) {
    if (playerSocketId === socketId) {
      disconnectedPlayerId = playerId
      break
    }
  }

  if (disconnectedPlayerId) {
    // Remove player from room
    removePlayerFromRoom(disconnectedPlayerId)
    playerSockets.delete(disconnectedPlayerId)
  }

  connections.delete(socketId)
}

/**
 * Sends a message to a specific player
 */
function sendToPlayer(playerId: string, message: WebSocketMessage) {
  const socketId = playerSockets.get(playerId)
  if (socketId) {
    const ws = connections.get(socketId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}

/**
 * Broadcasts a message to all players in a room
 */
function broadcastToRoom(roomId: string, message: WebSocketMessage) {
  const room = getRoomByPlayer("dummy") // We need to get room differently
  // For now, we'll broadcast to all connections
  // In a real implementation, we'd track room memberships

  for (const [socketId, ws] of connections.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }
}
