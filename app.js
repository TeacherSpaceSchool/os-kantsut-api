const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const connectDB = require('./models/index');
const app = express();
const usersRouter = require('./routes/users');
const integrateRouter = require('./routes/integrate');
const passportEngine = require('./module/passport');
const cors = require('cors');
const adminRouter = require('./routes/admin');
const os = require('os');
const compression = require('compression');
const bodyParser = require('body-parser');
let graphql  = require('./graphql/index');
const subscribe = require('./routes/subscribe');
const push = require('./routes/push');
require('body-parser-xml-json')(bodyParser);

passportEngine.start();

connectDB.connect()
app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(function(req, res, next){
    if (req.is('text/*')) {
        req.text = '';
        req.setEncoding('utf8');
        req.on('data', function(chunk){
            try{
                req.text += chunk
            } catch (err) {
                console.error(err)
                res.status(401);
                res.end(JSON.stringify(err.message))
            }
        });
        req.on('end', function(){
            try{
                req.body = JSON.parse(req.text); next()
            } catch (err) {
                console.error(err)
                res.status(401);
                res.end(JSON.stringify(err.message))
            }
        });
    } else {
        next();
    }
});
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.xml());
app.use(express.static(path.join(__dirname, 'admin')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());
app.set('trust proxy', true)
const corsOptions = {
    origin: process.env.URL.trim(),
    credentials: true
};
app.use(cors(corsOptions));
let serverGQL = graphql.run(app)
app.use('/', adminRouter);
app.use('/users', usersRouter);
app.use('/integrate', integrateRouter);
app.use('/subscribe', subscribe);
app.use('/push', push);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports.dirname = __dirname;
module.exports.app = app;
module.exports.serverGQL = serverGQL;
