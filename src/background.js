const _ = require('lodash');
const events = require('./lib/events');
const serialport = require('browser-serialport');
const UdpSerialPort = require('udp-serial').SerialPort;
const net = require('chrome-net');
require('./lib/rest');

const ports = {};
const connections = {
  serial: {},
  tcp: {},
  udp: {}
};


window.ports = ports;

//this gets weird during dev, not sure why
if(chrome.app && chrome.app.runtime && chrome.app.runtime.onLaunched){
  chrome.app.runtime.onLaunched.addListener(function() {
    // Center window on screen.
    var screenWidth = screen.availWidth;
    var screenHeight = screen.availHeight;
    var width = 500;
    var height = 300;

    chrome.app.window.create('index.html', {
      id: "helloWorldID",
      outerBounds: {
        width: width,
        height: height,
        left: Math.round((screenWidth-width)/2),
        top: Math.round((screenHeight-height)/2)
      }
    });
  });
}



chrome.runtime.onConnectExternal.addListener(function (port){
  port._id = 'p_' + Math.random() + '_' + Date.now();
  ports[port._id] = port;

  port.onDisconnect.addListener(function(d){
    console.log('port disconnected', d, port);
    delete ports[port._id];
    _.forEach(['tcp', 'udp', 'serial'], function(type){
      _.forEach(connections[type], function(p){
        if(p._ownerId === port._id){
          try{
            console.log('shutting down', type);
            p.close();
          }catch(exp){
            console.log('error closing ', type, exp);
          }
        }
      });
    });
  });

  port.onMessage.addListener(function(msg, inboundPort){
    // console.log('port onMessage', msg, inboundPort);

    if(msg.type === 'rpc'){
      if(msg.id){
        msg.reply = function(result){
          inboundPort.postMessage({
             id: msg.id,
             result: result,
             type: msg.type
          });
        };
      }

      events.emit(msg.type + '_' + msg.name, msg, port);
    }
    else if(msg.type === 'data'){
      if(connections[msg.conType] && connections[msg.conType][msg.name]){
        var con = connections[msg.conType][msg.name];
        try{
          con.write(new Buffer(msg.data));
        }
        catch(exp){
          console.log('error writing data', exp);
        }
      }
    }


  });
});


function listArduinoPorts(callback) {
  return serialport.list(function(err, ports) {
    if (err) {
      return callback(err);
    }
    var devices = [];
    for (var i = 0; i < ports.length; i++) {
      if (/usb|acm|com\d+/i.test(ports[i].comName)) {
        devices.push(ports[i].comName);
      }
    }
    return callback(null, devices);
  });
}


function broadcast(msg){
  _.forEach(ports, function(p){
    try{
      p.postMessage(msg);
    }catch(exp){
      console.log('error broadcasting', exp);
    }
  });
}

events.on('rpc_listSerial', function(msg){
  listArduinoPorts(function(err, ports){
    if(err){
      return msg.reply({error: err});
    }

    msg.reply(ports);
  });
});


events.on('rpc_connect', function(msg, port){
  var type = msg.params[0];
  var name = msg.params[1];
  var options = msg.params[2] || {};

  if(connections[type] && connections[type][name]){
    try{
      connections[type][name].close();
      delete connections[type][name];
    }catch(exp){
      console.log('error closing port', exp);
    }
  }

  var sp;

  if(type === 'tcp'){
    sp = net.connect(options);
    sp.on('connect', function(){
      sp.emit('open');
    });
  }
  else if(type === 'udp'){
    options.type = options.type || 'udp4';
    sp = new UdpSerialPort(options);
  }else{
    options.baudrate = options.baudrate || 57600;
    sp = new serialport.SerialPort(options.portName, options);
  }

  sp.on('open', function () {
    msg.reply({status: 'ok'});
  });

  sp.on('error', function(err){
    msg.reply({error: err});
  });

  sp.on('disconnect', function(err){
    delete connections[type][name];
  });

  sp.on('data', function(data){
    console.log('data from device', data);
    broadcast({
      type: 'data',
      conType: type,
      name,
      data
    });
  });

  //smooth out transport differences
  sp.close = sp.close || sp.end;
  if(!sp.isPaused){
    sp.isPaused = function(){
      return false;
    };
  }

  sp._ownerId = port._id;

  connections[type][name] = sp;

});

events.on('rpc_disconnect', function(msg){
  if(connections[msg.params[0]] && connections[msg.params[0]][msg.params[1]]){
    var sp = connections[msg.params[0]][msg.params[1]];
    sp.close();
    delete connections[msg.params[0]][msg.params[1]];
    return msg.reply({status: 'ok'});
  }
  msg.reply({error: 'no connection'});
});


