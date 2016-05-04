const events = require('./events');

const rest = require('rest');
const errorCodeInterceptor = require('rest/interceptor/errorCode');
const mimeInterceptor = require('rest/interceptor/mime');

events.on('rpc_rest', function(msg){
  const opts = msg.params[0];
  let restCall = rest.wrap(errorCodeInterceptor);
  if(typeof opts.entity === 'object'){
      restCall = restCall.wrap(mimeInterceptor, { mime: 'application/json' });
  }else{
      restCall = restCall.wrap(mimeInterceptor);
  }

  restCall(opts).then(function(res) {
    console.log('http response', res);
    msg.reply({res});
  })
  .catch(function(error) {
    console.log('http error', error);
    msg.reply({error});
  });

});
