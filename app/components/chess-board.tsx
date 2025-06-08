"use client"

// WebSocket-integrated chess board for real-time multiplayer
// Sends moves to server and receives opponent moves via WebSocket

import { useState, useEffect, useRef } from "react"
import { Square } from "./square"
import { PieceAnimation } from "./piece-animation"
import { CaptureAnimation } from "./capture-animation"
import type { PieceType, PlayerColor, GameState, Position } from "@/lib/types"
import type { GameRoom, Player } from "@/lib/multiplayer-types"
import { isLegalMove, getInitialGameState, makeMove, isKingInCheck, isCheckmate, isStalemate } from "@/lib/game-logic"
import { PromotionModal } from "./promotion-modal"
import { GameOverModal } from "./game-over-modal"
import { DrawOfferModal } from "./draw-offer-modal"
import type { WebSocketClient } from "@/lib/websocket-client"
import { soundManager } from "@/lib/sound-manager"

interface ChessBoardProps {
  gameRoom: GameRoom
  currentPlayer: Player
  wsClient: WebSocketClient
  onGameOver: (winner: PlayerColor | null, reason: string) => void
  onExitGame: () => void
}

interface AnimationState {
  piece: { type: PieceType; color: PlayerColor }
  fromPosition: Position
  toPosition: Position
  isActive: boolean
}

interface CaptureAnimationState {
  piece: { type: PieceType; color: PlayerColor }
  fromPosition: Position
  toPlayerColor: PlayerColor
  isActive: boolean
}

export function ChessBoard({ gameRoom, currentPlayer, wsClient, onGameOver, onExitGame }: ChessBoardProps) {
  // Refs for animation positioning
  const boardRef = useRef<HTMLDivElement>(null)
  const player1HandRef = useRef<HTMLDivElement>(null)
  const player2HandRef = useRef<HTMLDivElement>(null)

  // Game state
  const [gameState, setGameState] = useState<GameState>(() => {
    return gameRoom?.gameState || getInitialGameState()
  })

  // Get opponent player info
  const opponent = gameRoom.players?.find((p) => p.id !== currentPlayer.id) || null

  // UI state
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedPieceFromHand, setSelectedPieceFromHand] = useState<{ type: PieceType; color: PlayerColor } | null>(
    null,
  )
  const [legalMoves, setLegalMoves] = useState<Position[]>([])
  const [promotionPending, setPromotionPending] = useState<Position | null>(null)
  const [gameOver, setGameOver] = useState<{ isOver: boolean; winner: PlayerColor | null; reason: string }>({
    isOver: false,
    winner: null,
    reason: "",
  })

  // Timers
  const [player1Timer, setPlayer1Timer] = useState(30)
  const [player2Timer, setPlayer2Timer] = useState(30)

  // Special states
  const [drawOfferPending, setDrawOfferPending] = useState<PlayerColor | null>(null)
  const [animation, setAnimation] = useState<AnimationState | null>(null)
  const [captureAnimation, setCaptureAnimation] = useState<CaptureAnimationState | null>(null)
  const [pendingGameState, setPendingGameState] = useState<GameState | null>(null)
  const [capturedPieceInfo, setCapturedPieceInfo] = useState<{
    piece: { type: PieceType; color: PlayerColor }
    position: Position
    capturedBy: PlayerColor
  } | null>(null)

  // Connection state
  const [isConnected, setIsConnected] = useState(wsClient.isConnected)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Multiplayer state
  const isMyTurn = gameState.currentPlayer === currentPlayer.color

  // Set up WebSocket message handlers
  useEffect(() => {
    // Handle game state updates from server
    wsClient.on("game_state_update", (data) => {
      console.log("Received game state update:", data)

      if (data.gameState) {
        setGameState(data.gameState)

        // Play appropriate sound based on the move
        if (data.lastMove) {
          handleMoveSound(data.lastMove, data.gameState)
        }
      }
    })

    // Handle connection status
    wsClient.on("connection_lost", () => {
      setIsConnected(false)
      setConnectionError("Connection lost. Attempting to reconnect...")
    })

    // Handle draw offers
    wsClient.on("draw_offer", (data) => {
      setDrawOfferPending(data.fromPlayer)
    })

    // Handle draw responses
    wsClient.on("draw_response", (data) => {
      if (data.accepted) {
        setGameOver({
          isOver: true,
          winner: null,
          reason: "Draw by agreement",
        })
        soundManager.play("game_end")
      } else {
        setDrawOfferPending(null)
      }
    })

    // Handle game over
    wsClient.on("game_over", (data) => {
      setGameOver({
        isOver: true,
        winner: data.winner,
        reason: data.reason,
      })
      soundManager.play(data.winner ? "checkmate" : "game_end")
    })

    // Monitor connection status
    const connectionInterval = setInterval(() => {
      setIsConnected(wsClient.isConnected)
    }, 1000)

    return () => {
      clearInterval(connectionInterval)
      wsClient.off("game_state_update")
      wsClient.off("connection_lost")
      wsClient.off("draw_offer")
      wsClient.off("draw_response")
      wsClient.off("game_over")
    }
  }, [wsClient])

  /**
   * Play appropriate sound based on move type
   */
  const handleMoveSound = (move: any, newGameState: GameState) => {
    // Check if it's a capture
    if (move.captured) {
      soundManager.play("capture")
      return
    }

    // Check if it results in check
    const opponentColor = newGameState.currentPlayer
    if (isKingInCheck(newGameState, opponentColor)) {
      if (isCheckmate(newGameState, opponentColor)) {
        soundManager.play("checkmate")
      } else {
        soundManager.play("check")
      }
      return
    }

    // Check if it's a promotion
    if (move.type === "promotion") {
      soundManager.play("promotion")
      return
    }

    // Regular move
    soundManager.play("move")
  }

  // Timer effect
  useEffect(() => {
    if (gameOver.isOver || drawOfferPending || animation || captureAnimation) return

    const timer = setInterval(() => {
      if (gameState.currentPlayer === "WHITE") {
        setPlayer1Timer((prev) => {
          if (prev <= 0) {
            handleTimeOut("WHITE")
            return 30
          }
          return prev - 1
        })
      } else {
        setPlayer2Timer((prev) => {
          if (prev <= 0) {
            handleTimeOut("BLACK")
            return 30
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameOver.isOver, gameState.currentPlayer, drawOfferPending, animation, captureAnimation])

  // Game end detection
  useEffect(() => {
    if (gameOver.isOver) return

    const kingInCheck = isKingInCheck(gameState, gameState.currentPlayer)
    const kingPosition = kingInCheck ? findKingPosition(gameState, gameState.currentPlayer) : null

    if (
      (kingInCheck && !gameState.checkedKingPosition) ||
      (!kingInCheck && gameState.checkedKingPosition) ||
      (kingInCheck &&
        gameState.checkedKingPosition &&
        (kingPosition?.row !== gameState.checkedKingPosition.row ||
          kingPosition?.col !== gameState.checkedKingPosition.col))
    ) {
      const newGameState = {
        ...gameState,
        checkedKingPosition: kingPosition,
      }
      setGameState(newGameState)
      return
    }

    if (isCheckmate(gameState, gameState.currentPlayer)) {
      const winner = gameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"
      setGameOver({
        isOver: true,
        winner,
        reason: "Checkmate",
      })
      soundManager.play("checkmate")
    } else if (isStalemate(gameState, gameState.currentPlayer)) {
      const winner = gameState.currentPlayer === "WHITE" ? "BLACK" : "WHITE"
      setGameOver({
        isOver: true,
        winner,
        reason: "Stalemate",
      })
      soundManager.play("game_end")
    }
  }, [gameState, gameOver.isOver])

  // Game over callback
  useEffect(() => {
    if (gameOver.isOver && gameOver.winner !== undefined) {
      const timeoutId = setTimeout(() => {
        onGameOver(gameOver.winner, gameOver.reason)
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [gameOver.isOver, gameOver.winner, gameOver.reason, onGameOver])

  /**
   * Handle timeout
   */
  const handleTimeOut = (player: PlayerColor) => {
    try {
      wsClient.send("timeout", {
        roomId: gameRoom.id,
        playerId: currentPlayer.id,
        timedOutPlayer: player,
      })
    } catch (error) {
      console.error("Failed to send timeout:", error)
    }
  }

  /**
   * Find king position
   */
  const findKingPosition = (state: GameState, color: PlayerColor): Position | null => {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const piece = state.board[row][col]
        if (piece && piece.type === "KING" && piece.color === color) {
          return { row, col }
        }
      }
    }
    return null
  }

  /**
   * Start animation
   */
  const startAnimation = (
    piece: { type: PieceType; color: PlayerColor },
    from: Position,
    to: Position,
    newGameState: GameState,
    capturedPiece?: { type: PieceType; color: PlayerColor },
  ) => {
    if (capturedPiece) {
      setCapturedPieceInfo({
        piece: capturedPiece,
        position: to,
        capturedBy: gameState.currentPlayer,
      })

      setCaptureAnimation({
        piece: capturedPiece,
        fromPosition: to,
        toPlayerColor: gameState.currentPlayer,
        isActive: true,
      })
    }

    setAnimation({
      piece,
      fromPosition: from,
      toPosition: to,
      isActive: true,
    })

    setPendingGameState(newGameState)
  }

  /**
   * Handle animation complete
   */
  const handleAnimationComplete = () => {
    setAnimation(null)
    if (!captureAnimation) {
      applyPendingGameState()
    }
  }

  /**
   * Handle capture animation complete
   */
  const handleCaptureAnimationComplete = () => {
    setCaptureAnimation(null)
    setCapturedPieceInfo(null)
    if (!animation) {
      applyPendingGameState()
    }
  }

  /**
   * Apply pending game state
   */
  const applyPendingGameState = () => {
    if (pendingGameState) {
      if (gameState.currentPlayer === "WHITE") {
        setPlayer1Timer(30)
      } else {
        setPlayer2Timer(30)
      }

      setGameState(pendingGameState)
      setPendingGameState(null)
    }
  }

  /**
   * Handle square click
   */
  const handleSquareClick = async (position: Position) => {
    // Enable sound on first interaction
    await soundManager.enable()

    if (!isMyTurn || gameOver.isOver || promotionPending || drawOfferPending || animation || captureAnimation) {
      if (!isMyTurn && !gameOver.isOver) {
        soundManager.play("invalid")
      }
      return
    }

    const piece = gameState.board[position.row][position.col]

    // Dropping pieces from hand
    if (selectedPieceFromHand) {
      if (!piece) {
        try {
          wsClient.send("game_move", {
            roomId: gameRoom.id,
            playerId: currentPlayer.id,
            move: {
              type: "drop",
              to: position,
              pieceType: selectedPieceFromHand.type,
            },
          })

          setSelectedPieceFromHand(null)
          setLegalMoves([])
        } catch (error) {
          console.error("Failed to send drop move:", error)
          soundManager.play("invalid")
        }
      }
      return
    }

    // Selecting pieces
    if (!selectedPosition) {
      if (piece && piece.color === currentPlayer.color) {
        setSelectedPosition(position)
        const moves = isLegalMove(gameState, position, null, true)
        setLegalMoves(moves)
      }
      return
    }

    // Changing selection
    if (piece && piece.color === currentPlayer.color) {
      setSelectedPosition(position)
      const moves = isLegalMove(gameState, position, null, true)
      setLegalMoves(moves)
      return
    }

    // Making moves
    const selectedPiece = gameState.board[selectedPosition.row][selectedPosition.col]
    if (selectedPiece && isLegalMove(gameState, selectedPosition, position).length > 0) {
      try {
        const capturedPiece = gameState.board[position.row][position.col]

        // Send move to server
        wsClient.send("game_move", {
          roomId: gameRoom.id,
          playerId: currentPlayer.id,
          move: {
            type: "move",
            from: selectedPosition,
            to: position,
            captured: !!capturedPiece,
          },
        })

        // Start local animation immediately for responsiveness
        const newGameState = makeMove(gameState, selectedPosition, position)
        startAnimation(selectedPiece, selectedPosition, position, newGameState, capturedPiece || undefined)

        // Check for pawn promotion
        if (
          selectedPiece.type === "PAWN" &&
          ((selectedPiece.color === "WHITE" && position.row === 5) ||
            (selectedPiece.color === "BLACK" && position.row === 0))
        ) {
          setPromotionPending(position)
        }

        setSelectedPosition(null)
        setLegalMoves([])
      } catch (error) {
        console.error("Failed to send move:", error)
        soundManager.play("invalid")
      }
    } else {
      soundManager.play("invalid")
    }
  }

  /**
   * Handle piece from hand click
   */
  const handlePieceFromHandClick = async (type: PieceType) => {
    await soundManager.enable()

    if (!isMyTurn || gameOver.isOver || promotionPending || drawOfferPending || animation || captureAnimation) return

    const color = currentPlayer.color
    const hand = color === "WHITE" ? gameState.player1Hand : gameState.player2Hand

    if (hand[type] && hand[type]! > 0) {
      setSelectedPieceFromHand({ type, color })
      setSelectedPosition(null)

      const legalDrops: Position[] = []
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          if (gameState.board[row][col]) continue
          if (type === "PAWN" && ((color === "WHITE" && row === 5) || (color === "BLACK" && row === 0))) {
            continue
          }
          legalDrops.push({ row, col })
        }
      }

      setLegalMoves(legalDrops)
    }
  }

  /**
   * Handle promotion
   */
  const handlePromotion = (pieceType: PieceType) => {
    if (!promotionPending) return

    try {
      wsClient.send("game_move", {
        roomId: gameRoom.id,
        playerId: currentPlayer.id,
        move: {
          type: "promotion",
          to: promotionPending,
          pieceType,
        },
      })

      setPromotionPending(null)
    } catch (error) {
      console.error("Failed to send promotion:", error)
    }
  }

  /**
   * Handle draw offer
   */
  const handleDrawOffer = async () => {
    await soundManager.enable()

    try {
      wsClient.send("draw_offer", {
        roomId: gameRoom.id,
        playerId: currentPlayer.id,
      })
      setDrawOfferPending(currentPlayer.color)
    } catch (error) {
      console.error("Failed to send draw offer:", error)
    }
  }

  /**
   * Handle draw response
   */
  const handleDrawResponse = (accepted: boolean) => {
    try {
      wsClient.send("draw_response", {
        roomId: gameRoom.id,
        playerId: currentPlayer.id,
        accepted,
      })

      if (accepted) {
        setGameOver({
          isOver: true,
          winner: null,
          reason: "Draw by agreement",
        })
        soundManager.play("game_end")
      } else {
        setDrawOfferPending(null)
      }
    } catch (error) {
      console.error("Failed to send draw response:", error)
    }
  }

  /**
   * Handle restart
   */
  const handleRestart = () => {
    // In online mode, this would need server coordination
    // For now, just exit to main menu
    onExitGame()
  }

  /**
   * Handle exit game
   */
  const handleExitGame = () => {
    if (!gameOver.isOver) {
      try {
        wsClient.send("resign", {
          roomId: gameRoom.id,
          playerId: currentPlayer.id,
        })
      } catch (error) {
        console.error("Failed to send resignation:", error)
      }
    }

    wsClient.disconnect()
    onExitGame()
  }

  // Get player names
  const player1 = gameRoom.players.find((p) => p.color === "WHITE")
  const player2 = gameRoom.players.find((p) => p.color === "BLACK")

  return (
    <div className="flex flex-col items-center">
      {/* Header with connection status */}
      <div className="w-full mb-4 flex justify-between items-center">
        <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={handleExitGame}>
          ← Back to Main Menu
        </button>

        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div
            className={`text-sm px-2 py-1 rounded ${
              isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>

          {/* Sound status */}
          <div
            className={`text-sm px-2 py-1 rounded ${
              soundManager.enabled ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {soundManager.enabled ? "🔊 Sound On" : "🔇 Sound Off"}
          </div>
        </div>
      </div>

      {/* Connection error */}
      {connectionError && (
        <div className="w-full mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
          {connectionError}
        </div>
      )}

      {/* Player 2 (BLACK) information and hand */}
      <div
        className={`w-full flex flex-col items-center p-4 mb-4 rounded-lg ${
          gameState.currentPlayer === "BLACK" ? "bg-gray-100" : ""
        }`}
      >
        <div className="w-full flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black rounded-full mr-2"></div>
            <span className="font-bold">
              {player2?.isBot ? "🤖" : "👤"} {player2?.name || "Player 2"} (Black)
            </span>
            {!isMyTurn && gameState.currentPlayer === "BLACK" && (
              <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded">Playing...</span>
            )}
          </div>
          <div className="text-xl font-mono">{gameState.currentPlayer === "BLACK" ? `${player2Timer}s` : ""}</div>
        </div>

        <div className="w-full">
          <div className="text-sm font-medium text-gray-500 mb-1">Pieces in hand:</div>
          <div
            ref={player2HandRef}
            className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]"
          >
            {Object.entries(gameState.player2Hand).map(([type, count]) =>
              count ? (
                <button
                  key={type}
                  className={`w-10 h-10 flex items-center justify-center border ${
                    selectedPieceFromHand &&
                    selectedPieceFromHand.type === (type as PieceType) &&
                    selectedPieceFromHand.color === "BLACK"
                      ? "border-blue-500 bg-blue-100"
                      : "border-gray-300"
                  } rounded-md relative`}
                  onClick={() => currentPlayer.color === "BLACK" && handlePieceFromHandClick(type as PieceType)}
                  disabled={currentPlayer.color !== "BLACK" || !isMyTurn || !!animation || !!captureAnimation}
                >
                  <PieceIcon type={type as PieceType} color="BLACK" />
                  {count > 1 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {count}
                    </span>
                  )}
                </button>
              ) : null,
            )}
            {Object.values(gameState.player2Hand).every((count) => !count) && (
              <div className="text-gray-400 italic">No pieces</div>
            )}
          </div>
        </div>
      </div>

      {/* Chess board */}
      <div ref={boardRef} className="relative w-[360px] h-[360px] border-2 border-gray-800 mb-4">
        {[...Array(6)].map((_, row) => (
          <div key={row} className="flex">
            {[...Array(6)].map((_, col) => {
              const position = { row: 5 - row, col }
              const piece = gameState.board[position.row][position.col]

              const isSelected =
                selectedPosition && selectedPosition.row === position.row && selectedPosition.col === position.col
              const isLegalMoveSquare = legalMoves.some(
                (move) => move.row === position.row && move.col === position.col,
              )
              const isLastMoveFrom =
                gameState.lastMove &&
                gameState.lastMove.from.row === position.row &&
                gameState.lastMove.from.col === position.col
              const isLastMoveTo =
                gameState.lastMove &&
                gameState.lastMove.to.row === position.row &&
                gameState.lastMove.to.col === position.col
              const isCheck =
                gameState.checkedKingPosition &&
                gameState.checkedKingPosition.row === position.row &&
                gameState.checkedKingPosition.col === position.col

              const isAnimatingFrom =
                animation && animation.fromPosition.row === position.row && animation.fromPosition.col === position.col

              const isCapturedPiecePosition =
                capturedPieceInfo &&
                capturedPieceInfo.position.row === position.row &&
                capturedPieceInfo.position.col === position.col

              return (
                <Square
                  key={`${row}-${col}`}
                  isLight={(row + col) % 2 === 0}
                  piece={isCapturedPiecePosition ? capturedPieceInfo.piece : piece}
                  isSelected={isSelected}
                  isLegalMove={isLegalMoveSquare}
                  isLastMoveFrom={isLastMoveFrom}
                  isLastMoveTo={isLastMoveTo}
                  isCheck={isCheck}
                  onClick={() => handleSquareClick(position)}
                  isAnimatingFrom={isAnimatingFrom}
                />
              )
            })}
          </div>
        ))}

        {animation && animation.fromPosition.row !== -1 && (
          <PieceAnimation
            piece={animation.piece}
            fromPosition={animation.fromPosition}
            toPosition={animation.toPosition}
            onComplete={handleAnimationComplete}
          />
        )}
      </div>

      {/* Player 1 (WHITE) information and hand */}
      <div
        className={`w-full flex flex-col items-center p-4 rounded-lg ${
          gameState.currentPlayer === "WHITE" ? "bg-gray-100" : ""
        }`}
      >
        <div className="w-full flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white border border-gray-300 rounded-full mr-2"></div>
            <span className="font-bold">
              {player1?.isBot ? "🤖" : "👤"} {player1?.name || "Player 1"} (White)
            </span>
            {!isMyTurn && gameState.currentPlayer === "WHITE" && (
              <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded">Playing...</span>
            )}
          </div>
          <div className="text-xl font-mono">{gameState.currentPlayer === "WHITE" ? `${player1Timer}s` : ""}</div>
        </div>

        <div className="w-full">
          <div className="text-sm font-medium text-gray-500 mb-1">Pieces in hand:</div>
          <div
            ref={player1HandRef}
            className="flex flex-wrap gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]"
          >
            {Object.entries(gameState.player1Hand).map(([type, count]) =>
              count ? (
                <button
                  key={type}
                  className={`w-10 h-10 flex items-center justify-center border ${
                    selectedPieceFromHand &&
                    selectedPieceFromHand.type === (type as PieceType) &&
                    selectedPieceFromHand.color === "WHITE"
                      ? "border-blue-500 bg-blue-100"
                      : "border-gray-300"
                  } rounded-md relative`}
                  onClick={() => currentPlayer.color === "WHITE" && handlePieceFromHandClick(type as PieceType)}
                  disabled={currentPlayer.color !== "WHITE" || !isMyTurn || !!animation || !!captureAnimation}
                >
                  <PieceIcon type={type as PieceType} color="WHITE" />
                  {count > 1 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {count}
                    </span>
                  )}
                </button>
              ) : null,
            )}
            {Object.values(gameState.player1Hand).every((count) => !count) && (
              <div className="text-gray-400 italic">No pieces</div>
            )}
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="mb-4 text-center">
        {isMyTurn ? (
          <div className="text-green-600 font-semibold">Your turn</div>
        ) : (
          <div className="text-gray-500">
            Waiting for {opponent?.isBot ? "Kodiak" : opponent?.name || "opponent"}...
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex space-x-4 mt-4">
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={handleDrawOffer}
          disabled={gameOver.isOver || drawOfferPending !== null || !!animation || !!captureAnimation || !isMyTurn}
        >
          Offer Draw
        </button>
      </div>

      {/* Modals */}
      {promotionPending && <PromotionModal color={currentPlayer.color} onSelect={handlePromotion} />}

      {drawOfferPending && drawOfferPending !== currentPlayer.color && (
        <DrawOfferModal onResponse={handleDrawResponse} />
      )}

      {gameOver.isOver && (
        <GameOverModal
          winner={gameOver.winner}
          reason={gameOver.reason}
          onPlayAgain={handleRestart}
          onMainMenu={onExitGame}
        />
      )}

      {captureAnimation && (
        <CaptureAnimation
          piece={captureAnimation.piece}
          fromPosition={captureAnimation.fromPosition}
          toPlayerColor={captureAnimation.toPlayerColor}
          onComplete={handleCaptureAnimationComplete}
          player1HandRef={player1HandRef}
          player2HandRef={player2HandRef}
          boardRef={boardRef}
        />
      )}
    </div>
  )
}

function PieceIcon({ type, color }: { type: PieceType; color: PlayerColor }) {
  const pieceIcons = {
    WHITE: {
      KING: "/king-white.svg",
      QUEEN: "/queen-white.svg",
      ROOK: "/rook-white.svg",
      BISHOP: "/bishop-white.svg",
      KNIGHT: "/knight-white.svg",
      PAWN: "/pawn-white.svg",
    },
    BLACK: {
      KING: "/king-black.svg",
      QUEEN: "/queen-black.svg",
      ROOK: "/rook-black.svg",
      BISHOP: "/bishop-black.svg",
      KNIGHT: "/knight-black.svg",
      PAWN: "/pawn-black.svg",
    },
  }

  return <img src={pieceIcons[color][type] || "/placeholder.svg"} alt={`${color} ${type}`} className="w-8 h-8" />
}
