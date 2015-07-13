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
* `host` - Couchbase cluster host (Can not be used with location). Default `localhost`
* `port` - Couchbase cluster port (Can not be used with location). Default `8091`
* `partition` - Couchbase bucket Default: `default`

*See [catbox client](https://github.com/hapijs/catbox#client) and 
[couchbase](https://github.com/couchbase/couchnode) for more details and options.*

### License

Licensed under The MIT License (MIT)  
For the full copyright and license information, please view the LICENSE.txt file.

[npm-url]: http://npmjs.org/package/catbox-couchbase
[npm-image]: https://badge.fury.io/js/catbox-couchbase.png

[travis-url]: https://travis-ci.org/cmfatih/catbox-couchbase
[travis-image]: https://travis-ci.org/cmfatih/catbox-couchbase.svg?branch=master