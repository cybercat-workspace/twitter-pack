module.exports = {
  '*.@(js|ts)': ['prettier --write', 'eslint --config .eslintrc --ext .js,.ts --fix'],
  '*.@(json|md)': ['prettier --write']
};
