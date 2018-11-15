const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const expressValidator = require('express-validator');
const session = require('express-session');
const pages = require('./pagemanager.js');

//Database Setup

var app = express();

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Session Middleware
app.use(session({secret: 'iloveuit'}));

// Set Static Path
app.use(express.static(path.join(__dirname, 'public')));

// Global Vars
app.use(function(req, res, next){
	res.locals.errors = null;
	next();
});

// Validator
app.use(expressValidator({
	errorFormatter: function(param, msg, value) {
		var namespace = param.split('.'),
		root = namespace.shift(),
		formParam = root;

		while(namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return {
			param: formParam,
			msg: msg,
			value: value
		};
	}
}));

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

app.listen(3000, function (){
	console.log('Server started on port 3000...');
});