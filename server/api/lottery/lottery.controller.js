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

exports.create =
  [
    function getBtcAddress(req, res, next) {
      req.newLotteryObj = req.body;
      // console.log("req.body", req.body);
      // console.log("typeof req.body", typeof req.body);
      // console.log("req.newLotteryObj.network: ", req.newLotteryObj.network);
      request.post('https://api.blockcypher.com/v1/btc/' + req.newLotteryObj.network + '/addrs?token=27cdb6a15c19574278edcecb049a4119', function(err, res){
        var apiResponseBody = JSON.parse(res.body);
        req.newLotteryObj.address = apiResponseBody.address;
        req.newLotteryObj.publicKey = apiResponseBody.public;
        req.newLotteryObj.privateKey = cs.encode(new Buffer(apiResponseBody.private + "01", 'hex'), 0x80);
        next();
      });
    },
    function createEntrantsWebhook(req,res,next){
      var data = {
        "url": "http://bitlottery2.ngrok.com/api/lotteries/" + req.newLotteryObj.address + "/webhook",
        "event": 'unconfirmed-tx',
        "address": req.newLotteryObj.address,
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
        req.newLotteryObj.webhookId = responseData.body.id;
        next();
      });
    },
    function createLottery(req,res,next) {
      console.log('req.newLotteryObj before creating db lottery: ',req.newLotteryObj);
      Lottery.create(req.newLotteryObj, function(err, lottery) {
        if(err) { return handleError(res, err); }
        console.log("lottery added to database: ", lottery);
        req.newLotteryObj = lottery;
        res.json(req.newLotteryObj);
      });
    }
  ]

exports.recordEntrant = function(req,res,next) {
  console.log("Record Entrant");
  var entrantAddress = req.body.addresses[0];
  var lotteryAddress = req.body.addresses[1];
  var entrantAmountBtc = req.body.total/100000000;

  console.log("entrantAddress: ", entrantAddress);
  console.log("lotteryAddress: ", lotteryAddress);
  console.log("entrantAmountBtc: ", entrantAmountBtc);
  Lottery.findOne({address: req.params.address}, function(err, lottery){
    if(err){console.log('err: ', err)};
    lottery.entrants.push({'address': entrantAddress, 'amountBTC': entrantAmountBtc});
    lottery.amountBTC += entrantAmountBtc;
    lottery.save();
  });
  res.end();
}

//END LOTTERY FUNCTIONS
exports.endLottery =
  [
    function(req, res, next){
      if(req.body._id) { delete req.body._id; }
      Lottery.findById(req.params.id, function (err, lottery){
        if(err){ return handleError(res,req); }
        if(!lottery) { return res.send(404); }
        var endingLottery = lottery;
        endingLottery.endDate = new Date();
        endingLottery.winner = decideWinner(lottery);

  //Set variables in function wide scope
        req.endingLottery = endingLottery;
        req.txInputs = {
          private   : endingLottery.privateKey,
          public    : endingLottery.publicKey,
          address   : endingLottery.address,
          winner    : endingLottery.winner,
          amountBTC : endingLottery.amountBTC
        };
        next();
      });
    },
    function newTransaction(req,res,next){

    var newtx = {
      "inputs": [{"addresses": [req.txInputs.address]}],
      "outputs": [{"addresses": ['1PZoH7aHiM3c5zxSHPgXWWSm9AyZcDLv8M'], "value": -1}]
    }

    request.post({url: "https://api.blockcypher.com/v1/btc/main/txs/new", body: JSON.stringify(newtx)}, function(err, httpResponse, body){
      req.newtx = JSON.parse(body);
      next();
    });
    },
    function signAndSend(req,res,next){
      var key = new Bitcoin.ECKey.fromWIF(req.txInputs.private);
      var newtx = new Bitcoin.Transaction();
      for(var i=0; i<req.newtx.tx.inputs.length; i++){
        newtx.addInput(req.newtx.tx.inputs[i].prev_hash, 0);
      }
      newtx.addOutput(req.txInputs.winner, 10000);
      for(var i=0; i<req.newtx.tx.inputs.length; i++){
        newtx.sign(i, key);
      }

      chain.sendTransaction(newtx.toHex(), function(err, resp) {
        console.log('Error: ' + err);
        console.log('Resp: ',resp);
      });

          // res.status(404).send('Transaction was rejected by the bicoin network');
          console.log("Tx Hash: ", newtx.toHex());
      res.json(200, { hexData: newtx.toHex() });
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
exports.destroy =
  [
    function deleteLottery(req, res) {
      Lottery.findById(req.params.id, function (err, lottery) {
        if(err) { return handleError(res, err); }
        if(!lottery) { return res.send(404); }
        lottery.remove(function(err) {
          if(err) { return handleError(res, err); }
          deleteWebhook(lottery);
        });
      });
    },
  ]

  function deleteWebhook(lottery){
    request.del('https://api.blockcypher.com/v1/btc/' + lottery.network + '/hooks/'+lottery.webhookId, function(err, response){
      console.log("Webhook deleted - id: ", lottery.webhookId);
      console.log("err: ", err);
      // console.log("response: ", response);
    });
  }

function handleError(res, err) {
  return res.send(500, err);
}