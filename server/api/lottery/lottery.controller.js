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

      newLotteryObj.address = apiResponseBody.address.toUpperCase();
      newLotteryObj.publicKey = apiResponseBody.public;
      newLotteryObj.privateKey = apiResponseBody.private;
      console.log("I am a lottery inside getBtcAddress:", newLotteryObj)
      done(null, "done with api BTCaddress request");
    });
  }

  var createLottery = function() {
    console.log("I am a lottery inside createlottery:", newLotteryObj)
     Lottery.create(newLotteryObj, function(err, lottery) {
      if(err) { return handleError(res, err); }

      return res.json(201, lottery);
    });
   }

  var saveBtcAddress = function(done){
    // req.body.publicKey = apiResponseBody.public;
    // req.body.privateKey = apiResponseBody.private;
    done(null, "done saving BTC address");
  }

  async.series([getBtcAddress], createLottery);
};


// function saveBtcAddress(done){
//   publicKey: responseObject.public,
//   privateKey: responseObject.private
// }


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