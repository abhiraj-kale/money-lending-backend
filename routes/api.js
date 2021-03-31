var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
var mysql = require('mysql');
const crypto = require('crypto');
const fs = require("fs");
const { response } = require('../app');
const { type } = require('os');
//const NodeRSA = require('node-rsa');

function getCustomerId(phone){
  pool.getConnection(function(err,connection){
    if(err) throw err;
   
  })
}

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

router.post('/login', function(req, response, next) {
    const id = req.body.id;
    const auth_key = String(req.body.auth_key).replace(/\s/g, '+')
    let password;

    pool.getConnection(function(err, connection) {
      if (err) throw err; // not connected!
      
      let temp_pass;
      try{
        temp_pass = decryptString(auth_key, 'private_key');
      }catch(Error){
        response.json({"log_in_status":false, "message":"Incorrect auth_key"})
      }
      password = crypto.createHash('md5').update(temp_pass).digest('hex');  
      
      connection.query("SELECT `user_info`.`password` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`id`=?",[id],function(err, res){
        if (err) throw err;
        if(res.length<1)
        response.json({"log_in_status":false, "message":"No such user."})
        else{
          if (res[0].password==password){
            const transact_id = uuidv4();
            connection.query("UPDATE `heroku_2f4d6f8d48f57a4`.`user_info` SET `transact_id` = ? WHERE `id` = ?",[transact_id,id], function(e, result) {
              if (e) throw e;
              response.json({"transact_id":transact_id,"log_in_status":true})
            })
          }
          else {
            response.json({"log_in_status":false, "message":"Invalid Credentials."})
          }
        }

      })
  });
});


router.post('/getKeys', function(req, res, next) {
  const phone = req.body.phone;
  const password = req.body.password
  const hashed_pass = crypto.createHash('md5').update(req.body.password).digest('hex');


  pool.getConnection(function(err, connection) {
    if (err) throw err; 

  // Use the public key to encrypt    
  const auth_key = encryptString(password, 'public_key');

  connection.query("SELECT `user_info`.`id` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`phone`=? AND `user_info`.`password`=?",[phone,hashed_pass],function(error, result){
    if(error) throw error;
    
    if(result.length==1){
      res.json({"id":result[0].id,"auth_key":auth_key,"account_status":true});
    }else{
      res.json({"log_in_status":false,"account_status":false});
    }          
  }) 

});
});


router.post('/signup', function(req, res, next) {
    const phone = req.body.phone;
    const name = req.body.name;
    const password = req.body.password
    const hashed_pass = crypto.createHash('md5').update(req.body.password).digest('hex');


    pool.getConnection(function(err, connection) {
      if (err) throw err; 

    // Use the public key to encrypt    
    const auth_key = encryptString(password, 'public_key');

    connection.query("SELECT `user_info`.`id` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`phone`=?",[phone],function(error, result){
      if(error) throw error;
      
      if(result.length==1){
        res.json({"log_in_status":false,"status":"Account already exists"});
      }else{
        const id = uuidv4(); // create user id   
        const transact_id = uuidv4();
        //Insert user info into database      
        connection.query('INSERT IGNORE INTO `heroku_2f4d6f8d48f57a4`.`user_info` (`id`, `name`, `password`, `phone`, `transact_id`) VALUES (?, ?, ?, ?, ?)', [id,name,hashed_pass,phone,transact_id],function (error) {  
          if (error) throw error;
          else
          res.send(JSON.stringify({"id":id,"auth_key":auth_key,"transact_id":transact_id,"log_in_status":true}));
          
          connection.release();      
          if (error) throw error;      
          // Don't use the connection here, it has been returned to the pool.
        });

      }          
    }) 

  });
});

router.get('/profile',function(req, response){
  const id = req.body.id;
  const auth_key = String(req.body.auth_key).replace(/\s/g, '+')
  let password;

  pool.getConnection(function(err, connection) {
    if (err) throw err; // not connected!
    
    let temp_pass;
    try{
      temp_pass = decryptString(auth_key, 'private_key');
    }catch(Error){
      response.json({"status":false, "message":"Incorrect auth_key"})
    }
    password = crypto.createHash('md5').update(temp_pass).digest('hex');  
    
    connection.query("SELECT `user_info`.`password`,`user_info`.`name`,`user_info`.`phone` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`id`=?",[id],function(err, res){
      if (err) throw err;
      if(res.length<1)
      response.json({"status":false, "message":"No such user."})
      else{
        if (res[0].password==password){
          response.json({"name":res[0].name, "phone": res[0].phone, "status": true})
        }
        else {
          response.json({"status":false, "message":"Password doesn't match."})
        }
      }

    })
});
})

//Payments API

router.post('/pay', function(req, res){
  const sender_trans = req.body.sender_trans;
  const receiver_id = req.body.receiver_trans;
  const amount = parseInt(req.body.amount);
  
  var sender_id, wallet, new_sender_wallet, new_receiver_wallet;

  pool.getConnection(function(err, connection) {
    if (err) throw err; // not connected!
    
    //Check if sender transact id is valid
    connection.query("SELECT `user_info`.`id`,`user_info`.`wallet` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`transact_id`=?",[sender_trans],function(err, result){
      if (err) throw err;
      console.log(result);
      if(result.length<1)
        res.json({"status":false, "message":"Sender user doesn't exist."})
      else{
        console.log("sender exists : " + result[0].id);
        sender_id = result[0].id;
        wallet = parseInt(result[0].wallet);
        if(amount > wallet)
          res.json({"status":false, "message":"Transaction amount greater than money in wallet"})
        else{
          new_sender_wallet = wallet - amount;
          console.log("new sender wallet : " + new_sender_wallet);


          //Check if the receiver transact id is valid
          console.log("receiver:"+receiver_id)
          connection.query("SELECT `user_info`.`wallet` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`id`=?",[receiver_id],function(err, result){
            if (err) throw err;
            if(result.length<1)
            res.json({"status":false, "message":"Receiver user doesn't exist."})
            else{
              console.log("receiver exists : " + receiver_id);
              new_receiver_wallet = parseInt(result[0].wallet) + amount;
              console.log("new receiver wallet : " + new_receiver_wallet);

              
              //Create new entry in transaction table
              connection.query('INSERT INTO `heroku_2f4d6f8d48f57a4`.`transactions` ( `sender_id`, `receiver_id`, `amount`) VALUES (?, ?, ?)',[sender_id,receiver_id, amount],function(err, result){
                if(err) throw err;
                
                  //Update the wallets of the sender and user
                connection.query("UPDATE `heroku_2f4d6f8d48f57a4`.`user_info` SET `wallet` = ? WHERE `id` = ?",[new_sender_wallet,sender_id],function(err,result){
                  if(err) throw err;

                    connection.query("UPDATE `heroku_2f4d6f8d48f57a4`.`user_info` SET `wallet` = ? WHERE `id` = ?",[new_receiver_wallet,sender_id],function(err,result){
                      if(err) throw err;
      
                      console.log("Transaction successful");
                      res.json({"status":true, "wallet":new_sender_wallet});
                    })
                })
              })      
            }
          })
        }

      }
    })

});

})

//Get list of 
router.get('/lent', function(req, res){
  const transact_id = req.body.transact_id;
  var user_id;

  pool.getConnection(function(err, connection) {
    if (err) throw err; // not connected!
        
    connection.query("SELECT `user_info`.`id` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`transact_id`=?",[transact_id],function(err, result){
      if (err) throw err;

      if(result.length<1)
        res.json({"status":false, "message":"No such user."})
      else{
        user_id = result[0].id;
        connection.query("SELECT `transactions`.`transact_no`,`transactions`.`receiver_id`,`transactions`.`amount` FROM `heroku_2f4d6f8d48f57a4`.`transactions` WHERE `transactions`.`sender_id`=?",[user_id],function(err, result){
          if(err) throw err;

          for(i=0;i<result.length;i++){
            connection.query("SELECT `user_info`.`name,` FROM `heroku_2f4d6f8d48f57a4`.`user_info` where `user_info`.`id`=?")
          }

        })
      }

    })
});
})

module.exports = router;