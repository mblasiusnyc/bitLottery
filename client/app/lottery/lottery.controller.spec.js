'use strict';

describe('Controller: LotteryCtrl', function () {

  // load the controller's module
  beforeEach(module('bitLotteryApp'));

  var LotteryCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    LotteryCtrl = $controller('LotteryCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
