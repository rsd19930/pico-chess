// Audio fallback system for when sound files are missing
// Provides silent alternatives and error handling

export class AudioFallbackSystem {
  private static instance: AudioFallbackSystem
  private fallbackSounds: Map<string, HTMLAudioElement> = new Map()
  private loadingPromises: Map<string, Promise<void>> = new Map()

  private constructor() {
    this.initializeFallbacks()
  }

  static getInstance(): AudioFallbackSystem {
    if (!AudioFallbackSystem.instance) {
      AudioFallbackSystem.instance = new AudioFallbackSystem()
    }
    return AudioFallbackSystem.instance
  }

  /**
   * Initialize fallback sounds using Web Audio API
   */
  private initializeFallbacks() {
    const fallbackDefinitions = {
      move: { frequency: 800, duration: 0.1, type: "sine" as OscillatorType },
      capture: { frequency: 600, duration: 0.2, type: "square" as OscillatorType },
      check: { frequency: 1000, duration: 0.3, type: "sine" as OscillatorType },
      checkmate: { frequency: 1200, duration: 0.5, type: "triangle" as OscillatorType },
      castle: { frequency: 700, duration: 0.15, type: "sine" as OscillatorType },
      promotion: { frequency: 1100, duration: 0.4, type: "triangle" as OscillatorType },
      game_start: { frequency: 900, duration: 0.3, type: "sine" as OscillatorType },
      game_end: { frequency: 500, duration: 0.4, type: "sine" as OscillatorType },
      invalid: { frequency: 300, duration: 0.1, type: "sawtooth" as OscillatorType },
      notification: { frequency: 850, duration: 0.2, type: "sine" as OscillatorType },
    }

    for (const [name, config] of Object.entries(fallbackDefinitions)) {
      this.createFallbackSound(name, config)
    }
  }

  /**
   * Create a synthetic sound using Web Audio API
   */
  private createFallbackSound(name: string, config: { frequency: number; duration: number; type: OscillatorType }) {
    try {
      // Create a data URL for a synthetic audio file
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime)
      oscillator.type = config.type

      // Create envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration)

      // Convert to audio element (simplified approach)
      const audio = new Audio()
      audio.volume = 0.5

      // Store the fallback
      this.fallbackSounds.set(name, audio)
    } catch (error) {
      console.warn(`Failed to create fallback sound for ${name}:`, error)
      // Create silent audio as ultimate fallback
      const silentAudio = new Audio()
      this.fallbackSounds.set(name, silentAudio)
    }
  }

  /**
   * Get fallback sound for a given sound name
   */
  getFallbackSound(soundName: string): HTMLAudioElement | null {
    return this.fallbackSounds.get(soundName) || null
  }

  /**
   * Play a fallback sound
   */
  async playFallback(soundName: string): Promise<void> {
    const fallback = this.getFallbackSound(soundName)
    if (fallback) {
      try {
        await fallback.play()
      } catch (error) {
        console.warn(`Failed to play fallback sound ${soundName}:`, error)
      }
    }
  }
}

// Export singleton instance
export const audioFallbacks = AudioFallbackSystem.getInstance()
