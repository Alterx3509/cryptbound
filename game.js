'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const soundGate=document.getElementById('soundGate');
const statusEl=document.getElementById('renderStatus');
if(statusEl) statusEl.remove();

let W=1,H=1,last=performance.now(),audio=null;
const hero={x:0,y:0,attack:0,initialized:false};
const joy={active:false,id:null,x:0,y:0,dx:0,dy:0};
const attackTouch={active:false,id:null};

function resize(){
  const oldW=W,oldH=H;
  W=Math.max(1,Math.floor(document.documentElement.clientWidth||innerWidth||1));
  H=Math.max(1,Math.floor(document.documentElement.clientHeight||innerHeight||1));
  canvas.width=W;canvas.height=H;
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  if(!hero.initialized){hero.x=W*.5;hero.y=H*.54;hero.initialized=true;}
  else if(oldW>1&&oldH>1){hero.x*=W/oldW;hero.y*=H/oldH;}
  clampHero();
}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>setTimeout(resize,150));
resize();

function unlock(){
  try{
    audio=audio||new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended') audio.resume();
    soundGate.textContent='Sound on';
    soundGate.classList.add('hidden');
    tone(520,.06,.05);
  }catch(e){soundGate.textContent='Sound unavailable';}
}
function tone(f,d,v){
  if(!audio||audio.state!=='running')return;
  const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime;
  o.frequency.value=f;g.gain.setValueAtTime(v,n);
  g.gain.exponentialRampToValueAtTime(.001,n+d);
  o.connect(g).connect(audio.destination);o.start(n);o.stop(n+d);
}
soundGate.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock();});

canvas.addEventListener('pointerdown',e=>{
  unlock();canvas.setPointerCapture(e.pointerId);
  if(e.clientX<W*.5&&!joy.active){
    joy.active=true;joy.id=e.pointerId;joy.x=e.clientX;joy.y=e.clientY;joy.dx=joy.dy=0;
  }else if(!attackTouch.active){
    attackTouch.active=true;attackTouch.id=e.pointerId;hero.attack=.25;tone(170,.08,.04);
  }
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==joy.id)return;
  let dx=e.clientX-joy.x,dy=e.clientY-joy.y,m=Math.hypot(dx,dy),lim=55;
  if(m>lim){dx*=lim/m;dy*=lim/m;}
  joy.dx=dx/lim;joy.dy=dy/lim;
});
function release(e){
  if(e.pointerId===joy.id){joy.active=false;joy.id=null;joy.dx=0;joy.dy=0;}
  if(e.pointerId===attackTouch.id){attackTouch.active=false;attackTouch.id=null;}
}
canvas.addEventListener('pointerup',release);
canvas.addEventListener('pointercancel',release);
canvas.addEventListener('lostpointercapture',release);

function clampHero(){
  const left=Math.max(115,W*.14),right=Math.min(W-135,W*.84);
  const top=Math.max(105,H*.20),bottom=Math.min(H-95,H*.80);
  hero.x=Math.max(left,Math.min(right,hero.x));
  hero.y=Math.max(top,Math.min(bottom,hero.y));
}
function diamond(x,y,rx,ry,c){
  ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();ctx.fill();
}
function update(dt){
  hero.attack=Math.max(0,hero.attack-dt);
  if(joy.active){hero.x+=joy.dx*220*dt;hero.y+=joy.dy*220*dt;}
  clampHero();
}
function drawActor(x,y){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(0,20,24,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#173b6d';ctx.beginPath();ctx.moveTo(-16,-10);ctx.lineTo(-24,32);ctx.lineTo(19,27);ctx.lineTo(15,-8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#9da4a7';ctx.fillRect(-14,-16,28,32);
  ctx.fillStyle='#d0d2cf';ctx.beginPath();ctx.arc(0,-24,12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8c211a';ctx.beginPath();ctx.moveTo(0,-38);ctx.lineTo(21,-29);ctx.lineTo(3,-24);ctx.closePath();ctx.fill();
  ctx.fillStyle='#3c5877';ctx.beginPath();ctx.ellipse(-20,2,12,17,-.2,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(14,0);ctx.rotate(-.9+(hero.attack>0?(1-hero.attack/.25)*2:0));
  ctx.strokeStyle='#f1eee4';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(42,-20);ctx.stroke();ctx.restore();ctx.restore();
}
function draw(){
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#2b1711';ctx.fillRect(0,0,W,H);
  for(let gy=-10;gy<=10;gy++)for(let gx=-14;gx<=14;gx++){
    const x=W*.5+gx*56-gy*56,y=H*.52+gx*27+gy*27;
    diamond(x,y,43,21,(gx+gy)&1?'#4b4035':'#3a322a');
  }
  ctx.fillStyle='#6d4f2f';
  for(let i=0;i<8;i++){ctx.fillRect(70+i*95,70,52,92);ctx.fillStyle='#2c2119';ctx.fillRect(108+i*95,70,14,92);ctx.fillStyle='#6d4f2f';}
  drawActor(hero.x,hero.y);
}
function loop(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
