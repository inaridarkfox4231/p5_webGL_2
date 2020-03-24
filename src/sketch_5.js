// book of shadersのplot関数作ってみる

// 参考：https://thebookofshaders.com/05/?lan=jp

// plotはたとえば0.0～1.0の範囲でy=x^2とかをその、その関数のグラフにする感じ。

// 原理
// smoothstep(a, b, value)はvalueがa以下で0,b以上で1でその間では自然に滑らかに補完される（実は3次関数）。
// そこで、valueがy-delta_y～yのからy～y+delta_yのを引く・・ということをする感じ。
// その値が1に近くなるように。(x, y)が。

// 陰関数（x^2+y^2=1.0的な）に適用するにはどうするのか気になるけど。
// イメージはなんとなくできます。

// 背景部分はただのコントラストね。

// 平行移動、スケール変換なども可能・・
// 複数グラフ？それは・・max取るんじゃないかなぁ。

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
// ここに関数書いていろいろ変化させる
"float func1(float x){" +
"  return pow(x, 2.0);" + // xの2乗
"}" +
"float func2(float x){" +
"  return 3.0 * pow(x, 2.0) - 2.0 * pow(x, 3.0);" +
"}" +
"float func3(float x){" +
"  return 0.5 * (1.0 - cos(x * pi * 2.0));" +
"}" +
// plot.
// とりあえず(x, func(x))のやつで。yがfunc(x)付近のときに1付近の値を返す感じ。
"float plot(float value, float delta, float y){" +
"  return smoothstep(value - delta, value, y) - smoothstep(value, value + delta, y);" +
"}" +
// メインコード
"void main(void){" +
"  vec2 p = gl_FragCoord.xy * 0.5/ min(u_resolution.x, u_resolution.y);" + // pは(0.0～1.0)x(0.0～1.0)
// 関数の値を取得して割合を取る！
"  float plotValue1 = plot(func1(p.x), 0.01, p.y);" +
"  float plotValue2 = plot(func2(p.x), 0.01, p.y);" +
"  float plotValue3 = plot(func3(p.x), 0.01, p.y);" +
"  float plotValue = max(max(plotValue1, plotValue2), plotValue3);" +
// カラーリング（グラフの色と背景）
"  vec3 grColor1 = hsb2rgb(0.05, 1.0, 1.0);" +
"  vec3 grColor2 = hsb2rgb(0.15, 1.0, 1.0);" +
"  vec3 grColor3 = hsb2rgb(0.25, 1.0, 1.0);" +
"  vec3 grColor = grColor1 * plotValue1 + grColor2 * plotValue2 + grColor3 * plotValue3;" +
"  vec3 bgColor = vec3(p.x);" +
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
