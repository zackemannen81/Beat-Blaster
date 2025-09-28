import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import ResultScene from './scenes/ResultScene';
import OptionsScene from './scenes/OptionsScene';
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a0a0f',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 540
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, GameScene, ResultScene, OptionsScene]
};
// eslint-disable-next-line no-new
new Phaser.Game(config);
