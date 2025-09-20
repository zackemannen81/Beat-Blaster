precision mediump float;
uniform float u_amount;
varying vec2 outTexCoord;
void main() {
  vec2 offset = vec2(u_amount/1024.0, 0.0);
  float r = texture2D(uMainSampler, outTexCoord + offset).r;
  float g = texture2D(uMainSampler, outTexCoord).g;
  float b = texture2D(uMainSampler, outTexCoord - offset).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
