var database = require('./database.js');
var lineReader;
var catagory = 0;
var newcat = true;
var lines = [];
var catagoies = [];

exports.ready = function ready() {
	lineReader = require('readline').createInterface({
		input: require('fs').createReadStream('./kk')
	});
	
	lineReader.on('line', function (line) {
		if (newcat == true)
			{
				newcat = false;
				catagory = line;
				catagoies.push(line);
			}
			else
			{
				if (line == "") {
					newcat = true;
				}
				else
				{
					lines.push({catagory: catagory, interest: line.split(/[\[\(]/)[0].trim()});
				}
			}
	});
	
	lineReader.on('close', function () {
		var i = 0;
		catagoies.forEach(cat => {
				database.con.query("INSERT IGNORE INTO `catagories` (`name`) VALUES ('" + cat + "');", function(err){
					if (err) throw err;
					console.log('MAKING: ', i++, ': ', cat);
					lines.forEach(lin => {
						if (lin.catagory == cat)
							database.con.query("SELECT * FROM `catagories` WHERE name = '" + cat + "' LIMIT 1;", function(err, result){
								if (err) throw err;
								database.con.query("INSERT IGNORE INTO `interests` (`catagory`, `name`) VALUES ('" + result[0].id + "', '" + lin.interest + "');", function(err){
										if (err) throw err;
										console.log(lin);
								});
							});
					});
				});
		});
	});
}