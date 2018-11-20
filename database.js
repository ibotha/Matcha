const mysql = require('mysql');

var con;

var tables = {
	user: "CREATE TABLE IF NOT EXISTS `matcha`.`users` ("+
	"id int UNIQUE NOT NULL AUTO_INCREMENT,"+
	"first_name varchar(100) NOT NULL,"+
	"last_name varchar(100) NOT NULL,"+
	"email varchar(100) UNIQUE NOT NULL,"+
	"password varchar(1000) NOT NULL,"+
	"verif varchar(1000) NOT NULL,"+
	"interests varchar(2000) NOT NULL DEFAULT '[]',"+
	"preference TINYINT NOT NULL,"+
	"gender TINYINT NOT NULL,"+
	"bio varchar(2000),"+
	"fame int NOT NULL DEFAULT 0,"+
	"valid int NOT NULL DEFAULT 0,"+
	"age int NOT NULL,"+
	"lat double,"+
	"lon double,"+
	"profilepic blob(4294967295),"+
	"pic1 blob(4294967295),"+
	"pic2 blob(4294967295),"+
	"pic3 blob(4294967295),"+
	"pic4 blob(4294967295),"+
	"PRIMARY KEY (id)"+
	")",
	interests: "CREATE TABLE IF NOT EXISTS `matcha`.`interests` ("+
	"id int UNIQUE NOT NULL AUTO_INCREMENT,"+
	"name varchar(100) UNIQUE NOT NULL,"+
	"catagory int NOT NULL,"+
	"PRIMARY KEY (id)"+
	")",
	catagories: "CREATE TABLE IF NOT EXISTS `matcha`.`catagories` ("+
	"id int UNIQUE NOT NULL AUTO_INCREMENT,"+
	"name varchar(100) UNIQUE NOT NULL,"+
	"PRIMARY KEY (id)"+
	")",
	distfunc:
	'CREATE FUNCTION DIST(lat1 DOUBLE, lon1 DOUBLE, lat2 DOUBLE, lon2 DOUBLE) RETURNS DOUBLE ' +
	'DETERMINISTIC ' +
	'BEGIN ' +
	'DECLARE valr double;' +
	'DECLARE dlat double;' +
	'DECLARE dlon double;' +
	'DECLARE a double;' +
	'DECLARE c double;' +
	'DECLARE d double;' +
	'SET valr = 6371.0;' +
	'SET dlat = RADIANS(lat2 - lat1);' +
	'SET dlon = RADIANS(lon2 - lon1);' +
	'SET a = SIN(dlat / 2.0) * SIN(dlat / 2.0) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon / 2.0) * SIN(dlon / 2.0);' +
	'SET c = (2.0 * ATAN2(SQRT(a), SQRT(1.0 - a)));' +
	'SET d = valr * c;' +
	'RETURN d;' +
	'END'
};


//var pp = require('./populateinterests.js');

function createTables(err) {
	if (err) throw err;
	con.query("USE `matcha`");
	console.log("Database created");
	con.query(tables.user, function (err) {
		if (err) throw err;
		console.log("user table created");
	});
	con.query(tables.interests, function (err) {
		if (err) throw err;
		console.log("interests table created");
	});
	con.query(tables.catagories, function (err) {
		if (err) throw err;
		console.log("catagories table created");
	});
	con.query("DROP FUNCTION DIST;", function (err) {
		if (err) throw err;
		con.query(tables.distfunc, function (err) {
			if (err) throw err;
			console.log("distfunc created");
		});
	});

	//pp.ready();
}

function createDatabase(err) {
	if (err) throw err;
	console.log("Connected!");
	con.query("CREATE DATABASE IF NOT EXISTS matcha", createTables);
}

con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "passwd"
});
con.connect(createDatabase);

exports.con = con;

exports.escape = mysql.escape;
