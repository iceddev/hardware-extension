console.log('hi from app');

window.ports = {};

chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
    console.log('hello', request, sender, sendResponse);
    if(sendResponse){
      sendResponse({backAtcha: request});
    }
});

chrome.runtime.onConnectExternal.addListener(function (port){
  console.log('port', port);


});
