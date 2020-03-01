export default /* glsl */`
#define PI 3.14159265359
#define PI2 6.28318530718
#define PI_HALF 1.5707963267949
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6

#ifndef saturate
// <tonemapping_pars_fragment> may have defined saturate() already
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement(a) ( 1.0 - saturate( a ) )

float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}

#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float max3( vec3 v ) { return max( max( v.x, v.y ), v.z ); }
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif

struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};

struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};

struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef CLEARCOAT
	vec3 clearcoatNormal;
#endif
};

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {

	// dir can be either a direction vector or a normal vector
	// upper-left 3x3 of matrix is assumed to be orthogonal

	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );

}

vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

	float distance = dot( planeNormal, point - pointOnPlane );

	return - distance * planeNormal + point;

}

float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

	return sign( dot( point - pointOnPlane, planeNormal ) );

}

vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {

	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;

}

mat3 transposeMat3( const in mat3 m ) {

	mat3 tmp;

	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );

	return tmp;

}

// https://en.wikipedia.org/wiki/Relative_luminance
float linearToRelativeLuminance( const in vec3 color ) {

	vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );

	return dot( weights, color.rgb );

}

bool isPerspectiveMatrix( mat4 m ) {

  return m[ 2 ][ 3 ] == - 1.0;

}

vec3 rgb2hsl(vec3 rgbColor) {
	float rgbMin = min( min( rgbColor.r, rgbColor.g ), rgbColor.b );
	float rgbMax = max( max( rgbColor.r, rgbColor.g ), rgbColor.b );
	float L = 0.5 * ( rgbMin + rgbMax );
	float S = 1.0;
	float C = rgbMax - rgbMin;
	if ( L < 0.5 ) {
		S = C / (rgbMax + rgbMin);
	} else {
		S = C / (2.0 - rgbMax - rgbMin);
	}
	float H = 0.0;
	if ( C != 0.0 ) {
		if ( rgbColor.r > rgbColor.g && rgbColor.r > rgbColor.b ) {
			
			H = ( rgbColor.g - rgbColor.b ) / C;
			if ( H < 0.0 ) {
				H = H + 6.0;
			
			}
		} else if ( rgbColor.g > rgbColor.r && rgbColor.g > rgbColor.b ) {
			
			H = 2.0 + ( rgbColor.b - rgbColor.r ) / C;
		} else {
			H = 4.0 + ( rgbColor.r - rgbColor.g ) / C;
		}
	}
	H = min( H, 6.0 );
	H = max( H, 0.0 );
	return vec3( H * 60.0, S, L );
}

// const float numColors = 17.0;
vec3 hsl2rgb(vec3 hslColor) {
	float H = hslColor.x;
	float S = hslColor.y;
	float L = hslColor.z;
	//float fcontour = H / 360.0;
	//float rounded = floor(numColors * fcontour + 0.5) / numColors;
	//H = 360.0 * rounded; //(1.0 - rounded);
	float C = ( 1.0 - abs( 2.0 * L - 1.0 )) * S;
	float D = H / 60.0 - 2.0 * floor( H / 120.0 );
	float X = C * ( 1.0 - abs( D - 1.0 ) );
	float M = L - 0.5 * C;
	float rp = 0.0;
	float gp = 0.0;
	float bp = 0.0;
	if ( H >= 0.0 && H < 60.0 ) {
		
		rp = C;
		gp = X;
	} else if ( H >= 60.0 && H < 120.0 ) {
		rp = X;
		gp = C;
	} else if ( H >= 120.0 && H < 180.0 ) {
		gp = C;
		bp = X;
	} else if ( H >= 180.0 && H < 240.0 ) {
		
		gp = X;
		bp = C;
	} else if ( H >= 240.0 && H < 300.0 ) {
		
		rp = X;
		bp = C;
	} else {
		rp = C;
		bp = X;
	}
	return vec3( rp + M, gp + M, bp + M );
}
`;
