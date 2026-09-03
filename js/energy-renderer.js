/* GPU motion for flattened PNG artwork. This deforms energy, not rigid objects;
   inter-scene dissolve is NOT a 3D morph or a reconstructed hand animation. */
window.KaeriEnergy = class {
 constructor(canvas) {
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});this.cache=new Map();
  const gl=this.gl;if(!gl)return;
  const vs=`attribute vec2 a;varying vec2 v;void main(){v=(a+1.0)*.5;gl_Position=vec4(a,0.,1.);}`;
  const fs=`precision mediump float;varying vec2 v;uniform sampler2D tex;uniform vec2 viewport;uniform vec4 rect;uniform float time,opacity,motion,rigid,phase;
  void main(){vec2 p=vec2(v.x,1.-v.y)*viewport;vec2 uv=(p-rect.xy)/rect.zw;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)discard;
   vec2 q=uv-.5;float radius=length(q);float mask=mix(1.,smoothstep(.25,.49,radius),rigid);
   float amp=motion*mask;vec2 flow=vec2(sin(uv.y*14.+time*.8+phase)+.5*sin(uv.x*21.-time*.65),cos(uv.x*12.-time*.65+phase)+.5*sin(uv.y*18.+time*.7));
   vec2 sampleUV=uv+flow*amp;if(sampleUV.x<0.||sampleUV.y<0.||sampleUV.x>1.||sampleUV.y>1.)discard;
   vec4 color=texture2D(tex,sampleUV);float breathe=1.+mask*.08*sin(time*2.1-radius*15.+phase);color.rgb*=breathe;gl_FragColor=vec4(color.rgb,color.a*opacity);
  }`;
  const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
  try{this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(this.program);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  this.u={};['tex','viewport','rect','time','opacity','motion','rigid','phase'].forEach(k=>this.u[k]=gl.getUniformLocation(this.program,k));gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  }catch(e){console.warn('Energy rendering unavailable',e);this.gl=null;}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;});
 }
 resize(w,h,dpr){if(!this.gl)return;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 clear(){if(this.gl){this.gl.clearColor(0,0,0,0);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}}
 draw(img,rect,alpha,time,rigid,reduced,index){const gl=this.gl;if(!gl||!img.complete||!img.naturalWidth||alpha<.001)return;
  let tex=this.cache.get(img);if(!tex){tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);this.cache.set(img,tex);}else gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform2f(this.u.viewport,innerWidth,innerHeight);gl.uniform4f(this.u.rect,...rect);gl.uniform1f(this.u.time,time);gl.uniform1f(this.u.opacity,alpha);gl.uniform1f(this.u.motion,reduced?0:(rigid?.007:.011));gl.uniform1f(this.u.rigid,rigid?1:0);gl.uniform1f(this.u.phase,index*.7);gl.drawArrays(gl.TRIANGLES,0,6);
 }
};
