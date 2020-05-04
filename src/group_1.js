p5.DisableFriendlyErrors = true;
"use strict";

// とりあえず巡回群のケイリーグラフ。
// いい感じですね～～～いい感じです。いい感じ！（しつこい）
// これはまだ序の口・・とりあえず2面体群やりたいなっと。

// って進んでいきたいのはやまやま、谷谷なんだけれど、とりあえず3Dに落としたいのよね・・
// 描画部分以外は一緒よね。

// baseGraphicのとこで代わりに柱を描画するための位置データを送る。色については向こうで何とかする。
// drawでcircleを描く代わりにsetUniformでその時にsphereを描画する色を送ればいいよね。vec3形式で。

const PALETTE = ["#666", "#F00", "#00F"]; // 灰色、赤、青
let cayley_cyclic;

// 群。

function setup(){
  createCanvas(400, 400);
  noStroke();
  let colorIndexArray = [0, 1, 2, 2, 2, 2, 2];
  cayley_cyclic = new CayleyGraphOfCyclicGroup(7, colorIndexArray, 200, 200, 100);
}

function draw(){
  background(220);
  cayley_cyclic.update();
  cayley_cyclic.draw();
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

// 2面体群やりたいけど慎重になりましょうね
class DihedralGroup extends AbstractGroup{
  constructor(n){
    super();
    this.modulo = n;
    for(let i = 0; i < n; i++){
      // ..... //
    }
    for(let i = 0; i < n; i++){
      // ..... //
    }
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

// ---------------------------------------------------------------------------------------- //
// CayleyGraph.

// ケイリーグラフ
class CayleyGraph{
  constructor(){
    this.group = undefined;
    this.multiplier = undefined;
    this.unitColor = undefined;
    this.baseGraphic = createGraphics(width, height); // 線とかいろいろ。この辺は3Dではあっちで描画することになるかな・・
    // startIndexの列とendIndexの列とあと色ですかね・・その辺。
  }
  createBaseGraphic(){}
  update(){}
  draw(){}
}

// 掛け算する要素と、そのときの色が決まっていて、
// その時になったら、各Unitについて左からその要素を掛ける。Unitのindexから要素を取り出してそれに掛ける形。
// そうしてindexが得られたらそこから次のUnitの位置が決まるのでそれを登録しつつindexも更新してしまい、
// かつactivateしてupdate時の挙動を変更する。properFrameCountが毎フレーム増える、spanになったら
// currentPositionをきちんとnextPositionで更新してactiveを閉じて色をデフォルトに戻す。
// activeでないためにupdateでは動かない。
// この処理は60フレームごとに行われる。spanを45とかにすれば停止時間も短くなるよね。
// とりあえず、そんなところで。
// んぁー、色はまとめて指定すればいい・・？

// 巡回群のケイリーグラフ
class CayleyGraphOfCyclicGroup extends CayleyGraph{
  constructor(n, colorIndexArray, cx, cy, radius){
    super();
    this.modulo = n;
    this.group = new CyclicGroup(n);
    this.units = [];
    this.positionArray = [];
    this.unitColorArray = [];
    this.center = createVector(cx, cy);
    this.radius = radius;
    this.registPosition();
    this.registUnitColor(colorIndexArray);
    this.prepareUnits();
    this.setMultiplier(1);
    this.setUnitColor(0);
    this.createBaseGraphic(); // 骨組みを作って毎フレーム描画しその上にunitを乗せる感じ。辺の色を彩色する。矢印も。
    this.properFrameCount = 0;
    this.span = 60;
  }
  createBaseGraphic(){
    // 骨組みを作る。矢印が、欲しい。
    let gr = this.baseGraphic;
    const n = this.modulo;
    // 与えられた2点に対して一方からもう一方へ向かう矢印を書きたいの。
    // 角度は30°で長さだけ指定したい。
    gr.strokeWeight(2.0);
    gr.stroke(color(PALETTE[1]));
    for(let i = 0; i < n; i++){
      drawArrow(gr, this.positionArray[i], this.positionArray[(i + 1) % n], 20);
    }
  }
  setMultiplier(index){
    // 左から掛け算する要素
    this.multiplier = this.group.elementArray[index];
  }
  setUnitColor(colorIndex){
    this.unitColor = this.unitColorArray[colorIndex];
  }
  registPosition(){
    // indexと位置を紐付ける処理
    const n = this.modulo;
    for(let i = 0; i < n; i++){
      const angle = Math.PI * i * 2.0 / n;
      this.positionArray.push(createVector(this.center.x + this.radius * cos(angle), this.center.y + this.radius * sin(angle)));
    }
  }
  registUnitColor(colorIndexArray){
    // 掛け算する要素と色を紐付ける処理
    // unitはこの色で彩色される。
    const n = this.modulo;
    for(let i = 0; i < n; i++){
      this.unitColorArray.push(color(PALETTE[colorIndexArray[i]]));
    }
  }
  prepareUnits(){
    const n = this.modulo;
    for(let i = 0; i < n; i++){
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
      const elem = this.group.getElement(u.index);
      const k = this.group.calc(this.multiplier, elem); // 掛け算した結果の要素のindex.
      u.setIndex(k);
      u.activate();
      u.setNextPosition(this.positionArray[k]); // 次の行先を設定。
      this.setUnitColor(this.multiplier.index);
    }
  }
  update(){
    for(let u of this.units){
      u.update();
    }
    if(!this.units[0].active){ this.setUnitColor(0); }
    this.properFrameCount++;
    if(this.properFrameCount === this.span){
      this.properFrameCount = 0;
      this.preparation();
    }
  }
  draw(){
    image(this.baseGraphic, 0, 0); // ここは柱の位置データを送るんだけど・・
    // 柱の位置と色は固定なのよね。centerとe0, e1, e2は向こうで何とかする。毎フレーム動かすかもだし。
    // だから柱のstartとendに関する情報だけ・・矢印にはしない。色についても順番を工夫して・・。
    fill(this.unitColor); // ここをsetUniformの・・PALETTEは全部配列にしないと駄目かな・・むぅ。
    for(let u of this.units){
      u.draw(); // ここも位置データを3分割してsetUniformで送る。
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
    this.currentPosition = createVector();
    this.nextPosition = createVector();
    this.active = false;
    this.properFrameCount = 0;
    this.span = 30;
    this.size = 15;
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
    this.currentPosition.set(v.x, v.y);
  }
  setNextPosition(v){
    this.nextPosition.set(v.x, v.y);
  }
  completion(){
    // 終了処理
    this.setCurrentPosition(this.nextPosition);
    this.inActivate();
    this.properFrameCount = 0;
  }
  update(){
    if(!this.active){ return; }
    this.properFrameCount++;
    if(this.properFrameCount === this.span){
      this.completion();
    }
  }
  draw(){
    let cx, cy;
    if(!this.active){
      cx = this.currentPosition.x;
      cy = this.currentPosition.y;
    }else{
      // アクティブな時はcurとnextの間。
      let prg = this.properFrameCount / this.span;
      // イージング
      prg = prg * prg * (3.0 - 2.0 * prg);
      cx = this.currentPosition.x * (1.0 - prg) + this.nextPosition.x * prg;
      cy = this.currentPosition.y * (1.0 - prg) + this.nextPosition.y * prg;
    }
    circle(cx, cy, this.size);
  }
}

// 補助関数（矢印描画）
function drawArrow(gr, start, end, arrowLength){
  gr.line(start.x, start.y, end.x, end.y);
  let seg1 = p5.Vector.sub(start, end).normalize().rotate(Math.PI * 0.1).mult(arrowLength);
  let seg2 = p5.Vector.sub(start, end).normalize().rotate(-Math.PI * 0.1).mult(arrowLength);
  gr.line(end.x, end.y, end.x + seg1.x, end.y + seg1.y);
  gr.line(end.x, end.y, end.x + seg2.x, end.y + seg2.y);
}
