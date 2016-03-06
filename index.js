'use strict';

var express = require('express'),
    cors = require('cors'),
    compression = require('compression'),
    Promise = require("bluebird"),
    request = Promise.promisifyAll(require("request")),
    mcache = require('memory-cache'),
    app = express();
    
var Store = require("jfs");
var db = new Store("data/data",{type:'single'});

//synchronous requests with recursive technique
var callAPIs=function ( APIs ) {
  var API = APIs.shift();
  setTimeout(function(){
    console.log(API);
      request(API, function(err, res, body) { 
        if( APIs.length ) {
          callAPIs ( APIs );
        }
      });
  },3000);
}

// memory cache implementation
var cache = () => {
    return (req, res, next) => {
        let key = req.params.req_url_id || ('__express__' + req.originalUrl || req.url);
        let cachedBody = mcache.get(key);
        if (cachedBody) {
            console.log('Load from CACHE:', key);
            res.status(200).send(cachedBody);
            return
        }
        else next();
    }
}

// var whitelist = [
//     'http://entry.carre-project.eu', 
//     'http://example2.com'
// ];
// var corsOptions = {
//   origin: function(origin, callback){
//     var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
//     callback(null, originIsWhitelisted);
//   }
// };
app.use(cors());
app.use(compression());


/* CONFIG */
var SERVER_PORT = 3002;
    

    //get all memory cache available
app.get('/get_cache', (req, res) => {
    res.status(200).json({
        total_elements: mcache.size(),
        elements: mcache.keys()
    });
});
    //get all requests that saved to file
app.get('/get_requests', (req, res) => {
    res.status(200).json(db.allSync());
});
    //get all requests that saved to file
app.get('/clear_cache', (req, res) => {
    var cachesize=mcache.size();
    mcache.clear();
    res.status(200).json({msg:"Cleared "+cachesize+" items",data:cachesize});
});
    //invalidate and refresh portion or whole cache from requests saved in file
app.get('/refresh_cache/:req_url_id?', (req, res) => {
    var req_id = req.params.req_url_id?req.params.req_url_id.split(','):null;
    var cacheRequests = db.allSync();
    var results=[];
    for(var prop in cacheRequests) {
        if(req_id) {
            for (var i=0,len=req_id.length;i<len;i++){
                if(prop.indexOf(req_id[i])>=0) {
                    
                    //delete from memory
                    mcache.del(prop);
                    
                    //push into refreshing cue
                    
                    results.push('http://beta.carre-project.eu:3002'+cacheRequests[prop].req);
                }
            }
        } else results.push('http://beta.carre-project.eu:3002'+cacheRequests[prop].req);
    }
    if(results.length>0) callAPIs(results);
    
    res.status(200).json({
        request: req_id||"refresh all cache",
        ttl:(results.length+1)*3+" sec"
    });
});

// CARRE api cache route!
app.get('/carre/:req_url_id/:original_api/:original_query/:token?', cache(), (req, res) => {
    // console.log('Params:',req.params);
    var cacheKey = req.params.req_url_id;
    var token = req.params.token || ''
    var json = {
        sparql: req.params.original_query,
        token: token
    };
    if (cacheKey.indexOf('public_') === 0) {
        delete json.token;
    }
    
    //Lets configure and request
    request({
        url: req.params.original_api, //URL to hit
        method: 'POST',
        //Lets post the following key/values as form
        json: json

    }, function(error, response, body) {
        if (error) {
            console.log(error);
        }
        else if (body.status == 500) {
            console.log(body);
        }
        else {
            console.log('Load from API:', cacheKey);
            res.status(200).send(body);

            //put on cache
            mcache.put(cacheKey, body);
            
            //save request to disk
            db.save(cacheKey,{req:req.originalUrl},function(err,data){
                console.log(err,data);
            }); 
    
        }
    });
});

app.listen(SERVER_PORT, function() {
    console.log('CACHE server listening on port: ', SERVER_PORT);
})
