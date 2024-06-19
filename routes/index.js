import AppController from '../controllers/AppController';

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

module.exports = router;