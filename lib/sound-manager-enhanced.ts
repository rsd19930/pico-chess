// Enhanced sound manager with fallbacks and better error handling
// Replaces the basic sound manager with more robust functionality

export class EnhancedSoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private isEnabled = false
  private isInitialized = false
  private volume = 0.7
  private loadingPromises: Map<string, Promise<void>> = new Map()

  constructor() {
    this.initializeSounds()
  }

  /**
   * Initialize all game sounds with fallback support
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

    const loadPromises = Object.entries(soundFiles).map(([name, url]) => this.loadSound(name, url))

    try {
      await Promise.allSettled(loadPromises)
      this.isInitialized = true
      console.log("Enhanced sound manager initialized")
    } catch (error) {
      console.error("Error initializing sounds:", error)
      this.isInitialized = true // Continue with whatever loaded
    }
  }

  /**
   * Load a single sound file with fallback
   */
  private async loadSound(name: string, url: string): Promise<void> {
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
      const audio = new Audio()
      audio.volume = this.volume
      audio.preload = "auto"

      const onLoad = () => {
        this.sounds.set(name, audio)
        console.log(`✅ Loaded sound: ${name}`)
        resolve()
      }

      const onError = (error: any) => {
        console.warn(`⚠️ Failed to load sound ${name}, using fallback:`, error)
        // Create a silent fallback
        const fallbackAudio = new Audio()
        fallbackAudio.volume = 0
        this.sounds.set(name, fallbackAudio)
        resolve() // Don't reject, just use fallback
      }

      audio.addEventListener("canplaythrough", onLoad, { once: true })
      audio.addEventListener("error", onError, { once: true })

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.sounds.has(name)) {
          onError(new Error("Load timeout"))
        }
      }, 10000)

      audio.src = url
    })

    this.loadingPromises.set(name, loadPromise)
    return loadPromise
  }

  /**
   * Enable audio playback (requires user interaction)
   */
  async enable(): Promise<void> {
    if (this.isEnabled) return

    try {
      // Test with the first available sound
      const testSound = Array.from(this.sounds.values())[0]
      if (testSound) {
        testSound.volume = 0
        await testSound.play()
        testSound.pause()
        testSound.currentTime = 0
        testSound.volume = this.volume
      }

      this.isEnabled = true
      console.log("🔊 Sound enabled")
    } catch (error) {
      console.warn("Could not enable sound:", error)
    }
  }

  /**
   * Play a specific sound effect with enhanced error handling
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
      // Reset to beginning
      sound.currentTime = 0

      // Play the sound
      const playPromise = sound.play()

      if (playPromise !== undefined) {
        await playPromise
      }
    } catch (error) {
      // Don't log every error to avoid spam
      if (error.name !== "AbortError") {
        console.warn(`Failed to play sound ${soundName}:`, error.message)
      }
    }
  }

  /**
   * Play multiple sounds in sequence
   */
  async playSequence(soundNames: string[], delay = 100): Promise<void> {
    for (let i = 0; i < soundNames.length; i++) {
      await this.play(soundNames[i])
      if (i < soundNames.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
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
   * Get current volume
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * Check if sound is enabled
   */
  get enabled(): boolean {
    return this.isEnabled
  }

  /**
   * Check if sounds are initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * Get list of available sounds
   */
  getAvailableSounds(): string[] {
    return Array.from(this.sounds.keys())
  }

  /**
   * Preload all sounds (call this early in app lifecycle)
   */
  async preload(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeSounds()
    }
  }

  /**
   * Disable all sounds
   */
  disable() {
    this.isEnabled = false
    console.log("🔇 Sound disabled")
  }

  /**
   * Test all sounds (for debugging)
   */
  async testAllSounds(): Promise<void> {
    if (!this.isEnabled) {
      console.log("Enable sound first to test")
      return
    }

    console.log("Testing all sounds...")
    const soundNames = this.getAvailableSounds()

    for (const soundName of soundNames) {
      console.log(`Testing: ${soundName}`)
      await this.play(soundName)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log("Sound test complete")
  }
}

// Create enhanced global sound manager instance
export const soundManager = new EnhancedSoundManager()
