// gradient noiseを使って作ってみた
// arcticという作品

// gradient noiseを使って非整数ブラウン運動作ってみる
// すげぇ雲みたい

let myShader;

let seed;
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
"uniform vec2 u_seed;" +
"const float pi = 3.14159;" +
"const vec2 r_vector = vec2(12.9898, 78.233);" +
"const float r_coeff = 43758.5453123;" +
"const int octaves = 6;" +
// 2Dランダムベクトル(-1.0～1.0)
"vec2 random2(vec2 st){" +
"  vec2 v = vec2(0.0);" +
"  v.x = sin(dot(st, vec2(127.1, 311.7))) * r_coeff;" +
"  v.y = sin(dot(st, vec2(269.5, 183.3))) * r_coeff;" +
"  return -1.0 + 2.0 * fract(v);" + // -1.0～1.0に正規化
"}" +
// gradient noise. (-1.0～1.0)
// 各頂点からのベクトルを各頂点におけるベクトルに掛けて内積を作る。
"float dnoise(vec2 p){" +
"  vec2 i = floor(p);" +
"  vec2 f = fract(p);" +
"  vec2 u = f * f * (3.0 - 2.0 * f);" +
"  vec2 p_00 = vec2(0.0, 0.0);" +
"  vec2 p_01 = vec2(0.0, 1.0);" +
"  vec2 p_10 = vec2(1.0, 0.0);" +
"  vec2 p_11 = vec2(1.0, 1.0);" +
"  float value_00 = dot(random2(i + p_00), f - p_00);" +
"  float value_01 = dot(random2(i + p_01), f - p_01);" +
"  float value_10 = dot(random2(i + p_10), f - p_10);" +
"  float value_11 = dot(random2(i + p_11), f - p_11);" +
"  return mix(mix(value_00, value_10, u.x), mix(value_01, value_11, u.x), u.y);" +
"}" +
// fbmやってみる
"float fbm(vec2 st){" +
"  float value = 0.0;" +
"  float amplitude = 0.5;" +
"  for(int i = 0; i < octaves; i++){" +
"    value += amplitude * dnoise(st);" +
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
"  st += vec2(u_time * 0.3, u_time * 0.5) + u_seed;" +
"  st *= 2.0 + 4.0 * clamp(u_mouse.x / u_resolution.x, 0.0, 1.0);" +
// fbmにより-1.0～1.0の値を出してから0.0～1.0に正規化
"  float bl = fbm(st) * 0.5+ 0.5;" +
"  bl = bl * bl * (3.0 - 2.0 * bl);" +
// 0.5以下の部分は0.1刻みで周期的に、それ以上の部分は白くする感じ
"  if(bl < 0.5){ bl = mod(bl, 0.1) * 10.0; }else{ bl = mod(bl, 0.5) * 2.0; }" +
"  float hue = 0.55 + 0.1 * clamp(u_mouse.y / u_resolution.y, 0.0, 1.0);" +
"  gl_FragColor = vec4(getHSB(hue, bl, 1.0), 1.0);" +
"}";

function setup(){
  createCanvas(600, 600, WEBGL);
  angleMode(DEGREES);
  myShader = createShader(vs, fs);
  shader(myShader);
  //noLoop();
  seed = [random() * 16, random() * 16];
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", properFrameCount / 60);
  myShader.setUniform("u_seed", seed);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
	properFrameCount++;
}

function mousePressed(){
	noLoop();
}

function mouseReleased(){
	loop();
}

function keyTyped(){
	if(key !== 's'){ return; }
  let dt = new Date();
	let timeData = [];
	timeData.push(dt.getFullYear());
	timeData.push(dt.getMonth() + 1);
	timeData.push(dt.getDate());
	timeData.push(dt.getHours());
	timeData.push(dt.getMinutes());
	timeData.push(dt.getSeconds());
	let timeString = [];
	for(let data of timeData){
		timeString.push(data < 10 ? "0" + data.toString() : data.toString());
	}
	let timeStr = timeString.reduce((a, b) => { return a + b; });
	save("arctic_" + timeStr + ".jpg");
}
