'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),soundGate=document.getElementById('soundGate');
let W=innerWidth,H=innerHeight,last=performance.now(),audio=null,master=null,noiseBuf=null;
const atlas=new Image(); atlas.src='assets/art-atlas.webp?v=9';
const keys=new Set(),joy={on:false,id:null,bx:110,by:0,dx:0,dy:0},atk={on:false,id:null};
const hero={x:.46,y:.58,vx:0,vy:0,hp:100,max:100,attack:0,face:1};
const allies=[{x:.37,y:.56,type:'ranger'},{x:.34,y:.68,type:'arcanist'},{x:.45,y:.72,type:'warden'}];
const enemies=[];let spawnTimer=.4;
const crops={guardian:[0,491,130,145],ranger:[134,491,110,115],arcanist:[248,491,105,123],warden:[357,491,105,115],skeleton:[466,491,78,98]};
function resize(){W=innerWidth;H=innerHeight;canvas.width=W;canvas.height=H;canvas.style.width=W+'px';canvas.style.height=H+'px';joy.by=H-96}
addEventListener('resize',resize);resize();
function initAudio(){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();if(!master){master=audio.createGain();master.gain.value=.3;master.connect(audio.destination);noiseBuf=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}soundGate.textContent='Sound on';soundGate.classList.add('hidden');metal(.08,.06)}catch(e){soundGate.textContent='Sound unavailable'}}
function osc(f,d,v=.05,type='sine',end=f){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,n);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),n+d);g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g).connect(master);o.start();o.stop(n+d)}
function noise(d,v,low=100,high=5000){if(!audio||audio.state!=='running')return;const s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain(),n=audio.currentTime;s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=(low+high)/2;f.Q.value=1.2;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);s.connect(f).connect(g).connect(master);s.start();s.stop(n+d)}
function metal(d=.12,v=.12){noise(d,v,700,6500);osc(190,d,.035,'sawtooth',80)}
function thud(){noise(.12,.16,60,900);osc(68,.16,.1,'triangle',38)}
function growl(){osc(95,.3,.06,'sawtooth',46);noise(.24,.04,80,700)}
soundGate.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();initAudio()});
canvas.addEventListener('pointerdown',e=>{initAudio();canvas.setPointerCapture(e.pointerId);if(e.clientX<W*.5&&!joy.on){joy.on=true;joy.id=e.pointerId;joy.bx=e.clientX;joy.by=e.clientY}else if(!atk.on){atk.on=true;atk.id=e.pointerId;attack()}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.bx,dy=e.clientY-joy.by,m=Math.hypot(dx,dy),lim=55;if(m>lim){dx*=lim/m;dy*=lim/m}joy.dx=dx/lim;joy.dy=dy/lim});
function release(e){if(e.pointerId===joy.id){joy.on=false;joy.id=null;joy.dx=joy.dy=0}if(e.pointerId===atk.id){atk.on=false;atk.id=null}}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')attack()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function attack(){if(hero.attack>0)return;hero.attack=.28;metal(.13,.14);for(const e of enemies){const dx=e.x-hero.x,dy=e.y-hero.y,d=Math.hypot(dx,dy);if(d<.16&&Math.sign(dx||hero.face)===hero.face){e.hp-=40;e.hit=.12;thud()}}}
function spawn(){enemies.push({x:.72+Math.random()*.13,y:.28+Math.random()*.35,hp:70,max:70,hit:0,grow:1+Math.random()*3,s:.055+Math.random()*.02})}
function update(dt){hero.attack=Math.max(0,hero.attack-dt);let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.dx,dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.dy,m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}if(m>.04){hero.face=dx<-.05?-1:dx>.05?1:hero.face;hero.x+=dx*.24*dt;hero.y+=dy*.34*dt}hero.x=Math.max(.18,Math.min(.82,hero.x));hero.y=Math.max(.25,Math.min(.82,hero.y));if(atk.on&&hero.attack<=0)attack();spawnTimer-=dt;if(spawnTimer<=0&&enemies.length<8){spawn();spawnTimer=1.3}
for(const e of enemies){e.hit=Math.max(0,e.hit-dt);e.grow-=dt;const dx=hero.x-e.x,dy=hero.y-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*e.s*dt;e.y+=dy/d*e.s*dt;if(e.grow<0&&d<.35){growl();e.grow=3+Math.random()*3}if(d<.065){hero.hp-=12*dt;if(hero.hp<0)hero.hp=0}}
enemies.splice(0,enemies.length,...enemies.filter(e=>e.hp>0));}
function drawCrop(name,x,y,h,flip=false,alpha=1){if(!atlas.complete)return;const c=crops[name],w=h*c[2]/c[3];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(atlas,c[0],c[1],c[2],c[3],-w/2,-h,h,h);ctx.restore()}
function background(){if(atlas.complete){ctx.drawImage(atlas,0,0,600,486,0,0,W,H)}else{ctx.fillStyle='#17130f';ctx.fillRect(0,0,W,H)}ctx.fillStyle='rgba(4,3,2,.28)';ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W*.52,H*.55,H*.18,W*.52,H*.55,W*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.62)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function bar(x,y,v,max,c){ctx.fillStyle='#180906';ctx.fillRect(x-24,y,48,6);ctx.fillStyle=c;ctx.fillRect(x-23,y+1,46*v/max,4);ctx.strokeStyle='#c6a45e';ctx.strokeRect(x-24,y,48,6)}
function draw(){background();const hy=hero.y*H,hx=hero.x*W;for(const a of allies){drawCrop(a.type,a.x*W,a.y*H,H*.22,false,.96)}for(const e of enemies){const ex=e.x*W,ey=e.y*H;drawCrop('skeleton',ex,ey,H*.19,e.x>hero.x,e.hit? .45:1);bar(ex,ey-H*.17,e.hp,e.max,'#a52d25')}drawCrop('guardian',hx,hy,H*.28,hero.face<0,1);bar(hx,hy-H*.25,hero.hp,hero.max,'#c83b2e');if(hero.attack>0){const p=1-hero.attack/.28,a=(-1.1+p*2.2)*hero.face;ctx.save();ctx.translate(hx,hy-H*.07);ctx.rotate(a);ctx.strokeStyle='#fff2c0';ctx.lineWidth=9;ctx.shadowColor='#ffb13c';ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(10*hero.face,0);ctx.lineTo(75*hero.face,-22);ctx.stroke();ctx.restore()}const bx=joy.on?joy.bx:105,by=joy.on?joy.by:H-96;ctx.globalAlpha=.45;ctx.fillStyle='#17120e';ctx.beginPath();ctx.arc(bx,by,62,0,7);ctx.fill();ctx.strokeStyle='#b38d52';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#9a805b';ctx.beginPath();ctx.arc(bx+joy.dx*48,by+joy.dy*48,27,0,7);ctx.fill();ctx.globalAlpha=1}
function loop(n){const dt=Math.min(.033,(n-last)/1000);last=n;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
