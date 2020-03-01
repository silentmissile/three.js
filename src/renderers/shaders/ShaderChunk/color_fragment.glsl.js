export default /* glsl */`
#ifdef USE_COLOR
	#ifdef USE_COLOR_HSL
		diffuseColor.rgb *= hsl2rgb(vColor);
	#else
		diffuseColor.rgb *= vColor;
	#endif
#endif
`;
