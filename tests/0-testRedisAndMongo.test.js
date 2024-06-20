/**
 * @fileoverview This file contains tests for the clients of MongoDB and Redis.
 * It includes tests for the Redis client and the MongoDB client.
 * The Redis client tests check the connection, set and get operations, and key expiration.
 * The MongoDB client tests check the connection and the number of user and file documents.
 *
 * @requires chai
 * @requires chai-http
 * @requires util
 * @requires ../utils/db
 * @requires ../utils/redis
 */

// FILEPATH: /Users/schandorf/Documents/Dev/ALX/alx-files_manager/tests/0-testRedisAndMongo.js
import { expect, use, should } from 'chai';
import chaiHttp from 'chai-http';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

use(chaiHttp);
should();

describe('testing the clients for MongoDB and Redis', () => {
    describe('redis Client', () => {
        before(async () => {
            await redisClient.client.flushall('ASYNC');
        });

        after(async () => {
            await redisClient.client.flushall('ASYNC');
        });

        /**
         * Test to check if the Redis client connection is alive.
         */
        it('shows that connection is alive', async () => {
            expect(redisClient.isAlive()).to.equal(true);
        });

        /**
         * Test to check if the Redis client returns null for a non-existent key.
         */
        it('returns key as null because it does not exist', async () => {
            expect(await redisClient.get('myKey')).to.equal(null);
        });

        /**
         * Test to check if the Redis client can set a key without any issues.
         */
        it('set key can be called without issue', async () => {
            expect(await redisClient.set('myKey', 12, 1)).to.equal(undefined);
        });

        /**
         * Test to check if the Redis client returns null for an expired key.
         */
        it('returns key with null because it expired', async () => {
            const sleep = promisify(setTimeout);
            await sleep(1100);
            expect(await redisClient.get('myKey')).to.equal(null);
        });
    });

    // dbClient
    describe('db Client', () => {
        before(async () => {
            await dbClient.usersCollection.deleteMany({});
            await dbClient.filesCollection.deleteMany({});
        });
        after(async () => {
            await dbClient.usersCollection.deleteMany({});
            await dbClient.filesCollection.deleteMany({});
        });

        /**
         * Test to check if the MongoDB client connection is alive.
         */
        it('shows that connection is alive', () => {
            expect(dbClient.isAlive()).to.equal(true);
        });

        /**
         * Test to check the number of user documents in the MongoDB collection.
         */
        it('shows number of user documents', async () => {
            await dbClient.usersCollection.deleteMany({});
            expect(await dbClient.nbUsers()).to.equal(0);

            await dbClient.usersCollection.insertOne({ name: 'Larry' });
            await dbClient.usersCollection.insertOne({ name: 'Karla' });
            expect(await dbClient.nbUsers()).to.equal(2);
        });

        /**
         * Test to check the number of file documents in the MongoDB collection.
         */
        it('shows number of file documents', async () => {
            await dbClient.filesCollection.deleteMany({});
            expect(await dbClient.nbFiles()).to.equal(0);

            await dbClient.filesCollection.insertOne({ name: 'FileOne' });
            await dbClient.filesCollection.insertOne({ name: 'FileTwo' });
            expect(await dbClient.nbUsers()).to.equal(2);
        });
    });
});