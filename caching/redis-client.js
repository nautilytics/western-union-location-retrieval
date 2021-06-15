const redis = require('redis');

const redisClient = (module.exports = redis.createClient(6379, 'localhost', {no_ready_check: true}));

redisClient.on('error', err => console.log('Redis ' + err));

setInterval(function () {
    redisClient.ping();
}, 1000 * 30);

// ====================================
// Western Union Location API Calls
// ====================================
redisClient.getCache = (key, next) => {
    redisClient.get(`wu_api:${key}`, (err, result) => {
        if (err || !result) return next(err);
        return next(null, JSON.parse(result));
    });
};

redisClient.setCache = (key, ttl, data, next) => {
    redisClient.setex(`wu_api:${key}`, ttl, JSON.stringify(data), (err, result) => {
        if (err || !result) return next(err);
        return next(null, result);
    });
};
