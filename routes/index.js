/**
 * Sets up routes for the files_manager API.
 * @param {Object} app - The Express application instance.
 */

import AppController from "../controllers/AppController";

const SetRoutes = (app) => {
  // Endpoint to get status
  app.get("/status", AppController.getStatus);

  // Endpoint to get statistics
  app.get("/stats", AppController.getStats);
};

export default SetRoutes;
