const success = (message, data = null) => {
  return {
    code: 200,
    message,
    data
  };
};

const error = (code, message) => {
  return {
    code,
    message,
    data: null
  };
};

module.exports = {
  success,
  error
};
