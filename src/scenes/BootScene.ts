import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

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
    // Note: pickup sound uses UI select as placeholder for browser compatibility
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
}
