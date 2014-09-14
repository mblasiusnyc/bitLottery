'use strict';

angular.module('bitLotteryApp')
  var ModalCtrl = function ($scope, $modal, $log) {

    $scope.items = ['item1', 'item2', 'item3'];


    $scope.open = function (lottery, size) {
      $scope.lottery = lottery;
      var moreInfoModalInstance = $modal.open({
        templateUrl: 'lotteryInfo.html',
        controller: ModalInstanceCtrl,
        size: size,
        resolve: {
          lottery: function () {
            return $scope.lottery;
          },
          openQrModal: function (){
            return $scope.openQrModal;
          }
        }
      });

      moreInfoModalInstance.result.then(function (selectedItem) {
        $scope.selected = selectedItem;
      }, function () {
        $log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.openQrModal = function(lottery){
      console.log(lottery);
      $scope.lottery = lottery;
      // $scope.close();
      var qrModalInstance = $modal.open({
        templateUrl: 'lotteryQR.html',
        controller: ModalInstanceCtrl,
        resolve: {
          lottery: function () {
            return $scope.lottery;
          },
          openQrModal: function (){
            return $scope.openQrModal;
          }
        }
      });
      qrModalInstance.result.then(function (selectedItem) {
        $scope.selected = selectedItem;
      }, function () {
        $log.info('Modal dismissed at: ' + new Date());
      });
    };
  };


  // Please note that $modalInstance represents a modal window (instance) dependency.
  // It is not the same as the $modal service used above.

  var ModalInstanceCtrl = function ($scope, $modalInstance, $modal, lottery, openQrModal) {

    $scope.openQrModal = openQrModal;

    $scope.lottery = lottery;
    // $scope.selected = {
    // item: $scope.items[0],
    // lottery: $scope.lottery
    // };

    $scope.ok = function () {
      $modalInstance.close($scope.selected.item);
    };

    $scope.close = function () {
      $modalInstance.dismiss('close');
    };
  };

