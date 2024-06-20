/**
 * This file contains tests for the App Status Endpoints of the files manager application.
 * It uses the Chai assertion library along with Chai HTTP for making HTTP requests.
 * The tests verify the functionality of the '/status' and '/stats' endpoints.
 * The '/status' endpoint returns the status of the Redis and MongoDB connections.
 * The '/stats' endpoint returns the number of users and files in the database.
 */

import {
  expect, use, should, request,
} from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';

use(chaiHttp);
should();

/**
 * Tests the '/status' endpoint which returns the status of the Redis and MongoDB connections.
 */
describe('testing App Status Endpoints', () => {
  /**
   * Tests the GET '/status' endpoint.
   * It verifies that the response body contains the expected status of Redis and MongoDB connections.
   */
  describe('GET /status', () => {
    it('returns the status of redis and mongo connection', async () => {
      const response = await request(app).get('/status').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ redis: true, db: true });
      expect(response.statusCode).to.equal(200);
    });
  });

  /**
   * Tests the GET '/stats' endpoint.
   * It verifies that the response body contains the expected number of users and files in the database.
   */
  describe('GET /stats', () => {
    /**
     * Deletes all users and files in the database before running the tests.
     */
    before(async () => {
      await dbClient.usersCollection.deleteMany({});
      await dbClient.filesCollection.deleteMany({});
    });

    /**
     * Tests the GET '/stats' endpoint when there are no users and files in the database.
     * It verifies that the response body contains 0 users and 0 files.
     */
    it('returns number of users and files in db 0 for this one', async () => {
      const response = await request(app).get('/stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 0, files: 0 });
      expect(response.statusCode).to.equal(200);
    });

    /**
     * Tests the GET '/stats' endpoint when there are 1 user and 2 files in the database.
     * It verifies that the response body contains 1 user and 2 files.
     */
    it('returns number of users and files in db 1 and 2 for this one', async () => {
      await dbClient.usersCollection.insertOne({ name: 'Larry' });
      await dbClient.filesCollection.insertOne({ name: 'image.png' });
      await dbClient.filesCollection.insertOne({ name: 'file.txt' });

      const response = await request(app).get('/stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 1, files: 2 });
      expect(response.statusCode).to.equal(200);
    });
  });
});
