var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
var crypto = require('crypto');
const NodeRSA = require('node-rsa');
//const key = NodeRSA({ b:1024 })
//console.log(key.exportKey("public"))
//console.log(key.exportKey("private"))

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
    const id = req.body.id;
    const auth_key = req.body.auth_key;
    let password, private_key;

    pool.getConnection(function(err, connection) {
      if (err) throw err; // not connected!
      
      // Extract the keys from database
    connection.query("SELECT `keys`.`private_key` FROM `heroku_2f4d6f8d48f57a4`.`keys`", function (error, result, fields) {
      if (error) throw error;

      var res_pri_key = result[0].private_key;
      console.log("Private key : \n"+res_pri_key);
      private_key = new NodeRSA(res_pri_key);
      let temp_pass;
      try{
        temp_pass = private_key.decrypt(JSON.stringify(auth_key), "utf8");
      }catch(err){
        console.log("error");
        res.json({"log_in_status":false, "message":"Some error"})
      }
      password = crypto.createHash('md5').update(temp_pass).digest('hex');  
      
      connection.query("SELECT `user_info`.`password` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`id`='?'",[id],function(err, res){
        if (err) throw err;
        
        if(res.length<1)
          res.json({"log_in_status":false, "message":"No such user."})
        else{
          if (res[0].password==password)
            res.json({"log_in_status":true})
          else res.json({"log_in_status":false, "message":"Invalid Credentials."})
        }

      })
    });
  });
});

router.post('/signup', function(req, res, next) {
    const phone = req.body.phone;
    const name = req.body.name;
    const password = crypto.createHash('md5').update(req.body.password).digest('hex');
    let public_key, auth_key;

    // create user id 
    const id = uuidv4(); 

    pool.getConnection(function(err, connection) {
      if (err) throw err; 

    // Extract the public key from database
    connection.query("SELECT `keys`.`public_key` FROM `heroku_2f4d6f8d48f57a4`.`keys`", function (error, result, fields) {
      if (error) throw error;

      var res_pub_key = (result[0].public_key);
      public_key = new NodeRSA(res_pub_key);
      auth_key = public_key.encrypt(password, 'base64');
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
