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
	"location varchar(100),"+
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
	")"
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

exports.getCon = function() {
	return con;
}

exports.escape = mysql.escape;