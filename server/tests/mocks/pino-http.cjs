const pinoHttp = () => (req, res, next) => {
    req.log = {
        info: () => { },
        error: () => { },
        warn: () => { },
        debug: () => { },
        child: function () { return this; }
    };
    next();
};

module.exports = pinoHttp;
module.exports.default = pinoHttp;
module.exports.pinoHttp = pinoHttp;
