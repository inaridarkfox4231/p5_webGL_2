// From: https://www.shadertoy.com/view/ld23DV これを写経したもの。
// 何やってるのか・・分からなくはないけど、ほぼ意味不明・・んー。

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform vec2 u_mouse;" +
"uniform float u_time;" +
"uniform sampler2D rusty;" +
// iBox.
"vec4 iBox(vec3 ro, vec3 rd, mat4 txx, mat4 txi, vec3 rad){" +
// convert from ray to box space.
"  vec3 rdd = (txx * vec4(rd, 0.0)).xyz;" +
"  vec3 roo = (txx * vec4(ro, 1.0)).xyz;" +
// ray-box intersection in box space.
"  vec3 m = 1.0 / rdd;" +
"  vec3 n = m * roo;" +
"  vec3 k = abs(m) * rad;" +
"  vec3 t1 = -n - k;" +
"  vec3 t2 = -n + k;" +
"  float tN = max(max(t1.x, t1.y), t1.z);" +
"  float tF = min(min(t2.x, t2.y), t2.z);" +
"  if(tN > tF || tF < 0.0){ return vec4(-1.0); }" +
"  vec3 nor = -sign(rdd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);" +
// convert to ray space.
"  nor = (txi * vec4(nor, 0.0)).xyz;" +
"  return vec4(tN, nor);" +
"}" +
"float sBox(vec3 ro, vec3 rd, mat4 txx, vec3 rad){" +
"  vec3 rdd = (txx * vec4(rd, 0.0)).xyz;" +
"  vec3 roo = (txx * vec4(ro, 1.0)).xyz;" +
"  vec3 m = 1.0 / rdd;" +
"  vec3 n = m * roo;" +
"  vec3 k = abs(m) * rad;" +
"  vec3 t1 = -n - k;" +
"  vec3 t2 = -n + k;" +
"  float tN = max(max(t1.x, t1.y), t1.z);" +
"  float tF = min(min(t2.x, t2.y), t2.z);" +
"  if(tN > tF || tF < 0.0){ return -1.0; }" +
"  return tN;" +
"}" +
"mat4 rotationAxisAngle( vec3 v, float angle){" +
"  float s = sin( angle );" +
"  float c = cos( angle );" +
"  float ic = 1.0 - c;" +
"  return mat4( v.x * v.x * ic + c,        v.y * v.x * ic - s * v.z,  v.z * v.x * ic + s * v.y,  0.0," +
"               v.x * v.y * ic + s * v.z,  v.y * v.y * ic + c,        v.z * v.y * ic - s * v.x,  0.0," +
"               v.x * v.z * ic - s * v.y,  v.y * v.z * ic + s * v.x,  v.z * v.z * ic + c,        0.0," +
"			          0.0,                       0.0,                       0.0,                       1.0 );" +
"}" +
"mat4 translate( float x, float y, float z){" +
"  return mat4( 1.0, 0.0, 0.0, 0.0," +
"				        0.0, 1.0, 0.0, 0.0," +
"				        0.0, 0.0, 1.0, 0.0," +
"				          x,   y,   z, 1.0 );" +
"}" +
// 逆行列
"mat4 inverse(mat4 m){" +
"	 return mat4( m[0][0], m[1][0], m[2][0], 0.0," +
"               m[0][1], m[1][1], m[2][1], 0.0," +
"               m[0][2], m[1][2], m[2][2], 0.0," +
"               -dot(m[0].xyz, m[3].xyz)," +
"               -dot(m[1].xyz, m[3].xyz)," +
"               -dot(m[2].xyz, m[3].xyz)," +
"               1.0 );" +
"}" +
// メインコード
"void main(){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution) / u_resolution.y;" +
// camera movement.
"  float an = 0.4 * u_time;" +
"  vec3 ro = vec3(2.5 * cos(an), 1.0, 2.5 * sin(an));" +
"  vec3 ta = vec3(0.0, 0.8, 0.0);" +
// camera matrix.
"  vec3 ww = normalize(ta - ro);" +
"  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));" +
"  vec3 vv = normalize(cross(uu, ww));" +
// create view ray
"  vec3 rd = normalize(p.x * uu + p.y * vv + 2.0 * ww);" +
// rotate and translate box
"  mat4 rot = rotationAxisAngle(normalize(vec3(1.0, 1.0, 0.0)), u_time);" +
"  mat4 tra = translate(0.0, 1.0, 0.0);" +
"  mat4 txi = tra * rot;" +
"  mat4 txx = inverse(txi);" +
// raytrace.
"  float tmin = 10000.0;" +
"  vec3 nor = vec3(0.0);" +
"  vec3 pos = vec3(0.0);" +
// raytrace-plane.
"  float oid = 0.0;" +
"  float h = (0.0 - ro.y) / rd.y;" +
"  if(h > 0.0){" +
"    tmin = h;" +
"    nor = vec3(0.0, 1.0, 0.0);" +
"    oid = 1.0;" +
"  }" +
// raytrace-box.
"  vec3 box = vec3(0.4, 0.6, 0.8);" + // やっぱ3辺の長さなんだこれ。
"  vec4 res = iBox(ro, rd, txx, txi, box);" +
"  if(res.x > 0.0 && res.x < tmin){" +
"    tmin = res.x;" +
"    nor = res.yzw;" +
"    oid = 2.0;" +
"  }" +
// shading/lightning.
"  vec3 col = vec3(0.9);" +
"  if(tmin < 100.0){" +
"    vec3 lig = normalize(vec3(-0.8, 0.4, 0.1));" +
"    pos = ro + tmin * rd;" +
// material.
"    float occ = 1.0;" +
"    vec3 mate = vec3(1.0);" +
"    if(oid < 1.5){" + // plane
"      mate = texture2D(rusty, 0.25 * pos.xz).xyz;" +
"      occ = 0.2 + 0.8 * smoothstep(0.0, 1.5, length(pos.xz));" +
"    }else{" + // box
// recover box space data.
"      vec3 opos = (txx * vec4(pos, 1.0)).xyz;" +
"      vec3 onor = (txx * vec4(nor, 1.0)).xyz;" +
"      mate = abs(onor.x) * texture2D(rusty, 0.5 * opos.yz).xyz +" +
"             abs(onor.y) * texture2D(rusty, 0.5 * opos.zx).xyz +" +
"             abs(onor.z) * texture2D(rusty, 0.5 * opos.xy).xyz;" +
// wireframe.
"      mate *= 1.0 - (1.0 - abs(onor.x)) * smoothstep(box.x - 0.04, box.x - 0.02, abs(opos.x));" +
"      mate *= 1.0 - (1.0 - abs(onor.y)) * smoothstep(box.y - 0.04, box.y - 0.02, abs(opos.y));" +
"      mate *= 1.0 - (1.0 - abs(onor.z)) * smoothstep(box.z - 0.04, box.z - 0.02, abs(opos.z));" +
"      occ = 0.6 + 0.4 * nor.y;" +
"    }" +
"    mate = mate * mate * 1.5;" +
// lighting.
"    float dif = clamp(dot(nor, lig), 0.0, 1.0);" +
"    dif *= step(sBox(pos + 0.01 * nor, lig, txx, box), 0.0);" +
"    col = vec3(0.13, 0.17, 0.2) * occ * 3.0 + 1.5 * dif * vec3(1.0, 0.9, 0.8);" +
// material * lighting.
"    col *= mate;" +
// fog.
"    col = mix(col, vec3(0.9), 1.0 - exp(-0.003 * tmin * tmin));" +
"  }" +
"  col = sqrt(col);" +
"  gl_FragColor = vec4(col, 1.0);" +
"}";

let rusty;

let properFrameCount = 0;
const FRAME_RATE = 60;

function preload(){
  rusty = loadImage("https://inaridarkfox4231.github.io/assets/texture_Rusty.jpg");
  console.log(rusty);
}

function setup(){
  createCanvas(640, 480, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
  frameRate(FRAME_RATE);
  //noLoop();
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", properFrameCount / FRAME_RATE);
  myShader.setUniform("rusty", rusty);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
  properFrameCount++;
}

function mousePressed(){
  noLoop();
  return;
}

function mouseReleased(){
  loop();
  return;
}
