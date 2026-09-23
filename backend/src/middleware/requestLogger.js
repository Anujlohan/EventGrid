const morgan = require('morgan');
const config = require('../config/env');

const requestLogger = () => {
  if (config.NODE_ENV === 'test') {
    return (req, res, next) => next();
  }
  return morgan(':method :url :status :res[content-length] - :response-time ms');
};

module.exports = requestLogger;
