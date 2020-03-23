// sampler2Dやってみるよ

// texture2Dのテスト

// texture2Dはほんとにこれだけですよ。
// widthとheightは0.0～1.0に正規化してあるのでそこから色情報を取得してますね。
// 毎回。
// たとえば第二引数が(0.3, 0.6)なら左上から右に0.3, 下に0.6進んだところの色が出る。逆？逆。

// 特定の場所に出すなら・・・

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
"uniform sampler2D player;" +
"uniform vec3 playerData;" +
"void main(){" +
"  vec2 p = gl_FragCoord.xy * 0.5 / min(resolution.x, resolution.y);" +
"  p.y = 1.0 - p.y;" + // uv座標がy軸方向が逆になってるのでそこら辺の処理ですね
//"  vec4 col = texture2D(player, p);" + // playerのuv座標はy軸方向が下方向でglslの上方向と逆なのでそのように取得しております！
"  vec2 q = playerData.xy;" +
"  float size = playerData.z;" +
"  vec4 bgCol = vec4(vec3(0.7), 1.0);" + // 背景色
"  if(p.x < q.x || p.x > q.x + size || p.y < q.y || p.y > q.y + size){" +
"    gl_FragColor = bgCol;" + // 表示領域の外にあるときは背景色
"  }else{" +
"    vec2 t = (p - q) / size;" +
"    vec4 col = texture2D(player, t);" +
"    if(col.w > 0.0){ gl_FragColor = col; }else{ gl_FragColor = bgCol; }" + // 透明部分は背景色。以上。
"  }" +
"}"

let playerImg;

function preload(){
  playerImg = loadImage("https://inaridarkfox4231.github.io/assets/FlappyBird/player.png");
}

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
}

function draw(){
  let x = 0.5 + 0.3 * sin(frameCount * 0.04);
  let y = 0.5 + 0.3 * cos(frameCount * 0.04);
  let size = 0.1;
  myShader.setUniform("resolution", [width, height]);
  myShader.setUniform("mouse", [mouseX, mouseY]);
  myShader.setUniform("time", millis() / 1000);
  myShader.setUniform("player", playerImg);
  myShader.setUniform("playerData", [x, y, size]);
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}
