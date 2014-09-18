'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');
var Lottery = require('./lottery.model');

// Get list of lotterys
exports.index = function(req, res) {
  Lottery.find(function (err, lotterys) {
    if(err) { return handleError(res, err); }
    return res.json(200, lotterys);
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
  var entrantData = req;
  var mongoId = req.params._id;
  // console.log(req.query);
  // console.log("An entry has been logged");
  // console.log("_id is: ", mongoId);
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