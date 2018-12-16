const express = require('express');
const app = express();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const pages = require('./pagemanager.js');
const io = require("socket.io")(http);

//Database Setup


// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(fileUpload({
	limits: { fileSize: 80 * 1024 * 1024 },
}));

// Session Middleware
app.use(session({secret: 'iloveuit', resave: true, saveUninitialized: false}));

// Set Static Path
app.use(express.static(path.join(__dirname, 'public')));

// Global Vars
app.use(function(req, res, next){
	res.locals.errors = null;
	res.locals.title = null;
	next();
});

app.get('/', pages.homePage);

app.get('/login', pages.loginPage);

app.get('/signup', pages.signupPage);

app.get('/profile', pages.profilePage);

app.get('/logout', pages.logout);

app.get('/chat', pages.chatPage);

app.post('/login', pages.loginForm);

app.post('/signup', pages.signupForm);

app.post('/updatebio', pages.updatebio);

app.get('/addinterest', pages.addinterest);

app.get('/removeinterest', pages.removeinterest);

app.get('/verify', pages.verify);

app.get('/block', pages.block);

app.get('/unblock', pages.unblock);

app.get('/activateChat', pages.activateChat);

app.get('/report', pages.report);

app.get('/deleteNotification', pages.deleteNotification);

app.post('/report', pages.reportForm);

app.post('/getOnline', pages.getOnline);

app.post('/getNotifications', pages.getNotifications);

app.post('/change', pages.change);

app.post('/addprofilepicture', pages.addprofilepicture);

app.post('/addpicture', pages.addpicture);

//Handle 404
app.get('*', function(req, res) {res.render('error', {url: req.url})});
app.post('*', function(req, res) {res.render('error', {url: req.url})});

exports.io = io;

io.on('connection', pages.socket);

http.listen(3000, function (){
	console.log('Server started on port 3000...');
});