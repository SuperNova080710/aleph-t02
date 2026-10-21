import {random} from './engine.js';
const W=1440,H=720;
export class Renderer{
 constructor(canvas){this.canvas=canvas;canvas.width=W;canvas.height=H;this.ctx=canvas.getContext('2d');this.lane=1;this.camera=.64;this.particles=[];this.rings=[];this.flash=0;this.shake=0;this.flashColor='#55ebfa';const rng=random(777);this.stars=Array.from({length:110},()=>({x:rng()*W,y:rng()*H*.5,r:rng()*1.2+.3}));this.buildings=Array.from({length:65},(_,i)=>({x:i*25,w:15+rng()*30,h:15+rng()*90,lit:rng()}));this.rand=random(888);}
 project(lane,z){const p=Math.pow(Math.max(0,1-z),2);return {x:W*this.camera+(lane-1)*(30+270*p),y:H*.27+H*.57*p,s:.12+.88*p};}
 clearEffects(){this.particles=[];this.rings=[];this.flash=0;this.shake=0;}
 emit(e,reduced){if(reduced)return;const p=this.project(e.lane??this.lane,0);const colors={core:'#ffe49d',break:'#81f6ff',hit:'#ff476b',dash:'#64ecff',near:'#d6afff',win:'#b6ffe6',lose:'#ff5377'};const color=colors[e.type];if(!color)return;if(['hit','break','dash','win'].includes(e.type)){this.flash=e.type==='hit'?.25:.1;this.flashColor=color;this.shake=e.type==='hit'?8:3;}
 const count=e.type==='core'?15:e.type==='win'?70:24;for(let i=0;i<count;i++){const a=this.rand()*Math.PI*2,vel=60+this.rand()*240;this.particles.push({x:p.x,y:p.y,vx:Math.cos(a)*vel,vy:Math.sin(a)*vel,life:.3+this.rand()*.5,color});}this.rings.push({x:p.x,y:p.y,r:10,life:.45,color});}
 polygon(points,fill,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
 draw(g,now,dt,reduced){
 this.aspect=Math.min(2.5,Math.max(.6,(this.canvas.clientHeight/H)/(this.canvas.clientWidth/W)));this.unit=this.aspect>1.3?.7:1;
 const c=this.ctx,t=g?.elapsed??(reduced?0:now*.00022),playing=g?.state==='playing',ambient=!g;
 const activeTime=playing||ambient;this.camera+=( (g?.state? .5:.67)-this.camera)*Math.min(1,dt*5);this.lane+=((g?.lane??1)-this.lane)*Math.min(1,dt*19);
 c.save();if(!reduced&&this.shake){c.translate(Math.sin(now*.09)*this.shake,Math.cos(now*.07)*this.shake*.4);this.shake=Math.max(0,this.shake-dt*32);}
 const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#070e24');bg.addColorStop(.4,'#221835');bg.addColorStop(.72,'#0c1729');bg.addColorStop(1,'#050e1a');c.fillStyle=bg;c.fillRect(-12,-12,W+24,H+24);
 const cx=W*this.camera,hy=H*.27;
 const halo=c.createRadialGradient(cx,hy,0,cx,hy,420);halo.addColorStop(0,'#91465977');halo.addColorStop(.45,'#5b3a6544');halo.addColorStop(1,'#19153100');c.fillStyle=halo;c.fillRect(0,0,W,H);
 for(const star of this.stars){c.fillStyle=`rgba(180,204,237,${.22+(star.r/2)*.35})`;c.fillRect(star.x,star.y,star.r,star.r);}
 // Broken sunset disk, behind the city silhouettes.
 c.save();c.translate(cx,hy-28);c.scale(this.aspect,1);c.translate(-cx,-hy+28);c.beginPath();c.arc(cx,hy-28,100,0,Math.PI*2);c.clip();const sun=c.createLinearGradient(0,hy-130,0,hy+60);sun.addColorStop(0,'#f7b58c');sun.addColorStop(.6,'#b55778');sun.addColorStop(1,'#55335d');c.fillStyle=sun;c.fillRect(cx-110,hy-140,220,220);c.fillStyle='#19162c';for(let y=hy-26,i=0;y<hy+90;y+=12,i++)c.fillRect(cx-110,y,220,2+i*.6);c.restore();
 this.polygon([[0,hy+35],[80,hy-20],[170,hy+4],[260,hy-55],[360,hy+16],[470,hy-23],[620,hy+40],[W,hy+40]],'#131a2c');
 for(const b of this.buildings){c.fillStyle=b.lit>.6?'#0e1b2d':'#101726';c.fillRect(b.x,hy+38-b.h,b.w,b.h);if(b.lit>.4){c.fillStyle='#42617d55';for(let y=hy+45-b.h;y<hy+30;y+=14)for(let x=b.x+4;x<b.x+b.w-2;x+=8)c.fillRect(x,y,2,4);}if(b.h>70){c.fillStyle='#fb85a888';c.fillRect(b.x+b.w/2,hy+33-b.h,2,3);}}
 c.fillStyle='#091526';c.fillRect(0,hy+37,W,H);
 const ground=c.createLinearGradient(0,hy,0,H);ground.addColorStop(0,'#0f2234');ground.addColorStop(1,'#07101c');
 this.polygon([[cx-36,hy],[cx+36,hy],[cx+760,H+20],[cx-760,H+20]],ground);
 // Road grid and illuminated rails use the same projection as collisions.
 c.lineWidth=1;
 for(let i=0;i<24;i++){const z=((i/24+(reduced?0:t*.16))%1);const p=Math.pow(1-z,2);const y=hy+(H-hy)*p,half=36+740*p;c.strokeStyle=`rgba(76,126,160,${.08+p*.2})`;c.beginPath();c.moveTo(cx-half,y);c.lineTo(cx+half,y);c.stroke();}
 for(const lane of [-1.5,-.5,.5,1.5]){const left=cx+lane*24,bottom=cx+lane*490;c.strokeStyle=Math.abs(lane)>1?'#44dae9':'#527f9744';c.lineWidth=Math.abs(lane)>1?2:1;c.beginPath();c.moveTo(left,hy);c.lineTo(bottom,H+10);c.stroke();if(Math.abs(lane)>1){c.strokeStyle='#54dce51a';c.lineWidth=12;c.stroke();}}
 for(let i=0;i<14;i++){const z=((i/14+(reduced?0:t*.12))%1),p=Math.pow(1-z,2),y=hy+(H-hy)*p;for(const side of [-1,1]){const x=cx+side*(48+810*p);c.fillStyle=i%3?'#54c7e877':'#e99bc7';c.fillRect(x,y,2+4*p,4+40*p);c.fillStyle='#223a50';c.fillRect(x+side*8,y,3+3*p,30+70*p);}}
 const objects=g?.objects??[{kind:'barrier',lane:0,z:.38},{kind:'barrier',lane:2,z:.6},{kind:'core',lane:1,z:.18},{kind:'core',lane:1,z:.45},{kind:'core',lane:0,z:.7}];
 for(const o of [...objects].sort((a,b)=>b.z-a.z)){if(o.done&&o.lane===g?.lane)continue;const p=this.project(o.lane,o.z);if(o.kind==='core')this.core(p,t,reduced);else this.barrier(p,o.row??0);}
 const ship=this.project(this.lane,0);this.ship(ship,g,now,reduced);
 if(g?.dash>0&&!reduced){c.strokeStyle='#8defff66';c.lineWidth=2;for(let i=0;i<16;i++){const angle=(i/16)*Math.PI*2;c.beginPath();c.moveTo(cx+Math.cos(angle)*280,hy+Math.sin(angle)*110);c.lineTo(cx+Math.cos(angle)*1200,hy+Math.sin(angle)*700);c.stroke();}}
 if(!reduced){
  for(const p of this.particles){if(activeTime||['win','lose'].includes(g?.state)){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}c.globalAlpha=Math.min(1,p.life*3);c.fillStyle=p.color;c.fillRect(p.x,p.y,4,4);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
  for(const r of this.rings){if(g?.state!=='paused'){r.r+=dt*220;r.life-=dt;}c.globalAlpha=Math.max(0,r.life*2);c.strokeStyle=r.color;c.lineWidth=2;c.beginPath();c.ellipse(r.x,r.y,r.r,r.r*.3,0,0,Math.PI*2);c.stroke();}c.globalAlpha=1;this.rings=this.rings.filter(r=>r.life>0);
  if(this.flash>0){c.globalAlpha=this.flash;c.fillStyle=this.flashColor;c.fillRect(0,0,W,H);c.globalAlpha=1;if(g?.state!=='paused')this.flash=Math.max(0,this.flash-dt*.7);}
 }
 const vig=c.createRadialGradient(W*.5,H*.5,H*.2,W*.5,H*.5,W*.75);vig.addColorStop(0,'#00000000');vig.addColorStop(1,'#02091799');c.fillStyle=vig;c.fillRect(0,0,W,H);c.restore();
 }
 core(p,t,reduced){const c=this.ctx,r=17*p.s,bob=reduced?0:Math.sin(t*5+p.y*.02)*3*p.s;c.save();c.translate(p.x,p.y-20*p.s+bob);c.scale(this.aspect*this.unit,this.unit);c.shadowBlur=22*p.s;c.shadowColor='#ffcf73';this.polygon([[0,-r],[r*.65,0],[0,r],[-r*.65,0]],'#ffe7ac','#fff1cb');c.shadowBlur=0;this.polygon([[0,-r],[0,r],[-r*.65,0]],'#d99b4f');c.strokeStyle='#ffd28b55';c.beginPath();c.ellipse(0,25*p.s,22*p.s,5*p.s,0,0,Math.PI*2);c.stroke();c.restore();}
 barrier(p,row){const c=this.ctx,w=72*p.s,h=52*p.s,d=20*p.s,y=p.y;c.save();c.translate(p.x,p.y);c.scale(this.aspect*this.unit,this.unit);c.translate(-p.x,-p.y);c.shadowColor='#ff4f71';c.shadowBlur=17*p.s;this.polygon([[p.x-w,y],[p.x+w,y],[p.x+w,y-h],[p.x-w,y-h]],'#471d3c','#ff6489');c.shadowBlur=0;this.polygon([[p.x-w,y-h],[p.x-w+d,y-h-d],[p.x+w+d,y-h-d],[p.x+w,y-h]],'#783451','#ff80a0');this.polygon([[p.x+w,y],[p.x+w+d,y-d],[p.x+w+d,y-h-d],[p.x+w,y-h]],'#29192f','#b5476b');c.strokeStyle='#ff8da6';c.lineWidth=3*p.s;c.beginPath();c.moveTo(p.x-22*p.s,y-12*p.s);c.lineTo(p.x,y-38*p.s);c.lineTo(p.x+22*p.s,y-12*p.s);c.stroke();c.fillStyle='#ff7094';c.fillRect(p.x-3*p.s,y-25*p.s,6*p.s,8*p.s);c.restore();}
 ship(p,g,now,reduced){const c=this.ctx,dash=g?.dash>0,lean=(g?.lane??1)-this.lane;const bob=!g&&!reduced?Math.sin(now*.002)*3:0;c.save();c.translate(p.x,p.y+bob);c.scale(this.aspect*this.unit,this.unit);c.rotate(lean*.08);if(g?.invulnerable>0&&!reduced)c.globalAlpha=.65+.35*Math.sin(now*.03);
 c.fillStyle='#0008';c.beginPath();c.ellipse(0,24,65,15,0,0,Math.PI*2);c.fill();
 const thrust=reduced?20:30+Math.sin(now*.04)*10+(dash?75:0);for(const x of [-26,26]){const plume=c.createLinearGradient(0,8,0,thrust+48);plume.addColorStop(0,'#d4ffff');plume.addColorStop(.25,'#68e5ffbb');plume.addColorStop(1,'#2abaff00');this.polygon([[x-9,10],[x+9,10],[x+4,thrust+30],[x-4,thrust+42]],plume);}
 c.shadowColor='#67e7ff';c.shadowBlur=dash?30:14;
 this.polygon([[-55,15],[-45,-18],[-20,-38],[-14,-65],[0,-81],[14,-65],[20,-38],[45,-18],[55,15],[23,5],[0,22],[-23,5]],'#213a57','#7cbed9');c.shadowBlur=0;
 this.polygon([[0,-81],[14,-65],[20,-38],[9,5],[0,17],[-9,5],[-20,-38],[-14,-65]],'#c2ddec','#e4faff');
 this.polygon([[0,-63],[10,-40],[7,-17],[0,-10],[-7,-17],[-10,-40]],'#123653','#59dcec');
 this.polygon([[-55,15],[-45,-18],[-21,-34],[-28,-4]],'#395f7b');this.polygon([[55,15],[45,-18],[21,-34],[28,-4]],'#244960');
 c.strokeStyle='#6eeaff';c.lineWidth=3;c.beginPath();c.moveTo(-46,9);c.lineTo(-36,-12);c.moveTo(46,9);c.lineTo(36,-12);c.stroke();c.fillStyle='#c4ffff';c.fillRect(-31,3,10,6);c.fillRect(21,3,10,6);
 if(dash){c.strokeStyle='#b7ffff';c.lineWidth=2;c.beginPath();c.ellipse(0,-20,75,95,0,0,Math.PI*2);c.stroke();}c.restore();
 }
}
