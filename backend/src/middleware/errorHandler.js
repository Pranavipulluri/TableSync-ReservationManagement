const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('API Error details:', err);

  if (err.code === 11000) {
    const message = 'The selected table is already reserved for this date and time slot.';
    return res.status(409).json({
      success: false,
      error: message
    });
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(422).json({
      success: false,
      error: message
    });
  }

  if (err.name === 'CastError') {
    const message = `Resource not found`;
    return res.status(404).json({
      success: false,
      error: message
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
