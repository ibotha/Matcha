var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var expressValidator = require('express-validator');
var mysql = require('mysql');

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
		"id int NOT NULL AUTO_INCREMENT,"+
		"first_name varchar(100) NOT NULL,"+
		"last_name varchar(100) NOT NULL,"+
		"email varchar(100) NOT NULL,"+
		"sexuality TINYINT NOT NULL,"+
		"bio varchar(2000) NOT NULL,"+
		"fame int NOT NULL DEFAULT 0,"+
		"location varchar(100) NOT NULL,"+
		"profilepic blob(4294967295) NOT NULL,"+
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

// Set Static Path
app.use(express.static(path.join(__dirname, 'public')));

// Global Vars
app.use(function(req, res, next){
	res.locals.errors = null;
	next();
});

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

var users = [
	{
		id: 1,
		first_name: 'John',
		last_name: 'Doe',
		email: 'johndoe@gmail.com'
	},
	{
		id: 1,
		first_name: 'Jim',
		last_name: 'Due',
		email: 'jimdue@gmail.com'
	},
	{
		id: 3,
		first_name: 'Jill',
		last_name: 'Dae',
		email: 'jilldae@gmail.com'
	}
]

app.get('/', function(req, res){
	res.render('index', {
		title: 'Profile',
		users: users
	});
});

app.post('/users/add', function (req, res) {

	req.checkBody('first_name', 'First Name is Required').notEmpty();
	req.checkBody('last_name', 'Last Name is Required').notEmpty();
	req.checkBody('email', 'Email is Required').notEmpty();

	var errors = req.validationErrors();

	if (errors) {
		res.render('index', {
			title: 'Profile',
			users: users,
			errors: errors
		});
		console.log('FAIL');
	} else {

		var newUser = {
			first_name: req.body.first_name,
			last_name: req.body.last_name,
			email: req.body.email,
		}
		users.
		console.log('SUCCESS');
	}
});

app.listen(3000, function (){
	console.log('Server started on port 3000...');
});