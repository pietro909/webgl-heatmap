precision highp float;

attribute vec4 vPosition;
attribute vec4 vColor;

/* point attributes */
attribute float vUplink;
attribute float vDownlink;
attribute float vPmkpi;

/* the view bounds  */
uniform float u_viewMinX;
uniform float u_viewMaxX;
uniform float u_viewMinY;
uniform float u_viewMaxY;

/* const for the whole map */
uniform float u_UpLinkMax;
uniform float u_DownLinkMax;
uniform float u_PmKpiMax;

uniform int u_marker;

varying vec4 fColor;

float greenComponent;

/**
 * translate 3D point in projected coordinates (see openlayers.org)
 * to webgl coordinates (-1, +1)
 */
vec4 coordsToCanvas( vec4 point )
{
    float x = ( ( point.x - u_viewMinX ) / ( u_viewMaxX - u_viewMinX ) * 2.0 ) - 1.0;
    float y = ( ( point.y - u_viewMinY ) / ( u_viewMaxY - u_viewMinY ) * 2.0 ) - 1.0;
    return vec4( x, y, point.z, point.w );
}

void main()
{
    vec4 normalizedPoint = coordsToCanvas( vPosition );
    gl_Position = vec4( normalizedPoint.x,
			normalizedPoint.y,
			vPosition.z,
			vPosition.w
		      );
    
    gl_PointSize = 4.0;
  
    if ( u_marker == 1 ) 
    {
      greenComponent = vUplink / u_UpLinkMax;
    }
    else if ( u_marker == 2 )
    {
      greenComponent = vDownlink / u_DownLinkMax;
    }
    else
    {
      greenComponent = vPmkpi / u_PmKpiMax;
    }
  
    fColor = vec4( vColor.x, 
		   greenComponent, 
		   vColor.z, 
		   vColor.w 
		 );
}
