/**
 * Sets up routes for the files_manager API.
 * @param {Object} app - The Express application instance.
 */

import AppController from '../controllers/AppController';

const SetRoutes = (app) => {
  app.get('/status', AppController.getStatus);

  app.get('/stats', AppController.getStats);
};

export default SetRoutes;
