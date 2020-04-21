// スライダーやります。
// カーソルも一緒・・めんどくさいのよね。こっちはセット化してないんだけど、
// 個別性が強いというか、まあまとめる意味があんまなくて。
// ボタンだったらどれが選択されてるかとか相互に影響を及ぼしあうけれど、
// スライダーってそれぞれの役割が基本独立してるからなぁ。そのせいかもね。

// あとテキスト機能はついてないです・・表示場所とかめんどくさいので。
// 最大値、最小値、現在の値なんかは適宜個別に値取得して用意することになるわね・・それか、用意しないか。
// toFixed()とか使わないといけないし結構めんどくさいんだよ。そこら辺は。
// 整数にするだけでもかなり・・ね。

// 1.カーソルを作る。type, param, marginFactor, color.
// typeの"rect"か"circle"かていうのは形ね。rectなら{w:40, h:20}みたいに、circleなら{r:10}とか。rは半径。
// marginFactorのデフォは1.0で要するにたとえばこれが1.2なら当たり判定は横幅縦幅1.2倍ですよとかそういうやつ。
// 表示図形ギリギリだと小さい時に動かしづらいからそういうこと。
// colorは好きに。
// 2.スライダーを作る。さっきのカーソルを使って・・まあLineSliderしかないんでこれで。
// minValue, maxValue, カーソル、start, end, このふたつはベクトルでminとmaxに相当する。
// 3.boardの左上座標でinitializeしましょう。
// 4.マウスダウンでactivate, マウスアップでinActivate.
// 5.アップデートは毎フレーム、ただしactiveでないときはやらない。
// 6.値の取得はsliderから直接getValue()で。以上。

// infoはほんとに入ってないので・・ご了承。

// 余談・・p5にはcursor()というメソッドとcreateSlider()というメソッドがあってね・・競合しそうになって大変だった。

// まあやること多いからまとめたいなぁ。けどなぁ。

// できました。動くことは、動く。
// まあこの値を使って何をするかなのよね。

// やっぱset欲しいなぁ。先に登録しておいて、initializeとactivateとinActivateとdrawとupdateはまとめてやりたいかな。
// あと値の取得はキーを指定して直接得られるようにしたいかな。たとえば、"red"を登録しておくと、
// "red"で取得できる、とか。それ確か以前のスライダー作成企画ではやってたんだけどね・・shootが結構入り組んでて、
// そこまで手を付けられなかったっていうことかも。あとあれひとつかふたつしかスライダーなかったしなー、でも基本複数なのよね。

// まあこんなもんで。これ以上は無意味でしょう。
// まああれ、スライダーセットの方のリファクタリングまでやるかって感じだけど・・こういうのは応用効くしな。

let checkboard;
let board;
let slider1;
let slider2;
let slider3;

let mySliderSet;

function setup(){
  createCanvas(640, 360);
  checkboard = createGraphics(480, 180);
  board = createGraphics(320, 180);
  let cursor1 = new Cursor("rect", {w:30, h:15}, 1.1, color("red"));
  slider1 = new LineSlider(0, 255, cursor1, createVector(80, 20), createVector(80, 120));

  let cursor2 = new Cursor("circle", {r:15}, 1.1, color("green"));
  slider2 = new LineSlider(0, 255, cursor2, createVector(140, 20), createVector(240, 20));

  let cursor3 = new Cursor("circle", {r:15}, 1.1, color("blue"));
  slider3 = new LineSlider(0, 255, cursor3, createVector(120, 80), createVector(280, 160));

  mySliderSet = new SliderSet();
  mySliderSet.registMulti(["red", "green", "blue"], [slider1, slider2, slider3]);
  mySliderSet.initialize(320, 180);
}

function draw(){
  background(220);
  checkboard.background(160);
  checkboard.fill(0);
  checkboard.textSize(20);

  let v1 = mySliderSet.getValue("red");
  checkboard.text("スライダー1番の値は" + v1.toFixed(2) + "です。", 20, 20);

  let v2 = mySliderSet.getValue("green");
  checkboard.text("スライダー2番の値は" + v2.toFixed(2) + "です。", 20, 60);

  let v3 = mySliderSet.getValue("blue");
  checkboard.text("スライダー3番の値は" + v3.toFixed(2) + "です。", 20, 100);

  checkboard.fill(floor(v1), floor(v2), floor(v3)); // 一応整数値渡してね
  checkboard.rect(400, 100, 80, 80);

  image(checkboard, 0, 0);
  board.background(160);

  mySliderSet.update();
  mySliderSet.draw(board);
  image(board, 320, 180);
}

function mousePressed(){
  mySliderSet.activate();
}

function mouseReleased(){
  mySliderSet.inActivate();
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
