// craco.config.js
const logger = require('./logger'); // Import the custom logger

module.exports = {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        logger.error('webpack-dev-server is not defined');
        throw new Error('webpack-dev-server is not defined');
      }

      // Example of logging middleware initialization
      logger.info('Setting up middlewares for the Webpack Dev Server');

      // You can add other middlewares and logic here
      devServer.app.use((req, res, next) => {
        logger.info(`Received request: ${req.method} ${req.url}`);
        next();
      });

      return middlewares;
    },
    onListening: (devServer) => {
      if (!devServer) {
        logger.error('webpack-dev-server is not defined');
        throw new Error('webpack-dev-server is not defined');
      }

      const { port } = devServer.server.address();
      logger.info(`Webpack Dev Server is listening on port ${port}`);
    }
  },
  webpack: {
    configure: (webpackConfig) => {
      // You can log different stages of the build process
      logger.info('Configuring Webpack...');

      // Modify Webpack configuration here if necessary

      return webpackConfig;
    }
  }
};
