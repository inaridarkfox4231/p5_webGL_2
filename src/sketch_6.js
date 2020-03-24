// これを踏まえて、陰関数やってみる。できるのか？

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
"const float pi = 3.14159;" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 hsb2rgb(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// ここに陰関数の左辺を取得する関数を書く。とりあえず円。
"float getValue1(float x, float y){" +
"  return mod(pow(x, 2.0) + pow(y, 2.0), 0.2);" +
"}" +
// 次に双曲線とか？
"float getValue2(float x, float y){" +
"  return mod(pow(x, 2.0) - 1.5 * pow(y, 2.0), 0.2);" +
"}" +
// レム二スケートとか？
"float getValue3(float x, float y, float a){" +
"  return length(vec2(x - a, y)) * length(vec2(x + a, y)) - a * a;" +
"}" +
// またまた双曲線とか？
"float getValue4(float x, float y){" +
"  return mod(-1.5 * pow(x, 2.0) + pow(y, 2.0), 0.2);" +
"}" +
// plot.
// (x, y)からたとえばx^2 + y^2 - 0.8を出したとして、それに対して、それがdelta付近の0に近い値のときに1.0っぽい値を出力する感じ。
"float plot(float delta, float value){" +
"  return smoothstep(-delta, 0.0, value) - smoothstep(0.0, delta, value);" +
"}" +
// メインコード
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" + // pは(-1.0～1.0)x(-1.0～1.0)
// 関数の値を取得して割合を取る！
"  float plotValue1 = plot(0.02, getValue1(p.x, p.y));" +
"  float plotValue2 = plot(0.02, getValue2(p.x, p.y));" +
"  float plotValue3 = plot(0.02, getValue3(p.x, p.y, 0.55));" +
"  float plotValue4 = plot(0.02, getValue4(p.x, p.y));" +
"  float plotValue = max(max(plotValue1, plotValue2), max(plotValue3, plotValue4));" +
// カラーリング（グラフの色と背景）
"  vec3 grColor1 = hsb2rgb(0.05, 1.0, 1.0);" +
"  vec3 grColor2 = hsb2rgb(0.11, 1.0, 1.0);" +
"  vec3 grColor3 = hsb2rgb(0.16, 1.0, 1.0);" +
"  vec3 grColor4 = hsb2rgb(0.33, 1.0, 1.0);" +
"  vec3 grColor = grColor1 * plotValue1 + grColor2 * plotValue2 + grColor3 * plotValue3 + grColor4 * plotValue4;" +
"  vec3 bgColor = vec3(0.8 - abs(p.x) * abs(p.y));" +
// mixing.
"  vec3 col = mix(bgColor, grColor, plotValue);" +
"  gl_FragColor = vec4(col, 1.0);" +
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
