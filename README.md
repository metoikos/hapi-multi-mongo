[![Build Status](https://travis-ci.org/metoikos/hapi-multi-mongo.svg?branch=master)](https://travis-ci.org/metoikos/hapi-multi-mongo)
# Hapi-Multip-Mongo

## Motivation

Motivation to create this plugin is access multiple mongodb servers and multiple databases in request/reply life cycle.
Plugin accepts complex configuration options and exposes/decorates connections object to server object.

Connection options can be a single object with the following keys:

- connection: *Required.* Single MongoDB connection uri (eg. `mongodb://user:pass@localhost:27017/db_name`) or an array of multiple servers.
Connection configuration can be a string, object or an array combination of object and strings.
You can find detailed explanation of this configuration in [Usage](#usage) section. One simple tip here, you have to connect directly to a database or you have to provide a connection name for each connection element, plugin stores and exposes connections through database name or given name.
- options: *Optional.* Provide extra settings to the connection, see [MongoClient documentation](http://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html#mongoclient-connect-options). You can override this settings with provide additional connection options to each server.
- decorate: *Optional.* Rather have exposed objects accessible through server and request decorations.
    - If `true`, `server.mongo` or `request.mongo`
- name: *Optional.* Exposed name to server and request object if you want to access connections other than name mongo.
    - If `myMongos`, `server.myMongos` or `request.myMongos`


#### Acknoledgements

This module borrows from [hapi-mongodb], thank you to @Marsup for his great work.

[hapi-mongodb]: https://github.com/Marsup/hapi-mongodb

#### Usage:

Configuration object options. All of the samples in below are correct
```js
// single connection to db_name
// access with request.server.plugins['hapi-multi-mongo'].db_name
// you can pick a collection and query from this usage
{
    connection: 'mongodb://localhost:27017/db_name'
}
// single connection to db_name
// access with request.server.plugins['hapi-multi-mongo'].myConn
// in this usage, you have to pick a database first
// then you need to pick collection then you can have queries on that collection
// keep that in mind
{
    connection: {
      uri: 'mongodb://localhost:27017',
      name: 'myConn'
    }
}

// single with custom name
// access with request.server.plugins['hapi-multi-mongo'].myDb
{
    connection: {uri: 'mongodb://localhost:27017/db_name', name: 'myDb'}
}
// single with options
// access with request.server.plugins['hapi-multi-mongo'].db_name
{
    connection: {uri: 'mongodb://localhost:27017/db_name', options: {fsync: true}}
}

// single with expose
// access with server.mongo.db_name, request.mongo.db_name
{
    connection: 'mongodb://localhost:27017/db_name',
    expose: true
}

// single with expose and custom name
// access with server.myMongos.db_name, request.myMongos.db_name
{
    connection: 'mongodb://localhost:27017/db_name',
    expose: true,
    name: 'myMongos'
}

// multi server
// access with request.server.plugins['hapi-multi-mongo'].db_name
// request.server.plugins['hapi-multi-mongo'].db_name_2
{
    connection: [
        'mongodb://localhost:27017/db_name',
        'mongodb://localhost:27018/db_name_2'
    ]
}

// multi server with custom name
// access with request.server.plugins['hapi-multi-mongo'].db_name
// request.server.plugins['hapi-multi-mongo'].myDB
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB'}
    ]
}

// multi server with expose
// access with server.mongo.db_name, request.mongo.db_name
// server.mongo.myDB, request.mongo.myDB
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB'}
    ],
    expose: true
}

// multi server with options
// access with server.mongo.db_name, request.mongo.db_name with fsync: true
// server.mongo.myDB, request.mongo.myDB with fsync: false
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB', options: {fsync: false}}
    ],
    expose: true,
    options: {fsync: true}
}

```
##### Example App:

```js

var Hapi = require("hapi");
var Boom = require("boom");

var dbOpts = {
    "connection": [
      "mongodb://localhost:27017/test",
      { uri: "mongodb://localhost:27017", name: "remoteMongo"}
    ],
    "options": {
        "db": {
            "native_parser": false
        }
    }
};

var server = new Hapi.Server();
server.connection({ port: 3000 });

server.register({
    register: require('hapi-multi-mongo'),
    options: dbOpts
}, function (err) {
    if (err) {
        console.error(err);
        throw err;
    }

    server.start(function() {
        console.log("Server started at " + server.info.uri);
    });
});

// pick collection from database connection
server.route( {
    "method"  : "GET",
    "path"    : "/users/{id}",
    "handler" : (request, reply) => {
        const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
        const collection = mongos['test'].collection('users');

        collection.findOne({  "_id" : request.params.id }, function(err, result) {
            if (err) return reply(Boom.internal('Internal MongoDB error', err));
            reply(result);
        });
    }
});

// access directly to mongo object and pick database and collection
server.route( {
    "method"  : "GET",
    "path"    : "/dashboard",
    "handler" : (request, reply) => {
        const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
        const db = mongos.remoteMongo.db('analytics');
        const collection = db.collection('users');

        collection.find({}, function(err, result) {
            if (err) return reply(Boom.internal('Internal MongoDB error', err));
            reply(result);
        });
    }
});
```
