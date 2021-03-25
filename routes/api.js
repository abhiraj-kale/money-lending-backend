var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
const NodeRSA = require('node-rsa');
const { pbkdf2Sync } = require('crypto');
const key = new NodeRSA({ b: 1024 });

var pool  = mysql.createPool({
  connectionLimit : 10,
  host            : process.env.HOST,
  user            : process.env.USER,
  password        : process.env.PASSWORD,
  database        : process.env.DATABASE
});

pool.getConnection(function(err, connection) {
    if (err) throw err; // not connected!
    else console.log("Connected to DB")
});

router.post('/login', function(req, res, next) {
    var key = req.body.key;
    var password = req.body.password;
    console.log(key);
    res.end(key)

});

router.post('/signup', function(req, res, next) {
    const phone = req.body.phone;
    const name = req.body.name;
    const password = req.body.password;
    // user id 
    const id = uuidv4(); 
    // creating asym keys
    const private_key = new NodeRSA(key.exportKey("private")); 
    const public_key = new NodeRSA(key.exportKey("public"));
    console.log("private key: " + private_key);
    console.log("public key : " + public_key);
    var string = "My name is abhiraj";
    const encrypted_string = public_key.encrypt(string, 'base64')
    console.log("encrypted string:" + encrypted_string);
    const decrypted_string = private_key.decrypt(encrypted_string, 'utf8');
    console.log("decrypted string : " + decrypted_string);
    
    pool.getConnection(function(err, connection) {
        if (err) throw err; // not connected!
      
        // Use the connection
        connection.query('INSERT IGNORE INTO `heroku_2f4d6f8d48f57a4`.`user_info` (`id`, `name`, `password`, `pri_key`, `pub_key`, `phone`) VALUES (?, ?, ?, ?, ?, ?)', [id,name,password,private_key,public_key,phone],function (error, results, fields) {
            console.log("Inserted data Results length: " + results.length)
            console.log(results);
            res.json({"public_key":public_key});
          // When done with the connection, release it.
          connection.release();
      
          // Handle error after the release.
          if (error) throw error;
      
          // Don't use the connection here, it has been returned to the pool.
        });
      });
});

module.exports = router;
