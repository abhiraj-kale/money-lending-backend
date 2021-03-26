var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
var crypto = require('crypto');
const NodeRSA = require('node-rsa');

const cryptoJS = require('./cryptoJS')

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
    const auth_key = (JSON.stringify(req.body.auth_key)).replace(/ /g,'');
    let password;

    pool.getConnection(function(err, connection) {
      if (err) throw err; // not connected!
      
      if (error) throw error;
      let temp_pass;
      try{
        temp_pass = cryptoJS.decryptString(auth_key, "private_key");
      }catch(err){
        console.log("Incorrect auth_id");
        res.json({"log_in_status":false, "message":"Incorrect auth_id"})
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

router.post('/signup', function(req, res, next) {
    const phone = req.body.phone;
    const name = req.body.name;
    const password = crypto.createHash('md5').update(req.body.password).digest('hex');
    let public_key, auth_key;

    // create user id 
    const id = uuidv4(); 

    pool.getConnection(function(err, connection) {
      if (err) throw err; 

    // Use the public key to encrypt    
    auth_key = cryptoJS.encryptString(password, "./public_key");

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
