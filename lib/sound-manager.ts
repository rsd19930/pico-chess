// Sound manager for chess game audio effects
// Handles loading and playing different game sounds

export class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private isEnabled = false
  private isInitialized = false
  private volume = 0.7

  constructor() {
    this.initializeSounds()
  }

  /**
   * Initialize all game sounds
   */
  private async initializeSounds() {
    const soundFiles = {
      move: "/sounds/move.mp3",
      capture: "/sounds/capture.mp3",
      check: "/sounds/check.mp3",
      checkmate: "/sounds/checkmate.mp3",
      castle: "/sounds/castle.mp3",
      promotion: "/sounds/promotion.mp3",
      game_start: "/sounds/game-start.mp3",
      game_end: "/sounds/game-end.mp3",
      invalid: "/sounds/invalid.mp3",
      notification: "/sounds/notification.mp3",
    }

    for (const [name, url] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(url)
        audio.volume = this.volume
        audio.preload = "auto"

        // Wait for audio to be ready
        await new Promise((resolve, reject) => {
          audio.addEventListener("canplaythrough", resolve, { once: true })
          audio.addEventListener("error", reject, { once: true })
          setTimeout(() => reject(new Error("Audio load timeout")), 5000)
        })

        this.sounds.set(name, audio)
        console.log(`Loaded sound: ${name}`)
      } catch (error) {
        console.warn(`Failed to load sound ${name}:`, error)
        // Create silent fallback
        this.sounds.set(name, new Audio())
      }
    }

    this.isInitialized = true
    console.log("Sound manager initialized")
  }

  /**
   * Enable audio playback (requires user interaction)
   */
  async enable(): Promise<void> {
    if (this.isEnabled) return

    try {
      // Try to play a silent sound to enable audio context
      const testSound = this.sounds.get("move")
      if (testSound) {
        testSound.volume = 0
        await testSound.play()
        testSound.pause()
        testSound.currentTime = 0
        testSound.volume = this.volume
      }

      this.isEnabled = true
      console.log("Sound enabled")
    } catch (error) {
      console.warn("Could not enable sound:", error)
    }
  }

  /**
   * Play a specific sound effect
   */
  async play(soundName: string): Promise<void> {
    if (!this.isEnabled || !this.isInitialized) {
      return
    }

    const sound = this.sounds.get(soundName)
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`)
      return
    }

    try {
      sound.currentTime = 0
      await sound.play()
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error)
    }
  }

  /**
   * Set volume for all sounds
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    for (const sound of this.sounds.values()) {
      sound.volume = this.volume
    }
  }

  /**
   * Check if sound is enabled
   */
  get enabled(): boolean {
    return this.isEnabled
  }
}

// Create a global sound manager instance
export const soundManager = new SoundManager()
