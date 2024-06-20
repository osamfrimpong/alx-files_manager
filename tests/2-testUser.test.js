/**
 * This file contains tests for User Endpoints.
 */

import {
    expect, use, should, request,
} from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import { ObjectId } from 'mongodb';
import app from '../server';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

use(chaiHttp);
should();

/**
 * Test suite for User Endpoints.
 */
describe('testing User Endpoints', () => {
    const credentials = 'Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=';
    let token = '';
    let userId = '';
    const user = {
        email: 'bob@dylan.com',
        password: 'toto1234!',
    };

    /**
     * Clean up the database before running the tests.
     */
    before(async () => {
        await redisClient.client.flushall('ASYNC');
        await dbClient.usersCollection.deleteMany({});
        await dbClient.filesCollection.deleteMany({});
    });

    /**
     * Clean up the database after running the tests.
     */
    after(async () => {
        await redisClient.client.flushall('ASYNC');
        await dbClient.usersCollection.deleteMany({});
        await dbClient.filesCollection.deleteMany({});
    });

    // users

    /**
     * Test the POST /users endpoint.
     */
    describe('POST /users', () => {
        /**
         * Test creating a new user.
         */
        it('returns the id and email of created user', async () => {
            const response = await request(app).post('/users').send(user);
            const body = JSON.parse(response.text);
            expect(body.email).to.equal(user.email);
            expect(body).to.have.property('id');
            expect(response.statusCode).to.equal(201);

            userId = body.id;
            const userMongo = await dbClient.usersCollection.findOne({
                _id: ObjectId(body.id),
            });
            expect(userMongo).to.exist;
        });

        /**
         * Test creating a new user without a password.
         */
        it('fails to create user because password is missing', async () => {
            const user = {
                email: 'bob@dylan.com',
            };
            const response = await request(app).post('/users').send(user);
            const body = JSON.parse(response.text);
            expect(body).to.eql({ error: 'Missing password' });
            expect(response.statusCode).to.equal(400);
        });

        /**
         * Test creating a new user without an email.
         */
        it('fails to create user because email is missing', async () => {
            const user = {
                password: 'toto1234!',
            };
            const response = await request(app).post('/users').send(user);
            const body = JSON.parse(response.text);
            expect(body).to.eql({ error: 'Missing email' });
            expect(response.statusCode).to.equal(400);
        });

        /**
         * Test creating a new user with an existing email.
         */
        it('fails to create user because it already exists', async () => {
            const user = {
                email: 'bob@dylan.com',
                password: 'toto1234!',
            };
            const response = await request(app).post('/users').send(user);
            const body = JSON.parse(response.text);
            expect(body).to.eql({ error: 'Already exist' });
            expect(response.statusCode).to.equal(400);
        });
    });

    // Connect

    /**
     * Test the GET /connect endpoint.
     */
    describe('GET /connect', () => {
        /**
         * Test connecting with invalid credentials.
         */
        it('fails if no user is found for credentials', async () => {
            const response = await request(app).get('/connect').send();
            const body = JSON.parse(response.text);
            expect(body).to.eql({ error: 'Unauthorized' });
            expect(response.statusCode).to.equal(401);
        });

        /**
         * Test connecting with valid credentials.
         */
        it('returns a token if user is found for credentials', async () => {
            const spyRedisSet = sinon.spy(redisClient, 'set');

            const response = await request(app)
                .get('/connect')
                .set('Authorization', credentials)
                .send();
            const body = JSON.parse(response.text);
            token = body.token;
            expect(body).to.have.property('token');
            expect(response.statusCode).to.equal(200);
            expect(
                spyRedisSet.calledOnceWithExactly(`auth_${token}`, userId, 24 * 3600),
            ).to.be.true;

            spyRedisSet.restore();
        });

        /**
         * Test if the token exists in Redis.
         */
        it('token exists in redis', async () => {
            const redisToken = await redisClient.get(`auth_${token}`);
            expect(redisToken).to.exist;
        });
    });

    // Disconnect

    /**
     * Test the GET /disconnect endpoint.
     */
    describe('GET /disconnect', () => {
        /**
         * Clean up Redis after running the tests.
         */
        after(async () => {
            await redisClient.client.flushall('ASYNC');
        });

        /**
         * Test disconnecting without a token.
         */
        it('should respond with unauthorized because there is no token for user', async () => {
            const response = await request(app).get('/disconnect').send();
            const body = JSON.parse(response.text);
            expect(body).to.eql({ error: 'Unauthorized' });
            expect(response.statusCode).to.equal(401);
        });

        /**
         * Test disconnecting with a valid token.
         */
        it('should sign-out the user based on the token', async () => {
            const response = await request(app)
                .get('/disconnect')
                .set('X-Token', token)
                .send();
            expect(response.text).to.be.equal('');
            expect(response.statusCode).to.equal(204);
        });

        /**
         * Test if the token no longer exists in Redis.
         */
        it('token no longer exists in redis', async () => {
            const redisToken = await redisClient.get(`auth_${token}`);
            expect(redisToken).to.not.exist;
        });
    });

    /**
     * Test the GET /users/me endpoint.
     */
    describe('GET /users/me', () => {
        /**
         * Set up the token before running the tests.
         */
        before(async () => {
            const response = await request(app)
                .get('/connect')
                .set('Authorization', credentials)
                .send();
            const body = JSON.parse(response.text);
            token = body.token;
        });

        /**
         * Test accessing the user's own information without a token.
         */
        it('should return unauthorized because no token is passed', async () => {
            const response = await request(app).get('/users/me').send();
            const body = JSON.parse(response.text);

            expect(body).to.be.eql({ error: 'Unauthorized' });
            expect(response.statusCode).to.equal(401);
        });

        /**
         * Test accessing the user's own information with a valid token.
         */
        it('should retrieve the user based on the token used', async () => {
            const response = await request(app)
                .get('/users/me')
                .set('X-Token', token)
                .send();
            const body = JSON.parse(response.text);

            expect(body).to.be.eql({ id: userId, email: user.email });
            expect(response.statusCode).to.equal(200);
        });
    });
});
