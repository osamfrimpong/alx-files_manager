import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const authenticationHeader = request.header('Authorization');
    if (!authenticationHeader) {
      return;
    }
    if (typeof (authenticationHeader) !== 'string') {
      return;
    }
    if (authenticationHeader.slice(0, 6) !== 'Basic ') {
      return;
    }
    const authenticationHeaderDetails = authenticationHeader.slice(6);
    const decodedDetails = Buffer.from(authenticationHeaderDetails, 'base64').toString('utf8');
    const data = decodedDetails.split(':'); // contains email and password
    if (data.length !== 2) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const hashedPassword = sha1(data[1]);
    const users = dbClient.db.collection('users');
    const desiredUser = await users.findOne({ email: data[0], password: hashedPassword });
    if (desiredUser) {
      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, desiredUser._id.toString(), 862400);
      response.status(200).json({ token });
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async getDisconnect(request, response) {
    const tokenFromHeader = request.header('X-Token');
    const key = `auth_${tokenFromHeader}`;
    const id = await redisClient.get(key);
    if (id) {
      await redisClient.del(key);
      response.status(204).json({});
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}

export default AuthController;
