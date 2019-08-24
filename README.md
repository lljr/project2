
# Table of Contents

1.  [Getting Started](#orgb7f45bf)
    1.  [Prepare the virtual environment](#orged6761f)
        1.  [Set environment variables](#orgc1e8b6e)
        2.  [Run the virtual environment](#orgaa98bda)
        3.  [Install dependencies](#orge13532c)
        4.  [Start the server](#org363894e)
        5.  [Go to 127.0.0.1](#org56d018f)
2.  [`application.py`](#org9d41a10)
3.  [Session vs localStorage](#org17cc9ef)
    1.  [Channel creation](#org806c337)
    2.  [Handling timestamps](#org29f6774)
4.  [`helpers.py`](#orgc375f36)
5.  [`static/index.js`](#org9401337)
    1.  [I should talk about why page does not need reloading](#org458b95e)
    2.  [I should talk about closing the window and going back without needing to login](#orgf8ec5ac)
    3.  [talk about the switch case that handles most logic](#org92dca0a)
6.  [`static/main.scss`](#orgc5267f5)
7.  [HTML Templates](#org7ac3d17)
    1.  [`layout.html`](#org1b6b833)
    2.  [`error.html`](#org3b425f7)
    3.  [`index.html`](#org0dc9da4)
    4.  [`adduser.html`](#org926630e)
8.  [Personal Touch](#orgdb0a332)
    1.  ["Deleting" messages](#org9e2c003)
9.  [Notes](#org16336d8)
    1.  [Tested on Firefox Quantum and Firefox Developer Edition](#orgaf0accc)
    2.  [Bugs](#org64d350d)
        1.  [Tested on Safari but won't show dates](#org8a1f563)


<a id="orgb7f45bf"></a>

# Getting Started


<a id="orged6761f"></a>

## Prepare the virtual environment


<a id="orgc1e8b6e"></a>

### Set environment variables

either by typing on your terminal (`$ FLASK_APP=application.py; SECRET_KEY`"secret"=)

or by placing them inside a file (i.e. `.env`)

    # these go inside a .env file or such
    export FLASK_APP=application.py
    export SECRET_KEY='Your_secret!!!'

and sourcing it (i.e. `. .env` or `source .env`)


<a id="orgaa98bda"></a>

### Run the virtual environment

by first setting it with `$ python -m venv venv` and then running it with
`$ source venv/bin/activate`


<a id="orge13532c"></a>

### Install dependencies

first check that the virtual environment is active then run `$ pip install -r requirements.txt`


<a id="org363894e"></a>

### Start the server

with `$python application.py` since development sever does work with FlaskSocketIO (i.e `$ flask run`)


<a id="org56d018f"></a>

### Go to 127.0.0.1

then type a name which will be your moniker to identify you in the chat


<a id="org9d41a10"></a>

# `application.py`

handles login/logout flow with http requests and then leaves everything else to websockets.

The nature of this flow is documented in the FlaskSocketIO documentation and the author actually
encourages this for simplicity's sake. You'll only see `/leave`, `/` and `/adduser` as http routes.


<a id="org17cc9ef"></a>

# Session vs localStorage

One thing to not about `/leave` is that it does not remove the user from the database &#x2013; that is
due to the nature of this chat app in which assumes a user will chat quickly and then leave. I did
not want to let another user claim the same username and then be misidentified because it may not
be the same person.

Another thing is that the route will accept and AJAX request because it will take care of clearing
`localStorage` and sending a last 'leave' event to let members of a room chat now that the user
logged out AND thus implicitly left any current chats.

Furthermore, on login (i.e. `/adduser`) the server will save the user's username in a session
cookie and later on in `localStorage`. This is done because the client needs a way to redraw
the screen when it closes a window. The session cookie can only remember server side but cannot
handle in any way what the client does. Therefore, `localStorage` helps by redrawing the screens
and fetching the channels, <span class="underline">which are live and current</span>, to the client when it reopens a window.


<a id="org806c337"></a>

## Channel creation

Besides that channel creation, deletion, and sending of messages happen with websockets.
They may seem like a lot but I built them in a way that I could give proper feedback to user:
that a user should know if a channel can be created or not (and why).

The server (that is this same file) only stores up to 100 messages: you'll see something in line
`177` like

    db["channels"].update({
        channel: {
            "messages": collections.deque(maxlen=100)
        }
    })

that is specifically the statement `collections.deque(maxlen=100)`.


<a id="org29f6774"></a>

## Handling timestamps

All messages are saved with a timestamp, created at the server. They are later converted to 24 hour
format (European?) when they are received by the client (the browser). The Date API kind of automagically does the conversion to human readable format since I'm feeding a raw UTF string that represents time. For example

    const now = new Date(date);

Where the variable `date` is a string sent from the Flask server in UTF format.

That is

    msg_id, date = "item-" + str(uuid4().hex), str(datetime.now(timezone.utc))

Since browser vendors (Chrome, FireFox, Safari etc) implement the Date API differently, please expect different results. For example, in Safari, you will notice that the timestamp on the message won't be something like `[10:22]`, but something like `[...]`. I should further investigate the reason why this happens but I suspect it may have to do with cross browser compatibility, which is outside of the scope of the project (i.e. making my client code compatible in many other browsers.). So, please test the app in Firefox.


<a id="orgc375f36"></a>

# `helpers.py`

Contains two decorators which prevent interaction with the server unless the user is authenticated.

There is also a small helper function that loops through a variable to find a desired character.
This is used to error check/sanitize input during channel creation (requests sent via websocket to
created a channel).


<a id="org9401337"></a>

# `static/index.js`

Handles all render logic. The way the file is written expresses more or less my train of thought&#x2026;
There are several functions that need work and polishing. Also, I did not use much callbacks in
websocket statements like

    socket.emit('join', {
    // ...
    }, ok => {
      // This is a callback
    })

which would have been nice to provide other features like whether messages where read or whether
they actually got sent by the server and allowing resending them on network errors etc etc.


<a id="org458b95e"></a>

## TODO I should talk about why page does not need reloading


<a id="orgf8ec5ac"></a>

## TODO I should talk about closing the window and going back without needing to login


<a id="org92dca0a"></a>

## TODO talk about the switch case that handles most logic


<a id="orgc5267f5"></a>

# `static/main.scss`

Mostly helps formatting the conversation window where messages get displayed by giving it a fixed
height. Handles other minor styling. Btw, most styling was done using bootstrap 4.


<a id="org7ac3d17"></a>

# HTML Templates


<a id="org1b6b833"></a>

## `layout.html`

The app barely renders other pages besides `index.html`. This page contains the navigation menu
and a main container where most data gets rendered.


<a id="org3b425f7"></a>

## `error.html`

A simple web page that aids giving feedback when a user sents incorrent data to authenticate.


<a id="org0dc9da4"></a>

## `index.html`

Main page that uses two main columns: the first one to display active channels and the other one to
display the current active room/conversation/channel (whatever you want to call it).

You don't need to refresh this page to receive messages or deleted messages notifications.


<a id="org926630e"></a>

## `adduser.html`

Page that tells a user to identify themselves. Has only one input, meaning it only requires a username.


<a id="orgdb0a332"></a>

# Personal Touch


<a id="org9e2c003"></a>

## "Deleting" messages

A user will see an "x" button beside their message indicating that they may request to delete it.

I'm not really deleting their messages because I would not rather created gaps in a conversation.

I think it would make a conversation confusing&#x2026; Instead, I decided to overwrited them because
I would like a user to know what happened in the conversation if they decided to close the window
and come back again where they left off.

I do not implement strict confirmation because I think it would be annoying to ask the user for
a pop-up confirmation to delete their message and I think that the app's chat rooms have a very
short lifespans, so a user should be able to delete them as quickly as possible.


<a id="org16336d8"></a>

# Notes


<a id="orgaf0accc"></a>

## Tested on Firefox Quantum and Firefox Developer Edition


<a id="org64d350d"></a>

## Bugs


<a id="org8a1f563"></a>

### Tested on Safari but won't show dates

renders dates as `[...]` perhaps the way `new Date()` works in Safari differs from
Firefox's implementation
