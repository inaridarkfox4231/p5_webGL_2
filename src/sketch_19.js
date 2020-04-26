// 4次方程式を解くのをやってみようと思ってグラフとか
// いろいろ書いたコード。
// 作品ではないのであっちの方は消します。ごめんね。

// ・・まあ一応残しとくか。

p5.disableFriendlyErrors = true;
'use strict';
// 4次方程式のグラフを描画する。
// スライダーを動かして更新の時だけ再描画されるようにする。

// スライダーで動かすのはグリッドの縦横とグラフの式の係数。

// いけたね！！
// どうやらいけたっぽい。
// getSubの符号問題で詰んでた。大変だった・・・・

let graph;
let config;
let coeff = [];
let answerPos = [];

function setup(){
	createCanvas(640, 480);
  //coeff = [0, 0, 0, -4]; // てきとうに
	config = new FuncConfig();
	graph = new FuncGraph();
}

function draw(){
	config.update();
	graph.draw();
	config.draw();
}

function mousePressed(){
	config.controller.activate();
}

function mouseReleased(){
	let gx = config.controller.getValue("gx");
	let gy = config.controller.getValue("gy");
	coeff[0] = config.controller.getValue("c3");
	coeff[1] = config.controller.getValue("c2");
	coeff[2] = config.controller.getValue("c1");
	coeff[3] = config.controller.getValue("c0");
	answerPos = getAnswer(coeff[0], coeff[1], coeff[2], coeff[3]);
	//console.log(answerPos);
	graph.setGridSizeX(gx);
	graph.setGridSizeY(gy);
	graph.update();
	config.controller.inActivate();
}

// y = x^4 + a3x^3 + a2x^2 + a1x + a0のグラフ。
// 4つの係数をそれぞれ-10～10くらいの範囲で動かし交点とか調べる感じね。
class FuncGraph{
	constructor(){
		// グラフの本体部分。更新するのはこちら。
		this.curveBoard = createGraphics(480, 480);
		// グリッドも変更可能にする・・グラフとともに表示する。1に相当するところに。
		this.gridSize = createVector(40, 1);
		// 背景部分。色とか、あと軸とか。
		this.baseBoard = createGraphics(480, 480);
		this.prepare();
	}
	setGridSizeX(newSizeX){
		this.gridSize.x = floor(newSizeX);
	}
	setGridSizeY(newSizeY){
		this.gridSize.y = floor(newSizeY);
	}
	prepare(){
		let bb = this.baseBoard;
		bb.background(170, 250, 190);
		bb.stroke(0);
		bb.strokeWeight(2.0);
		bb.line(240, 40, 240, 480);
		bb.line(0, 240, 480, 240);
		bb.textAlign(CENTER, CENTER);
		bb.textSize(14);
		let cb = this.curveBoard;
		cb.noFill();
		this.update();
	}
	drawName(){
		// グラフの名前（y = ～～）を書く
		let bb = this.baseBoard;
		bb.fill(220);
		bb.noStroke();
		bb.rect(0, 0, 480, 40);
		bb.fill(0);
		let eq = "y=x^4";
		eq += getSign(coeff[0]) + abs(coeff[0]).toFixed(2) + "x^3";
		eq += getSign(coeff[1]) + abs(coeff[1]).toFixed(2) + "x^2";
		eq += getSign(coeff[2]) + abs(coeff[2]).toFixed(2) + "x";
		eq += getSign(coeff[3]) + abs(coeff[3]).toFixed(2);
		bb.text(eq + ", gx:" + this.gridSize.x + ", gy:" + this.gridSize.y, 240, 20);
		let cb = this.curveBoard;
		cb.stroke(0, 0, 255);
		cb.line(240 + this.gridSize.x, 240 - 5, 240 + this.gridSize.x, 240 + 5);
		cb.stroke(255, 0, 0);
		cb.line(240 - 5, 240 - this.gridSize.y, 240 + 5, 240 - this.gridSize.y);
		cb.stroke(0);
	}
	drawGraph(){
		// グラフの本体を書く。中心は(240, 240)でグリッドサイズは40でそれが1に対応する感じね。
		let cb = this.curveBoard;
		let gx = this.gridSize.x;
		let gy = this.gridSize.y;
		cb.translate(240, 240);
		cb.beginShape();
		cb.curveVertex(-260 / gx, -gy * FuncGraph.getY(-260 / gx));
		for(let i = -260; i <= 260; i++){
			let x = i / gx;
			let y = -gy * FuncGraph.getY(x); // 上下を逆に。
			cb.curveVertex(i, y);
		}
		cb.curveVertex(260 / gx, -gy * FuncGraph.getY(260 / gx));
		cb.endShape();
		for(let x of answerPos){
			let i = x * gx;
			cb.strokeWeight(4.0);
			cb.line(i, -5, i, 5);
			cb.strokeWeight(1.0);
		}
		cb.translate(-240, -240);
	}
	update(){
		// スライダーが動くたびにグラフの内容を更新する感じ。
		// clearメソッドで消してから再び描画すればOK.
		// グラフの名前もついでに。
		this.curveBoard.clear();
		this.drawName();
		this.drawGraph();
	}
	draw(){
		image(this.baseBoard, 0, 0);
		image(this.curveBoard, 0, 0);
	}
	static getY(x){
		let a3 = coeff[0];
		let a2 = coeff[1];
		let a1 = coeff[2];
		let a0 = coeff[3];
		return Math.pow(x, 4) + Math.pow(x, 3) * a3 + Math.pow(x, 2) * a2 + x * a1 + a0;
	}
}

// スライダーとか色々んとこ
class FuncConfig{
	constructor(){
		this.board = createGraphics(160, 480);
		this.prepare();
	}
	prepare(){
		this.controller = new SliderSet();
		// グリッドの横
		let csr1 = new Cursor("rect", {w:10, h:20}, 1.1, color("blue"));
		let sld1 = new LineSlider(40, 100, csr1, createVector(10, 60), createVector(150, 60));
		// グリッドの縦
		let csr2 = new Cursor("rect", {w:10, h:20}, 1.1, color("red"));
		let sld2 = new LineSlider(1, 10, csr2, createVector(10, 120), createVector(150, 120));
		// coeff[0](x^3の係数)
		let csr3 = new Cursor("rect", {w:10, h:20}, 1.1, color("black"));
		let sld3 = new LineSlider(-30, 30, csr3, createVector(10, 180), createVector(150, 180));
		// coeff[1](x^3の係数)
		let csr4 = new Cursor("rect", {w:10, h:20}, 1.1, color("black"));
		let sld4 = new LineSlider(-30, 30, csr4, createVector(10, 240), createVector(150, 240));
		// coeff[2](x^3の係数)
		let csr5 = new Cursor("rect", {w:10, h:20}, 1.1, color("black"));
		let sld5 = new LineSlider(-30, 30, csr5, createVector(10, 300), createVector(150, 300));
		// coeff[3](x^3の係数)
		let csr6 = new Cursor("rect", {w:10, h:20}, 1.1, color("black"));
		let sld6 = new LineSlider(-30, 30, csr6, createVector(10, 360), createVector(150, 360));
		this.controller.registMulti(["gx", "gy", "c3", "c2", "c1", "c0"], [sld1, sld2, sld3, sld4, sld5, sld6]);
		this.controller.initialize(480, 0);
    coeff = [-1, -11, 9, 18];
		this.controller.setValue("c3", coeff[0]);
		this.controller.setValue("c2", coeff[1]);
		this.controller.setValue("c1", coeff[2]);
		this.controller.setValue("c0", coeff[3]);
		answerPos = getAnswer();
	}
	update(){
		this.controller.update();
	}
	draw(){
		this.board.background(160);
		this.controller.draw(this.board);
		image(this.board, 480, 0);
	}
}

function getSign(c){ if(c < 0){ return "-"; }else{ return "+"; } }


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
// 4次方程式の解を求めるアルゴリズム。
// 合ってるかどうか検証する感じですね・・。

function getSub(q, r){
	// rが0とみなせるほど小さいとき。
	if(abs(r) < 0.0000001){
		if(q < 0){ return 0.0; }
		return Math.sqrt(3 * q) * 0.5;
	}
	// 以降、|r|>0とする。
	// qが0とみなせるほど小さいとき。
	if(abs(q) < 0.0000001){
		return (r < 0 ? -1 : 1) * Math.pow(0.25 * abs(r), 1 / 3);
	}
	// 以降、qもrも0でないとする。
	//console.log("r =" + r);
	//console.log("q = " + q);
	let d = r * r - q * q * q;
	let cf = Math.sqrt(abs(q));
	let h = abs(r) / Math.pow(cf, 3);
	let sig = (r < 0 ? -1 : 1);
	if(d < 0){
		let alpha = Math.acos(sig * h) / 3;
		//console.log("case0:" +" ans = " + cf * Math.cos(alpha));
		return cf * Math.cos(alpha); // ここcosの間違いだな・・
	}
	if(q > 0){
		//console.log("case1:");
		let x = (1 / 3) * Math.log(h + Math.sqrt(h * h - 1));
		// r < 0の場合はマイナスをつけて返す。
		return sig * cf * Math.cosh(x);
	}
	//console.log("case2:");
	x = (1 / 3) * Math.log(h + Math.sqrt(h * h + 1));
	// hにはabsが付いてしまっているので、符号を修正しないといけない・・・・
	// ここもうちょっとエレガントにしたいわね。
	return sig * cf * Math.sinh(x);
}

function solve4(a3, a2, a1, a0){
	let answer = [];

	// x^4 + a3x^3 + a2x^2 + a1x + a0 = 0の解を求める。
	let k0 = a0 / 4;
	let k1 = a1 / 8;
	let k2 = a2 / 4;
	let k3 = a3 / 4;

	let c2 = (2 * k2 - 3 * k3 * k3) / 3;
	let c1 = 2 * (k3 * k3 * k3 - k2 * k3 + k1);
	let c0 = (-3 * Math.pow(k3, 4) + 4 * k3 * k3 * k2 - 8 * k1 * k3 + 4 * k0) / 3;

	//console.log("c0=" + c0);
	//console.log("c1=" + c1);
	//console.log("c2=" + c2);

	if(abs(c1) < 0.0000001){
		// c1が0とみなせるなら退化として計算
		if(3 * c2 * c2 < c0){ return answer; }
		let beta = Math.sqrt(9 * c2 * c2 - 3 * c0);
		let alpha = -3 * c2;
		if(alpha + beta >= 0){
			answer.push(sqrt(alpha + beta) - k3);
			answer.push(-sqrt(alpha + beta) - k3);
		}
		if(alpha - beta >= 0){
			answer.push(sqrt(alpha - beta) - k3);
			answer.push(-sqrt(alpha - beta) - k3);
		}
		return answer;
	}
	// 以下ではc1 > 0とする。
	let q = c0 + c2 * c2;
	let r = c1 * c1 + c2 * c2 * c2 - 3 * c0 * c2;

	let w = getSub(q, r);
	//console.log("check:" + (4 * Math.pow(w, 3) - 3 * w * q - r));
	let v = w - c2;

	let j = sqrt(v);
	//console.log("j=" + j);
	//console.log("定数項=" + (3 * c2 + 2 * v + c1 / Math.sqrt(v)));
	//console.log("k3=" + k3);
	let h = c1 / j;
	let d1 = -v -3 * c2 -h;
	let d2 = -v -3 * c2 +h;
	if(d1 >= 0){
		d1 = sqrt(d1);
		//console.log("d1 = " + d1);
		answer.push(j + d1 - k3);
		answer.push(j - d1 - k3);
	}
	if(d2 >= 0){
		d2 = sqrt(d2);
		//console.log("d2 = " + d2);
		// ここミスってるよ。-jだよ・・
		answer.push(-j + d2 - k3);
		answer.push(-j - d2 - k3);
	}
	return answer;
}

function getAnswer(){
	let answer = solve4(coeff[0], coeff[1], coeff[2], coeff[3]);
	return answer;
}

function setCoeff(x1, x2, x3, x4){
	// coeff[0]～coeff[3]をx1, x2, x3, x4を根に持つモニック多項式の係数にする。
	coeff[0] = -(x1 + x2 + x3 + x4);
	coeff[1] = x1 * x2 + x1 * x3 + x1 * x4 + x2 * x3 + x2 * x4 + x3 * x4;
	coeff[2] = -(x1 * x2 * x3 + x1 * x2 * x4 + x1 * x3 * x4 + x2 * x3 * x4);
	coeff[3] = x1 * x2 * x3 * x4;
	config.controller.setValue("c3", coeff[0]);
	config.controller.setValue("c2", coeff[1]);
	config.controller.setValue("c1", coeff[2]);
	config.controller.setValue("c0", coeff[3]);
}
