const database = require('./database.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const genset = {
	Male: 0,
	Female: 1,
	Other: 2,
	0: 'Male',
	1: 'Female',
	2: 'Other',
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
		database.getCon().query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + "LIMIT 1", function (err, result, fields) {
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
}

exports.signupForm = function (req, res) {
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
		database.getCon().query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + "LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (!result.length)
			{
				database.getCon().query("INSERT INTO `users` (`first_name`, `last_name`, `email`, `password`, `verif`, `preference`, `gender`) VALUES ("+
					database.escape(req.body.first_name) + ","+
					database.escape(req.body.last_name) + ","+
					database.escape(req.body.email) + ","+
					database.escape(change(req.body.password)) + ","+
					database.escape(change(Math.random().toString())) + ","+
					database.escape(genset[req.body.preference]) + ","+
					database.escape(genset[req.body.gender]) +
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
}

exports.profilePage = function(req, res){
	database.getCon().query("SELECT * FROM `users` WHERE id = " + database.escape(req.query.user) + "LIMIT 1", function (err, result, fields) {
		if (err) throw err;
		var user = result[0];
		if (user)
		{
			user.interests = JSON.parse(user.interests);
			database.getCon().query("SELECT * FROM `catagories`", function (err, result, fields) {
				if (err) throw err;
				var cats = [];
				var done = 0;
				var intlist = [];
				result.forEach(cat => {
					database.getCon().query("SELECT * FROM `interests` WHERE `catagory` = '" + cat.id + "' ORDER BY `name` ASC;", function (err, ints, fields) {
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
									cats: cats
								});
							else
								res.render('index', {
									title: 'Profile',
									user: user
								});
						}
						else ++done;
					});
				});
				user.interests.forEach(interest => {
					database.getCon().query("SELECT * FROM `interests` WHERE `id` = '" + interest + "' LIMIT 1;", function (err, resu, fields) {
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
									cats: cats
								});
							else
								res.render('index', {
									title: 'Profile',
									user: user
								});
						}
						else ++done;
					});
				});			
			});
		}
		else res.redirect('./');
	});
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
	database.getCon().query("UPDATE `users` SET `bio` = "+ database.escape(req.body.bio) +" WHERE `users`.`id` = "+ database.escape(req.session.user.id) +";", function (err) {
		if (err) throw err;
	});
	res.redirect('/profile?user=' + req.session.user.id);
}

exports.addinterest = function (req, res){
	if (req.session.user)
	{
		database.getCon().query("SELECT * FROM `users` WHERE id = " + database.escape(req.session.user.id) + " LIMIT 1;", function(err, result) {
			if (err) throw err;
			var user = result[0];
			var interests = JSON.parse(user.interests);
			database.getCon().query("SELECT * FROM `interests` WHERE name = " + database.escape(req.query.interest) + " LIMIT 1;", function(err, result) {
				if (err) throw err;
				if (!interests.includes(result[0].id))
					interests.push(result[0].id);
				console.log(interests);
				database.getCon().query("UPDATE `users` SET `interests` = " + database.escape(JSON.stringify(interests)) + " WHERE `users`.`id` = " + database.escape(req.session.user.id) + ";");
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
		database.getCon().query("SELECT * FROM `users` WHERE id = " + database.escape(req.session.user.id) + " LIMIT 1;", function(err, result) {
			if (err) throw err;
			var user = result[0];
			var interests = JSON.parse(user.interests);
			database.getCon().query("SELECT * FROM `interests` WHERE name = " + database.escape(req.query.remove) + " LIMIT 1;", function(err, result) {
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

				console.log(interests);
				database.getCon().query("UPDATE `users` SET `interests` = " + database.escape(JSON.stringify(interests)) + " WHERE `users`.`id` = " + database.escape(req.session.user.id) + ";");
				res.redirect('./profile?user=' + req.session.user.id);
			});
		});
	}
	else
		res.redirect('./');
}