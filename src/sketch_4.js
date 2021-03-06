// hsbをrgbにするコードで遊ぶ

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs =
"precision mediump float;" +
"uniform vec2 resolution;" +
"uniform vec2 mouse;" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 hsb2rgb(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// メインコード
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - resolution.xy) / min(resolution.x, resolution.y);" +
"  float x = clamp(mouse.x / resolution.x, 0.0, 1.0);" +
"  gl_FragColor = vec4(hsb2rgb(x, 1.0, 1.0), 1.0);" +
"}"

function setup(){
  createCanvas(400, 400, WEBGL);
  myShader = createShader(vs, fs);
  shader(myShader);
}

function draw(){
  myShader.setUniform("resolution", [width, height]);
  myShader.setUniform("mouse", [mouseX, mouseY])
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}
