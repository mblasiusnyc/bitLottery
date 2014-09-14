/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Lottery = require('./lottery.model');

exports.register = function(socket) {
  Lottery.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  Lottery.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('lottery:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('lottery:remove', doc);
}