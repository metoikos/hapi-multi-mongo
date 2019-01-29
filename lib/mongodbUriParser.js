/**
 * Created by metoikos on 2019-01-29.
 * Project: hapi-multi-mongo
 */
const parseConnectionString = require('mongodb-core').parseConnectionString;
module.exports =  (uri, options) => {
    return new Promise((resolve, reject) => {
        parseConnectionString(uri, options, (err, parsed) => {
            if (err) {
                return reject(err);
            }

            return resolve(parsed)
        });
    });
};
