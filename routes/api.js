var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto')
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
	modulusLength: 1024,
})
console.log("Private key: " + privateKey.toString());
console.log("Public key: " + publicKey.toString())

var mysql = require('mysql');
var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : process.env.HOST,
  user            : process.env.USER,
  password        : process.env.PASSWORD,
  database        : process.env.DATABASE
});
pool.getConnection(function(err, connection) {
    if (err) throw err; // not connected!
  
    // Use the connection
    connection.query('SELECT * FROM user_info', function (error, results, fields) {
        console.log("Results length: " + results.length)
        console.log(results);
      // When done with the connection, release it.
      connection.release();
  
      // Handle error after the release.
      if (error) throw error;
  
      // Don't use the connection here, it has been returned to the pool.
    });
  });
router.post('/login', function(req, res, next) {
    var key = req.body.key;
    var password = req.body.password;
    console.log(key);
    res.end(key)

});

router.post('/signup', function(req, res, next) {
    var phone = req.body.phone;
    var name = req.body.name;
    var password = req.body.password;
    var id = uuidv4();
    console.log(id);
    console.log(phone);
    console.log(name);
    
    pool.getConnection(function(err, connection) {
        if (err) throw err; // not connected!
      
        // Use the connection
        connection.query("INSERT IGNORE INTO `heroku_2f4d6f8d48f57a4`.`user_info` (`id`, `name`, `password`, `pri_key`, `pub_key`, `phone`) VALUES ('?', '?', '?', '?', '?', '?')", [],function (error, results, fields) {
            console.log("Results length: " + results.length)
            console.log(results);
          // When done with the connection, release it.
          connection.release();
      
          // Handle error after the release.
          if (error) throw error;
      
          // Don't use the connection here, it has been returned to the pool.
        });
      });
});

module.exports = router;
