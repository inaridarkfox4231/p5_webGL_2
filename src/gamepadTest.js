let x = 300;
let y = 200;
let w = 50;
let h = 50;

let r = 0;
let g = 0;

function setup() {
	createCanvas(600, 400);
	textSize(20);
}

function draw(){
	background(220);
	pollGamepads();
  fill(r, g, 255);
  noStroke();
  circle(x, y, w, h);
}

var interval;

function pollGamepads() {
	// 下位互換性のため。
  let gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
  let gp = gamepads[0];
  if(gp){
    buttonAction(gp.buttons);
    axesAction(gp.axes);
  }
}

// button概要。
/*
  0: Aボタン
  1: Bボタン
  2: Xボタン
  3: Yボタン
  4: L1ボタン
  5: R1ボタン
  6: L2スティック(0～1)
  7: R2スティック(0～1)
  8: SELECTボタン
  9: STARTボタン
  10: 左スティック（ボタン）
  11: 右スティック（ボタン）
  12: 上ボタン
  13: 下ボタン
  14: 左ボタン
  15: 右ボタン
  16: ？？？
*/

function buttonAction(data){
  if(data[15].pressed){ x += 2; } // 右
  if(data[14].pressed){ x -= 2; } // 左
  if(data[12].pressed){ y -= 2; } // 上
  if(data[13].pressed){ y += 2; } // 下
  if(data[0].pressed){ w += 2; h += 2; } // Aで大きく
  if(data[1].pressed){ w -= 2; h -= 2; } // Bで大きく
}

// axes概要。
// 基本的に半径1の円の内部の座標を返す。
// ただしニュートラルが原点で右下に行くほど大きくなる。
// そして中心付近では微小な定数で動かないみたい。
/*
  0: 左スティックのx
  1: 左スティックのy
  2: 右スティックのx
  3: 左スティックのy
*/

function axesAction(data){
  if(abs(data[1]) > 0.001){
    r += data[1] * 10;
    r = constrain(floor(r), 0, 255);
  }
  if(abs(data[3]) > 0.001){
    g += data[3] * 10;
    g = constrain(floor(g), 0, 255);
  }
}

// これによるとbuttonは全部で17個ですねー。
// axesは4個で、どうやらスチコンのふたつのスティックの倒れ具合を計算しているみたいですね・・・
