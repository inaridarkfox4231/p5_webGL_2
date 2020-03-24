// というわけで
// テンプレート

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
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 hsb2rgb(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// メインコード
"void main(void){" +
"  gl_FragColor = vec4(hsb2rgb(0.55, 0.77, 1.0), 1.0);" +
"}";

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
  noLoop();
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", millis() / 1000);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
}
