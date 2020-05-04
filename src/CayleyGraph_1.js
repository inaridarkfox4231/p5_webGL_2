// ケイリーグラフ。
// とりあえず、巡回群でやってみたい。
// 辺の長さを赤で。それでボールがまず12個、
// 群の作用で動く。+1で普通に。
// とどまってるときは灰色で動くときに赤とか青になる。3色なら緑も追加する。
// 30フレームおきに切り替える。
// 480x480にして右側のエリアでボタンを用意してそれが意味する置換で球が動くように。
// 1秒ごとの決定メソッドでどの位置に移動するかをそのボタンが決める感じね。
// 生成元は順番に赤、青、緑で、その他の3次とか4次の置換はオレンジや紫で。
// 正12角形の頂点。はい。

// 2面体群では6x2の位数12のものをやる予定だけどどうなるかわかんない。位数24でもいいかもしれない。

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
// (5.0, 0.0, 0.0)に赤い球、(0.0, 0.0, 5.0)に青い球を配置。
"  drawSphere(drawer, ori, dir, vec3(5.0, 0.0, 0.0), 0.2, vec3(1.0, 0.0, 0.0));" +
"  drawSphere(drawer, ori, dir, vec3(0.0, 0.0, 5.0), 0.2, vec3(0.0, 0.0, 1.0));" +
// 外積のテスト。オレンジと緑をぐりぐりまわしてそれらの根元に
// グレーをおき、crossに紫を配置。
"  vec3 c0 = vec3(0.0, 4.0, 0.0);" +
"  float angle = u_time * pi * 0.25;" +
// c1はz軸正方向からスタート、オレンジ
"  vec3 c1 = vec3(2.5 * sin(angle), 4.0, 2.5 * cos(angle));" +
// c2はc1をy軸中心に90°まわしたところからスタート、緑
"  vec3 c2 = vec3(2.5 * cos(angle), 4.0, -2.5 * sin(angle));" +
// c1 - c0, c2 - c0をこの順で外積すると真上を向く。つまり、
// c3は(0.0, 6.5, 0.0)になる。おっけい。
"  vec3 c3 = c0 + cross(c1 - c0, c2 - c0) / 2.5;" +
// そして当然だがdot(c3 - c0, cross(c1 - c0, c2 - c0))は正になる。
"  drawSphere(drawer, ori, dir, c0, 0.2, vec3(0.3));" +
"  drawSphere(drawer, ori, dir, c1, 0.2, getHSB(0.05, 1.0, 1.0));" +
"  drawSphere(drawer, ori, dir, c2, 0.2, getHSB(0.27, 1.0, 1.0));" +
"  drawSphere(drawer, ori, dir, c3, 0.2, getHSB(0.8, 1.0, 1.0));" +
"  if(dot(c3 - c0, cross(c1 - c0, c2 - c0)) < 0.0){ drawer.xyz = vec3(0.0); }" +
"  gl_FragColor = vec4(drawer.xyz, 1.0);" +
"}";

let myCamera;
let myCanvas;
let myConfig;
let looping = true;

function setup(){
  createCanvas(800, 640);
	myCanvas = createGraphics(480, 480, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  myCamera = new CameraModule(12.7, Math.PI * 0.25);
	myConfig = new Config();
}

function draw(){
	background(220);
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  myShader.setUniform("u_mouse", [constrain(mouseX, 0, myCanvas.width), height - constrain(mouseY, 0, myCanvas.height)]);
  myShader.setUniform("u_time", millis() / 1000);
  myCamera.update();
  myCamera.regist();
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
    this.cameraHeight = 2.0;
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
// 群の体系みたいなのを作る。とりあえず巡回群・・継承で？

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
