/**
 * Sets up routes for the files_manager API.
 * @param {Object} app - The Express application instance.
 */

import AppController from "../controllers/AppController";
import AuthController from "../controllers/AuthController";
import UsersController from "../controllers/UsersController";

const SetRoutes = (app) => {
  app.get("/status", AppController.getStatus);
  app.get("/stats", AppController.getStats);

  app.post("/users", UsersController.postNew);

  app.get("/connect", AuthController.getConnect);
  app.get("/disconnect", AuthController.getDisconnect);
  app.get("/users/me", UsersController.getMe);
};

export default SetRoutes;
