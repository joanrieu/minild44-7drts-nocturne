var Color = {

  getFloatRGB_fromHue: function(hue) {

    var wheel = [
      [ 1, 0, 0 ], // R
      [ 1, 1, 0 ], // Y
      [ 0, 1, 0 ], // G
      [ 0, 1, 1 ], // C
      [ 0, 0, 1 ], // B
      [ 1, 0, 1 ], // M
    ];

    var i = Math.floor(hue * 6),
      a = wheel[i % 6],
      b = wheel[(i + 1) % 6];

    var crossfade = hue * 6 - i;

    return [
      a[0] + crossfade * (b[0] - a[0]),
      a[1] + crossfade * (b[1] - a[1]),
      a[2] + crossfade * (b[2] - a[2]),
    ];

  },

  getFloatRGB_fromHSV: function(hsv) {

    var rgb = this.getFloatRGB_fromHue(hsv[0]);

    return [
      hsv[2] * (1 + hsv[1] * (rgb[0] - 1)),
      hsv[2] * (1 + hsv[1] * (rgb[1] - 1)),
      hsv[2] * (1 + hsv[1] * (rgb[2] - 1)),
    ];

  },

  getIntRGB_fromFloatRGB: function(rgb) {

    return [
      rgb[0] * 255 & 0xff,
      rgb[1] * 255 & 0xff,
      rgb[2] * 255 & 0xff,
    ];

  },

  genHSV: function(index) {

    var hues = [ 0, 3/8, 5/8, 1/2, 3/4, 3/16, 7/8, 3/32 ];
    var loop = Math.floor(index / hues.length);

    return [
      hues[index % hues.length] + loop / (2 * hues.length),
      1,
      (2 - loop / (loop + 1)) / 2
    ];

  },

  genFloatRGB: function(index) {
    return this.getFloatRGB_fromHSV(this.genHSV(index));
  },

  genIntRGB: function(index) {
    return this.getIntRGB_fromFloatRGB(this.genFloatRGB(index));
  },

};
