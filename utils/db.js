/**
 * @fileoverview This file contains the implementation of the DBClient class, which represents a database client for the files_manager application.
 * @module utils/db
 */

import { MongoClient } from "mongodb";

const DATABASE_HOST = process.env.DB_HOST || "localhost";
const DATABASE_PORT = process.env.DB_PORT || 27017;
const DATABASE_NAME = process.env.DB_DATABASE || "files_manager";
const DATABASE_CONNECTION_URL = `mongodb://${DATABASE_HOST}:${DATABASE_PORT}`;

/**
 * Represents a database client for the files_manager application.
 */
class DBClient {
  /**
   * Creates an instance of DBClient.
   * @constructor
   */
  constructor() {
    this.client = new MongoClient(DATABASE_CONNECTION_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    this.client
      .connect()
      .then(() => {
        this.db = this.client.db(`${DATABASE_NAME}`);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * Checks if the database connection is alive.
   * @returns {boolean} True if the database connection is alive, false otherwise.
   */
  isAlive() {
    const databaseConnectionStatus = this.client.on("connected", () => true);
    if (databaseConnectionStatus) {
      return true;
    }
    return false;
  }

  /**
   * Retrieves the number of users in the database.
   * @returns {Promise<number>} The number of users in the database collection.
   */
  async nbUsers() {
    const foundUsers = this.db.collection("users");
    const numberOfUsers = await foundUsers.countDocuments();
    return numberOfUsers;
  }

  /**
   * Retrieves the number of files in the database.
   * @returns {Promise<number>} The number of files in the database collection.
   */
  async nbFiles() {
    const foundFiles = this.db.collection("files");
    const numberOfFiles = await foundFiles.countDocuments();
    return numberOfFiles;
  }
}

const dbClient = new DBClient();
export default dbClient;
