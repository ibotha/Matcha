var database = require('./database.js');
const fs = require('fs')
var lineReader;
var catagory = 0;
var newcat = true;
var lines = [];
var catagoies = [];

exports.populateInterests = function ready() {
	data = JSON.parse(fs.readFileSync('kk.json'));
	
	for (const [key, value] of Object.entries(data)) {
		database.con.query("INSERT IGNORE INTO `catagories` (`name`) VALUES ('" + key + "');", function(err, result){
			if (err) throw err;
			var query = "INSERT IGNORE INTO `interests` (`catagory`, `name`) VALUES ";
			value.forEach(interest => {
				query += "('" + result.insertId + "', '" + interest + "'), ";
			});
			query = query.substr(0, query.length - 2) + ";";
			console.log(query);
			database.con.query(query, function(err){
				if (err) throw err;
			});
		});
		console.log(key);
	}
}

exports.populateUsers = () => {
	data = JSON.parse(fs.readFileSync('usergen.json'));

	for (var i = 0; i < 50; i++)
	{
		var first_name = data.first_names[Math.floor(Math.random() * data.first_names.length)];
		var last_name = data.last_names[Math.floor(Math.random() * data.last_names.length)];
		var year = 1950 + Math.floor(Math.random() * 50);
		var month = Math.ceil(Math.random() * 12);
		var day = Math.ceil(Math.random() * 28);
		var lon = 27 + Math.random() * 2;
		var lat = -29 + Math.random() * 2;
		database.con.query({sql: "INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `password`, `verif`, `preference`, `gender`, `bio`, `fame`, `valid`, `birthdate`, `lat`, `lon`, `profilepic`, `pic1`, `pic2`, `pic3`, `pic4`) VALUES (NULL, ?, ?, ?, '1db3d28f06effa3f9552d2d02aabd7a2061a437d46476e767ca54dbc88b1f89b', '1db3d28f06effa3f9552d2d02aabd7a2061a437d46476e767ca54dbc88b1f89b', ?, ?, 'Info about me', '0', '1', ?, ?, ?, ?, NULL, NULL, NULL, NULL)"},
		[first_name, last_name, `${first_name}@${last_name}.com`, Math.round(Math.random()), Math.round(Math.random()), `${year}-${month}-${day}`, lat, lon, `./pp${Math.ceil(Math.random() * 7)}.png`], (err, result) => {
			if (err) return
			database.con.query({sql:("INSERT INTO `userinterests` (`user`, `interest`) VALUES " + "(?,?), ".repeat(5)).slice(0, -2) + ";"}, [
				result.insertId, Math.ceil(Math.random() * 200),
				result.insertId, Math.ceil(Math.random() * 200),
				result.insertId, Math.ceil(Math.random() * 200),
				result.insertId, Math.ceil(Math.random() * 200),
				result.insertId, Math.ceil(Math.random() * 200)
			], (err) => {
				if (err) throw err;
			})
		})
	}
}