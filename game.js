'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const soundGate=document.getElementById('soundGate');
let W=0,H=0,last=performance.now(),clock=0,over=false,score=0;
let audio=null,master=null,noiseBuffer=null;
const keys=new Set();
const joy={active:false,id:null,x:112,y:0,dx:0,dy:0};
const attackTouch={active:false,id:null};
const world={w:1700,h:1100};
const hero={x:360,y:360,r:22,speed:215,hp:100,maxHp:100,dx:1,dy:0,walk:0,attack:0,hit:0,role:'Guardian'};
const allies=[makeActor(300,420,'Ranger',195),makeActor(280,315,'Arcanist',175),makeActor(370,450,'Warden',180)];
const enemies=[],shots=[],particles=[];
const portals=[{x:1180,y:270,hp:180,maxHp:180,cd:0},{x:1300,y:780,hp:180,maxHp:180,cd:.7}];
const props=[{x:610,y:265,t:'pillar'},{x:760,y:610,t:'pillar'},{x:1000,y:460,t:'statue'},{x:475,y:720,t:'bones'},{x:1050,y:830,t:'bones'}];
let cam={x:360,y:360};
function makeActor(x,y,role,speed){return{x,y,r:19,speed,hp:70,maxHp:70,dx:1,dy:0,walk:Math.random()*6,attack:0,hit:0,role}}
function resize(){W=innerWidth;H=innerHeight;canvas.width=W;canvas.height=H;canvas.style.width=W+'px';canvas.style.height=H+'px';joy.y=H-90}
addEventListener('resize',resize);resize();

function initAudio(){
  try{
    audio=audio||new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    if(!master){master=audio.createGain();master.gain.value=.32;master.connect(audio.destination);noiseBuffer=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    soundGate.textContent='Sound on';soundGate.classList.add('hidden');
    playChime();
  }catch(e){soundGate.textContent='Sound unavailable'}
}
function osc(freq,dur,vol=.08,type='sine',end=freq){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime;o.type=type;o.frequency.setValueAtTime(freq,n);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),n+dur);g.gain.setValueAtTime(vol,n);g.gain.exponentialRampToValueAtTime(.001,n+dur);o.connect(g).connect(master);o.start(n);o.stop(n+dur)}
function noise(dur,vol,low,high){if(!audio||audio.state!=='running')return;const n=audio.currentTime,s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();s.buffer=noiseBuffer;f.type='bandpass';f.frequency.setValueAtTime((low+high)/2,n);f.Q.value=Math.max(.4,(low+high)/(high-low));g.gain.setValueAtTime(vol,n);g.gain.exponentialRampToValueAtTime(.001,n+dur);s.connect(f).connect(g).connect(master);s.start(n);s.stop(n+dur)}
function playChime(){osc(440,.08,.05,'sine',660);setTimeout(()=>osc(660,.12,.04,'sine',880),70)}
function sfx(kind){
  if(kind==='sword'){noise(.18,.16,500,4200);osc(170,.12,.045,'sawtooth',90)}
  else if(kind==='impact'){noise(.11,.2,80,900);osc(78,.13,.12,'triangle',42)}
  else if(kind==='arrow'){noise(.16,.06,1800,6000);osc(620,.14,.035,'sine',240)}
  else if(kind==='magic'){osc(240,.3,.055,'sine',780);osc(480,.24,.035,'triangle',960);noise(.22,.045,900,5000)}
  else if(kind==='hammer'){noise(.14,.18,70,700);osc(58,.2,.15,'square',34)}
  else if(kind==='monster'){osc(105,.25,.08,'sawtooth',55);noise(.2,.06,100,800)}
}
soundGate.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();initAudio()});

function screenToWorldVector(sx,sy){
  // Inverse of screen x=.72(wx-wy), screen y=.34(wx+wy).
  let wx=sx/1.44+sy/.68;
  let wy=sy/.68-sx/1.44;
  const m=Math.hypot(wx,wy)||1;
  return{x:wx/m,y:wy/m};
}
canvas.addEventListener('pointerdown',e=>{
  initAudio();canvas.setPointerCapture(e.pointerId);
  if(e.clientX<W*.48&&!joy.active){joy.active=true;joy.id=e.pointerId;joy.x=e.clientX;joy.y=e.clientY}
  else if(e.clientX>W*.58&&!attackTouch.active){attackTouch.active=true;attackTouch.id=e.pointerId;melee(hero)}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.x,dy=e.clientY-joy.y,m=Math.hypot(dx,dy),lim=54;if(m>lim){dx*=lim/m;dy*=lim/m}joy.dx=dx/lim;joy.dy=dy/lim});
function release(e){if(e.pointerId===joy.id){joy.active=false;joy.id=null;joy.dx=joy.dy=0}if(e.pointerId===attackTouch.id){attackTouch.active=false;attackTouch.id=null}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')melee(hero)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

function nearest(a,list){let best=null,bd=Infinity;for(const o of list){if(o.hp<=0)continue;const d=(o.x-a.x)**2+(o.y-a.y)**2;if(d<bd){bd=d;best=o}}return best}
function burst(x,y,color,n=10){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*130;particles.push({x,y,z:8+Math.random()*20,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:40+Math.random()*100,life:.3+Math.random()*.35,max:.65,color,r:2+Math.random()*3})}}
function melee(a){if(a.attack>0||over)return;a.attack=.34;sfx(a.role==='Warden'?'hammer':'sword');for(const e of enemies){const dx=e.x-a.x,dy=e.y-a.y,d=Math.hypot(dx,dy)||1,dot=(dx*a.dx+dy*a.dy)/d;if(d<110&&dot>-.05){e.hp-=a.role==='Warden'?30:40;e.hit=.15;e.x+=a.dx*16;e.y+=a.dy*16;burst(e.x,e.y,'#a91f18',12);sfx('impact')}}}
function shoot(a,target){if(!target)return;const dx=target.x-a.x,dy=target.y-a.y,m=Math.hypot(dx,dy)||1;shots.push({x:a.x,y:a.y,z:26,vx:dx/m*430,vy:dy/m*430,life:1.6,role:a.role});a.attack=.3;sfx(a.role==='Arcanist'?'magic':'arrow')}
function spawn(portal){const r=Math.random(),type=r<.42?'skeleton':r<.68?'goblin':r<.9?'ghoul':'brute',stats={skeleton:[48,88,18],goblin:[36,125,17],ghoul:[70,96,21],brute:[150,58,29]}[type];enemies.push({x:portal.x+(Math.random()-.5)*90,y:portal.y+(Math.random()-.5)*90,r:stats[2],hp:stats[0],maxHp:stats[0],speed:stats[1],dx:-1,dy:0,walk:Math.random()*6,attack:0,hit:0,type,growl:Math.random()*3})}
function move(o,vx,vy,dt){o.x=Math.max(70,Math.min(world.w-70,o.x+vx*dt));o.y=Math.max(70,Math.min(world.h-70,o.y+vy*dt));if(Math.hypot(vx,vy)>4)o.walk+=dt*9}
function updateCamera(dt){
  const p=project(hero.x,hero.y,cam.x,cam.y);
  const left=W*.34,right=W*.66,top=H*.34,bottom=H*.66;
  let sx=0,sy=0;if(p.x<left)sx=p.x-left;else if(p.x>right)sx=p.x-right;if(p.y<top)sy=p.y-top;else if(p.y>bottom)sy=p.y-bottom;
  if(sx||sy){const w=screenToWorldVector(sx,sy);const magnitude=Math.hypot(sx,sy);cam.x+=w.x*magnitude*dt*3.4;cam.y+=w.y*magnitude*dt*3.4}
  cam.x=Math.max(220,Math.min(world.w-220,cam.x));cam.y=Math.max(180,Math.min(world.h-180,cam.y));
}
function update(dt){
  clock+=dt;if(over)return;
  hero.attack=Math.max(0,hero.attack-dt);hero.hit=Math.max(0,hero.hit-dt);
  let sx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.dx;
  let sy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.dy;
  const sm=Math.hypot(sx,sy);if(sm>1){sx/=sm;sy/=sm}
  if(sm>.04){const w=screenToWorldVector(sx,sy);hero.dx=w.x;hero.dy=w.y;move(hero,w.x*hero.speed,w.y*hero.speed,dt)}
  if(attackTouch.active&&hero.attack<=0)melee(hero);
  updateCamera(dt);
  for(const a of allies){a.attack=Math.max(0,a.attack-dt);a.hit=Math.max(0,a.hit-dt);const e=nearest(a,enemies),dx=hero.x-a.x,dy=hero.y-a.y,d=Math.hypot(dx,dy)||1;if(e&&Math.hypot(e.x-a.x,e.y-a.y)<300){const ex=e.x-a.x,ey=e.y-a.y,em=Math.hypot(ex,ey)||1;a.dx=ex/em;a.dy=ey/em;if(a.attack<=0){if(a.role==='Warden')melee(a);else shoot(a,e)}}else if(d>80)move(a,dx/d*a.speed,dy/d*a.speed,dt)}
  for(const p of portals){if(p.hp<=0)continue;p.cd-=dt;if(p.cd<=0){spawn(p);p.cd=1.35+Math.random()*.75}}
  for(const e of enemies){e.attack=Math.max(0,e.attack-dt);e.hit=Math.max(0,e.hit-dt);e.growl-=dt;const a=nearest(e,[hero,...allies]);if(!a)continue;const dx=a.x-e.x,dy=a.y-e.y,d=Math.hypot(dx,dy)||1;e.dx=dx/d;e.dy=dy/d;move(e,e.dx*e.speed,e.dy*e.speed,dt);if(e.growl<=0&&d<260){sfx('monster');e.growl=2.5+Math.random()*4}if(d<a.r+e.r+12&&e.attack<=0){e.attack=.8;a.hp-=e.type==='brute'?17:8;a.hit=.15;burst(a.x,a.y,'#8d1715',8);sfx('impact');if(a===hero&&a.hp<=0)over=true}}
  for(const q of shots){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;for(const e of enemies){if(e.hp>0&&Math.hypot(e.x-q.x,e.y-q.y)<e.r+12){e.hp-=q.role==='Arcanist'?28:20;e.hit=.15;q.life=0;burst(e.x,e.y,q.role==='Arcanist'?'#6fa9ff':'#d4b05c',9);sfx('impact');break}}}
  for(const e of enemies)if(e.hp<=0&&!e.dead){e.dead=true;score+=e.type==='brute'?100:30;burst(e.x,e.y,'#5f1714',18)}
  enemies.splice(0,enemies.length,...enemies.filter(e=>e.hp>0));shots.splice(0,shots.length,...shots.filter(q=>q.life>0));
  for(const q of particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.vz-=240*dt;q.life-=dt;q.vx*=.95;q.vy*=.95}particles.splice(0,particles.length,...particles.filter(q=>q.life>0));
}

function project(wx,wy,cx=cam.x,cy=cam.y,z=0){return{x:W*.5+(wx-cx)*.72-(wy-cy)*.72,y:H*.54+(wx-cx)*.34+(wy-cy)*.34-z}}
function diamond(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawTerrain(){
  ctx.fillStyle='#090807';ctx.fillRect(0,0,W,H);
  for(let gy=-9;gy<=9;gy++)for(let gx=-13;gx<=13;gx++){
    const wx=Math.floor(cam.x/64)*64+gx*64,wy=Math.floor(cam.y/64)*64+gy*64,p=project(wx,wy),odd=(gx+gy)&1;
    diamond(p.x,p.y,47,22,odd?'#302b25':'#29251f','#514536');
    const seed=Math.abs((wx*13+wy*7)%17);if(seed===3||seed===8){ctx.strokeStyle='#756047';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x-16,p.y-3);ctx.lineTo(p.x-4,p.y+5);ctx.lineTo(p.x+9,p.y-1);ctx.lineTo(p.x+18,p.y+4);ctx.stroke()}
  }
  // Raised perimeter walls and internal ruins.
  drawWallRow(160,150,7,'x');drawWallRow(160,150,6,'y');drawWallRow(960,190,5,'x');drawWallRow(780,560,5,'y');drawWallRow(390,720,4,'x');
  for(const p of props)drawProp(p);
}
function drawWallRow(wx,wy,count,axis){for(let i=0;i<count;i++){const x=wx+(axis==='x'?i*64:0),y=wy+(axis==='y'?i*64:0),p=project(x,y);diamond(p.x,p.y-35,47,22,'#5a5144','#8b7454');ctx.fillStyle='#27221c';ctx.beginPath();ctx.moveTo(p.x-47,p.y-35);ctx.lineTo(p.x,p.y-13);ctx.lineTo(p.x,p.y+29);ctx.lineTo(p.x-47,p.y+7);ctx.closePath();ctx.fill();ctx.fillStyle='#393128';ctx.beginPath();ctx.moveTo(p.x+47,p.y-35);ctx.lineTo(p.x,p.y-13);ctx.lineTo(p.x,p.y+29);ctx.lineTo(p.x+47,p.y+7);ctx.closePath();ctx.fill();ctx.strokeStyle='#17130f';ctx.beginPath();ctx.moveTo(p.x-32,p.y-28);ctx.lineTo(p.x+15,p.y-6);ctx.stroke()}}
function drawProp(o){const p=project(o.x,o.y);if(o.t==='pillar'){ctx.fillStyle='#14110e';ctx.beginPath();ctx.ellipse(p.x,p.y+12,24,9,0,0,7);ctx.fill();ctx.fillStyle='#4e473d';ctx.fillRect(p.x-14,p.y-72,28,76);ctx.fillStyle='#756956';ctx.fillRect(p.x-18,p.y-80,36,12);ctx.fillStyle='#28231e';ctx.fillRect(p.x+5,p.y-70,9,72)}else if(o.t==='statue'){ctx.fillStyle='#191612';ctx.beginPath();ctx.ellipse(p.x,p.y+10,29,10,0,0,7);ctx.fill();ctx.fillStyle='#545047';ctx.fillRect(p.x-20,p.y-20,40,25);ctx.beginPath();ctx.arc(p.x,p.y-48,15,0,7);ctx.fill();ctx.fillRect(p.x-12,p.y-45,24,38)}else{ctx.strokeStyle='#b4a78d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.x-18,p.y);ctx.lineTo(p.x+18,p.y+6);ctx.moveTo(p.x-7,p.y-8);ctx.lineTo(p.x+8,p.y+13);ctx.stroke();ctx.fillStyle='#c7baa0';ctx.beginPath();ctx.arc(p.x-18,p.y-5,7,0,7);ctx.fill()}}
function drawPortal(o){if(o.hp<=0)return;const p=project(o.x,o.y),pulse=1+Math.sin(clock*6)*.08,g=ctx.createRadialGradient(p.x,p.y-8,2,p.x,p.y-8,58);g.addColorStop(0,'#f2c4ff');g.addColorStop(.25,'#a952db');g.addColorStop(1,'#24072c00');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p.x,p.y,58*pulse,28*pulse,0,0,7);ctx.fill();ctx.strokeStyle='#c77cff';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(p.x,p.y,34,17,clock,0,7);ctx.stroke();for(let i=0;i<4;i++){const a=clock+i*Math.PI/2;ctx.fillStyle='#705078';ctx.fillRect(p.x+Math.cos(a)*38-6,p.y+Math.sin(a)*18-22,12,24)}healthBar(p.x,p.y-50,o.hp,o.maxHp,'#9a44c1')}
function drawActor(o,isHero=false){
  const p=project(o.x,o.y),bob=Math.sin(o.walk)*2,hit=o.hit>0,attackPhase=o.attack>0?1-o.attack/(isHero?.34:.3):0;
  const scale=o.type==='brute'?1.35:1;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);
  ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(3,14,20,8,0,0,7);ctx.fill();if(hit)ctx.globalAlpha=.55;
  if(isHero)drawGuardian(bob,attackPhase);
  else if(o.role==='Ranger')drawRanger(bob,attackPhase);
  else if(o.role==='Arcanist')drawMage(bob,attackPhase);
  else if(o.role==='Warden')drawWarden(bob,attackPhase);
  else drawMonster(o,bob,attackPhase);
  ctx.restore();healthBar(p.x,p.y-(o.type==='brute'?70:56),o.hp,o.maxHp,isHero?'#c63a2d':'#a42722');
}
function outlinePath(fill,stroke='#17120e',width=3){ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
function drawGuardian(b,a){
  ctx.beginPath();ctx.moveTo(-13,-7+b);ctx.lineTo(-23,28);ctx.lineTo(16,24);ctx.lineTo(13,-8+b);ctx.closePath();outlinePath('#173c70');
  ctx.fillStyle='#7b8287';ctx.fillRect(-13,-14+b,26,30);ctx.fillStyle='#c4c9c9';ctx.fillRect(-10,-11+b,20,7);
  ctx.beginPath();ctx.arc(0,-23+b,12,0,7);outlinePath('#9ea5a7');ctx.fillStyle='#1b1b1b';ctx.fillRect(-8,-25+b,16,4);
  ctx.beginPath();ctx.moveTo(0,-36+b);ctx.quadraticCurveTo(18,-43+b,20,-27+b);ctx.lineTo(3,-24+b);ctx.closePath();outlinePath('#8e2119');
  ctx.beginPath();ctx.ellipse(-18,1+b,11,16,-.25,0,7);outlinePath('#3b5878','#d3ad54',3);ctx.beginPath();ctx.moveTo(-18,-9+b);ctx.lineTo(-18,12+b);ctx.strokeStyle='#d3ad54';ctx.lineWidth=2;ctx.stroke();
  ctx.save();ctx.translate(12,-1+b);ctx.rotate(-1.0+a*2.15);ctx.strokeStyle='#362719';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(12,-5);ctx.stroke();ctx.strokeStyle='#d8b159';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(6,-10);ctx.lineTo(15,2);ctx.stroke();ctx.strokeStyle='#f2eee2';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(12,-5);ctx.lineTo(43,-22);ctx.stroke();ctx.strokeStyle='#aab0b1';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function drawRanger(b,a){ctx.beginPath();ctx.moveTo(0,-32+b);ctx.lineTo(-21,27);ctx.lineTo(21,27);ctx.closePath();outlinePath('#174629');ctx.fillStyle='#5c3c25';ctx.fillRect(-11,-7+b,22,24);ctx.beginPath();ctx.arc(0,-18+b,9,0,7);outlinePath('#bc946b');ctx.beginPath();ctx.arc(0,-22+b,14,Math.PI,0);outlinePath('#193a24');ctx.strokeStyle='#d5a959';ctx.lineWidth=4;ctx.beginPath();ctx.arc(16,0,20,-1.25,1.25);ctx.stroke();const pull=a>.05?10*Math.sin(a*Math.PI):0;ctx.strokeStyle='#eee3bf';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(21,-19);ctx.lineTo(21-pull,0);ctx.lineTo(21,19);ctx.stroke();ctx.strokeStyle='#d7c79f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(21-pull,0);ctx.lineTo(42,0);ctx.stroke()}
function drawMage(b,a){ctx.beginPath();ctx.moveTo(0,-33+b);ctx.lineTo(-22,28);ctx.lineTo(22,28);ctx.closePath();outlinePath('#213f82');ctx.fillStyle='#654b93';ctx.fillRect(-12,-6+b,24,25);ctx.beginPath();ctx.arc(0,-19+b,9,0,7);outlinePath('#d1bda2');ctx.beginPath();ctx.arc(0,-23+b,14,Math.PI,0);outlinePath('#232b4c');ctx.strokeStyle='#7daeff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(17,-13);ctx.lineTo(20,28);ctx.stroke();const r=7+Math.sin(clock*9)*2+a*8,g=ctx.createRadialGradient(17,-18,1,17,-18,r*2.6);g.addColorStop(0,'#fff');g.addColorStop(.25,'#9bc5ff');g.addColorStop(1,'#3d6cc000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(17,-18,r*2.6,0,7);ctx.fill();ctx.fillStyle='#b9d5ff';ctx.beginPath();ctx.arc(17,-18,r,0,7);ctx.fill()}
function drawWarden(b,a){ctx.beginPath();ctx.moveTo(0,-30+b);ctx.lineTo(-21,28);ctx.lineTo(21,28);ctx.closePath();outlinePath('#eee4cd');ctx.fillStyle='#a78947';ctx.fillRect(-12,-8+b,24,26);ctx.beginPath();ctx.arc(0,-20+b,11,0,7);outlinePath('#d8ceb5');ctx.strokeStyle='#e5c45f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,4,14,0,7);ctx.stroke();ctx.save();ctx.translate(12,-1);ctx.rotate(-.8+a*1.8);ctx.strokeStyle='#5d4827';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(30,20);ctx.stroke();ctx.fillStyle='#d4ba72';ctx.fillRect(25,13,18,13);ctx.strokeStyle='#6e5b31';ctx.lineWidth=2;ctx.strokeRect(25,13,18,13);ctx.restore()}
function drawMonster(o,b,a){
  if(o.type==='skeleton'){ctx.strokeStyle='#ded3bc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-14+b);ctx.lineTo(0,16);ctx.moveTo(-14,-2);ctx.lineTo(14,5);ctx.moveTo(0,16);ctx.lineTo(-11,31);ctx.moveTo(0,16);ctx.lineTo(11,31);ctx.stroke();ctx.beginPath();ctx.arc(0,-22+b,11,0,7);outlinePath('#e3d8c0');ctx.fillStyle='#25110e';ctx.fillRect(-6,-24+b,4,4);ctx.fillRect(2,-24+b,4,4);ctx.beginPath();ctx.ellipse(-16,3,9,13,0,0,7);outlinePath('#65422d');ctx.save();ctx.translate(12,2);ctx.rotate(-.8+a*1.6);ctx.strokeStyle='#aaa69f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(26,-19);ctx.stroke();ctx.restore()}
  else if(o.type==='goblin'){ctx.beginPath();ctx.arc(0,-16+b,11,0,7);outlinePath('#55703b');ctx.beginPath();ctx.moveTo(-9,-20+b);ctx.lineTo(-22,-15+b);ctx.lineTo(-8,-9+b);ctx.closePath();outlinePath('#55703b');ctx.beginPath();ctx.moveTo(9,-20+b);ctx.lineTo(22,-15+b);ctx.lineTo(8,-9+b);ctx.closePath();outlinePath('#55703b');ctx.fillStyle='#5e3822';ctx.fillRect(-11,-4,22,25);ctx.fillStyle='#f0b33d';ctx.fillRect(-6,-18+b,4,3);ctx.fillRect(2,-18+b,4,3);ctx.save();ctx.rotate(a*.35);ctx.strokeStyle='#d2cbc0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-11,2);ctx.lineTo(-27,-11);ctx.moveTo(11,2);ctx.lineTo(27,-11);ctx.stroke();ctx.restore()}
  else{const brute=o.type==='brute';ctx.beginPath();ctx.ellipse(0,2,brute?26:19,brute?29:22,0,0,7);outlinePath(brute?'#49342c':'#69564a');ctx.beginPath();ctx.arc(0,brute?-25+b:-19+b,brute?14:11,0,7);outlinePath('#826956');ctx.fillStyle='#ef4f3d';ctx.fillRect(-7,brute?-27+b:-21+b,4,4);ctx.fillRect(3,brute?-27+b:-21+b,4,4);ctx.save();ctx.translate(15,0);ctx.rotate(-.7+a*1.45);ctx.strokeStyle='#6a5646';ctx.lineWidth=brute?9:6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(brute?35:27,-19);ctx.stroke();ctx.fillStyle='#736b63';ctx.fillRect(brute?29:22,brute?-29:-25,brute?22:15,brute?16:12);ctx.restore()}
}
function healthBar(x,y,v,max,color){ctx.fillStyle='#160b08';ctx.fillRect(x-24,y,48,6);ctx.fillStyle=color;ctx.fillRect(x-23,y+1,46*Math.max(0,v/max),4);ctx.strokeStyle='#b19055';ctx.strokeRect(x-24,y,48,6)}
function drawShot(q){const p=project(q.x,q.y,cam.x,cam.y,q.z),c=q.role==='Arcanist'?'#78aaff':'#e0c173';ctx.shadowColor=c;ctx.shadowBlur=15;ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y,q.role==='Arcanist'?8:3,0,7);ctx.fill();ctx.shadowBlur=0;if(q.role!=='Arcanist'){ctx.strokeStyle='#d7c28e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-14,p.y+6);ctx.lineTo(p.x+7,p.y-3);ctx.stroke()}}
function draw(){
  ctx.clearRect(0,0,W,H);drawTerrain();
  for(const p of portals)drawPortal(p);
  const ordered=[...portals.filter(p=>p.hp>0).map(p=>({sort:p.x+p.y,kind:'portal',o:p})),...enemies.map(o=>({sort:o.x+o.y,kind:'actor',o})),...allies.map(o=>({sort:o.x+o.y,kind:'actor',o})),{sort:hero.x+hero.y,kind:'hero',o:hero}].sort((a,b)=>a.sort-b.sort);
  for(const item of ordered){if(item.kind==='actor')drawActor(item.o,false);else if(item.kind==='hero')drawActor(item.o,true)}
  shots.forEach(drawShot);
  for(const q of particles){const p=project(q.x,q.y,cam.x,cam.y,q.z);ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(p.x,p.y,q.r,0,7);ctx.fill()}ctx.globalAlpha=1;
  const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.72);g.addColorStop(.42,'#0000');g.addColorStop(1,'#000b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(over){ctx.fillStyle='#090604df';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ead3a0';ctx.textAlign='center';ctx.font='bold 42px Georgia';ctx.fillText('YOU HAVE FALLEN',W/2,H/2);ctx.font='18px Georgia';ctx.fillText('Reload to begin another run',W/2,H/2+35);ctx.textAlign='left'}
}
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
