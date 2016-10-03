'use strict';

const Hapi = require('hapi');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const beforeEach = lab.beforeEach;
const expect = require('code').expect;

describe('Hapi server', () => {

    let server;

    beforeEach((done) => {

        server = new Hapi.Server();
        done();
    });

    it('should reject invalid options', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                conn: 'mongodb://localhost:27017/test'
            }
        }, (err) => {

            expect(err).to.exist();
            done();
        });
    });

    it('should fail with invalid mongodb uri ', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://:x@localhost:27017/test'
            }
        }, (err) => {

            expect(err).to.exist();
            done();
        });
    });

    it('should fail if there is not a name and not a directly connection to a database', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017'
            }
        }, (err) => {

            expect(err).to.exist();
            done();
        });
    });

    it('should fail with no mongodb listening', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27018/test'
            }
        }, (err) => {

            expect(err).to.exist();
            done();
        });
    });

    it('should be able to register plugin with just URL', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test'
            }
        }, done);
    });

    it('should be able to register plugin with URL and options', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test',
                options: {
                    db: {
                        /* eslint-disable camelcase */
                        native_parser: false
                        /* eslint-enable camelcase */
                    }
                }
            }
        }, done);
    });

    it('should be able to find the plugin exposed objects', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test'
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    const plugin = request.server.plugins['hapi-multi-mongo'];
                    expect(plugin.mongo).to.exist();

                    done();
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to expose plugin with custom name', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test',
                name: 'myMongo'
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    const plugin = request.server.plugins['hapi-multi-mongo'];
                    expect(plugin.myMongo).to.exist();

                    done();
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to find the plugin exposed objects and custom name', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test',
                name: 'myMongo'
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    const plugin = request.server.plugins['hapi-multi-mongo'];
                    expect(plugin.myMongo).to.exist();

                    done();
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to find the plugin on decorated objects', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test',
                decorate: true
            }
        }, (err) => {

            expect(err).to.not.exist();
            expect(server.mongo).to.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    expect(request.mongo).to.exists();

                    done();
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to find the plugin on decorated objects and custom name', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test',
                decorate: true,
                name: 'myMongo'
            }
        }, (err) => {

            expect(err).to.not.exist();
            expect(server.myMongo).to.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    expect(request.myMongo).to.exist();

                    done();
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to have multiple connections', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: [
                    'mongodb://localhost:27017/test',
                    {
                        uri: 'mongodb://127.0.0.1:27017',
                        name: 'myConn',
                        options: {
                            db: {
                                native_parser: true
                            },
                            promiseLibrary: require('bluebird')
                        }
                    },
                    'mongodb://localhost:27017/local'
                ],
                options: {
                    db: {
                        /* eslint-disable camelcase */
                        native_parser: false
                        /* eslint-enable camelcase */
                    }
                }
            }
        }, (err) => {

            expect(err).to.not.exist();

            const plugin = server.plugins['hapi-multi-mongo'];
            expect(plugin.mongo).to.be.an.object().and.to.have.length(3);
            expect(plugin.mongo).includes(['test', 'myConn', 'local']);

            done();
        });
    });

    it('should be able to connect to a database', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: [
                    {uri: 'mongodb://localhost:27017', name: 'myMongo'}
                ]
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    const plugin = server.plugins['hapi-multi-mongo'];
                    expect(plugin.mongo.myMongo).to.exist();
                    const db = plugin.mongo.myMongo.db('test');
                    expect(db).to.exist();

                    done();
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to use custom promise library', (done) => {

        server.connection();
        server.register({
            register: require('../lib'),
            options: {
                connection: [
                    {
                        uri: 'mongodb://localhost:27017', name: 'myMongo',
                        options: {
                            promiseLibrary: require('bluebird')
                        }
                    },
                    'mongodb://localhost:27017/test'
                ]

            }
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'GET',
                path: '/',
                handler: (request, reply) => {

                    const plugin = server.plugins['hapi-multi-mongo'];
                    const db = plugin.mongo.myMongo.db('test');
                    const collection = db.collection('system.indexes');

                    collection.findOne().then((data) => {
                        done();
                    });
                }
            });

            server.inject({
                method: 'GET',
                url: '/'
            }, () => {
            });
        });
    });

    it('should be able to have complex multiple connections', (done) => {

        server.register({
            register: require('../lib'),
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
        }, (err) => {

            expect(err).to.not.exist();

            const plugin = server.plugins['hapi-multi-mongo'];
            expect(plugin.mongo).to.be.an.object().and.to.have.length(2);
            expect(plugin.mongo).includes(['myMongoConn1', 'local']);

            done();
        });
    });

    it('should disconnect if the server stops', (done) => {

        server.register({
            register: require('../lib'),
            options: {
                connection: 'mongodb://localhost:27017/test'
            }
        }, (err) => {

            expect(err).not.to.exist();
            server.initialize(() => {

                server.stop(() => {

                    setTimeout(done, 100); // Let the connections end.
                });
            });
        });
    });
});
