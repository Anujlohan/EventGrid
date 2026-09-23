const successResponse = (res, statusCode = 200, data = null, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, statusCode = 500, message = 'An error occurred', details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
