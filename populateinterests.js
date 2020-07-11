var database = require('./database.js');
const fs = require('fs')
var lineReader;
var catagory = 0;
var newcat = true;
var lines = [];
var catagoies = [];

exports.ready = function ready() {
	data = JSON.parse(fs.readFileSync('kk.json'))
	
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
	// lineReader.on('close', function () {
	// 	console.log(data)
	// 	var i = 0;
	// 	catagoies.forEach(cat => {
	// 			database.con.query("INSERT IGNORE INTO `catagories` (`name`) VALUES ('" + cat + "');", function(err){
	// 				if (err) throw err;
	// 				console.log('MAKING: ', i++, ': ', cat);
	// 				lines.forEach(lin => {
	// 					if (lin.catagory == cat)
	// 						database.con.query("SELECT * FROM `catagories` WHERE name = '" + cat + "' LIMIT 1;", function(err, result){
	// 							if (err) throw err;
	// 							database.con.query("INSERT IGNORE INTO `interests` (`catagory`, `name`) VALUES ('" + result[0].id + "', '" + lin.interest + "');", function(err){
	// 									if (err) throw err;
	// 							});
	// 						});
	// 				});
	// 			});
	// 	});
	// });
}