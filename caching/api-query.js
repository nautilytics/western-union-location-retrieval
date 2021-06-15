const rp = require('request-promise');
const { to } = require('await-to-js');
const crypto = require('crypto');
const redisClient = require('./redis-client');

/**
 * Execute an API call
 * @param {String}        uri       API URI
 * @param {Object}        qs        Query string parameters
 * @param {Number}        ttl       Expiration of cache in seconds
 */
const cachingQuery = (module.exports = (uri, qs, ttl = 0) => {
    return new Promise(async (resolve, reject) => {
        let err, results;

        if (ttl) {
            // If we have caching enabled
            const hash = crypto
                .createHash('sha1')
                .update(`${uri}-${JSON.stringify(qs)}`)
                .digest('hex');
            redisClient.getCache(hash, async (err, data) => {
                if (err || !data) {
                    [err, results] = await to(_execute(uri, qs, ttl));
                    if (err) return reject(err);
                    return resolve(results);
                } else {
                    return resolve(data);
                }
            });
        } else {
            [err, results] = await to(_execute(uri, ttl));
            if (err) return reject(err);
            return resolve(results);
        }
    });
});

function _execute(uri, qs, ttl) {
    return new Promise((resolve, reject) => {
        const hash = crypto
            .createHash('sha1')
            .update(`${uri}-${JSON.stringify(qs)}`)
            .digest('hex');

        const options = {
            uri,
            qs,
            json: true,
        };
        rp(options)
            .then(result => {
                if (ttl) {
                    redisClient.setCache(hash, ttl, result, (err, data) => {
                        if (err || !data) return reject('Error getting redis cache');
                        return resolve(result);
                    });
                } else {
                    return resolve(result);
                }
            })
            .catch(error => reject(error));
    });
}
