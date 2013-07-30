var game;

$(function() {

  game = new Game();
  game.onNameMessage = _.compose(function() {
    var list = _.reduce(game.players, function(memo, player, index) {
      var color = game.colorgen.getColor(index);
      color = [
        Math.floor(color[0] * 255),
        Math.floor(color[1] * 255),
        Math.floor(color[2] * 255),
      ];
      return memo + '<li style="color: rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ');">' + player + '</li>';
    }, '');
    $('#score').html(list);
  }, game.onNameMessage);

  $('#players').change(function() {
    if (this.checked) {
      $('#score').show();
    } else {
      $('#score').hide();
    }
  });

  $('#sound').change(function() {
    if (this.checked) {
      Howler.unmute();
    } else {
      Howler.mute();
    }
  });

  $('#play').click(function() {
    $('#loader').hide();
    game.run($('#name').val());
    return false;
  });

});
