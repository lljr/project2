
# Table of Contents

1.  [Getting Started](#org6bc596e)
    1.  [Run the virtual environment](#org0d40c58)
    2.  [Set environment variables](#org3db0fd9)
    3.  [Install dependencies](#orgeea37b6)
    4.  [Start the server](#org157430e)
    5.  [Go to `127.0.0.1:5000`](#orgde4a88b)
        1.  [Preferably test using Firefox](#org63c7f8c)
2.  [`application.py`](#org91b03d0)
    1.  [Session vs localStorage](#org47bdd4d)
    2.  [Channel creation](#org16b8ea3)
    3.  [Handling timestamps](#org3dea077)
3.  [`helpers.py`](#org46a1a84)
4.  [`static/index.js`](#org34d5e4c)
    1.  [`switch` statement](#orgc0e31dc)
        1.  [Remembering the channel](#org36fc7b3)
5.  [`static/main.scss`](#orgbd28245)
6.  [HTML Templates](#org99dc6e3)
    1.  [`layout.html`](#org3a98d05)
    2.  [`error.html`](#orgbc33ad3)
    3.  [`index.html`](#orgf08d14f)
    4.  [`adduser.html`](#org260710f)
7.  [Personal Touch](#org6883689)
    1.  ["Deleting" messages](#org81bd324)
8.  [Notes](#orga558c55)
    1.  [Bugs](#org3299a8c)
        1.  [Tested on Safari but won't show dates](#org2e7b568)


<a id="org6bc596e"></a>

# Getting Started


<a id="org0d40c58"></a>

## Run the virtual environment

by first setting it with `$ python -m venv venv` and then running it with
`$ source venv/bin/activate`


<a id="org3db0fd9"></a>

## Set environment variables

either by typing on your terminal (`$ FLASK_APP=application.py; SECRET_KEY`"secret"=)

or by placing them inside a file (i.e. `.env`)

    # these go inside a .env file or such
    export FLASK_APP=application.py
    export SECRET_KEY='Your_secret!!!'

and sourcing it (i.e. `. .env` or `source .env`)


<a id="orgeea37b6"></a>

## Install dependencies

first check that the virtual environment is active then run `$ pip install -r requirements.txt`


<a id="org157430e"></a>

## Start the server

with `$python application.py` since development sever does work with FlaskSocketIO (i.e `$ flask run`)


<a id="orgde4a88b"></a>

## Go to `127.0.0.1:5000`

in your browser then type a name which will be your moniker to identify you in the chat


<a id="org63c7f8c"></a>

### Preferably test using Firefox

I'm using a linux machine thus hard to get Chrome or Safari. So, I'm only testing with Firefox.

I believe Chrome should work; I quickly tested using a seperate machine that runs macOS and saw bugs for
timestamp creation. So&#x2026; keep that in mind


<a id="org91b03d0"></a>

# `application.py`

handles login/logout flow with http requests and then leaves everything else to websockets.

The nature of this flow is documented in the [FlaskSocketIO documentation](https://flask-socketio.readthedocs.io/en/latest/), and the author actually
encourages this one for simplicity's sake. You'll only see `/leave`, `/` and `/adduser` as http routes.


<a id="org47bdd4d"></a>

## Session vs localStorage

One thing to not about the `/leave` route is that it does not remove the user from the database &#x2013; that is
due to the nature of this chat app that assumes a user will chat quickly and then leave. Therefore, their
name would become available to any other user, allowing a different person to claim the past username's messages.
By not erasing the user from the database during logout, I'm preventing their username and their respective
chat messages to be claimed by another person.

Another thing is that the route accepts AJAX requests because it will take care of clearing
`localStorage` and sending a last 'leave' event to let members of a room chat know that the user
logged out, which implicitly signals the user left a room chat.

Furthermore, on login (i.e. `/adduser`) the server will save the user's username in a session
cookie and later on in `localStorage`  because the client needs a way to redraw
the screen when it closes a window. The session cookie can only remember on the server side but cannot
interact in any way with the client via websockets. `localStorage` stores a "username" and "joined" variable
to help redraw the screen and fetch the channels, <span class="underline">which are live and current</span>, to the client when it reopens a window.
The `"joined"` variable gets used heavily in the client side to toggle several CSS styles as to give feedback to the
user about their currently joined chat room, if there is any, or the current live and available chats in the
"Live Channels" section.


<a id="org16b8ea3"></a>

## Channel creation

channel creation, deletion, and sending of messages happen with websockets.

It may seem like there are too many websocket event handlers but I built them in a way
that I could give proper feedback to user: that a user should know if a
channel can be created or not (and why).

The server (that is file `application.py`) only stores up to 100 messages: you'll see
in line  `177`

    db["channels"].update({
        channel: {
            "messages": collections.deque(maxlen=100)
        }
    })

specifically the statement `collections.deque(maxlen=100)`, which automagically pops
 message items when there are more than 100.


<a id="org3dea077"></a>

## Handling timestamps

All messages are saved with a timestamp, created at the server. They are later converted to 24 hour
UTC format  when they are received by the client (the browser). The Date API kind of
automagically does the conversion to human readable local time format since I'm feeding a raw UTC
created by Python. For example

    const now = new Date(date);

Where the variable `date` is a string sent from the Flask server in UTC format.

That is from what gets output in `date`

    msg_id, date = "item-" + str(uuid4().hex), str(datetime.now(timezone.utc))

Since browser vendors (Chrome, FireFox, Safari etc) implement the Date API differently, please
expect results to vary from browser to browser. For example, in Safari, you will notice that the
timestamp on the message won't be something like `[10:22]`, but something like `[...]`. I should
further investigate the reason this happens, but I suspect it may have to do with cross browser
compatibility, which is outside of the scope of the project.

Please test the app in Firefox.


<a id="org46a1a84"></a>

# `helpers.py`

Contains two decorators which prevent interaction with the server unless the user is authenticated.

There is also a small helper function that loops through a variable to find a desired character.
This is used to error check/sanitize input during channel creation (requests sent via websocket to
create a channel).


<a id="org34d5e4c"></a>

# `static/index.js`

Handles all render logic. The way the file is written expresses more or less my train of thought&#x2026;
There are several functions that need work and polishing. Also, I did not use much callbacks in
websocket statements like

    socket.emit('join', {
    // ...
    }, ok => {
      // This is a callback
    })

which would have been nice to provide other features like whether messages were read, or whether
they actually got sent by the server, or allowing resending them on network errors etc etc.


<a id="orgc0e31dc"></a>

## `switch` statement

There's a considerably large `switch` statement wrapped around a `socket.on("json",... )` event handler.

Most of the app's logic happens here. When channels get joined, this statement takes care of redrawing
the user's screen to reflect changes in state. Message sending also gets handled in this statement as well
as message deletion. There are other minor things to notice in this statement like the seperation between
"message", "notification", and "refresh" and "sync".


<a id="org36fc7b3"></a>

### Remembering the channel

The "refresh" and "sync" handle different events. A "refresh" is when a user closes the window and goes
back to the app and sees the chat wherever they left off.  A "sync" is when a user, for some reason, refreshes
the window and fetches all necessary state data to render active channels and/or any joined chat. They are very
similar but a "refresh" handles what happens in a chat room and also does not notify users of a rejoin, and "sync"
is something that mostly happens on login.


<a id="orgbd28245"></a>

# `static/main.scss`

Mostly helps formatting the conversation window where messages get displayed by giving it a fixed
height. Handles other minor styling. Most styling users bootstrap 4.


<a id="org99dc6e3"></a>

# HTML Templates


<a id="org3a98d05"></a>

## `layout.html`

The app barely renders other pages besides `index.html`. This page contains the navigation menu
and a main container where most data gets rendered.


<a id="orgbc33ad3"></a>

## `error.html`

A simple web page that aids giving feedback when a user sents incorrent authentication data.


<a id="orgf08d14f"></a>

## `index.html`

Main page that divides two columns: the first one to display active channels and the other one to
display the current active room/conversation/channel.

You don't need to refresh this page to receive messages, receive notifications,  create channels,
or delete messages.


<a id="org260710f"></a>

## `adduser.html`

Page that tells a user to identify themselves. Has only one input field, meaning it only requires a username.


<a id="org6883689"></a>

# Personal Touch


<a id="org81bd324"></a>

## "Deleting" messages

A user will see an "x" button beside their message indicating that they may request to delete it.

I'm not really deleting their messages because I would rather not create gaps in a conversation.

Instead, I decided to overwrite them because I would like users to know what happened in the conversation, they decide
to close the window and come back again wherever left off.

I do not implement strict confirmation because it would be annoying to ask the user for
a pop-up confirmation to delete their own message.

The app's chat rooms have a short lifespans &#x2013; a user should be able to delete them as quickly as possible.


<a id="orga558c55"></a>

# Notes


<a id="org3299a8c"></a>

## Bugs

Known bugs that require further investigation


<a id="org2e7b568"></a>

### Tested on Safari but won't show dates

renders dates as `[...]` perhaps the way `new Date()` works in Safari differs from
Firefox's implementation
