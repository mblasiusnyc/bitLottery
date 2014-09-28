'use strict';

angular.module('bitLotteryApp')
  .controller('LotteryCtrl', function ($scope, $http) {

    $scope.options = [
      {text: 'Bitcoin', value: 'main', selected: true},
      {text: 'TestNet', value: 'test3'}
    ];

    // $scope.endDate = new Date().toString().substring(4,15);
    // $scope.endTime = "2014-09-30T04:00:00.000Z";
    // $scope.startDate = new Date().toString().substring(4,15);
    // $scope.startTime = "2014-09-30T04:00:00.000Z";

    // var lotteryStart = $scope.startDate.substring(0, 10) + $scope.startTime.substring(10);
    // var lotteryEnd = $scope.endDate.substring(0, 10) + $scope.endTime.substring(10);

    $scope.newLottery = {
      publicKey: "",
      privateKey: "",
      amountBTC: 0,
      winner: "",
      network: "main",
      entrants: []
    };

    $scope.createLottery = function(){
      // $newLottery.endDate = lotteryEnd;
      // $newLottery.startDate = lotteryStart;

      console.log("newLottery: ", $scope.newLottery);
      $http.post('/api/lotteries', $scope.newLottery).success(function(data){
        console.log("data: ",data);
      });
    }

    $scope.deleteLottery = function(lottery){
      $http.delete('/api/lotteries/'+lottery._id).success(function(response){
        console.log("lottery has been deleted: ",response)
      });
    };

    $scope.endLottery = function(lottery){
      $http.put('/api/lotteries/'+lottery._id+'/resolve', lottery).success(function(res){
        console.log("Response from backend: ", res)
      });
    };
  });
