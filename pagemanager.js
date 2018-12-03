const database = require('./database.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const nope = require('./nope.js');
const app = require('./app.js');

var transporter = nodemailer.createTransport(
	{
		service: 'gmail',
		auth: nope.auth,
		logger: false,
		debug: false
	},{
		from: 'Matcha <ibothawebadmi@gmail.com>',
		headers: {
		}
	}
);

var passerr = null;

function sendVerif(user, type) {
	var verif = change(Math.random().toString());
	var newpass = Math.random().toString();
	var message = {
		to: user.first_name + ' ' + user.last_name + ' <' + user.email + '>',
		subject: 'Matcha Account',
		html:
			'<h3>Greetings ' + user.first_name + '</h3>' +
			'<p>' + ((type == 'verif') ? ('Congradulations on your new Matcha account. To verify your email click <a href="http://localhost:3000/verify?verif=' + verif + '">here</a>')
			: ('Your new password is "' + newpass + "\" Be sure to log in soon and change it to something you prefer")) +'</p>'
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

	});
}

const genset = {
	Male: 0,
	Female: 1,
	0: 'Male',
	1: 'Female',
}
const prefset = {
	Heterosexual: 0,
	Homosexual: 1,
	Bisexual: 2,
	0: 'Heterosexual',
	1: 'Homosexual',
	2: 'Bisexual',
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
	req.checkBody('lat', 'Location err').notEmpty();
	req.checkBody('lon', 'Location err').notEmpty();

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
				sendVerif(result[0], 'verif');
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
				errors: errors ? errors.concat(passerr) : passerr,
				current: {
					email: req.body.email
				}
			});
		} else {
			database.con.query("SELECT id, email, password, first_name, last_name, lat, lon, interests, preference, gender, fame, valid, age FROM `users` WHERE email = " + database.escape(req.body.email) + " AND `valid` = '1' LIMIT 1", function (err, result, fields) {
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
						database.con.query("UPDATE `users` SET lat = " + database.escape(req.body.lat) + ", lon = " + database.escape(req.body.lon) + " WHERE email = " + database.escape(req.body.email) + ";",
						function (err)
						{
							if (err) throw err;
							result[0].interests = JSON.parse(result[0].interests);
											req.session.user = result[0];
											res.redirect('./');
						});
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
	req.checkBody('email', 'Email Too Long').isLength({max: 100});
	req.checkBody('password', 'Password is Required').notEmpty();
	req.checkBody('password', 'Password Must Be at Least 8 Characters Long and Contain at Least: 1 Special, Capital, Numeric and Lower Case Character').matches(/^(?=.*\d)(?=.*[^a-zA-Z\d])(?=.*[a-z])(?=.*[A-Z]).{8,}$/);
	req.checkBody('confirm', 'Passwords Must Match').equals(req.body.password);
	req.checkBody('first_name', 'First Name is Required').notEmpty();
	req.checkBody('first_name', 'First Name Too Long').isLength({max: 20});
	req.checkBody('last_name', 'Last Name is Required').notEmpty();
	req.checkBody('last_name', 'Last Name Too Long').isLength({max: 20});
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
					sendVerif(req.body, 'verif');
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
			if (result.length == 0)
			{
				res.redirect("./");
			}
			else
			{
				var user = result[0];
				if (!user || !user.valid)
					res.redirect('./');
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
			}
		});
		else res.redirect('./');
}

exports.homePage = function(req, res) {
	if (req.session.user != undefined)
	{
		var dist = ", DIST("+database.escape(req.session.user.lat)+", "+database.escape(req.session.user.lon)+", lat, lon) AS dist";
		var score = ", SCORE("+database.escape(JSON.stringify(req.session.user.interests))+", interests, '30' + fame - ABS("+database.escape(req.session.user.age)+" - age) / ((age - 16) / 4) - DIST("+database.escape(req.session.user.lat)+", "+database.escape(req.session.user.lon)+", lat, lon) / 4) AS score";
		var agediff = ", ABS("+database.escape(req.session.user.age)+" - age) AS diff";
		var prefsearch = ' AND SCORE('+database.escape(JSON.stringify(req.session.user.interests))+', interests, \'30\' + fame - ABS('+database.escape(req.session.user.age)+' - age) / ((age - 16) / 4) - DIST('+database.escape(req.session.user.lat)+', '+database.escape(req.session.user.lon)+', lat, lon) / 4) > 0 AND id <> ' + database.escape(req.session.user.id) + " AND";
		switch (req.session.user.preference)
		{
			case 0:
				prefsearch += " gender = " + database.escape(!req.session.user.gender ? 1 : 0) + " AND preference = " + database.escape(req.session.user.preference);
			break;
			case 1:
				prefsearch += " gender = " + database.escape(req.session.user.gender) + " AND preference = " + database.escape(req.session.user.preference);
			break;
			case 2:
				prefsearch += " (gender = '0' AND (preference = '2' OR preference = " + database.escape(!req.session.user.gender) + ")) OR (gender = '0' AND (preference = '2' OR preference = " + database.escape(req.session.user.gender) + "))";
			break;
		}
	}
	else
		var prefsearch = '', dist = '', agediff = '', score = '';
	var statement = "SELECT id, first_name, last_name, pic1, profilepic, age"+agediff+", fame, bio, gender, preference, interests" + dist + score +
	" FROM `users` WHERE valid = 1" + prefsearch +
	" ORDER BY " + (score ? "score, " : "") + (dist ? "dist, " : "") + "fame DESC LIMIT 5;";
	database.con.query(statement, function (err, result) {
		if (err) throw err;
		database.con.query("SELECT * FROM `interests`;", function (err, interests) {
			if (err) throw err;
			database.con.query("SELECT blockie FROM `blocks` WHERE blocker = " + database.escape(req.session.user ? req.session.user.id : 0) + ";", function (err, blocks) {
				if (err) throw err;
				var users = [];
				result.forEach(function (val) {
					var add = true;
					blocks.forEach(function (block) {
						if (block.blockie == val.id)
							add = false;
					});
					if (add)
						users.push(val);
				});
				if (req.session.user)
					res.render('index', {
						title: 'Home',
						session: req.session,
						users: users,
						interests: interests
					});
				else
					res.render('index', {
						title: 'Home',
						users: result,
						interests: interests
					});
				});
		});
	});
}

exports.chatPage = function(req, res){
	if (!req.session.user)
		res.redirect('./');
	if (req.query.reciever)
	{
		if (req.query.reciever == req.session.user)
		{
			res.redirect('./');
		}
		else
		{
			database.con.query("SELECT id, first_name, last_name, fame FROM `users` WHERE id = " + database.escape(req.query.reciever) + ";", function (err, result) {
				if (err) throw err;
				if (result.length == 0)
				{
					res.redirect("./chat");
				}
				else
				{
					var content = {
						title: 'Chat',
						session: req.session,
						reciever: result[0],
						sender: { id: req.session.user.id, first_name: req.session.user.first_name, last_name: req.session.user.last_name,}};
					database.con.query("SELECT * FROM `chats` WHERE (`user1` = "+database.escape(result[0].id)+" AND `user2` = "+database.escape(req.session.user.id)+") OR (`user2` = "+database.escape(result[0].id)+" AND `user1` = "+database.escape(req.session.user.id)+")", function (err, result) {
						if (err) throw err;
						if (result.length == 0)
						{
							database.con.query("INSERT INTO `chats` (`user1`, `user2`) VALUES ("+database.escape(content.sender.id)+", "+database.escape(content.reciever.id)+")", function(err) {
								if (err) throw err;
								database.con.query("UPDATE `users` SET `fame` = "+database.escape(content.reciever.fame + 1)+" WHERE `users`.`id` = "+database.escape(content.reciever.id)+";", function (err) {
									if (err) throw err;
									res.redirect(req.url);
								});
							});
						}
						else
						{
							content.chat = result[0].id;
							database.con.query("SELECT * FROM `messages` WHERE `chatid` = "+database.escape(content.chat)+" ORDER BY `id`", function(err, result) {
								if (err) throw err;
								content.messages = result;
								res.render('index', content);
							});
						}
					});
				}
			});
		}
	}
	else
	{
		database.con.query("SELECT users.id, users.first_name, users.last_name FROM chats INNER JOIN users ON users.id=chats.user1 WHERE user2 = "+database.escape(req.session.user.id)+";", function (err, result1) {
			if (err) throw err;
			database.con.query("SELECT users.id, users.first_name, users.last_name FROM chats INNER JOIN users ON users.id=chats.user2 WHERE user1 = "+database.escape(req.session.user.id)+";", function (err, result2) {
				if (err) throw err;
				database.con.query("SELECT blockie FROM `blocks` WHERE blocker = " + database.escape(req.session.user ? req.session.user.id : 0) + ";", function (err, blocks) {
					if (err) throw err;
					var result = result1.concat(result2);
					var users = [];
					result.forEach(function (val) {
						var add = true;
						blocks.forEach(function (block) {
							if (block.blockie == val.id)
								add = false;
						});
						if (add)
							users.push(val);
						else 
						{
							val.blocked = true;
							users.push(val);
						}
					});
					var content = {
						title: 'Chat',
						session: req.session,
						chats: users
						};
						res.render('index', content);
					});
			});
		});

	}
}

exports.logout = function(req, res){
	req.session.destroy();
	res.redirect('./');
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
		req.checkBody('email', 'Invalid Email').isEmail();
		req.checkBody('email', 'Email Too Long').isLength({max: 100});
		passerr = req.validationErrors();
		if (!passerr)
			database.con.query("UPDATE `users` SET `email` = " + database.escape(req.body.email) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){if(err) throw err});
	} else if (req.body.first_name && req.body.last_name){
		req.checkBody('first_name', 'First Name is Required').notEmpty();
		req.checkBody('first_name', 'First Name Too Long').isLength({max: 20});
		req.checkBody('last_name', 'Last Name is Required').notEmpty();
		req.checkBody('last_name', 'Last Name Too Long').isLength({max: 20});
		passerr = req.validationErrors();
		if (!passerr)
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
	database.con.query("UPDATE `users` SET `valid` = '1' WHERE verif = " + database.escape(req.query.verif) + ";", function(err){if (err) throw err});
	res.redirect("./");
}

exports.addprofilepicture = function (req, res){
	var FileReader = require('filereader');
	var reader = new FileReader();
	reader.setNodeChunkedEncoding(true);
	req.files.profilepic.mv(('./temp.' + req.files.profilepic.mimetype.split(/\//)[1]), function (err) {
		if (err) throw err
		fs.readFile('./temp.' + req.files.profilepic.mimetype.split(/\//)[1], "base64", function (err, data) {
			if (err) throw err;
			var str = 'data:' + req.files.profilepic.mimetype + ';base64,' + data;
			database.con.query("UPDATE `users` SET `profilepic` = " + database.escape(str) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function (err) { if (err) throw err; fs.unlink('./temp.' + req.files.profilepic.mimetype.split(/\//)[1], function () {res.redirect("./profile?user=" + req.session.user.id);})});
		});
	});
}

exports.addpicture = function (req, res){
	var FileReader = require('filereader');
	var reader = new FileReader();
	var done = 0;
	reader.setNodeChunkedEncoding(true);
	if (req.files.pic1)
	{
		req.files.pic1.mv(('./temp1.' + req.files.pic1.mimetype.split(/\//)[1]), function (err) {
			if (err) throw err
			fs.readFile('./temp1.' + req.files.pic1.mimetype.split(/\//)[1], "base64", function (err, data) {
				if (err) throw err;
				var str = 'data:' + req.files.pic1.mimetype + ';base64,' + data;
				database.con.query("UPDATE `users` SET `pic1` = " + database.escape(str) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function (err) { if (err) throw err; fs.unlink('./temp1.' + req.files.pic1.mimetype.split(/\//)[1], function () {if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}});});
			});
		});
	}
	else if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}
	if (req.files.pic2)
	{
		req.files.pic2.mv(('./temp2.' + req.files.pic2.mimetype.split(/\//)[1]), function (err) {
			if (err) throw err
			fs.readFile('./temp2.' + req.files.pic2.mimetype.split(/\//)[1], "base64", function (err, data) {
				if (err) throw err;
				var str = 'data:' + req.files.pic2.mimetype + ';base64,' + data;
				database.con.query("UPDATE `users` SET `pic2` = " + database.escape(str) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function (err) { if (err) throw err; fs.unlink('./temp2.' + req.files.pic2.mimetype.split(/\//)[1], function () {if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}});});
			});
		});
	}
	else if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}
	if (req.files.pic3)
	{
		req.files.pic3.mv(('./temp3.' + req.files.pic3.mimetype.split(/\//)[1]), function (err) {
			if (err) throw err
			fs.readFile('./temp3.' + req.files.pic3.mimetype.split(/\//)[1], "base64", function (err, data) {
				if (err) throw err;
				var str = 'data:' + req.files.pic3.mimetype + ';base64,' + data;
				database.con.query("UPDATE `users` SET `pic3` = " + database.escape(str) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function (err) { if (err) throw err; fs.unlink('./temp3.' + req.files.pic3.mimetype.split(/\//)[1], function () {if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}});});
			});
		});
	}
	else if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}
	if (req.files.pic4)
	{
		req.files.pic4.mv(('./temp4.' + req.files.pic4.mimetype.split(/\//)[1]), function (err) {
			if (err) throw err
			fs.readFile('./temp4.' + req.files.pic4.mimetype.split(/\//)[1], "base64", function (err, data) {
				if (err) throw err;
				var str = 'data:' + req.files.pic4.mimetype + ';base64,' + data;
				database.con.query("UPDATE `users` SET `pic4` = " + database.escape(str) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function (err) { if (err) throw err; fs.unlink('./temp4.' + req.files.pic4.mimetype.split(/\//)[1], function () {if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}});});
			});
		});
	}
	else if (++done == 4) {res.redirect("./profile?user=" + req.session.user.id);}
}

exports.socket = function(socket) {
	socket.on('sendMsg', function (cont) {
		database.con.query("INSERT INTO `messages` (`reciever`, `message`, `chatid`) VALUES ("+database.escape(cont.reciever)+", "+database.escape(cont.msg)+", "+database.escape(cont.chat)+")");
		app.io.to(cont.chat).emit('getMsg', {msg: cont.msg, reciever: cont.reciever});
	});

	socket.on('init', function (chat) {
		socket.join(chat);
	});

	socket.on('disconnect', function(){
	});
}

exports.block = function(req, res) {
	database.con.query("SELECT * FROM `blocks` WHERE blocker = " + database.escape(req.query.blocker) + " AND blockie = " + database.escape(req.query.blockie) + ";", function (err, result) {
		if (err) throw err;
		if (result.length == 0)
		{
			database.con.query("INSERT INTO `blocks` (`blocker`, `blockie`) VALUES(" + database.escape(req.query.blocker) + ", " + database.escape(req.query.blockie) + ");", function (err, result) {
				if (err) throw err;
			});
			res.send("done!");
		}
		else
			res.send("Already exsists");
	});
}