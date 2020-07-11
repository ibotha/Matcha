const database = require('./database.js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const nope = require('./nope.js');
const app = require('./app.js');
const glob = require('glob');

Number.prototype.toFixedDown = function(digits) {
	var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
		m = this.toString().match(re);
	return m ? parseFloat(m[1]) : this.valueOf();
};

var transporter = nodemailer.createTransport(
	{
		host: "smtp.gmail.com",
		port: 587,
		secure: false,
		auth: nope.auth,
		debug: false
	},{
		from: 'Matcha <ibothawebadmi@gmail.com>',
		headers: {
		}
	}
);

var onlineusers = [];

function blockCompare(a, b){return(b.blocker != null)}

function sortblocks(nu1, nu2)
{
	nu1.sort(blockCompare);
	nu2.sort(blockCompare);
	var ret = [];
	var current = 0;
	var index1 = 0;
	var index2 = 0;
	while (current < (nu1.length + nu2.length)) {
		if ((index2 >= nu2.length) || (index1 < nu1.length && nu1[index1].blocker != null)) {
			ret[current] = nu1[index1];
			index1++;

		} else {
			ret[current] = nu2[index2];
			index2++;
		}
  
		current++;
	}
	ret.reverse();
	return ret;
}

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
			console.log('Mail Error occurred');
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
	'Bi-Sexual': 2,
	0: 'Heterosexual',
	1: 'Homosexual',
	2: 'Bi-Sexual',
}

function change(str)
{
	const hash = crypto.createHash('sha256');

	hash.update(str);
	var ret = hash.digest('hex');
	hash.end();
	return ret;
}

function calculateAge(birthday) {
	var day = new Date(birthday);
	var ageDifMs = Date.now() - day.getTime();
	var ageDate = new Date(ageDifMs);
	return Math.abs(ageDate.getUTCFullYear() - 1970);
}

exports.loginForm = function (req, res) {
	req.session.errors = [];
	req.body.email = req.body.email.toLowerCase();
	if (!req.body.email.match(/^.*@.*\..*$/gm)) req.session.errors.push('Not Valid Email Format');
	if (req.body.lon.length==0 || req.body.lat.length==0) req.session.errors.push('locerr');

	if (req.body.forgot == 'true')
	{
		database.con.query("SELECT * FROM `users` WHERE email = " + database.escape(req.body.email) + " LIMIT 1", function (err, result, fields) {
			if (err) throw err;
			if (result[0])
			{
				sendVerif(result[0], 'forgot');
			}
			else req.session.errors.push("Not an exsisting email");

			res.render('index', {
				title: 'Login',
				errors: req.session.errors,
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
			else req.session.errors.push("Not an exsisting email or already validated");
			res.render('index', {
				title: 'Login',
				errors: req.session.errors,
				current: {
					email: req.body.email
				}
			});
		});
	}
	else
	{
		if (req.body.password.length == 0) req.session.errors.push("Password is Required");

		if (req.session.errors.length > 0) {
			res.render('index', {
				title: 'Login',
				errors: req.session.errors,
				current: {
					email: req.body.email
				}
			});
		} else {
			database.con.query("SELECT bio, profilepic, id, email, password, first_name, last_name, lat, lon, CONCAT('[', GROUP_CONCAT( `userinterests`.`interest` SEPARATOR ', ' ), ']') AS interests, preference, gender, fame, valid, birthdate FROM `users` LEFT JOIN `userinterests` ON `users`.`id`=`userinterests`.`user` WHERE email = " + database.escape(req.body.email) + " AND `valid` = '1' GROUP BY `users`.`id` LIMIT 1", function (err, result, fields) {
				if (err) throw err;
				if (!result.length)
				{
					req.session.errors.push('Invalid Login');
					res.render('index', {
						title: 'Login',
						errors: req.session.errors,
						current: {
							email: req.body.email
						}
					});
				} else {
					if (change(req.body.password) == result[0].password)
					{
						if (req.body.lat == undefined)
							req.body.lat = '0.00';
						if (req.body.lon == undefined)
							req.body.lon = '0.00';
						database.con.query("UPDATE `users` SET lat = " + database.escape(req.body.lat.substring(0, 10)) + ", lon = " + database.escape(req.body.lon.substring(0, 10)) + " WHERE email = " + database.escape(req.body.email) + ";",
						function (err)
						{
							if (err) throw err;
							result[0].age = calculateAge(result[0].birthdate)
							req.session.user = result[0];
							res.redirect('./');
						});
					} else {
						req.session.errors.push('Invalid Login');
						res.render('index', {
							title: 'Login',
							errors: req.session.errors,
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
	req.body.email = req.body.email.toLowerCase();
	req.session.errors = [];
	if (!req.body.email.match(/^.*@.*\..*$/gm)) req.session.errors.push('Not Valid Email Format');
	if (req.body.email.length==0) req.session.errors.push('Email is required');
	if (req.body.email.length>100) req.session.errors.push('Email too long');
	if (!req.body.password.match(/^(?=.*\d)(?=.*[^a-zA-Z\d])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)) req.session.errors.push('Password Must Be at Least 8 Characters Long and Contain at Least: 1 Special, Capital, Numeric and Lower Case Character');
	if (req.body.password.length==0) req.session.errors.push('Password is required');
	if (req.body.confirm != req.body.password) req.session.errors.push('Passwords Don\'t match');
	if (req.body.first_name.length==0) req.session.errors.push('First Name is required');
	if (req.body.first_name.length > 30) req.session.errors.push('First Name is too long');
	if (req.body.last_name.length==0) req.session.errors.push('Last Name is required');
	if (req.body.last_name.length > 30) req.session.errors.push('Last Name is too long');
	if (req.body.age.length==0) req.session.errors.push('Birthdate is Required');
	if (!req.body.age.match(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/)) req.session.errors.push('Invalid Birthdate');
	if (prefset[req.body.preference] == undefined) req.session.errors.push('Invalid Preference');
	if (genset[req.body.gender] == undefined) req.session.errors.push('Invalid Gender');
	var birthdate = calculateAge(req.body.age);
	if (birthdate < 18) req.session.errors.push('You are too young');
 	var errors = req.session.errors;
	var current = {
		email: req.body.email ? req.body.email : "",
		first_name: req.body.first_name ? req.body.first_name : "",
		last_name: req.body.last_name ? req.body.last_name : "",
		age: req.body.age ? req.body.age : "",
		gender: req.body.gender ? req.body.gender : "",
		preference: req.body.preference ? req.body.preference : ""
	};
	if (errors.length > 0) {
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
				database.con.query("INSERT INTO `users` (`first_name`, `last_name`, `birthdate`, `email`, `password`, `verif`, `preference`, `gender`) VALUES ("+
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
				errors.push('Email already taken');
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
	var errors = req.session.errors;
	req.session.errors = [];
	if (req.query.user)
		database.con.query({sql: "SELECT `users`.*, CONCAT('[', GROUP_CONCAT( `userinterests`.`interest` SEPARATOR ', ' ), ']') AS interests FROM `users` LEFT JOIN `userinterests` ON `users`.`id`=`userinterests`.`user` WHERE id = ? GROUP BY `users`.`id` LIMIT 1"}, [req.query.user], function (err, result, fields) {
			if (err) throw err;
			if (result.length == 0)
			{
				res.redirect("./");
			}
			else
			{
				if (req.session.user && req.session.user.id != req.query.user)
					database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(req.query.user)+", "+database.escape(req.session.user.first_name + " Visited Your Profile")+")");
				var user = result[0];
				user.age = calculateAge(user.birthdate);
				if (!user || !user.valid)
					res.redirect('./');
				if (user)
				{
					user.interests = user.interests != null ? JSON.parse(user.interests) : [];
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
									user.interestnames = intlist;
									if (req.session.user)
										res.render('index', {
											title: 'Profile',
											session: req.session,
											user: user,
											cats: cats,
											errors: errors
										});
									else
										res.render('index', {
											title: 'Profile',
											user: user,
											errors: errors
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
									user.interestnames = intlist;
									if (req.session.user)
										res.render('index', {
											title: 'Profile',
											session: req.session,
											user: user,
											cats: cats,
											errors: errors
										});
									else
										res.render('index', {
											title: 'Profile',
											user: user,
											errors: errors
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
	if (req.session.user && (!req.session.user.bio || !req.session.user.profilepic || !req.session.user.interests.length))
	{
		console.log(req.session.user);
		res.redirect('./profile?user=' + req.session.user.id);
		return;
	}
	if (req.session.user != undefined)
	{
		var dist = ", DIST("+database.escape(req.session.user.lat)+", "+database.escape(req.session.user.lon)+", lat, lon) AS dist";
		var score = ", SCORE("+database.escape(JSON.stringify(req.session.user.id))+", `users`.`id`" +
		", '50' + fame - DIST("+database.escape(req.session.user.lat)+", "+database.escape(req.session.user.lon)+", lat, lon) / 4) AS score"
		var prefsearch = ' AND id <> ' + database.escape(req.session.user.id) + " AND";
		switch (req.session.user.preference)
		{
			case 0:
				prefsearch += " gender = " + database.escape(!req.session.user.gender ? 1 : 0) + " AND (preference = " + database.escape(req.session.user.preference) + " OR preference = 2)";
			break;
			case 1:
				prefsearch += " gender = " + database.escape(req.session.user.gender) + " AND (preference = " + database.escape(req.session.user.preference) + " OR preference = 2)";
			break;
			case 2:
				prefsearch += " (gender = '0' AND (preference = '2' OR preference = " + database.escape(!req.session.user.gender ? 1 : 0) + ")) OR (gender = '1' AND (preference = '2' OR preference = " + database.escape(req.session.user.gender) + "))";
			break;
		}
	}
	else
		var prefsearch = '', dist = '', score = '';
	var statement = "SELECT id, first_name, last_name, pic1, profilepic, birthdate, fame, bio, gender, preference, CONCAT('[', GROUP_CONCAT( `userinterests`.`interest` SEPARATOR ', ' ), ']') AS interests" + dist + score +
	", b1.blocker, b1.blockie, b2.blocker, b2.blockie FROM `users` LEFT JOIN `userinterests` ON `userinterests`.`user`=`users`.`id` LEFT JOIN blocks b1 ON (b1.blockie=" + (req.session.user?database.escape(req.session.user.id):"0") + " AND b1.blocker=users.id) LEFT JOIN blocks b2 ON (b2.blocker=" + (req.session.user?database.escape(req.session.user.id):"0") + " AND b2.blockie=users.id) WHERE valid = 1 AND b1.blockie IS NULL AND b2.blockie IS NULL " + prefsearch +
	" GROUP BY `users`.`id` ORDER BY " + (score ? "score DESC," : "") + (dist ? "dist, " : "") + "fame DESC;";
	database.con.query(statement, function (err, result) {
		if (err) throw err;
		database.con.query("SELECT * FROM `interests`;", function (err, interests) {
			if (result.length == 0) {
				if (req.session.user)
					res.render('index', {
						title: 'Home',
						session: req.session,
						users: [],
						interests: interests
					});
				else
					res.render('index', {
						title: 'Home',
						users: [],
						interests: interests
					});
				return
			}
			if (err) throw err;
			var done = 0;
			result.forEach(user => {
				user.age = calculateAge(user.birthdate);
				if (req.session.user)
				{
					var agegap = Math.abs(user.age - req.session.user.age);
					var scorechange = agegap / ((Math.min(req.session.user.age, user.age) - 16) / 4);
					user.score -= scorechange;
				}
				done++;
				if (done == result.length)
				{
					result.sort((a, b) => {return (b.score - a.score)});
					if (req.session.user)
						res.render('index', {
							title: 'Home',
							session: req.session,
							users: result,
							interests: interests
						});
					else
						res.render('index', {
							title: 'Home',
							users: result,
							interests: interests
						});
				}
			});
		});
	});
}

exports.chatPage = function(req, res){
	if (req.session.user == undefined)
	{
		res.redirect('./');
	}
	else
	{
		if (req.query.reciever)
		{
			if (req.query.reciever == req.session.user.id)
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
										if (req.session.user)
											database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(content.reciever.id)+", "+database.escape(req.session.user.first_name + " Wants to chat")+")")
										res.redirect('./chat?reciever=' + req.query.reciever);
									});
								});
							}
							else
							{
								content.chat = result[0];
								database.con.query("SELECT * FROM `messages` WHERE `chatid` = "+database.escape(content.chat.id)+" ORDER BY `id`", function(err, result) {
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
			database.con.query("SELECT active, blocker, blockie, users.id, users.first_name, users.last_name, chats.user2, chats.id AS chat_id FROM chats INNER JOIN users ON users.id=chats.user1 LEFT JOIN `blocks` ON blocks.blocker="+database.escape(req.session.user.id)+" AND blocks.blockie = users.id WHERE user2 = "+database.escape(req.session.user.id)+";", function (err, result1) {
				if (err) throw err;
				database.con.query("SELECT active, blocker, blockie, users.id, users.first_name, users.last_name, chats.user2, chats.id AS chat_id FROM chats INNER JOIN users ON users.id=chats.user2 LEFT JOIN `blocks` ON blocks.blocker="+database.escape(req.session.user.id)+" AND blocks.blockie = users.id WHERE user1 = "+database.escape(req.session.user.id)+";", function (err, result2) {
					if (err) throw err;
					var result = sortblocks(result1, result2);
					var content = {
						title: 'Chat',
						session: req.session,
						chats: result,
						};
						res.render('index', content);
				});
			});

		}
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
		req.session.user.bio = req.body.bio;
		res.redirect('/profile?user=' + req.session.user.id);
	});
}

exports.addinterest = function (req, res){
	if (req.session.user)
	{
		database.con.query({sql: "SELECT * FROM `users` WHERE id = ? LIMIT 1;"},[req.session.user.id], function(err, result) {
			if (err) throw err;
			var user = result[0];
			database.con.query({sql: "INSERT IGNORE INTO `userinterests` (`user`, `interest`) VALUES (?, ?);"},[req.session.user.id, req.query.interest], function (err) {
				if (err) throw err;
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
		database.con.query({sql: "SELECT * FROM `users` WHERE id = ? LIMIT 1;"},[req.session.user.id], function(err, result) {
			if (err) throw err;
			var user = result[0];
			database.con.query({sql: "DELETE FROM `userinterests` WHERE `user`=? AND `interest`=?;"},[req.session.user.id, req.query.interest], function (err) {
				if (err) throw err;
				res.redirect('./profile?user=' + req.session.user.id);
			});
		});
	}
	else
		res.redirect('./');
}

exports.change = function (req, res){
	req.session.errors = [];
	if (req.body.email){
		if (!req.body.email.match(/^.*@.*\..*$/gm)) req.session.errors.push('Not Valid Email Format');
		if (req.body.email.length==0) req.session.errors.push('Email is required');
		if (req.body.email.length>100) req.session.errors.push('Email too long');
		if (req.session.errors.length == 0)
		{
			database.con.query("UPDATE `users` SET `email` = " + database.escape(req.body.email) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){
				if(err) throw err
				req.session.user.email = req.body.email;
				res.redirect('./profile?user=' + req.session.user.id);
			});
		} else
		res.redirect('./profile?user=' + req.session.user.id);
	} else if (req.body.first_name && req.body.last_name){
		if (req.body.first_name.length==0) req.session.errors.push('First Name is required');
		if (req.body.first_name.length > 30) req.session.errors.push('First Name is too long');
		if (req.body.last_name.length==0) req.session.errors.push('Last Name is required');
		if (req.body.last_name.length > 30) req.session.errors.push('Last Name is too long');
		if (req.session.errors.length == 0)
			database.con.query("UPDATE `users` SET `first_name` = " + database.escape(req.body.first_name) + ", `last_name` = " + database.escape(req.body.last_name) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err) {
				if(err) throw err
				req.session.user.first_name = req.body.first_name;
				req.session.user.last_name = req.body.last_name;
				res.redirect('./profile?user=' + req.session.user.id);
			});
		else
			res.redirect('./profile?user=' + req.session.user.id);
	} else if (req.body.confirm && req.body.old_password && req.body.new_password){
		if (!req.body.new_password.match(/^(?=.*\d)(?=.*[^a-zA-Z\d])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)) req.session.errors.push('Password Must Be at Least 8 Characters Long and Contain at Least: 1 Special, Capital, Numeric and Lower Case Character');
		if (req.body.new_password.length==0) req.session.errors.push('Password is required');
		if (req.body.confirm != req.body.password) req.session.errors.push('Passwords Don\'t match');
		if (req.session.errors.length == 0)
		{
			database.con.query("SELECT * FROM `users` WHERE id = " + database.escape(req.session.user.id) + " LIMIT 1", function (err, result, fields) {
				if (err) throw err;
				if (change(req.body.old_password) == result[0].password)
					database.con.query("UPDATE `users` SET `password` = " + database.escape(change(req.body.new_password)) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){if(err) throw err});
				else
					req.session.errors.push("Password incorrect");
				res.redirect('./profile?user=' + req.session.user.id);
			});
		}
		else
			res.redirect('./profile?user=' + req.session.user.id);
	} else if (req.body.gender){
		database.con.query("UPDATE `users` SET `gender` = " + database.escape(genset[req.body.gender]) + ", `preference` = " + database.escape(prefset[req.body.preference]) + " WHERE `id` = " + database.escape(req.session.user.id) + ";", function(err){
			if(err) throw err
			req.session.user.gender = genset[req.body.gender];
			req.session.user.preference = prefset[req.body.preference];
			res.redirect('./profile?user=' + req.session.user.id);
		});
	} else
	res.redirect('./profile?user=' + req.session.user.id);
}

exports.verify = function (req, res){
	database.con.query("UPDATE `users` SET `valid` = '1' WHERE verif = " + database.escape(req.query.verif) + ";", function(err){if (err) throw err});
	res.redirect("./login");
}

exports.addprofilepicture = function (req, res){
	var FileReader = require('filereader');
	var reader = new FileReader();
	reader.setNodeChunkedEncoding(true);
	if (!fs.existsSync('public/images')){
		fs.mkdirSync('public/images');
	}
	if (!fs.existsSync('public/images/user' + req.session.user.id)){
		fs.mkdirSync('public/images/user' + req.session.user.id);
	}
	glob('public/images/user' + req.session.user.id + '/pp.*', function (err, files) {
		files.forEach(file => {
			fs.unlinkSync(file);
		});
		req.files.profilepic.mv(('./public/images/user' + req.session.user.id + "/pp." + req.files.profilepic.mimetype.split(/\//)[1]), function (err) {
			if (err) throw err;
			database.con.query("UPDATE `users` SET profilepic=" + database.escape('./images/user' + req.session.user.id + "/pp." + req.files.profilepic.mimetype.split(/\//)[1]) + " WHERE id = " + req.session.user.id + ";", function (err) {
				if (err) throw err;
				req.session.user.profilepic = './images/user' + req.session.user.id + "/pp." + req.files.profilepic.mimetype.split(/\//)[1];
				res.redirect('./profile?user=' + req.session.user.id);
			});
		});
	});
}

exports.addpicture = function (req, res){
	var FileReader = require('filereader');
	var reader = new FileReader();
	reader.setNodeChunkedEncoding(true);
	if (!fs.existsSync('public/images')){
		fs.mkdirSync('public/images');
	}
	if (!fs.existsSync('public/images/user' + req.session.user.id)){
		fs.mkdirSync('public/images/user' + req.session.user.id);
	}
	if (req.files.pic1) {
		glob('public/images/user' + req.session.user.id + '/p1.*', function (err, files) {
			files.forEach(file => {
				fs.unlinkSync(file);
			});
			req.files.pic1.mv(('./public/images/user' + req.session.user.id + "/p1." + req.files.pic1.mimetype.split(/\//)[1]), function (err) {
				if (err) throw err;
				database.con.query("UPDATE `users` SET pic1=" + database.escape('./images/user' + req.session.user.id + "/p1." + req.files.pic1.mimetype.split(/\//)[1]) + " WHERE id = " + req.session.user.id + ";", function (err) {
					if (err) throw err;
					res.redirect('./profile?user=' + req.session.user.id);
				});
			});
		});
	}
	else

	if (req.files.pic2) {
		glob('public/images/user' + req.session.user.id + '/p2.*', function (err, files) {
			files.forEach(file => {
				fs.unlinkSync(file);
			});
			req.files.pic2.mv(('./public/images/user' + req.session.user.id + "/p2." + req.files.pic2.mimetype.split(/\//)[1]), function (err) {
				if (err) throw err;
				database.con.query("UPDATE `users` SET pic2=" + database.escape('./images/user' + req.session.user.id + "/p2." + req.files.pic2.mimetype.split(/\//)[1]) + " WHERE id = " + req.session.user.id + ";", function (err) {
					if (err) throw err;
					res.redirect('./profile?user=' + req.session.user.id);
				});
			});
		});
	}
	else

	if (req.files.pic3) {
		glob('public/images/user' + req.session.user.id + '/p3.*', function (err, files) {
			files.forEach(file => {
				fs.unlinkSync(file);
			});
			req.files.pic3.mv(('./public/images/user' + req.session.user.id + "/p3." + req.files.pic3.mimetype.split(/\//)[1]), function (err) {
				if (err) throw err;
				database.con.query("UPDATE `users` SET pic3=" + database.escape('./images/user' + req.session.user.id + "/p3." + req.files.pic3.mimetype.split(/\//)[1]) + " WHERE id = " + req.session.user.id + ";", function (err) {
					if (err) throw err;
					res.redirect('./profile?user=' + req.session.user.id);
				});
			});
		});
	}
	else
	if (req.files.pic4) {
		glob('public/images/user' + req.session.user.id + '/p4.*', function (err, files) {
			files.forEach(file => {
				fs.unlinkSync(file);
			});
			req.files.pic4.mv(('./public/images/user' + req.session.user.id + "/p4." + req.files.pic4.mimetype.split(/\//)[1]), function (err) {
				if (err) throw err;
				database.con.query("UPDATE `users` SET pic4=" + database.escape('./images/user' + req.session.user.id + "/p4." + req.files.pic4.mimetype.split(/\//)[1]) + " WHERE id = " + req.session.user.id + ";", function (err) {
					if (err) throw err;
					res.redirect('./profile?user=' + req.session.user.id);
				});
			});
		});
	}
}

exports.socket = function(socket) {
	socket.on('sendMsg', function (cont) {
		database.con.query("SELECT * FROM `blocks` WHERE (`blocker` = "+database.escape(cont.reciever)+" AND `blockie` = "+database.escape(cont.sender)+") OR (`blockie` = "+database.escape(cont.reciever)+" AND `blocker` = "+database.escape(cont.sender)+")", (err, result) => {
			if (!err && result.length < 1)
			{
				database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(cont.reciever)+", "+database.escape("You have a message from " + cont.name)+")", (err, result) => {
					if (err) throw err;
				});
				database.con.query("INSERT INTO `messages` (`reciever`, `message`, `chatid`) VALUES ("+database.escape(cont.reciever)+", "+database.escape(cont.msg.substring(0, 499))+", "+database.escape(cont.chat)+")", (err, result) => {
					if (err) throw err;
				});
				app.io.to(cont.chat).emit('getMsg', {msg: cont.msg, reciever: cont.reciever});
			}
		});
	});

	socket.on('init', function (chat) {
		socket.join(chat);
	});

	socket.on('disconnect', function () {
		if (onlineusers.findIndex(function (a) {return (a.socket == socket.id)}) > -1)
		{
			onlineusers.splice(onlineusers.findIndex(function (a) {return (a.socket == socket.id)}), 1);
		}
	});

	socket.on("con", function(id) {
		onlineusers.push({socket: socket.id, id: id});
	});
}

exports.block = function(req, res) {
	database.con.query("SELECT * FROM `blocks` WHERE blocker = " + database.escape(req.query.blocker) + " AND blockie = " + database.escape(req.query.blockie) + ";", function (err, result) {
		if (err) throw err;
		if (result.length == 0)
		{
			database.con.query("INSERT INTO `blocks` (`blocker`, `blockie`) VALUES(" + database.escape(req.query.blocker) + ", " + database.escape(req.query.blockie) + ");", function (err, result) {
				if (req.session.user)
					database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(req.query.blockie)+", "+database.escape(req.session.user.first_name + " Blocked You") +")");
				if (err) throw err;
			});
			res.send("done!");
		}
		else
			res.send("Already exsists");
	});
}

exports.unblock = function(req, res) {
	database.con.query("DELETE FROM `blocks` WHERE blocker = " + database.escape(req.query.blocker) + " AND blockie = " + database.escape(req.query.blockie) + ";", function (err, result) {
		if (req.session.user)
			database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(req.query.blockie)+", "+database.escape(req.session.user.first_name + " Unblocked You") +")");
		if (err) throw err;
		res.send("done!");
	});
}

exports.getOnline = function(req, res) {
	if (req.session.user)
	{
		database.con.query("SELECT chats.active, user1, user2, blocker, blockie, chats.id FROM `chats` LEFT JOIN `blocks` ON (blocks.blocker=" + database.escape(req.session.user.id) + " AND blocks.blockie=user1) OR (blocks.blocker=user1 AND blocks.blockie=" + database.escape(req.session.user.id) + ") OR (blocks.blocker=user2 AND blocks.blockie=" + database.escape(req.session.user.id) + ") OR (blocks.blocker=user2 AND blocks.blockie=" + database.escape(req.session.user.id) + ") WHERE chats.active=1 AND blocker IS NULL;", function (err, result) {
		if (err) throw err;
			var finished = [];
			onlineusers.forEach(function(user){
				result.forEach(function (chat){
					if (chat.user1 == req.session.user.id && chat.user2 == user.id)
					{
						finished.push(chat.user2);
					}
					else if (chat.user2 == req.session.user.id && chat.user1 == user.id)
					{
						finished.push(chat.user1);
					}
				});
			});
			res.end(JSON.stringify(finished));
		});
	}
	else res.end('[]');
}

exports.deleteNotification = function(req, res) {
	database.con.query("DELETE FROM `notifications` WHERE id = " + database.escape(req.query.id));
	res.send("");
}

exports.getNotifications = function(req, res) {
	if (req.session.user)
	{
		database.con.query("SELECT * FROM `notifications` WHERE user ="+database.escape(req.body.user)+";", function (err, result) {
		if (err) throw err;
			res.end(JSON.stringify(result));
		});
	}
	else res.end('[]');
}

exports.activateChat = function(req, res) {
	database.con.query("SELECT * FROM `chats` WHERE id = " + database.escape(req.query.chat) + ";", (err, result) => {
		if (err) throw err;
		if (result.length == 0 || !req.session.user)
			res.redirect('./');
		else
		{
			if (req.session.user.id == result[0].user2)
			{
				if (req.session.user)
					database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(result[0].user1)+", "+database.escape(req.session.user.first_name + " Confirmed Your chat")+")")
				database.con.query("UPDATE `chats` SET `active` = '1' WHERE `chats`.`id` = "+database.escape(req.query.chat)+";", (err) => {if (err) throw err; res.redirect('./chat?reciever=' + result[0].user1)})
			}
			else
				res.redirect('./chat?reciever=' + result[0].user1);
		}
	});
}

exports.report = function(req, res) {
	if (req.session.user)
	{
		res.render('report', {reporter: req.session.user.id, reciever: {first_name: req.query.name, id: req.query.id}, session: req.session});
	}
	else
	{
		res.redirect("./");
	}
}

exports.reportForm = function(req, res) {
	if (req.body.reason && req.body.reciever && req.body.reporter)
	{
		database.con.query("INSERT INTO `reports` (`reporter`, `reciever`, `message`) VALUES ("+database.escape(req.body.reporter)+", "+database.escape(req.body.reciever)+", "+database.escape(req.body.reason)+")", function (err)
		{
			if (err) throw err;
			database.con.query("INSERT INTO `notifications` (`user`, `message`) VALUES ("+database.escape(req.body.reciever)+", "+database.escape(req.session.user.first_name + " Reported You")+")")
			res.redirect("./");
		});
	}
	else
	{
		res.redirect('report?name=' + escape(req.body.name) + '&id=' + escape(req.body.reciever));
	}
}