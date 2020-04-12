// 気を取り直してocean2の写経
// というかSailingっていうらしいけどねこれ

// イメージとしてはx軸が水平右方向、y軸がそれに垂直に上方向、z軸が手前に向かう方向って感じ。
// rollはxy平面内で反時計回りに回転、pitchはそのあとでyz平面内でyをzに移すように回転、yawは最後に円錐の周を描くように
// xz平面内でその頂点がxをzに移すように回転する感じね。
// カメラはz軸正方向にぎゅーん。だから遠ざかっていくイメージなんかな・・
// 色が描画されるのはz軸負の方向に1.6だけ離れたところにある、640x360を上下幅を-1.0～1.0とした感じのスクリーン。
// これが回転行列でぐるぐるされて、されたうえで、目線がとんで、空の色や海の色が貼り付けられるようですね。

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
// スペースキーを押されるたびにフラグが変わる感じ
"uniform bool night;" +
// 円周率
"const float pi = 3.14159;" +
// 微小定数（EPSILON_NRM = 0.5 / u_resolution.x は別に定義する）（#define使えないので）
"const float EPSILON = 1e-3;" +
// レイマーチングの回数
"const int NUM_STEPS = 6;" +
// 海面の高さを計算する際の繰り返し回数（ラフ、ディテール）・・名前変えちゃおうか。
"const int ITER_ROUGH = 2;" +
"const int ITER_DETAILED = 5;" +
// 海関連の定数（SEA_TIME = u_time * SEA_SPEED は別に定義する）
"const float SEA_HEIGHT = 0.5;" +
"const float SEA_CHOPPY = 3.0;" +
"const float SEA_SPEED = 1.9;" +
"const float SEA_FREQ = 0.24;" +
"const vec3 SEA_BASE = vec3(0.11, 0.19, 0.22);" + // 海のベースカラー
"const vec3 SEA_WATER_COLOR = vec3(0.55, 0.9, 0.7);" + // 海水のベースカラー
// 海面の高さを計算するための繰り返しに使う行列
"mat2 octave_m = mat2(1.7, -1.2, 1.2, 1.4);" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// fromEulerの独自修正版。(roll, pitch, yaw)で取得する。ベクトルの変換行列。
// 1箇所でしか使ってないからわかりやすいように成分表記にした。
// rollで横揺れしたあとpitchで上下動、最後にyawでぐるぐる水平回転
"mat3 fromEuler(float roll, float pitch, float yaw){" +
"	 vec2 a = vec2(cos(roll), sin(roll));" +
"  vec2 b = vec2(cos(pitch), sin(pitch));" +
"  vec2 c = vec2(cos(yaw), sin(yaw));" +
// 画面の横揺れ（roll）
"  mat3 m_roll;" +
"  m_roll[0] = vec3(a.x, a.y, 0.0);" +
"	 m_roll[1] = vec3(-a.y, a.x, 0.0);" +
"	 m_roll[2] = vec3(0.0, 0.0, 1.0);" +
// 縦揺れ（pitch）
"  mat3 m_pitch;" +
"  m_pitch[0] = vec3(1.0, 0.0, 0.0);" +
"	 m_pitch[1] = vec3(0.0, b.x, b.y);" +
"	 m_pitch[2] = vec3(0.0, -b.y, b.x);" +
// 水平回転（yaw）
"  mat3 m_yaw;" +
"  m_yaw[0] = vec3(c.x, 0.0, c.y);" +
"	 m_yaw[1] = vec3(0.0, 1.0, 0.0);" +
"	 m_yaw[2] = vec3(-c.y, 0.0, c.x);" +
// m_roll, m_pitch, m_yawの順に適用される
"	 return m_yaw * m_pitch * m_roll;" +
"}" +
// バリューノイズの準備、ハッシュ関数
"float hash(vec2 p){" +
"  float h = sin(dot(p, vec2(127.1, 311.7)));" +
"  return fract(h * 43758.5453123);" +
"}" +
// バリューノイズ
"float vnoise2(vec2 p){" +
"  vec2 i = floor(p);" +
"  vec2 f = fract(p);" +
"  vec2 u = f * f * (3.0 - 2.0 * f);" +
"  float h00 = hash(i + vec2(0.0, 0.0));" +
"  float h10 = hash(i + vec2(1.0, 0.0));" +
"  float h01 = hash(i + vec2(0.0, 1.0));" +
"  float h11 = hash(i + vec2(1.0, 1.0));" +
"  return -1.0 + 2.0 * mix(mix(h00, h10, u.x), mix(h01, h11, u.x), u.y);" +
"}" +
// 拡散の所はおいおい理解します（海の色の計算）
// nは海面の法線ベクトル、lは入射光の逆ベクトル、pは・・80.0？？
"float diffuse(vec3 n, vec3 l, float p){" +
"  return pow(dot(n, l) * 0.4 + 0.6, p);" +
"}" +
// 鏡面反射？？
// nとlは上と同じ、eはeye（目の位置から該当位置への単位ベクトル）、sには90.0が入ってるっぽい。
"float specular(vec3 n, vec3 l, vec3 eye, float s){" +
"  float nrm = (s + 8.0) / (pi + 8.0);" +
"  return pow(max(dot(reflect(e, n), l), 0.0), s) * nrm;" +
"}" +
// 上の二つってpowがpowなら80乗とか90乗になっちゃうんだけどおかしいなぁ。。ほんとに？？
// 空の色
// eyeは目線のベクトル。y座標しか使わない。上の方だと空、下の方は考えない感じ（0.0になっちゃう、適用されることを想定してない）
// ちなみに真っ白になる。上の方ほど濃い青になっている。
"vec3 getSkyColor(vec3 e){" +
"  e.y = max(e.y, 0.0);" +
"  vec3 skyColor;" +
"  skyColor.x = pow(1.0 - e.y, 2.0);" +
"  skyColor.y = 1.0 - e.y;" +
"  skyColor.z = 0.6 + (1.0 - e.y) * 0.4;" +
"  return skyColor;" +
"}" +
// 海の表面を作る
// 最初に基本波（オクターブ）を作る
"float sea_octave(vec2 uv, float choppy){" +
// まずバリューノイズによる横方向の変動を加える
"  uv += vnoise2(uv);" +
// 0.0と±1.0で挙動が異なる二つの波を片方の割合でmixする
"  vec2 wv = 1.0 - abs(sin(uv));" +
"  vec2 swv = abs(cos(uv));" +
"  wv = mix(wv, swv, wv);" +
// x, y成分を掛けて0.65乗でなだらかにしてさらに・・なんかする（（
"  return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);" +
"}" +
// 次にmap（粗い方）を作る感じ。ラフなので繰り返しは2回だけ。
// ラフの方はレイマーチングで海面との交点を出すのに使われる感じですね。
"float map_rough(vec3 p){" +
"  float freq = SEA_FREQ;" +  // 振動数、基本波を作るときに適用する。
"  float amp = SEA_HEIGHT;" +  // 振幅（波の高さ的な？）
"  float choppy = SEA_CHOPPY;" +  // 波の形らしいんだけどね。
"  float seatime = u_time * SEA_SPEED;" +  // あっちでSEA_TIMEとなってるやつ。
"  vec2 uv = p.xz;" + // xz平面への射影ですね
"  uv.x *= 0.75;" + // なんで水平方向で縮めているのかは知らない。実験してみるか。
// dは各段階での基本波、hは最終的な海面の水平からの高さ。
// returnでp.y - hを取ることで海面からの高さが出る計算ですね。
"  float d, h = 0.0;" +
"  for(int i = 0; i < ITER_ROUGH; i++){" +
"    d = sea_octave((uv + seatime) * freq, choppy);" +
"    h += d * amp;" +
"    uv = octave_m * uv;" +
"    freq *= 1.9;" +  // 振動数を大きく
"    amp *= 0.22;" +  // 振幅を小さく
"    choppy = mix(choppy, 1.0, 0.2);" +  // 0.2に近づくように小さくしている
"  }" +
"  return p.y - h;" +
"}" +
// 次に、map（詳しい方）を作る。繰り返し回数は5回になる。係数もちょっと変えてる。
// ディテールの方は法線を作る為に3回呼び出される感じですね。
"float map_detailed(vec3 p){" +
"  " +
"}" +
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
"  gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);" +
"}";

let propertime = 0.0;
let night = false;

function setup(){
  createCanvas(640, 360);
  myShader = createShader(vs, fs);
  shader(myShader);
}

function draw(){
  let start = millis();
  myShader.setUniform("u_resolution", [width, height]);
  myShader.setUniform("u_mouse", [mouseX, mouseY]);
  myShader.setUniform("u_time", propertime / 1000);
  myShader.setUniform("night", night);
  quad(-1, -1, -1, 1, 1, 1, 1, -1);
  let end = millis();
  propertime += end - start;
}
