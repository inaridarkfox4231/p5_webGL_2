// cloud2を落としてみる。
// 参考：https://www.shadertoy.com/view/4tdSWr

// テクスチャ画像を使った短いやつとかある → https://www.shadertoy.com/view/lsBfDz

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
// 雲関連
"const float cloudscale = 1.1;" +
"const float speed = 0.03;" +
"const float clouddark = 0.5;" +
"const float cloudlight = 0.3;" +
"const float cloudcover = 0.2;" +
"const float cloudalpha = 8.0;" +
"const float skytint = 0.5;" +
"const vec3 skycolour1 = vec3(0.2, 0.4, 0.6);" +
"const vec3 skycolour2 = vec3(0.4, 0.7, 1.0);" +
// fbm関連
"const int octaves = 7;" +
"const mat2 m = mat2(1.6,  1.2, -1.2,  1.6);" +
// ハッシュ関数。-1～1のランダムな値を2次元ベクトルに対して与える。
"vec2 hash(vec2 p){" +
"	 p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));" +
"	 return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);" +
"}" +
// ノイズ関数。pの連続関数であるようなランダム関数（のはず）
// これあれ、三角形使うやつ・・シンプレックスだね。まだ学んでないやつ。返すのは-1.0～1.0のはず。
// これはシンプレックスちゃうの・・？
"float noise(vec2 p){" +
"  const float K1 = 0.366025404;" + // (sqrt(3)-1)/2;
"  const float K2 = 0.211324865;" + // (3-sqrt(3))/6;
"	 vec2 i = floor(p + (p.x + p.y) * K1);" +
"  vec2 a = p - i + (i.x + i.y) * K2;" +
"  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);" + //vec2 of = 0.5 + 0.5 * vec2(sign(a.x - a.y), sign(a.y - a.x));" +
"  vec2 b = a - o + K2;" +
"	 vec2 c = a - 1.0 + 2.0 * K2;" +
"  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c) ), 0.0);" +
"	 vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));" +
"  return dot(n, vec3(70.0));" +
"}" +
// 非整数ブラウン運動(lacunarityの行列はそのまま使うことにして付加定数だけ変数化する感じ)
"float fbm(vec2 n, float amplitude, float diff, float gain){" +
"  float total = 0.0;" +
"  for(int i = 0; i < octaves; i++){" +
"    total += noise(n) * amplitude;" +
"    n = m * n + diff;" +
"    amplitude *= gain;" +
"  }" +
"  return total;" +
"}" +
// ridgeバージョン
"float fbm_ridge(vec2 n, float amplitude, float diff, float gain){" +
"  float total = 0.0;" +
"  for(int i = 0; i < octaves; i++){" +
"    total += abs(noise(n) * amplitude);" +
"    n = m * n + diff;" +
"    amplitude *= gain;" +
"  }" +
"  return total;" +
"}" +
// -----------------------------------------------
// メインコード
"void main(void){" +
"  vec2 p = gl_FragCoord.xy * 0.5 / u_resolution.xy;" +  // pは0～1, 0～1に落としている
"	 vec2 uv = p * vec2(u_resolution.x / u_resolution.y, 1.0);" + // uvは
"  float time = u_time * speed;" +
"  float q = fbm(uv * cloudscale * 0.5, 0.1, 0.0, 0.4);" +
//ridged noise shape
"  float r = fbm_ridge(uv * cloudscale - q + time, 0.8, time, 0.7);" +
//noise shape
"  float f = fbm(uv * cloudscale - q + time, 0.7, time, 0.6);" +
//noise colour
"  float c = fbm(uv * cloudscale * 2.0, 0.4, time * 2.0, 0.6);" +
//noise ridge colour
"  float c1 = fbm_ridge(uv * cloudscale * 3.0, 0.4, time * 3.0, 0.6);" +
// cをc + c1にする。つまりエッジ効果を付与している・・ってことかなぁ
"  c += c1;" +
// 空の色はp.y, つまり下からの高さでmixしている、要するに単なるグラデーションやね。
"  vec3 skycolour = mix(skycolour2, skycolour1, p.y);" +
// clouddarkに明るくする度合いのlightをエッジ付きノイズのcの割合でいじって係数にして白っぽいベクトルに掛けてる
"  vec3 cloudcolour = vec3(1.1, 1.1, 0.9) * clamp((clouddark + cloudlight * c), 0.0, 1.0);" +
"  f = cloudcover + cloudalpha * f * r * (f + r);" +
// 最終的にskycolourと
"  vec3 result = mix(skycolour, clamp(skytint * skycolour + cloudcolour, 0.0, 1.0), clamp(f + c, 0.0, 1.0));" +
"	 gl_FragColor = vec4( result, 1.0 );" +
"}";

let seedValue = 0.0;

function setup(){
  createCanvas(640, 480, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
  //noLoop();
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", millis() / 1000.0);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
}
