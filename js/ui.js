var game;

$(function() {

  game = new Game();

  game.onIdMessage = _.compose(function() {
    less.modifyVars({
      color: 'rgb(' + Color.genIntRGB(this.playerId).join(',') + ')',
    });
  }, game.onIdMessage);

  game.onNameMessage = _.compose(function() {
    var html = _.map(game.players, function(player, id) {
      return '<li style="color: rgb(' + Color.genIntRGB(id).join() + ');">' + player + '</li>';
    });
    $('#players').html(html.join(''));
  }, game.onNameMessage);

  game.onEndMessage = _.compose(game.onEndMessage, function(score) {
    score = _.sortBy(_.map(this.players, function(player, id) {
      return {
        id: id,
        name: player,
        score: score[id],
      };
    }), function(player) { return -player.score; });
    var html = _.map(score, function(player) {
      return '<li style="color: rgb(' + Color.genIntRGB(player.id).join() + ');">' + player.name + ': ' + player.score + '</li>';
    });
    $('#players').html(html.join('')).fadeIn();
    return score;
  });

  $('#opt-players').change(function() {
    if (this.checked) {
      $('#players').fadeIn();
    } else {
      $('#players').fadeOut();
    }
  });

  $('#opt-sound').change(function() {
    if (this.checked) {
      Howler.unmute();
    } else {
      Howler.mute();
    }
  });

  $('#play').click(function() {
    $('#loader').fadeOut();
    $('#opt-players + label').fadeIn();
    game.run($('#name').val());
    return false;
  });

});
