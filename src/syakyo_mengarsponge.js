// https://www.shadertoy.com/view/lslfWf
// コメントが詳しい。


/*

 */

const int MAX_MARCHING_STEPS = 255;
const float MIN_DIST = 0.0;
const float MAX_DIST = 100.0;
const float EPSILON = 0.0001;
//const float EPSILON = 0.1;
/**
 * Rotation matrix around the X axis.
 */
mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
                vec3(1, 0, 0),
                vec3(0, c, -s),
                vec3(0, s, c)
                );
}

/**
 * Rotation matrix around the Y axis.
 */
mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
                vec3(c, 0, s),
                vec3(0, 1, 0),
                vec3(-s, 0, c)
                );
}

/**
 * Rotation matrix around the Z axis.
 */
mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
                vec3(c, -s, 0),
                vec3(s, c, 0),
                vec3(0, 0, 1)
                );
}


/**
 * Constructive solid geometry intersection operation on SDF-calculated distances.
 */
float intersectSDF(float distA, float distB) {
    return max(distA, -distB);
}

/**
 * Constructive solid geometry union operation on SDF-calculated distances.
 */
float unionSDF(float distA, float distB) {
    return min(distA, distB);
}

/**
 * Constructive solid geometry difference operation on SDF-calculated distances.
 */
float differenceSDF(float distA, float distB) {
    return max(distA, -distB);
}

/**
 * Signed distance function for a cube centered at the origin
 * with width = height = length = 2.0
 */
float cubeSDF(vec3 p) {
    // If d.x < 0, then -1 < p.x < 1, and same logic applies to p.y, p.z
    // So if all components of d are negative, then p is inside the unit cube
    vec3 d = abs(p) - vec3(1.0, 1.0, 1.0);

    // Assuming p is inside the cube, how far is it from the surface?
    // Result will be negative or zero.
    float insideDistance = min(max(d.x, max(d.y, d.z)), 0.0);

    // Assuming p is outside the cube, how far is it from the surface?
    // Result will be positive or zero.
    float outsideDistance = length(max(d, 0.0));

    return insideDistance + outsideDistance;
}

float cubeSDF(vec3 p,float w) {
    // If d.x < 0, then -1 < p.x < 1, and same logic applies to p.y, p.z
    // So if all components of d are negative, then p is inside the unit cube
    vec3 d = abs(p) - vec3(w, w, w);

    // Assuming p is inside the cube, how far is it from the surface?
    // Result will be negative or zero.
    float insideDistance = min(max(d.x, max(d.y, d.z)), 0.0);

    // Assuming p is outside the cube, how far is it from the surface?
    // Result will be positive or zero.
    float outsideDistance = length(max(d, 0.0));

    return insideDistance + outsideDistance;
}

/**
 * Signed distance function for a sphere centered at the origin with radius 1.0;
 */
float sphereSDF(vec3 p) {
    return length(p) - 1.0;
}

float sphereSDF(vec3 p,float r) {
    return length(p) - r;
}


float distTorus( vec3 p, vec2 t )
{
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
}


float cylinderSDF(vec3 p, float h, float r) {
    // How far inside or outside the cylinder the point is, radially
    float inOutRadius = length(p.xy) - r;

    // How far inside or outside the cylinder is, axially aligned with the cylinder
    float inOutHeight = abs(p.z) - h/2.0;

    // Assuming p is inside the cylinder, how far is it from the surface?
    // Result will be negative or zero.
    float insideDistance = min(max(inOutRadius, inOutHeight), 0.0);

    // Assuming p is outside the cylinder, how far is it from the surface?
    // Result will be positive or zero.
    float outsideDistance = length(max(vec2(inOutRadius, inOutHeight), 0.0));

    return insideDistance + outsideDistance;
}

float toSphere(in vec3 p){
//    p = rotate_y(p,-time*0.5);
    p.y += 0.2;
    return length(pow(abs(p),vec3(.7,0.68,0.4)))-1.5;
    //you can try this another DE vertion
    //return length(pow(abs(p),vec3(.7,0.68,0.4))-vec3(.6,0.35,0.4))-1.;
}


float smin( float a, float b, float k){
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);

}


float sdBox( vec3 p, vec3 b )
{
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) +
    length(max(d,0.0));
}

//for fractals
float sdCross( in vec3 p)
{
    float v = 1.0;
    float da = sdBox(p.xyz,vec3(1000.0, v, v));
    float db = sdBox(p.yzx,vec3(v, 1000.0, v));
    float dc = sdBox(p.zxy,vec3(v, v, 1000.0));
    return min(da,min(db,dc));
}


//Menger Sponge Fractal
float disEstimator(vec3 pt)
{
    float dis = sdBox(pt, vec3(1.0));
   	float s = 1.0;
    float fact = 3.0;

    for( int m=0; m<3; m++ )
   	{
//       s *= fact;
        //        vec3 a = mod( pt*s, 2.0 )-1.0;
//        vec3 a = mod( pt*s, 3.0 )-1.5;

//        vec3 r =  fact - fact*abs(a);
//        float c = sdCross(a*fact)/fact;
//        dis = max(dis,-c);
//        dis +c;



//        vec3 q = pt*s;//  mod( pt*s, 3.0 )-1.5;
        vec3 a =  mod( pt*s, 2.0 )-1.0;

        s *= fact;
        vec3 r = 3.0-3.0*abs(a);
        float c = sdCross(r)/s;
        dis = max(dis,-c);
   	}

    return dis;
}


float sdPlane( vec3 p, vec4 n ) {
    return dot( p, n.xyz ) + n.w;
}

/**
 * Signed distance function describing the scene.
 *
 * Absolute value of the return value indicates the distance to the surface.
 * Sign indicates whether the point is inside or outside the surface,
 * negative indicating inside.
 */
float sceneSDF(vec3 samplePoint) {


   float dist = disEstimator(samplePoint);

    return dist;
}



/**
 * Return the shortest distance from the eyepoint to the scene surface along
 * the marching direction. If no part of the surface is found between start and end,
 * return end.
 *
 * eye: the eye point, acting as the origin of the ray
 * marchingDirection: the normalized direction to march in
 * start: the starting distance away from the eye
 * end: the max distance away from the ey to march before giving up
 */
float shortestDistanceToSurface(vec3 eye, vec3 marchingDirection, float start, float end) {
    float depth = start;
    for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
        float dist = sceneSDF(eye + depth * marchingDirection);

//         dist = floor(dist*10.+0.5)/10.;

        if (dist < EPSILON) {
            return depth;
        }
        depth += dist;
        if (depth >= end) {
            return end;
        }
    }
    return end;
}


/**
 * Return the normalized direction to march in from the eye point for a single pixel.
 *
 * fieldOfView: vertical field of view in degrees
 * size: resolution of the output image
 * fragCoord: the x,y coordinate of the pixel in the output image
 */
vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

/**
 * Using the gradient of the SDF, estimate the normal on the surface at point p.
 */
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
                          sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
                          sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
                          sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
                          ));
}



const bool USE_BRANCHLESS_DDA = true;



bool raymarch( vec3 eye, vec3 marchingDirection, out vec3 hitPos, out vec3 hitNrm )
{
    //    const int maxSteps = 128;
    //    const float hitThreshold = 0.0001;

    bool hit = false;
    hitPos = eye;
    float depth = MIN_DIST;
    vec3 pos = eye;//MIN_DIST, MAX_DIST

    for ( int i = 0; i < MAX_MARCHING_STEPS; i++ )
    {
        float d = sceneSDF( pos );

        if ( d < EPSILON )
        {
            hit = true;
            hitPos = pos;
            pos += d * marchingDirection;

            hitNrm = estimateNormal(  pos);
            break;
        }

        depth += d;
        if (depth >= MAX_DIST) {
            return hit;
        }

        pos += d * marchingDirection;
    }
    return hit;
}


float shadowSoft( vec3 ro, vec3 rd, float mint, float maxt, float k )
{
    float t = mint;
    float res = 1.0;
    for ( int i = 0; i < 128; ++i )
    {
        float h = sceneSDF( ro + rd * t );
        if ( h < EPSILON )
            return 0.0;

        res = min( res, k * h / t );
        t += h;

        if ( t > maxt )
            break;
    }
    return res;
}

vec3 shade( vec3 pos, vec3 nrm, vec4 light )
{
    vec3 toLight = light.xyz - pos;

    float toLightLen = length( toLight );
    toLight = normalize( toLight );

    float comb = 0.1;
    //float vis = shadow( pos, toLight, 0.01, toLightLen );
    float vis = shadowSoft( pos, toLight, 0.0625, toLightLen, 8.0 );

    if ( vis > 0.0 )
    {
        float diff = 2.0 * max( 0.0, dot( nrm, toLight ) );
        float attn = 1.0 - pow( min( 1.0, toLightLen / light.w ), 2.0 );
        comb += diff * attn * vis;
    }

    return vec3( comb, comb, comb );
}

/**
 * Lighting contribution of a single point light source via Phong illumination.
 *
 * The vec3 returned is the RGB color of the light's contribution.
 *
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,
                          vec3 lightPos, vec3 lightIntensity) {
    vec3 N = estimateNormal(p);
    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = normalize(reflect(-L, N));

    float dotLN = dot(L, N);
    float dotRV = dot(R, V);

    if (dotLN < 0.0) {
        // Light not visible from this point on the surface
        return vec3(0.0, 0.0, 0.0);
    }

    vec3 KD = k_d;//vec3(abs(sin(p)));
//     vec3 KD = vec3(abs(sin(p)));

    if (dotRV < 0.0) {
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
        return lightIntensity * (KD * dotLN);
    }
    return lightIntensity * (KD * dotLN + k_s * pow(dotRV, alpha));
}


vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,
                          vec3 lightPos, vec3 lightIntensity,vec3 N) {
//    vec3 N = estimateNormal(p);
    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = normalize(reflect(-L, N));

    float dotLN = dot(L, N);
    float dotRV = dot(R, V);

    if (dotLN < 0.0) {
        // Light not visible from this point on the surface
        return vec3(0.0, 0.0, 0.0);
    }

    vec3 KD = k_d;//vec3(abs(sin(p)));
//    vec3 KD = vec3(abs(sin(p)));

    if (dotRV < 0.0) {
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
        return lightIntensity * (KD * dotLN);
    }
    return lightIntensity * (KD * dotLN + k_s * pow(dotRV, alpha));
}

/**
 * Lighting via Phong illumination.
 *
 * The vec3 returned is the RGB color of that point after lighting is applied.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phong(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,vec4 light) {
    const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;

    vec3 light1Pos = vec3(light.xyz);
    vec3 light1Intensity = vec3(0.4, 0.4, 0.4);

    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light1Pos,
                                  light1Intensity);

    vec3 light2Pos = vec3(2.0 * sin(0.37 * iTime),
                          2.0 * cos(0.37 * iTime),
                          2.0);
    vec3 light2Intensity = vec3(0.4, 0.4, 0.4);

    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light2Pos,
                                  light2Intensity);
    return color;
}


vec3 phong(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,vec4 light,vec3 N) {
    const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;

    vec3 light1Pos = vec3(light.xyz);
    vec3 light1Intensity = vec3(0.4, 0.4, 0.4);

    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light1Pos,
                                  light1Intensity);

    vec3 light2Pos = vec3(2.0 * sin(0.37 * iTime),
                          2.0 * cos(0.37 * iTime),
                          2.0);
    vec3 light2Intensity = vec3(0.4, 0.4, 0.4);

    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light2Pos,
                                  light2Intensity,N);
    return color;
}

/**
 * Return a transform matrix that will transform a ray from view space
 * to world coordinates, given the eye point, the camera target, and an up vector.
 *
 * This assumes that the center of the camera is aligned with the negative z axis in
 * view space when calculating the ray marching direction. See rayDirection.
 */
mat4 viewMatrix(vec3 eye, vec3 center, vec3 up) {
    // Based on gluLookAt man page
    vec3 f = normalize(center - eye);
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat4(
                vec4(s, 0.0),
                vec4(u, 0.0),
                vec4(-f, 0.0),
                vec4(0.0, 0.0, 0.0, 1)
                );
}





void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

   // float si = sign(sin(iTime));
   // if(si>0.){
   //      VoxelMainImage(fragColor,fragCoord);

    //    return ;
    //}

    vec3 viewDir = rayDirection(45.0, iResolution.xy, fragCoord);
    //    vec3 eye = vec3(sin(iTime)*4., cos(iTime)*4., 7.0);
    vec3 eye = vec3(sin(iTime)*4., 4., cos(iTime)*7.0);
    //    vec3 eye = vec3(4., 4., 10.0);

    mat4 viewToWorld = viewMatrix(eye, vec3(0.0, 0.0, 0.), vec3(0.0, 1.0, 0.0));

    vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

    float dist = shortestDistanceToSurface(eye, worldDir, MIN_DIST, MAX_DIST);

    if (dist > MAX_DIST - EPSILON) {
            // Didn't hit anything
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // The closest point on the surface to the eyepoint along the view ray
    vec3 p = eye + dist * worldDir;

    vec3 K_a = vec3(0.2, 0.2, 0.2);
    vec3 K_d = vec3(0.7, 0.2, 0.2);
    vec3 K_s = vec3(1.0, 1.0, 1.0);
    float shininess = 10.0;
    vec4 light1 = vec4(4.0 * sin(iTime),
                       2.0,
                       4.0 * cos(iTime),10.);

    vec3 color = phong(K_a, K_d, K_s, shininess, p, eye,light1);

    fragColor = vec4(color, 1.0);

    vec3 sceneWsPos;
    vec3 sceneWsNrm;
    if ( raymarch( eye, worldDir, sceneWsPos, sceneWsNrm ) )
    {
        vec3 shade1 = shade( sceneWsPos, sceneWsNrm, light1 );
        fragColor *= vec4( shade1, 1.0 );
    }
    else
    {
        fragColor *= vec4( 0.0, 0.0, 0.0, 1.0 );
    }

}
