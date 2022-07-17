'use strict';
const config = require('./config');


const assert = require('assert-plus');
const Change = require('ldapjs').Change;

var overrides = {};

function modifyRequest(ber) {
    assert.ok(ber)
  
    this.object = ber.readString()
  
    ber.readSequence()
    const end = ber.offset + ber.length
    while (ber.offset < end) {
      const c = new Change()
      c.parse(ber)
      c.modification.type = c.modification.type
      this.changes.push(c)
    }
  
    this.changes.sort(Change.compare)
    return true
  }

overrides.all = function (server){
    server.ModifyRequest.prototype._parse = modifyRequest;
    return server;
}


module.exports = overrides.all;