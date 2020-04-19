// 円盤やら円柱やら作って遊んでる

// 3次元。

// yawとカメラのxzでの位置をuniformにしてマウスダウンの時にyaw方向に
// 動くようにしようか。

// PI * 0.5だけ回転しないといけない・・なんかおかしいんかな
// あー、y座標が逆になってるとかその辺っぽい？
// まあとりあえずマウスダウンで進むようにはなったね。

// とりあえずタイルの色変えてみるか。変わった。おわり。

// 軸を真っ黒にしてタイルは青と白のセーラーカラーにする
// 最終的にサイコロ転がしたいのよ

// とりあえず三角形おいて。

// まず光源と球から。

// 初めに背景として座標平面と太陽を描画して、
// そのあとでz軸辺りに球を置きましょうね。
// と思ったのに円柱が先かよ（（
// 複数の円柱の場合はデータを送って・・
// tが出るたびに、小さくなる場合のみcolorを更新するといいよ。

// これだと上から見た時にはりぼてになってしまうので、
// 蓋が必要ですね。

// ようやく描画関数っぽくなってきたな

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
// yawとcameraPosはuniformにして操作可能に
"uniform float yaw;" +
"uniform vec2 cameraPos;" +
"uniform float cameraHeight;" +
// 円周率
"const float pi = 3.14159;" +
// 光源。
"const vec3 c_sun = vec3(300.0, 100.0, 300.0);" +
"const float r_sun = 20.0;" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// fromEulerの独自修正版。(roll, pitch, yaw)で取得する。
"mat3 fromEuler(float roll, float pitch, float yaw){" +
"  vec2 a = vec2(cos(roll), sin(roll));" +
"  vec2 b = vec2(cos(pitch), sin(pitch));" +
"  vec2 c = vec2(cos(yaw), sin(yaw));" +
// 画面の横揺れ（roll）
"  mat3 m_roll;" +
"  m_roll[0] = vec3(a.x, a.y, 0.0);" +
"  m_roll[1] = vec3(-a.y, a.x, 0.0);" +
"  m_roll[2] = vec3(0.0, 0.0, 1.0);" +
// 縦揺れ（pitch）
"  mat3 m_pitch;" +
"  m_pitch[0] = vec3(1.0, 0.0, 0.0);" +
"  m_pitch[1] = vec3(0.0, b.x, b.y);" +
"  m_pitch[2] = vec3(0.0, -b.y, b.x);" +
// 水平回転（yaw）
"  mat3 m_yaw;" +
"  m_yaw[0] = vec3(c.x, 0.0, c.y);" +
"  m_yaw[1] = vec3(0.0, 1.0, 0.0);" +
"  m_yaw[2] = vec3(-c.y, 0.0, c.x);" +
// m_roll, m_pitch, m_yawの順に適用される
"  return m_yaw * m_pitch * m_roll;" +
"}" +
// 色のライティング処理
// bltが0.0に近いほど黒っぽく、1.0に近いほど白っぽく。うまくいった。
"vec3 getLighting(float blt, vec3 mainColor){" +
"  return mix(mainColor * blt, vec3(1.0), 1.0 - sqrt(1.0 - blt * blt));" +
"}" +
// タイルカラー
"vec3 getTileColor(vec2 u){" +
"  vec2 i = floor(u);" +
"  vec2 f = fract(u);" +
// 座標軸を暗くする
"  vec2 dark = smoothstep(-0.05, 0.0, u) - smoothstep(0.0, 0.05, u);" +
"  vec3 color;" +
// 2種類のタイルの色
"  vec3 tile1 = getHSB(0.65, 0.4, 1.0);" +
"  vec3 tile2 = getHSB(0.65, 0.1, 1.0);" +
// 隣接タイルが違う色になるように
"  color = tile1 + mod(i.x + i.y, 2.0) * (tile2 - tile1);" +
// 軸付近では暗くなるように
"  color = mix(color, vec3(0.0), min(dark.x + dark.y, 1.0));" +
"  return color;" +
"}" +
"vec3 getSkyColor(vec3 ori, vec3 dir){" +
"  float y = dir.y + 0.05;" +
"  vec3 sky = getHSB(0.55, sqrt(y * (2.0 - y)), 1.0);" +
"  float tmp = dot(dir, c_sun - ori);" +
"  float distWithSun = length(c_sun - ori - tmp * dir);" +
"  float ratio = 1.0;" +
"  if(distWithSun > r_sun){ ratio = r_sun / distWithSun; }" +
"  vec3 sun = vec3(1.0, 0.9, 0.85);" +
"  return mix(sky, sun, ratio);" +
"}" +
"vec3 getBackground(vec3 ori, vec3 dir){" +
"  if(dir.y > -0.05){" +
"    return getSkyColor(ori, dir);" +
"  }" +
"  float t = -ori.y / dir.y;" +
"  vec2 u = ori.xz + t * dir.xz;" +
"  return getTileColor(u);" +
"}" +
// 円柱作りたい。
// 返すのは円柱にレイを飛ばしたときの距離
"float getPole(vec3 ori, vec3 dir, vec2 pos, float r){" +
"  vec2 a = ori.xz - pos;" + // 視点とposの射影間の距離
"  vec2 b = dir.xz;" + // 方向ベクトルの射影
"  float c_a = dot(a, b) / dot(b, b);" +
"  float c_b = (dot(a, a) - r * r) / dot(b, b);" +
"  if(c_a * c_a < c_b){ return -1.0; }" +
"  float h = sqrt(c_a * c_a - c_b);" +
"  vec2 t = vec2(max(0.0, -h - c_a), max(0.0, h - c_a));" +
"  if(t.x > 0.0){ return t.x; }" +
"  else if(t.y > 0.0){ return t.y; }" +
"  else{ return -1.0; }" +
"}" +
// poleの色を付ける。
"vec3 getPoleColor(vec3 p, vec2 pos, vec3 bodyColor){" +
"  vec3 n = vec3(p.x - pos.x, 0.0, p.z - pos.y);" +
"  n = normalize(n);" +
"  vec3 sunRay = normalize(c_sun - p);" +
"  float blt = max(0.0, dot(n, sunRay));" +
// bltに応じて暗くしたり明るくしたりする。
"  return getLighting(blt, bodyColor);" +
"}" +
// 円柱の場合の関数
// 返るのはvec4で、入力のcolorとtは、
// 条件を満たさなければそのまま返る。
// 満たすなら改変されたcolorとtが返る感じですかね。
// pos以降は円柱のパラメータなので構造体とかにできたらいいけどね。
// pos:円柱の中心座標。r:半径。height:下端と上端のy座標。
// 色は光を考慮して計算。
"void drawPole(out vec4 drawer, vec3 ori, vec3 dir, vec2 pos, float r, vec2 height, vec3 bodyColor){" +
// まずtを計算して-1.0ならそこで終わり
"  float t_pole = getPole(ori, dir, pos, r);" +
"  if(t_pole < 0.0 || t_pole > drawer.w){ return; }" +
"  vec3 p = ori + t_pole * dir;" +
"  if(p.y < height.x || p.y > height.y){ return; }" +
"  vec3 poleColor = getPoleColor(p, pos, bodyColor);" +
"  drawer = vec4(poleColor, t_pole);" +
"}" +
"float getDisc(vec3 ori, vec3 dir, vec3 c, float r, vec3 n){" +
"  float tmp = dot(dir, n);" +
"  if(abs(tmp) < 0.00001){ return -1.0; }" +
"  float t = dot(c - ori, n) / tmp;" +
"  if(t < 0.0){ return -1.0; }" +
"  if(length(ori + t * dir - c) > r){ return -1.0; }" +
"  return t;" +
"}" +
"vec3 getDiscColor(vec3 p, vec3 ori, vec3 n, vec3 bodyColor){" +
"  if(dot(ori - p, n) < 0.0){ n = -n; }" +
"  vec3 sunRay = normalize(c_sun - p);" +
"  float blt = max(0.0, dot(n, sunRay));" +
// bltに応じて暗くしたり明るくしたりする。
"  return getLighting(blt, bodyColor);" +
"}" +
// 円盤
// color, tが入力で、ori, dirまでいつもの。
// cが中心、rが半径、nが法線、bodyColorが色。
"void drawDisc(out vec4 drawer, vec3 ori, vec3 dir, vec3 c, float r, vec3 n, vec3 bodyColor){" +
"  float t_disc = getDisc(ori, dir, c, r, n);" +
"  if(t_disc < 0.0 || t_disc > drawer.w){ return; }" +
"  vec3 p = ori + t_disc * dir;" +
"  vec3 discColor = getDiscColor(p, ori, n, bodyColor);" +
"  drawer = vec4(discColor, t_disc);" +
"}" +
// ようやくメインコード
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
"  float time = u_time * 2.7;" + // 実際に使うtime.
// roll（横揺れ）、pitch（縦揺れ）、yaw（視線方向）を作る
"  float phase = time * pi * 0.5;" +
"  float roll = sin(u_time * pi * 0.5) * pi * 0.05;" +
"  float pitch = (u_mouse.y / u_resolution.y - 0.75) * pi / 1.5;" +
// oriはカメラ位置、dirはピクセルに向かうベクトルの正規化（デフォは目の前1.6の所に-1.0～1.0）
"  float depth = 1.6;" +
"  vec3 ori = vec3(cameraPos.x, cameraHeight, cameraPos.y);" +
"  vec3 dir = normalize(vec3(st.xy, -depth));" +
// 変換行列で視界をいじってdirに補正を掛ける
"  dir = fromEuler(roll, pitch, yaw) * normalize(dir);" +
// まず背景色（床と軸と太陽）を取得。そこに上書きしていく。
"  vec3 color = getBackground(ori, dir);" +
// これ以降はcolorとtを一つ組にしたdrawerというのを用意して使い回す。
// 今までのtは第4成分となる感じ。
"  vec4 drawer = vec4(color, 99999.9);" +
"  vec2 pos; float angle; float h; vec3 bodyColor;" +
"  for(float i = 0.0; i < 1.0; i += 0.1){" +
"    angle = pi * u_time * 0.5 + pi * 2.0 * i;" +
"    pos = vec2(cos(angle), sin(angle)) * 7.5;" +
"    h = 3.0 + sin(angle * 2.0);" +
"    bodyColor = getHSB(i, 1.0, 0.8);" +
//"    drawer = drawPole(drawer, ori, dir, pos, 0.5, vec2(0.0, h), bodyColor);" +
"    drawPole(drawer, ori, dir, pos, 0.5, vec2(0.0, h), bodyColor);" +
"  }" +
//"  drawer = drawPole(drawer, ori, dir, vec2(0.0), 0.5, vec2(0.0, 3.0), vec3(0.5));" +
"  drawPole(drawer, ori, dir, vec2(0.0), 0.5, vec2(0.0, 3.0), vec3(0.5));" +
"  drawDisc(drawer, ori, dir, vec3(0.0, 6.0, 0.0), 1.0, vec3(cos(u_time * pi * 2.0), 0.0, sin(u_time * pi * 2.0)), vec3(1.0, 0.0, 0.0));" +
"  gl_FragColor = vec4(drawer.xyz, 1.0);" +
"}";

let myCamera;
let looping = true;

function setup(){
  createCanvas(640, 360, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
  myCamera = new CameraModule();
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [constrain(mouseX, 0, width), height - constrain(mouseY, 0, height)]);
  myShader.setUniform("u_time", millis() / 1000);
  myCamera.update();
  myCamera.regist();
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
}

class CameraModule{
  constructor(){
    this.cameraPos = createVector(6.0, 6.0);
    this.yaw = 0.0;
    this.cameraSpeed = 0.3;
    this.cameraHeight = 2.0;
  }
  update(){
    this.yaw = constrain(mouseX / width, 0.0, 1.0) * 4.0 * Math.PI;
    if(mouseIsPressed){
      let velocity = createVector(sin(this.yaw), -cos(this.yaw)).mult(this.cameraSpeed);
      this.cameraPos.add(velocity);
    }
    if(keyIsDown(UP_ARROW)){ this.cameraHeight += 0.1; }
    else if(keyIsDown(DOWN_ARROW)){ this.cameraHeight -= 0.1; }
    this.cameraHeight = constrain(this.cameraHeight, 2.0, 8.0);
  }
  regist(){
    myShader.setUniform("yaw", this.yaw);
    myShader.setUniform("cameraPos", [this.cameraPos.x, this.cameraPos.y]);
    myShader.setUniform("cameraHeight", this.cameraHeight);
  }
}

// loop.
function keyTyped(){
  if(keyCode === 32){
  if(looping){ noLoop(); looping = false; }else{ loop(); looping = true; }
  }
}
