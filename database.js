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
	"preference TINYINT NOT NULL,"+
	"gender TINYINT NOT NULL,"+
	"bio varchar(2000),"+
	"fame int NOT NULL DEFAULT 0,"+
	"valid int NOT NULL DEFAULT 0,"+
	"birthdate DATE NOT NULL,"+
	"lat double,"+
	"lon double,"+
	"profilepic varchar(200),"+
	"pic1 varchar(200),"+
	"pic2 varchar(200),"+
	"pic3 varchar(200),"+
	"pic4 varchar(200),"+
	"PRIMARY KEY (id)"+
	")",
	catagories: "CREATE TABLE IF NOT EXISTS `matcha`.`catagories` (" +
	"id int UNIQUE NOT NULL AUTO_INCREMENT," +
	"name varchar(100) UNIQUE NOT NULL," +
	"PRIMARY KEY (id)" +
	")",
	interests: "CREATE TABLE IF NOT EXISTS `matcha`.`interests` ("+
	"id int UNIQUE NOT NULL AUTO_INCREMENT,"+
	"name varchar(100) UNIQUE NOT NULL,"+
	"catagory int NOT NULL,"+
	"PRIMARY KEY (id)," +
	"FOREIGN KEY (catagory) REFERENCES catagories(id) ON DELETE CASCADE" +
	")",
	reports: "CREATE TABLE IF NOT EXISTS `matcha`.`reports` (" +
	"id int NOT NULL AUTO_INCREMENT," +
	"reporter int NOT NULL," +
	"reciever int NOT NULL," +
	"message varchar(500) NOT NULL," +
	"`creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
	"PRIMARY KEY (id)," +
	"FOREIGN KEY (reporter) REFERENCES users(id) ON DELETE CASCADE," +
	"FOREIGN KEY (reciever) REFERENCES users(id) ON DELETE CASCADE" +
	")",
	notifications: "CREATE TABLE IF NOT EXISTS `matcha`.`notifications` (" +
	"id int NOT NULL AUTO_INCREMENT," +
	"user int NOT NULL," +
	"message varchar(100)," +
	"PRIMARY KEY (id)," +
	"FOREIGN KEY (user) REFERENCES users(id) ON DELETE CASCADE" +
	")",
	chats: "CREATE TABLE IF NOT EXISTS `matcha`.`chats` (" +
	"id int NOT NULL AUTO_INCREMENT," +
	"user1 int NOT NULL," +
	"user2 int NOT NULL," +
	"active bool NOT NULL DEFAULT 0," +
	"PRIMARY KEY (id)," +
	"FOREIGN KEY (user1) REFERENCES users(id) ON DELETE CASCADE," +
	"FOREIGN KEY (user2) REFERENCES users(id) ON DELETE CASCADE" +
	")",
	messages: "CREATE TABLE IF NOT EXISTS `matcha`.`messages` (" +
	"id int NOT NULL AUTO_INCREMENT," +
	"chatid int NOT NULL," +
	"reciever int NOT NULL," +
	"message varchar(500) NOT NULL," +
	"`creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
	"PRIMARY KEY (id)," +
	"FOREIGN KEY (reciever) REFERENCES users(id) ON DELETE CASCADE," +
	"FOREIGN KEY (chatid) REFERENCES chats(id) ON DELETE CASCADE" +
	")",
	blocks: "CREATE TABLE IF NOT EXISTS `matcha`.`blocks` (" +
	"blocker int NOT NULL," +
	"blockie int NOT NULL," +
	"FOREIGN KEY (blocker) REFERENCES users(id) ON DELETE CASCADE," +
	"FOREIGN KEY (blockie) REFERENCES users(id) ON DELETE CASCADE" +
	")",
	userinterests: "CREATE TABLE IF NOT EXISTS `matcha`.`userinterests` (" +
	"user int NOT NULL," +
	"interest int NOT NULL," +
	"FOREIGN KEY (user) REFERENCES users(id) ON DELETE CASCADE," +
	"FOREIGN KEY (interest) REFERENCES interests(id) ON DELETE CASCADE," +
	"CONSTRAINT UNIQUENESS UNIQUE (user, interest)" +
	");"
}

var funcs = {
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
	'END',
	hasfunc:
	'CREATE FUNCTION `HASINTEREST`(`subinterests` VARCHAR(2000), `needle` INT(11)) RETURNS TINYINT(1) ' +
	'READS SQL DATA ' +
	'BEGIN ' +
	'DECLARE i INT; ' +
	'DECLARE sublen INT; ' +
	'DECLARE comma INT; ' +
	'SET sublen = LENGTH(subinterests); ' +
	'SET i = 2; ' +
	'WHILE(i < sublen - 1) DO ' +
		'SET comma = LOCATE(\',\', subinterests, i); ' +
		'IF comma = 0 THEN ' +
			'IF CAST(SUBSTR(subinterests, i, sublen - i) AS UNSIGNED) = needle THEN ' +
				'RETURN 1; ' +
			'ELSE ' +
				'RETURN 0; ' +
			'END IF; ' +
		'END IF; ' +
		'IF CAST(SUBSTR(subinterests, i, comma - i) AS UNSIGNED) = needle THEN ' +
			'RETURN 1; ' +
		'END IF; ' +
		'SET i = comma + 1; ' +
	'END WHILE; ' +
	'RETURN 0; ' +
	'END',
	scorefunc: 
	"CREATE DEFINER=`root`@`localhost` FUNCTION `SCORE`(`user1` int, `user2` int, `fame` INT) RETURNS DOUBLE NOT DETERMINISTIC " +
	'READS SQL DATA ' +
	"BEGIN " +
	"DECLARE ret DOUBLE; "+
	"DECLARE interestmatch INT; "+
	"SET interestmatch = 0; "+
	"SET ret = fame; "+
	"SELECT COUNT(*) INTO interestmatch from (select distinct interest from userinterests WHERE user=user1) i1 join (select distinct interest from userinterests WHERE user=user2) i2 WHERE i1.interest=i2.interest;" +
	"SET ret = ret + interestmatch; "+
	"RETURN ret; "+
	"END",
};


//var pp = require('./populateinterests.js');

function createTables(err) {
	
	console.log("\n=================================\n\n");
	if (err) throw err;
	con.query("USE `matcha`");
	console.log("Database created");
	for (const [key, value] of Object.entries(tables)) {
		con.query(value, function (err) {
			if (err) throw err
				console.log(key + " table created");
		});
	}
	con.query("DROP FUNCTION IF EXISTS DIST;", function (err) {
		if (err) throw err;
		con.query(funcs.distfunc, function (err) {
			if (err) throw err;
			console.log("distfunc created");
		});
	});
	con.query("DROP FUNCTION IF EXISTS HASINTEREST;", function (err) {
		if (err) throw err;
		con.query(funcs.hasfunc, function (err) {
			if (err) throw err;
			console.log("hasfunc created");
		});
	});
	con.query("DROP FUNCTION IF EXISTS SCORE;", function (err) {
		if (err) throw err;
		con.query(funcs.scorefunc, function (err) {
			if (err) throw err;
			console.log("scorefunc created");	
			console.log("\n=================================\n\n");
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
	password: "password"
});
con.connect(createDatabase);

exports.con = con;

exports.escape = mysql.escape;
