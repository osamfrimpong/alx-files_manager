/* eslint-disable import/no-named-as-default */
import sha1 from "sha1";
import dbClient from "../utils/db";

/**
 * Controller class for managing user-related operations.
 */
export default class UsersController {
  /**
   * Handles POST request to create a new user.
   * @param {Object} req - The Express request object.
   * @param {Object} res - The Express response object.
   * @returns {Promise<void>}
   */
  static async postNew(req, res) {
    const email = req.body ? req.body.email : null;
    const password = req.body ? req.body.password : null;

    if (!email) {
      res.status(400).json({ error: "Missing email" });
      return;
    }
    if (!password) {
      res.status(400).json({ error: "Missing password" });
      return;
    }

    const user = await (await dbClient.usersCollection()).findOne({ email });
    if (user) {
      res.status(400).json({ error: "Already exist" });
      return;
    }

    const insertionInfo = await (
      await dbClient.usersCollection()
    ).insertOne({ email, password: sha1(password) });
    const userId = insertionInfo.insertedId.toString();

    res.status(201).json({ email, id: userId });
  }

  /**
   * Handles GET request to retrieve the authenticated user's information.
   * @param {Object} req - The Express request object with user information.
   * @param {Object} res - The Express response object.
   * @returns {void}
   */
  static async getMe(req, res) {
    const { user } = req;

    res.status(200).json({ email: user.email, id: user._id.toString() });
  }

  /**
   * Handles GET request to retrieve user information based on token.
   * If token is invalid or user is not found, responds with a 401 Unauthorized error.
   * @param {Object} req - The Express request object with user information extracted from token.
   * @param {Object} res - The Express response object.
   * @returns {void}
   */
  static async getUserByToken(req, res) {
    const { user } = req;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({ email: user.email, id: user._id.toString() });
  }
}
