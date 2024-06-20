import { writeFile } from 'fs';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import imgThumbnail from 'image-thumbnail';
import { ObjectID } from 'mongodb';
import dbClient from './utils/db';

/**
 * Asynchronously writes a file using the fs.writeFile method.
 * @param {string} filePath - The path of the file to be written.
 * @returns {Promise<void>} - A promise that resolves when the file has been written.
 */
const writeFileAsync = promisify(writeFile);

// Create queues for thumbnail generation and email sending
const queueForFiles = new Queue('thumbnail generation');
const queueForUsers = new Queue('email sending');

/**
 * Generates a thumbnail for a given image file.
 * @param {string} filePath - The path of the image file.
 * @param {number} size - The desired width of the thumbnail.
 * @returns {Promise<void>} - A promise that resolves when the thumbnail has been generated.
 */
const generateThumbnail = async (filePath, size) => {
    const buffer = await imgThumbnail(filePath, { width: size });
    console.log(`Generating file: ${filePath}, size: ${size}`);
    return writeFileAsync(`${filePath}_${size}`, buffer);
};

// Process jobs in the queueForFiles
queueForFiles.process(async (job, done) => {
    const fileId = job.data.fileId || null;
    const userId = job.data.userId || null;

    if (!fileId) {
        throw new Error('Missing fileId');
    }
    if (!userId) {
        throw new Error('Missing userId');
    }
    console.log('Processing', job.data.name || '');
    const userObjId = new ObjectID(userId);
    const fileObjId = new ObjectID(fileId);
    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({ _id: fileObjId, userId: userObjId });
    if (!file) {
        throw new Error('File not found');
    }
    const sizes = [500, 250, 100];
    Promise.all(sizes.map((size) => generateThumbnail(file.localPath, size)))
        .then(() => {
            done();
        });
});

// Process jobs in the queueForUsers
queueForUsers.process(async (job, done) => {
    const userId = job.data.userId || null;

    if (!userId) {
        throw new Error('Missing userId');
    }
    const userObjId = new ObjectID(userId);
    const users = dbClient.db.collection('users');
    const existingUser = await users.findOne({ _id: userObjId });
    if (!existingUser) {
        throw new Error('User not found');
    }
    console.log(`Welcome ${existingUser.email}!`);
});
