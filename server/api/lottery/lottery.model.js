'use strict';


var request = require('request'),
var entrant = require('../entrant.entrant.model.js'),
var mongoose = require('mongoose'),

  Schema = mongoose.Schema;

var LotterySchema = new Schema({
  name: String,
  info: String,
  address: String,
  publicKey: String,
  privateKey: String,
  amountBTC: Number,
  startDate: {type: Date, default: Date.now},
  endDate: {type: Date, default: Date.now},
  entrants: [entrant.EntrantSchema],
});

// var EntrantSchema = new Schema({
//   address: String,
//   amountBTC: Number
// });

module.exports = mongoose.model('Lottery', LotterySchema);