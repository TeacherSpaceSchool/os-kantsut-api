const express = require('express');
const router = express.Router();
const passportEngine = require('../module/passport');


/* GET users listing. */
router.get('/', async (req, res, next) => {
    await res.send('12345respond with a resource54321');
});

router.post('/signup', async (req, res, next) => {
    passportEngine.signupuser(req, res)
});

router.post('/signin', async (req, res, next) => {
    passportEngine.signinuser(req, res)
});

router.post('/status', async (req, res, next) => {
    passportEngine.getstatus(req, res)
});

module.exports = router;
