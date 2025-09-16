import Phaser from 'phaser'

export type BeatBand = 'low' | 'mid' | 'high'

export default class AudioAnalyzer extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene
  private analyser?: AnalyserNode
  private source?: MediaElementAudioSourceNode | MediaStreamAudioSourceNode
  private freqData?: Uint8Array
  // Audio analysis settings
  private smoothing = 0.5  // Increased for more stable detection
  private fftSize = 2048
  private started = false

  // Rolling windows
  private historyLow: number[] = []    // Bass drum
  private historyMid: number[] = []    // Snare body
  private historyHigh: number[] = []   // Snare snap
  private readonly HIST = 30           // Reduced history for faster response
  private readonly MIN_INTERVAL_MS = 100
  private lastBeat: Record<BeatBand, number> = { low: 0, mid: 0, high: 0 }
  private beatTimes: number[] = []
  private music?: Phaser.Sound.BaseSound


  constructor(scene: Phaser.Scene) {
    super()
    this.scene = scene
  }

  attachToAudio(music: Phaser.Sound.BaseSound): boolean {
    try {
      console.log('Attaching audio analyzer to sound...');
      
      const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
      if (!soundManager || !soundManager.context) {
        console.warn('Sound manager or audio context not available');
        return false;
      }

      const webAudioSound = music as Phaser.Sound.WebAudioSound;
      if (!webAudioSound) {
        console.warn('Not a WebAudio sound instance');
        return false;
      }
      
      console.log('WebAudio sound instance found:', webAudioSound);

      // Create analyzer if it doesn't exist
      if (!this.analyser) {
        this.analyser = soundManager.context.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = this.smoothing;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      }

      const soundAny = webAudioSound as any;
      
            // Try to connect to the volume node (common in Phaser)
            if (soundAny.GainNode) {
              try {
                console.log('Found GAIN node, connecting analyzer...');
                
                // Connect: gainNode -> analyser -> destination
                soundAny.GainNode.disconnect();
                soundAny.GainNode.connect(this.analyser);
              
                this.analyser.connect(soundManager.context.destination);
                
                this.started = true;
                this.music = music;
                console.log('Successfully connected to GAIN node');
                return true;
              } catch (error) {
                console.warn('Error connecting to GAIN node:', error);
              }
            }

      // Try to connect to the volume node (common in Phaser)
      if (soundAny.volumeNode) {
        try {
          console.log('Found volume node, connecting analyzer...');
          
          // Connect: volumeNode -> analyser -> destination
          soundAny.volumeNode.disconnect();
          soundAny.volumeNode.connect(this.analyser);
        
          this.analyser.connect(soundManager.context.destination);
          
          this.started = true;
          this.music = music;
          console.log('Successfully connected to volume node');
          return true;
        } catch (error) {
          console.warn('Error connecting to volume node:', error);
        }
      }
      
      // Try to connect to the source node directly
      if (soundAny.source) {
        try {
          console.log('Found source node, connecting analyzer...');
          
          // Connect: source -> analyser -> destination
          soundAny.source.disconnect();
          soundAny.source.connect(this.analyser);
          this.analyser.connect(soundManager.context.destination);
          
          this.started = true;
          this.music = music;
          console.log('Successfully connected to source node');
          return true;
        } catch (error) {
          console.warn('Error connecting to source node:', error);
        }
      }
      
      // Fallback to the older method if direct connection fails
      console.log('Trying fallback connection method...');
      setTimeout(() => {
        try {
          const nodes = this.getAudioNodes(webAudioSound);
          
          if (nodes && nodes.gainNode && this.analyser) {
            try {
              // Disconnect existing connections
              nodes.gainNode.disconnect();
              
              // Create new connection chain
              nodes.gainNode.connect(this.analyser);
              if (nodes.context) {
                this.analyser.connect(nodes.context.destination);
                
                this.started = true;
                this.music = music;
                console.log('Successfully connected audio analyzer to music (fallback)');
                return;
              }
            } catch (error) {
              console.warn('Error connecting audio nodes (fallback):', error);
            }
          }
          
          console.warn('Could not access audio nodes, trying final fallback method');
          this.fallbackAnalyzerSetup(webAudioSound);
        } catch (error) {
          console.error('Error in fallback audio node setup:', error);
          this.fallbackAnalyzerSetup(webAudioSound);
        }
      }, 500); // Increased delay to ensure audio graph is ready

      return true;
    } catch (error) {
      console.error('Error in attachToAudio:', error);
      return false;
    }
  }

  /**
   * Attempts to get the audio nodes from a WebAudioSound instance
   */
  private getAudioNodes(webAudioSound: Phaser.Sound.WebAudioSound): { gainNode?: GainNode; context: AudioContext } | null {
    console.log('Attempting to get audio nodes...');
    try {
      // Try to access the audio nodes through different methods
      const soundAny = webAudioSound as any;
      
      // Method 1: Check for gainNode property
      if (soundAny.gainNode) {
        return {
          gainNode: soundAny.gainNode,
          context: soundAny.context || soundAny.gainNode.context
        };
      }
      
      // Method 2: Check for _sound property (common in some Phaser versions)
      if (soundAny._sound && soundAny._sound.gainNode) {
        return {
          gainNode: soundAny._sound.gainNode,
          context: soundAny._sound.context
        };
      }
      
      // Method 3: Check for source property
      if (soundAny.source && soundAny.source.context) {
        return {
          gainNode: soundAny.source.gain || null,
          context: soundAny.source.context
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Error getting audio nodes:', error);
      return null;
    }
  }

  /**
   * Fallback method to set up the analyzer when direct node access fails
   */
  private fallbackAnalyzerSetup(webAudioSound: Phaser.Sound.WebAudioSound): void {
    console.log('Attempting fallback analyzer setup...');
    try {
      if (!this.analyser) {
        console.error('Analyzer not initialized');
        return;
      }

      const soundAny = webAudioSound as any;
      console.log('Sound object structure:', Object.keys(soundAny));
      
      // Get the audio context from the sound manager
      const soundManager = this.scene.sound as Phaser.Sound.WebAudioSoundManager;
      if (!soundManager || !soundManager.context) {
        console.error('Sound manager or audio context not available');
        return;
      }
      
      const audioContext = soundManager.context;
      
      // Try to get the audio source node
      let sourceNode: AudioNode | null = null;
      
      // Check for AudioBufferSourceNode (common in WebAudio)
      if (soundAny.source && soundAny.source.buffer) {
        console.log('Found AudioBufferSourceNode');
        sourceNode = soundAny.source;
      }
      // Check for gain node (common in Phaser)
      else if (soundAny.volumeNode) {
        console.log('Found volume node');
        sourceNode = soundAny.volumeNode;
      }
      // Check for mute node (common in Phaser)
      else if (soundAny.muteNode) {
        console.log('Found mute node');
        sourceNode = soundAny.muteNode;
      }
      
      if (!sourceNode) {
        console.error('Could not find audio source node in sound object');
        return;
      }
      
      console.log('Connecting analyzer to audio node:', sourceNode);
      
      // Disconnect existing connections
      try {
        sourceNode.disconnect();
      } catch (e) {
        console.warn('Could not disconnect source node:', e);
      }
      
      // Create new connection chain
      sourceNode.connect(this.analyser);
      this.analyser.connect(audioContext.destination);
      
      this.started = true;
      console.log('Fallback audio analyzer connected successfully');
    } catch (error) {
      console.error('Fallback analyzer setup failed:', error);
    }
  }

  update(): void {
    if (!this.started) {
      //console.warn('Analyzer not started');
      return;
    }
    
    if (!this.analyser) {
      //console.warn('No analyzer instance');
      return;
    }
    
    if (!this.freqData) {
      //console.warn('No frequency data buffer');
      return;
    }
    
    try {
      // Get frequency data
      this.analyser.getByteFrequencyData(this.freqData);
      
      // Log some debug info occasionally
      if (Math.random() < 0.01) { // ~1% chance per frame
        const sum = this.freqData.reduce((a, b) => a + b, 0);
        const avg = sum / this.freqData.length;
      //  console.log('Audio analysis - Avg freq:', avg.toFixed(2));
      }
      
      // Process the audio data
      const bands = this.computeBands(this.freqData);
      this.detectBeats(bands);
    } catch (error) {
      console.error('Error in analyzer update:', error);
      // Try to recover by reinitializing if we get too many errors
      this.started = false;
    }
  }

  private computeBands(spectrum: Uint8Array): { low: number; mid: number; high: number } {
    const mgr = this.scene.sound as Phaser.Sound.WebAudioSoundManager
    const ctx = mgr.context
    const bins = spectrum.length
    const nyquist = ctx.sampleRate / 2
    const hzPerBin = nyquist / bins
    
    // Helper function to compute weighted average in a frequency range
    const band = (lo: number, hi: number) => {
      const i0 = Math.max(0, Math.floor(lo / hzPerBin))
      const i1 = Math.min(bins - 1, Math.ceil(hi / hzPerBin))
      let sum = 0
      for (let i = i0; i <= i1; i++) {
        // Apply a slight emphasis on the center frequencies
        const weight = 1.0 + 0.5 * Math.sin(Math.PI * (i - i0) / (i1 - i0))
        sum += spectrum[i] * weight
      }
      return sum / Math.max(1, i1 - i0 + 1)
    }
    
    // Adjusted frequency bands for better drum detection:
    // - Bass drum: 60-150Hz (strongest around 60-90Hz)
    // - Snare body: 150-300Hz
    // - Snare snap: 1-5kHz
    return {
      low: band(38, 250),      // Bass drum range
      mid: band(350, 600),     // Snare body
      high: band(1000, 6000)   // Snare snap and high frequencies
    }
  }

  private detectBeats(bands: { low: number; mid: number; high: number }): void {
    const now = this.scene.time.now;
    
    const historyMap: Record<BeatBand, number[]> = {
      low: this.historyLow,
      mid: this.historyMid,
      high: this.historyHigh
    };
    
    const isBeat = (band: BeatBand, threshold: number, minInterval = 80): boolean => {
      const level = bands[band];
      const history = historyMap[band];
      
      // Calculate a weighted average that emphasizes recent history
      let weightedSum = 0;
      let weightSum = 0;
      history.forEach((value, i) => {
        const weight = (i + 1) / history.length; // More weight to recent values
        weightedSum += value * weight;
        weightSum += weight;
      });
      
      const avg = weightSum > 0 ? weightedSum / weightSum : 0;
      
      // Dynamic threshold based on signal variance
      const variance = history.length > 1 
        ? Math.sqrt(history.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (history.length - 1))
        : 0;
      
      const dynamicThreshold = Math.max(1.2, Math.min(2.0, 1.5 - (variance / 50)));
      const isBeatDetected = level > avg * dynamicThreshold * threshold && 
                           now - this.lastBeat[band] > minInterval;
      
      if (isBeatDetected) {
        this.lastBeat[band] = now;
        this.beatTimes.push(now);
        this.beatTimes = this.beatTimes.filter(t => now - t < 2000);
        this.emit(`beat:${band}`, level);
      }
      
      return isBeatDetected;
    };

    // Update history with exponential smoothing
    const smooth = (value: number, history: number[]) => {
      if (history.length === 0) return value;
      const last = history[history.length - 1];
      return last * 0.7 + value * 0.3;
    };
    
    this.historyLow.push(smooth(bands.low, this.historyLow));
    this.historyMid.push(smooth(bands.mid, this.historyMid));
    this.historyHigh.push(smooth(bands.high, this.historyHigh));
    
    // Keep history size in check
    if (this.historyLow.length > this.HIST) this.historyLow.shift();
    if (this.historyMid.length > this.HIST) this.historyMid.shift();
    if (this.historyHigh.length > this.HIST) this.historyHigh.shift();

    // Check for beats with adjusted thresholds and minimum intervals
    isBeat('low', 1.2, 80);     // More sensitive bass detection with shorter cooldown
    isBeat('mid', 1.5, 100);    // Snare body
    isBeat('high', 1.6, 50);    // More sensitive to snare snap
  }

  nearestBeatDeltaMs(at: number = this.scene.time.now): number {
    if (this.beatTimes.length === 0) return Number.POSITIVE_INFINITY
    // Find nearest value in a sorted-ish array (not guaranteed sorted, but append-only chronological)
    let best = Infinity
    for (let i = this.beatTimes.length - 1; i >= 0; i--) {
      const d = at - this.beatTimes[i]
      const ad = Math.abs(d)
      if (ad < best) best = ad
      // early break if we're moving far in past
      if (d > 500) break
    }
    return best
  }
}
