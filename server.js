/**
 * Created by metoikos on 20.11.2017.
 * Project: hapi-multi-mongo
 */
"use strict";
const Hapi = require('hapi');
// create new server instance
const server = new Hapi.Server({
    host: 'localhost',
    port: 3009
});

const dbOpts = {
    "connection": [
        "mongodb://localhost:27017/test",
        {uri: "mongodb://localhost:27017", name: "remoteMongo"}
    ],
    "options": {
        "native_parser": false
    }
};

async function liftOff() {
    await server.register({
        plugin: require('./lib'),
        options: dbOpts
    })
}

server.route({
    method: 'GET',
    path: '/',
    handler: async (request, h) => {

        return "ok";
    }
});

liftOff().then(() => {
    server
        .start()
        .then((x) => {
            console.log("started", x);
        }) // if needed
        .catch(err => {
            console.log(err)
        });
});