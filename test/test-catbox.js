/* jslint node: true */
/* global describe: false, it: false */
'use strict';

var Client = require('../'),
    Catbox = require('catbox'),
    expect = require('chai').expect;

// Tests

describe('catbox', function() {

  var client;
  beforeEach(function() {
    client = new Catbox.Client(Client, {flags: {isMock: true}});
  });
  afterEach(function() {
    client.stop();
  });

  it('should create a connection', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);
      done();
    });
  });

  it('should end the connection', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);
      client.stop();
      expect(client.isReady()).to.equal(false);
      done();
    });
  });

  it('should set and get an item', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      var key = {id: 'foo', segment: 'test'};
      client.set(key, 'bar', 1000, function(err) {
        expect(err).to.equal(undefined);

        client.get(key, function(err, result) {
          expect(err).to.equal(null);
          expect(result).to.be.a('object');
          expect(result.item).to.equal('bar');
          done();
        });
      });
    });
  });

  it('should set and get an item (30 days)', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      var key = {id: 'foo30', segment: 'test'};
      client.drop(key, function(err) {
        expect(err).to.equal(undefined);

        // TODO: Watch the issue
        // https://github.com/couchbase/couchnode/pull/41
        client.set(key, 'bar', 1000*60*60*24*29, function(err) {
          expect(err).to.equal(undefined);

          client.get(key, function(err, result) {
            expect(err).to.equal(null);
            expect(result).to.be.a('object');
            expect(result.item).to.equal('bar');
            done();
          });
        });
      });
    });
  });

  it('should set and get an item (>30 days)', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      var key = {id: 'foo31', segment: 'test'};
      client.drop(key, function(err) {
        expect(err).to.equal(undefined);

        client.set(key, 'bar', 1000*60*60*24*31, function(err) {
          expect(err).to.equal(undefined);

          client.get(key, function(err, result) {
            expect(err).to.equal(null);
            expect(result).to.be.a('object');
            expect(result.item).to.equal('bar');
            done();
          });
        });
      });
    });
  });

  it('should fail to set an item due to value', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      var key = {id: 'bar', segment: 'test'},
          val = {'baz': 'qux'};
      val.val = val;
      client.set(key, val, 1000, function(err) {
        expect(err.message).to.equal('Converting circular structure to JSON');
        done();
      });
    });
  });

  it('should fail to set an item due to key', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      client.set(null, {}, 1000, function(err) {
        expect(err.message).to.equal('Invalid key');

        client.set({}, {}, 1000, function(err) {
          expect(err.message).to.equal('Invalid key');
          done();
        });
      });
    });
  });

  it('should fail to set an item due to ttl', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      client.set({id: 'baz', segment: 'test'}, {}, 'boom', function(err) {
        expect(err.message).to.equal('invalid ttl');
        done();
      });
    });
  });

  it('should return null - key', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      client.get(null, function(err, result) {
        expect(err).to.equal(null);
        expect(result).to.equal(null);
        done();
      });
    });
  });

  it('should fail to return - key', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      client.get({}, function(err, result) {
        expect(err.message).to.equal('Invalid key');
        expect(result).to.equal(undefined);
        done();
      });
    });
  });

  it('should drop an item', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      var key = {id: 'qux', segment: 'test'};
      client.set(key, 'foo', 1, function(err) {
        expect(err).to.equal(undefined);
        client.drop(key, function(err) {
          expect(err).to.equal(undefined);
          client.get(key, function(err, result) {
            expect(err).to.equal(null);
            expect(result).to.equal(null);
            done();
          });
        });
      });
    });
  });

  it('should fail to drop an item due to key', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      client.drop(null, function(err, result) {
        expect(err.message).to.equal('Invalid key');
        expect(result).to.equal(undefined);

        client.drop({}, function(err, result) {
          expect(err.message).to.equal('Invalid key');
          expect(result).to.equal(undefined);
          done();
        });
      });
    });
  });

  it('should validate segment', function(done) {
    expect(client.validateSegmentName().message).to.equal('invalid segment name');
    expect(client.validateSegmentName('\n').message).to.equal('invalid segment name');
    expect(client.validateSegmentName('\0').message).to.equal('invalid segment name');
    expect(client.validateSegmentName('\t').message).to.equal('invalid segment name');
    expect(client.validateSegmentName(' ').message).to.equal('invalid segment name');
    done();
  });

  it('should return null - ttl', function(done) {
    client.start(function(err) {
      expect(err).to.equal(undefined);
      expect(client.isReady()).to.equal(true);

      var key = {id: 'foobar', segment: 'test'};
      client.set(key, 'boom', 1, function(err) {
        expect(err).to.equal(undefined);
        setTimeout(function() {
          client.get(key, function(err, result) {
            expect(err).to.equal(null);
            expect(result).to.equal(null);
            done();
          });
        }, 2000);
      });
    });
  });

});