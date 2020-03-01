export default /* glsl */`
#ifdef USE_COLOR
	#ifdef USE_COLOR_HSL
		vColor = rgb2hsl(color);
	#else
		vColor.xyz = color.xyz;
	#endif
#endif
`;
