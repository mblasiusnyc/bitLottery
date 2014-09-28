'use strict';


var request = require('request');
var mongoose = require('mongoose'),

  Schema = mongoose.Schema;

var LotterySchema = new Schema({
  name: String,
  info: String,
  address: String,
  publicKey: String,
  privateKey: String,
  amountBTC: Number,
  startDate: String,
  endDate: String,
  entrants: [EntrantSchema],
  winner: String,
  network: String,
  webhookId: String
});

var EntrantSchema = new Schema({
  address: String,
  amountBTC: Number
});

module.exports = mongoose.model('Lottery', LotterySchema);