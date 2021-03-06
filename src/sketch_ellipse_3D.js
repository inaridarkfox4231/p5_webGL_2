// 3D描画の際のテンプレートを作成中。実際にはいろいろ改変したりするが。

// いろいろ整えた。
// 最初の段階でマウスが中央にある時の状況になってて、
// ボタンクリックでマウスによりいじれるようになるとかしたら面白そう。
// スライダーで床の色と空の色いじれたら面白そう。

// たとえばバリエーションとしてボタンで正多面体選んで表示されるようにするとか。

// 画面の傾きやめよう。空が見えなくなるので。

// スペースキーで停止、sキーでセーブ。記述。

const SKETCH_NAME = "ellipse_3D";

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
// unit関連
"uniform float vec_x[50];" +
"uniform float vec_y[50];" +
"uniform float vec_z[50];" +
"uniform float unitHue[50];" +
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
"  mat3 m_yaw = get_yaw(yaw);" +
// m_roll, m_pitch, m_yawの順に適用される
"  return m_yaw * m_pitch * m_roll;" +
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
// ようやくメインコード
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
"  float time = u_time * 2.7;" + // 実際に使うtime.
// roll（横揺れ）、pitch（縦揺れ）、yaw（視線方向）を作る
"  float phase = time * pi * 0.5;" +
"  float roll = sin(u_time * pi * 0.5) * pi * 0.05;" +
"  float pitch = (u_mouse.y / u_resolution.y - 0.75) * pi / 6.0;" +
// oriはカメラ位置、dirはピクセルに向かうベクトルの正規化（デフォは目の前1.6の所に-1.0～1.0）
"  float depth = 1.6;" +
// 上から見た時のz, xが通常の意味でのx, yであるためにこんなことになってるけど・・
// 普通にてっぺんがzの方が分かりやすいかも。
"  vec3 ori = vec3(cameraPos.y, cameraHeight, cameraPos.x);" +
// あーー、そうか、これカメラの向きがz軸負方向をデフォとしているのか・・・んー。
// 原点方向に修正したいなぁ。するべき？
// あっちさっきいじった、あれでいいんだよ。
"  vec3 dir = normalize(vec3(st.xy, -depth));" +
// 変換行列で視界をいじってdirに補正を掛ける
"  dir = fromEuler(roll, pitch, yaw) * normalize(dir);" +
// まず背景色（床と軸と太陽）を取得。そこに上書きしていく。
"  vec3 color = getBackground(ori, dir);" +
// これ以降はcolorとtを一つ組にしたdrawerというのを用意して使い回す。
// 今までのtは第4成分となる感じ。
"  vec4 drawer = vec4(color, 1e20);" +
// 球を50個描くだけ
"  for(int i = 0; i < 50; i++){" +
"    drawSphere(drawer, ori, dir, vec3(vec_x[i], vec_y[i], vec_z[i]), 0.3, getHSB(unitHue[i], 1.0, 1.0));" +
"  }" +
"  gl_FragColor = vec4(drawer.xyz, 1.0);" +
"}";

let myCamera;
let myCanvas;
let myConfig;
let looping = true;

let vecs = [];
let units = [];
let unitHue = [];
// 2つの中心
let c1;
let c2;
let h = 4.0;
let cmiddle;
let distSum;

function setup(){
  createCanvas(800, 640);
	myCanvas = createGraphics(640, 480, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  myCamera = new CameraModule();
  myCamera.setCameraPos("axis", {x:17.05, y:16.65});
  myCamera.setDefaultCameraDirection()
	myConfig = new Config();
  preparation();
  for(let i = 0; i < 50; i++){
    units.push(new Unit());
    unitHue.push(0.35 + 0.3 * random());
  }
  c1 = createVector(-3.0, h, -6.0);
  c2 = createVector(6.0, h, 3.0);
  cmiddle = p5.Vector.add(c1, c2).mult(0.5);
  distSum = c1.dist(c2) * 2.0;
  myShader.setUniform("unitHue", unitHue);
}

function draw(){
  vecs[0] = [];
  vecs[1] = [];
  vecs[2] = [];
	background(220);
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  myShader.setUniform("u_mouse", [constrain(mouseX, 0, myCanvas.width), height - constrain(mouseY, 0, myCanvas.height)]);
  myShader.setUniform("u_time", millis() / 1000);
  myCamera.update();
  myCamera.regist();
  for(let u of units){ u.update(); }
  for(let u of units){ u.draw(); }
  myShader.setUniform("vec_x", vecs[0]);
  myShader.setUniform("vec_y", vecs[1]);
  myShader.setUniform("vec_z", vecs[2]);
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
	image(myCanvas, 0, 0);
	myConfig.update();
	myConfig.draw();
}

// ---------------------------------------------------------------------------------------- //
// camera.

// コンストラクタでカメラの位置を指定できるようにしただけ。
class CameraModule{
  constructor(){
    this.cameraPos = createVector();
    this.yaw = 0.0;
    this.cameraSpeed = 0.3;
    this.cameraHeight = 7.0;
  }
  setCameraPos(_type, param){
    switch(_type){
      case "axis":
        this.cameraPos.set(param.x, param.y);
        break;
      case "pole":
        this.cameraPos.set(param.r * cos(param.t), param.r * sin(param.t));
        break;
    }
  }
  setDefaultCameraDirection(){
    this.defaultCameraDirection = atan2(this.cameraPos.y, this.cameraPos.x);
  }
	getCameraPos(){ return this.cameraPos; }
	getCameraHeight(){ return this.cameraHeight; }
	getYaw(){ return this.yaw; }
	inCanvas(){
		// マウスがキャンバス内にあるかどうか調べるだけ
		if(mouseX < 0 || mouseY < 0){ return false; }
		if(mouseX > myCanvas.width || mouseY > myCanvas.height){ return false; }
		return true;
	}
  update(){
		// ここにデフォルト値を加えたりしてカメラが・・んー。
		// なるほど。デフォをいくら変更してもここで決まっちゃう以上どうしようもないわけだ。
		// デフォルトのyawを原点方向に修正。
		// カメラの向きのデフォルトがz軸負方向になってて、それをyawでいじる形になってるんだけど、
    this.yaw = constrain(mouseX / myCanvas.width, 0.0, 1.0) * 4.0 * Math.PI - this.defaultCameraDirection;
    if(mouseIsPressed && this.inCanvas()){
      let velocity = createVector(-cos(this.yaw), sin(this.yaw)).mult(this.cameraSpeed);
      this.cameraPos.add(velocity);
    }
    if(keyIsDown(UP_ARROW)){ this.cameraHeight += 0.1; }
    else if(keyIsDown(DOWN_ARROW)){ this.cameraHeight -= 0.1; }
    this.cameraHeight = constrain(this.cameraHeight, 2.0, 12.0);
  }
  regist(){
    myShader.setUniform("yaw", this.yaw);
    myShader.setUniform("cameraPos", [this.cameraPos.x, this.cameraPos.y]);
    myShader.setUniform("cameraHeight", this.cameraHeight);
  }
}

// ---------------------------------------------------------------------------------------- //
// unit.

class Unit{
  constructor(){
    this.pos = createVector(random() * 6.0 - 3.0, 4.0, random() * 6.0 - 3.0);
    this.setVelocity();
    this.friction = 0.03;
    this.acceleration = 0.05 + random() * 0.1;
  }
  setVelocity(){
    let initialSpeed = 0.5 + random() * 3.5;
    let initialDirection = [random() * 2.0 * Math.PI, random() * Math.PI];
    let c0 = cos(initialDirection[0]);
    let s0 = sin(initialDirection[0]);
    let c1 = cos(initialDirection[1]);
    let s1 = sin(initialDirection[1]);
    this.velocity = createVector(s1 * c0, s1 * s0, c1).mult(initialSpeed);
  }
  update(){
    // c1, c2との距離を計算して和を取る。
    // distSumより大きいならcmiddleへ向かう。逆なら離れる感じ。
    let accell = p5.Vector.sub(cmiddle, this.pos).normalize().mult(this.acceleration);
    let currentDistSum = c1.dist(this.pos) + c2.dist(this.pos);
    if(currentDistSum > distSum){
      this.velocity.add(accell);
    }else{
      this.velocity.sub(accell);
    }
    if(this.pos.y < h){
      this.velocity.y += 0.1;
    }else{
      this.velocity.y -= 0.1;
    }
    this.pos.add(this.velocity);
    this.velocity.mult(1.0 - this.friction);
  }
  draw(){
    vecs[0].push(this.pos.x);
    vecs[1].push(this.pos.y);
    vecs[2].push(this.pos.z);
  }
}

function preparation(){
  vecs.push([]);
  vecs.push([]);
  vecs.push([]);
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
		let cur1 = new Cursor("circle", {r:10}, 1.1, color("red"));
		let sld1 = new LineSlider(0.0, 1.0, cur1, createVector(300, 60), createVector(428, 60));
		let cur2 = new Cursor("circle", {r:10}, 1.1, color("green"));
		let sld2 = new LineSlider(0.0, 1.0, cur2, createVector(300, 100), createVector(428, 100));
		let cur3 = new Cursor("circle", {r:10}, 1.1, color("blue"));
		let sld3 = new LineSlider(0.0, 1.0, cur3, createVector(300, 140), createVector(428, 140));
		this.mySliderSet.registMulti(["red", "green", "blue"], [sld1, sld2, sld3]);
		this.mySliderSet.initialize(this.offSetX, this.offSetY);
		this.mySliderSet.setValueMulti(["red", "green", "blue"], [0.00, 0.63, 0.91]);
	}
	drawText(){
		let gr = this.board;
		const {x:z, y:x} = myCamera.getCameraPos();
		const y = myCamera.getCameraHeight();
		gr.text("cameraPos", 15, 30);
	  gr.text("x:" + x.toFixed(2), 15, 55);
	  gr.text("y:" + y.toFixed(2), 15, 80);
	  gr.text("z:" + z.toFixed(2), 15, 105);
	  gr.text("mouseDown:go forward.", 15, 130);
	  gr.text("up/downKey:change height.", 15, 155);
	  // この補正により、きちんとしたカメラ方向の角度になる。
	  gr.text("cameraDir:" + ((540 - floor(myCamera.getYaw() * 180 / Math.PI)) % 360) + "°", 120, 30);
		gr.text("skyColor", 300, 30);
    gr.text("freeze: space key", 460, 30);
    gr.text("image_save: s key", 460, 55);
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
  }else if(keyCode === 13){
    for(let u of units){ u.setVelocity(); }
  }
}
