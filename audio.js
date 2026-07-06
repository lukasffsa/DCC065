import * as THREE from 'three';

export let listener, audioLoader;
export let bgMusic, damageSound, enemyDownSound, hpSound, shootingSound;

export let damageSoundPool = [];
const DAMAGE_POOL_SIZE = 3;

export let shootingSoundPool = [];
const SHOOTING_POOL_SIZE = 3;

export let enemyDownSoundPool = [];
const ENEMY_DOWN_POOL_SIZE = 3;

export function initAudio(camera, manager) {
  listener = new THREE.AudioListener();
  camera.add(listener); 
  
  audioLoader = new THREE.AudioLoader(manager);

  bgMusic = new THREE.Audio(listener);
  audioLoader.load('assets/audio/background_music.mp3', (buffer) => {
    bgMusic.setBuffer(buffer);
    bgMusic.setLoop(true);
    bgMusic.setVolume(0.1);
  });

  damageSound = new THREE.Audio(listener);
  audioLoader.load('assets/audio/damage.mp3', (buffer) => {
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
      let sound = new THREE.Audio(listener);
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(0.1);
      damageSoundPool.push(sound);
    }
  });

  shootingSound = new THREE.Audio(listener);
  audioLoader.load('assets/audio/shooting.mp3', (buffer) => {
    for (let i = 0; i < SHOOTING_POOL_SIZE; i++) {
      let sound = new THREE.Audio(listener);
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(0.1);
      shootingSoundPool.push(sound);
    }
  });

  enemyDownSound = new THREE.Audio(listener);
  audioLoader.load('assets/audio/enemy_down.mp3', (buffer) => {
    for (let i = 0; i < ENEMY_DOWN_POOL_SIZE; i++) {
      let sound = new THREE.Audio(listener);
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(0.1);
      enemyDownSoundPool.push(sound);
    }
  });
  
  hpSound = new THREE.Audio(listener);
  hpSound.offset = 0.70;

  audioLoader.load('assets/audio/hp_sound.mp3', (buffer) => {
    hpSound.setBuffer(buffer);
    hpSound.setLoop(false);
    hpSound.setVolume(0.1);
  });
}

export function toggleMusic() {
  if (bgMusic && bgMusic.buffer) {
    if (bgMusic.isPlaying) bgMusic.pause();
    else bgMusic.play();
  }
}

export function playDamageSound() {
  if (damageSoundPool.length === 0) return;

  const availableSound = damageSoundPool.find(sound => !sound.isPlaying);

  if (availableSound) {
    availableSound.play();
    setTimeout(() => {
      if (availableSound.isPlaying) {
        availableSound.stop();
      }
    }, 1000);
  } 
  
  else {
    const soundToStop = damageSoundPool[0];
    damageSoundPool[0].stop();
    damageSoundPool[0].play();
  }
}

export function playShootingSound() {
  if (shootingSoundPool.length === 0) return;

  const availableSound = shootingSoundPool.find(sound => !sound.isPlaying);

  if (availableSound) {
    availableSound.play();
  } 
  
  else {
    const soundToStop = shootingSoundPool[0];
    shootingSoundPool[0].stop();
    shootingSoundPool[0].play();
  }
}

export function playEnemyDownSound() {
  if (enemyDownSoundPool.length === 0) return;

  const availableSound = enemyDownSoundPool.find(sound => !sound.isPlaying);

  if (availableSound) {
    availableSound.play();
  }

  else {
    const soundToStop = enemyDownSoundPool[0];
    enemyDownSoundPool[0].stop();
    enemyDownSoundPool[0].play();
  }
}

export function playHpSound() {
  if (hpSound && hpSound.buffer) {
    if (hpSound.isPlaying) {            
      hpSound.stop(); 
    }
    hpSound.play();
  }
}



