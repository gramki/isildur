
var CouchClient = require('couch-client');
var deferred = require('./lib/deferred.js');
var server = 'http://localhost:5984/';
var metaDbUrl = server + 'gimply_meta/';
var cache = {};
var viewMap = {
	'project': '/gimply_meta/_design/meta_views/_view/project',
	'user': '/gimply_meta/_design/meta_views/_view/user'
};

function createDb ( dbName ){
	var d = new deferred.Deferred();
	var c = CouchClient(server + dbName);
	c.request('PUT', '/' + dbName.replace('/', '%2F'), function(error, result){
		if(error || result.error){
			var e = new Error('database creation failed: ' + dbName);
			e.reason = error || result;
			d.errback(e);
		}else{
			console.dir(result);
			d.callback(result);
		}
	});
	return d;
}

function saveObject(dbUrl, key, obj){
	var d = new deferred.Deferred();
	var cdb = CouchClient(dbUrl);
	cdb.save(obj, function(err, doc){
		if(err){
			var e = new Error('Cannot save ' + obj.type + ' to ' + dbUrl);
			e.reason = err;
			d.errback(e);
			return;
		}
		cache[key] = doc;
		d.callback(doc);
	});
	return d;	
}

// keys are expected to be globally unique
function getOneObject(dbUrl, viewPath, key){
	var d = new deferred.Deferred();
	var c = cache[key];
	if(c){
		d.callback(c);
		return d;
	}
	var cdb = CouchClient(dbUrl);
	cdb.view(viewPath, {
		limit: 1,
		key: key
	},
	function(err, docs) {
		if(err || !docs.rows || docs.rows.length==0){
			var e = new Error('cannot find object with key ' + key + ' in ' + dbUrl + ', ' + viewPath);
			e.reason = err;
			d.errback(e);
			return;
		}
		var obj = docs.rows[0]
		cache[key] = obj;
		d.callback(obj);
	});	        
	return d;	
}

//Although to work purely with DB the function would have take doc._id or doc
//and wouldn't have required viewPath.
//We have invalidate the cache as well. So, delete follows same signature of get.
//We will do a get before delete. The object will mostly be fetched from the cache;
function deleteObject(dbUrl, viewPath, key){
	var d = getOneObject(dbUrl, viewPath, key);
	var d2 = new deferred.Deferred();
	d.addCallback(function(doc){
		delete cache[key];
		var cdb = CouchClient(dbUrl);
		cdb.remove(doc, function(err, doc2){
			if(err || !doc2){
				var e = new Error('Failed to delete ' + key + ' from ' + dbUrl , doc);
				e.reason = err;
				d2.errback(e);
				return;
			}
			d2.callback(doc2);
		});
	});
	return d2;
}

var meta = (function(){
	var cache = {};
	var meta = {
		saveProject: function(project){
			var key = project.context + '-' + project.projectid;
			project.type = 'project';
			return saveObject(metaDbUrl, key, project);
		},
		getProject: function(context, projectid){
			var key = context + '-' + projectid;
			var viewPath = viewMap.project;
			return getOneObject(metaDbUrl, viewPath, key);
		},
		deleteProject: function(context, projectid){
			var key = context + '-' + projectid;
			var viewPath = viewMap.project;
			return deleteObject(metaDbUrl, viewPath, key);			
		},
		saveUser: function(user){
			var key = user.username;
			user.type = 'user';
			return saveObject(metaDbUrl, key, user);
		},
		getUser: function(username){
			var viewPath = viewMap.user;
			return getOneObject(metaDbUrl, viewPath, username);
		},
		deleteUser: function(username){
			var viewPath = viewMap.user;
			return deleteObject(metaDbUrl, viewPath, username);
		},
		saveViews: function(views){
			var d = new deferred.Deferred();
			var cdb = CouchClient(metaDbUrl);
			cdb.save(views, function(err, doc){
				if(err){
					var e = new Error('meta-view-creation-failed');
					e.reason = err;
					d.errback(e);
					return;
				}
				d.callback(doc);
			});
			return d;
		}
	};
	return meta;
})();

/****
	project
		- context
		- id
		- title
		- users: []
 */
function createProject(project){
	var d = createDb(project.context + '/' + project.id);
	d.addCallback(function(result){
		
	});
}

module.exports = {
	createProject: createProject,
	createDb: createDb,
	meta: meta
};

