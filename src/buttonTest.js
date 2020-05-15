// せっかくボタンとスライダー再利用可能な形で書いたのに
// 全然再利用できる気がしない
// それもそのはず、コードを分離してないからだよ
// そこら辺を重点的にやってみようというわけです
// よろしく

// まずボタン。といっても色々あるけどね。
// たとえばどれかひとつクリックしてそれで何か値が決まるのか、
// つまり何回もクリックして使う感じ。
// あるいは、ラジオ的な、どれか一つだけがアクティブになってるようにするのか、
// あるいは、チェックボックス的な、個別にオンオフするのか。
// 要するに、用途ごとに別々のボタンセットを用意すればいいわけだね。

// とりあえずラジオ的な、どれか一つだけがアクティブになってるようなのが欲しいかも。

// ボードを用意してそこに当てはめるのが定石。なぜか。左上ベースとは限らないし、ある程度まとまっていた方が
// レイアウトを作りやすいでしょう？

// だからオフセットの考え方が重要になる。これがないとマウスの値がずれちゃうから。

// 1. UniqueButtonSetを生成する。
// 2. 一通りボタンを導入する。
// 3. ボードの左上座標で初期化する。
// 4. クリックでアクティブにするにはマウスダウンもしくはマウスクリックのイベントでButtonSetにactivateさせる。
// 5. 状態の取得にはButtonSetのメソッドgetActiveButtonIdを用いる。
// 6. Multiの場合にはgetActiveStateを使って配列を受け取る。
// 7. 描画に関しては、drawメソッドの引数としてボードを渡す感じかしらね。

// できました。簡単ですね。これ以上複雑にしないように。
// 反応を確かめたいので、左上のスペースを使いましょう。

// 完璧ですね。では次に。
// マルチボタン完璧やな・・・・

// あんま複雑なことしても仕方ないのでここらへんで切ります。
// 円形ボタン、やってもいいけどあんま面白くないし必要が生じたらでいいよ。

let checkboard;
let board;
let myButtonSet;
let myMultiButtonSet;

function setup(){
  createCanvas(640, 360);
  checkboard = createGraphics(500, 180);
  board = createGraphics(320, 180);
  // ボタンセット生成。
  myButtonSet = new UniqueButtonSet();
  // カラーボタンを登録。(左、上、横幅、縦幅、色、あれば文字。)
  myButtonSet.addColorButton(20, 20, 80, 40, color("red"), "はい");
  myButtonSet.addColorButton(20, 80, 80, 40, color("blue"), "いいえ");
  // 初期化
  myButtonSet.initialize(320, 180);
  // マルチボタン（うまく機能するのか？）
  myMultiButtonSet = new MultiButtonSet();
  // カラーボタンを登録しますよ
  myMultiButtonSet.addColorButton(120, 20, 40, 40, color("green"), "１");
  myMultiButtonSet.addColorButton(120, 70, 40, 40, color("green"), "２");
  myMultiButtonSet.addColorButton(120, 120, 40, 40, color("green"), "３");
  myMultiButtonSet.addColorButton(180, 20, 40, 40, color("brown"), "４");
  myMultiButtonSet.addColorButton(180, 70, 40, 40, color("brown"), "５");
  myMultiButtonSet.addColorButton(180, 120, 40, 40, color("brown"), "６");
  // 初期化
  myMultiButtonSet.initialize(320, 180);
}

function draw(){
  background(220);
  checkboard.background(160);
  // 値の取得（0か1ですね、翻訳機を使えばいくらでも加工できるけれど）
  let id = myButtonSet.getActiveButtonId();
  // ユニークボタンセットの動作確認
  checkboard.textSize(20);
  checkboard.fill(0);
  switch(id){
    case 0: checkboard.text("はいが選択されています", 20, 30); break;
    case 1: checkboard.text("いいえが選択されています", 20, 30); break;
  }
  // マルチボタンセットの動作確認(true/falseの配列になってます)
  let info = "何も選択されていません";
  let numbers = ["１", "２", "３", "４", "５", "６"];
  let choiceSum = 0; // いくつ選択されているか
  let stateInfo = myMultiButtonSet.getActiveState();
  for(let i = stateInfo.length - 1; i >= 0; i--){
    let st = stateInfo[i];
    if(st){
      if(choiceSum === 0){
        info = numbers[i] + "が選択されています";
      }else{
        info = numbers[i] + "と" + info;
      }
      choiceSum++;
    }
  }
  checkboard.text(info, 20, 60);

  image(checkboard, 0, 0);
  board.background(160);
  // ボードに描画して・・
  myButtonSet.draw(board);
  myMultiButtonSet.draw(board);
  // ボード自体を描画する感じね。
  image(board, 320, 180);
}

// interaction.
function mousePressed(){
  // クリックされたら起動。オフセットは大丈夫です。
  myButtonSet.activate();
  myMultiButtonSet.activate();
}

// -------------------------------------------------------------------------------------------------------------------- //
// ButtonGraphic.

// colorIdやめてbuttonColorを渡すように仕様変更
function createColorButtonGraphic(w, h, buttonColor, paleRatio = 0.0, innerText = ""){
  let gr = createGraphics(w, h);
	gr.rectMode(CENTER);
	gr.noStroke();
	const edgeLength = min(w, h) * 0.1;
	// paleRatioで未選択の場合に色が薄くなるようにする。
  const baseColor = lerpColor(buttonColor, color(255), paleRatio);
  // 薄い部分
	gr.fill(lerpColor(baseColor, color(255), 0.3));
	gr.rect(w / 2, h / 2, w, h);
  // 濃い部分
	gr.fill(lerpColor(baseColor, color(0), 0.3));
	gr.rect(w / 2 + edgeLength * 0.5, h / 2 + edgeLength * 0.5, w - edgeLength, h - edgeLength);
  // 本体。必要なら文字を記述する。
	gr.fill(baseColor);
	gr.rect(w / 2, h / 2, w - edgeLength * 2, h - edgeLength * 2);

	if(innerText === ""){ return gr; }
	gr.fill(0);
	gr.textSize(h / 2);
	gr.textAlign(CENTER, CENTER);
	gr.text(innerText, w / 2, h / 2);
	return gr;
}

// -------------------------------------------------------------------------------------------------------------------- //
// Button.

class Button{
	constructor(left, top, w, h){
		this.left = left;
		this.top = top;
		this.w = w;
		this.h = h;
		this.active = false;
	}
	setOffSet(offSetX, offSetY){
    // ボードの位置を記録することにより、マウス位置の問題が生じないようにする。
    // 基本的に、ボードの左上座標を使う。
		this.offSetX = offSetX;
		this.offSetY = offSetY;
	}
	activate(){
		this.active = true;
	}
	inActivate(){
		this.active = false;
	}
	hit(){
		// クリック位置がボタンに触れてるかどうかをこれで判定する。
		const x = mouseX - this.offSetX;
		const y = mouseY - this.offSetY;
		return this.left < x && x < this.left + this.w && this.top < y && y < this.top + this.h;
	}
	draw(gr){
		// activeなときとactiveでないときで描画の仕方を変えるんだけどその指定の仕方で別クラスにする。
	}
}

// Buttonを2種類作る。
// 今まで通りのパレットのやつはColorButtonで背景選択用のやつはNormalButtonでこれはactiveなときとそうでない時の
// それぞれの画像を用意して持たせる。だからそこだけ変える。
// 廃止しません。ごめんね！
// あ、そうか、ColorButtonの定義を変えちゃえばいいんだ。constructorで作っちゃえばいい。その際paleRatioも指定しちゃおう。
// colorIdやめてbuttonColorを渡すように仕様変更
class ColorButton extends Button{
	constructor(left, top, w, h, buttonColor, innerText = ""){
		super(left, top, w, h);
		this.activeGraphic = createColorButtonGraphic(w, h, buttonColor, 0.0, innerText);
		this.inActiveGraphic = createColorButtonGraphic(w, h, buttonColor, 0.7, innerText);
	}
	draw(gr){
		// 画像は大きさを変えずにそのまま使う（文字のサイズとか変わっちゃうのでサムネ方式では駄目）
		if(this.active){
			gr.image(this.activeGraphic, this.left, this.top);
		}else{
			gr.image(this.inActiveGraphic, this.left, this.top);
		}
	}
}

// 2つの画像を用意してactiveに応じて切り替える。
// ボール選択とモード選択は薄い色にしたい感じ。ここには書かないけど。
// 背景選択の方ではサムネイルのようにして使う。
class NormalButton extends Button{
	constructor(left, top, w, h, activeGraphic, inActiveGraphic){
		super(left, top, w, h);
		this.activeGraphic = activeGraphic;
		this.inActiveGraphic = inActiveGraphic;
	}
	draw(gr){
		// 信じられない、AREA_WIDTHとかになってた。再利用できないじゃん。
		if(this.active){
			gr.image(this.activeGraphic, this.left, this.top, this.w, this.h,
				       0, 0, this.activeGraphic.width, this.inActiveGraphic.height);
		}else{
			gr.image(this.inActiveGraphic, this.left, this.top, this.w, this.h,
				       0, 0, this.activeGraphic.width, this.inActiveGraphic.height);
		}
	}
}

// ボタンを集めただけ。配列。
class ButtonSet{
	constructor(){
		this.buttons = [];
		this.size = 0; // ボタンの個数
		//this.activeButtonId = 0;
	}
	initialize(offSetX, offSetY){
	  /* 初期化 */
		for(let btn of this.buttons){
			btn.setOffSet(offSetX, offSetY);
		}
	}
	addColorButton(left, top, w, h, buttonColor, innerText = ""){
		// ColorButtonを追加する
		this.buttons.push(new ColorButton(left, top, w, h, buttonColor, innerText));
		this.size++;
	}
	addNormalButton(left, top, w, h, activeGraphic, inActiveGraphic){
		// NormalButtonを追加する
		this.buttons.push(new NormalButton(left, top, w, h, activeGraphic, inActiveGraphic));
		this.size++;
	}
	getTargetButtonId(){
		// クリック位置がボタンにヒットするならそれのidを返すがなければ-1を返す。
    for(let i = 0; i < this.size; i++){
			if(this.buttons[i].hit()){ return i; }
		}
		return -1;
	}
	activate(){ /* ボタンのactivate関連処理 */ }
	draw(gr){
		// ボタンが多い場合に・・表示工夫したり必要なんかな。
		for(let btn of this.buttons){ btn.draw(gr); }
	}
}

// 一度にひとつのボタンしかアクティブにならないボタンセット
// なので、具体的な値を取得できるように改良する。
class UniqueButtonSet extends ButtonSet{
	constructor(initialActiveButtonId = 0){
		super();
		this.activeButtonId = initialActiveButtonId;  // 最初にアクティブになっているボタンのid（デフォは0）
    this.buttonValueDict = [];
	}
	initialize(offSetX, offSetY){
		super.initialize(offSetX, offSetY);
		this.buttons[this.activeButtonId].activate();
	}
  setValue(valueArray){
    // 値を設定する感じ
    this.buttonValueDict = valueArray;
  }
	getActiveButtonId(){
		// activeなボタンのidは一意なのでそれを返す。
		return this.activeButtonId;
	}
  getValue(){
    // 具体的な値が欲しい場合はこっち
    return this.buttonValueDict[this.activeButtonId];
  }
	activate(){
    // クリック位置がボタンにヒットする場合に、それをactivateして、それ以外をinActivateする感じ。
		const targetButtonId = this.getTargetButtonId();
		if(targetButtonId < 0){ return; }
    this.buttons[this.activeButtonId].inActivate();
		this.activeButtonId = targetButtonId;
		this.buttons[this.activeButtonId].activate();
	}
}

// 一度に複数のボタンがアクティブになれるボタンセット
// 使わないけどね（何で用意したの）
class MultiButtonSet extends ButtonSet{
	constructor(){
		super();
		this.activeState = [];
	}
	initialize(offSetX, offSetY){
		super.initialize(offSetX, offSetY);
		for(let i = 0; i < this.size; i++){ this.activeState.push(false); }
	}
	getActiveState(){
		return this.activeState;
	}
	activate(){
		// クリック位置のボタンのactiveを切り替える感じ。
		const targetButtonId = this.getTargetButtonId();
		if(targetButtonId < 0){ return; }
		let btn = this.buttons[targetButtonId];
		if(btn.active){ btn.inActivate(); }else{ btn.activate(); }
		this.activeState[targetButtonId] = btn.active;
	}
}
