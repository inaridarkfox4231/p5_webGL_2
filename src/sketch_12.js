// 3次元のsnoise作ってみる

// 普通にfractすると整数1ごとにグリッドができる。
// これを2本の一次独立なベクトルを使ってやってみるわけ。
// 基本は(0, 1)と(1, 0)でやってるけど・・内積取って座標を算出する感じ。

// e1が(cosA, sinA), e2が(cosB, sinB)のときの内積ベクトルは簡単に
// 計算できて、それらをe1*, e2*とすると、
// e1* = (sin(B-A))^(-1) * (sinB, -cosB),
// e2* = (sin(B-A))^(-1) * (-sinA, cosA)
// になる。これを掛けることでe1とe2の係数が出る。

// 3次元ノイズやってみる

let myShader;
let properFrameCount = 0;

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
"const float pi = 3.14159;" +
"const vec3 r_vec_1 = vec3(127.1, 311.7, 251.9);" +
"const vec3 r_vec_2 = vec3(269.5, 183.3, 314.3);" +
"const vec3 r_vec_3 = vec3(419.2, 371.9, 218.4);" +
"const vec3 u_100 = vec3(1.0, 0.0, 0.0);" +
"const vec3 u_010 = vec3(0.0, 1.0, 0.0);" +
"const vec3 u_001 = vec3(0.0, 0.0, 1.0);" +
"const vec3 u_110 = vec3(1.0, 1.0, 0.0);" +
"const vec3 u_101 = vec3(1.0, 0.0, 1.0);" +
"const vec3 u_011 = vec3(0.0, 1.0, 1.0);" +
"const vec3 u_111 = vec3(1.0, 1.0, 1.0);" +
"const float r_coeff = 43758.5453123;" +
// 3Dランダムベクトル(-1.0～1.0)
"vec3 random3(vec3 st){" +
"  vec3 v;" +
"  v.x = sin(dot(st, r_vec_1)) * r_coeff;" +
"  v.y = sin(dot(st, r_vec_2)) * r_coeff;" +
"  v.z = sin(dot(st, r_vec_3)) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" + // -1.0～1.0に正規化
"}" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// e1, e2, e3は単位ベクトルで一次独立でないとね。
// とりあえず正規直交基底で取るけどあとで取り直す。
"float snoise(vec3 p){" +
"  vec3 v;" +
"  v.x = dot(p, vec3(1.0, 0.0, 0.0));" +
"  v.y = dot(p, vec3(0.0, 1.0, 0.0));" +
"  v.z = dot(p, vec3(0.0, 0.0, 1.0));" +
"  vec3 f = fract(v);" +
"  vec3 i = floor(v);" +
"  vec3 g = f * f * (3.0 - 2.0 * f);" +
"  float x000 = dot(random3(i), f);" +
"  float x100 = dot(random3(i + u_100), f - u_100);" +
"  float x010 = dot(random3(i + u_010), f - u_010);" +
"  float x110 = dot(random3(i + u_110), f - u_110);" +
"  float x001 = dot(random3(i + u_001), f - u_001);" +
"  float x101 = dot(random3(i + u_101), f - u_101);" +
"  float x011 = dot(random3(i + u_011), f - u_011);" +
"  float x111 = dot(random3(i + u_111), f - u_111);" +
"  float x00 = mix(x000, x100, g.x);" +
"  float x10 = mix(x010, x110, g.x);" +
"  float x01 = mix(x001, x101, g.x);" +
"  float x11 = mix(x011, x111, g.x);" +
"  float x0 = mix(x00, x10, g.y);" +
"  float x1 = mix(x01, x11, g.y);" +
"  return mix(x0, x1, g.z);" +
"}" +
"void main(void){" +
"  vec2 st = gl_FragCoord.xy * 0.5 / min(u_resolution.x, u_resolution.y);" +
"  st += vec2(u_time * 0.12, u_time * 0.27);" +
"  st *= 10.0;" +
// ノイズの値を計算
"  float n = snoise(vec3(st, u_time)) * 0.5 + 0.5;" +
"  n = floor(n * 10.0) * 0.1;" +
"  gl_FragColor = vec4(getHSB(0.65, n, 1.0), 1.0);" +
"}";

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
  //noLoop();
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", properFrameCount / 60);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
  properFrameCount++;
}
