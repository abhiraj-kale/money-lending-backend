var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
const crypto = require('crypto');
const fs = require("fs");
//const NodeRSA = require('node-rsa');


// Creating a function to encrypt string
function encryptString (plaintext, publicKeyFile) {
	const publicKey = fs.readFileSync(publicKeyFile, "utf8");

	// publicEncrypt() method with its parameters
	const encrypted = crypto.publicEncrypt(
		publicKey, Buffer.from(plaintext));

	return encrypted.toString("base64");
}

// Creating a function to decrypt string
function decryptString (ciphertext, privateKeyFile) {
	const privateKey = fs.readFileSync(privateKeyFile, "utf8");

	// privateDecrypt() method with its parameters
	const decrypted = crypto.privateDecrypt(
	{
		key: privateKey,
		passphrase: '',
	},
	Buffer.from(ciphertext, "base64")
	);

	return decrypted.toString("utf8");
}

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
    const auth_key = req.body.auth_key
    console.log("ID : \n" + id);
    console.log("auth key : \n" + auth_key)
    let password;

    pool.getConnection(function(err, connection) {
      if (err) throw err; // not connected!
      
      if (error) throw error;
      let temp_pass;
      try{
        temp_pass = decryptString("AJoXU2zumVMl2tYRf8i78ubwbO50vpN4pjoXz85xiu8j0/HK4PpQ27vxB4Uztca27N2IVHDC2VfvvrGGpmy4pluABg==", 'private_key');
        console.log("temp pass : " + temp_pass);
      }catch(Error){
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
    const password = req.body.password
    const hashed_pass = crypto.createHash('md5').update(req.body.password).digest('hex');
    let auth_key;

    // create user id 
    const id = uuidv4(); 

    pool.getConnection(function(err, connection) {
      if (err) throw err; 

    // Use the public key to encrypt    
    auth_key = encryptString(password, 'public_key');

    //Insert user info into database      
        connection.query('INSERT IGNORE INTO `heroku_2f4d6f8d48f57a4`.`user_info` (`id`, `name`, `password`, `phone`) VALUES (?, ?, ?, ?)', [id,name,hashed_pass,phone],function (error) {  
          if (error) throw error;
          else
          res.send(JSON.stringify({"id":id,"auth_key":auth_key}));
          
          connection.release();
      
          if (error) throw error;      
          // Don't use the connection here, it has been returned to the pool.
        });
      });
});

module.exports = router;
