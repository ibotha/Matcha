const database = require('./database.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');

var transporter = nodemailer.createTransport(
	{
		service: 'gmail',
		auth: {
			user: 'ibothawebadmi@gmail.com',
			pass: '0JId034D4Mpx'
		},
		logger: false,
		debug: false
	},
	{
		from: 'Matcha <ibothawebadmi@gmail.com>',
		headers: {
		}
	}
);

var passerr = null;

function sendVerif(user, type = 'verif') {
	var verif = change(Math.random().toString());
	var newpass = Math.random().toString();
	var message = {
		to: user.first_name + ' ' + user.last_name + ' <' + user.email + '>',
		subject: 'Matcha Account',
		html:
			'<h3>Greetings ' + user.first_name + '</h3>' +
			'<p>' + type == 'verif' ?'Congradulations on your new Matcha account':('Your new password is "' + newpass + "\" Be sure to log in soon and change it to somthing you prefer") +'. To continue click <a href="http://localhost:3000/verify?verif=' + verif + '">here</a></p>'
	};

	if (type == 'verif')
		database.con.query("UPDATE `users` SET `verif` = " + database.escape(verif) + " WHERE first_name = " + database.escape(user.first_name) + ";", function(err){if (err) throw err});
	else
		database.con.query("UPDATE `users` SET `password` = " + database.escape(change(newpass)) + " WHERE first_name = " + database.escape(user.first_name) + ";", function(err){if (err) throw err});

	transporter.sendMail(message, (error, info) => {
		if (error) {
			console.log('Error occurred');
			console.log(error.message);
			return process.exit(1);
		}

		console.log('Message sent successfully!');
		console.log(nodemailer.getTestMessageUrl(info));

	});
}

const genset = {
	Male: 0,
	Female: 1,
	Other: 2,
	Both: 3,
	0: 'Male',
	1: 'Female',
	2: 'Other',
	3: 'Both',
}
const prefset = {
	Heterosexual: 0,
	Homosexual: 1,
	Bisexual: 2,
	Other: 3,
	0: 'Heterosexual',
	1: 'Homosexual',
	2: 'Bisexual',
	3: 'Other'
}

function change(str)
{
	const hash = crypto.createHash('sha256');

	hash.update(str);
	var ret = hash.digest('hex');
	hash.end();
	return ret;
}

exports.loginForm = function (req, res) {
	req.checkBody('email', 'Not Valid Email Format').isEmail();
	req.checkBody('email', 'Email is Required').notEmpty();
	var errors = null;
	passerr = null;
	if (req.body.forgot == 'true')
	{
		database.con.query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + " LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (result[0])
			{
				sendVerif(result[0], 'forgot');
			}
			else passerr = [{ msg: "Not an exsisting email"}];

			res.render('index', {
				title: 'Login',
				errors: errors ? errors.concat(passerr) : passerr,
				current: {
					email: req.body.email
				}
			});
		});
	} else if (req.body.resend == 'true')
	{
		database.con.query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + " AND `valid` = '0' LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (result[0])
			{
				sendVerif(result[0]);
			}
			else passerr = [{ msg: "Not an exsisting email or already validated"}];
			res.render('index', {
				title: 'Login',
				errors: errors ? errors.concat(passerr) : passerr,
				current: {
					email: req.body.email
				}
			});
		});
	}
	else
	{
		req.checkBody('password', 'Password is Required').notEmpty();

		var errors = req.validationErrors();

		if (errors) {
			res.render('index', {
				title: 'Login',
				errors: errors.concat(passerr),
				current: {
					email: req.body.email
				}
			});
		} else {
			database.con.query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + " AND `valid` = '1' LIMIT 1", function (err, result, fields) {
				if (err) throw err;
				if (!result.length)
				{
					passerr = [{msg: 'Invalid Login'}];
					res.render('index', {
						title: 'Login',
						errors: passerr,
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
						passerr = [{msg: 'Invalid Login'}];
						res.render('index', {
							title: 'Login',
							errors: errors ? errors.concat(passerr) : passerr,
							current: {
								email: req.body.email
							}
						});
					}
				}
			});
		}
	}
}

exports.signupForm = function (req, res) {
	req.checkBody('email', 'Not Valid Email Format').isEmail();
	req.checkBody('email', 'Email is Required').notEmpty();
	req.checkBody('password', 'Password is Required').notEmpty();
	req.checkBody('password', 'Password Must Be at Least 8 Characters Long and Contain at Least: 1 Special, Capital, Numeric and Lower Case Character').matches(/^(?=.*\d)(?=.*[^a-zA-Z\d])(?=.*[a-z])(?=.*[A-Z]).{8,}$/);
	req.checkBody('confirm', 'Passwords Must Match').equals(req.body.password);
	req.checkBody('first_name', 'First Name is Required').notEmpty();
	req.checkBody('last_name', 'Last Name is Required').notEmpty();
	req.checkBody('age', 'Age is Required').notEmpty();

	var errors = req.validationErrors();
	var current = {
		email: req.body.email ? req.body.email : "",
		first_name: req.body.first_name ? req.body.first_name : "",
		last_name: req.body.last_name ? req.body.last_name : "",
		age: req.body.age ? req.body.age : "",
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
		database.con.query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + "LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (!result.length)
			{
				database.con.query("INSERT INTO `users` (`first_name`, `last_name`, `age`, `email`, `password`, `verif`, `preference`, `gender`) VALUES ("+
					database.escape(req.body.first_name) + ","+
					database.escape(req.body.last_name) + ","+
					database.escape(req.body.age) + ","+
					database.escape(req.body.email) + ","+
					database.escape(change(req.body.password)) + ","+
					database.escape(change(Math.random().toString())) + ","+
					database.escape(prefset[req.body.preference]) + ","+
					database.escape(genset[req.body.gender]) +
					")", function (err) {
					if (err) throw err;
					sendVerif(req.body);
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
}

exports.profilePage = function(req, res){
	var temperr = passerr;
	passerr = null;
	(temperr);
	if (req.query.user)
		database.con.query("SELECT * FROM `users` WHERE id = " + database.escape(req.query.user) + "LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			var user = result[0];
			if (user)
			{
				user.interests = JSON.parse(user.interests);
				database.con.query("SELECT * FROM `catagories`", function (err, result, fields) {
					if (err) throw err;
					var cats = [];
					var done = 0;
					var intlist = [];
					result.forEach(cat => {
						database.con.query("SELECT * FROM `interests` WHERE `catagory` = '" + cat.id + "' ORDER BY `name` ASC;", function (err, ints, fields) {
							if (err) throw err;
							cats.push({name: cat.name, interests: ints});
							if (done == (result.length - 1 + user.interests.length))
							{
								user.interests = intlist;
								if (req.session.user)
									res.render('index', {
										title: 'Profile',
										session: req.session,
										user: user,
										cats: cats,
										errors: temperr
									});
								else
									res.render('index', {
										title: 'Profile',
										user: user,
										errors: temperr
									});
							}
							else ++done;
						});
					});
					user.interests.forEach(interest => {
						database.con.query("SELECT * FROM `interests` WHERE `id` = '" + interest + "' LIMIT 1;", function (err, resu, fields) {
							if (err) throw err;
							intlist.push(resu[0].name);
							if (done == (result.length - 1 + user.interests.length))
							{
								user.interests = intlist;
								if (req.session.user)
									res.render('index', {
										title: 'Profile',
										session: req.session,
										user: user,
										cats: cats,
										errors: temperr
									});
								else
									res.render('index', {
										title: 'Profile',
										user: user,
										errors: temperr
									});
							}
							else ++done;
						});
					});			
				});
			}
			else res.redirect('./');
		});
		else res.redirect('./');
}

exports.homePage = function(req, res) {
	if (req.session.user)
		res.render('index', {
			title: 'Home',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Home',
		});
}

exports.chatPage = function(req, res){
	if (req.session.user)
		res.render('index', {
			title: 'Chat',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Chat',
		});
}

exports.logout = function(req, res){
	req.session.destroy();
	res.render('index', {
		title: 'Home',
	});
}

exports.signupPage = function(req, res){
	if (req.session.user)
		res.render('index', {
			title: 'Signup',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Signup',
		});
}

exports.loginPage = function(req, res){
	if (req.session.user)
		res.render('index', {
			title: 'Login',
			session: req.session
		});
	else
		res.render('index', {
			title: 'Login',
		});
}

exports.updatebio = function(req, res){
	database.con.query("UPDATE `users` SET `bio` = "+ database.escape(req.body.bio) +" WHERE `users`.`id` = "+ database.escape(req.session.user.id) +";", function (err) {
		if (err) throw err;
	});
	res.redirect('/profile?user=' + req.session.user.id);
}

exports.addinterest = function (req, res){
	if (req.session.user)
	{
		database.con.query("SELECT * FROM `users` WHERE id = " + database.escape(req.session.user.id) + " LIMIT 1;", function(err, result) {
			if (err) throw err;
			var user = result[0];
			var interests = JSON.parse(user.interests);
			database.con.query("SELECT * FROM `interests` WHERE name = " + database.escape(req.query.interest) + " LIMIT 1;", function(err, result) {
				if (err) throw err;
				if (!interests.includes(result[0].id))
					interests.push(result[0].id);
				database.con.query("UPDATE `users` SET `interests` = " + database.escape(JSON.stringify(interests)) + " WHERE `users`.`id` = " + database.escape(req.session.user.id) + ";");
				res.redirect('./profile?user=' + req.session.user.id);
			});
		});
	}
	else
		res.redirect('./');
}

exports.removeinterest = function (req, res){
	if (req.session.user)
	{
		database.con.query("SELECT * FROM `users` WHERE id = " + database.escape(req.session.user.id) + " LIMIT 1;", function(err, result) {
			if (err) throw err;
			var user = result[0];
			var interests = JSON.parse(user.interests);
			database.con.query("SELECT * FROM `interests` WHERE name = " + database.escape(req.query.remove) + " LIMIT 1;", function(err, result) {
				if (err) throw err;
				if (interests.includes(result[0].id))
				{
					var temp = [];
					interests.forEach(trest => {
						if (trest != result[0].id)
							temp.push(trest);
					});
					interests = temp;
				}
				database.con.query("UPDATE `users` SET `interests` = " + database.escape(JSON.stringify(interests)) + " WHERE `users`.`id` = " + database.escape(req.session.user.id) + ";");
				res.redirect('./profile?user=' + req.session.user.id);
			});
		});
	}
	else
		res.redirect('./');
}

exports.change = function (req, res){
	passerr = null;
	if (req.body.email){
		database.con.query("UPDATE `users` SET `email` = " + database.escape(req.body.email) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){if(err) throw err});
	} else if (req.body.first_name && req.body.last_name){
		database.con.query("UPDATE `users` SET `first_name` = " + database.escape(req.body.first_name) + ", `last_name` = " + database.escape(req.body.last_name) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){if(err) throw err});
	} else if (req.body.confirm && req.body.old_password && req.body.new_password){
		req.checkBody('new_password', 'Password Must Be at Least 8 Characters Long and Contain at Least: 1 Special, Capital, Numeric and Lower Case Character').matches(/^(?=.*\d)(?=.*[^a-zA-Z\d])(?=.*[a-z])(?=.*[A-Z]).{8,}$/);
		req.checkBody('confirm', 'Passwords Must Match').equals(req.body.new_password);
		if (!req.validationErrors())
		{
			database.con.query("SELECT * FROM `users` WHERE id = " + database.escape(req.session.user.id) + " LIMIT 1", function (err, result, fields) {
				if (err) throw err;
				if (change(req.body.old_password) == result[0].password)
					database.con.query("UPDATE `users` SET `password` = " + database.escape(change(req.body.new_password)) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){if(err) throw err});
				else
					passerr = [{ msg: "Password incorrect" }];
			});
		}
		else passerr = req.validationErrors();
	} else if (req.body.gender){
		database.con.query("UPDATE `users` SET `gender` = " + database.escape(genset[req.body.gender]) + ", `preference` = " + database.escape(prefset[req.body.preference]) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){if(err) throw err});
	}
	res.redirect('./profile?user=' + req.session.user.id);
}

exports.verify = function (req, res){
	console.log(req.query.verif);
	database.con.query("UPDATE `users` SET `valid` = '1' WHERE verif = " + database.escape(req.query.verif) + ";", function(err){if (err) throw err});
	res.redirect("./");
}

exports.addprofilepicture = function (req, res){
	//console.log(req.files);
	//req.files.forEach(file =)
	var FileReader = require('filereader');
	var reader = new FileReader();
	reader.setNodeChunkedEncoding(true);
	req.files.profilepic.mv(('./temp.' + req.files.profilepic.mimetype.split(/\//)[1]), function (err) {
		if (err) throw err
		fs.readFile('./temp.' + req.files.profilepic.mimetype.split(/\//)[1], "base64", function (err, data) {
			if (err) throw err;
			var str = 'data:' + req.files.profilepic.mimetype + ';base64,' + data;
			database.con.query("UPDATE `users` SET `profilepic` = " + database.escape(str) + " WHERE `id` = " + database.escape(req.session.user.id) + ";");
		});
	});
	res.redirect("./profile?user=" + req.session.user.id);
}