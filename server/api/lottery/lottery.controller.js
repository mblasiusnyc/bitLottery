'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var secureRandom = require('secure-random');
var Bitcoin = require('bitcoinjs-lib');
var convertHex = require('convert-hex');
var Lottery = require('./lottery.model');
var bases = require('bases');
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

// Creates a new lottery in the DB.

exports.create = function(req, res) {
  var apiResponseBody;
  var newLotteryObj = req.body;
  // var newLottery = req.body;

  var getBtcAddress = function(done){
    request.post('https://api.blockcypher.com/v1/btc/main/addrs?token=27cdb6a15c19574278edcecb049a4119', function(err, response){
      apiResponseBody = JSON.parse(response.body);
      console.log("address response from api: ", apiResponseBody)
      newLotteryObj.address = apiResponseBody.address;
      newLotteryObj.publicKey = apiResponseBody.public;
      newLotteryObj.privateKey = apiResponseBody.private;
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
  console.log("body", req.body);
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
    var newLottery = lottery;
    newLottery.endDate = new Date();
    newLottery.winner = decideWinner(lottery);
    res.json(200, newLottery);
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
  // console.log(req.inputSource.private);
  // req.privateKey = req.body.privateKey;
  console.log('Gets to here')
  console.log(req.inputSource.private)

  // console.log(bases.toBase58(bases.fromBase16(req.inputSource.private)))
  req.key = Bitcoin.ECKey.fromWIF(cs.encode(new Buffer(req.inputSource.private, 'hex'), 0x80));
  console.log(req.key)
  var newtx = {
    "inputs": [{"addresses": [req.inputSource.address]}],
    "outputs": [{"addresses": ['1J7mq2fgXt229LSzFSjWW4ZjD56o1PyzGJ'], "value": -1}]
  }
  request.post({url: "https://api.blockcypher.com/v1/btc/main/txs/new", body: JSON.stringify(newtx)}, function(err, httpResponse, body){
    req.newtx = JSON.parse(body);
    next();
  });
  },

  // 2. Sign the hexadecimal strings returned with the fully built transaction and include
  //    the req.inputSource public address.
  function signAndSend(req,res,next){
    // if (checkError(req.unsignedtx)) return;
    // var newtx = req.newtx;
    req.newtx.pubkeys  = [];
    // console.log(req.newtx['tx']);
    console.log(req.newtx.tosign);
    req.newtx.signatures  = req.newtx.tosign.map(function(tosign) {
      req.newtx.pubkeys.push(req.inputSource.public);
      var tosignBuffer = new Buffer(32);
      tosignBuffer.write(tosign);

      // return bytesToHex(req.key.sign(hexToBytes(tosign)))
      // return convertHex.bytesToHex(req.key.sign(convertHex.hexToBytes(tosignBuffer)));
      return Bitcoin.convert.bufferToWordArray((req.key.sign(Bitcoin.convert.wordArrayToBuffer(tosign))));
    });

    request.post({url: "https://api.blockcypher.com/v1/btc/main/txs/send", body: JSON.stringify(req.newtx)}, function(err, httpResonse, body){
    console.log("body from signAndSend function: ", body);
      req.finaltx = body;
    });
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