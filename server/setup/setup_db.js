
var db = require('../couch.js');

function handleDbCreate(result){
	if(result instanceof Error){
		if(result.reason && result.reason.error === 'file_exists'){
			console.log("Database exists");			
		}else{
			console.error("Database creation failed");			
			console.dir(result);
		}
	}else{
		console.log('Database created successfully');
	}
}
console.log('Creating database: gimply_meta');
db.createDb('gimply_meta').addCallback(handleDbCreate).addErrback(handleDbCreate);


var views = {
	"_id": '_design/meta_views',
	"language": "javascript",
	"views": {
		"project": {
			"map": "function(doc){if(doc.type == 'project'){ emit(doc.context + '-' + doc.id, doc);}}"
		},
		"project_by_user": {
			"map": "function(doc) {\
			    if (doc.type == 'project') {\
			        if (doc.users) {\
						doc.users.forEach(function(u){\
				            emit(u, doc);				\
						});\
			        }\
			    }\
			}"
		},
		"project_by_context": {
			"map": "function(doc){if(doc.type == 'project'){ emit(doc.context, doc);}}"
		},
		"user": {
			"map": "function(doc){if(doc.type == 'user'){ emit(doc.username, doc);}}"
		}
	}
};

db.meta.saveViews(views).addCallback(function() {
    console.log('Meta views created successfully!')
}).addErrback(function(){
    console.log('Meta views created FAILED!')	
});

function handleOp(operation, result){
	if(result instanceof Error){
		console.error('Operation ['+ operation +'] failed: ', result, this);
	}else{
		//console.log('Operation  ['+ operation +'] success: ', result, this);
	}	
}
var contexts = ['context1', 'conetext2', 'conetext3', 'conetext4','test'];
var projectCount = 100;
var last;
contexts.forEach(function(c){
	for(var i=0; i<projectCount; i++){
		var pro = {
			context: c,
			projectid: 'project'+i,
			name: 'Project '+ i,
			users: [ c ]
		};
		(function(){
			var o = pro;
			db.meta.saveProject(o).addBoth(handleOp.bind(o, 'add')).addCallback(
				function(){
					db.meta.getProject(o.context, o.projectid).addBoth(handleOp.bind(o, 'get')).addCallback(
						function(){
							db.meta.deleteProject(o.context, o.projectid).addBoth(handleOp.bind(o, 'delete'));						
						}
					);
				}
			);
			
		})();
	}
});
var userCount=100;
for(var i=0; i<userCount; i++){
	var userOuter = {
		username: 'user'+i,
		name: 'User '+ i
	};
	(function(){
		var user = userOuter;
		db.meta.saveUser(user).addBoth(handleOp.bind(user, 'add')).addCallback(
			function(){
				db.meta.getUser(user.username).addBoth(handleOp.bind(user, 'get')).addCallback(
					function(){
						db.meta.deleteUser(user.username).addBoth(handleOp.bind(user, 'delete'));					
					}
				);			
			}
		);
		
	})();
}
