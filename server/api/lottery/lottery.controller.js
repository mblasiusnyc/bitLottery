'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var secureRandom = require('secure-random');
var Bitcoin = require('bitcoinjs-lib');
var convertHex = require('convert-hex');
var Lottery = require('./lottery.model');
var bases = require('bases');
var chain = require('chain-node');
var cs = require('coinstring');

console.log(Bitcoin.convert);

// Get list of lotterys
exports.index = function(req, res) {
  Lottery.find(function (err, lottery) {
    if(err) { return handleError(res, err); }
    return res.json(200, lottery);
  });
};

// Get a single lottery
exports.show = function(req, res) {
  Lottery.findById(req.params.id, function (err, lottery) {
    if(err) { return handleError(res, err); }
    if(!lottery) { return res.send(404); }
    return res.json(lottery);
  });
};


//testnet wallet: hum heel those lung dreamer path creator rhythm stage dim brave bit
// Creates a new lottery in the DB.

exports.create = function(req, res) {
  var apiResponseBody;
  var newLotteryObj = req.body;

  var getBtcAddress = function(done){
    request.post('https://api.blockcypher.com/v1/btc/main/addrs?token=27cdb6a15c19574278edcecb049a4119', function(err, response){
      apiResponseBody = JSON.parse(response.body);
      console.log("address response from api: ", apiResponseBody)
      newLotteryObj.address = apiResponseBody.address;
      newLotteryObj.publicKey = apiResponseBody.public;
      newLotteryObj.privateKey = cs.encode(new Buffer(apiResponseBody.private + "01", 'hex'), 0x80);
      console.log(newLotteryObj.privateKey);
      done(null, "done with api BTCaddress request");
    });
  }

  var createLottery = function() {
     Lottery.create(newLotteryObj, function(err, lottery) {
      if(err) { return handleError(res, err); }
      console.log("lottery in database: ", lottery);
      createEntrantsWebhook(lottery);
      return res.json(201, lottery);
    });
   }
  async.series([getBtcAddress], createLottery);
};

function createEntrantsWebhook(lottery){
  var data = {
    "url": "http://btclottery.ngrok.com/api/lotteries/" + lottery._id +"/webhook",
    "event": 'unconfirmed-tx',
    "address": lottery.address,
    "token": "27cdb6a15c19574278edcecb049a4119"
  };

  var options = {
    url: 'https://api.blockcypher.com/v1/btc/main/hooks',
    port: 80,
    json: data
  };

  request.post(options, function(err, responseData){
    if(err) {console.log('Error creating webhook: ', err)};
    console.log("Response Data (body): ",responseData.body);
    console.log("webhook created, waiting for callbacks at : ", data.url);
  });
};

exports.recordEntrant = function(req,res,next) {
  //catches webhook posts for new entrants
  console.log("Record Entrant");
  // console.log("body", req.body);

  for(var i=0;i<req.body.outputs.length;i++){
    console.log("outputs.addresses"+ i, req.body.outputs[i].addresses);
  }


  var entrantAddress = req.body.addresses[0];
  var lotteryAddress = req.body.addresses[1];
  var entrantAmountBtc = req.body.total/100000000;


  console.log("entrantAddress: ", entrantAddress);
  console.log("lotteryAddress: ", lotteryAddress);
  console.log("entrantAmountBtc: ", entrantAmountBtc);
  Lottery.findById(req.params._id, function(err, lottery){
    if(err){console.log('err: ', err)};
    lottery.entrants.push({'address': entrantAddress, 'amountBTC': entrantAmountBtc});
    lottery.amountBTC += entrantAmountBtc;
    lottery.save();
  });
  res.end();
}

//END LOTTERY FUNCTIONS
exports.endLottery = function(req, res){
  if(req.body._id) { delete req.body._id; }
  Lottery.findById(req.params.id, function (err, lottery){
    if(err){ return handleError(res,req); }
    if(!lottery) { return res.send(404); }
    var endingLottery = lottery;
    endingLottery.endDate = new Date();
    endingLottery.winner = decideWinner(lottery);
    // res.json(200, endingLottery);
  });
}


exports.payWinner = [
// 1. Post our simple transaction information to get back the fully built transaction,
//    includes fees when required.
  function newTransaction(req,res,next){
  //Set variables in function wide scope
  req.inputSource = {
    private : req.body.privateKey,
    public  : req.body.publicKey,
    address : req.body.address
  };
  // console.log("req.body: ", req.body)

  var newtx = {
    "inputs": [{"addresses": [req.inputSource.address]}],
    "outputs": [{"addresses": ['1PZoH7aHiM3c5zxSHPgXWWSm9AyZcDLv8M'], "value": -1}]
  }

  // console.log(newtx)

  request.post({url: "https://api.blockcypher.com/v1/btc/main/txs/new", body: JSON.stringify(newtx)}, function(err, httpResponse, body){
    req.newtx = JSON.parse(body);
    // console.log(JSON.parse(body));
    next();
  });
  },

  // 2. Sign the hexadecimal strings returned with the fully built transaction and include
  //    the req.inputSource public address.
  function signAndSend(req,res,next){
    // console.log("req.newtx.inputs: ",req.newtx.tx.inputs);
    // console.log("req.newtx.outputs: ",req.newtx.tx.outputs);

    // console.log('req.inputSource.private', req.inputSource.private);
    var key = new Bitcoin.ECKey.fromWIF(req.inputSource.private);
    // console.log('key', key);

// console.log(req.newtx.tx.inputs)
    var newtx = new Bitcoin.Transaction();
    for(var i=0; i<req.newtx.tx.inputs.length; i++){
      newtx.addInput(req.newtx.tx.inputs[i].prev_hash, 0);
      console.log(req.newtx.tx.inputs[i].prev_hash)
    }


    newtx.addOutput(req.body.winner, 10000);

    for(var i=0; i<req.newtx.tx.inputs.length; i++){
      newtx.sign(i, key);
    }
    // console.log(req.inputSource)
    // console.log(newtx);

    console.log("Tx Hash: ", newtx.toHex());


    chain.sendTransaction(newtx.toHex(), function(err, resp) {
      console.log('Error: ' + err);
      console.log('Resp: ',resp);
    });
    // request.post({url: "https://api.blockcypher.com/v1/btc/main/txs/send",
    //   body: JSON.stringify(newtx)}, function(err, httpResponse, body){
    //   if(err) console.log("err:", err);
    //   // if(httpResponse) console.log("httpResponse:", httpResponse);
    //   if(body) console.log("body:", body);
    // // console.log("body from signAndSend function: ", body);
    //   req.finaltx = body;
    // });
    res.end();
  }
]

function decideWinner(lottery){
  var totalPool = lottery.amountBTC;
  var entrantsObject = {};
  var winRangeStart = 0;
  var winNumber = Math.random(); //replace with secure-random
  var winAddress;
  for(var i=0; i<lottery.entrants.length; i++){
    var entrantBTC = lottery.entrants[i].amountBTC;
    var entrantAddress = lottery.entrants[i].address;
    entrantsObject[entrantAddress] = [winRangeStart, winRangeStart+(entrantBTC/totalPool)];
    winRangeStart = (entrantBTC/totalPool)+.00001;
    if(entrantsObject[entrantAddress][0] < winNumber && entrantsObject[entrantAddress][1] > winNumber){
      winAddress = entrantAddress;
    }
  };
  winRangeStart = 0;
  // console.log("winner is: ", winAddress);
  // console.log("winning number is: ", winNumber);
  // console.table(entrantsObject);
  return winAddress;
}





// Updates an existing lottery in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Lottery.findById(req.params.id, function (err, lottery) {
    if (err) { return handleError(res, err); }
    if(!lottery) { return res.send(404); }
    var updated = _.merge(lottery, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, lottery);
    });
  });
};

// Deletes a lottery from the DB.
exports.destroy = function(req, res) {
  Lottery.findById(req.params.id, function (err, lottery) {
    if(err) { return handleError(res, err); }
    if(!lottery) { return res.send(404); }
    lottery.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}