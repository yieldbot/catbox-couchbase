## catbox-couchbase

[![NPM][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]

Couchbase adapter for [catbox](https://github.com/hapijs/catbox).

### Installation

```
npm install catbox-couchbase
```

### Usage

#### Options

* `location` - Couchbase cluster location. Default `localhost:8091`
* `bucket` - Couchbase bucket. Default: `default`
* `partition` - Cache key prefix. Partition is intentionally used for cache key
  prefix since Couchbase recommends <= 10 buckets for per cluster.
  Also Catbox sets partition to `catbox` if it is not defined so use `NONE` for
  no partition.
* `flags` - Flags
  * `keepAlive` - Keep connection alive. Default `true`
  * `bypassCacheOnConnError` - Bypass cache if there is a connection error. Default `false`
  * `debug` - List of flags (`['events']`) for debugging. Default `[]`

*See [catbox client](https://github.com/hapijs/catbox#client) and 
[couchbase](https://github.com/couchbase/couchnode) for more details and options.*

### License

Licensed under The MIT License (MIT)  
For the full copyright and license information, please view the LICENSE.txt file.

[npm-url]: http://npmjs.org/package/catbox-couchbase
[npm-image]: https://badge.fury.io/js/catbox-couchbase.png

[travis-url]: https://travis-ci.org/cmfatih/catbox-couchbase
[travis-image]: https://travis-ci.org/cmfatih/catbox-couchbase.svg?branch=master