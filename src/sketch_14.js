// シンプレックスに出てくる変換を研究する（2次元）
// じゃあ2次元シンプレックス作ってみるか

// おいおい・・

// じゃあ3次元作ってみてよ
// できたけど煩雑だからもっと整理してよ

// >を>=にしたら変な線が消えた。やったね！
// 角ばってるなぁ・・・

// ぼかしてみる。
// ぴんとこない。
// gaussianフィルタやってみる

// やめとこ

let layer1;
let myShader1;
let properFrameCount = 0;

let vs1 =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs1 =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform vec2 u_mouse;" +
"uniform float u_time;" +
"const float pi = 3.14159;" +
"const vec2 r_vec_20 = vec2(127.1, 311.7);" +
"const vec2 r_vec_21 = vec2(269.5, 183.3);" +
"const vec2 u_10 = vec2(1.0, 0.0);" +
"const vec2 u_01 = vec2(0.0, 1.0);" +
"const vec2 u_11 = vec2(1.0, 1.0);" +
"const vec3 r_vec_30 = vec3(127.1, 311.7, 251.9);" +
"const vec3 r_vec_31 = vec3(269.5, 183.3, 314.3);" +
"const vec3 r_vec_32 = vec3(419.2, 371.9, 218.4);" +
"const vec3 u_100 = vec3(1.0, 0.0, 0.0);" +
"const vec3 u_010 = vec3(0.0, 1.0, 0.0);" +
"const vec3 u_001 = vec3(0.0, 0.0, 1.0);" +
"const vec3 u_110 = vec3(1.0, 1.0, 0.0);" +
"const vec3 u_101 = vec3(1.0, 0.0, 1.0);" +
"const vec3 u_011 = vec3(0.0, 1.0, 1.0);" +
"const vec3 u_111 = vec3(1.0, 1.0, 1.0);" +
"const float r_coeff = 43758.5453123;" +
"const int octaves = 6;" +
// 2Dランダムベクトル(-1.0～1.0)
"vec2 random2(vec2 st){" +
"  vec2 v;" +
"  v.x = sin(dot(st, r_vec_20)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_21)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" +
"}" +
// 3Dランダムベクトル(-1.0～1.0)
"vec3 random3(vec3 st){" +
"  vec3 v;" +
"  v.x = sin(dot(st, r_vec_30)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_31)) * r_coeff;" +
"  v.z = sin(dot(st, r_vec_32)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" + // -1.0～1.0に正規化
"}" +
"float snoise3(vec3 st){" +
"  vec3 p = st + (st.x + st.y + st.z) / 3.0;" +
"  vec3 f = fract(p);" +
"  vec3 i = floor(p);" +
"  vec3 g0, g1, g2, g3;" +
"  vec4 wt;" +
"  g0 = i;" +
"  g3 = i + u_111;" +
"  if(f.x >= f.y && f.x >= f.z){" +
"    g1 = i + u_100;" +
"    g2 = i + (f.y >= f.z ? u_110 : u_101);" +
"    wt = (f.y >= f.z ? vec4(1.0 - f.x, f.x - f.y, f.y - f.z, f.z) : vec4(1.0 - f.x, f.x - f.z, f.z - f.y, f.y));" +
"  }else if(f.y >= f.x && f.y >= f.z){" +
"    g1 = i + u_010;" +
"    g2 = i + (f.x >= f.z ? u_110 : u_011);" +
"    wt = (f.x >= f.z ? vec4(1.0 - f.y, f.y - f.x, f.x - f.z, f.z) : vec4(1.0 - f.y, f.y - f.z, f.z - f.x, f.x));" +
"  }else{" +
"    g1 = i + u_001;" +
"    g2 = i + (f.x >= f.y ? u_101 : u_011);" +
"    wt = (f.x >= f.y ? vec4(1.0 - f.z, f.z - f.x, f.x - f.y, f.y) : vec4(1.0 - f.z, f.z - f.y, f.y - f.x, f.x));" +
"  }" +
"  float value = 0.0;" +
"  wt = wt * wt * wt * (wt * (wt * 6.0 - 15.0) + 10.0);" +
"  value += wt.x * dot(p - g0, random3(g0));" +
"  value += wt.y * dot(p - g1, random3(g1));" +
"  value += wt.z * dot(p - g2, random3(g2));" +
"  value += wt.w * dot(p - g3, random3(g3));" +
"  return value;" +
"}" +
// fbm
"float fbm(vec3 st){" +
"  float value = 0.0;" +
"  float amplitude = 0.5;" +
"  for(int i = 0; i < octaves; i++){" +
"    value += amplitude * snoise3(st);" +
"    st *= 2.0;" +
"    amplitude *= 0.5;" +
"  }" +
"  return value;" +
"}" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
"void main(void){" +
"  vec2 st = gl_FragCoord.xy * 0.5 / min(u_resolution.x, u_resolution.y);" +
"  st *= 5.0;" +
"  st += vec2(1.6, 1.2) * u_time;" +
//"  float n = snoise3(vec3(st, u_time));" + // ノイズ計算
"  float n = fbm(vec3(st, u_time * 0.5));" + // ノイズ計算
"  float hue = mod(u_time * 0.08, 1.0) * 0.25 + 0.55;" +
"  float sat = 0.5 * n + 0.5;" +
"  sat = fract(sat * 10.0);" + // arcticで使った効果を用いる
"  gl_FragColor = vec4(getHSB(hue, sat, 1.0), 1.0);" +
"}";

let layer2;
let myShader2;

let vs2 =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs2 =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform sampler2D base;" +
"uniform float weight[10];" +
"uniform bool horizontal;" +
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy * 0.5) / min(u_resolution.x, u_resolution.y);" +
"  float grid = 1.0 / min(u_resolution.x, u_resolution.y);" +
"  vec3 destColor = texture2D(base, st.xy).rgb * weight[0];" +
"  if(horizontal){" +
"    for(int i = 1; i <= 9; i++){" +
"      destColor += texture2D(base, st.xy + vec2(float(i), 0.0) * grid).rgb * weight[i];" +
"      destColor += texture2D(base, st.xy - vec2(float(i), 0.0) * grid).rgb * weight[i];" +
"    }" +
"  }else{" +
"    for(int i = 1; i <= 9; i++){" +
"      destColor += texture2D(base, st.xy + vec2(0.0, float(i)) * grid).rgb * weight[i];" +
"      destColor += texture2D(base, st.xy - vec2(0.0, float(i)) * grid).rgb * weight[i];" +
"    }" +
"  }" +
"  gl_FragColor = vec4(destColor, 1.0);" +
"}";


function setup(){
  createCanvas(400, 400);
  layer1 = createGraphics(width, height, WEBGL);
  myShader1 = layer1.createShader(vs1, fs1);
  layer1.shader(myShader1);
  layer2 = createGraphics(width, height, WEBGL);
  myShader2 = layer2.createShader(vs2, fs2);
  layer2.shader(myShader2);
  //let weight = createGaussianArray(10);
  //myShader2.setUniform("weight", weight);
  //noLoop();
}

function draw(){
  myShader1.setUniform("u_resolution", [width, height]);
  myShader1.setUniform("u_mouse", [mouseX, mouseY]);
  myShader1.setUniform("u_time", properFrameCount / 60);
  layer1.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  //image(layer1, 0, 0);
  myShader2.setUniform("u_resolution", [width, height]);
  let value = 5 + 95 * constrain(mouseX, 0, width) / width;
  let weight = createGaussianArray(value);
  myShader2.setUniform("weight", weight);
  myShader2.setUniform("base", layer1);
  myShader2.setUniform("horizontal", true);
  layer2.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  myShader2.setUniform("base", layer2);
  myShader2.setUniform("horizontal", false);
  layer2.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  image(layer2, 0, 0);
  properFrameCount++;
}

// gaussianフィルタを作るための配列を返す関数
// 0以外は2回使うので和を取るときは注意する
function createGaussianArray(value){
  let weight = new Array(10);
  let sumOfWeight = 0.0;
  let diff = value * value / 100;
  for(let i = 0; i < weight.length; i++){
    let r = 1 + i * 2;
    let w = Math.exp(-0.5 * (r * r) / diff);
    weight[i] = w;
    if(i > 0){ w *= 2; }
    sumOfWeight += w;
  }
  for(let i = 0; i < weight.length; i++){ weight[i] /= sumOfWeight; }
  return weight;
}
