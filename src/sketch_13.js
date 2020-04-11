// ocean2の写経

let fs =
"precision mediump float;" +
// 円周率
"const float PI	 	= 3.14159265358;" +
// 微小定数
"const float EPSILON	= 1e-3;" +
// レイマーチングの繰り返し回数みたい
"const int NUM_STEPS = 6;" +
// 波のheightmapについてごちゃごちゃ
"const int ITER_GEOMETRY = 2;" +
"const int ITER_FRAGMENT = 5;" +
// 波の物理特性
"const float SEA_HEIGHT = 0.5;" +
"const float SEA_CHOPPY = 3.0;" +
"const float SEA_SPEED = 1.9;" +
"const float SEA_FREQ = 0.24;" +
"const vec3 SEA_BASE = vec3(0.11,0.19,0.22);" +
"const vec3 SEA_WATER_COLOR = vec3(0.55,0.9,0.7);" +
// 波の表面をなんか変換するみたいな（permute?）
"mat2 octave_m = mat2(1.7,1.2,-1.2,1.4);" +
// スペースキーが押されるたびにフラグが反転する。これはCPU側で何とかしましょう。
//"const float KEY_SP    = 32.5/256.0;"
"uniform bool SPACE_KEY_FLAG;" +
// RGBをHSV値に変換する関数
"vec3 rgb2hsv(vec3 c){" +
"  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);" +
"  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));" +
"  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));" +
"  float d = q.x - min(q.w, q.y);" +
"  float e = 1.0e-10;" +
"  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);" +
"}" +
// HSV値をRGB値に変換する関数
"vec3 hsv2rgb(vec3 c){" +
"  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);" +
"  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);" +
"  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);" +
"}" +
// オイラー角を行列に変換しているらしい
// bteitler: Turn a vector of Euler angles into a rotation matrix
"mat3 fromEuler(vec3 ang){" +
"  vec2 a1 = vec2(sin(ang.x), cos(ang.x));" +
"  vec2 a2 = vec2(sin(ang.y), cos(ang.y));" +
"  vec2 a3 = vec2(sin(ang.z), cos(ang.z));" +
"  mat3 m;" +
"  m[0] = vec3(a1.y * a3.y + a1.x * a2.x * a3.x, a1.y * a2.x * a3.x + a3.y * a1.x, -a2.y * a3.x);" +
"	 m[1] = vec3(-a2.y * a1.x, a1.y * a2.y, a2.x);" +
"	 m[2] = vec3(a3.y * a1.x * a2.x + a1.y * a3.x, a1.x * a3.x - a1.y * a3.y * a2.x, a2.y * a3.y);" +
"	 return m;" +
"}" +
// 普通のランダム
"float hash(vec2 p ){" +
"  float h = dot(p,vec2(127.1,311.7));" +
"  return fract(sin(h)*83758.5453123);" +
"}" +
// 2次元のパーリンノイズ（グラディエントではないノイズ・・内積取らない。普通のランダム値補間）
"float noise(vec2 p){" +
"  vec2 i = floor(p);" +
"  vec2 f = fract(p);" +
"  vec2 u = f * f * (3.0 - 2.0 * f);" +
"  float n_00 = hash(i + vec2(0.0, 0.0))" +
"  float n_01 = hash(i + vec2(0.0, 1.0))" +
"  float n_10 = hash(i + vec2(1.0, 0.0))" +
"  float n_11 = hash(i + vec2(1.0, 1.0))" +
"  return -1.0 + 2.0 * mix(mix(n_00, n_10, u.x), mix(n_01, n_11, u.x), u.y);" +
"}" +
// bteitler: diffuse lighting calculation - could be tweaked to taste
// lighting ここよくわかんないけどdiffuseっていう効果らしい。pは累乗。
"float diffuse(vec3 n, vec3 l, float p){" +
"  return pow(dot(n,l) * 0.4 + 0.6, p);" +
"}" +
// bteitler: specular lighting calculation - could be tweaked taste
// ここよくわかんないけどspecularっていう効果らしい
"float specular(vec3 n, vec3 l, vec3 e, float s){" +
"  float nrm = (s + 8.0) / (3.1415 * 8.0);" +
"  return pow(max(dot(reflect(e, n), l), 0.0), s) * nrm;" +
"}" +
// bteitler: Generate a smooth sky gradient color based on ray direction's Y value
// sky
// 空の色を作ってる
"vec3 getSkyColor(vec3 e){" +
"  e.y = max(e.y, 0.0);" +
"  vec3 ret;" +
"  ret.x = pow(1.0 - e.y, 2.0);" +
"  ret.y = 1.0 - e.y;" +
"  ret.z = 0.6 + (1.0 - e.y) * 0.4;" +
"  return ret;" +
"}" +
// sea
"float sea_octave(vec2 uv, float choppy){" +
"  uv += noise(uv);" +
// y = |sin(x)|のグラフをイメージする
"  vec2 wv = 1.0 - abs(sin(uv));" +
// y = |cos(x)|のグラフをイメージする
"  vec2 swv = abs(cos(uv));" +
"  wv = mix(wv,swv,wv);" +
"  return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);" +
"}" +
// bteitler: Compute the distance along Y axis of a point to the surface of the ocean
// using a low(er) resolution ocean height composition function (less iterations).
"float map(vec3 p){" +
"  float freq = SEA_FREQ;" +
"  float amp = SEA_HEIGHT;" +
"  float choppy = SEA_CHOPPY;" +
"  vec2 uv = p.xz;" +
"  uv.x *= 0.75;" +
"  float d, h = 0.0;" +
"  for(int i = 0; i < ITER_GEOMETRY; i++) {" +
// bteitler: start out with our 2D symmetric wave at the current frequency
"    float SEA_TIME = u_time * SEA_SPEED;" +
"    d = sea_octave((uv + SEA_TIME) * freq, choppy);" +
// bteitler: stack wave ontop of itself at an offset that varies over time for more height and wave pattern variance
//d += sea_octave((uv-SEA_TIME)*freq,choppy);
"    h += d * amp;" +
"    uv *=  octave_m;" +
"    freq *= 1.9;" +
"    amp *= 0.22;" +
"    choppy = mix(choppy,1.0,0.2);" +
"  }" +
"  return p.y - h;" +
"}" +
// bteitler: Compute the distance along Y axis of a point to the surface of the ocean
// using a high(er) resolution ocean height composition function (more iterations).
"float map_detailed(vec3 p) {" +
"  float freq = SEA_FREQ;" +
"  float amp = SEA_HEIGHT;" +
"  float choppy = SEA_CHOPPY;" +
"  vec2 uv = p.xz;" +
"  uv.x *= 0.75;" +
"  float d, h = 0.0;" +
"  for(int i = 0; i < ITER_FRAGMENT; i++){" +
"    float SEA_TIME = u_time * SEA_SPEED;" +
// bteitler: start out with our 2D symmetric wave at the current frequency
"    d = sea_octave((uv + SEA_TIME) * freq, choppy);" +
// bteitler: stack wave ontop of itself at an offset that varies over time for more height and wave pattern variance
"    d += sea_octave((uv - SEA_TIME) * freq, choppy);" +
"    h += d * amp;" +
// bteitler: Bump our height by the current wave function
"    uv *= octave_m / 1.2;" +
"    freq *= 1.9;" + // bteitler: Exponentially increase frequency every iteration (on top of our permutation)
"    amp *= 0.22;" + // bteitler: Lower the amplitude every frequency, since we are adding finer and finer detail
// bteitler: finally, adjust the choppy parameter which will effect our base 2D sea_octave shape a bit.  This makes
// the "waves within waves" have different looking shapes, not just frequency and offset
"    choppy = mix(choppy,1.0,0.2);" +
"  }" +
"  return p.y - h;" +
"}" +
// bteitler:
// p: point on ocean surface to get color for
// n: normal on ocean surface at <p>
// l: light (sun) direction
// eye: ray direction from camera position for this pixel
// dist: distance from camera to point <p> on ocean surface
"vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist){" +
// bteitler: Fresnel is an exponential that gets bigger when the angle between ocean
// surface normal and eye ray is smaller
"  float fresnel = 1.0 - max(dot(n,-eye),0.0);" +
"  fresnel = pow(fresnel,3.0) * 0.45;" +
// bteitler: Bounce eye ray off ocean towards sky, and get the color of the sky
"  vec3 reflected = getSkyColor(reflect(eye, n)) * 0.99;" +
    // bteitler: refraction effect based on angle between light surface normal
"  vec3 refracted = SEA_BASE + diffuse(n,l,80.0) * SEA_WATER_COLOR * 0.27;" +
    // bteitler: blend the refracted color with the reflected color based on our fresnel term
"  vec3 color = mix(refracted,reflected,fresnel);" +
    // bteitler: Apply a distance based attenuation factor which is stronger
    // at peaks
"  float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);" +
"  color += SEA_WATER_COLOR * (p.y - SEA_HEIGHT) * 0.15 * atten;" +
    // bteitler: Apply specular highlight
"  color += vec3(specular(n, l, eye, 90.0)) * 0.5;" +
"  return color;" +
"}" +
// bteitler: Estimate the normal at a point <p> on the ocean surface using a slight more detailed
// ocean mapping function (using more noise octaves).
// Takes an argument <eps> (stands for epsilon) which is the resolution to use
// for the gradient.  See here for more info on gradients: https://en.wikipedia.org/wiki/Gradient
// tracing
"vec3 getNormal(vec3 p, float eps){" +
    // bteitler: Approximate gradient.  An exact gradient would need the "map" / "map_detailed" functions
    // to return x, y, and z, but it only computes height relative to surface along Y axis.  I'm assuming
    // for simplicity and / or optimization reasons we approximate the gradient by the change in ocean
    // height for all axis.
"  vec3 n;" +
"  n.y = map_detailed(p);" + // bteitler: Detailed height relative to surface, temporarily here to save a variable?
"  n.x = map_detailed(vec3(p.x + eps, p.y, p.z)) - n.y; " + // bteitler approximate X gradient as change in height along X axis delta
"  n.z = map_detailed(vec3(p.x, p.y, p.z + eps)) - n.y;" + // bteitler approximate Z gradient as change in height along Z axis delta
    // bteitler: Taking advantage of the fact that we know we won't have really steep waves, we expect
    // the Y normal component to be fairly large always.  Sacrifices yet more accurately to avoid some calculation.
"    n.y = eps;" +
"    return normalize(n);" +
    // bteitler: A more naive and easy to understand version could look like this and
    // produces almost the same visuals and is a little more expensive.
    // vec3 n;
    // float h = map_detailed(p);
    // n.y = map_detailed(vec3(p.x,p.y+eps,p.z)) - h;
    // n.x = map_detailed(vec3(p.x+eps,p.y,p.z)) - h;
    // n.z = map_detailed(vec3(p.x,p.y,p.z+eps)) - h;
    // return normalize(n);
"}" +

// bteitler: Find out where a ray intersects the current ocean
float heightMapTracing(vec3 ori, vec3 dir, out vec3 p) {
    float tm = 0.0;
    float tx = 500.0; // bteitler: a really far distance, this could likely be tweaked a bit as desired

    // bteitler: At a really far away distance along the ray, what is it's height relative
    // to the ocean in ONLY the Y direction?
    float hx = map(ori + dir * tx);

    // bteitler: A positive height relative to the ocean surface (in Y direction) at a really far distance means
    // this pixel is pure sky.  Quit early and return the far distance constant.
    if(hx > 0.0) return tx;

    // bteitler: hm starts out as the height of the camera position relative to ocean.
    float hm = map(ori + dir * tm);

    // bteitler: This is the main ray marching logic.  This is probably the single most confusing part of the shader
    // since height mapping is not an exact distance field (tells you distance to surface if you drop a line down to ocean
    // surface in the Y direction, but there could have been a peak at a very close point along the x and z
    // directions that is closer).  Therefore, it would be possible/easy to overshoot the surface using the raw height field
    // as the march distance.  The author uses a trick to compensate for this.
    float tmid = 0.0;
    for(int i = 0; i < NUM_STEPS; i++) { // bteitler: Constant number of ray marches per ray that hits the water
        // bteitler: Move forward along ray in such a way that has the following properties:
        // 1. If our current height relative to ocean is higher, move forward more
        // 2. If the height relative to ocean floor very far along the ray is much lower
        //    below the ocean surface, move forward less
        // Idea behind 1. is that if we are far above the ocean floor we can risk jumping
        // forward more without shooting under ocean, because the ocean is mostly level.
        // The idea behind 2. is that if extruding the ray goes farther under the ocean, then
        // you are looking more orthgonal to ocean surface (as opposed to looking towards horizon), and therefore
        // movement along the ray gets closer to ocean faster, so we need to move forward less to reduce risk
        // of overshooting.
        tmid = mix(tm,tx, hm/(hm-hx));
        p = ori + dir * tmid;

    	float hmid = map(p); // bteitler: Re-evaluate height relative to ocean surface in Y axis

        if(hmid < 0.0) { // bteitler: We went through the ocean surface if we are negative relative to surface now
            // bteitler: So instead of actually marching forward to cross the surface, we instead
            // assign our really far distance and height to be where we just evaluated that crossed the surface.
            // Next iteration will attempt to go forward more and is less likely to cross the boundary.
            // A naive implementation might have returned <tmid> immediately here, which
            // results in a much poorer / somewhat indeterministic quality rendering.
            tx = tmid;
            hx = hmid;
        } else {
            // Haven't hit surface yet, easy case, just march forward
            tm = tmid;
            hm = hmid;
        }
    }

    // bteitler: Return the distance, which should be really close to the height map without going under the ocean
    return tmid;
}

// main
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    // bteitler: 2D Pixel location passed in as raw pixel, let's divide by resolution
    // to convert to coordinates between 0 and 1
    vec2 uv = fragCoord.xy / iResolution.xy;

    uv = uv * 2.0 - 1.0; //  bteitler: Shift pixel coordinates from 0 to 1 to between -1 and 1
    uv.x *= iResolution.x / iResolution.y; // bteitler: Aspect ratio correction - if you don't do this your rays will be distorted
    float time = iTime * 2.7; // bteitler: Animation is based on time, but allows you to scrub the animation based on mouse movement

    // ray

    // bteitler: Calculated a vector that smoothly changes over time in a sinusoidal (wave) pattern.
    // This will be used to drive where the user is looking in world space.
   // vec3 ang = vec3(sin(time*3.0)*0.1,sin(time)*0.2+0.3,time);
    float roll = PI + sin(iTime)/14.0 + cos(iTime/2.0)/14.0 ;
    float pitch = PI*1.021 + (sin(iTime/2.0)+ cos(iTime))/40.0
        + (iMouse.y/iResolution.y - .8)*PI/3.0  ;
    float yaw = iMouse.x/iResolution.x * PI * 4.0;
    vec3 ang = vec3(roll,pitch,yaw);
   // vec3 ang = vec3(roll,pitch,0);

    // bteitler: Calculate the "origin" of the camera in world space based on time.  Camera is located
    // at height 3.5 atx 0 (zero), and flies over the ocean in the z axis over time.
    vec3 ori = vec3(0.0,3.5,time*3.0);

    // bteitler: This is the ray direction we are shooting from the camera location ("ori") that we need to light
    // for this pixel.  The -2.0 indicates we are using a focal length of 2.0 - this is just an artistic choice and
    // results in about a 90 degree field of view.
    //  CaliCoastReplay :  Adjusted slightly to a lower focal length.  Seems to dramatize the scene.
    vec3 dir = normalize(vec3(uv.xy,-1.6));

    // bteitler: Distort the ray a bit for a fish eye effect (if you remove this line, it will remove
    // the fish eye effect and look like a realistic perspective).
   //  dir.z += length(uv) * 0.15;

    // bteitler: Renormalize the ray direction, and then rotate it based on the previously calculated
    // animation angle "ang".  "fromEuler" just calculates a rotation matrix from a vector of angles.
    // if you remove the " * fromEuler(ang)" part, you will disable the camera rotation animation.
    dir = normalize(dir) * fromEuler(ang);

    // tracing

    // bteitler: ray-march to the ocean surface (which can be thought of as a randomly generated height map)
    // and store in p
    vec3 p;
    heightMapTracing(ori,dir,p);

    vec3 dist = p - ori; // bteitler: distance vector to ocean surface for this pixel's ray

    // bteitler: Calculate the normal on the ocean surface where we intersected (p), using
    // different "resolution" (in a sense) based on how far away the ray traveled.  Normals close to
    // the camera should be calculated with high resolution, and normals far from the camera should be calculated with low resolution
    // The reason to do this is that specular effects (or non linear normal based lighting effects) become fairly random at
    // far distances and low resolutions and can cause unpleasant shimmering during motion.
    float EPSILON_NRM = 0.5 / u_resolution.x;
    vec3 n = getNormal(p,
             dot(dist,dist)   // bteitler: Think of this as inverse resolution, so far distances get bigger at an expnential rate
                * EPSILON_NRM // bteitler: Just a resolution constant.. could easily be tweaked to artistic content
           );

    // bteitler: direction of the infinitely far away directional light.  Changing this will change
    // the sunlight direction.
    vec3 light = normalize(vec3(0.0,1.0,0.8));

    // CaliCoastReplay:  Get the sky and sea colors
	vec3 skyColor = getSkyColor(dir);
    vec3 seaColor = getSeaColor(p,n,light,dir,dist);

    //Sea/sky preprocessing

    //CaliCoastReplay:  A distance falloff for the sea color.   Drastically darkens the sea,
    //this will be reversed later based on day/night.
    seaColor /= sqrt(sqrt(length(dist))) ;


    //CaliCoastReplay:  Day/night mode
    bool night;
    if( isKeyPressed(KEY_SP) > 0.0 )    //night mode!
    {
        //Brighten the sea up again, but not too bright at night
    	seaColor *= seaColor * 8.5;

        //Turn down the sky
    	skyColor /= 1.69;

        //Store that it's night mode for later HSV calcc
        night = true;
    }
    else  //day mode!
    {
        //Brighten the sea up again - bright and beautiful blue at day
    	seaColor *= sqrt(sqrt(seaColor)) * 4.0;
        skyColor *= 1.05;
        skyColor -= 0.03;
        night = false;
    }


    //CaliCoastReplay:  A slight "constrasting" for the sky to match the more contrasted ocean
    skyColor *= skyColor;


    //CaliCoastReplay:  A rather hacky manipulation of the high-value regions in the image that seems
    //to add a subtle charm and "sheen" and foamy effect to high value regions through subtle darkening,
    //but it is hacky, and not physically modeled at all.
    vec3 seaHsv = rgb2hsv(seaColor);
    if (seaHsv.z > .75 && length(dist) < 50.0)
       seaHsv.z -= (0.9 - seaHsv.z) * 1.3;
    seaColor = hsv2rgb(seaHsv);

    // bteitler: Mix (linear interpolate) a color calculated for the sky (based solely on ray direction) and a sea color
    // which contains a realistic lighting model.  This is basically doing a fog calculation: weighing more the sky color
    // in the distance in an exponential manner.

    vec3 color = mix(
        skyColor,
        seaColor,
    	pow(smoothstep(0.0,-0.05,dir.y), 0.3) // bteitler: Can be thought of as "fog" that gets thicker in the distance
    );

    // Postprocessing

    // bteitler: Apply an overall image brightness factor as the final color for this pixel.  Can be
    // tweaked artistically.
    fragColor = vec4(pow(color,vec3(0.75)), 1.0);

    // CaliCoastReplay:  Adjust hue, saturation, and value adjustment for an even more processed look
    // hsv.x is hue, hsv.y is saturation, and hsv.z is value
    vec3 hsv = rgb2hsv(fragColor.xyz);
    //CaliCoastReplay: Increase saturation slightly
    hsv.y += 0.131;
    //CaliCoastReplay:
    //A pseudo-multiplicative adjustment of value, increasing intensity near 1 and decreasing it near
    //0 to achieve a more contrasted, real-world look
    hsv.z *= sqrt(hsv.z) * 1.1;

    if (night)
    {
    ///CaliCoastReplay:
    //Slight value adjustment at night to turn down global intensity
        hsv.z -= 0.045;
        hsv*=0.8;
        hsv.x += 0.12 + hsv.z/100.0;
        //Highly increased saturation at night op, oddly.  Nights appear to be very colorful
        //within their ranges.
        hsv.y *= 2.87;
    }
    else
    {
      //CaliCoastReplay:
        //Add green tinge to the high range
      //Turn down intensity in day in a different way

        hsv.z *= 0.9;

        //CaliCoastReplay:  Hue alteration
        hsv.x -= hsv.z/10.0;
        hsv.x += 0.02 + hsv.z/50.0;
        //Final brightening
        hsv.z *= 1.01;
        //This really "cinemafies" it for the day -
        //puts the saturation on a squared, highly magnified footing.
        //Worth looking into more as to exactly why.
       // hsv.y *= 5.10 * hsv.y * sqrt(hsv.y);
        hsv.y += 0.07;
    }

    //CaliCoastReplay:
    //Replace the final color with the adjusted, translated HSV values
    fragColor.xyz = hsv2rgb(hsv);
}
