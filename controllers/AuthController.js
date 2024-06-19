/**
 * Controller class for handling user authentication operations.
 */

import { v4 as uuidv4 } from "uuid";
import redisClient from "../utils/redis";
import sha1 from "sha1";

export default class AuthController {
  /**
   * Handles GET request to sign-in the user by generating a new authentication token.
   * Uses Basic authentication via Authorization header (Base64 encoded <email>:<password>).
   * If successful, returns a new token and stores user ID in Redis for 24 hours.
   * @param {Object} req - The Express request object containing user credentials in headers.
   * @param {Object} res - The Express response object to send JSON response.
   * @returns {Promise<void>}
   */
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const encodedCredentials = authHeader.split(" ")[1];
    const decodedCredentials = Buffer.from(
      encodedCredentials,
      "base64"
    ).toString();
    const [email, password] = decodedCredentials.split(":");

    const user = await (
      await dbClient.usersCollection()
    ).findOne({ email, password: sha1(password) });

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = uuidv4();

    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);

    res.status(200).json({ token });
  }

  /**
   * Handles GET request to sign-out the user based on the provided token.
   * Deletes the token from Redis if found, otherwise responds with 401 Unauthorized.
   * @param {Object} req - The Express request object containing token in headers.
   * @param {Object} res - The Express response object to send status 204 (No Content).
   * @returns {Promise<void>}
   */
  static async getDisconnect(req, res) {
    const token = req.headers["x-token"];

    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await redisClient.del(`auth_${token}`);

    res.status(204).send();
  }
}
