'use strict';

angular.module('bitLotteryApp')
  var ModalCtrl = function ($scope, $modal, $log) {

    $scope.items = ['item1', 'item2', 'item3'];


    $scope.open = function (lottery, size) {
      $scope.lottery = lottery;
      console.log('lottery: ',lottery);
      console.log('$scope.lottery: ',$scope.lottery);
      var modalInstance = $modal.open({
        templateUrl: 'lotteryInfo.html',
        controller: ModalInstanceCtrl,
        size: size,
        resolve: {
          items: function () {
            return $scope.items;
          },
          lottery: function () {
            return $scope.lottery;
          }
        }
      });

      modalInstance.result.then(function (selectedItem) {
        $scope.selected = selectedItem;
      }, function () {
        $log.info('Modal dismissed at: ' + new Date());
      });
    };
  };

  // Please note that $modalInstance represents a modal window (instance) dependency.
  // It is not the same as the $modal service used above.

  var ModalInstanceCtrl = function ($scope, $modalInstance, $modal, lottery) {

    $scope.lottery = lottery;
    // $scope.selected = {
    // item: $scope.items[0],
    // lottery: $scope.lottery
    // };

    $scope.ok = function () {
      $modalInstance.close($scope.selected.item);
    };

    $scope.openQrModal = function(){
      $scope.close();
      var modalInstance = $modal.open({
        templateUrl: 'lotteryQR.html',
        controller: ModalInstanceCtrl,
        size: 'sm',
        resolve: {
          lottery: function () {
            return $scope.lottery;
          }
        }
      });
    };

    $scope.close = function () {
      $modalInstance.dismiss('close');
    };
  };

