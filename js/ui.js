var game;

$(function() {

  game = new Game();

  $('#sound').change(function() {
    if (this.checked) {
      Howler.unmute();
    } else {
      Howler.mute();
    }
  });

  $('#play').click(function() {
    $('.box').fadeOut();
    game.run();
  });

});
