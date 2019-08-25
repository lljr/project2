
# Table of Contents

1.  [Getting Started](#org9487965)
    1.  [Run the virtual environment](#org064a7a6)
    2.  [Set environment variables](#org5d20a79)
    3.  [Install dependencies](#org4873152)
    4.  [Start the server](#org375e182)
    5.  [Go to `127.0.0.1:5000/`](#org64d7643)
        1.  [Preferably test using Firefox](#org9ced0ed)
2.  [`application.py`](#org3b94f0e)
    1.  [Session vs localStorage](#org71262cf)
    2.  [Channel creation](#orgbff49fa)
    3.  [Handling timestamps](#org8d90b92)
3.  [`helpers.py`](#orgd00ad26)
4.  [`static/index.js`](#org5133a58)
    1.  [`switch` statement](#org6cecd6c)
        1.  [Remembering the channel](#orge310133)
5.  [`static/main.scss`](#org8cfd0cc)
6.  [HTML Templates](#orgaa364a2)
    1.  [`layout.html`](#orgb3c97c1)
    2.  [`error.html`](#orga28ab4f)
    3.  [`index.html`](#orgaeebfb9)
    4.  [`adduser.html`](#org6f78606)
7.  [Personal Touch](#org7f564a3)
    1.  ["Deleting" messages](#org4916db2)
8.  [Notes](#org7d51dcc)
    1.  [Bugs](#org4e1c72c)
    2.  [Tested on Safari but won't show dates](#org12f596b)


<a id="org9487965"></a>

# Getting Started


<a id="org064a7a6"></a>

## Run the virtual environment

by first setting it with `$ python -m venv venv` and then running it with
`$ source venv/bin/activate`


<a id="org5d20a79"></a>

## Set environment variables

either by typing on your terminal (`$ FLASK_APP=application.py; SECRET_KEY`"secret"=)

or by placing them inside a file (i.e. `.env`)
```sh
    # these go inside a .env file or such
    export FLASK_APP=application.py
    export SECRET_KEY='Your_secret!!!'
```
and sourcing it (i.e. `. .env` or `source .env`)


<a id="org4873152"></a>

## Install dependencies

first check that the virtual environment is active then run `$ pip install -r requirements.txt`


<a id="org375e182"></a>

## Start the server

with `$python application.py` since development sever does work with FlaskSocketIO (i.e `$ flask run`)


<a id="org64d7643"></a>

## Go to `127.0.0.1:5000/`

in your browser then type a name which will be your moniker to identify you in the chat


<a id="org9ced0ed"></a>

### Preferably test using Firefox

I'm using a linux machine thus hard to get Chrome or Safari. So, I'm only testing with Firefox.

I believe Chrome should work; I quickly tested using a seperate machine that runs macOS and saw bugs for
timestamp creation. So&#x2026; keep that in mind


<a id="org3b94f0e"></a>

# `application.py`

handles login/logout flow via http requests and leaves everything else to websockets.

The nature of this flow is documented in the [FlaskSocketIO documentation](https://flask-socketio.readthedocs.io/en/latest/), and the author actually
encourages this one for simplicity's sake. You'll only see `/leave`, `/` and `/adduser` as http routes.


<a id="org71262cf"></a>

## Session vs localStorage

One thing to note about the `/leave` route is that it does not remove the user from the database &#x2013; that is
due to the nature of this chat app that assumes a user will chat quickly and then leave. Therefore, their
name would become available to any other user, allowing a different person to claim the past username's messages.
By not erasing the user from the database during logout, I'm preventing their username and their respective
chat messages to be claimed by another person.

I have thought a lot about this decision and decided to leave it that way. Since most likely this app will run
as a development server, I do not see another reason to change this design decision. I would consider removing
the user on the databse were I to deploy the app in a production server.

Another thing is that the `/leave` route accepts AJAX requests because it will take care of clearing
`localStorage` and sending a last *leave* event to let members of a room chat know that a user
logged out. You will get a Python *KeyError* if the development server crashes and you try to use the app
again. Remember that a server crash signals a *disconnect* event to the client, which triggers a  websocket
*leave* event but does not clear the session cookie. Naturally, a user will be logged in will send
empty data to retreive channels, throwing a *KeyError* when trying to access the channels Python dictionary
with an undefined variable.

Furthermore, on login (i.e. `/adduser`), the server will save the user's username in a session
cookie and later on in `localStorage`  because the client needs a way to redraw
the screen when it closes a window. `localStorage` stores a "username" and "joined" variable
to help redraw the screen and fetch the channels, <span class="underline">which are live and current</span>, to the client when it reopens a window.
The variables stored in `localStorage` help rendering correct data in a coversation when the client receives messages
from the server. Things like making sure the owner of a message sees an **X** on their message and not on another person's
message are handling by checking variables stored in `localStorage` (`username` & `joined`).

The `"joined"` variable gets used heavily in the client side to toggle several CSS styles as to give feedback to the
user about their currently joined chat room, if there is any, or the current live and available chats in the
"Live Channels" section.


<a id="orgbff49fa"></a>

## Channel creation

channel creation, deletion, and sending of messages happen with websockets.

It may seem like there are too many websocket event handlers but I built them in a way
that I could give proper feedback to user: that a user should know if a
channel can be created or not (and why).

The server (that is file `application.py`) only stores up to 100 messages: you'll see
in line  `177`
```python
    db["channels"].update({
        channel: {
            "messages": collections.deque(maxlen=100)
        }
    })
```
specifically the statement `collections.deque(maxlen=100)`, which automagically pops
 message items when there are more than 100.


<a id="org8d90b92"></a>

## Handling timestamps

All messages are saved with a timestamp, created at the server in ISO 8601 format.
They are later converted to 24 hour UTC format by the client (browser).
The Date API kind of automagically does the conversion to human readable local time
format by feeding a raw UTC created by Python's `datetime` module. For example
```javascript
    const now = new Date(date);
```
Where the variable `date` is a string sent from the Flask server in UTC format.

That is from what gets output in `date`
```python
    msg_id, date = "item-" + str(uuid4().hex), str(datetime.now(timezone.utc).isoformat(sep='T')
```
Since browser vendors (Chrome, FireFox, Safari etc) implement the Date API differently, please
expect results to vary from browser to browser. +For example, in Safari, you will notice that the
timestamp on the message won't be something like `[10:22]`, but something like `[...]`. I should
further investigate the reason this happens, but I suspect it may have to do with cross browser
compatibility, which is outside of the scope of the project.+

**NOTE**: I have fixed this issue on the last commit. The reason is that the Python `datetime` module creates
by default a string without the *T* seperator in `YYYY-MM-DDTHH:mm:ss.sssZ` ISO 8601. This is done
by calling the function `isoformat(sep`'T')= on the created date object. I'm under the impression that
some browser vendors are very strict with the Date API implementation and will not return a proper date
without the exact same ISO 8601 format. For now, you can see dates rendered correctly in test.

That said, please the app in Firefox, since it's where I mostly tested the app.


<a id="orgd00ad26"></a>

# `helpers.py`

Contains two decorators which prevent interaction with the server unless the user is authenticated.

There is also a small helper function that loops through a variable to find a desired character.
This is used to error check/sanitize input during channel creation (requests sent via websocket to
create a channel).


<a id="org5133a58"></a>

# `static/index.js`

Handles all render logic. The way the file is written expresses more or less my train of thought&#x2026;
There are several functions that need work and polishing. Also, I did not use much callbacks in
websocket statements like
```javascript
    socket.emit('join', {
    // ...
    }, ok => {
      // This is a callback
    })
```
which would have been nice to provide other features like whether messages were read, or whether
they actually got sent by the server, or allowing resending them on network errors etc etc.


<a id="org6cecd6c"></a>

## `switch` statement

There's a considerably large `switch` statement wrapped around a `socket.on("json",... )` event handler.

Most of the app's logic happens here. When channels get joined, this statement takes care of redrawing
the user's screen to reflect changes in state. Message sending also gets handled in this statement as well
as message deletion. There are other minor things to notice in this statement like the seperation between
"message", "notification", and "refresh" and "sync".


<a id="orge310133"></a>

### Remembering the channel

The "refresh" and "sync" handle different events. A "refresh" is when a user closes the window and goes
back to the app and sees the chat wherever they left off.  A "sync" is when a user, for some reason, refreshes
the window and fetches all necessary state data to render active channels and/or any joined chat. They are very
similar but a "refresh" handles what happens in a chat room and also does not notify users of a rejoin, and "sync"
is something that mostly happens on login.


<a id="org8cfd0cc"></a>

# `static/main.scss`

Mostly helps formatting the conversation window where messages get displayed by giving it a fixed
height. Handles other minor styling. Most styling users bootstrap 4.


<a id="orgaa364a2"></a>

# HTML Templates


<a id="orgb3c97c1"></a>

## `layout.html`

The app barely renders other pages besides `index.html`. This page contains the navigation menu
and a main container where most data gets rendered.


<a id="orga28ab4f"></a>

## `error.html`

A simple web page that aids giving feedback when a user sents incorrent authentication data.


<a id="orgaeebfb9"></a>

## `index.html`

Main page that divides two columns: the first one to display active channels and the other one to
display the current active room/conversation/channel.

You don't need to refresh this page to receive messages, receive notifications,  create channels,
or delete messages.


<a id="org6f78606"></a>

## `adduser.html`

Page that tells a user to identify themselves. Has only one input field, meaning it only requires a username.


<a id="org7f564a3"></a>

# Personal Touch


<a id="org4916db2"></a>

## "Deleting" messages

A user will see an "x" button beside their message indicating that they may request to delete it.

I'm not really deleting their messages because I would rather not create gaps in a conversation.

Instead, I decided to overwrite them because I would like users to know what happened in the
conversation &#x2013; they decide to close the window and come back again wherever left off.

I do not implement strict "delete message" confirmation because it would be annoying to ask the user
for a pop-up confirmation to delete their own message.

The app's chat rooms have a short lifespans &#x2013; a user should be able to delete them as quickly as
possible.


<a id="org7d51dcc"></a>

# Notes


<a id="org4e1c72c"></a>

## Bugs

Known bugs that require further investigation


<a id="org12f596b"></a>

## DONE Tested on Safari but won't show dates

renders dates as `[...]` perhaps the way `new Date()` works in Safari differs from
Firefox's implementation

1.  [support parsing of ISO-8601 Date String](https://stackoverflow.com/questions/5802461/javascript-which-browsers-support-parsing-of-iso-8601-date-string-with-date-par?noredirect=1&lq=1)

2.  [Date API Chrome vs Firefox](https://stackoverflow.com/questions/15109894/new-date-works-differently-in-chrome-and-firefox)

3.  [Date.parse implicitly calls new Date()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#Syntax)

4.  [python datetime.isoformat(sep='T', timespec='minutes') to manipulate ISO 8601 string](https://docs.python.org/3.7/library/datetime.html#datetime.datetime.isoformat)
