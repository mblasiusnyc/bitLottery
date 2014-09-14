'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LotterySchema = new Schema({
  name: String,
  info: String,
  publicKey: String,
  privateKey: String,
  amountBTC: Number,
  startDate: {type: Date, default: Date.now},
  endDate: {type: Date, default: Date.now},
  entrants: [EntrantSchema],
});

var EntrantSchema = new Schema({
  address: String,
  amountBTC: Number
});

module.exports = mongoose.model('Lottery', LotterySchema);