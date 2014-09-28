'use strict';

describe('Service: datePicker', function () {

  // load the service's module
  beforeEach(module('bitLotteryApp'));

  // instantiate service
  var datePicker;
  beforeEach(inject(function (_datePicker_) {
    datePicker = _datePicker_;
  }));

  it('should do something', function () {
    expect(!!datePicker).toBe(true);
  });

});