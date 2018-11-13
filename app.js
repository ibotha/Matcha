var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressValidator = require('express-validator');
var mysql = require('mysql');
var session = require('express-session');const crypto = require('crypto');
const genset = {
	Male: 0,
	Female: 1,
	Other: 2
}

// HASHING
function change(str)
{
	const hash = crypto.createHash('sha256');

	hash.update(str);
	var ret = hash.digest('hex');
	hash.end();
	return ret;
}

//Database Setup
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "passwd"
});

con.connect(function (err) {
	if (err) throw err;
	console.log("Connected!");
	con.query("CREATE DATABASE IF NOT EXISTS matcha", function (err) {
		if (err) throw err;
		con.query("USE `matcha`");
		console.log("Database created");
		con.query("CREATE TABLE IF NOT EXISTS `matcha`.`users` ("+
		"id int UNIQUE NOT NULL AUTO_INCREMENT,"+
		"first_name varchar(100) NOT NULL,"+
		"last_name varchar(100) NOT NULL,"+
		"email varchar(100) UNIQUE NOT NULL,"+
		"password varchar(1000) NOT NULL,"+
		"verif varchar(1000) NOT NULL,"+
		"preference TINYINT NOT NULL,"+
		"gender TINYINT NOT NULL,"+
		"bio varchar(2000),"+
		"fame int NOT NULL DEFAULT 0,"+
		"valid int NOT NULL DEFAULT 0,"+
		"location varchar(100),"+
		"profilepic blob(4294967295),"+
		"pic1 blob(4294967295),"+
		"pic2 blob(4294967295),"+
		"pic3 blob(4294967295),"+
		"pic4 blob(4294967295),"+
		"PRIMARY KEY (id)"+
		")", function (err) {
			if (err) throw err;
			console.log("user table created");
		});
	});
});

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

app.get('/', function(req, res) {
	if (req.session.user)
		res.render('index', {
			title: 'Home',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Home',
		});
});

app.get('/login', function(req, res){
	if (req.session.user)
		res.render('index', {
			title: 'Login',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Login',
		});
});

app.get('/signup', function(req, res){
	if (req.session.user)
		res.render('index', {
			title: 'Signup',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Signup',
		});
});

app.get('/profile', function(req, res){
	con.query("SELECT * FROM `users` WHERE id = " + mysql.escape(req.query.user) + "LIMIT 1", function (err, result, fields) {
		if (err) throw err;
		user = result[0];
	});
	console.log(user);
	if (req.session.user)
		res.render('index', {
			title: 'Profile',
			session: req.session,
			user: user
		});
	else
		res.render('index', {
			title: 'Profile',
			user: user
		});
});

app.get('/logout', function(req, res){
	req.session.destroy();
	res.render('index', {
		title: 'Home',
	});
});

app.get('/chat', function(req, res){
	if (req.session.user)
		res.render('index', {
			title: 'Chat',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Chat',
		});
});

app.post('/login', function (req, res) {

	req.checkBody('email', 'Not Valid Email Format').isEmail();
	req.checkBody('email', 'Email is Required').notEmpty();
	req.checkBody('password', 'Password is Required').notEmpty();

	var errors = req.validationErrors();

	if (errors) {
		res.render('index', {
			title: 'Login',
			errors: errors,
			current: {
				email: req.body.email
			}
		});
	} else {
		con.query("SELECT * FROM `users` WHERE email = " + mysql.escape(req.body.email) + "LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (!result.length)
			{
				errors = [
					{
						msg: 'Invalid Login'
					}
				];
				res.render('index', {
					title: 'Login',
					errors: errors,
					current: {
						email: req.body.email
					}
				});
			} else {
				if (change(req.body.password) == result[0].password)
				{
					req.session.user = {
						id: result[0].id,
						first_name: result[0].first_name,
						last_name: result[0].last_name,
						email: result[0].email
					}
					res.redirect('./');
				} else {
					errors = [
						{
							msg: 'Incorrect Login'
						}
					];
					res.render('index', {
						title: 'Login',
						errors: errors,
						current: {
							email: req.body.email
						}
					});
				}
			}
		});
	}
});

app.post('/signup', function (req, res) {
	req.checkBody('email', 'Not Valid Email Format').isEmail();
	req.checkBody('email', 'Email is Required').notEmpty();
	req.checkBody('password', 'Password is Required').notEmpty();
	req.checkBody('password', 'Password Must Be at Least 8 Characters Long and Contain at Least: 1 Special, Capital, Numeric and Lower Case Character').matches(/^(?=.*\d)(?=.*[^a-zA-Z\d])(?=.*[a-z])(?=.*[A-Z]).{8,}$/);
	req.checkBody('confirm', 'Passwords Must Match').equals(req.body.password);
	req.checkBody('first_name', 'First Name is Required').notEmpty();
	req.checkBody('last_name', 'Last Name is Required').notEmpty();

	var errors = req.validationErrors();
	var current = {
		email: req.body.email ? req.body.email : "",
		first_name: req.body.first_name ? req.body.first_name : "",
		last_name: req.body.last_name ? req.body.last_name : "",
		gender: req.body.gender ? req.body.gender : "",
		preference: req.body.preference ? req.body.preference : ""
	};
	if (errors) {
		res.render('index', {
			title: 'Signup',
			errors: errors,
			current: current
		});
	} else {	
		var user = null;
		con.query("SELECT * FROM `users` WHERE email = " + mysql.escape(req.body.email) + "LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (!result.length)
			{
				con.query("INSERT INTO `users` (`first_name`, `last_name`, `email`, `password`, `verif`, `preference`, `gender`) VALUES ("+
					mysql.escape(req.body.first_name) + ","+
					mysql.escape(req.body.last_name) + ","+
					mysql.escape(req.body.email) + ","+
					mysql.escape(change(req.body.password)) + ","+
					mysql.escape(change(Math.random().toString())) + ","+
					mysql.escape(genset[req.body.preference]) + ","+
					mysql.escape(genset[req.body.gender]) +
					")", function (err) {
					if (err) throw err;
					res.redirect('./');
				});
			} else {
				errors = [
					{
						msg: 'Email already taken'
					}
				];
				res.render('index', {
					title: 'Signup',
					errors: errors,
					current: current
				});
			}
		});
	}
});

app.listen(3000, function (){
	console.log('Server started on port 3000...');
});