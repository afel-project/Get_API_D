var elasticsearch=require('elasticsearch');
var http = require('http');
var url = require('url');
var jsonexport = require('jsonexport');
var request = require('request');
var json2csv = require('json2csv').parse
var config = require('./config.js');
const storage = require('node-persist');
var md5 = require('md5');


// new csv
// remove + button
// update game api too...
// id not in get

storage.init();

var client = new elasticsearch.Client({
host:'localhost:9200',
  log: 'error'
});

http.createServer((req, res) => {
    var queryData = url.parse(req.url, true).query;        
    var id = queryData.id;
    if (!id){
	result={status: 'error', message: 'id required'};
	res.writeHead(200, {'Content-Type': 'application/json'});    
	console.log("No id given");
	res.end(JSON.stringify(result));
	return;
    }
    var params = storage.getItem(id);
    if (!params){
	result={status: 'error', message: 'id invalid or expired '+id};
	res.writeHead(200, {'Content-Type': 'application/json'});    
	console.log("ID expired "+id);
	res.end(JSON.stringify(result));
	return;    
    }
    storage.removeItem(id);
    console.log("Serving "+params);
    var aparams = params.split(',');
    var user = aparams[0];
    var size = parseInt(aparams[1]);
    var query = buildQuery(user, size);
    client.search({  	    
	index: config.index,
	type: "activity",
	body: query
    },function (error,response,status) {
	if (error){
	    console.log("Error in querying Elsastic Search: "+error+'\n');
	    result={status: 'error', message: 'Error in querying Elsastic Search: '+error};
	    res.writeHead(200, {'Content-Type': 'application/json'});    
	    res.end(JSON.stringify(result));
	}
	else {		
	    var allHits = response.hits.hits;
	    result = {"activities": []}
	    result = processHits(allHits, user, size);
	    finalise(result.activities, res, "csv");
	}
    });
}).listen(8201, 'localhost');

console.log('CSV Server running at http://localhost:8201/');

// Basic GET API
http.createServer((req, res) => {
    var queryData = url.parse(req.url, true).query;        
    console.log(queryData);
    var user = queryData.user;
    var csvid = queryData.csvid;
    var output = queryData.output;
    var size = queryData.size;
    
    var result = {};
    
    if (!size) size=config.defaultsize;
                
    if(user) {
	// if asking for csvid, just returning that
	if (csvid && csvid=='yes'){
	    var cid = md5(user+Math.random());	    
	    result={status: 'csvidcreate', csvid: cid};
	    res.writeHead(200, {'Content-Type': 'application/json'});    
	    res.end(JSON.stringify(result));
	    storage.setItem(cid, user+","+size);
	    console.log("returning csvid "+cid);
	    return; 
	}
	var query = buildQuery(user, size);
	client.search({  	    
	    index: config.index,
	    type: "activity",
	    body: query
	},function (error,response,status) {
	    if (error){
		console.log("Error in querying Elsastic Search: "+error+'\n');
		result={status: 'error', message: 'Error in querying Elsastic Search: '+error};
		res.writeHead(200, {'Content-Type': 'application/json'});    
		res.end(JSON.stringify(result));
	    }
	    else {		
		var allHits = response.hits.hits;
		result = processHits(allHits, user, size);
		finalise(result.activities, res, output);
	    }	    	    
	});
    } else {
	result={status: 'error', message: 'user parameter required'};
	res.writeHead(200, {'Content-Type': 'application/json'});    
	res.end(JSON.stringify(result));
    }
}).listen(8202, 'localhost');
    
console.log('Server running at http://localhost:8202/');

// Finalising the data to be returned
function finalise(result, res, output){
    console.log("sending");
    res.writeHead(200, {'Content-Type': 'application/json'});    
    var csv = "";
    if (output == "json")
	csv = JSON.stringify(result);
    else 
	csv = json2csv(result, {fields: config.csvfields});
    // console.log(csv)
    res.end(csv);
}

// query for user data
function buildQuery(u,s){
    // TODO: add cooky user
    return {"query": {
	"bool": {
	    "must": [
		{"match": {
		    "user_id": u
		}},
	        {"exists":{"field":"resource"}}
		]
	}
    },
     "size": s,
     "sort": [{"date": "desc"}]
	   } 
}

function fragment(u){
    return u.substring(u.lastIndexOf("/")+1).replace(/_/g, " ").replace("Category:", "");
}

function extractHostname(url) {
    var hostname;
    if (url.indexOf("://") > -1) {
	hostname = url.split('/')[2];
    }
    else {
	hostname = url.split('/')[0];
    }
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];
    return hostname;
}

function processHits(hits, user, size){        
    console.log("processing")
    var actsids = []
    var actsigs = []
    var rids = []
    var tags = []
    var acts = []
    var scopebl = []
    hits = hits.reverse();
    for (var h in hits){
	var hit = hits[h];
	var aid = hit._id;	
	complexity = 15;
	if (hit._source.resource.smog) complexity = hit._source.resource.smog
	var atags = hit._source.resource.tags
	var url = "http://dummy.com/test";
	if (hit._source.resource.link)
	    url = hit._source.resource.link
	else if (hit._source.resource.resource_url)
	    url = hit._source.resource.resource_url
	var dom = extractHostname(url);
	acts.push({"user": hit._source.user_id,
		   "title": hit._source.resource.title,
		   "resource": url,
		   "tags": atags,
		   "scope": atags,
		   "type": hit._source.type,
		   "Year": hit._source.Year,
		   "Month": hit._source.Month,
		   "Day": hit._source.Day,
		   "Hour": hit._source.Hour,
		   "Minutes": hit._source.Minutes,
		   "Seconds": hit._source.Seconds,
		   "Day of Week": hit._source["Day of Week"],
		   "date": hit._source.date,
		   "coverage": 0.0, // calculate by cummulating
		   "diversity": 0.0, // calculate by cummulating
		   "complexity": complexity,
		  });
    }
    var tr = {"activities": acts.reverse()};
    tr.activities = tr.activities.slice(0,size);
    return tr;
}
