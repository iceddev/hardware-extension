
var Avrgirl = require('avrgirl-arduino');
var rest = require('rest');
var events = require('./events');
var connections = require('./connections');

function write(board, port, entity, msg){
    var avrgirl = new Avrgirl({
      board: board, port: port, debug: true
    });

    avrgirl.flash(new Buffer(entity), function (error) {
      if (error) {
        console.log('error flashing', error);
        var errMsg = error.message || error.error || error.toString();
        return msg.reply({error: errMsg});
      }
      return msg.reply({status: 'ok'});
    });
}

events.on('rpc_writeFirmware', function(msg){

  var board = msg.params[0];
  var port = msg.params[1];
  var firmwareName = msg.params[2];
  rest({
    path: '/hex/' + board + '/' + firmwareName
  })
  .then(function(result){
    // console.log('result', result, result.entity);
    var entity = result.entity;

    if(connections.serial && connections.serial[port]){
      var sp = connections.serial[port];
      try{
        sp.close(function(){
          delete connections.serial[port];
          write(board, port, entity, msg);
        });
      }catch(exp){
        write(board, port, entity, msg);
      }

    }else{
      write(board, port, entity, msg);
    }

  })
  .catch(function(err){
    console.log('error fetching hex', err);
    msg.reply({error: '' + (err.error || err)});
  });


});

