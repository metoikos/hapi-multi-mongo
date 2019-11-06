'use strict';

const Hapi = require('@hapi/hapi');
const Lab = require('@hapi/lab');
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const beforeEach = lab.beforeEach;
const expect = require('@hapi/code').expect;
const delay = ms => new Promise(_ => setTimeout(_, ms));
describe('Hapi Mongo Connection', () => {

    let server;

    beforeEach(async () => {

        server = await new Hapi.Server();
    });

    it('should reject invalid options', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    conn: 'mongodb://localhost:27017/test'
                }
            });
        } catch (e) {
            expect(e).to.exist();
        }

    });

    it('should fail return regex match null ', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {connection: 'localhost/test'}
            });
        } catch (e) {
            expect(e).to.exist();
        }
    });

    it('should fail with invalid mongodb uri ', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {connection: 'mongodb://:x@localhost:27017/test'}
            });
        } catch (e) {
            expect(e).to.exist();
        }
    });

    it('should fail if there is not a name and not a directly connection to a database', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {connection: 'mongodb://localhost:27017'}
            });
        } catch (e) {
            expect(e).to.exist();
        }
    });

    it('should fail with no mongodb listening', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {connection: 'mongodb://localhost:27018/test'}
            });
        } catch (e) {
            expect(e).to.exist();
        }
    });

    it('should be able to register plugin with just URL', async () => {

        await server.register({
            plugin: require('../lib'),
            options: {connection: 'mongodb://localhost:27017/test'}
        });
    });

    it('should be able to register plugin with URL and options', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                    options: {native_parser: false}
                }
            });
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to find the plugin exposed objects', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {connection: 'mongodb://localhost:27017/test'}
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => {

                    const plugin = request.server.plugins['hapi-multi-mongo'];
                    expect(plugin.mongo).to.exist();
                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });

        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to expose plugin with custom name', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                    name: 'myMongo'
                }
            });
            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => {

                    const plugin = request.server.plugins['hapi-multi-mongo'];
                    expect(plugin.myMongo).to.exist();
                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to find the plugin exposed objects and custom name', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                    name: 'myMongo'
                }
            });
            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => {

                    const plugin = request.server.plugins['hapi-multi-mongo'];
                    expect(plugin.myMongo).to.exist();
                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to find the plugin on decorated objects', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                    decorate: true
                }
            });
            expect(server.mongo).to.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => {

                    expect(request.mongo).to.exists();
                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to find the plugin on decorated objects and custom name', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                    decorate: true,
                    name: 'myMongo'
                }
            });

            expect(server.myMongo).to.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => {

                    expect(request.myMongo).to.exist();
                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });

        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to have multiple connections', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: [
                        'mongodb://localhost:27017/test',
                        {
                            uri: 'mongodb://127.0.0.1:27017',
                            name: 'myConn',
                            options: {
                                native_parser: true,
                                promiseLibrary: require('bluebird')
                            }
                        },
                        'mongodb://localhost:27017/local'
                    ],
                    options: {native_parser: false}
                }
            });
            const plugin = server.plugins['hapi-multi-mongo'];
            expect(plugin.mongo).to.be.an.object().and.to.have.length(3);
            expect(plugin.mongo).includes(['test', 'myConn', 'local']);
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to connect to a database', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: [
                        {uri: 'mongodb://localhost:27017', name: 'myMongo'}
                    ]
                }
            });
            server.route({
                method: 'GET',
                path: '/',
                handler: (request) => {

                    const plugin = server.plugins['hapi-multi-mongo'];
                    expect(plugin.mongo.myMongo).to.exist();
                    const db = plugin.mongo.myMongo.db('test');
                    expect(db).to.exist();
                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to use custom promise library', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: [
                        {
                            uri: 'mongodb://localhost:27017', name: 'myMongo',
                            options: {promiseLibrary: require('bluebird')}
                        },
                        'mongodb://localhost:27017/test'
                    ]

                }
            });
            server.route({
                method: 'GET',
                path: '/',
                handler: async (request) => {

                    const plugin = server.plugins['hapi-multi-mongo'];
                    const db = plugin.mongo.myMongo.db('test');
                    const collection = db.collection('system.indexes');

                    try {
                        await collection.findOne();
                    } catch (e) {
                        expect(e).to.not.exist();
                    }

                    return Promise.resolve(null);
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });
        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able to have complex multiple connections', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: [
                        {
                            uri: 'mongodb://localhost:27017/test',
                            options: {},
                            'name': 'myMongoConn1'
                        },
                        'mongodb://localhost:27017/local'
                    ]
                }
            });
            const plugin = server.plugins['hapi-multi-mongo'];
            expect(plugin.mongo).to.be.an.object().and.to.have.length(2);
            expect(plugin.mongo).includes(['myMongoConn1', 'local']);
        } catch (e) {
            expect(e).to.not.exist();
        }
    });


    it('should be able insert data to collection', async () => {
        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                }
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: async (request) => {

                    const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
                    const collection = mongos['test'].db().collection('hmm-test-data');
                    try {
                        const result = await collection.insertOne({
                            name: "Test User",
                            grade: "95"
                        });
                        expect(result.insertedCount).equal(1);
                        expect(result.insertedId).to.exist();
                        return true;
                    } catch (err) {
                        return Boom.internal('Internal MongoDB error', err)
                    }
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });

        } catch (e) {
            expect(e).to.not.exist();
        }
    });


    it('should be able read data from collection', async () => {
        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                }
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: async (request) => {

                    const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
                    const collection = mongos['test'].db().collection('hmm-test-data');
                    try {
                        const result = await collection.findOne({
                            name: "Test User",
                        });
                        expect(result._id).to.exist();
                        expect(result.name).to.equal("Test User");
                        return true;
                    } catch (err) {
                        return Boom.internal('Internal MongoDB error', err)
                    }
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });

        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should be able delete data from collection', async () => {
        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                }
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: async (request) => {

                    const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
                    const collection = mongos['test'].db().collection('hmm-test-data');
                    try {
                        const result = await collection.removeOne({
                            name: "Test User",
                        });
                        // expect(result._id).to.exist();
                        // expect(result.name).to.equal("Test User");
                        expect(result.deletedCount).equal(1);
                        return true;
                    } catch (err) {
                        return Boom.internal('Internal MongoDB error', err)
                    }
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });

        } catch (e) {
            expect(e).to.not.exist();
        }
    });


    it('should be able drop collection from database', async () => {
        try {
            await server.register({
                plugin: require('../lib'),
                options: {
                    connection: 'mongodb://localhost:27017/test',
                }
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: async (request) => {

                    const mongos = request.server.plugins['hapi-multi-mongo'].mongo;
                    let result = await mongos['test'].db().collection('hmm-test-data').drop();
                    expect(result).to.be.true();

                    return true
                }
            });

            await server.inject({
                method: 'GET',
                url: '/'
            });

        } catch (e) {
            expect(e).to.not.exist();
        }
    });

    it('should disconnect if the server stops', async () => {

        try {
            await server.register({
                plugin: require('../lib'),
                options: {connection: 'mongodb://localhost:27017/test'}
            });


            await server.initialize();
            await server.stop();
            await delay(100);

        } catch (e) {
            expect(e).not.to.exist();
        }
    });
});
