var express = require('express');
var router = express.Router();

var http = require('http'); //importing http

function startKeepAlive() {
    setInterval(function() {
        var options = {
            host: 'money-lending-app.herokuapp.com',
            port: 80,
            path: '/'
        };
        http.get(options, function(res) {
            res.on('data', function(chunk) {
                try {
                    // optional logging... disable after it's working
                    console.log("HEROKU RESPONSE: " + chunk);
                } catch (err) {
                    console.log(err.message);
                }
            });
        }).on('error', function(err) {
            console.log("Error: " + err.message);
        });
    }, 30 * 60 * 1000); // load every 20 minutes
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.end("Server running")
});

startKeepAlive();
module.exports = router;
