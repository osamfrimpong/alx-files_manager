/**
 * @fileoverview This file sets up routes for the files_manager API.
 * It defines various API endpoints and links them to the corresponding controllers.
 * @module routes/index
 */
import AppController from "../controllers/AppController";
import AuthController from "../controllers/AuthController";
import UsersController from "../controllers/UsersController";
import FilesController from "../controllers/FilesController";

const SetRoutes = (app) => {
  app.get("/status", AppController.getStatus);
  app.get("/stats", AppController.getStats);

  app.post("/users", UsersController.postNew);

  app.get("/connect", AuthController.getConnect);
  app.get("/disconnect", AuthController.getDisconnect);
  app.get("/users/me", UsersController.getMe);
  ap.post("/files", FilesController.postUpload);
  ap.get("/files/:id", FilesController.getShow);
  ap.get("/files", FilesController.getIndex);
  ap.put("/files/:id/publish", FilesController.putPublish);
  ap.put("/files/:id/unpublish", FilesController.putUnpublish);
  ap.get("/files/:id/data", FilesController.getFileData);
};

export default SetRoutes;
