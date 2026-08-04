'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
let W=0,H=0,DPR=1,last=performance.now(),score=0,gameOver=false;
const keys=new Set();
const world={w:1800,h:1100,walls:[{x:0,y:0,w:1800,h:40},{x:0,y:1060,w:1800,h:40},{x:0,y:0,w:40,h:1100},{x:1760,y:0,w:40,h:1100},{x:360,y:180,w:420,h:48},{x:1000,y:160,w:48,h:420},{x:520,y:560,w:560,h:48},{x:1280,y:500,w:300,h:48},{x:260,y:820,w:420,h:48}]};
const player={x:260,y:300,r:20,speed:230,hp:100,maxHp:100,dirX:1,dirY:0,attackCd:0,color:'#f4d35e'};
const allies=[
 {x:215,y:345,r:17,speed:190,hp:75,maxHp:75,color:'#65d6ad',role:'Guardian',range:70,cd:0,dirX:1,dirY:0},
 {x:205,y:260,r:16,speed:205,hp:60,maxHp:60,color:'#6ec5ff',role:'Ranger',range:250,cd:0,dirX:1,dirY:0},
 {x:260,y:350,r:16,speed:185,hp:55,maxHp:55,color:'#c58cff',role:'Arcanist',range:220,cd:0,dirX:1,dirY:0}
];
const enemies=[],projectiles=[],slashes=[],pickups=[];
const spawners=[{x:1450,y:250,hp:120,t:0},{x:1480,y:850,hp:120,t:0},{x:780,y:900,hp:120,t:0}];
const joystick={active:false,id:null,baseX:115,baseY:0,x:0,y:0,dx:0,dy:0};
const attack={active:false,id:null};
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);joystick.baseY=H-105}
addEventListener('resize',resize);resize();
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')doAttack(player)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);if(e.clientX<W*.5&&!joystick.active){joystick.active=true;joystick.id=e.pointerId;joystick.baseX=e.clientX;joystick.baseY=e.clientY;joystick.x=e.clientX;joystick.y=e.clientY}else if(!attack.active){attack.active=true;attack.id=e.pointerId;doAttack(player)}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===joystick.id){joystick.x=e.clientX;joystick.y=e.clientY;let dx=joystick.x-joystick.baseX,dy=joystick.y-joystick.baseY,m=Math.hypot(dx,dy),lim=48;if(m>lim){dx*=lim/m;dy*=lim/m}joystick.dx=dx/lim;joystick.dy=dy/lim}});
function release(e){if(e.pointerId===joystick.id){joystick.active=false;joystick.id=null;joystick.dx=joystick.dy=0}if(e.pointerId===attack.id){attack.active=false;attack.id=null}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
function circleRect(o,r){let nx=Math.max(r.x,Math.min(o.x,r.x+r.w)),ny=Math.max(r.y,Math.min(o.y,r.y+r.h));return (o.x-nx)**2+(o.y-ny)**2<o.r**2}
function move(o,vx,vy,dt){o.x+=vx*dt;for(const r of world.walls)if(circleRect(o,r))o.x-=vx*dt;o.y+=vy*dt;for(const r of world.walls)if(circleRect(o,r))o.y-=vy*dt;o.x=Math.max(o.r,Math.min(world.w-o.r,o.x));o.y=Math.max(o.r,Math.min(world.h-o.r,o.y))}
function nearest(from,list,filter=()=>true){let best=null,bd=1e9;for(const o of list)if(filter(o)){let d=(o.x-from.x)**2+(o.y-from.y)**2;if(d<bd){bd=d;best=o}}return best}
function doAttack(a){if(a.attackCd>0||gameOver)return;a.attackCd=.38;slashes.push({x:a.x,y:a.y,dx:a.dirX,dy:a.dirY,t:.15});for(const e of enemies){let dx=e.x-a.x,dy=e.y-a.y,d=Math.hypot(dx,dy),dot=(dx*a.dirX+dy*a.dirY)/(d||1);if(d<92&&dot>.1){e.hp-=34;e.vx+=a.dirX*120;e.vy+=a.dirY*120}}}
function shoot(a,target,damage=17,speed=420){let dx=target.x-a.x,dy=target.y-a.y,m=Math.hypot(dx,dy)||1;projectiles.push({x:a.x,y:a.y,vx:dx/m*speed,vy:dy/m*speed,r:5,damage,life:1.4,color:a.color})}
function spawnEnemy(s){enemies.push({x:s.x+(Math.random()-.5)*55,y:s.y+(Math.random()-.5)*55,r:15,speed:85+Math.random()*35,hp:45,maxHp:45,vx:0,vy:0,hit:0,color:'#e85d75'})}
function update(dt){if(gameOver)return;player.attackCd=Math.max(0,player.attackCd-dt);let mx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joystick.dx,my=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joystick.dy,m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}if(m>.08){player.dirX=mx;player.dirY=my}move(player,mx*player.speed,my*player.speed,dt);if(attack.active&&player.attackCd<=0)doAttack(player);
 for(const a of allies){a.cd=Math.max(0,a.cd-dt);let target=nearest(a,enemies,e=>e.hp>0),dx=player.x-a.x,dy=player.y-a.y,d=Math.hypot(dx,dy);if(target&&Math.hypot(target.x-a.x,target.y-a.y)<a.range){let tx=target.x-a.x,ty=target.y-a.y,tm=Math.hypot(tx,ty)||1;a.dirX=tx/tm;a.dirY=ty/tm;if(a.cd<=0){if(a.role==='Guardian'){target.hp-=22;a.cd=.55}else{shoot(a,target,a.role==='Arcanist'?24:17,a.role==='Arcanist'?340:460);a.cd=a.role==='Arcanist'?.9:.58}}if(d>260)move(a,dx/d*a.speed,dy/d*a.speed,dt)}else if(d>70){move(a,dx/(d||1)*a.speed,dy/(d||1)*a.speed,dt)}}
 for(const s of spawners){if(s.hp<=0)continue;s.t-=dt;if(s.t<=0){spawnEnemy(s);s.t=1.3+Math.random()*.7}}
 for(const e of enemies){e.hit=Math.max(0,e.hit-dt);let targets=[player,...allies].filter(x=>x.hp>0),t=nearest(e,targets);if(!t)continue;let dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy)||1;e.vx*=.88;e.vy*=.88;move(e,dx/d*e.speed+e.vx,dy/d*e.speed+e.vy,dt);if(d<t.r+e.r+4&&e.hit<=0){t.hp-=8;e.hit=.75;if(t===player&&t.hp<=0)gameOver=true}}
 for(const p of projectiles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){e.hp-=p.damage;p.life=0;break}for(const s of spawners)if(s.hp>0&&Math.hypot(s.x-p.x,s.y-p.y)<27+p.r){s.hp-=p.damage;p.life=0;break}}
 for(const e of enemies)if(e.hp<=0&&!e.dead){e.dead=true;score+=25;if(Math.random()<.12)pickups.push({x:e.x,y:e.y,r:11,type:'food'})}
 for(const p of pickups)if(Math.hypot(player.x-p.x,player.y-p.y)<player.r+p.r){player.hp=Math.min(player.maxHp,player.hp+20);p.dead=true;score+=10}
 for(const s of spawners)if(s.hp<=0&&!s.dead){s.dead=true;score+=150}
 enemies.splice(0,enemies.length,...enemies.filter(e=>e.hp>0));projectiles.splice(0,projectiles.length,...projectiles.filter(p=>p.life>0));pickups.splice(0,pickups.length,...pickups.filter(p=>!p.dead));slashes.forEach(s=>s.t-=dt);slashes.splice(0,slashes.length,...slashes.filter(s=>s.t>0));}
function bar(x,y,w,h,v,max,color){ctx.fillStyle='#1a1d27';ctx.fillRect(x,y,w,h);ctx.fillStyle=color;ctx.fillRect(x,y,w*Math.max(0,v/max),h);ctx.strokeStyle='#fff3';ctx.strokeRect(x,y,w,h)}
function draw(){ctx.clearRect(0,0,W,H);const camX=Math.max(0,Math.min(world.w-W,player.x-W/2)),camY=Math.max(0,Math.min(world.h-H,player.y-H/2));ctx.save();ctx.translate(-camX,-camY);ctx.fillStyle='#131722';ctx.fillRect(0,0,world.w,world.h);ctx.strokeStyle='#1d2432';for(let x=0;x<world.w;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,world.h);ctx.stroke()}for(let y=0;y<world.h;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(world.w,y);ctx.stroke()}ctx.fillStyle='#343b4d';world.walls.forEach(r=>ctx.fillRect(r.x,r.y,r.w,r.h));
 for(const s of spawners)if(s.hp>0){ctx.fillStyle='#8d3f52';ctx.fillRect(s.x-25,s.y-25,50,50);ctx.strokeStyle='#ff9bad';ctx.strokeRect(s.x-25,s.y-25,50,50);bar(s.x-25,s.y-36,50,5,s.hp,120,'#e85d75')}
 for(const p of pickups){ctx.fillStyle='#7ee081';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();ctx.fillStyle='#163';ctx.fillRect(p.x-2,p.y-8,4,16)}
 for(const p of projectiles){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}
 for(const e of enemies){ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(e.x-5,e.y-4,3,3);ctx.fillRect(e.x+2,e.y-4,3,3);bar(e.x-16,e.y-24,32,4,e.hp,e.maxHp,'#ef476f')}
 for(const a of [...allies,player]){ctx.fillStyle=a.color;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,7);ctx.fill();ctx.strokeStyle='#fff8';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+(a.dirX||1)*28,a.y+(a.dirY||0)*28);ctx.stroke();bar(a.x-20,a.y-a.r-12,40,5,a.hp,a.maxHp,'#65d6ad')}
 for(const s of slashes){ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.beginPath();let ang=Math.atan2(s.dy,s.dx);ctx.arc(s.x,s.y,48,ang-.7,ang+.7);ctx.stroke()}ctx.restore();
 ctx.fillStyle='#090b12cc';ctx.fillRect(12,12,270,58);ctx.fillStyle='#fff';ctx.font='bold 16px system-ui';ctx.fillText(`HP ${Math.max(0,Math.ceil(player.hp))}   SCORE ${score}`,24,34);bar(24,43,230,12,player.hp,player.maxHp,'#f4d35e');
 const bx=joystick.active?joystick.baseX:95,by=joystick.active?joystick.baseY:H-95;ctx.globalAlpha=.55;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,58,0,7);ctx.fill();ctx.globalAlpha=.8;ctx.fillStyle='#5b6477';ctx.beginPath();ctx.arc(bx+joystick.dx*48,by+joystick.dy*48,27,0,7);ctx.fill();ctx.globalAlpha=.65;ctx.fillStyle='#e85d75';ctx.beginPath();ctx.arc(W-95,H-95,58,0,7);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText('ATTACK',W-95,H-89);ctx.textAlign='left';
 if(gameOver){ctx.fillStyle='#090b12dd';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 42px system-ui';ctx.fillText('YOU HAVE FALLEN',W/2,H/2-15);ctx.font='20px system-ui';ctx.fillText('Refresh to begin another run',W/2,H/2+28);ctx.textAlign='left'}}
function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
