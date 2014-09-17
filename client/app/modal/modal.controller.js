'use strict';

angular.module('bitLotteryApp')
  var ModalCtrl = function ($scope, $modal, $log) {

    $scope.openModal = function (template, lottery, size) {
      $scope.lottery = lottery ? lottery : null;
      var moreInfoModalInstance = $modal.open({
        templateUrl: '/app/templates/'+template+'.html',
        controller: ModalInstanceCtrl,
        size: size,
        resolve: {
          lottery: function () {
            return $scope.lottery;
          }
        }
      });

      moreInfoModalInstance.result.then(function (selectedItem) {
        // $scope.selected = selectedItem;
      }, function () {
        $log.info('Modal dismissed at: ' + new Date());
      });
    };
  };

  // Please note that $modalInstance represents a modal window (instance) dependency.
  // It is not the same as the $modal service used above.

  var ModalInstanceCtrl = function ($scope, $modalInstance, $modal, lottery) {

    $scope.lottery = lottery;

    $scope.ok = function () {
      $modalInstance.close($scope.selected.item);
    };

    $scope.close = function () {
      $modalInstance.dismiss('close');
    };
  };

