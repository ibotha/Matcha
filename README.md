# MATCHA

Matcha is a dating website that I created in order to learn about data aggregation and web socket-based realtime chats.

![preview]

## Installation
For installation on your local system follow these instructions.
### Requirements
* [Node.js]
* [MySql]
* a gmail account with less secure app access turned on
  
### Instructions
1. Install requirements.
2. Clone the repository
3. Enter database credentials into database.js near the bottom of the file.
4. Create a file called nope.js at the root of the repository and fill it with your gmail account credentials.
	>exports.auth = {
	>	user: `"email_address@gmail.com"`,
	>	pass: `"password"`
	>}
5. run `npm -i` from the root of your repository
6. run `node` from the root of the repository.
7. type `var pop = require('./populateinterests.js');` and hit enter.
8. type `pop.populateInterests();` and hit enter.
9. exit out of `node`
10. run `npm run start`

The server should now be up and running in full.

## Tests
It is recommended to run these tests once the server is set up in order to ensure that everything is working properly

1. run `node` from the root of the repository.
2. type `var pop = require('./populateinterests.js');` and hit enter.
2. type `pop.populateUsers();` and hit enter.
3. Navigate to [localhost:3000](http://localhost:3000).
4. Click signup and create an account. make sure to use a valid email address.
5. Check your inbox for a verification email and verify your account. If you do not recieve one check that you have configured the nope.js file correctly.
6. Log in to your account.
7. You should be redirected to your profile page to complete your profile. Add some interests, a bio and a profile picture.
8. repeat steps 3 through 7 in an incognito browser to create a second account.
9. Go to `home` and check that the users align with your set preference and interests, check out the profiles and make sure that you can navigate to them properly.
10. Find the second account you created and select `chat`, a message should appear saying that a request to chat has been sent.
11. In the incognio browser go to the chat tab and select the chat [confirm]
12. Test that messages get sent properly.
13. Go back to the chat page and block the user by clicking on the circle to the right of their name. Thest that you can no longer chat to them and that you cannot see each other on the home page.

If all these steps passed then the website is fully functional

## Structure

### Files
The files in this project are split into 4 main categories:
1. config: These are files used for the setup of the website. Not for users.
2. control: These are .js files that contain all the client-side functionality of the website.
3. modal: These are server-side .js files that handle modification of the database and retrieval of information
4. view: These are .ejs files that render out into webpages and are sent to the user. AKA the frontend.

### Flow
The flow of the webite is as follows:

1. The user navigates to the website and requests a view. (Home, Login, Profile...)
2. The server checks privilages and either returns the view or the user is rerouted.
3. The returned html requests the required control files.
4. The user interacts with the website.
5. The control files send post requests with the relevant information to modal files.
6. The modal files update the database accordingly and return relevant information
7. The control files update the webpage with the new information
8. repeat steps 4 through 7 until the user navigates away or to a different view

### Database
The database is structured as follows:

#### users
* `int` *id* (primary key)
* `varchar(100)` *email* (unique)
* `varchar(100)` *first_name*
* `varchar(100)` *last_name*
* `varchar(2000)` *bio*
* `int` *fame* (A track of how often other users engage with this user)
* `tinyint(1)` *gender* user's gender (0 male, 1 female, 2 other)
* `tinyint(1)` *preference* user's sexual preference (0 hetro, 1 homo, 2 other)
* `tinyint(1)` *valid* (has the user confirmed their email?)
* `varchar(1000)` *password* (the user's hashed password)
* `timestamp` *birthdate*
* `varchar(1000)` *verif* (a token to validate the user's email with)
* `double` *lat* (longitude of the user)
* `double` *lon*  (latitude of the user)
* `varchar(200)` *profilepic*
* `varchar(200)` *pic1*
* `varchar(200)` *pic2*
* `varchar(200)` *pic3*
* `varchar(200)` *pic4*

#### notifications
* `int` *id* (primary key)
* `varchar(100)` *message*
* `int` *user* (foreign key to `users`.`id`)

#### chats
* `int` *id* (primary key)
* `int` *user1* (foreign key to `users`.`id`)
* `int` *user2* (foreign key to `users`.`id`)
* `tinyint(1)` *active* (have both users accepted the chat?)

#### messages
* `int` *id* (primary key)
* `varchar(500)` *message*
* `int` *reciever* (foreign key to `users`.`id`)
* `int` *chatid* (foreign key to `chats`.`id`)
* `timestamp` *creation*

#### categories
* `int` *id* (primary key)
* `varchar(100)` *name*

#### interests
* `int` *id* (primary key)
* `varchar(100)` *name*
* `int` *catagory* (foreign key to `categories`.`id`)

#### blocks
* `int` *blocker* (foreign key to `users`.`id`)
* `int` *blockie* (foreign key to `users`.`id`)

#### reports
* `int` *id* (primary key)
* `int` *reporter* (foreign key to `users`.`id`)
* `int` *reciever* (foreign key to `users`.`id`)
* `varchar(500)` *message*
* `timestamp` *creation*

#### userinterests
* `int` *user* (foreign key to `users`.`id`)
* `int` *interest* (foreign key to `interests`.`id`)


[preview]: ./preview/Preview.png
[MySql]: https://https://dev.mysql.com/downloads/
[node.js]: https://nodejs.org/en/download/