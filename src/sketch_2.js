// マウス、時間、による色の変化
// step関数適用
// texture2Dのテストなど
// いろいろやることあるのよ～
// 2D距離関数はそのあとでいいや

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}"

let fs =
"precision mediump float;" +
"uniform vec2 resolution;" +
"uniform vec2 mouse;" +
"uniform float time;" +
"void main(){" +
"  vec2 p = (gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);" +
"  vec2 col = mouse / min(resolution.x, resolution.y);" +
"  gl_FragColor = vec4(col.x, col.y, 0.5 * (1.0 - sin(time)), 1.0);" +
"}"

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
}

function draw(){
  myShader.setUniform("resolution", [width, height]);
  myShader.setUniform("mouse", [mouseX, mouseY]);
  myShader.setUniform("time", millis() / 1000);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}
