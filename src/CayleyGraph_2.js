// 2面体群用のコード

const SKETCH_NAME = "template_3D";

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
// ケイリーグラフ関連。長さは16.
"uniform float vpx[16];" +
"uniform float vpy[16];" +
"uniform float vpz[16];" +
"uniform float upx[16];" +
"uniform float upy[16];" +
"uniform float upz[16];" +
"uniform vec3 unitColor;" +
// yaw廃止してカメラがぐるぐるするように変更
"uniform vec2 cameraPos;" +
"uniform float cameraHeight;" +
// 円周率
"const float pi = 3.14159;" +
// 空と光源と床。
"uniform vec3 skyColor;" + // 空の色
"const vec3 c_sun = vec3(300.0, 100.0, 300.0);" + // 太陽の位置
"const float r_sun = 20.0;" + // 太陽の半径
"const vec3 sunColor = vec3(1.0, 0.9, 0.95);" + // 太陽の色
"const vec3 floorColor = vec3(0.33, 0.89, 0.55);" + // 床の色
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 水平回転
"mat3 get_yaw(float yaw){" +
"  mat3 m_yaw;" +
"  m_yaw[0] = vec3(cos(yaw), 0.0, sin(yaw));" +
"  m_yaw[1] = vec3(0.0, 1.0, 0.0);" +
"  m_yaw[2] = vec3(-sin(yaw), 0.0, cos(yaw));" +
"  return m_yaw;" +
"}" +
// fromEulerの独自修正版。(roll, pitch)で取得する。
"mat3 fromEuler(float roll, float pitch){" +
"  vec2 a = vec2(cos(roll), sin(roll));" +
"  vec2 b = vec2(cos(pitch), sin(pitch));" +
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
// yawはとりあえず廃止。
"  return m_pitch * m_roll;" +
"}" +
// 色のライティング処理
// bltが0.0に近いほど黒っぽく、1.0に近いほど白っぽく。うまくいった。
// 引数に対象となる点pとそこにおける法線normalを加えましょうか。
// 同じこといくつも書きたくないし。
"vec3 getLighting(vec3 p, vec3 normal, vec3 mainColor){" +
"  vec3 sunRay = normalize(c_sun - p);" +
"  float blt = max(0.0, dot(normal, sunRay));" +
// bltに応じて暗くしたり明るくしたりする。
"  return mix(mainColor * blt, sunColor, 1.0 - sqrt(1.0 - blt * blt));" +
"}" +
// タイルカラー
"vec3 getTileColor(vec2 u, float hue){" +
"  vec2 i = floor(u);" +
"  vec2 f = fract(u);" +
// 座標軸を暗くする
"  vec2 dark = smoothstep(-0.08, 0.0, u) - smoothstep(0.0, 0.08, u);" +
"  vec3 color;" +
// 2種類のタイルの色
"  vec3 floorColor_pale = mix(floorColor, vec3(1.0), 0.7);" +
// 隣接タイルが違う色になるように
"  color = floorColor + mod(i.x + i.y, 2.0) * (floorColor_pale - floorColor);" +
// 軸付近では暗くなるように
"  color = mix(color, vec3(0.0), min(dark.x + dark.y, 1.0));" +
"  return color;" +
"}" +
// 空の色を取得する感じ
"vec3 getSkyColor(vec3 ori, vec3 dir){" +
"  float y = dir.y + 0.05;" +
"  vec3 sky = mix(vec3(1.0), skyColor, sqrt(y * (2.0 - y)));" +
"  float tmp = dot(dir, c_sun - ori);" +
"  float distWithSun = length(c_sun - ori - tmp * dir);" +
"  float ratio = 1.0;" +
"  if(distWithSun > r_sun){ ratio = r_sun / distWithSun; }" +
"  vec3 sun = sunColor;" +
"  return mix(sky, sun, ratio);" +
"}" +
// 背景まとめ（空と床）
"vec3 getBackground(vec3 ori, vec3 dir){" +
"  if(dir.y > -0.05){" +
"    return getSkyColor(ori, dir);" +
"  }" +
"  float t = -ori.y / dir.y;" +
"  vec2 u = ori.xz + t * dir.xz;" +
"  return getTileColor(u, 0.33);" +
"}" +
// 球。
"float getSphere(vec3 ori, vec3 dir, vec3 c, float r){" +
"  float k_a = dot(ori - c, dir);" +
"  float k_b = dot(ori - c, ori - c) - r * r;" +
"  float L = k_a * k_a - k_b;" +
"  if(L < 0.0){ return -1.0; }" +
"  L = sqrt(L);" +
"  vec2 t = vec2(max(-L - k_a, 0.0), max(L - k_a, 0.0));" +
"  if(t.x > 0.0){ return t.x; }" +
"  else if(t.y > 0.0){ return t.y; }" +
"  else{ return -1.0; }" +
"}" +
// 球の描画
"void drawSphere(out vec4 drawer, vec3 ori, vec3 dir, vec3 c, float r, vec3 bodyColor){" +
"  float t_sph = getSphere(ori, dir, c, r);" +
"  if(t_sph < 0.0 || t_sph > drawer.w){ return; }" +
"  vec3 p = ori + t_sph * dir;" +
"  vec3 n = normalize(p - c);" +
"  vec3 sphereColor = getLighting(p, n, bodyColor);" +
"  drawer = vec4(sphereColor, t_sph);" +
"}" +
// パイプ。c1～c2で半径がrとする。
"float getPipe(vec3 ori, vec3 dir, vec3 c1, vec3 c2, float r){" +
"  vec3 h = c2 - c1;" +
"  vec3 n = normalize(h);" +
"  vec3 a = ori - c1 - dot(ori - c1, n) * n;" +
"  vec3 b = dir - dot(dir, n) * n;" +
"  if(dot(b, b) < 0.00001){ return -1.0; }" +
"  float k_a = dot(a, b) / dot(b, b);" +
"  float k_b = (dot(a, a) - r * r) / dot(b, b);" +
"  float L = k_a * k_a - k_b;" +
"  if(L < 0.0){ return -1.0; }" +
"  L = sqrt(L);" +
"  vec2 t = vec2(max(-L - k_a, 0.0), max(L - k_a, 0.0));" +
"  float t_cyl;" +
"  if(t.x > 0.0){ t_cyl = t.x; }" +
"  else if(t.y > 0.0){ t_cyl = t.y; }" +
"  else{ return -1.0; }" +
"  vec3 p = ori + t_cyl * dir;" +
"  float s = dot(p - c1, n);" +
"  if(s < 0.0 || s > length(h)){ return -1.0; }" +
"  return t_cyl;" +
"}" +
// パイプの描画
// 二面体群（位数16）です。
// 0, 1, ..., 7と8, 9, ..., 15は巡回する8本ずつ赤。0-8, 1-9, 2-10, ..., 7-15を青で引く。合計24本。
"void drawPipe(out vec4 drawer, vec3 ori, vec3 dir, float r, vec3 c, vec3 e0, vec3 e1, vec3 e2){" +
"  vec3 pu[9];" + // 上側
"  vec3 pd[9];" + // 下側
"  for(int i = 0; i < 8; i++){" +
"    pu[i] = c + r * (vpx[i] * e0 + vpy[i] * e1 + vpz[i] * e2);" +
"    pd[i] = c + r * (vpx[i + 8] * e0 + vpy[i + 8] * e1 + vpz[i + 8] * e2);" +
"  }" +
"  pu[8] = pu[0];" + // ループさせておく。
"  pd[8] = pd[0];" +
"  float t = -1.0;" + // 最終的な比較対象としてのt.
"  vec3 c1, c2;" + // 確定したときに法線取るのに使う。
"  vec3 pipeColor = vec3(0.0);" + // tが0.0以上になるようならきちんとした色が付くイメージ。
"  float tmp;" +
// 先に赤い方を描く。まずは上側
"  for(int i = 0; i < 8; i++){" +
"    tmp = getPipe(ori, dir, pu[i], pu[i + 1], 0.1);" +
"    if(tmp > 0.0 && ((t < 0.0) || (tmp < t))){" +
"      t = tmp;" +
"      c1 = pu[i];" +
"      c2 = pu[i + 1];" +
"      pipeColor = vec3(1.0, 0.0, 0.0);" + // 赤
"    }" +
"  }" +
// 次に下側
"  for(int i = 0; i < 8; i++){" +
"    tmp = getPipe(ori, dir, pd[i], pd[i + 1], 0.1);" +
"    if(tmp > 0.0 && ((t < 0.0) || (tmp < t))){" +
"      t = tmp;" +
"      c1 = pd[i];" +
"      c2 = pd[i + 1];" +
"      pipeColor = vec3(1.0, 0.0, 0.0);" + // 赤
"    }" +
"  }" +
// それらをつなぐ青いパイプ
"  for(int i = 0; i < 8; i++){" +
"    tmp = getPipe(ori, dir, pu[i], pd[i], 0.1);" +
"    if(tmp > 0.0 && ((t < 0.0) || (tmp < t))){" +
"      t = tmp;" +
"      c1 = pu[i];" +
"      c2 = pd[i];" +
"      pipeColor = vec3(0.0, 0.0, 1.0);" + // 青
"    }" +
"  }" +
"  if(t < 0.0 || t > drawer.w){ return; }" +
"  vec3 q = ori + t * dir;" +
"  vec3 h = normalize(c2 - c1);" +
"  vec3 n = normalize(q - c1 - dot(q - c1, h) * h);" +
"  vec3 finalPipeColor = getLighting(q, n, pipeColor);" +
"  drawer = vec4(finalPipeColor, t);" +
"}" +
// ようやくメインコード
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
"  float time = u_time * 2.7;" + // 実際に使うtime.
// roll（横揺れ）、pitch（縦揺れ）を作る。視線方向(yaw)は原点方向で固定。
"  float phase = time * pi * 0.5;" +
"  float roll = 0.0;" +
"  float pitch = (u_mouse.y / u_resolution.y - 0.5) * pi / 12.0;" +
// oriはカメラ位置、dirはピクセルに向かうベクトルの正規化（デフォは目の前1.6の所に-1.0～1.0）
"  float depth = 1.6;" +
// 上から見た時のz, xが通常の意味でのx, yであるためにこんなことになってるけど・・
// 普通にてっぺんがzの方が分かりやすいかも。
"  vec3 ori = vec3(cameraPos.y, cameraHeight, cameraPos.x);" +
// あーー、そうか、これカメラの向きがz軸負方向をデフォとしているのか・・・んー。
// 原点方向に修正したいなぁ。よし。
"  vec3 forward = normalize(vec3(-ori.x, 0.0, -ori.z));" +
"  vec3 top = vec3(0.0, 1.0, 0.0);" +
"  vec3 side = cross(forward, top);" +
// 原点方向にdepthだけ進んでから、sideにst.x進んでtopにst.y進む。
"  vec3 dir = normalize(depth * forward + st.x * side + st.y * top);" +
// 変換行列で視界をいじってdirに補正を掛ける
"  dir = fromEuler(roll, pitch) * normalize(dir);" +
// まず背景色（床と軸と太陽）を取得。そこに上書きしていく。
"  vec3 color = getBackground(ori, dir);" +
// これ以降はcolorとtを一つ組にしたdrawerというのを用意して使い回す。
// 今までのtは第4成分となる感じ。
"  vec4 drawer = vec4(color, 1e20);" +
// ここに記述。
"  vec3 center = vec3(0.0, 6.0, 0.0);" +
// ここのe0, e1, e2は従来通りの方法で計算する（xy平面とz軸）
// なぜならupx, upy, upzがもう既にそういう並びだから。
"  float alpha = pi * 0.05;" +
"  float beta = pi * 0.05;" +
"  vec3 e1 = normalize(vec3(1.0, 4.0, 1.0));" + // てっぺん
"  vec3 e2 = vec3(1.0, 0.0, -1.0);" + // side
"  vec3 e0 = cross(e1, e2);" +
// パイプを記述する
"  float radius = 4.0;" +
"  drawPipe(drawer, ori, dir, radius, center, e0, e1, e2);" +
"  float r = 0.2;" +
"  vec3 c = vec3(0.0);" +
"  for(int i = 0; i < 16; i++){" +
"    c = center + radius * (upx[i] * e0 + upy[i] * e1 + upz[i] * e2);" +
"    drawSphere(drawer, ori, dir, c, r, unitColor);" +
"  }" +
"  gl_FragColor = vec4(drawer.xyz, 1.0);" +
"}";

let myCamera;
let myCanvas;
let myConfig;
let looping = true;

const PALETTE = [[0.3, 0.3, 0.3], [0.92, 0.1, 0.14], [0.24, 0.28, 0.8],
                 [0.3, 0.69, 0.3], [0.0, 0.63, 0.91], [1.0, 0.5, 0.15], [0.64, 0.29, 0.64]]; // 灰色、赤、青、緑、水色、オレンジ、紫、
//let cayley_cyclic; // 巡回群のケーリーグラフ。
let cayley_dihedral;

function setup(){
  createCanvas(640, 640);
	myCanvas = createGraphics(640, 480, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  myCamera = new CameraModule(12.7, Math.PI * 0.25);
	myConfig = new Config();
  let colorIndexArray = [0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
  cayley_dihedral = new CayleyGraphOfDihedralGroup(colorIndexArray, 8);
}

function draw(){
	background(220);
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  myShader.setUniform("u_mouse", [constrain(mouseX, 0, myCanvas.width), height - constrain(mouseY, 0, myCanvas.height)]);
  myShader.setUniform("u_time", millis() / 1000);
  myCamera.update();
  myCamera.regist();

  cayley_dihedral.update();
  cayley_dihedral.draw();

  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
	image(myCanvas, 0, 0);
	myConfig.update();
	myConfig.draw();
}

// ---------------------------------------------------------------------------------------- //
// camera.

// コンストラクタでカメラの位置を指定できるようにしただけ。
class CameraModule{
  constructor(radius, direction){
    this.cameraPos = createVector();
    //this.yaw = 0.0;
    this.cameraSpeed = 0.3;
    this.cameraHeight = 5.4;
    this.minRadius = 2.0;
    this.maxRadius = 100.0;
    this.minHeight = 2.0;
    this.maxHeight = 15.0;
    this.radius = radius;
    this.direction = direction;
    this.setCameraPos(radius, direction);
  }
  setCameraPos(radius, direction){
    // 半径と方向で決める感じ。
    this.cameraPos.set(radius * cos(direction), radius * sin(direction));
  }
	getCameraRadius(){ return this.radius; }
  getCameraDirection(){ return this.direction; }
	getCameraHeight(){ return this.cameraHeight; }
	//getYaw(){ return this.yaw; }
	inCanvas(){
		// マウスがキャンバス内にあるかどうか調べるだけ
		if(mouseX < 0 || mouseY < 0){ return false; }
		if(mouseX > myCanvas.width || mouseY > myCanvas.height){ return false; }
		return true;
	}
  update(){
    if(this.inCanvas()){
      // マウスの横移動でカメラがy軸を中心に回転
      this.direction = (constrain(mouseX / myCanvas.width, 0.0, 1.0) * 2.2 - 1.1 + 0.3) * Math.PI;
      if(mouseIsPressed){
        if(mouseY > myCanvas.height * 0.5){
          // 上側でのマウス押し下げによる接近
          this.radius += this.cameraSpeed;
        }else{
          // 下側でマウスを押し下げると離れる感じ。
          this.radius -= this.cameraSpeed;
        }
        // 位置更新
        this.radius = constrain(this.radius, this.minRadius, this.maxRadius);
      }
      this.setCameraPos(this.radius, this.direction);
    }
    if(keyIsDown(UP_ARROW)){ this.cameraHeight += 0.1; }
    else if(keyIsDown(DOWN_ARROW)){ this.cameraHeight -= 0.1; }
    this.cameraHeight = constrain(this.cameraHeight, this.minHeight, this.maxHeight);
  }
  regist(){
    myShader.setUniform("cameraPos", [this.cameraPos.x, this.cameraPos.y]);
    myShader.setUniform("cameraHeight", this.cameraHeight);
  }
}

// ---------------------------------------------------------------------------------------- //
// config.
// とりあえず背景色変えたいね。

class Config{
	constructor(){
		this.board = createGraphics(800, 160);
		this.board.textSize(15);
		this.setOffSet(0, 480);
		this.prepareSlider();
	}
	setOffSet(offSetX, offSetY){
		this.offSetX = offSetX;
		this.offSetY = offSetY;
	}
	prepareSlider(){
		this.mySliderSet = new SliderSet();
    // 背景色変更用スライダー
		let cur1 = new Cursor("circle", {r:10}, 1.1, color("red"));
		let sld1 = new LineSlider(0.0, 1.0, cur1, createVector(260, 60), createVector(388, 60));
		let cur2 = new Cursor("circle", {r:10}, 1.1, color("green"));
		let sld2 = new LineSlider(0.0, 1.0, cur2, createVector(260, 100), createVector(388, 100));
		let cur3 = new Cursor("circle", {r:10}, 1.1, color("blue"));
		let sld3 = new LineSlider(0.0, 1.0, cur3, createVector(260, 140), createVector(388, 140));
		this.mySliderSet.registMulti(["red", "green", "blue"], [sld1, sld2, sld3]);
		this.mySliderSet.initialize(this.offSetX, this.offSetY);
		this.mySliderSet.setValueMulti(["red", "green", "blue"], [0.00, 0.63, 0.91]);
	}
	drawText(){
		let gr = this.board;
		gr.text("cameraPos", 15, 30);
    const r = myCamera.getCameraRadius();
    const angle = floor((myCamera.getCameraDirection() + 2.0 * Math.PI) * 180 / Math.PI) % 360;
    const h = myCamera.getCameraHeight();
	  gr.text("radius:" + r.toFixed(2), 15, 55);
	  gr.text("angle:" + angle + "°", 15, 80);
	  gr.text("height:" + h.toFixed(2), 15, 105);
	  gr.text("mouseDown: close/far.", 15, 130);
	  gr.text("up/downKey: change height.", 15, 155);
	  // この補正により、きちんとしたカメラ方向の角度になる。
		gr.text("skyColor", 260, 30);
    gr.text("freeze: space key", 420, 30);
    gr.text("image_save: s key", 420, 55);
	}
	update(){
	  this.mySliderSet.update();
    let skyColor_r = this.mySliderSet.getValue("red");
		let skyColor_g = this.mySliderSet.getValue("green");
		let skyColor_b = this.mySliderSet.getValue("blue");
		myShader.setUniform("skyColor", [skyColor_r, skyColor_g, skyColor_b]);
	}
	draw(){
		this.board.background(180);
		this.drawText();
		this.mySliderSet.draw(this.board);
		image(this.board, this.offSetX, this.offSetY);
	}
}

// ---------------------------------------------------------------------------------------- //
// Group.

// 群クラスの基底
class AbstractGroup{
  constructor(){
    this.elementArray = [];
  }
  calc(elem1, elem2){ return -1; } // elementの性質に基づいて要素を決める場合もあるのでこうした方がいいかと。
  getElement(index){
    return this.elementArray[index];
  }
}

// 巡回群
class CyclicGroup extends AbstractGroup{
  constructor(n){
    super();
    this.modulo = n;
    for(let i = 0; i < n; i++){
      this.elementArray.push(new ElementOfCyclicGroup(i));
    }
  }
  calc(elem1, elem2){
    //elem2にelem1を左作用させた結果。
    const i = elem1.index;
    const j = elem2.index;
    return (i + j) % this.modulo;
  }
}

// 2面体群
// 行列で表現する。積も掛け算で。
// 1, a, a^2, ..., a^(n-1), b, ba, ba^2, ..., ba^(n-1). この順にid付ける。
// 整数使いましょう。Z/nZ ⋊ Z/2Z でいけるでしょ、マイナス1倍で。
class DihedralGroup extends AbstractGroup{
  constructor(n){
    super();
    this.modulo = n;
    for(let i = 0; i < n; i++){
      this.elementArray.push(new ElementOfDihedralGroup(i, n, true));
    }
    for(let i = 0; i < n; i++){
      this.elementArray.push(new ElementOfDihedralGroup(i, n, false));
    }
  }
  calc(elem1, elem2){
    // dataを取り出して適当に計算
    let a1 = elem1.data[0];
    let b1 = elem1.data[1];
    let a2 = elem2.data[0];
    let b2 = elem2.data[1];
    let n = this.modulo;
    let a = (a1 + (b1 === 0 ? a2 : -a2) + 2 * n) % n; // 0～n-1.
    let b = (b1 + b2) % 2;
    // ああそうかインデックスも変えないといけないのか
    let index;
    // bが0すなわち上側元の場合にはaがそのままインデックス。
    // bが1すなわち下側元の場合には0, n-1, n-2, ..., 2, 1を0, 1, 2, ..., n-2, n-1に変換する。
    // 0の場合だけnを足して、あとはnから引けば一発で出る。お疲れ様～。
    if(b === 0){
      index = a;
    }else{
      if(a === 0){ a = n; }
      index = n + (n - a);
    }
    return index;
  }
}

// 要素
class Element{
  constructor(){
    this.index = -1;
  }
}

// 巡回群の要素
class ElementOfCyclicGroup extends Element{
  constructor(i){
    super();
    this.index = i;
  }
}

// 二面体群の要素
// indexでいい。
// [a, b] x [a', b'] = [a + b(a'), b + b'] で、b(a')はbが単位元ならa'で位数2なら-a'というわけですね。
// (0, 0), (1, 0), (2, 0), ..., (n-1, 0), (0, 1), (-1, 1), (-2, 1), ..., (-(n-1), 1)が元のすべて。
// この順なので、配置には若干の工夫を要する。
class ElementOfDihedralGroup extends Element{
  constructor(i, n, flag){
    super();
    this.data = [(flag ? i : -i), (flag ? 0 : 1)]; // 要は数の組です。
    this.index = i + n * this.data[1]; // flagに応じて上と下。
  }
}

// ---------------------------------------------------------------------------------------- //
// CayleyGraph.

// 掛け算する要素と、そのときの色が決まっていて、
// その時になったら、各Unitについて左からその要素を掛ける。Unitのindexから要素を取り出してそれに掛ける形。
// そうしてindexが得られたらそこから次のUnitの位置が決まるのでそれを登録しつつindexも更新してしまい、
// かつactivateしてupdate時の挙動を変更する。properFrameCountが毎フレーム増える、spanになったら
// currentPositionをきちんとnextPositionで更新してactiveを閉じて色をデフォルトに戻す。
// activeでないためにupdateでは動かない。
// この処理は60フレームごとに行われる。spanを45とかにすれば停止時間も短くなるよね。
// とりあえず、そんなところで。
// んぁー、色はまとめて指定すればいい・・？

// ケイリーグラフ
class CayleyGraph{
  constructor(colorIndexArray){
    this.size = 1;
    this.properFrameCount = 0;
    this.span = 30;
    this.colorIndexArray = colorIndexArray;
  }
  initialize(){
    this.units = [];
    this.positionArray = [];
    this.unitColorArray = [];
    this.registPosition();
    this.registUnitColor(this.colorIndexArray);
    this.prepareUnits();
    this.setMultiplier(1); // 1と2を交互に。
    this.multiplierList = [1, 1, 1, 8]; // これを順繰りに
    this.multiplierIndex = 0;
    this.setUnitColor(0);
  }
  registPosition(){
    // indexと位置を紐付ける処理
    // 群によりおおいに異なる。
  }
  registUnitColor(colorIndexArray){
    // 掛け算する要素と色を紐付ける処理
    // unitはこの色で彩色される。赤で動かすときは赤に、緑で動かすときは緑に。
    for(let i = 0; i < this.size; i++){
      // 数3つの配列にしよう。直接setUniformで渡せるように。
      this.unitColorArray.push(PALETTE[colorIndexArray[i]]);
    }
  }
  setMultiplier(index){
    // 左から掛け算する要素
    // たとえば巡回群では生成元の作用の他に別の作用も考えようと思ってて、
    // それをボタンを使って実現したいなって。ここはその時に使うつもり。
    this.multiplier = this.group.elementArray[index];
  }
  setUnitColor(colorIndex){
    // ユニットを彩色する色を指定する. この場合は数3つの配列なのでfillには入らない、そもそもfill使って色付けないけど。
    this.unitColor = this.unitColorArray[colorIndex];
  }
  prepareUnits(){
    for(let i = 0; i < this.size; i++){
      let u = new Unit(i);
      let v = this.positionArray[i];
      u.setCurrentPosition(v);
      u.setNextPosition(v);
      this.units.push(u);
    }
  }
  preparation(){
    // unitひとつひとつに次の行先を決める感じ。
    for(let u of this.units){
      const elem = this.group.getElement(u.index); // unitに対応する群の元を取得
      const k = this.group.calc(this.multiplier, elem); // 掛け算した結果の要素のindex.
      u.setIndex(k);
      u.activate();
      u.setNextPosition(this.positionArray[k]); // 次の行先を設定。
      this.setUnitColor(this.multiplier.index);
    }
    this.switchMultiplier();
  }
  switchMultiplier(){
    this.multiplierIndex++;
    if(this.multiplierIndex === this.multiplierList.length){ this.multiplierIndex = 0; }
    this.setMultiplier(this.multiplierList[this.multiplierIndex]);
  }
  update(){
    for(let u of this.units){
      u.update();
    }
    if(!this.units[0].active){ this.setUnitColor(0); } // ここはあれ、activeでないときに色をリセットする処理。
    this.properFrameCount++;
    if(this.properFrameCount === this.span){
      this.properFrameCount = 0;
      this.preparation();
    }
  }
  draw(){
    //image(this.baseGraphic, 0, 0); // ここは柱の位置データを送るんだけど・・
    // 柱の位置と色は固定なのよね。centerとe0, e1, e2は向こうで何とかする。毎フレーム動かすかもだし。
    // だから柱のstartとendに関する情報だけ・・矢印にはしない。色についても順番を工夫して・・。
    // ああーーいいや。すべての頂点のデータ送って。そのあとテキトーに描画するから。以上！
    myShader.setUniform("vpx", this.vertexPositionX);
    myShader.setUniform("vpy", this.vertexPositionY);
    myShader.setUniform("vpz", this.vertexPositionZ);
    let upx = [];
    let upy = [];
    let upz = [];
    for(let u of this.units){
      const up = u.getPosition();
      upx.push(up.y);
      upy.push(up.z);
      upz.push(up.x);
    }
    myShader.setUniform("upx", upx);
    myShader.setUniform("upy", upy);
    myShader.setUniform("upz", upz);
    myShader.setUniform("unitColor", this.unitColor); // this.unitColorは長さ3の配列です。
    // まあそうはいっても数とか決め打ちでないといけないんだけどね・・とりあえず色々面白い12で行きます。
  }
}

// ひながたはこれで完了。
// あとは群に応じてregistPositionの中身や群の生成部分を書き換えるだけ。

// 巡回群のケイリーグラフ。
// 単純に円です。
class CayleyGraphOfCyclicGroup extends CayleyGraph{
  constructor(colorIndexArray, n){
    super(colorIndexArray);
    this.size = n;
    this.group = new CyclicGroup(n);
    this.initialize();
  }
  registPosition(){
    // indexと位置を紐付ける処理
    // 頂点の位置データ。
    this.vertexPositionX = [];
    this.vertexPositionY = [];
    this.vertexPositionZ = [];
    for(let i = 0; i < this.size; i++){
      const angle = Math.PI * i * 2.0 / this.size;
      this.positionArray.push(createVector(cos(angle), sin(angle), 0.0));
      // こっちのxyzは向こうではZXYなので注意する
      this.vertexPositionX.push(sin(angle));
      this.vertexPositionY.push(0.0);
      this.vertexPositionZ.push(cos(angle));
    }
  }
}

// 2面体群ではnに対してsizeが2nになり、要素も2n個になる。
// 0, 1, 2, ..., nの下に、nだけ足したものが真下に来るように配置する。
// data[0]の絶対値を使うことにする・・それでうまくいく。
class CayleyGraphOfDihedralGroup extends CayleyGraph{
  constructor(colorIndexArray, n){
    super(colorIndexArray);
    this.size = 2 * n;
    this.group = new DihedralGroup(n);
    this.initialize();
  }
  registPosition(){
    // indexと位置を紐付ける処理
    // 頂点の位置データ。
    this.vertexPositionX = [];
    this.vertexPositionY = [];
    this.vertexPositionZ = [];
    const n = floor(this.size * 0.5 + 0.5);
    for(let i = 0; i < 2 * n; i++){
      const angle = Math.PI * (i < n ? i : i - n) * 2 / n; // 下側は0, 1, 2, ...が並ぶようにする。
      const x = cos(angle);
      const y = sin(angle);
      const z = (i < n ? 0.5 : -0.5); // 上と下で分ける。
      this.positionArray.push(createVector(x, y, z));
      // こっちのxyzは向こうではZXYなので注意する
      this.vertexPositionX.push(y);
      this.vertexPositionY.push(z);
      this.vertexPositionZ.push(x);
    }
  }
}

// ---------------------------------------------------------------------------------------- //
// Unit. その位置に対応した群の元の情報を持っていて、左からの掛け算で別の要素の場所に移る。

// ユニット
class Unit{
  constructor(index){
    // 持っている群要素のindexで、動き始めるときに更新される。また、積を出すのに使う。
    this.index = index;
    this.position = createVector();
    this.currentPosition = createVector();
    this.nextPosition = createVector();
    this.active = false;
    this.properFrameCount = 0;
    this.span = 15;
    //this.size = 15;
  }
  activate(){
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  setIndex(newIndex){
    this.index = newIndex;
  }
  setCurrentPosition(v){
    this.currentPosition.set(v.x, v.y, v.z);
    this.position.set(v.x, v.y, v.z);
  }
  setNextPosition(v){
    this.nextPosition.set(v.x, v.y, v.z);
  }
  getPosition(){
    return this.position;
  }
  completion(){
    // 終了処理
    this.setCurrentPosition(this.nextPosition);
    this.inActivate();
    this.properFrameCount = 0;
  }
  update(){
    if(!this.active){ return; }
    // アクティブな時はcurとnextの間。
    let prg = this.properFrameCount / this.span;
    // イージング
    prg = prg * prg * (3.0 - 2.0 * prg);
    // 位置更新
    let cx = this.currentPosition.x * (1.0 - prg) + this.nextPosition.x * prg;
    let cy = this.currentPosition.y * (1.0 - prg) + this.nextPosition.y * prg;
    let cz = this.currentPosition.z * (1.0 - prg) + this.nextPosition.z * prg;
    this.position.set(cx, cy, cz);
    this.properFrameCount++;
    if(this.properFrameCount === this.span){
      this.completion();
    }
  }
  // positionの値を使って別メソッドでまとめて描画するのでここに書くことはない。
}


// ---------------------------------------------------------------------------------------- //
// Cursor and Slider.
// サイズ変更用のカーソルとスライダー。

// 使い方。
// 先にカーソルをサイズや形、色指定して生成する。
// それを元にスライダーを生成。形状はとりあえず直線が用意してある。
// mousePressedでactivateしてmouseReleasedでinActivateするだけ。
// 使う前にinitializeでカーソルの位置を調整するの忘れずに。
// 値の取得はgetValueでminとmaxの値に応じて返されるのでそれを使って何でもできる。
// 気になるなら値の取得をmouseIsPressedの間だけにすればいい。以上。

// コンフィグエリアが指定されてその上に描画することが多いと思うのでそういう前提で書いてる・・悪しからず。

// offSetX, offSetYのプロパティを追加。コンフィグエリアの位置情報がないとhitをきちんと実行できない。

// スライダー。
class Slider{
  constructor(minValue, maxValue, cursor){
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.cursor = cursor;
    this.active = false;
  }
  initialize(offSetX, offSetY){
    /* カーソルの初期位置を決める */
    // offSetX, offSetYはスライダーを置くエリアのleftとtopに当たるポイント。hitのところであれする。
    this.offSetX = offSetX;
    this.offSetY = offSetY;
  }
  activate(){
    // マウス位置がカーソルにヒットしなければactiveにしない。
    if(!this.cursor.hit(mouseX - this.offSetX, mouseY - this.offSetY)){ return; }
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  getValue(){ /* カーソルの位置と自身のレールデータから値を取り出す処理。形状による。 */ }
  update(){ /* activeであればmouseIsPressedである限りカーソルの位置を更新し続ける */ }
  draw(gr){ /* レールの形状がスライダーによるのでここには何も書けない */ }
}

// startとendは位置ベクトルで、それぞれがminとmaxに対応する。
class LineSlider extends Slider{
  constructor(minValue, maxValue, cursor, start, end){
    super(minValue, maxValue, cursor);
    this.start = start;
    this.end = end;
    this.length = p5.Vector.dist(start, end);
    this.lineWeight = 3.0;
  }
  initialize(offSetX, offSetY){
    super.initialize(offSetX, offSetY);
    // start位置におく。
    this.cursor.setPosition(this.start.x, this.start.y);
  }
  getValue(){
    // cursorのpositionのstartとendに対する相対位置の割合(prg)からvalueを割り出す。
    const prg = p5.Vector.dist(this.start, this.cursor.position) / this.length;
    return this.minValue * (1 - prg) + this.maxValue * prg;
  }
  setValue(newValue){
		// 値を直接決める（デフォルト値を設定するのに使う）
		let ratio = (newValue - this.minValue) / (this.maxValue - this.minValue);
		let cursorPos = p5.Vector.lerp(this.start, this.end, ratio);
		this.cursor.setPosition(cursorPos.x, cursorPos.y);
	}
  update(){
    if(!this.active){ return; }
    // マウス位置から垂線を下ろしてratioを割り出す。ratioはconstrainで0以上1以下に落とす。
    const mousePosition = createVector(mouseX - this.offSetX, mouseY - this.offSetY);
    let ratio = p5.Vector.dot(p5.Vector.sub(this.start, this.end), p5.Vector.sub(this.start, mousePosition)) / pow(this.length, 2);
    ratio = constrain(ratio, 0, 1);
    const newPos = p5.Vector.add(p5.Vector.mult(this.start, 1 - ratio), p5.Vector.mult(this.end, ratio));
    this.cursor.setPosition(newPos.x, newPos.y);
  }
  draw(gr){
    gr.stroke(0);
    gr.strokeWeight(this.lineWeight);
    gr.line(this.start.x, this.start.y, this.end.x, this.end.y);
    gr.noStroke();
    this.cursor.draw(gr);
  }
}
// カーソル。
class Cursor{
  constructor(type, param, marginFactor = 1.0, cursorColor = color(0)){
    this.type = type;
    this.position = createVector();
    this.param = param;
    this.marginFactor = marginFactor; // マウスダウン位置がカーソルの当たり判定からはみ出していても大丈夫なように。
    // たとえば1.1なら|x-mouseX|<(w/2)*1.1までOKとかそういうの。円形なら・・分かるよね。
    this.cursorColor = cursorColor; // カーソルの色。
    // offSetXとoffSetYは中心からgraphicの描画位置までの距離。
    switch(type){
      case "rect":
        this.offSetX = param.w * 0.5;
        this.offSetY = param.h * 0.5;
        break;
      case "circle":
        this.offSetX = param.r;
        this.offSetY = param.r;
        break;
    }
    this.graphic = this.createCursorGraphic();
  }
  createCursorGraphic(){
    // とりあえず単純に（あとできちんとやる）
    switch(this.type){
      case "rect":
        return createRectCursorGraphic(this.param.w, this.param.h, this.cursorColor);
      case "circle":
        return createCircleCursorGraphic(this.param.r, this.cursorColor);
    }
    return gr;
  }
  setPosition(x, y){
    this.position.set(x, y);
  }
  hit(x, y){
    const {x:px, y:py} = this.position;
    switch(this.type){
      case "rect":
        return abs(x - px) < this.param.w * 0.5 * this.marginFactor && abs(y - py) < this.param.h * 0.5 * this.marginFactor;
      case "circle":
        return pow(x - px, 2) + pow(y - py, 2) < pow(this.param.r * this.marginFactor, 2);
    }
  }
  draw(gr){
    gr.image(this.graphic, this.position.x - this.offSetX, this.position.y - this.offSetY);
  }
}

// RectCursorの描画用
function createRectCursorGraphic(w, h, cursorColor){
  let gr = createGraphics(w, h);
  gr.noStroke();
  const edgeSize = min(w, h) * 0.1;
  const bodyColor = cursorColor;
  gr.fill(lerpColor(bodyColor, color(255), 0.4));
  gr.rect(0, 0, w, h);
  gr.fill(lerpColor(bodyColor, color(0), 0.4));
  gr.rect(edgeSize, edgeSize, w - edgeSize, h - edgeSize);
  for(let i = 0; i < 50; i++){
    gr.fill(lerpColor(bodyColor, color(255), 0.5 * (i / 50)));
    gr.rect(edgeSize + (w/2 - edgeSize) * (i / 50), edgeSize + (h/2 - edgeSize) * (i / 50),
            (w - 2 * edgeSize) * (1 - i / 50), (h - 2 * edgeSize) * (1 - i / 50));
  }
  return gr;
}

// CircleCursorの描画用
function createCircleCursorGraphic(r, cursorColor){
  let gr = createGraphics(r * 2, r * 2);
  gr.noStroke();
  const bodyColor = cursorColor;
  for(let i = 0; i < 50; i++){
    gr.fill(lerpColor(bodyColor, color(255), 0.5 * (i / 50)));
    gr.circle(r, r, 2 * r * (1 - i / 50));
  }
  return gr;
}

// dictって走査できないから一長一短なんだけど、
// ボタンと違ってスライダーは個別性が強いからね、キーで取得した方がいいのよ。
// あほみたいな似たような記述の羅列はどうにかでき・・るんだよね。確か。
// そうです。...argsを使うとできちゃうんです・・すごいね。
class SliderSet{
  constructor(){
    this.sliderDict = {}; // キーで取得する。
    this.keyArray = []; // キー配列がないと走査が大変。
  }
  regist(_key, _slider){
    // キーの値で登録！
    this.sliderDict[_key] = _slider;
    this.keyArray.push(_key);
  }
  registMulti(keyArray, sliderArray){
    for(let i = 0; i < keyArray.length; i++){
      this.sliderDict[keyArray[i]] = sliderArray[i];
      this.keyArray.push(keyArray[i])
    }
  }
  every(methodName, args = []){
    for(let _key of this.keyArray){ this.sliderDict[_key][methodName](...args); }
  }
  initialize(offSetX, offSetY){
    this.every("initialize", [offSetX, offSetY]);
  }
  setValue(_key, value){
		// _keyでスライダーを取得してvalueの値をセットする。
		this.sliderDict[_key].setValue(value);
	}
  setValueMulti(keyArray, valueArray){
    // まとめて値を設定する感じね。
    for(let i = 0; i < keyArray.length; i++){
      this.sliderDict[keyArray[i]].setValue(valueArray[i]);
    }
  }
  activate(){
    this.every("activate");
  }
  inActivate(){
    this.every("inActivate");
  }
  getValue(_key){
    return this.sliderDict[_key].getValue();
  }
  update(){
    this.every("update");
  }
  draw(gr){
    this.every("draw", [gr]);
  }
}

// ---------------------------------------------------------------------------------------- //
// interaction.

function mousePressed(){
	myConfig.mySliderSet.activate();
}

function mouseReleased(){
	myConfig.mySliderSet.inActivate();
}

// loop.
function keyTyped(){
  if(keyCode === 32){
    // スペースキーでセーブ
    if(looping){ noLoop(); looping = false; }else{ loop(); looping = true; }
  }else if(key === 's'){
    // sキーで保存(累計秒数で分ける)
    const _second = hour() * 60 * 60 + minute() * 60 + second();
    myCanvas.save("pict_" + SKETCH_NAME + "_" + _second + ".png");
  }
}
