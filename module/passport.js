const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwtsecret = '@615141ViDiK141516@';
const User1 = require('../models/user');
const jwt = require('jsonwebtoken');

let start = () => {
//настройка паспорта
    passport.use(new LocalStrategy({
            usernameField: 'login',
            passwordField: 'password',
            session: false
        },
        function (login, password, done) {
            User1.findOne({login: login}, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (!user || !user.checkPassword(password) || user.status!=='active') {
                    return done(null, false, {message: 'Нет такого пользователя или пароль неверен.'});
                }
                return done(null, user);
            });
        }
        )
    );
    const jwtOptions = {};
    jwtOptions.jwtFromRequest= ExtractJwt.fromAuthHeaderAsBearerToken();
    jwtOptions.secretOrKey=jwtsecret;
    passport.use(
        new JwtStrategy(jwtOptions, function (payload, done) {
            User1.findOne({login:payload.login}, (err, user) => {
                if (err) {
                    return done(err)
                }
                if (user&&user.status==='active') {
                    return done(null, user)
                    console.log('JwtStrategy11')
                } else {
                    return done(null, false)
                }
            }).lean()
        })
    );
}

const verifydrole = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                await func(user.role)
            } else {
                console.error('No such user')
                res.status(401);
                res.end('No such user');
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

const verifydeuser = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                await func(user)
            } else {
                console.error('No such user')
                res.status(401);
                res.end('No such user');
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

const getuser = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            await func(user)

        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

const verifydeuserGQL = async (req, res) => {
    return new Promise((resolve) => { passport.authenticate('jwt', function (err, user) {
        try{
            console.log('verifydeuserGQL1', JSON.stringify(req.cookies.pinCode), JSON.stringify(user), JSON.stringify(user.pinCode), )
            user.checkedPinCode = req.cookies&&req.cookies.pinCode===user.pinCode
            resolve(user)
        } catch (err) {
            console.error(err)
            resolve({})
        }
    } )(req, res)
    })


}

const signinuser = (req, res) => {
    passport.authenticate('local', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                const payload = {
                    id: user._id,
                    login: user.login,
                    status: user.status,
                    role: user.role
                };
                const token = await jwt.sign(payload, jwtsecret); //здесь создается JWT
                await res.status(200);
                await res.clearCookie('jwt');
                await res.cookie('jwt', token, {maxAge: 500*24*60*60*1000}).end(token);
            } else {
                res.status(401);
                res.end('Login failed',401)
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('login not be unique')
        }
    })(req, res);
}

const getstatus = async (req, res) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            if (user&&user.status==='active') {
                res.status(200);
                res.end(JSON.stringify({status: user.status, role: user.role, id: user._id}))
            } else {
                console.error('No such user')
                res.status(401);
                res.end('No such user');
            }
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)

}

const signupuser = async (req, res) => {
    try{
        let _user = new User1({
            login: req.query.login,
            role: 'client',
            status: 'active',
            password: req.query.password,
        });
        const user = await User1.create(_user);
        const payload = {
            id: user._id,
            login: user.login,
            status: user.status,
            role: user.role
        };
        const token = jwt.sign(payload, jwtsecret); //здесь создается JWT*/
        await res.status(200);
        await res.clearCookie('jwt');
        await res.cookie('jwt', token, {maxAge: 500*24*60*60*1000}).end(token)
    } catch (err) {
        console.error(err)
        res.status(401);
        res.end('login not be unique')
    }
}

const signinuserGQL = (req, res) => {
    return new Promise((resolve) => {
        passport.authenticate('local', async function (err, user) {
            try{
                if (user&&user.status==='active') {
                    const payload = {
                        id: user._id,
                        login: user.login,
                        status: user.status,
                        role: user.role
                    };
                    const token = await jwt.sign(payload, jwtsecret); //здесь создается JWT
                    await res.clearCookie('jwt');
                    await res.cookie('jwt', token, {maxAge: 500*24*60*60*1000 });
                    resolve({
                        role: user.role,
                        status: user.status,
                        login: user.login,
                        _id: user._id
                    })
                } else {
                    resolve({role: 'Проверьте данные'})
                }
            } catch (err) {
                console.error(err)
                resolve({role: 'Проверьте данные'})
            }
        })(req, res);
    })
}

const createJwtGQL = async (res, user) => {
    const payload = {
        id: user._id,
        login: user.login,
        status: user.status,
        role: user.role
    };
    const token = await jwt.sign(payload, jwtsecret); //здесь создается JWT
    await res.clearCookie('jwt');
    await res.cookie('jwt', token, {maxAge: 500*24*60*60*1000 });
}

module.exports.getuser = getuser;
module.exports.createJwtGQL = createJwtGQL;
module.exports.verifydrole = verifydrole;
module.exports.getstatus = getstatus;
module.exports.verifydeuserGQL = verifydeuserGQL;
module.exports.start = start;
module.exports.verifydeuser = verifydeuser;
module.exports.signinuser = signinuser;
module.exports.signinuserGQL = signinuserGQL;
module.exports.signupuser = signupuser;