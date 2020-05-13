// https://www.shadertoy.com/view/XtXGRS#
// これをp5.jsに落とす。

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs =
"precision mediump float;" +
// uniform.
"uniform vec2 u_resolution;" +
"uniform vec2 u_mouse;" + // -1.0～1.0
"uniform float u_time;" +
// 各種定数
"const float pi = 3.14159;" +
"const float ang4 = 1.91063;" + // 正四面体の面法線ベクトルのなす角
"const float ang8 = 0.95532;" + // 正八面体の頂点方向を面方向に直す
"const float ang12 = 1.10715;" + // 正十二面体の面法線ベクトルのなす角
"const float ang20_1 = 0.65236;" + // 正二十面体、面法線ベクトル1
"const float ang20_2 = 1.38208;" + // 正二十面体、面法線ベクトル2
// 内外半径比・・内接球半径を外接球半径で割った値。
// 1.0より小さくなる。
"const float ioratio4 = 0.33333;" + // 1.0 / 3.0
"const float ioratio6 = 0.57735;" + // 1.0 / sqrt(3.0)
"const float ioratio8 = 0.57735;" + // 上に同じ
// 以下の値：2√(25 + 11√5) / ((√30)(1 + √5)).
"const float ioratio12 = 0.79465;" +
"const float ioratio20 = 0.79465;" + // 上に同じ。
// 辺の中点
// 正十二面体の面法線ベクトルを辺中点ベクトルに直すときの回転角
"const float faceToEdge12 = 0.55357;" +
// 辺の中点距離・・内接球半径を辺の中点距離で割った値
"const float edge12 = 1.17557;" +
// 色関連
"const vec3 red = vec3(0.98, 0.6, 0.65);" +
"const vec3 yellow = vec3(0.95, 0.9, 0.6);" +
"const vec3 green = vec3(0.6, 0.9, 0.6);" +
"const vec3 purple = vec3(0.8, 0.6, 0.98);" +
"const vec3 blue = vec3(0.5, 0.55, 0.98);" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getRGB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 双曲線関数
"float cosh(float x){" +
"  return 0.5 * (exp(x) + exp(-x));" +
"}" +
"float sinh(float x){" +
"  return 0.5 * (exp(x) - exp(-x));" +
"}" +
"float tanh(float x){" +
"  return (exp(x) - exp(-x)) / (exp(x) + exp(-x));" +
"}" +
// ベクトルpのt回転。OK!
"vec2 rotate(vec2 p, float t){" +
"  return p * cos(t) + vec2(-p.y, p.x) * sin(t);" +
"}" +
// x, y, z軸周りの回転をまとめておきたい
// 汎用性を高めるにはvoidで書かない方がよい。こだわり捨ててね。
// x軸周り, yをzに移す回転。
"vec3 rotateX(vec3 p, float t){" +
"  p.yz = rotate(p.yz, t);" +
"  return p;" +
"}" +
// y軸周り、zをxに移す回転。上から見て反時計回り。
"vec3 rotateY(vec3 p, float t){" +
"  p.zx = rotate(p.zx, t);" +
"  return p;" +
"}" +
// z軸周り。xをyに移す回転。
"vec3 rotateZ(vec3 p, float t){" +
"  p.xy = rotate(p.xy, t);" +
"  return p;" +
"}" +
// 球。中心cで半径r.
"float sphere(vec3 p, vec3 c, float r){" +
"  return length(p - c) - r;" +
"}" +
// 半空間。dir方向にlだけ進んだとこを通るdirに垂直な平面の
// dir方向の空間全体。lが負なら逆方向。
// 基本的に何かとmaxで共通部分を取って使う。
"float halfSpace(vec3 p, vec3 dir, float l){" +
"  return dot(p, -dir) + l;" +
"}" +
// 逆球。
"float invSphere(vec3 p, vec3 c, float r){" +
"  return r - length(p - c);" +
"}" +
// 棒。cからn方向、長さ無限、rは太さ。
"float bar(vec3 p, vec3 n, vec3 c, float r){" +
"  return length(p - c - dot(p - c, n) * n) - r;" +
"}" +
// 逆棒. 棒の外側全体。maxでくりぬきに使う。
"float invBar(vec3 p, vec3 n, vec3 c, float r){" +
"  return -bar(p, n, c, r);" +
"}" +
// いよいよ多面体。
// 半空間の逆バージョン・・dot(p, dir) - rを使うと、
// dir方向にrだけ進んだとこを通るdirに垂直な平面の「dirと反対側」全体
// になるから、それらのmaxを取ることで多面体を描画できる。
// だから結局dirをすべて求めることが重要になるわけ。
// 一部では向かい合う面に関してまとめて計算している。
// abs(dot(p, dir)) - rを使うとdir方向にrだけ進んだとこと反対方向に
// rだけ進んだとこの2つの平面の間の領域全体になる。これは
// max(dot(p, dir) - r, dot(p, -dir) - r)を整理したものと思ってもよい。
"float tetrahedron(vec3 p, float size){" +
// 上面からスタート。
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
// 正四面体は面法線ベクトルと各頂点に向かう単位ベクトルが互逆なので、
// 頂点に向かうベクトルのなす角を調べればよくそれはatan(2√2, 1).
// sizeは・・汎用性考えるといちいち引いた方がいいかな・・
"  float result = dot(p, dir);" +
// xy平面内で面法線ベクトルのなす角だけdirを回転させる。
"  dir = rotateZ(dir, ang4);" +
// あとはこれのy軸中心の回転2pi/3で3つ出してmax取るだけ。
// 逐次回転だと誤差が怖いのでいちいち元のdirを使う。
"  vec3 q;" +
"  for(float i = 0.0; i < 3.0; i += 1.0){" +
"    vec3 q = rotateY(dir, i * 2.0 * pi / 3.0);" +
"    result = max(result, dot(p, q));" +
"  }" +
"  return result - size;" +
"}" +
// 正六面体（立方体）。
// 面の対が3つなのでabsを使って省略する。
"float hexahedron(vec3 p, float size){" +
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
"  float result = abs(dot(p, dir));" + // 先ほど説明した面対の処理
// dirをz軸周りに90°回転した後y軸周りに90°回転。
// ここをたとえば45°回転4回とかすると八角柱ができたりする。
"  dir = rotateZ(dir, pi * 0.5);" +
"  result = max(result, abs(dot(p, dir)));" +
"  dir = rotateY(dir, pi * 0.5);" +
"  result = max(result, abs(dot(p, dir)));" +
"  return result - size;" +
"}" +
// hは原点中心として長さの半分、rは八角形の内接円の半径。
// 完璧。直方体もこれでいけるね。
"float octapole(vec3 p, float h, float r){" +
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
"  float result = abs(dot(p, dir)) - h;" +
"  dir = rotateZ(dir, pi * 0.5);" +
"  vec3 q;" +
"  for(float i = 0.0; i < 4.0; i += 1.0){" +
"    q = rotateY(dir, pi * i * 0.25);" +
"    result = max(result, abs(dot(p, q)) - r);" +
"  }" +
"  return result;" +
"}" +
// 正八面体。なす角は定数でやりましょう。
"float octahedron(vec3 p, float size){" +
// この場合dirの初期設定は一つの頂点。
// クリスタルのような、正方形がzx平面でその上下に4面ずつという形。
// 最初の回転で一つの面の法線ベクトルにした後y軸周りの回転で
// すべての面対の法線ベクトルを出している。
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
// 回転角はatan(√2)で出る。
"  dir = rotateZ(dir, ang8);" +
"  float result = 0.0;" + // どうせabsとmax取るんだし0.0デフォでいい。
"  vec3 q;" +
"  for(float i = 0.0; i < 4.0; i += 1.0){" +
"    q = rotateY(dir, pi * 0.5 * i);" +
"    result = max(result, abs(dot(p, q)));" +
"  }" +
"  return result - size;" +
"}" +
// 正十二面体。なす角は、定数で。
"float dodecahedron(vec3 p, float size){" +
// てっぺんを向いた面法線ベクトルでまず取る。面対は6つ。
// これの他の5つはまずこのベクトルを回転させ、そのあとでいつものように
// y軸周りで回転させる。面法線ベクトルのなす角は平面のなす角と補角の
// 関係にあり、計算するとatan(2.0)になる。
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
"  float result = abs(dot(p, dir));" +
"  dir = rotateZ(dir, ang12);" + // 他の面法線ベクトルのひとつへ。
"  vec3 q;" +
"  for(float i = 0.0; i < 5.0; i += 1.0){" +
"    q = rotateY(dir, pi * 0.4 * i);" +
"    result = max(result, abs(dot(p, q)));" +
"  }" +
"  result -= size;" +
"  return result;" +
"}" +
// 正二十面体。なす角は、どちらも定数で。
"float icosahedron(vec3 p, float size){" +
// まずてっぺん向いてるのは頂点。面対は10個。
// 回転させた軸を二つ用意する。それぞれが面法線ベクトルの5つ組を
// 与える感じね。それぞれ回してmaxを取って返す。
// 最初の回転：acos(tan(0.3 * pi) / sqrt(3.0) ≒ 0.652358139...,
// 次の回転（面法線のなす角）：atan(2.0 / sqrt(5.0)) ≒ 0.729727656...
// って感じ。元のコードではこれらの相加平均取って1倍と2倍ってやってる
// けどまあ正確な値でやりましょう。
"  vec3 dir = vec3(0.0, 1.0, 0.0);" +
"  vec3 dir1 = rotateZ(dir, ang20_1);" +
"  vec3 dir2 = rotateZ(dir, ang20_2);" +
"  vec3 q;" +
"  float result = 0.0;" +
"  for(float i = 0.0; i < 5.0; i += 1.0){" +
"    q = rotateY(dir1, pi * 0.4 * i);" +
"    result = max(result, abs(dot(p, q)));" +
"    q = rotateY(dir2, pi * 0.4 * i);" +
"    result = max(result, abs(dot(p, q)));" +
"  }" +
"  return result - size;" +
"}" +
// map関数。距離の見積もり関数.
// ここでdを更新するときに最後に更新されたオブジェクトのところがどこか
// を調べればオブジェクトごとの色分けができそうね。
"float map(vec3 p){" +
"  float d = sphere(p, vec3(1.0, 1.0, 1.0), 0.2);" +
"  d = min(d, bar(p, vec3(1.0, 0.0, 0.0), vec3(0.0), 0.05));" +
"  d = min(d, bar(p, vec3(0.0, 1.0, 0.0), vec3(0.0), 0.05));" +
"  d = min(d, bar(p, vec3(0.0, 0.0, 1.0), vec3(0.0), 0.05));" +
"  d = min(d, dodecahedron(p, sqrt((25.0 + 11.0 * sqrt(5.0))/40.0)));" +
"  return d;" +
"}" +
"vec3 getBodyColor(){" +
"  return blue;" +
"}" +
// 法線ベクトルの取得
"vec3 calcNormal(vec3 p){" +
"  const vec2 eps = vec2(0.0001, 0.0);" +
// F(x, y, z) = 0があらわす曲面の、F(x, y, z)が正になる側の
// 法線を取得するための数学的処理。具体的には偏微分、分母はカット。
"  vec3 n;" +
"  n.x = map(p + eps.xyy) - map(p - eps.xyy);" +
"  n.y = map(p + eps.yxy) - map(p - eps.yxy);" +
"  n.z = map(p + eps.yyx) - map(p - eps.yyx);" +
"  return normalize(n);" +
"}" +
// レイマーチングのメインコード
"float march(vec3 ray, vec3 camera){" +
"  const float maxd = 20.0;" + // 限界距離。これ越えたら無いとみなす。
"  const float precis = 0.001;" + // 精度。これより近付いたら到達とみなす。
"  const int ITERATION = 64;" + // マーチングループの回数
"  float h = precis * 2.0;" + // 毎フレームの見積もり関数の値。
// 初期値は0.0で初期化されてほしくないのでそうでない値を与えてる。
// これがprecisを下回れば到達とみなす
"  float t = 0.0;" +
// tはcameraからray方向に進んだ距離の累計。
// 到達ならこれが返る。失敗なら-1.0が返る。つまりresultが返る。
"  float result = -1.0;" +
"  for(int i = 0; i < ITERATION; i++){" +
"    if(h < precis || t > maxd){ break; }" +
// tだけ進んだ位置で見積もり関数の値hを取得し、tに足す。
"    h = map(camera + t * ray);" +
"    t += h;" +
"  }" +
// t < maxdなら、h < precisで返ったということなのでマーチング成功。
"  if(t < maxd){ result = t; }" +
"  return result;" +
"}" +
// カメラなどの回転。
"void transform(out vec3 p){" +
// 先にx軸周りの回転・・ピッチングね。
// 次にy軸周り。ヨーイング。
"  p = rotateX(p, pi * 0.3 * u_mouse.y);" +
"  p = rotateY(p, pi * 4.0 * u_mouse.x);" +
"}" +
// 背景色。とりあえずデフォでいいよ。
"vec3 getBackground(vec2 p){" +
// まあこれだと空間がぐるぐるしてる感じがないからなー・・
// 体の色に合わせて変えてみるやつやってみました。
"  vec3 color = vec3(0.3);" +
"  return color * (0.4 + p.y * 0.2);" +
"}" +
// メインコード。
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
// まずは背景色を取得。
"  vec3 color = getBackground(p);" +
// ray（目線）を設定。canvasは視点からz軸負方向1.8で。
"  vec3 ray = normalize(vec3(p, -1.8));" +
// camera（カメラ位置）を設定。z軸上、4.5のところ。
"  vec3 camera = vec3(0.0, 0.0, 4.5);" +
// 光源。rayの到達位置から生えるベクトル。気持ちz軸側くらい。
"  vec3 light = normalize(vec3(0.5, 0.8, 3.0));" +
// 目線、カメラ位置、光源をまとめて回転させる。
// ということはキャンバスも動くことになる。
// 今回対象物はその場に固定で、カメラの位置だけ半径4.5の球面上を
// 動かすこととし、光源などもまとめてそれに応じて動かす感じ。
// timeで動かしてるけどマウスでもいいと個人的には思う。
"  transform(ray);" +
"  transform(camera);" +
"  transform(light);" +
// マーチングの結果を取得。
"  float t = march(ray, camera);" +
// tはマーチングに失敗すると-1.0が返る仕組みでその場合colorは
// 更新されずそこは背景色が割り当てられる。
// 先に体色を用意しておく。黄色っぽい。
"  vec3 bodyColor = getBodyColor();" +
"  if(t > -0.001){" +
"    vec3 pos = camera + t * ray;" + // 表面。
"    vec3 n = calcNormal(pos);" + // 法線取得
// 明るさ。内積の値に応じて0.3を最小とし1.0まで動かす。
"    float diff = clamp((dot(n, light) + 0.5) * 0.7, 0.3, 1.0);" +
"    vec3 baseColor = bodyColor * diff;" +
"    color = mix(baseColor, color, tanh(t * 0.1));" +
"  }" +
// 以上。
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCanvas;
let isLoop = true;

function setup(){
  createCanvas(640, 480);
  myCanvas = createGraphics(width, height, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  textSize(40);
  textAlign(CENTER,CENTER);
}

function draw(){
  myShader.setUniform("u_resolution", [width, height]);
  let mx = constrain(mouseX / width, 0.0, 1.0);
  let my = 1.0 - constrain(mouseY / height, 0.0, 1.0);
  myShader.setUniform("u_mouse", [2.0 * mx - 1.0, 2.0 * my - 1.0]);
  myShader.setUniform("u_time", millis() / 1000);
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  image(myCanvas, 0, 0);
  showText();
}

function showText(){
  /* なんか書くかも */
}

function keyTyped(){
  if(keyCode === 32){
    if(isLoop){ isLoop = false; noLoop(); }
    else{ isLoop = true; loop(); }
  }
}
