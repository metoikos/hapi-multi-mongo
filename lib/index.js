'use strict';

const MongoClient = require('mongodb').MongoClient;
const Assert = require('assert');
const { parseConnectionString } = require('mongodb/lib/core');

exports.plugin = {

    async register(server, options) {

        if (!options.connection) {
            const str = 'Invalid connection options';
            server.log(['hapi-multi-mongo', 'error'], str);
            throw new Error(str);
        }

        // main connection object
        const connections = {};
        // connection uris can be array or string
        const uris = Array.isArray(options.connection) ? options.connection : [options.connection];
        // global mongodb connection options, :/ sorry for ugly definition
        const globalOptions = options.options || {};
        const exposeName = options.name || 'mongo';

        const mongodbUriParser = (uri, options) => {
            return new Promise((resolve, reject) => {
                parseConnectionString(uri, options, (err, parsed) => {
                    return err ? reject(err) : resolve(parsed)
                });
            });
        };

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
            // let it rain
            const uriMatch = await mongodbUriParser(connectionObj.uri, connectionObj.options);

            // set or get connection name
            // check name if it is not there
            if (!connectionObj.hasOwnProperty('name')) {
                // we assume the third last element of the connection uri has to be database name or
                // user has to provide a name for the connection
                // check if there is a database name in connection
                Assert(uriMatch.defaultDatabase, 'You have to provide a name for uri or have to connect to ' +
                    'directly to specific database.');

                // set connection objects name
                connectionObj.name = uriMatch.defaultDatabase;
            }

            const connection = await MongoClient.connect(connectionObj.uri, connectionObj.options);
            server.log(['hapi-multi-mongo', 'info'], 'Mongo connection has been established: ' + connectionObj.name);

            connections[connectionObj.name] = connection;

            return connectionObj.name;
        };

        try {
            const allConnections = await Promise.all(uris.map(connect));
            server.log(['hapi-multi-mongo', 'info'], 'Mongo connections has been established: ' + allConnections);
        } catch (e) {
            const str = 'An error occurred during connection uri iteration: ' + e;
            server.log(['hapi-multi-mongo', 'error'], str);
            throw new Error(str);
        }

        // handy decorate option, borrowed from hapi-mongodb
        if (options.decorate === true) {
            server.decorate('server', exposeName, connections);
            server.decorate('request', exposeName, connections);
        } else {
            server.expose(exposeName, connections);
        }

        server.events.on('stop', async () => {
            for (let name of Object.keys(connections)) {
                let conn = connections[name];
                server.log(['hapi-multi-mongo', 'info'], 'Closing mongodb connection for: ' + name);
                try {
                    await conn.close();
                } catch (e) {
                    // well, I couldn't find a way to mock this line. MongoDB is always up :)
                    /* $lab:coverage:off$ */
                    server.log(['hapi-multi-mongo', 'error'], 'An error occurred while closing mongodb connection for. ' + name + ' => ' + e);
                    /* $lab:coverage:on$ */
                }
            }
            server.log(['hapi-multi-mongo', 'info'], 'Mongo connections has been closed through app termination');
        });
    },
    pkg: require('../package.json')
};

