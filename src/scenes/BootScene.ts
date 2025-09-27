import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }
  private makeThrusterPinkCanvas(key = 'thruster_pink', w = 64, h = 64) {
    // Ta bort gammal om den finns
    if (this.textures.exists(key)) this.textures.remove(key)

    const tex = this.textures.createCanvas(key, w, h)
    if (!tex) {
      console.warn('createCanvas gav null för', key)
      return
    }

    const ctx = tex.getContext()
    if (!ctx) {
      console.warn('Ingen 2D context för', key)
      tex.destroy()
      return
    }

    // Rensa
    ctx.clearRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2

    // Rosa huvud-glow
    const rOuter = Math.min(w, h) * 0.48
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rOuter)
    g1.addColorStop(0.0, 'rgba(255, 93, 177, 1.00)') // #ff5db1
    g1.addColorStop(0.30, 'rgba(255, 93, 177, 0.65)')
    g1.addColorStop(0.65, 'rgba(255, 93, 177, 0.18)')
    g1.addColorStop(1.0, 'rgba(255, 93, 177, 0.00)')
    ctx.fillStyle = g1
    ctx.beginPath()
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2)
    ctx.fill()

    // Vit hot-core (lite mindre)
    const rCore = rOuter * 0.38
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rCore)
    g2.addColorStop(0.0, 'rgba(255,255,255,0.95)')
    g2.addColorStop(1.0, 'rgba(255,255,255,0.00)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g2
    ctx.beginPath()
    ctx.arc(cx, cy, rCore, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    tex.refresh()
  }
 /* private makeSynthParticles() {
    const makeGlow = (key: string, color: number, size = 20) => {
      // Skapa grafik i scenen, men göm den så den inte syns när vi ritar texturen
      const g = this.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
  
      const cx = size / 2, cy = size / 2;
      const layers = 6;
      const r = size * 0.48;
  
      // “Fejk-gradient” med flera cirklar → mjuk neon-glow
      for (let i = 0; i < layers; i++) {
        const t = 1 - i / layers;          // 1..0
        const a = 0.10 + 0.12 * t;         // fallande alpha
        g.fillStyle(color, a);
        g.fillCircle(cx, cy, r * t);
      }
  
      // Liten highlight-ring för crisp kant
      g.lineStyle(1, 0xffffff, 0.12);
      g.strokeCircle(cx, cy, r * 0.85);
  
      g.generateTexture(key, size, size);
      g.destroy();
    };
  
    makeGlow('p_glow_cyan', 0x00e5ff, 20);
    makeGlow('p_glow_pink', 0xff5db1, 20);
  }
  */

  preload() {
    // Atlases (TexturePacker JSON Hash)
    this.load.atlas(
      'gameplay',
      'src/assets/sprites/gameplay.atlas.png',
      'src/assets/sprites/gameplay.atlas.json'
    )
    this.load.atlas(
      'ui',
      'src/assets/sprites/ui.atlas.png',
      'src/assets/sprites/ui.atlas.json'
    )
    this.load.atlas(
      'particles',
      'src/assets/sprites/particles.atlas.png',
      'src/assets/sprites/particles.atlas.json'
    )
    /*
    this.load.setBaseURL('https://cdn.phaserfiles.com/v385');
    this.load.atlas('cube', 'assets/animations/cube.png', 'assets/animations/cube.json')
    this.load.setBaseURL('')
    */
    // Background now procedural (Starfield system); no image required
    // Load menu logo
    this.load.image('menulogo', 'src/assets/sprites/menulogo.png')
    // Load background image.
    this.load.image('background', 'src/assets/backgrounds/anal.png')

    // Config
    this.load.json('tracks', 'src/config/tracks.json')
    this.load.json('graphics', 'src/config/graphics.json')
    this.load.json('balance', 'src/config/balance.json')

    // Minimal SFX; Phaser supports array for codec fallbacks
    this.load.audio('ui_move', [
      'src/assets/audio/sfx/ui_move.wav',
      'src/assets/audio/sfx/ui_move.mp3',
      'src/assets/audio/sfx/ui_move.ogg'
    ])
    this.load.audio('ui_select', [
      'src/assets/audio/sfx/ui_select.wav',
      'src/assets/audio/sfx/ui_select.mp3',
      'src/assets/audio/sfx/ui_select.ogg'
    ])
    this.load.audio('ui_back', [
      'src/assets/audio/sfx/ui_back.wav',
      'src/assets/audio/sfx/ui_back.mp3',
      'src/assets/audio/sfx/ui_back.ogg'
    ])
    this.load.audio('shot', [
      'src/assets/audio/sfx/shot.wav'
    ])
    this.load.audio('hit_enemy', [
      'src/assets/audio/sfx/hit_enemy.ogg'
    ])
    this.load.audio('explode_big', [
      'src/assets/audio/sfx/explode_big.wav',
      'src/assets/audio/sfx/explode_big.ogg'
    ])
    this.load.audio('metronome', [
      'src/assets/audio/sfx/metronome.wav',
      'src/assets/audio/sfx/metronome.mp3'
    ])
    const announcerSources: Record<string, string[]> = {
      announcer_powerup: ['src/assets/audio/sfx/announcer_powerup.wav'],
      announcer_shield: ['src/assets/audio/sfx/announcer_shield.wav'],
      announcer_rapid_fire: ['src/assets/audio/sfx/announcer_rapid_fire.wav'],
      announcer_split_shot: ['src/assets/audio/sfx/announcer_split_shot.wav'],
      announcer_slowmo: ['src/assets/audio/sfx/announcer_slowmo.wav'],
      announcer_bomb_ready: ['src/assets/audio/sfx/announcer_bomb_ready.wav'],
      announcer_combo: ['src/assets/audio/sfx/announcer_combo.wav'],
      announcer_new_game: ['src/assets/audio/sfx/announcer_new_game.wav'],
      announcer_warning: ['src/assets/audio/sfx/announcer_warning.wav'],
      announcer_enemies_approching: ['src/assets/audio/sfx/announcer_enemies_approching.wav'],
      announcer_bee_powerup: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_powerup.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_powerup.mp3'
      ],
      announcer_bee_shield: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_shield.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_shield.mp3'
      ],
      announcer_bee_rapid_fire: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_rapid_fire.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_rapid_fire.mp3'
      ],
      announcer_bee_split_shot: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_split_shot.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_split_shot.mp3'
      ],
      announcer_bee_slowmo: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_slowmo.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_slowmo.mp3'
      ],
      announcer_bee_bomb_ready: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_bomb_ready.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_bomb_ready.mp3'
      ],
      announcer_bee_new_game: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_new_game.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_new_game.mp3'
      ],
      announcer_bee_warning: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_warning.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_warning.mp3'
      ],
      announcer_bee_enemies_approching: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_enemies_approching.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_enemies_approching.mp3'
      ],
      announcer_bee_wave: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_wave.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_wave.mp3'
      ],
      announcer_bee_boss: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_boss.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_boss.mp3'
      ],
      announcer_bee_enemy: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_enemy.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_enemy.mp3'
      ],
      announcer_bee_get_ready: [
        'src/assets/audio/sfx/voices/bee/announcer_bee_get_ready.wav',
        'src/assets/audio/sfx/voices/bee/announcer_bee_get_ready.mp3'
      ]
    }
    Object.entries(announcerSources).forEach(([key, sources]) => {
      this.load.audio(key, sources)
    })
    // Note: pickup sound uses UI select as placeholder for browser compatibility

    const plasmaBasePath = 'src/assets/sprites/plasmabeam'
    const loadSequence = (prefix: string, count: number) => {
      for (let i = 0; i < count; i++) {
        this.load.image(`${prefix}_${i}`, `${plasmaBasePath}/${prefix}_${i}.png`)
      }
    }

    loadSequence('bullet_plasma', 6)
    loadSequence('bullet_plasma_charge', 5)
    loadSequence('bullet_plasma_impact', 6)
    loadSequence('plasma_trail', 4)
    loadSequence('enemy_hit_plasma', 6)
    loadSequence('enemy_explode_plasma', 8)
    loadSequence('enemy_shard', 4)

    const loadPowerupSeq = (prefix: string) => {
      for (let i = 0; i < 8; i++) {
        this.load.image(`${prefix}_${i}`, `src/assets/sprites/powerups/${prefix}_${i}.png`)
      }
    }

    loadPowerupSeq('powerup_shield')
    loadPowerupSeq('powerup_rapid')
    loadPowerupSeq('powerup_split')
    loadPowerupSeq('powerup_slowmo')

    this.load.image('powerup_badge_shield', 'src/assets/sprites/powerups/powerup_badge_shield.png')
    this.load.image('powerup_badge_rapid', 'src/assets/sprites/powerups/powerup_badge_rapid.png')
    this.load.image('powerup_badge_split', 'src/assets/sprites/powerups/powerup_badge_split.png')
    this.load.image('powerup_badge_slowmo', 'src/assets/sprites/powerups/powerup_badge_slowmo.png')

    this.load.image('pink_beam_arc', `${plasmaBasePath}/pink_beam_arc.png`)
    this.load.image('plasma_glow_disc', `${plasmaBasePath}/plasma_glow_disc.png`)
    this.load.image('particle_plasma_spark', `${plasmaBasePath}/particle_plasma_spark.png`)
    this.load.image('particle_plasma_dot', `${plasmaBasePath}/particle_plasma_dot.png`)
  }

  create() {
 /*
    this.anims.create({
      key: 'spin',
      frames: this.anims.generateFrameNames('cube', { prefix: 'frame', start: 1, end: 23 }),
      frameRate: 50,
      repeat: -1
  });
  */
    //this.makeSynthParticles();
    this.makeThrusterPinkCanvas('thruster_pink', 64, 64)
    this.ensurePlasmaAnimations()
    const tracks = this.cache.json.get('tracks') as any[]
    this.registry.set('tracks', tracks)
    this.registry.set('selectedTrackId', tracks?.[0]?.id || null)
    const balance = this.cache.json.get('balance')
    this.registry.set('balance', balance)
    // Audio unlock overlay for browsers that suspend audio context

    const mgr = this.sound
    // @ts-expect-error context exists when using WebAudio
    const ctx = mgr.context
    if (ctx && ctx.state === 'suspended') {
      const { width, height } = this.scale
      const msg = this.add.text(width / 2, height / 2, 'Click to enable audio', { fontFamily: 'UiFont', fontSize: '22px', color: '#fff' }).setOrigin(0.5)
      this.input.once('pointerdown', async () => {
        try { await ctx.resume() } catch {}
        msg.destroy()
        this.scene.start('MenuScene')
      })
    } else {
      this.scene.start('MenuScene')
    }
  }

  private ensurePlasmaAnimations() {
    const makeFrames = (prefix: string, count: number) =>
      Array.from({ length: count }, (_v, i) => ({ key: `${prefix}_${i}` }))

    if (!this.anims.exists('bullet_plasma_idle')) {
      this.anims.create({
        key: 'bullet_plasma_idle',
        frames: makeFrames('bullet_plasma', 6),
        frameRate: 20,
        repeat: -1
      })
    }

    if (!this.anims.exists('bullet_plasma_charge')) {
      this.anims.create({
        key: 'bullet_plasma_charge',
        frames: makeFrames('bullet_plasma_charge', 5),
        frameRate: 24,
        repeat: 0,
        hideOnComplete: true
      })
    }

    if (!this.anims.exists('bullet_plasma_impact')) {
      this.anims.create({
        key: 'bullet_plasma_impact',
        frames: makeFrames('bullet_plasma_impact', 6),
        frameRate: 30,
        repeat: 0,
        hideOnComplete: true
      })
    }

    if (!this.anims.exists('plasma_trail_cycle')) {
      this.anims.create({
        key: 'plasma_trail_cycle',
        frames: makeFrames('plasma_trail', 4),
        frameRate: 18,
        repeat: -1
      })
    }

    if (!this.anims.exists('enemy_hit_plasma')) {
      this.anims.create({
        key: 'enemy_hit_plasma',
        frames: makeFrames('enemy_hit_plasma', 6),
        frameRate: 26,
        repeat: 0,
        hideOnComplete: true
      })
    }

    if (!this.anims.exists('enemy_explode_plasma')) {
      this.anims.create({
        key: 'enemy_explode_plasma',
        frames: makeFrames('enemy_explode_plasma', 8),
        frameRate: 22,
        repeat: 0,
        hideOnComplete: true
      })
    }

    if (!this.anims.exists('enemy_shard_twinkle')) {
      this.anims.create({
        key: 'enemy_shard_twinkle',
        frames: makeFrames('enemy_shard', 4),
        frameRate: 18,
        repeat: -1
      })
    }

    const ensurePowerupAnim = (type: 'shield' | 'rapid' | 'split' | 'slowmo') => {
      const key = `powerup_pickup_${type}`
      if (this.anims.exists(key)) return
      const frames = makeFrames(`powerup_${type}`, 8)
      this.anims.create({ key, frames, frameRate: 12, repeat: -1 })
    }

    ensurePowerupAnim('shield')
    ensurePowerupAnim('rapid')
    ensurePowerupAnim('split')
    ensurePowerupAnim('slowmo')
  }
}
