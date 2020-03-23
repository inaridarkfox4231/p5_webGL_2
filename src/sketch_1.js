// p5_webGL.

let myShader;

// uniformはCPU→GPUの情報送信
// varyingはGPU→GPUの情報送信
// そういうことらしいです
// attributeがつくと定数になる・・むむむ・・わかんね

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}"

let fs =
"precision mediump float;" +
"uniform vec2 resolution;" +
"void main(){" +
"  gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);" +
"}"

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
  noLoop();
}

function draw(){
  myShader.setUniform("resolution", [width, height]);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
}

// ここからの発展内容（いつもの）
// gl_FragCoordを使ってresolutionで割ることで具体的な処理対象となるピクセルの位置情報を取得する（ただし値が2倍になってるので
// (gl_FragCoord - resolution) / min(resolution.x, resolution.y)
// という計算をしないといけない）。
// mouse情報の取得。あらかじめ0.0～1.0にするのか-1.0～1.0にするのか決めておいて然るべき値を送るようにするといいかもね。
// time情報の取得。これはmillisで得た値を1000倍して秒数で取得するといいかもしれないけどproperFrameCountや
// グローバルでdrawスタート時にカウント開始するとかした方がいい気もするから微妙ね。
// mouseはそのままでもいいか・・いつも同じ処理するとは限らないし。
