'use strict';

describe('Service: lottery', function () {

  // load the service's module
  beforeEach(module('bitLotteryApp'));

  // instantiate service
  var lottery;
  beforeEach(inject(function (_lottery_) {
    lottery = _lottery_;
  }));

  it('should do something', function () {
    expect(!!lottery).toBe(true);
  });

});
