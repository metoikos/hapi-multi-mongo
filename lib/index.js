'use strict';

const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;

exports.register = (server, options, next) => {

    if (!options.connection) {
        const str = 'Invalid connection options';
        server.log(['hapi-multi-mongo', 'error'], str);
        return next(str);
    }

    // main connection object
    const connections = {};
    // ref: Creating a regex for mongoose URI http://stackoverflow.com/a/25072703/12078
    const uriPattern = '^(mongodb:(?:\\/{2})?)((\\w+?):(\\w+?)@|:?@?)(\\w+?):(\\d+)\\/(\\w+?)$';
    // connection uris can be array or string
    const uris = Array.isArray(options.connection) ? options.connection : [options.connection];
    // global mongodb connection options, :/ sorry ugly definition
    const globalOptions = options.options || {};
    const exposeName = options.name || 'mongo';

    const makeConnectionObject = function (conf, opts) {

        let connectionObj = conf;
        // this is string init with initial parameters
        if (typeof conf === 'string') {
            connectionObj = {
                'uri': conf
            };
        }

        // update connection name field with databasename
        if (!connectionObj.hasOwnProperty('name')) {
            connectionObj.name = getDbName(connectionObj.uri);
        }
        // update connection options with global connections options
        if (!connectionObj.hasOwnProperty('options')) {
            connectionObj.options = opts;
        }

        return connectionObj;
    };

    const getDbName = function (uri) {

        const uriArray = uri.split('/');
        return uriArray[uriArray.length - 1];
    };

    Promise.map(uris, (uri) => {
        // init connection object
        const connectionObj = makeConnectionObject(uri, globalOptions);

        // validate mongodb connection uri
        if (new RegExp(uriPattern).exec(connectionObj.uri) === null) {
            const str = 'Invalid mongo connection uri ' + connectionObj.uri;
            server.log(['hapi-multi-mongo', 'error'], str);
            return next(str);
        }

        return MongoClient.connect(connectionObj.uri, connectionObj.options).then((db) => {

            connections[connectionObj.name] = db;

            return connectionObj.name;
        }).catch((err) => {

            const str = 'An error occurred during mongodb connection:' + err;
            server.log(['hapi-multi-mongo', 'error'], str);
            return next(str);
        });
    }).then((items) => {

        server.log(['hapi-multi-mongo', 'info'], 'Mongo connections has been established: ' + items);

        // handy decorate option, borrowed from hapi-mongodb
        if (options.decorate === true) {
            // const decorate = options.decorate === true ? 'multi-mongo' : options.decorate;
            server.decorate('server', exposeName, connections);
            server.decorate('request', exposeName, connections);
        }
        else {
            server.expose(exposeName, connections);
        }

        next();

    }).catch((err) => {

        const str = 'An error occurred during connection uri iteration: ' + err;
        server.log(['hapi-multi-mongo', 'error'], str);
        return next(str);
    });

    server.on('stop', () => {

        Promise.each(Object.keys(connections), (name) => {

            const conn = connections[name];

            // close mongo connection
            server.log(['hapi-multi-mongo', 'info'], 'Closing mongodb connection for: ' + name);
            conn.close((err) => {

                server.log(['hapi-multi-mongo', 'error'], 'An error occurred while closing mongodb connection for. ' + name + ' => ' + err);
            });
        }).then(() => {

            server.log(['hapi-multi-mongo', 'info'], 'Mongo connections has been closed through app termination');
        }).catch((err) => {

            const str = 'An error occurred while closing connections: ' + err;
            server.log(['hapi-multi-mongo', 'error'], str);
        });
    });
};


exports.register.attributes = {
    pkg: require('../package.json')
};
