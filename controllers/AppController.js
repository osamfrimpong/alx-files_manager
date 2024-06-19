import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppController {
  /**
   * Retrieves the status of Redis and database connections.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   */
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  /**
   * Retrieves statistics like user count and file count from the database.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   */
  static getStats(req, res) {
    Promise.all([dbClient.nbUsers(), dbClient.nbFiles()])
      .then(([usersCount, filesCount]) => {
        res.status(200).json({ users: usersCount, files: filesCount });
      });
  }
}
