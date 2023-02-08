[![CircleCI](https://dl.circleci.com/status-badge/img/gh/alyne/hapi-multi-mongo/tree/feature%2Fupgrade-packages.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/alyne/hapi-multi-mongo/tree/feature%2Fupgrade-packages)

# Hapi-Multi-Mongo

Battle tested Hapi mongodb connection plugin, especially for multiple connections

#### Supports Hapi >= 17
To use with older versions of Hapi, please use 3.1.1 version 

## Motivation

Motivation to create this plugin is accessing multiple MongoDB servers and various databases in request/reply life cycle. 
The plugin accepts complex configuration options and exposes/decorates connections object to the server object. 

Connection options can be a single object with the following keys:

- connection: *Required.* Single MongoDB connection uri (eg. `mongodb://user:pass@localhost:27017/db_name`) or an array 
of multiple servers. Connection configuration can be a string, object or an array combination of object and strings. 
You can find a detailed explanation of this configuration in [Usage](#usage) section. One simple tip here, you have to connect 
directly to a database, or you have to provide a connection name for each connection element, plugin stores and exposes 
connections through database name or a given name. 
- options: *Optional.* Provide extra settings for the connection, see [MongoClient documentation](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html). 
You can override this setting by providing additional connection options to each server. 
- decorate: *Optional.* Rather have exposed objects accessible through server and request decorations.  
    - If `true`, `server.mongo` else `request.mongo` 
- name: *Optional.* Exposed name to server and request object if you want to access connections other than name mongo.
    - If `myMongos`, `server.myMongos` else `request.myMongos` 


#### Acknowledgements
 
This module borrows from hapi-mongodb, thank you to @Marsup for his excellent work. 

[hapi-mongodb]: https://github.com/Marsup/hapi-mongodb

### Installation:

```no-highlight
npm install hapi-multi-mongo
```

#### Usage:

Configuration object options. All of the samples in below are correct
```js
// single connection to db_name
// access with request.server.plugins['hapi-multi-mongo'].mongo.db_name
// you can pick a collection and query from this usage
{
    connection: 'mongodb://localhost:27017/db_name'
}
// single connection to db_name
// access with request.server.plugins['hapi-multi-mongo'].mongo.myConn
// in this usage, you have to pick a database first
// then you need to choose a collection then you can have queries on that collection,
// keep that in mind
{
    connection: {
      uri: 'mongodb://localhost:27017',
      name: 'myConn'
    }
}

// single with custom name
// access with request.server.plugins['hapi-multi-mongo'].mongo.myDb
{
    connection: {uri: 'mongodb://localhost:27017/db_name', name: 'myDb'}
}
// single with options
// access with request.server.plugins['hapi-multi-mongo'].mongo.db_name
{
    connection: {uri: 'mongodb://localhost:27017/db_name', options: {fsync: true}}
}

// single with decorate
// access with server.mongo.db_name, request.mongo.db_name
{
    connection: 'mongodb://localhost:27017/db_name',
    decorate: true
}

// single with decorate and custom name
// access with server.myMongos.db_name, request.myMongos.db_name
{
    connection: 'mongodb://localhost:27017/db_name',
    decorate: true,
    name: 'myMongos'
}

// multi server
// access with request.server.plugins['hapi-multi-mongo'].mongo.db_name
// request.server.plugins['hapi-multi-mongo'].mongo.db_name_2
{
    connection: [
        'mongodb://localhost:27017/db_name',
        'mongodb://localhost:27018/db_name_2'
    ]
}

// multi server with custom name
// access with request.server.plugins['hapi-multi-mongo'].mongo.db_name
// request.server.plugins['hapi-multi-mongo'].mongo.myDB
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB'}
    ]
}

// multi server with decorate
// access with server.mongo.db_name, request.mongo.db_name
// server.mongo.myDB, request.mongo.myDB
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB'}
    ],
    decorate: true
}

// multi server with options
// access with server.mongo.db_name, request.mongo.db_name with fsync: true
// server.mongo.myDB, request.mongo.myDB with fsync: false
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB', options: {fsync: false}}
    ],
    decorate: true,
    options: {fsync: true}
}


// custom promise library
// access with server.mongo.db_name, request.mongo.db_name uses native mongo promise implementation
// server.mongo.myDB, request.mongo.myDB uses bluebird as a promise library
{
    connection: [
        'mongodb://localhost:27017/db_name',
        {uri: 'mongodb://localhost:27018/db_name', name: 'myDB', options: {promiseLibrary: require('bluebird')}}
    ],
    decorate: true
}

```
##### Example App:

```js
const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');

const startServer = async function() {
    
    const dbOpts = {
        "connection": [
          "mongodb://localhost:27017/test",
          { uri: "mongodb://localhost:27017", name: "remoteMongo"}
        ],
        "options": {
            "native_parser": false
        }
    };
    
    const server = Hapi.Server();
    
    await server.register({
        plugin: require('hapi-multi-mongo'),
        options: dbOpts
    });
    
    // pick collection from database connection
    server.route( {
        "method"  : "GET",
        "path"    : "/users/{id}",
        "handler" : async (request, reply) => {
            const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
            const collection = mongos['test'].db().collection('users');

            try {
                const result = await collection.findOne({  "_id" : request.params.id });
                return result;
            }
            catch(err){
                return Boom.internal('Internal MongoDB error', err)
            }
        }
    });
    
    // access directly to the mongo object and pick database and collection
    server.route( {
        "method"  : "GET",
        "path"    : "/dashboard",
        "handler" : async (request, reply) => {
            const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
            const db = mongos.remoteMongo.db('analytics');
            const collection = db.collection('users');

            try {
                const result = await collection.find({});
                return result;
            }
            catch(err){
                return Boom.internal('Internal MongoDB error', err)
            }            
        }
    });

    await server.start();
    console.log(`Server started at ${server.info.uri}`);
};

startServer().catch((err) => {
    console.error(err);
    process.exit(1);
});
```
