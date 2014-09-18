/**
 * Populate DB with sample data on server start
 * to disable, edit config/environment/index.js, and set `seedDB: false`
 */

'use strict';

var Lottery = require('../api/lottery/lottery.model');
var User = require('../api/user/user.model');

Lottery.find({}).remove(function() {
  Lottery.create({
    name: 'First Lottery',
    info: 'This is the info for the first lottery',
    address: '1BwP4PxLzA4SnBTyCmCSXbUyANoWiKB52a'.toUpperCase(),
    publicKey: '044b7ca8cd58ddd86e8fc41bf3d8522922ef0d5a47c6250de9e15f19f236cf9c85554574061c882fd7fab2c75a5e06d6dc39efefa2f4ba9d03f3973fe54b07a2cb',
    privateKey: '5K5x1xjstRanKxc2bkTrLK6j8SSG2Xz6EAtZ3YQjqJmv7TNyM59',
    amountBTC: .3,
    entrants: [{address: '1KfQZXsEZQYFJVLvk5nLYnR1M4iVwX5e6w', amountBTC: .1}, {address:'1MK8sQ82pUpjSTfmCa64tLgPTt1ss6QU4q', amountBTC: .2}],
    startDate: new Date(),
    endDate: new Date(2014, 9, 16, 12, 43),
    winner: ""
    },
    {
    name: 'Second Lottery',
    info: 'Some 2nd lottery info',
    address: '17yzW5ZSKUt1qAky2CKBrWDv5R1oHofLqS'.toUpperCase(),
    publicKey: '04ab037ba9198bd814dca9cf57dfa753a2b4040c78477d158fa6f9b0fb5396c7059e8338875205811df6d89fab9460100de75f4c2824e08e17278bfaa9c485e8f3',
    privateKey: '5Jpr7UhdrxNM6McxoLyfAX3Y3iTVkDwLfQFzhRbHrRHVUv4fE47',
    amountBTC: .5,
    entrants: [{address: '114oEX9xbuP6Afe1Mhw6DQcjyQ9ujNAftx', amountBTC: .1}, {address:'1MK8sQ82pUpjSTfmCa64tLgPTt1ss6QU4q', amountBTC: .2}, {address: '1KfQZXsEZQYFJVLvk5nLYnR1M4iVwX5e6w', amountBTC: .1}],
    startDate: new Date(),
    endDate: new Date(2014, 9, 15),
    winner: ""
  });
});

User.find({}).remove(function() {
  User.create({
    provider: 'local',
    name: 'Test User',
    email: 'test@test.com',
    password: 'test'
  }, {
    provider: 'local',
    role: 'admin',
    name: 'Admin',
    email: 'admin@admin.com',
    password: 'admin'
  }, function() {
      console.log('finished populating users');
    }
  );
});

