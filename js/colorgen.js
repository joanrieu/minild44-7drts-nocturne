var Color = {

  H2RGB: function(hue) {

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

  HSV2RGB: function(hue, saturation, value) {

    var color = this.H2RGB(hue);

    return [
      value * (1 + saturation * (color[0] - 1)),
      value * (1 + saturation * (color[1] - 1)),
      value * (1 + saturation * (color[2] - 1)),
    ];

  },

  Gen: function() {

    this.hues = [ 0, 3/8, 5/8, 1/2, 3/4, 3/16, 7/8, 3/32 ];

    this.getColor = function(index) {

      var loop = Math.floor(index / this.hues.length);

      return Color.HSV2RGB(
        this.hues[index % this.hues.length] + loop / (2 * this.hues.length),
        1,
        (2 - loop / (loop + 1)) / 2
      );

    };

  }

};
