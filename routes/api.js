var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
var crypto = require('crypto');
const NodeRSA = require('node-rsa');

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
    const password = crypto.createHash('md5').update(req.body.password).digest('hex');
    console.log("password : " + password)
    let public_key, auth_key;

    // create user id 
    const id = uuidv4(); 

    pool.getConnection(function(err, connection) {
      if (err) throw err; 

    // Extract the keys from database
    connection.query("SELECT `keys`.`public_key` FROM `heroku_2f4d6f8d48f57a4`.`keys`", function (error, result, fields) {
      if (error) throw error;

      var res_pub_key = toString(result[0].public_key);
      console.log("public key extracted: \n"+res_pub_key);
      public_key = new NodeRSA(res_pub_key);
      console.log("public_key : " + public_key);
      auth_key = public_key.encrypt(password, 'base64');
      console.log("Auth key : \n"+auth_key);
    });

    //Insert user info into database      
        connection.query('INSERT IGNORE INTO `heroku_2f4d6f8d48f57a4`.`user_info` (`id`, `name`, `password`, `phone`) VALUES (?, ?, ?, ?)', [id,name,password,phone],function (error) {  
          if (error) throw error;
          else
          res.json({"id":id,"auth_key":auth_key});
          
          connection.release();
      
          if (error) throw error;      
          // Don't use the connection here, it has been returned to the pool.
        });
      });
});

module.exports = router;
