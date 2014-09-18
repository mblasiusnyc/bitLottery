'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var secureRandom = require('secure-random');
var Bitcoin = require('bitcoinjs-lib');
var Lottery = require('./lottery.model');

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
      // console.log("apiResponseBody:",apiResponseBody)
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
    "url": "http://btclottery.ngrok.com/api/lotteries/" + lottery._id + "/webhook",
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
    // request.put('http://localhost/api/lotteries/'+newLottery._id);
    res.json(200, newLottery);
  });
}

exports.payWinner = function(req,res){
  var winnerAddress = req.body.winner;
  var poolAddress = req.body.address;
  var poolSize = req.body.amountBTC;
  var poolPublicKey = req.body.publicKey;
  var poolPrivateKey = req.body.privateKey;

  var bytesToHex = Bitcoin.convert.bytesToHex;
  var hexToBytes = Bitcoin.convert.hexToBytes;

  var rootUrl = "https://api.blockcypher.com/v1/btc/main";
  // please do not drain our test account, if you need testnet BTC use a faucet
  // https://tpfaucet.appspot.com/
  var source = {
    private : poolPrivateKey,
    public  : poolPublicKey,
    address : poolAddress
  }
  var key   = Bitcoin.ECKey.fromWIF(source.private);
  var dest  = null;

  // 0. We get a newly generated address
  // function logAddr(addr) {
  //   dest = addr;
  //   log("Generated new address " + dest)
  // }

  // 1. Post our simple transaction information to get back the fully built transaction,
  //    includes fees when required.
  function newTransaction() {
    var newtx = {
      "inputs": [{"addresses": [source.address]}],
      "outputs": [{"addresses": [winnerAddress], "value": -1}]
    }
    return request.post(rootUrl+"/txs/new", JSON.stringify(newtx));
  }

  // 2. Sign the hexadecimal strings returned with the fully built transaction and include
  //    the source public address.
  function signAndSend(newtx) {
    if (checkError(newtx)) return;

    newtx.pubkeys     = [];
    newtx.signatures  = newtx.tosign.map(function(tosign) {
      newtx.pubkeys.push(source.public);
      return bytesToHex(key.sign(hexToBytes(tosign)));
    });
    return request.post(rootUrl+"/txs/send", JSON.stringify(newtx));
  }

  // 3. Open a websocket to wait for confirmation the transaction has been accepted in a block.
  function waitForConfirmation(finaltx) {
    if (checkError(finaltx)) return;
    log("Transaction " + finaltx.tx.hash + " to " + dest.address + " of " +
          finaltx.tx.outputs[0].value/100000000 + " BTC sent.");

    var ws = new WebSocket("ws://socket.blockcypher.com/v1/btc/test3");

    // We keep pinging on a timer to keep the websocket alive
    var ping = pinger(ws);

    ws.onmessage = function (event) {
      if (JSON.parse(event.data).confirmations > 0) {
        log("Transaction confirmed.");
        ping.stop();
        ws.close();
      }
    }
    ws.onopen = function(event) {
      ws.send(JSON.stringify({filter: "event=new-block-tx&hash="+finaltx.tx.hash}));
    }
    log("Waiting for confirmation... (may take > 10 min)")
  }

  function checkError(msg) {
    if (msg.errors && msg.errors.length) {
      log("Errors occured!!/n" + msg.errors.join("/n"));
      return true;
    }
  }

  function pinger(ws) {
    var timer = setInterval(function() {
      if (ws.readyState == 1) {
        ws.send(JSON.stringify({event: "ping"}));
      }
    }, 5000);
    return {stop: function() { clearInterval(timer); }};
  }

  // function log(msg) {
  //   request("div.log").append("<div>" + msg + "</div>")
  // }

function sendTx(sendTxDone){
  request.post(rootUrl+"/addrs");
  sendTxDone(null, httpResponse, body);
}

async.waterfall([sendTx, newTransaction,])

  // Chaining

  //creates a random address
  // request.post(rootUrl+"/addrs")

//logs out the newly created address
  // .then(logAddr)

    .then(newTransaction)
    .then(signAndSend)
    .then(waitForConfirmation);

  // var txDetails = {
  //   'inputs': [
  //     {'addresses': [poolAddress]}
  //   ],
  //   'outputs': [
  //     {'addresses': [winnerAddress], "value": -1}
  //   ]
  // }
  // request.post('https://api.blockcypher.com/v1/btc/main/txs/new', function(response){
  //   console.log("Response from https://api.blockcypher.com/v1/btc/main/txs/new: ",response);
  // }).form(txDetails);
  // res.send(200);
}



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