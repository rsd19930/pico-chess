// Sound manager for chess game audio effects
// Handles loading and playing different game sounds

export class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private isEnabled = false
  private isInitialized = false
  private volume = 0.7

  constructor() {
    // Only initialize sounds in browser environment
    if (typeof window !== 'undefined') {
      this.initializeSounds()
    }
  }

  /**
   * Initialize all game sounds
   */
  private async initializeSounds() {
    const soundFiles = {
      move: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/move-A3VxE7GeB1cItYOlOa0q2oTKgLxxdl.wav",
      capture: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/capture-IPyzzBrNeS6pB1AVzdQQxZVHJ56v9t.wav",
      check: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/check-e76ippMHzPZVl4HIQ7ngYojHWUJghI.wav",
      checkmate: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/checkmate-iC5hfVPJuknj1mdKBwRB8EnmVLq0FH.wav",
      castle: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/castle-qAfUXj5hBXbObyuuO3u3ZEN3wN7cDY.wav",
      promotion: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/spell%20sound-GUsZgVDdcKYZbjyva7GOHTzr5R71Bv.wav",
      game_start: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/game%20start-hx23Jhgw4gygPYRv0zV5XX1q2tNPRt.wav",
      game_end: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/game%20end-hMcFxz7Oct3v1f4XvtkCQ0KcsZNNQC.wav",
      invalid: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/invalid-iqJLPDQq5irsOLvNdvTOtrqvv5QidP.wav",
      notification: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/notification-SJMQ3LYsved7g5HLPZnbToL4ZfbXUM.wav",
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
