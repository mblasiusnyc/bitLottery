'use strict';

angular.module('bitLotteryApp')
  .controller('AdminCtrl', function ($scope, $http, Auth, User, socket) {

    //On server load, retrieve all loteries
    $http.get('/api/lotteries').success(function(lotteries) {
      $scope.lotteries = lotteries;
      console.log('lotteries loaded');
      socket.syncUpdates('lottery', $scope.lotteries);
    });

    // Use the User $resource to fetch all users
    $scope.users = User.query();

    $scope.delete = function(user) {
      User.remove({ id: user._id });
      angular.forEach($scope.users, function(u, i) {
        if (u === user) {
          $scope.users.splice(i, 1);
        }
      });
    };
  });
