'use strict';

var _ = require('lodash');
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
  Lottery.create(req.body, function(err, lottery) {
    if(err) { return handleError(res, err); }
    return res.json(201, lottery);
  });
};

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

function resolveLottery(lottery){

}



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