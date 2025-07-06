// Sound Effects Implementation Guide for Pico Chess
// This file provides detailed specifications for each sound effect

export interface SoundEffect {
  name: string
  description: string
  duration: string
  characteristics: string[]
  suggestedSources: string[]
  volume: number
  priority: "high" | "medium" | "low"
}

export const SOUND_EFFECTS_GUIDE: Record<string, SoundEffect> = {
  move: {
    name: "Piece Movement",
    description: "Subtle sound when a piece moves to an empty square",
    duration: "0.2-0.5 seconds",
    characteristics: [
      "Soft wooden 'click' or 'tap'",
      "Low to medium pitch",
      "Quick attack, short decay",
      "Not too prominent to avoid fatigue",
    ],
    suggestedSources: ["Wood block tap", "Soft click sound", "Chess piece on wooden board", "Gentle percussion"],
    volume: 0.6,
    priority: "medium",
  },

  capture: {
    name: "Piece Capture",
    description: "More pronounced sound when capturing an opponent's piece",
    duration: "0.3-0.8 seconds",
    characteristics: [
      "Sharper, more defined than regular move",
      "Slightly metallic or wooden 'thunk'",
      "Medium to high pitch",
      "Clear attack with moderate decay",
    ],
    suggestedSources: [
      "Wood blocks clacking together",
      "Chess piece capture sound",
      "Sharp tap with resonance",
      "Wooden percussion hit",
    ],
    volume: 0.8,
    priority: "high",
  },

  check: {
    name: "Check Warning",
    description: "Alert sound when a king is in check",
    duration: "0.5-1.0 seconds",
    characteristics: [
      "Attention-grabbing but not alarming",
      "Clear, bright tone",
      "Medium to high pitch",
      "Distinctive from other sounds",
    ],
    suggestedSources: ["Small bell chime", "Alert tone", "Notification sound", "Gentle warning chime"],
    volume: 0.9,
    priority: "high",
  },

  checkmate: {
    name: "Checkmate Victory",
    description: "Triumphant sound when the game ends in checkmate",
    duration: "1.0-2.0 seconds",
    characteristics: [
      "Celebratory and final",
      "Rich, full sound",
      "Rising pitch or chord progression",
      "Sense of completion and victory",
    ],
    suggestedSources: ["Victory fanfare (short)", "Success chime", "Triumphant bell sequence", "Achievement sound"],
    volume: 1.0,
    priority: "high",
  },

  castle: {
    name: "Castling Move",
    description: "Special sound for the castling move (if implemented)",
    duration: "0.4-0.7 seconds",
    characteristics: [
      "Unique, distinguishable from regular moves",
      "Slightly longer than normal move",
      "Could be a double-tap sound",
      "Indicates special move",
    ],
    suggestedSources: [
      "Double wood tap",
      "Sequential clicks",
      "Special move indicator",
      "Distinctive percussion sequence",
    ],
    volume: 0.7,
    priority: "medium",
  },

  promotion: {
    name: "Pawn Promotion",
    description: "Magical sound when a pawn promotes to another piece",
    duration: "0.6-1.2 seconds",
    characteristics: [
      "Transformative, magical quality",
      "Rising pitch or sparkle effect",
      "Positive and rewarding",
      "Indicates achievement",
    ],
    suggestedSources: ["Magic chime", "Sparkle sound effect", "Transformation sound", "Achievement unlock sound"],
    volume: 0.8,
    priority: "high",
  },

  game_start: {
    name: "Game Start",
    description: "Welcoming sound when a new game begins",
    duration: "0.8-1.5 seconds",
    characteristics: ["Welcoming and positive", "Clear beginning indicator", "Not too dramatic", "Sets a good mood"],
    suggestedSources: ["Game start chime", "Welcome sound", "Positive notification", "Beginning bell"],
    volume: 0.7,
    priority: "medium",
  },

  game_end: {
    name: "Game End",
    description: "Conclusive sound when the game ends (draw, resignation, etc.)",
    duration: "1.0-2.0 seconds",
    characteristics: [
      "Final and conclusive",
      "Neutral tone (not victory or defeat)",
      "Sense of completion",
      "Respectful ending",
    ],
    suggestedSources: ["Conclusion chime", "End game sound", "Neutral completion tone", "Closing bell sequence"],
    volume: 0.8,
    priority: "high",
  },

  invalid: {
    name: "Invalid Move",
    description: "Gentle error sound for invalid moves or actions",
    duration: "0.3-0.6 seconds",
    characteristics: [
      "Clearly indicates error without being harsh",
      "Lower pitch than success sounds",
      "Quick and not annoying",
      "Informative but not punishing",
    ],
    suggestedSources: ["Soft error tone", "Gentle 'no' sound", "Blocked action indicator", "Subtle negative feedback"],
    volume: 0.5,
    priority: "medium",
  },

  notification: {
    name: "General Notification",
    description: "General purpose notification for various game events",
    duration: "0.4-0.8 seconds",
    characteristics: [
      "Neutral and informative",
      "Clear but not intrusive",
      "Medium pitch",
      "Versatile for different contexts",
    ],
    suggestedSources: ["Notification chime", "Info sound", "General alert tone", "Neutral bell"],
    volume: 0.6,
    priority: "low",
  },
}

// Volume levels (0.0 to 1.0)
export const VOLUME_SETTINGS = {
  MASTER: 0.7,
  MOVES: 0.6,
  CAPTURES: 0.8,
  ALERTS: 0.9,
  GAME_EVENTS: 0.8,
  ERRORS: 0.5,
}

// Sound categories for easy management
export const SOUND_CATEGORIES = {
  GAMEPLAY: ["move", "capture", "castle"],
  ALERTS: ["check", "invalid"],
  GAME_EVENTS: ["game_start", "game_end", "checkmate", "promotion"],
  NOTIFICATIONS: ["notification"],
}
