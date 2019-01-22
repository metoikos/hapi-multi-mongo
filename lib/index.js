'use strict';

const Promise = require('bluebird');
const MongoClient = require('mongodb').MongoClient;
const Assert = require('assert');


exports.plugin = {

    async register(server, options) {

        if (!options.connection) {
            const str = 'Invalid connection options';
            server.log(['hapi-multi-mongo', 'error'], str);
            throw new Error(str);
        }

        // main connection object
        const connections = {};
        // base, ref: Creating a regex for mongoose URI http://stackoverflow.com/a/25072703/12078
        const uriPattern = '^(mongodb:(?:\\/{2})?)((\\w+?):(\\w+?)@|:?@?)(\\S+?):(\\d+)\\/(\\S+?)(\\?replicaSet=(\\S+?))?$';
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
            connObj.options = Object.assign({}, globalOptions, connObj.options);

            return connObj;
        };

        const connect = async (uri) => {

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
                // we assume the last element of the connection uri has to be database name or
                // user has to provide a name for the connection
                // check if there is a database name in connection
                Assert(uriMatch[uriMatch.length - 1], 'You have to provide a name for uri or have to connect to ' +
                    'directly to specific database.');

                // set connection objects name
                connectionObj.name = uriMatch[uriMatch.length - 1];
            }

            const connection = await MongoClient.connect(connectionObj.uri, connectionObj.options);
            server.log(['hapi-multi-mongo', 'info'], 'Mongo connection has been established: ' + connectionObj.name);

            connections[connectionObj.name] = connection;

            return connectionObj.name;
        };

        try {
            const allConnections = await Promise.all(uris.map(connect));
            server.log(['hapi-multi-mongo', 'info'], 'Mongo connections has been established: ' + allConnections);
        }
        catch (e) {
            const str = 'An error occurred during connection uri iteration: ' + e;
            server.log(['hapi-multi-mongo', 'error'], str);
            throw new Error(str);
        }

        // handy decorate option, borrowed from hapi-mongodb
        if (options.decorate === true) {
            server.decorate('server', exposeName, connections);
            server.decorate('request', exposeName, connections);
        }
        else {
            server.expose(exposeName, connections);
        }

        server.events.on('stop', () => {

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
    },
    pkg: require('../package.json')
};

