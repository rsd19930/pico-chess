// Centralized map of piece SVGs for easy reuse across the app

import type { PieceType, PlayerColor } from "./types"

type IconMap = Record<PlayerColor, Record<PieceType, string>>

export const pieceIcons: IconMap = {
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
