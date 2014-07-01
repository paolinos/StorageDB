/**

	v2

	Links Ref.:
	https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

	http://nparashuram.com/trialtool/#example=/IndexedDB/trialtool/index.html

	http://www.html5rocks.com/en/tutorials/indexeddb/todo/

	//	Example with code
	http://www.onlywebpro.com/2012/12/23/html5-storage-indexeddb/

	Example:
		https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
	Demo:
		https://mdn.mozillademos.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB$samples/Full_IndexedDB_example

*/

function StorageDB(dbName, tables){
	// Initialising the window.IndexedDB Object
	window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
	window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
	window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
	//var indexedDB = window.indexedDB;

	
	

	if (!indexedDB) {
	    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
	}
	
	const version = 1;

	var _t = this;
	var _dbName = dbName;

	/**
		@param {function} callback(db);
	*/
	var openDB = function(callback){
		var request = indexedDB.open(_dbName, version);
		request.onsuccess = function(e) {
		    callback(e.target.result);
		};
		request.onerror = function(e){
		    callback(null);
		};
	}

	/**
		@param {IDBObjectStore} store
		@param {function} callback(dataResultArray);
	*/
	var readCursor = function(store, callback){
		var req = store.openCursor();
		var list = [];
		req.onsuccess = function(e) {
			var cursor = e.target.result;
	    	if (cursor)
	    	{
	    		req = store.get(cursor.key);
		        req.onsuccess = function (evt) {
		        	list[list.length] = evt.target.result;
		        };
		        // Cursor next
        		cursor.continue();
	    	}
	    	else
	    	{
	    		//	All objetcs readed
	    		callback(list);
	    	}
		};
	}

	var searchAndRemoveCursor = function(store, params ,callback){
		var req = store.openCursor();
		var list = [];
		var countRemoved = 0;
		req.onsuccess = function(e) {
			var cursor = e.target.result;
	    	if (cursor)
	    	{
	    		var data = cursor.value;
	    		var readNext = true;

	    		//	Search by params
				for (var key in params) {
					//console.log("data[key]: " + data[key] + " - params[key]: " + params[key] );
					if(data[key] ===  params[key] ){
						readNext = false;
						var request = cursor.delete(cursor.value);
				        request.onsuccess = function() {
				          	countRemoved++;
				          	cursor.continue();
				        }
				        request.error = function(){
				        	console.error("Error deleting element.");	
				        }
					}
				}

				// Cursor next
				if(readNext){
					cursor.continue();
				}
	    	}
	    	else
	    	{
	    		//	All objetcs readed
	    		if(countRemoved === 0){
	    			callback(false, countRemoved);
	    		}else{
	    			callback(true, countRemoved);
	    		}
	    		
	    	}
		};
	}



	var initDB = function(){

		var request = indexedDB.open(_dbName, version);
		request.onupgradeneeded = function(e) {
			var db = e.target.result;

			for (var i = 0; i < tables.length; i++) {
				var store = db.createObjectStore(tables[i], { keyPath: 'id', autoIncrement: true });
			};
		}
		request.onsuccess = function(e) {
		    //console.log("initDB - onsuccess");
		};
		request.onerror = function(e){
		    console.error("initDB - onerror");
		};
	}
	initDB();

	/**
		Check DB connection.
	*/
	this.checkDB = function()
	{

		var request = indexedDB.open(_dbName, version);

		request.onupgradeneeded = function(e) {
			var db = e.target.result;

			for (var i = 0; i < tables.length; i++) {
				var store = db.createObjectStore(tables[i], { keyPath: 'id', autoIncrement: true });
			};


		};
		request.onsuccess = function(e) {
			var db = e.target.result;
		    db.close();
		};
		request.onerror = function(e){
			console.error("db - onerror");
		};
	}


	/**
		Destroy Database
	*/
	this.destroy = function(callback){

		var req = indexedDB.deleteDatabase(_dbName);
		req.onsuccess = function () {
			//console.log("Deleted database successfully");
			if(callback)
				callback(true);
		};
		req.onerror = function () {
		    //console.log("Couldn't delete database");
		    if(callback)
				callback(false);
		}
	};

	this.getById = function(tableName, id, callback){

		openDB(function(db){
			if(db === null){
				console.error("Error trying to connect with db");
			}

			var idbRequest;
			try{
				var tx = db.transaction(tableName, 'readonly' );
				var store = tx.objectStore(tableName);

				idbRequest = store.get(id);

				idbRequest.onsuccess = function(e){
					if(idbRequest.result) {
						callback(true, idbRequest.result);
					}else{
						callback(true, null);
					}
				}
				idbRequest.onerror = function(e){
					if(callback !== undefined)
						callback(false);
				}

			}catch(e){
				//	e.code == 8 -> Table not exist.
				if(e.code === 8){
					console.warn("Maybe there are one problem with the versions. Sometimes happens with Mozilla.");
				}
				
				if(callback !== undefined)
						callback(false);
			}

			
			db.close();
		});
	}

	/**

		This method get all the data, and then make a search.
		//TODO: We need to look other way better.

		@param {string} tableName
		@param {json} searchParams
		@param {function} callback(true/false, dataResultArray);
	*/
	this.get = function(tableName, searchParams, callback){

		if(searchParams !== undefined){
			//console.log(searchParams);
			var listResult = [];
			this.getAll(tableName, function(val, dataResult){
				if(val){

					for (var i = dataResult.length - 1; i >= 0; i--) {
						var data = dataResult[i];
						
						//	Search by params
						for (var key in searchParams) {
							//console.log("data[key]:" + data[key] + " - searchParams[key]:" + searchParams[key] );
							if(data[key] ===  searchParams[key] ){
								listResult[listResult.length] = data;
								break;
							}
						}
					};

					if(callback)
						callback(listResult);

				}
			});
		}
	};


	/**
		Get all data from table
		@param {string} tableName
		@param {function} callback(true/false, dataResultArray);
	*/
	this.getAll = function(tableName, callback){

		openDB(function(db){
			if(db === null){
				console.error("Error trying to connect with db");
			}

			var idbRequest;
			try{
				var tx = db.transaction(tableName, 'readonly' );
				var store = tx.objectStore(tableName);

				idbRequest = store.count();
				idbRequest.onsuccess = function(e){

					readCursor(store,function(dataResult){
						if(callback !== undefined)
							callback(true, dataResult);
					});
				}
				idbRequest.onerror = function(e){
					console.log("result.onerror");
					if(callback !== undefined)
						callback(false);
				}

			}catch(e){
				console.log(e);
				//throw e;

				if(e.code === 8){
					console.warn("Maybe there are one problem with the versions. Sometimes happens with Mozilla.");
				}


				//	e.code == 8 -> Table not exist.
				if(callback !== undefined)
						callback(false);
			}

			
			db.close();
		});
	}

	

	/**
		@param {string} tableName
		@param {json} data
		@param {function} callback(true/false);
	*/
	this.addTo = function(tableName, data, callback){

		openDB(function(db){

			if(db === null){
				console.error("Error trying to connect with db");
			}
			var result;
			try{

				var tx = db.transaction(tableName, 'readwrite' );
				var store = tx.objectStore(tableName);

				result = store.add(data);

			}catch(e){
				 throw e;
			}

			result.onsuccess = function(e){
				//	Id added.
				if(callback !== undefined)
					callback(true, e.target.result);
			}
			result.onerror = function(e){
				console.log("result.onerror");
				if(callback !== undefined)
					callback(false);
			}
		});
	}

	/**
		@param {string} tableName
		@param {object} data
		@param {function} callback(true/false, count removed (int) );
	*/
	this.remove = function(tableName, data, callback){
		openDB(function(db){
			if(db === null){
				console.error("Error trying to connect with db");
			}

			var idbRequest;
			try{
				var tx = db.transaction(tableName, 'readwrite' );
				var store = tx.objectStore(tableName);

				idbRequest = store.count();
				idbRequest.onsuccess = function(e){
					searchAndRemoveCursor(store, data,function(success, countRemoved){
						if(callback !== undefined)
							callback(success, countRemoved);
					});
				}
				idbRequest.onerror = function(e){
					if(callback !== undefined)
						callback(false);
				}

			}catch(e){
				console.log(e);
				//throw e;

				if(e.code === 8){
					console.warn("Maybe there are one problem with the versions. Sometimes happens with Mozilla.");
				}


				//	e.code == 8 -> Table not exist.
				if(callback !== undefined)
						callback(false);
			}

			
			db.close();
		});
	}
}