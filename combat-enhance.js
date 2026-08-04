'use strict';
(() => {
  let audioCtx = null;
  let master = null;
  let soundReady = false;

  function initAudio() {
    if (soundReady) {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    master = audioCtx.createGain();
    master.gain.value = 0.22;
    master.connect(audioCtx.destination);
    soundReady = true;
  }

  function tone(freq, duration, type = 'sine', volume = 0.15, slide = 0) {
    if (!soundReady || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + duration);
  }

  function noise(duration = 0.08, volume = 0.12, cutoff = 1200) {
    if (!soundReady || !audioCtx) return;
    const len = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    src.buffer = buffer;
    filter.type = 'lowpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(); src.stop(audioCtx.currentTime + duration);
  }

  const oldAttack = doAttack;
  doAttack = function(a) {
    const ready = a.attackCd <= 0 && !gameOver;
    oldAttack(a);
    if (ready) {
      a.weaponAnim = 1;
      tone(220, 0.09, 'sawtooth', 0.10, -140);
      noise(0.055, 0.07, 1800);
    }
  };

  const oldShoot = shoot;
  shoot = function(a, target, damage, speed) {
    oldShoot(a, target, damage, speed);
    a.weaponAnim = 1;
    if (a.role === 'Arcanist') {
      tone(440, 0.18, 'sine', 0.13, 420);
      tone(220, 0.20, 'triangle', 0.08, 180);
    } else {
      tone(720, 0.055, 'triangle', 0.07, -250);
      noise(0.035, 0.045, 2500);
    }
  };

  const oldBurst = burst;
  burst = function(px, py, color, n) {
    oldBurst(px, py, color, n);
    if (color === '#d74b35' || color === '#a63030') {
      tone(95, 0.07, 'square', 0.06, -35);
      noise(0.06, 0.10, 700);
    }
  };

  canvas.addEventListener('pointerdown', initAudio, { passive: true });
  window.addEventListener('keydown', initAudio, { once: true });

  function metalGradient(light = '#e8e5dc', dark = '#54595d') {
    const g = ctx.createLinearGradient(-18, -25, 20, 22);
    g.addColorStop(0, light); g.addColorStop(.42, '#8e9497'); g.addColorStop(1, dark);
    return g;
  }

  function ellipseShadow(a, scale = 1) {
    ctx.fillStyle = '#0009';
    ctx.beginPath();
    ctx.ellipse(a.x + 5, a.y + 13, a.r * 1.08 * scale, a.r * .43 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function bodyBob(a) {
    return Math.sin(time * 8 + a.x * .03) * 1.25;
  }

  function attackPhase(a) {
    if (a.role === 'Guardian') return Math.max(0, Math.min(1, (a.attackCd || 0) / .38));
    return Math.max(0, Math.min(1, a.weaponAnim || 0));
  }

  function swordAndShield(phase) {
    const swing = phase > 0 ? (1 - phase) * Math.PI * 1.35 - .85 : 0;
    ctx.save();
    ctx.rotate(swing);
    ctx.strokeStyle = '#17191c'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(31, -23); ctx.stroke();
    ctx.strokeStyle = '#f0eee6'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(31, -23); ctx.stroke();
    ctx.strokeStyle = '#fff8c9'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(11, -2); ctx.lineTo(30, -22); ctx.stroke();
    ctx.fillStyle = '#b39042'; ctx.fillRect(5, -5, 13, 5);
    ctx.restore();
    ctx.fillStyle = '#243b55';
    ctx.beginPath(); ctx.ellipse(-15, 2, 11, 15, -.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d6b65e'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#d6b65e'; ctx.beginPath(); ctx.arc(-15, 2, 3, 0, 7); ctx.fill();
  }

  function bow(phase) {
    const draw = phase > 0 ? Math.sin((1 - phase) * Math.PI) * 6 : 0;
    ctx.strokeStyle = '#d6b56a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(14, 1, 18, -1.3, 1.3); ctx.stroke();
    ctx.strokeStyle = '#e6dfc6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(18, -16); ctx.lineTo(18 - draw, 1); ctx.lineTo(18, 18); ctx.stroke();
    ctx.strokeStyle = '#c7c1ac'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18 - draw, 1); ctx.lineTo(34, 1); ctx.stroke();
    ctx.fillStyle = '#c7c1ac'; ctx.beginPath(); ctx.moveTo(35,1);ctx.lineTo(29,-2);ctx.lineTo(29,4);ctx.fill();
  }

  function staff(phase) {
    const pulse = 5 + Math.sin(time * 10) * 2 + phase * 5;
    ctx.strokeStyle = '#6d5138'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(15, 22); ctx.stroke();
    const g = ctx.createRadialGradient(14, -14, 1, 14, -14, pulse * 2.2);
    g.addColorStop(0, '#fff'); g.addColorStop(.25, '#9ac2ff'); g.addColorStop(.65, '#4b78d8'); g.addColorStop(1, '#315ca000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(14, -14, pulse * 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#9bc3ff'; ctx.beginPath(); ctx.arc(14, -14, pulse, 0, 7); ctx.fill();
  }

  function hammer(phase) {
    const swing = phase > 0 ? (1 - phase) * Math.PI * 1.15 - .6 : 0;
    ctx.save(); ctx.rotate(swing);
    ctx.strokeStyle = '#8d6d3c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(24, 18); ctx.stroke();
    ctx.fillStyle = '#d9c57b'; ctx.fillRect(18, 13, 18, 10);
    ctx.strokeStyle = '#fff0aa'; ctx.lineWidth = 1; ctx.strokeRect(18, 13, 18, 10);
    ctx.restore();
  }

  drawHero = function(a, isPlayer = false) {
    if (a.weaponAnim) a.weaponAnim = Math.max(0, a.weaponAnim - .075);
    ellipseShadow(a);
    const ang = Math.atan2(a.dirY || 0, a.dirX || 1);
    const bob = bodyBob(a);
    const phase = attackPhase(a);
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang + Math.PI / 2);

    if (a.role === 'Guardian') {
      ctx.fillStyle = '#1c3151';
      ctx.beginPath(); ctx.moveTo(-10,-4+bob);ctx.lineTo(-17,23);ctx.lineTo(15,20);ctx.lineTo(10,-5+bob);ctx.closePath();ctx.fill();
      ctx.fillStyle = metalGradient(); ctx.beginPath(); ctx.roundRect(-13,-11+bob,26,27,7); ctx.fill();
      ctx.strokeStyle='#d0ad58';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#38434b';ctx.beginPath();ctx.arc(0,-16+bob,11,0,7);ctx.fill();
      ctx.fillStyle='#c5c7c3';ctx.beginPath();ctx.moveTo(-10,-18+bob);ctx.lineTo(0,-29+bob);ctx.lineTo(10,-18+bob);ctx.closePath();ctx.fill();
      ctx.fillStyle='#141719';ctx.fillRect(-7,-18+bob,14,3);
      ctx.fillStyle='#7c2e24';ctx.beginPath();ctx.moveTo(0,-29+bob);ctx.quadraticCurveTo(14,-35+bob,17,-24+bob);ctx.quadraticCurveTo(9,-27+bob,1,-23+bob);ctx.fill();
      swordAndShield(phase);
    } else if (a.role === 'Ranger') {
      ctx.fillStyle='#163b26';ctx.beginPath();ctx.moveTo(0,-27+bob);ctx.lineTo(-17,21);ctx.lineTo(17,21);ctx.closePath();ctx.fill();
      ctx.fillStyle='#5a3b25';ctx.beginPath();ctx.roundRect(-10,-6+bob,20,21,5);ctx.fill();
      ctx.fillStyle='#112a1c';ctx.beginPath();ctx.arc(0,-14+bob,12,0,7);ctx.fill();
      ctx.fillStyle='#c7a27b';ctx.beginPath();ctx.arc(0,-12+bob,6.5,0,7);ctx.fill();
      ctx.fillStyle='#8e643b';ctx.fillRect(-14,-6+bob,4,26);
      bow(phase);
    } else if (a.role === 'Arcanist') {
      ctx.fillStyle='#182f63';ctx.beginPath();ctx.moveTo(0,-26+bob);ctx.lineTo(-19,22);ctx.lineTo(19,22);ctx.closePath();ctx.fill();
      ctx.fillStyle='#4865a5';ctx.beginPath();ctx.roundRect(-11,-5+bob,22,22,5);ctx.fill();
      ctx.strokeStyle='#9ab8f4';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#d7c5aa';ctx.beginPath();ctx.arc(0,-13+bob,7,0,7);ctx.fill();
      ctx.fillStyle='#171e3b';ctx.beginPath();ctx.arc(0,-15+bob,12,Math.PI,0);ctx.fill();
      ctx.fillStyle='#724594';ctx.fillRect(-18,-3+bob,9,13);
      staff(phase);
    } else {
      ctx.fillStyle='#eee4c8';ctx.beginPath();ctx.moveTo(0,-24+bob);ctx.lineTo(-18,22);ctx.lineTo(18,22);ctx.closePath();ctx.fill();
      ctx.fillStyle='#9d884e';ctx.beginPath();ctx.roundRect(-11,-7+bob,22,22,5);ctx.fill();
      ctx.fillStyle='#ded4b8';ctx.beginPath();ctx.arc(0,-15+bob,10,0,7);ctx.fill();
      ctx.strokeStyle='#f0d170';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,4+bob,13,0,7);ctx.stroke();
      hammer(phase);
    }
    ctx.restore();
    bar(a.x-21,a.y-a.r-19,42,5,a.hp,a.maxHp,isPlayer?'#b62920':'#4f9a4f');
  };

  drawEnemy = function(e) {
    ellipseShadow(e, e.type === 'brute' ? 1.15 : 1);
    const ang = Math.atan2(e.dirY || 1, e.dirX || 0) + Math.PI/2;
    const bob = Math.sin(time * (e.type==='goblin'?12:8) + e.x*.03)*1.6;
    const attack = e.hit > .45 ? Math.sin((.75-e.hit)/.3*Math.PI)*.7 : 0;
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(ang+attack);
    if (e.flash) ctx.globalAlpha=.5;
    if (e.type==='skeleton') {
      ctx.strokeStyle='#16130f';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(0,12);ctx.moveTo(-11,0);ctx.lineTo(11,0);ctx.stroke();
      ctx.strokeStyle='#ded5bd';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(0,12);ctx.moveTo(-11,0);ctx.lineTo(11,0);ctx.moveTo(0,12);ctx.lineTo(-9,23);ctx.moveTo(0,12);ctx.lineTo(9,23);ctx.stroke();
      ctx.fillStyle='#e2d7bf';ctx.beginPath();ctx.arc(0,-14+bob,9,0,7);ctx.fill();
      ctx.fillStyle='#1b0d0b';ctx.fillRect(-5,-16+bob,3,3);ctx.fillRect(2,-16+bob,3,3);
      ctx.fillStyle='#70452b';ctx.beginPath();ctx.ellipse(-14,2,8,11,0,0,7);ctx.fill();ctx.strokeStyle='#a58f6d';ctx.stroke();
      ctx.strokeStyle='#bfc2bd';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(11,-1);ctx.lineTo(25,-20);ctx.stroke();
    } else if (e.type==='goblin') {
      ctx.fillStyle='#4f6637';ctx.beginPath();ctx.arc(0,-9+bob,11,0,7);ctx.fill();
      ctx.beginPath();ctx.moveTo(-8,-13+bob);ctx.lineTo(-20,-9+bob);ctx.lineTo(-8,-5+bob);ctx.fill();ctx.beginPath();ctx.moveTo(8,-13+bob);ctx.lineTo(20,-9+bob);ctx.lineTo(8,-5+bob);ctx.fill();
      ctx.fillStyle='#633b23';ctx.beginPath();ctx.roundRect(-11,-1,22,19,5);ctx.fill();
      ctx.fillStyle='#ffc23f';ctx.fillRect(-5,-11+bob,3,2);ctx.fillRect(2,-11+bob,3,2);
      ctx.strokeStyle='#d7d1c3';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-12,2);ctx.lineTo(-25,-12);ctx.moveTo(12,2);ctx.lineTo(25,-12);ctx.stroke();
    } else if (e.type==='brute') {
      ctx.fillStyle='#352622';ctx.beginPath();ctx.ellipse(0,4,27,28,0,0,7);ctx.fill();
      ctx.fillStyle='#685447';ctx.beginPath();ctx.arc(0,-21+bob,14,0,7);ctx.fill();
      ctx.fillStyle='#25211f';ctx.fillRect(-22,-7,44,16);
      ctx.fillStyle='#de4937';ctx.fillRect(-6,-24+bob,4,3);ctx.fillRect(2,-24+bob,4,3);
      ctx.strokeStyle='#8f8780';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(20,1);ctx.lineTo(37,-23);ctx.stroke();ctx.fillStyle='#57514b';ctx.fillRect(30,-30,20,13);
      ctx.strokeStyle='#6f665e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-18,1);ctx.lineTo(-30,23);ctx.stroke();
    } else {
      ctx.fillStyle='#5c4b40';ctx.beginPath();ctx.ellipse(0,4,17,20,0,0,7);ctx.fill();
      ctx.fillStyle='#806957';ctx.beginPath();ctx.arc(0,-14+bob,11,0,7);ctx.fill();
      ctx.fillStyle='#f05c43';ctx.fillRect(-5,-16+bob,3,3);ctx.fillRect(2,-16+bob,3,3);
      ctx.strokeStyle='#776255';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(-23,16);ctx.moveTo(11,0);ctx.lineTo(23,16);ctx.stroke();
      ctx.fillStyle='#2b1713';ctx.beginPath();ctx.arc(0,-7+bob,5,0,Math.PI);ctx.fill();
    }
    ctx.restore();
    bar(e.x-e.r,e.y-e.r-20,e.r*2,4,e.hp,e.maxHp,'#b52f28');
  };

  const audioBadge = document.createElement('div');
  audioBadge.textContent = '🔊';
  audioBadge.style.cssText = 'position:fixed;right:max(8px,env(safe-area-inset-right));top:44%;z-index:8;font-size:18px;opacity:.55;pointer-events:none;text-shadow:0 2px 4px #000';
  document.body.appendChild(audioBadge);
})();
