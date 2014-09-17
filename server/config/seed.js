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
    address: '1DC79gQ7vief6Q9NANfp3WTcdPEZJ8ynoz'.toUpperCase(),
    publicKey: '1DC79gQ7vief6Q9NANfp3WTcdPEZJ8ynoz',
    privateKey: '5KXxdV3fH3nVMooK7mhzXaBVFEuy6NaJVsBaazsKyqA36TttuTo',
    amountBTC: .3,
    entrants: [{address: '1KfQZXsEZQYFJVLvk5nLYnR1M4iVwX5e6w', amountBTC: .1}, {address:'1MK8sQ82pUpjSTfmCa64tLgPTt1ss6QU4q', amountBTC: .2}],
    startDate: new Date(),
    endDate: new Date(2014, 8, 16, 12, 43),
    winner: ""
    },
    {
    name: 'Second Lottery',
    info: 'Some 2nd lottery info',
    address: '1DC79gQ7vief6Q9NANfp3WTcdPEZJ8ynoz'.toUpperCase(),
    publicKey: '1DC79gQ7vief6Q9NANfp3WTcdPEZJ8ynoz',
    privateKey: '5KXxdV3fH3nVMooK7mhzXaBVFEuy6NaJVsBaazsKyqA36TttuTo',
    amountBTC: .5,
    entrants: [{address: '1KfQZXsEZQYFJVLvk5nLYnR1M4iVwX5e6w', amountBTC: .1}, {address:'1MK8sQ82pUpjSTfmCa64tLgPTt1ss6QU4q', amountBTC: .2}, {address: '1KfQZXsEZQYFJVLvk5nLYnR1M4iVwX5e6w', amountBTC: .1}],
    startDate: new Date(2014, 8, 12),
    endDate: new Date(2014, 8, 15),
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

