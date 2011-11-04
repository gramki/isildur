
var deferred = require('./deferred.js');

var d = new deferred.Deferred();
d.addCallback(function(val){
	var d2 = new deferred.Deferred();
	console.log('Intermediate result: ' + val);
	setTimeout(function(){ d2.callback(val*2); }, 1000);
	return d2;
});

d.addCallback(function(r){
	console.log('Final result: ' + (r*2));
});

setTimeout(function(){
	d.callback(2);	
}, 100);

