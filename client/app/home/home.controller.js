'use strict';

angular.module('bitLotteryApp')
  .controller('HomeCtrl', function ($scope, $http, socket) {

//On server load, retrieve all loteries



    $http.get('/api/lotteries').success(function(lotteries) {
      $scope.lotteries = lotteries;
      console.log('lotteries loaded');
      socket.syncUpdates('lottery', $scope.lotteries);
    });
  });
