'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var controller = require('./lottery.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);

router.post('/', controller.create);
router.post('/:_id/webhook', controller.recordEntrant);

router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;