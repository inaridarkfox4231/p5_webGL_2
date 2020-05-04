// 3D描画の際のテンプレートを作成中。実際にはいろいろ改変したりするが。

// いろいろ整えた。
// 最初の段階でマウスが中央にある時の状況になってて、
// ボタンクリックでマウスによりいじれるようになるとかしたら面白そう。
// スライダーで床の色と空の色いじれたら面白そう。

// たとえばバリエーションとしてボタンで正多面体選んで表示されるようにするとか。

// 画面の傾きやめよう。空が見えなくなるので。

// スペースキーで停止、sキーでセーブ。記述。

const SKETCH_NAME = "torusAndSpheres";

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
// yawとcameraPosはuniformにして操作可能に
"uniform float yaw;" +
"uniform vec2 cameraPos;" +
"uniform float cameraHeight;" +
// トーラス用テクスチャ
"uniform sampler2D torusTex1;" +
// 円周率
"const float pi = 3.14159;" +
// 空と光源と床。
"uniform vec3 skyColor;" + // 空の色
"const vec3 c_sun = vec3(300.0, 100.0, 300.0);" + // 太陽の位置
"const float r_sun = 20.0;" + // 太陽の半径
"const vec3 sunColor = vec3(1.0, 0.9, 0.95);" + // 太陽の色
"const vec3 floorColor = vec3(0.33, 0.89, 0.55);" + // 床の色
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 水平回転
"mat3 get_yaw(float yaw){" +
"  mat3 m_yaw;" +
"  m_yaw[0] = vec3(cos(yaw), 0.0, sin(yaw));" +
"  m_yaw[1] = vec3(0.0, 1.0, 0.0);" +
"  m_yaw[2] = vec3(-sin(yaw), 0.0, cos(yaw));" +
"  return m_yaw;" +
"}" +
// fromEulerの独自修正版。(roll, pitch, yaw)で取得する。
"mat3 fromEuler(float roll, float pitch, float yaw){" +
"  vec2 a = vec2(cos(roll), sin(roll));" +
"  vec2 b = vec2(cos(pitch), sin(pitch));" +
"  vec2 c = vec2(cos(yaw), sin(yaw));" +
// 画面の横揺れ（roll）
"  mat3 m_roll;" +
"  m_roll[0] = vec3(a.x, a.y, 0.0);" +
"  m_roll[1] = vec3(-a.y, a.x, 0.0);" +
"  m_roll[2] = vec3(0.0, 0.0, 1.0);" +
// 縦揺れ（pitch）
"  mat3 m_pitch;" +
"  m_pitch[0] = vec3(1.0, 0.0, 0.0);" +
"  m_pitch[1] = vec3(0.0, b.x, b.y);" +
"  m_pitch[2] = vec3(0.0, -b.y, b.x);" +
// 水平回転（yaw）
"  mat3 m_yaw = get_yaw(yaw);" +
// m_roll, m_pitch, m_yawの順に適用される
"  return m_yaw * m_pitch * m_roll;" +
"}" +
// 双曲線関数
"float cosh(float x){" +
"  return 0.5 * (exp(x) + exp(-x));" +
"}" +
"float sinh(float x){" +
"  return 0.5 * (exp(x) - exp(-x));" +
"}" +
// v1, v2, alphaに対し、v1*cos(alpha)+v2*sin(alpha)を返す。
"vec3 combo(vec3 v1, vec3 v2, float alpha){" +
"  return v1 * cos(alpha) + v2 * sin(alpha);" +
"}" +
// 色のライティング処理
// bltが0.0に近いほど黒っぽく、1.0に近いほど白っぽく。うまくいった。
// 引数に対象となる点pとそこにおける法線normalを加えましょうか。
// 同じこといくつも書きたくないし。
"vec3 getLighting(vec3 p, vec3 normal, vec3 mainColor){" +
"  vec3 sunRay = normalize(c_sun - p);" +
"  float blt = max(0.0, dot(normal, sunRay));" +
// bltに応じて暗くしたり明るくしたりする。
"  return mix(mainColor * blt, sunColor, 1.0 - sqrt(1.0 - blt * blt));" +
"}" +
// タイルカラー
"vec3 getTileColor(vec2 u, float hue){" +
"  vec2 i = floor(u);" +
"  vec2 f = fract(u);" +
// 座標軸を暗くする
"  vec2 dark = smoothstep(-0.08, 0.0, u) - smoothstep(0.0, 0.08, u);" +
"  vec3 color;" +
// 2種類のタイルの色
"  vec3 floorColor_pale = mix(floorColor, vec3(1.0), 0.7);" +
// 隣接タイルが違う色になるように
"  color = floorColor + mod(i.x + i.y, 2.0) * (floorColor_pale - floorColor);" +
// 軸付近では暗くなるように
"  color = mix(color, vec3(0.0), min(dark.x + dark.y, 1.0));" +
"  return color;" +
"}" +
// 空の色を取得する感じ
"vec3 getSkyColor(vec3 ori, vec3 dir){" +
"  float y = dir.y + 0.05;" +
"  vec3 sky = mix(vec3(1.0), skyColor, sqrt(y * (2.0 - y)));" +
"  float tmp = dot(dir, c_sun - ori);" +
"  float distWithSun = length(c_sun - ori - tmp * dir);" +
"  float ratio = 1.0;" +
"  if(distWithSun > r_sun){ ratio = r_sun / distWithSun; }" +
"  vec3 sun = sunColor;" +
"  return mix(sky, sun, ratio);" +
"}" +
// 背景まとめ（空と床）
"vec3 getBackground(vec3 ori, vec3 dir){" +
"  if(dir.y > -0.05){" +
"    return getSkyColor(ori, dir);" +
"  }" +
"  float t = -ori.y / dir.y;" +
"  vec2 u = ori.xz + t * dir.xz;" +
"  return getTileColor(u, 0.33);" +
"}" +
// 球。
"float getSphere(vec3 ori, vec3 dir, vec3 c, float r){" +
"  float k_a = dot(ori - c, dir);" +
"  float k_b = dot(ori - c, ori - c) - r * r;" +
"  float L = k_a * k_a - k_b;" +
"  if(L < 0.0){ return -1.0; }" +
"  L = sqrt(L);" +
"  vec2 t = vec2(max(-L - k_a, 0.0), max(L - k_a, 0.0));" +
"  if(t.x > 0.0){ return t.x; }" +
"  else if(t.y > 0.0){ return t.y; }" +
"  else{ return -1.0; }" +
"}" +
// 球の描画
"void drawSphere(out vec4 drawer, vec3 ori, vec3 dir, vec3 c, float r, vec3 bodyColor){" +
"  float t_sph = getSphere(ori, dir, c, r);" +
"  if(t_sph < 0.0 || t_sph > drawer.w){ return; }" +
"  vec3 p = ori + t_sph * dir;" +
"  vec3 n = normalize(p - c);" +
"  vec3 sphereColor = getLighting(p, n, bodyColor);" +
"  drawer = vec4(sphereColor, t_sph);" +
"}" +
// 4x^3 - 3qx = rの解を求める。
"float getSub(float q, float r){" +
// rが0とみなせるならふつうに0.0やらqの平方根でやる。
"  if(abs(r) < 1e-10){" +
"    if(q < 0.0){ return 0.0; }" +
"    return 0.5 * sqrt(3.0 * q);" +
"  }" +
// 以降、|r|>0とする。符号をとっておく。
"  float sign_r = sign(r);" +
// qが0とみなせるなら3乗根を取ればよい
"  if(abs(q) < 1e-10){" +
"    return sign_r * pow(0.25 * abs(r), 1.0 / 3.0);" +
"  }" +
// 以降は|r|>0かつ|q|>0とする。
"  float d = r * r - q * q * q;" +  // 判別式
// この辺りの処理ではxの係数を変数変換で1にしている
"  float cf = sqrt(abs(q));" +
"  float h = abs(r) / pow(cf, 3.0);" +
// まず判別式が負の場合は三角関数解が得られる
"  if(d < 0.0){" +
"    float alpha = acos(sign_r * h) / 3.0;" +
"    return cf * cos(alpha);" +
"  }" +
// 判別式が0以上の場合は実数解はひとつなのでそれを
// 双曲線関数を用いて取得する
// qが正の時はコサインハイポ
"  if(q > 0.0){" +
"    float x = log(h + sqrt(h * h - 1.0)) / 3.0;" +
// rが負の時はマイナスを付ける
"    return sign_r * cf * cosh(x);" +
"  }" +
// qが負の時はサインハイポ
"  float x = log(h + sqrt(h * h + 1.0)) / 3.0;" +
"  return sign_r * cf * sinh(x);" +
"}" +
// 4次方程式の実数解を取得するパート。
// x^4 + 4(k3)x^3 + 4(k2)x^2 + 8(k1)x + 4(k0) = 0の解を求める
"vec4 solve4(float k3, float k2, float k1, float k0){" +
// あらかじめ-1.0で埋めておいて解が見つかったら置き換える感じ。
// どうせ正の数しか使わないでしょ
"  vec4 ans = vec4(-1.0);" +
// 変数変換してx^3の係数をなくす処理
// 具体的には解の和が0になるようにグラフの平行移動をしている
"  float c2 = (2.0 * k2 - 3.0 * k3 * k3) / 3.0;" +
"  float c1 = 2.0 * (k3 * k3 * k3 - k2 * k3 + k1);" +
"  float c0 = (-3.0 * pow(k3, 4.0) + 4.0 * k3 * k3 * k2 - 8.0 * k1 * k3 + 4.0 * k0) / 3.0;" +
// c1が0とみなせるなら退化として計算
"  if(abs(c1) < 1e-10){" +
"    if(3.0 * c2 * c2 < c0){ return ans; }" +
"    float beta = sqrt(9.0 * c2 * c2 - 3.0 * c0);" +
"    float alpha = -3.0 * c2;" +
"    if(alpha + beta >= 0.0){" +
"      ans.x = sqrt(alpha + beta) - k3;" +
"      ans.y = -sqrt(alpha + beta) - k3;" +
"    }" +
"    if(alpha - beta >= 0.0){" +
"      ans.z = sqrt(alpha - beta) - k3;" +
"      ans.w = -sqrt(alpha - beta) - k3;" +
"    }" +
"    return ans;" +
"  }" +
// 以下では|c1| > 0.0とする。続きは、帰ってから（えー）
"  float q = c0 + c2 * c2;" +
"  float r = c1 * c1 + c2 * c2 * c2 - 3.0 * c0 * c2;" +
// q, rに対して4x^3 - qx = rの解のうち最大の実数値を取る
"  float w = getSub(q, r);" +
// するとv = w - c2が正の数になる
"  float v = w - c2;" +
// vと係数から解を出す
"  float j = sqrt(v);" +
"  float h = c1 / j;" +
// 判別式
"  float d1 = -v - 3.0 * c2 - h;" +
"  float d2 = -v - 3.0 * c2 + h;" +
"  if(d1 >= 0.0){" +
"    d1 = sqrt(d1);" +
"    ans.x = j + d1 - k3;" +
"    ans.y = j - d1 - k3;" +
"  }" +
"  if(d2 >= 0.0){" +
"    d2 = sqrt(d2);" +
"    ans.z = -j + d2 - k3;" +
"    ans.w = -j - d2 - k3;" +
"  }" +
"  return ans;" +
"}" +
// トーラス。
// cは中心、nは法線ベクトル、aは軸半径、bは胴体半径。
"float getTorus(vec3 ori, vec3 dir, vec3 c, vec3 n, float a, float b){" +
// まずk3, k2, k1, k0を出す。
"  float q0 = dot(ori - c, ori - c);" +
"  float q1 = dot(ori - c, dir);" +
"  float q2 = pow(dot(ori - c, n), 2.0);" +
"  float q3 = dot(ori - c, n) * dot(dir, n);" +
"  float q4 = pow(dot(dir, n), 2.0);" +
"  float k = 0.5 * (q0 - a * a - b * b);" +
"  float k3 = q1;" +
"  float k2 = k + q1 * q1 + a * a * q4;" +
"  float k1 = q1 * k + a * a * q3;" +
"  float k0 = k * k - a * a * b * b + a * a * q2;" +
"  vec4 ans = solve4(k3, k2, k1, k0);" +
"  if(ans.x < 0.0 && ans.y < 0.0 && ans.z < 0.0 && ans.w < 0.0){ return -1.0; }" +
"  float t = 1e20;" +
"  if(ans.x >= 0.0){ t = min(t, ans.x); }" +
"  if(ans.y >= 0.0){ t = min(t, ans.y); }" +
"  if(ans.z >= 0.0){ t = min(t, ans.z); }" +
"  if(ans.w >= 0.0){ t = min(t, ans.w); }" +
"  return t;" +
"}" +
// 法線取得(pはトーラス上であることを仮定）
// 一般の4次曲面ではこうするしかないわけですが・・
// 方程式F(x) = (x^2 + y^2 + z^2 + a^2 - b^2)^2 - 4a^2(x^2 + y^2) = 0
// に対して関数Fのナブラベクトル∇F(p)の正規化を取っていますね。
// これだと駄目なので普通にq取れよ
"vec3 getNormalOfTorus(vec3 p, vec3 c, vec3 n, float a, float b){" +
"  vec3 q = c + normalize(p - c - dot(p - c, n) * n) * a;" +
"  return normalize(p - q);" +
"}" +
// tが取得できたのでトーラスを描画します。法線はどうしよう・・
// out忘れてた。描画できたが・・むぅぅ。
"void drawTorus(out vec4 drawer, vec3 ori, vec3 dir, vec3 c, vec3 n, float a, float b, vec3 bodyColor){" +
"  float t = getTorus(ori, dir, c, n, a, b);" +
"  if(t < 0.0 || t > drawer.w){ return; }" +
"  vec3 p = ori + t * dir;" +
"  vec3 normal = getNormalOfTorus(p, c, n, a, b);" +
"  vec3 torusColor = getLighting(p, normal, bodyColor);" +
"  drawer = vec4(torusColor, t);" +
"}" +
// トーラスにテクスチャを貼り付ける。
// nが上で、n1がx軸正方向、それに応じて奥の方がy軸正方向になるような
// 座標系の下で、反時計回り、かつ内側から外側に行くように角度がぐるっと
// 上側を通って下から戻ってくる0～2piみたいにして貼り付ける（わかる？）
// atan(y, x)使うから-pi～piになるかしらね。
"void drawTexturedTorus(out vec4 drawer, vec3 ori, vec3 dir, vec3 c, vec3 n, float a, float b, vec3 n1, sampler2D tex){" +
"  float t = getTorus(ori, dir, c, n, a, b);" +
"  if(t < 0.0 || t > drawer.w){ return; }" +
"  vec3 p = ori + t * dir;" +
// 二つの角度を求める。二度手間を避けるためnormalも一緒に出しちゃう。
"  vec3 q = c + normalize(p - c - dot(p - c, n) * n) * a;" +
"  vec3 normal = normalize(p - q);" + // これで法線！
// normalのn成分がyで中心方向成分がxでatanで第一角度。
"  float y1 = dot(normal, n);" +
"  float x1 = length(normal - y1 * n);" +
// x1の符号は中心寄りの時にプラス。
"  if(dot(normal, c - q) < 0.0){ x1 = -x1; }" +
"  float theta1 = atan(y1, x1);" +
// 次にn1を使ってq - cをn1成分とcross(n, n1)成分に分けてx2, y2.
"  float x2 = dot(q - c, n1);" +
"  float y2 = length(q - c - x2 * n1);" +
// y2の符号はcross(n, n1)と同じ方向の時にプラス。
"  if(dot(q - c, cross(n, n1)) < 0.0){ y2 = -y2; }" +
"  float theta2 = atan(y2, x2);" +
// 0～1の範囲に正規化する
"  vec2 co = (vec2(theta1, theta2) + pi) * 0.5 / pi;" +
"  vec3 color = texture2D(tex, co).rgb;" +
"  vec3 torusColor = getLighting(p, normal, color);" +
"  drawer = vec4(torusColor, t);" +
"}" +
// ようやくメインコード
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
"  float time = u_time * 2.7;" + // 実際に使うtime.
// roll（横揺れ）、pitch（縦揺れ）、yaw（視線方向）を作る
"  float phase = time * pi * 0.5;" +
"  float roll = sin(u_time * pi * 0.5) * pi * 0.05;" +
"  float pitch = (u_mouse.y / u_resolution.y - 0.5) * pi / 6.0;" +
// oriはカメラ位置、dirはピクセルに向かうベクトルの正規化（デフォは目の前1.6の所に-1.0～1.0）
"  float depth = 1.6;" +
// 上から見た時のz, xが通常の意味でのx, yであるためにこんなことになってるけど・・
// 普通にてっぺんがzの方が分かりやすいかも。
"  vec3 ori = vec3(cameraPos.y, cameraHeight, cameraPos.x);" +
// あーー、そうか、これカメラの向きがz軸負方向をデフォとしているのか・・・んー。
// 原点方向に修正したいなぁ。するべき？
// あっちさっきいじった、あれでいいんだよ。
"  vec3 dir = normalize(vec3(st.xy, -depth));" +
// 変換行列で視界をいじってdirに補正を掛ける
"  dir = fromEuler(roll, pitch, yaw) * normalize(dir);" +
// まず背景色（床と軸と太陽）を取得。そこに上書きしていく。
"  vec3 color = getBackground(ori, dir);" +
// これ以降はcolorとtを一つ組にしたdrawerというのを用意して使い回す。
// 今までのtは第4成分となる感じ。
"  vec4 drawer = vec4(color, 1e20);" +
"  float alpha = pi * 0.1;" +
"  float theta = u_time * pi;" +
"  vec3 c0 = vec3(0.0, 5.0, 0.0);" +
"  vec3 n0 = vec3(sin(alpha) * cos(theta), cos(alpha), sin(alpha) * sin(theta));" +
// トーラスの中に球を置きたいのです。
// 軸を法線ベクトルとし中心を通る平面上に球を配置。
// たがいに直交する2本(e1, e2)を取ればすべてはこれらの結合になる。
"  vec3 e1 = vec3(-sin(theta), 0.0, cos(theta));" +
"  vec3 e2 = vec3(cos(alpha) * cos(theta), -sin(alpha), cos(alpha) * sin(theta));" +
//"  drawTorus(drawer, ori, dir, c0, n0, 10.0, 2.0, vec3(0.7));" +
"  drawTexturedTorus(drawer, ori, dir, c0, n0, 10.0, 2.0, e1, torusTex1);" +
"  for(float i = 0.0; i < 10.0; i += 1.0){" +
"    vec3 color_sph = getHSB(i / 10.0, 1.0, 1.0);" +
"    vec3 e = combo(e1, e2, pi * 2.0 * i / 10.0);" +
// トーラスの周りをぐるぐるするようにしたいので、
// eとn0で結合を作る。
"    float psi = u_time * pi;" +
"    vec3 v0 = 10.0 * e + combo(n0, e, psi) * 3.0;" +
"    drawSphere(drawer, ori, dir, c0 + v0, 0.5, color_sph);" +
"    psi += pi * 2.0 / 3.0;" +
"    vec3 v1 = 10.0 * e + combo(n0, e, psi) * 3.0;" +
"    drawSphere(drawer, ori, dir, c0 + v1, 0.5, color_sph);" +
"    psi += pi * 2.0 / 3.0;" +
"    vec3 v2 = 10.0 * e + combo(n0, e, psi) * 3.0;" +
"    drawSphere(drawer, ori, dir, c0 + v2, 0.5, color_sph);" +
"  }" +
"  gl_FragColor = vec4(drawer.xyz, 1.0);" +
"}";

let texShader;

let vsTex =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fsTex =
"precision mediump float;" +
"uniform vec2 u_resolution;" +
// 色を変えられるようにしましょう。
"uniform float bodyHue;" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getHSB(float r, float g, float b){" +
"    vec3 c = vec3(r, g, b);" +
"    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"    rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"    return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// カントール処理のイテレーションを返す感じ。
// xは0.0～1.0であることが想定されている感じですかね。
"float getCantor(float x){" +
"  for(float n = 0.0; n < 10.0; n += 1.0){" +
"    x *= 3.0;" +
"    if(x > 1.0 && x < 2.0){ return n / 10.0; }" +
"    x = fract(x);" +
"  }" +
"  return 1.0;" +
"}" +
"void main(void){" +
"  vec2 st = (gl_FragCoord.xy * 0.5) / min(u_resolution.x, u_resolution.y);" +
"  float scale = 3.0;" +
"  st *= scale;" +
"  st -= 0.5 * (scale - 1.0);" + // 中心に移動する。できた・・
"  vec2 v = vec2(getCantor(st.x), getCantor(st.y));" +
"  vec3 color = getHSB(mod(bodyHue + 0.1 * v.x, 1.0), 1.0 - v.y, 1.0);" +
"  if(v.x > 0.9 || v.y > 0.9){ color = vec3(0.0); }" +
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCamera;
let myCanvas;
let myConfig;
let looping = true;

let cantorTexture;

function setup(){
  createCanvas(800, 640);
	myCanvas = createGraphics(640, 480, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
  myCamera = new CameraModule();
  myCamera.setCameraPos("axis", {x:11.66, y:28.37});
  myCamera.setDefaultCameraDirection()
	myConfig = new Config();
  cantorTexture = createCantorTexture();
}

function draw(){
	background(220);
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  myShader.setUniform("u_mouse", [constrain(mouseX, 0, myCanvas.width), height - constrain(mouseY, 0, myCanvas.height)]);
  myShader.setUniform("u_time", millis() / 1000);
  myCamera.update();
  myCamera.regist();
  myShader.setUniform("torusTex1", cantorTexture);
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
	image(myCanvas, 0, 0);
	myConfig.update();
	myConfig.draw();
}

// ---------------------------------------------------------------------------------------- //
// createtexture.

function createCantorTexture(){
  let gr = createGraphics(100, 100, WEBGL);
  texShader = gr.createShader(vsTex, fsTex);
  gr.shader(texShader);
  texShader.setUniform("u_resolution", [100, 100]);
  texShader.setUniform("bodyHue", 0.55);
  gr.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  return gr;
}

function changeCantorTextureColor(newHue){
  texShader.setUniform("bodyHue", newHue);
  cantorTexture.quad(-1, -1, -1, 1, 1, 1, 1, -1);
}

// ---------------------------------------------------------------------------------------- //
// camera.

// コンストラクタでカメラの位置を指定できるようにしただけ。
class CameraModule{
  constructor(){
    this.cameraPos = createVector();
    this.yaw = 0.0;
    this.cameraSpeed = 0.3;
    this.cameraHeight = 4.0;
  }
  setCameraPos(_type, param){
    switch(_type){
      case "axis":
        this.cameraPos.set(param.x, param.y);
        break;
      case "pole":
        this.cameraPos.set(param.r * cos(param.t), param.r * sin(param.t));
        break;
    }
  }
  setDefaultCameraDirection(){
    this.defaultCameraDirection = atan2(this.cameraPos.y, this.cameraPos.x);
  }
	getCameraPos(){ return this.cameraPos; }
	getCameraHeight(){ return this.cameraHeight; }
	getYaw(){ return this.yaw; }
	inCanvas(){
		// マウスがキャンバス内にあるかどうか調べるだけ
		if(mouseX < 0 || mouseY < 0){ return false; }
		if(mouseX > myCanvas.width || mouseY > myCanvas.height){ return false; }
		return true;
	}
  update(){
		// ここにデフォルト値を加えたりしてカメラが・・んー。
		// なるほど。デフォをいくら変更してもここで決まっちゃう以上どうしようもないわけだ。
		// デフォルトのyawを原点方向に修正。
		// カメラの向きのデフォルトがz軸負方向になってて、それをyawでいじる形になってる。
    if(this.inCanvas()){
      this.yaw = constrain(mouseX / myCanvas.width, 0.0, 1.0) * 4.0 * Math.PI - this.defaultCameraDirection;
      if(mouseIsPressed){
        let velocity = createVector(-cos(this.yaw), sin(this.yaw)).mult(this.cameraSpeed);
        this.cameraPos.add(velocity);
      }
    }
    if(keyIsDown(UP_ARROW)){ this.cameraHeight += 0.1; }
    else if(keyIsDown(DOWN_ARROW)){ this.cameraHeight -= 0.1; }
    this.cameraHeight = constrain(this.cameraHeight, 2.0, 12.0);
  }
  regist(){
    myShader.setUniform("yaw", this.yaw);
    myShader.setUniform("cameraPos", [this.cameraPos.x, this.cameraPos.y]);
    myShader.setUniform("cameraHeight", this.cameraHeight);
  }
}

// ---------------------------------------------------------------------------------------- //
// config.
// とりあえず背景色変えたいね。

class Config{
	constructor(){
		this.board = createGraphics(800, 160);
		this.board.textSize(15);
		this.setOffSet(0, 480);
		this.prepareSlider();
	}
	setOffSet(offSetX, offSetY){
		this.offSetX = offSetX;
		this.offSetY = offSetY;
	}
	prepareSlider(){
		this.mySliderSet = new SliderSet();
    // 背景色変更用スライダー
		let cur1 = new Cursor("circle", {r:10}, 1.1, color("red"));
		let sld1 = new LineSlider(0.0, 1.0, cur1, createVector(300, 60), createVector(428, 60));
		let cur2 = new Cursor("circle", {r:10}, 1.1, color("green"));
		let sld2 = new LineSlider(0.0, 1.0, cur2, createVector(300, 100), createVector(428, 100));
		let cur3 = new Cursor("circle", {r:10}, 1.1, color("blue"));
		let sld3 = new LineSlider(0.0, 1.0, cur3, createVector(300, 140), createVector(428, 140));
    // トーラスの模様の色を変更するスライダー
    // そのうちボタンで模様のパターン変更とかしてみたい
    let cur4 = new Cursor("rect", {w:15, h:30}, 1.1, color("black"));
    let sld4 = new LineSlider(0.0, 1.0, cur4, createVector(460, 130), createVector(600, 130));
		this.mySliderSet.registMulti(["red", "green", "blue", "bodyHue"], [sld1, sld2, sld3, sld4]);
		this.mySliderSet.initialize(this.offSetX, this.offSetY);
		this.mySliderSet.setValueMulti(["red", "green", "blue", "bodyHue"], [0.00, 0.63, 0.91, 0.55]);
	}
	drawText(){
		let gr = this.board;
		const {x:z, y:x} = myCamera.getCameraPos();
		const y = myCamera.getCameraHeight();
		gr.text("cameraPos", 15, 30);
	  gr.text("x:" + x.toFixed(2), 15, 55);
	  gr.text("y:" + y.toFixed(2), 15, 80);
	  gr.text("z:" + z.toFixed(2), 15, 105);
	  gr.text("mouseDown:go forward.", 15, 130);
	  gr.text("up/downKey:change height.", 15, 155);
	  // この補正により、きちんとしたカメラ方向の角度になる。
	  gr.text("cameraDir:" + ((540 - floor(myCamera.getYaw() * 180 / Math.PI)) % 360) + "°", 120, 30);
		gr.text("skyColor", 300, 30);
    gr.text("freeze: space key", 460, 30);
    gr.text("image_save: s key", 460, 55);
    gr.text("bodyColorChangeSlider", 460, 100);
	}
	update(){
	  this.mySliderSet.update();
    let skyColor_r = this.mySliderSet.getValue("red");
		let skyColor_g = this.mySliderSet.getValue("green");
		let skyColor_b = this.mySliderSet.getValue("blue");
    if(mouseIsPressed){
      let bodyHue = this.mySliderSet.getValue("bodyHue");
      changeCantorTextureColor(bodyHue);
    }
		myShader.setUniform("skyColor", [skyColor_r, skyColor_g, skyColor_b]);
	}
	draw(){
		this.board.background(180);
		this.drawText();
		this.mySliderSet.draw(this.board);
		image(this.board, this.offSetX, this.offSetY);
	}
}

// ---------------------------------------------------------------------------------------- //
// Cursor and Slider.
// サイズ変更用のカーソルとスライダー。

// 使い方。
// 先にカーソルをサイズや形、色指定して生成する。
// それを元にスライダーを生成。形状はとりあえず直線が用意してある。
// mousePressedでactivateしてmouseReleasedでinActivateするだけ。
// 使う前にinitializeでカーソルの位置を調整するの忘れずに。
// 値の取得はgetValueでminとmaxの値に応じて返されるのでそれを使って何でもできる。
// 気になるなら値の取得をmouseIsPressedの間だけにすればいい。以上。

// コンフィグエリアが指定されてその上に描画することが多いと思うのでそういう前提で書いてる・・悪しからず。

// offSetX, offSetYのプロパティを追加。コンフィグエリアの位置情報がないとhitをきちんと実行できない。

// スライダー。
class Slider{
  constructor(minValue, maxValue, cursor){
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.cursor = cursor;
    this.active = false;
  }
  initialize(offSetX, offSetY){
    /* カーソルの初期位置を決める */
    // offSetX, offSetYはスライダーを置くエリアのleftとtopに当たるポイント。hitのところであれする。
    this.offSetX = offSetX;
    this.offSetY = offSetY;
  }
  activate(){
    // マウス位置がカーソルにヒットしなければactiveにしない。
    if(!this.cursor.hit(mouseX - this.offSetX, mouseY - this.offSetY)){ return; }
    this.active = true;
  }
  inActivate(){
    this.active = false;
  }
  getValue(){ /* カーソルの位置と自身のレールデータから値を取り出す処理。形状による。 */ }
  update(){ /* activeであればmouseIsPressedである限りカーソルの位置を更新し続ける */ }
  draw(gr){ /* レールの形状がスライダーによるのでここには何も書けない */ }
}

// startとendは位置ベクトルで、それぞれがminとmaxに対応する。
class LineSlider extends Slider{
  constructor(minValue, maxValue, cursor, start, end){
    super(minValue, maxValue, cursor);
    this.start = start;
    this.end = end;
    this.length = p5.Vector.dist(start, end);
    this.lineWeight = 3.0;
  }
  initialize(offSetX, offSetY){
    super.initialize(offSetX, offSetY);
    // start位置におく。
    this.cursor.setPosition(this.start.x, this.start.y);
  }
  getValue(){
    // cursorのpositionのstartとendに対する相対位置の割合(prg)からvalueを割り出す。
    const prg = p5.Vector.dist(this.start, this.cursor.position) / this.length;
    return this.minValue * (1 - prg) + this.maxValue * prg;
  }
  setValue(newValue){
		// 値を直接決める（デフォルト値を設定するのに使う）
		let ratio = (newValue - this.minValue) / (this.maxValue - this.minValue);
		let cursorPos = p5.Vector.lerp(this.start, this.end, ratio);
		this.cursor.setPosition(cursorPos.x, cursorPos.y);
	}
  update(){
    if(!this.active){ return; }
    // マウス位置から垂線を下ろしてratioを割り出す。ratioはconstrainで0以上1以下に落とす。
    const mousePosition = createVector(mouseX - this.offSetX, mouseY - this.offSetY);
    let ratio = p5.Vector.dot(p5.Vector.sub(this.start, this.end), p5.Vector.sub(this.start, mousePosition)) / pow(this.length, 2);
    ratio = constrain(ratio, 0, 1);
    const newPos = p5.Vector.add(p5.Vector.mult(this.start, 1 - ratio), p5.Vector.mult(this.end, ratio));
    this.cursor.setPosition(newPos.x, newPos.y);
  }
  draw(gr){
    gr.stroke(0);
    gr.strokeWeight(this.lineWeight);
    gr.line(this.start.x, this.start.y, this.end.x, this.end.y);
    gr.noStroke();
    this.cursor.draw(gr);
  }
}
// カーソル。
class Cursor{
  constructor(type, param, marginFactor = 1.0, cursorColor = color(0)){
    this.type = type;
    this.position = createVector();
    this.param = param;
    this.marginFactor = marginFactor; // マウスダウン位置がカーソルの当たり判定からはみ出していても大丈夫なように。
    // たとえば1.1なら|x-mouseX|<(w/2)*1.1までOKとかそういうの。円形なら・・分かるよね。
    this.cursorColor = cursorColor; // カーソルの色。
    // offSetXとoffSetYは中心からgraphicの描画位置までの距離。
    switch(type){
      case "rect":
        this.offSetX = param.w * 0.5;
        this.offSetY = param.h * 0.5;
        break;
      case "circle":
        this.offSetX = param.r;
        this.offSetY = param.r;
        break;
    }
    this.graphic = this.createCursorGraphic();
  }
  createCursorGraphic(){
    // とりあえず単純に（あとできちんとやる）
    switch(this.type){
      case "rect":
        return createRectCursorGraphic(this.param.w, this.param.h, this.cursorColor);
      case "circle":
        return createCircleCursorGraphic(this.param.r, this.cursorColor);
    }
    return gr;
  }
  setPosition(x, y){
    this.position.set(x, y);
  }
  hit(x, y){
    const {x:px, y:py} = this.position;
    switch(this.type){
      case "rect":
        return abs(x - px) < this.param.w * 0.5 * this.marginFactor && abs(y - py) < this.param.h * 0.5 * this.marginFactor;
      case "circle":
        return pow(x - px, 2) + pow(y - py, 2) < pow(this.param.r * this.marginFactor, 2);
    }
  }
  draw(gr){
    gr.image(this.graphic, this.position.x - this.offSetX, this.position.y - this.offSetY);
  }
}

// RectCursorの描画用
function createRectCursorGraphic(w, h, cursorColor){
  let gr = createGraphics(w, h);
  gr.noStroke();
  const edgeSize = min(w, h) * 0.1;
  const bodyColor = cursorColor;
  gr.fill(lerpColor(bodyColor, color(255), 0.4));
  gr.rect(0, 0, w, h);
  gr.fill(lerpColor(bodyColor, color(0), 0.4));
  gr.rect(edgeSize, edgeSize, w - edgeSize, h - edgeSize);
  for(let i = 0; i < 50; i++){
    gr.fill(lerpColor(bodyColor, color(255), 0.5 * (i / 50)));
    gr.rect(edgeSize + (w/2 - edgeSize) * (i / 50), edgeSize + (h/2 - edgeSize) * (i / 50),
            (w - 2 * edgeSize) * (1 - i / 50), (h - 2 * edgeSize) * (1 - i / 50));
  }
  return gr;
}

// CircleCursorの描画用
function createCircleCursorGraphic(r, cursorColor){
  let gr = createGraphics(r * 2, r * 2);
  gr.noStroke();
  const bodyColor = cursorColor;
  for(let i = 0; i < 50; i++){
    gr.fill(lerpColor(bodyColor, color(255), 0.5 * (i / 50)));
    gr.circle(r, r, 2 * r * (1 - i / 50));
  }
  return gr;
}

// dictって走査できないから一長一短なんだけど、
// ボタンと違ってスライダーは個別性が強いからね、キーで取得した方がいいのよ。
// あほみたいな似たような記述の羅列はどうにかでき・・るんだよね。確か。
// そうです。...argsを使うとできちゃうんです・・すごいね。
class SliderSet{
  constructor(){
    this.sliderDict = {}; // キーで取得する。
    this.keyArray = []; // キー配列がないと走査が大変。
  }
  regist(_key, _slider){
    // キーの値で登録！
    this.sliderDict[_key] = _slider;
    this.keyArray.push(_key);
  }
  registMulti(keyArray, sliderArray){
    for(let i = 0; i < keyArray.length; i++){
      this.sliderDict[keyArray[i]] = sliderArray[i];
      this.keyArray.push(keyArray[i])
    }
  }
  every(methodName, args = []){
    for(let _key of this.keyArray){ this.sliderDict[_key][methodName](...args); }
  }
  initialize(offSetX, offSetY){
    this.every("initialize", [offSetX, offSetY]);
  }
  setValue(_key, value){
		// _keyでスライダーを取得してvalueの値をセットする。
		this.sliderDict[_key].setValue(value);
	}
  setValueMulti(keyArray, valueArray){
    // まとめて値を設定する感じね。
    for(let i = 0; i < keyArray.length; i++){
      this.sliderDict[keyArray[i]].setValue(valueArray[i]);
    }
  }
  activate(){
    this.every("activate");
  }
  inActivate(){
    this.every("inActivate");
  }
  getValue(_key){
    return this.sliderDict[_key].getValue();
  }
  update(){
    this.every("update");
  }
  draw(gr){
    this.every("draw", [gr]);
  }
}

// ---------------------------------------------------------------------------------------- //
// interaction.

function mousePressed(){
	myConfig.mySliderSet.activate();
}

function mouseReleased(){
	myConfig.mySliderSet.inActivate();
}

// loop.
function keyTyped(){
  if(keyCode === 32){
    // スペースキーでセーブ
    if(looping){ noLoop(); looping = false; }else{ loop(); looping = true; }
  }else if(key === 's'){
    // sキーで保存(累計秒数で分ける)
    const _second = hour() * 60 * 60 + minute() * 60 + second();
    myCanvas.save("pict_" + SKETCH_NAME + "_" + _second + ".png");
  }
}
