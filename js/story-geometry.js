/* Procedural exhibition structures. No bitmap is displayed or sampled.
   All anchors and mesh paths use the same fixed camera so silhouettes remain
   readable while the surrounding energy moves. Coordinates: 1920 x 1024. */
window.KaeriStoryGeometry = (() => {
 'use strict';
 const T=Math.PI*2, sin=Math.sin, cos=Math.cos;
 const clamp=v=>Math.max(0,Math.min(1,v)), smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const models={};
 function model(project){return {paths:[],project};}
 function path(m,pts,weight=.35,face=false){
  m.paths.push({pts:pts.map(m.project).map(([x,y])=>[310+(x-310)*1.23,y*1.23]),weight,face});
 }
 function line(m,a,b,w=.35){path(m,[a,b],w);}
 function ring(m,fn,w=.35,n=64){path(m,Array.from({length:n+1},(_,i)=>fn(i/n*T)),w);}
 function box(m,x,y,z,w,h,d){
  const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d];
  const f=[x,y+h,z],g=[x+w,y+h,z],j=[x+w,y+h,z+d],k=[x,y+h,z+d];
  for(const q of [[a,b,c,e,a],[a,b,g,f,a],[b,c,j,g,b],[e,c,j,k,e]])path(m,q,.13,true);
  for(const q of [[a,b,c,e,a],[f,g,j,k,f],[a,f],[b,g],[c,j],[e,k]])path(m,q,.85);
  for(let i=1;i<8;i++){
   let u=i/8;
   line(m,[x+w*u,y,z],[x+w*u,y,z+d],.27);
   line(m,[x,y,z+d*u],[x+w,y,z+d*u],.27);
   line(m,[x+w*u,y,z],[x+w*u,y+h,z],.3);
   line(m,[x+w,y,z+d*u],[x+w,y+h,z+d*u],.3);
  }
  for(let i=1;i<5;i++){
   let yy=y+h*i/5;
   path(m,[[x,yy,z],[x+w,yy,z],[x+w,yy,z+d]],.33);
  }
 }
 // MRI: annular gantry, open tunnel, barrel depth, projecting patient table.
 const mri=model(([x,y,z])=>[320+.94*x+.52*z, .96*y-.25*z]);
 const ringPt=(r,a,z)=>[60+r*cos(a),-35+r*sin(a),z];
 for(let z=-65;z<=115;z+=18)for(const r of [145,240])ring(mri,a=>ringPt(r,a,z),z===-65?.9:.24);
 for(let r=145;r<=240;r+=12)ring(mri,a=>ringPt(r,a,-65),r===145?.95:.45);
 for(let i=0;i<72;i++){
  const a=i/72*T,b=(i+1)/72*T;
  path(mri,[ringPt(145,a,-65),ringPt(240,a,-65),ringPt(240,b,-65),ringPt(145,b,-65)],.11,true);
  line(mri,ringPt(145,a,-65),ringPt(240,a,-65),.24);
  line(mri,ringPt(240,a,-65),ringPt(240,a,115),.3);
  line(mri,ringPt(145,a,-65),ringPt(145,a,115),.22);
 }
 box(mri,-10,79,-485,140,22,525);
 box(mri,0,70,-460,120,9,465);
 box(mri,8,106,-390,104,82,185);
 box(mri,-15,184,-420,150,20,250);
 // Display and fine panel subdivisions on gantry's upper face.
 box(mri,19,-247,-73,78,38,8);
 for(let i=0;i<6;i++)line(mri,[26,-237+i*4,-75],[86,-237+i*4,-75],.45);
 models[1]=mri;
 // Space: two latitude/longitude planets and a clearly pointed rocket.
 const space=model(([x,y,z])=>[310+x+.20*z,y-.12*z]);
 function sphere(m,x,y,z,r){
  for(let j=-5;j<=5;j++){
   const v=j*Math.PI/12,rr=r*cos(v);
   ring(m,a=>[x+rr*cos(a),y+r*sin(v),z+rr*sin(a)],.38);
  }
  for(let j=0;j<16;j++){
   const a=j/16*T;
   ring(m,v=>[x+r*cos(v)*cos(a),y+r*sin(v),z+r*cos(v)*sin(a)],.35);
  }
  ring(m,a=>[x+r*cos(a),y+r*sin(a),z],.95);
 }
 sphere(space,-225,-128,0,123);sphere(space,-270,145,0,53);
 // Rocket local axis points towards upper right; depth remains fixed.
 const rp=(u,v,z=0)=>[145+u*.8+v*.6,-32+u*.6-v*.8,z];
 for(let v=-145;v<=125;v+=18)ring(space,a=>rp(39*cos(a),v,39*sin(a)),.45,32);
 for(let j=0;j<24;j++){
  let a=j/24*T;
  path(space,[rp(39*cos(a),-145,39*sin(a)),rp(39*cos(a),125,39*sin(a)),rp(0,222,0)],.65);
 }
 for(let j=0;j<24;j++){
  let a=j/24*T,b=(j+1)/24*T;
  path(space,[rp(39*cos(a),-145,39*sin(a)),rp(39*cos(a),125,39*sin(a)),rp(39*cos(b),125,39*sin(b)),rp(39*cos(b),-145,39*sin(b))],.08,true);
 }
 // Nose silhouette, port, engine bell, swept fins.
 path(space,[rp(-39,-145),rp(-39,125),rp(0,222),rp(39,125),rp(39,-145)],1);
 ring(space,a=>rp(18*cos(a),65+18*sin(a),-41),.95);
 ring(space,a=>rp(12*cos(a),65+12*sin(a),-42),.55);
 for(const side of [-1,1]){
  path(space,[rp(side*39,-65),rp(side*88,-176),rp(side*33,-141),rp(side*39,-65)],.16,true);
  path(space,[rp(side*39,-65),rp(side*88,-176),rp(side*33,-141)],.95);
  line(space,rp(side*39,-95),rp(side*72,-161),.5);
 }
 path(space,[rp(-27,-146),rp(-35,-173),rp(35,-173),rp(27,-146)],.8);
 for(let j=0;j<12;j++){
  let pts=[];
  for(let i=0;i<=40;i++){
   let u=i/40;pts.push(rp((j-5.5)*3*(1+u)+sin(u*8+j)*5,-175-u*190,j-6));
  }path(space,pts,.18);
 }
 models[2]=space;
 // SMR: a cylindrical containment dome and surrounding isometric buildings.
 const smr=model(([x,y,z])=>[300+.82*(x-z),48+y+.39*(x+z)]);
 box(smr,-295,95,-220,590,15,440);
 for(const b of [[-265,-35,-160,120,130,100],[-260,10,-25,110,85,125],[125,-10,-160,120,105,105],[145,20,-15,120,75,150],[-135,20,125,120,75,70],[20,0,130,120,95,80]])box(smr,...b);
 const cp=(r,a,y)=>[r*cos(a),y,r*sin(a)];
 for(let y=-190;y<=90;y+=16)ring(smr,a=>cp(108,a,y),y===90?.9:.42);
 for(let i=0;i<48;i++)line(smr,cp(108,i/48*T,-190),cp(108,i/48*T,90),.38);
 for(let k=0;k<12;k++){
  let v=k/12*Math.PI/2;
  ring(smr,a=>cp(108*cos(v),a,-190-105*sin(v)),.5);
 }
 for(let j=0;j<32;j++){
  let a=j/32*T,pts=[];
  for(let k=0;k<=24;k++){let v=k/24*Math.PI/2;pts.push(cp(108*cos(v),a,-190-105*sin(v)));}
  path(smr,pts,.45);
 }
 for(let i=0;i<48;i++){
  let a=i/48*T,b=(i+1)/48*T;
  path(smr,[cp(108,a,-190),cp(108,b,-190),cp(108,b,90),cp(108,a,90)],.055,true);
 }
 for(const z of [-65,55])path(smr,[[100,50,z],[140,50,z],[140,0,z],[180,0,z]],.8);
 models[3]=smr;
 function sample(id,n){
  const m=models[id],edges=[];
  for(const p of m.paths)if(!p.face)for(let i=1;i<p.pts.length;i++)edges.push([p.pts[i-1],p.pts[i]]);
  return Array.from({length:n},(_,i)=>{
   if(i<n*.88){
    const e=edges[(i*7919)%edges.length],u=((i*618033)%100000)/100000;
    return {x:e[0][0]+(e[1][0]-e[0][0])*u,y:e[0][1]+(e[1][1]-e[0][1])*u,z:0,group:1};
   }
   const a=i*2.399963,r=325+(i%67)*1.9;
   return {x:310+cos(a)*r,y:sin(a)*r*.75,z:0,group:0};
  });
 }
 function draw(ctx,id,weight,sc,color,time){
  const m=models[id];if(!m||weight<.02)return;
  const a=smooth((weight-.2)/.8);if(a<.001)return;
  ctx.save();ctx.scale(sc,sc);
  // Mesh vertices travel outwards during dissolution; not an image crossfade.
  const spread=(1-weight)*130;
  const trace=p=>{
   ctx.beginPath();p.pts.forEach(([x,y],i)=>{
    let phase=(x+y)*.008;
    const xx=x+sin(phase)*spread,yy=y+cos(phase)*spread;
    if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);
   });
  };
  for(const p of m.paths)if(p.face){
   trace(p);ctx.closePath();ctx.fillStyle=`rgba(${color},${p.weight*a})`;ctx.fill();
  }
  for(const p of m.paths)if(!p.face){
   trace(p);ctx.lineWidth=p.weight>.8?1.45:.8;
   ctx.shadowColor=`rgb(${color})`;ctx.shadowBlur=p.weight>.8?3:0;
   ctx.strokeStyle=`rgba(${color},${Math.min(1,p.weight*1.35)*a})`;ctx.stroke();
  }
  // Living energy stays outside the legible rigid structure.
  ctx.shadowBlur=0;
  for(let j=0;j<32;j++){
   ctx.beginPath();
   for(let i=0;i<=200;i++){
    let u=i/200*T,r=405+38*sin(u*6+time*.65+j*.13)+22*cos(u*9-time*.4+j*.2)+j*1.1;
    let x=310+cos(u)*r,y=sin(u)*r*.79;
    if(id===2){
     // Curved exhaust ribbon follows the rocket rather than encircling it.
     let q=i/200;x=-80+q*690;
     y=90+150*sin(q*Math.PI)-q*300+sin(q*19+time*.8+j*.16)*(12+j*.8);
    }
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
   }
   ctx.lineWidth=.65;ctx.strokeStyle=`rgba(${color},${a*.12})`;ctx.stroke();
  }
  ctx.restore();
 }
 return {sample,draw};
})();
