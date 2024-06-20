import { tmpdir } from 'os';
import Queue from 'bull';
import { v4 as uuidv4 } from 'uuid';
import {
  mkdir, writeFile, existsSync, readFile,
} from 'fs/promises';
import { join as joinPath } from 'path';
import { contentType } from 'mime-types';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import dbClient from '../utils/db';

const VALID_FILE_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};

const ROOT_FOLDER_ID = 0;
const DEFAULT_ROOT_FOLDER = 'files_manager';
const MAX_FILES_PER_PAGE = 20;
const fileQueue = new Queue('thumbnail generation');
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');

/**
 * Middleware to extract user from X-Token header.
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 * @param {function} next - The next middleware function.
 * @returns {void}
 */
const UserFromXToken = async (req, res, next) => {
  const token = req.header('X-Token');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await dbClient
      .usersCollection()
      .findOne({ _id: new ObjectId(decoded._id) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * Checks if the given ID is a valid 24-character hexadecimal string.
 * @param {string} id - The ID to validate.
 * @returns {boolean} - True if the ID is valid, otherwise false.
 */
const isValidId = (id) => {
  const size = 24;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  return Array.from(id).every((c) => {
    const code = c.charCodeAt(0);
    return charRanges.some((range) => code >= range[0] && code <= range[1]);
  });
};

export default class FilesController {
  /**
   * Uploads a file to the file management system.
   * Validates the request, processes the file upload, and stores metadata in the database.
   * Generates a thumbnail for image files.
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   */
  static async postUpload(req, res) {
    try {
      UserFromXToken(req, res, async () => {
        const { user } = req;
        const {
          name,
          type,
          parentId = ROOT_FOLDER_ID,
          isPublic = false,
          data = '',
        } = req.body || {};

        if (!name) {
          res.status(400).json({ error: 'Missing name' });
          return;
        }
        if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) {
          res.status(400).json({ error: 'Missing type' });
          return;
        }
        if (!data && type !== VALID_FILE_TYPES.folder) {
          res.status(400).json({ error: 'Missing data' });
          return;
        }

        const parentFile = await dbClient.filesCollection().findOne({
          _id: new ObjectId(isValidId(parentId) ? parentId : NULL_ID),
        });

        if (parentId !== ROOT_FOLDER_ID && !parentFile) {
          res.status(400).json({ error: 'Parent not found' });
          return;
        }
        if (parentFile && parentFile.type !== VALID_FILE_TYPES.folder) {
          res.status(400).json({ error: 'Parent is not a folder' });
          return;
        }

        const userId = user._id.toString();
        const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0
          ? process.env.FOLDER_PATH.trim()
          : joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);

        const newFile = {
          userId: new ObjectId(userId),
          name,
          type,
          isPublic,
          parentId:
            parentId === ROOT_FOLDER_ID
            || parentId === ROOT_FOLDER_ID.toString()
              ? '0'
              : new ObjectId(parentId),
        };

        await mkdir(baseDir, { recursive: true });

        if (type !== VALID_FILE_TYPES.folder) {
          const localPath = joinPath(baseDir, uuidv4());
          await writeFile(localPath, Buffer.from(data, 'base64'));
          newFile.localPath = localPath;
        }

        const insertionInfo = await dbClient
          .filesCollection()
          .insertOne(newFile);
        const fileId = insertionInfo.insertedId.toString();

        if (type === VALID_FILE_TYPES.image) {
          const jobName = `Image thumbnail [${userId}-${fileId}]`;
          fileQueue.add({ userId, fileId, name: jobName });
        }

        res.status(201).json({
          id: fileId,
          userId,
          name,
          type,
          isPublic,
          parentId:
            parentId === ROOT_FOLDER_ID
            || parentId === ROOT_FOLDER_ID.toString()
              ? 0
              : parentId,
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves metadata for a specific file.
   * Checks user authorization and file existence before returning metadata.
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   */
  static async getShow(req, res) {
    try {
      UserFromXToken(req, res, async () => {
        const { user } = req;
        const { id } = req.params;
        const userId = user._id.toString();

        const file = await dbClient.filesCollection().findOne({
          _id: new ObjectId(isValidId(id) ? id : NULL_ID),
          userId: new ObjectId(isValidId(userId) ? userId : NULL_ID),
        });

        if (!file) {
          res.status(404).json({ error: 'Not found' });
          return;
        }

        res.status(200).json({
          id,
          userId,
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId:
            file.parentId === ROOT_FOLDER_ID.toString()
              ? 0
              : file.parentId.toString(),
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves a list of files associated with the authenticated user.
   * Supports pagination via query parameters.
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   */
  static async getIndex(req, res) {
    try {
      UserFromXToken(req, res, async () => {
        const { user } = req;
        const { parentId = ROOT_FOLDER_ID.toString(), page = 0 } = req.query;

        const filesFilter = {
          userId: new ObjectId(user._id),
          parentId:
            parentId === ROOT_FOLDER_ID.toString()
              ? parentId
              : new ObjectId(isValidId(parentId) ? parentId : NULL_ID),
        };

        const files = await dbClient
          .filesCollection()
          .aggregate([
            { $match: filesFilter },
            { $skip: page * MAX_FILES_PER_PAGE },
            { $limit: MAX_FILES_PER_PAGE },
          ])
          .toArray();

        const normalizedFiles = files.map((file) => ({
          id: file._id.toString(),
          userId: file.userId.toString(),
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId:
            file.parentId === ROOT_FOLDER_ID.toString()
              ? 0
              : file.parentId.toString(),
        }));

        res.status(200).json(normalizedFiles);
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Publishes a file, making it publicly accessible.
   * Checks user authorization and file existence before updating the file status.
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   */
  static async putPublish(req, res) {
    try {
      UserFromXToken(req, res, async () => {
        const { user } = req;
        const { id } = req.params;
        const userId = user._id.toString();

        const fileFilter = {
          _id: new ObjectId(isValidId(id) ? id : NULL_ID),
          userId: new ObjectId(isValidId(userId) ? userId : NULL_ID),
        };

        const file = await dbClient.filesCollection().findOne(fileFilter);

        if (!file) {
          res.status(404).json({ error: 'Not found' });
          return;
        }

        await dbClient
          .filesCollection()
          .updateOne(fileFilter, { $set: { isPublic: true } });

        res.status(200).json({
          id,
          userId,
          name: file.name,
          type: file.type,
          isPublic: true,
          parentId:
            file.parentId === ROOT_FOLDER_ID.toString()
              ? 0
              : file.parentId.toString(),
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Unpublishes a file, making it privately accessible.
   * Checks user authorization and file existence before updating the file status.
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   */
  static async putUnpublish(req, res) {
    try {
      UserFromXToken(req, res, async () => {
        const { user } = req;
        const { id } = req.params;
        const userId = user._id.toString();

        const fileFilter = {
          _id: new ObjectId(isValidId(id) ? id : NULL_ID),
          userId: new ObjectId(isValidId(userId) ? userId : NULL_ID),
        };

        const file = await dbClient.filesCollection().findOne(fileFilter);

        if (!file) {
          res.status(404).json({ error: 'Not found' });
          return;
        }

        await dbClient
          .filesCollection()
          .updateOne(fileFilter, { $set: { isPublic: false } });

        res.status(200).json({
          id,
          userId,
          name: file.name,
          type: file.type,
          isPublic: false,
          parentId:
            file.parentId === ROOT_FOLDER_ID.toString()
              ? 0
              : file.parentId.toString(),
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves the content of the file document based on the ID.
   * Checks user authorization and file existence before returning the file content.
   * Supports retrieving thumbnails if size parameter is provided.
   * @param {object} req - The HTTP request object.
   * @param {object} res - The HTTP response object.
   */
  static async getFileData(req, res) {
    try {
      const { id } = req.params;
      const { size } = req.query;

      const file = await dbClient.filesCollection().findOne({
        _id: new ObjectId(isValidId(id) ? id : NULL_ID),
      });

      if (!file) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (file.type === VALID_FILE_TYPES.folder) {
        res.status(400).json({ error: "A folder doesn't have content" });
        return;
      }
      if (!file.isPublic) {
        UserFromXToken(req, res, async () => {
          const { user } = req;
          if (!user || user._id.toString() !== file.userId.toString()) {
            res.status(404).json({ error: 'Not found' });
          }
        });
      }

      let filePath = file.localPath;

      if (size) {
        const validSizes = [100, 250, 500];
        if (!validSizes.includes(parseInt(size, 10))) {
          res.status(400).json({ error: 'Invalid size parameter' });
          return;
        }
        filePath = `${file.localPath}_${size}`;
      }

      if (!(await existsSync(filePath))) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const fileContent = await readFile(filePath);
      const mimeType = contentType(file.name);
      res.setHeader('Content-Type', mimeType);
      res.send(fileContent);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
