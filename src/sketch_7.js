// 簡単な球のレイマーチングでも。

// 復習。まず球の距離関数。次に光のさす方向の逆ベクトル。次に・・法線の取得だっけ。で？

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}"

let fs =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
"uniform vec2 u_mouse;" +
"uniform float u_time;" +
// 法線関連
"const float delta = 0.001;" +
"vec3 dx = vec3(delta, 0.0, 0.0);" +
"vec3 dy = vec3(0.0, delta, 0.0);" +
"vec3 dz = vec3(0.0, 0.0, delta);" +
// しきい値などの定数
"const float threshold = 0.001;" +
"const float pi = 3.14159;" +
// 光源(平行光源)
"const vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 球の距離関数
"float distWithSphere(vec3 p, vec3 c, float size){" +
"  return length(p - c) - size;" +
"}" +
// 法線取得
"vec3 getNormalOfSphere(vec3 p, vec3 c, float size){" +
"  float nx = distWithSphere(p + dx, c, size) - distWithSphere(p - dx, c, size);" +
"  float ny = distWithSphere(p + dy, c, size) - distWithSphere(p - dy, c, size);" +
"  float nz = distWithSphere(p + dz, c, size) - distWithSphere(p - dz, c, size);" +
"  return normalize(vec3(nx, ny, nz));" +
"}" +
"void main(){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
// 球情報
"  float size = 1.0;" +
"  vec3 center = vec3(0.0, 0.0, 0.0);" +
// カメラとレイ
"  vec3 c_pos = vec3(0.0, 0.0, 3.0);" +
"  vec3 c_dir = vec3(0.0, 0.0, -1.0);" +
"  vec3 c_up = vec3(0.0, 1.0, 0.0);" +
"  vec3 c_side = cross(c_dir, c_up);" +
"  float depth = 1.0;" +
"  vec3 ray = normalize(c_side * p.x + c_up * p.y + c_dir * depth);" +
"  vec3 cur = c_pos;" + // c_posからray方向にレイを飛ばす。
// マーチングループ。とりあえず32回。
"  float d = distWithSphere(cur, center, size);" +
"  for(float i = 0.0; i < 32.0; i += 1.0){" +
"    cur += d * ray;" +
"    d = distWithSphere(cur, center, size);" +
"    if(d < threshold){ break; }" +
"  }" +
"  if(d < threshold){" +
"    vec3 n = getNormalOfSphere(cur, center, size);" +
"    vec3 col = getHSB(0.55, 1.0, dot(lightDir, n) + 0.2);" +
"    gl_FragColor = vec4(col, 1.0);" +
"  }else{" +
"    gl_FragColor = vec4(vec3(0.0), 1.0);" +
"  }" +
"}"

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
}

function draw(){
  clear();
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", millis() / 1000);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
}
