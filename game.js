'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const soundGate=document.getElementById('soundGate');
let W=0,H=0,last=performance.now();
let audio=null;
const keys=new Set();
const joy={active:false,id:null,x:110,y:0,dx:0,dy:0};
const attackTouch={active:false,id:null};
const hero={x:0,y:0,speed:205,dirX:1,dirY:0,attack:0};
const allies=[{x:-90,y:55,role:'Ranger'},{x:-125,y:-25,role:'Arcanist'},{x:-40,y:95,role:'Warden'}];
const enemies=[];
function resize(){W=innerWidth;H=innerHeight;canvas.width=W;canvas.height=H;canvas.style.width=W+'px';canvas.style.height=H+'px';joy.y=H-92}
addEventListener('resize',resize);resize();
function unlock(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();soundGate.textContent='Sound on';soundGate.classList.add('hidden');beep(520,.05,.05)}catch(e){soundGate.textContent='Sound unavailable'}}
function beep(f,d=.08,v=.05){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime;o.frequency.value=f;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g).connect(audio.destination);o.start(n);o.stop(n+d)}
soundGate.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock()});
canvas.addEventListener('pointerdown',e=>{unlock();canvas.setPointerCapture(e.pointerId);if(e.clientX<W*.48&&!joy.active){joy.active=true;joy.id=e.pointerId;joy.x=e.clientX;joy.y=e.clientY}else if(!attackTouch.active){attackTouch.active=true;attackTouch.id=e.pointerId;hero.attack=.22;beep(170,.08,.04)}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.x,dy=e.clientY-joy.y,m=Math.hypot(dx,dy),lim=52;if(m>lim){dx*=lim/m;dy*=lim/m}joy.dx=dx/lim;joy.dy=dy/lim});
function release(e){if(e.pointerId===joy.id){joy.active=false;joy.id=null;joy.dx=joy.dy=0}if(e.pointerId===attackTouch.id){attackTouch.active=false;attackTouch.id=null}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
addEventListener('keydown',e=>keys.add(e.key.toLowerCase()));addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
for(let i=0;i<10;i++)enemies.push({x:220+i*80,y:(i%2?90:-80)+(i%3)*60});
function update(dt){hero.attack=Math.max(0,hero.attack-dt);let mx=(keys.has('d')?1:0)-(keys.has('a')?1:0)+joy.dx,my=(keys.has('s')?1:0)-(keys.has('w')?1:0)+joy.dy,m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}if(m>.04){hero.dirX=mx;hero.dirY=my;hero.x+=mx*hero.speed*dt;hero.y+=my*hero.speed*dt}hero.x=Math.max(-500,Math.min(500,hero.x));hero.y=Math.max(-300,Math.min(300,hero.y));for(const a of allies){a.x+=(hero.x-a.x)*dt*.7;a.y+=(hero.y-a.y)*dt*.7}}
function diamond(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();ctx.fill()}
function drawActor(x,y,kind,attack=0){ctx.save();ctx.translate(x,y);ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(0,18,22,8,0,0,7);ctx.fill();if(kind==='Guardian'){ctx.fillStyle='#173b6d';ctx.beginPath();ctx.moveTo(-15,-10);ctx.lineTo(-22,30);ctx.lineTo(18,26);ctx.lineTo(14,-8);ctx.fill();ctx.fillStyle='#9da4a7';ctx.fillRect(-14,-15,28,30);ctx.fillStyle='#d0d2cf';ctx.beginPath();ctx.arc(0,-23,12,0,7);ctx.fill();ctx.fillStyle='#8c211a';ctx.beginPath();ctx.moveTo(0,-36);ctx.lineTo(20,-28);ctx.lineTo(3,-23);ctx.fill();ctx.fillStyle='#3c5877';ctx.beginPath();ctx.ellipse(-19,2,12,16,-.2,0,7);ctx.fill();ctx.save();ctx.translate(14,0);ctx.rotate(-.9+attack*2);ctx.strokeStyle='#f1eee4';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(42,-20);ctx.stroke();ctx.restore()}else if(kind==='Ranger'){ctx.fillStyle='#17462a';ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(-20,28);ctx.lineTo(20,28);ctx.fill();ctx.strokeStyle='#d4aa59';ctx.lineWidth=4;ctx.beginPath();ctx.arc(15,0,20,-1.3,1.3);ctx.stroke()}else if(kind==='Arcanist'){ctx.fillStyle='#244180';ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(-21,28);ctx.lineTo(21,28);ctx.fill();ctx.fillStyle='#9ec3ff';ctx.beginPath();ctx.arc(17,-17,8,0,7);ctx.fill()}else if(kind==='Warden'){ctx.fillStyle='#eee3cb';ctx.beginPath();ctx.moveTo(0,-30);ctx.lineTo(-21,28);ctx.lineTo(21,28);ctx.fill();ctx.fillStyle='#d2b66d';ctx.fillRect(22,10,18,12)}else{ctx.strokeStyle='#ddd2bb';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(0,18);ctx.moveTo(-14,-2);ctx.lineTo(14,5);ctx.moveTo(0,18);ctx.lineTo(-10,32);ctx.moveTo(0,18);ctx.lineTo(10,32);ctx.stroke();ctx.fillStyle='#e1d5bd';ctx.beginPath();ctx.arc(0,-23,10,0,7);ctx.fill()}ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#080706';ctx.fillRect(0,0,W,H);for(let gy=-8;gy<=8;gy++)for(let gx=-12;gx<=12;gx++){const x=W*.5+gx*64-gy*64,y=H*.52+gx*30+gy*30;diamond(x,y,48,23,(gx+gy)&1?'#302b25':'#28241f')}const sx=W*.5+hero.x,sy=H*.52+hero.y;drawActor(sx,sy,'Guardian',hero.attack>0?1-hero.attack/.22:0);for(const a of allies)drawActor(W*.5+a.x,H*.52+a.y,a.role);for(const e of enemies)drawActor(W*.5+e.x-hero.x*.15,H*.52+e.y-hero.y*.15,'Skeleton');const g=ctx.createRadialGradient(W/2,H/2,120,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(.4,'#0000');g.addColorStop(1,'#000b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function loop(n){const dt=Math.min(.033,(n-last)/1000);last=n;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
