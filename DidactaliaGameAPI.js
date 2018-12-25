var elasticsearch=require('elasticsearch');
var http = require('http');
var url = require('url');
var jsonexport = require('jsonexport');
var request = require('request');
var config = require('./config.js');
var md5 = require('md5');

var client = new elasticsearch.Client({
host:'localhost:9200',
  log: 'error'
});


http.createServer((req, res) => {
    var queryData = url.parse(req.url, true).query;        
    console.log(queryData);
    var user = queryData.user;
    var output = queryData.output;
    var size = queryData.size;        
    if (!size) size=1000;                
    if(user) {
	var query = buildQuery(user, size);
	client.search({  	    
	    index: config.game_index,
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
		var result = [];
		var allHits = response.hits.hits;
		for(var i in allHits){
		    var doc = allHits[i]["_source"];
		    var act = doc;
		    result.push(doc);
		    // var rid = doc.resource_id;
		    // console.log(rid);
		    // getResourceData(rid, doc, result, res);		    
		}
		console.log("returning "+result.length+" activities");
		res.writeHead(200, {'Content-Type': 'application/json'});    
		res.end(JSON.stringify(result));		
	    }	    	    
	});
    } else {
	result={status: 'error', message: 'user parameter required'};
	res.writeHead(200, {'Content-Type': 'application/json'});    
	res.end(JSON.stringify(result));
    }
}).listen(8073, 'localhost');
    
console.log('Server running at http://localhost:8073/');

function buildQuery(u,s){
    return {"query": {
	"bool": {
	    "must":[
		{"term":{"user_id": u}},
		{"term":{"actionType":"playEnd"}}
	    ]}},
	    "size": s
	   };
}

var callsLeft = 0;

function getResourceData(id, doc, result, res){
    callsLeft++;
    http.get('http://localhost:9200/didactalia-activity-base/resource/'+id, function (r) {
	var body = '';
	r.on('data', function(chunk){
	    body += chunk;
	});
	r.on('end', function(){
	    var rj = JSON.parse(body);
	    console.log(rj)
	    if (rj["_source"]){
		doc.rtitle = rj["_source"].title;
		doc.rurl = rj["_source"].resource_url;
	    }
	    callsLeft--;
	    if (callsLeft==0) {
		res.writeHead(200, {'Content-Type': 'application/json'});    
		res.end(JSON.stringify(result));
	    }		
	});
	

    });
}
