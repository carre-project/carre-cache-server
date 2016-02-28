'use strict';

var express = require('express'),
    cors = require('cors'),
    compression = require('compression'),
    request = require('request'),
    mcache = require('memory-cache'),
    app = express();


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
    
    //unvalidate
app.get('/expire/:req_url_id', (req, res) => {
    mcache.del(req.params.req_url_id);
    console.log('Delete from cache : '+req.params.req_url_id);
    res.status(200).json({
        result: 'deleted',
        data: req.params.req_url_id
    });
});

    //get all cache available
app.get('/get_cache', (req, res) => {
    res.status(200).json({
        total_elements: mcache.size(),
        elements: mcache.keys()
    });
});

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
        }
    });
})

app.get('/bioportal/:bioportal_request', cache(), (req, res) => {
    var bioportal_request = decodeURIComponent(req.params.bioportal_request);
    console.log(bioportal_request);
    var cacheKey = ('__express__' + req.originalUrl || req.url);
    request(bioportal_request, function(error, response, body) {
        if (error) throw ('Bioportal Api Error', error);
        else {
            console.log('Load from API:', cacheKey);
            res.status(200).send(body);

            //put on cache
            mcache.put(cacheKey, body);
        }
    })

    //Lets configure and request


})

app.listen(SERVER_PORT, function() {
    console.log('CACHE server listening on port: ', SERVER_PORT);
})