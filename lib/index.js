'use strict';

const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const Hoek = require('hoek');

exports.register = (server, options, next) => {

    if (!options.connection) {
        const str = 'Invalid connection options';
        server.log(['hapi-multi-mongo', 'error'], str);
        return next(str);
    }

    // main connection object
    const connections = {};
    // base, ref: Creating a regex for mongoose URI http://stackoverflow.com/a/25072703/12078
    const uriPattern = '^(mongodb:(?:\\/{2})?)((\\w+?):(\\w+?)@|:?@?)([\\w\\.]+?):(\\d+)(\\/(\\w+?))?$';
    // connection uris can be array or string
    const uris = Array.isArray(options.connection) ? options.connection : [options.connection];
    // global mongodb connection options, :/ sorry for ugly definition
    const globalOptions = options.options || {};
    const exposeName = options.name || 'mongo';

    const makeConnectionObject = (conf) => {

        let connObj = conf;
        // if this is a string, init with initial parameters
        if (typeof conf === 'string') {
            connObj = {
                'uri': conf
            };
        }

        // merge options with globals
        // better to use Object methods
        connObj.options = Object.assign({}, globalOptions, connObj.options);

        return connObj;
    };

    Promise.map(uris, (uri) => {
        // init connection object
        const connectionObj = makeConnectionObject(uri);

        const uriMatch = new RegExp(uriPattern).exec(connectionObj.uri);
        // validate mongodb connection uri
        if (uriMatch === null) {
            const str = 'Invalid mongo connection uri ' + connectionObj.uri;
            throw Error(str);
        }

        // set or get connection name
        // check name if it is not there
        if (!connectionObj.hasOwnProperty('name')) {
            // we assume last element of the connection uri has to be database name or user
            // has to provide a name for connection
            // check if there is a database name in connection
            Hoek.assert(uriMatch[uriMatch.length - 1], 'You have to provide a name for uri or have to connect to ' +
                'directly to specific database.');

            // set connection objects name
            connectionObj.name = uriMatch[uriMatch.length - 1];
        }

        return MongoClient.connect(connectionObj.uri, connectionObj.options).then((db) => {

            connections[connectionObj.name] = db;

            return connectionObj.name;
        }).catch((err) => {

            const str = 'An error occurred during mongodb connection:' + err;
            server.log(['hapi-multi-mongo', 'error'], str);
            throw Error(str);
        });
    }).then((items) => {

        server.log(['hapi-multi-mongo', 'info'], 'Mongo connections has been established: ' + items);

        // handy decorate option, borrowed from hapi-mongodb
        if (options.decorate === true) {
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
        });
    });
};


exports.register.attributes = {
    pkg: require('../package.json')
};
