import os

from flask import Flask, render_template, redirect, request, session, \
    jsonify, url_for

from flask_socketio import SocketIO, emit, join_room, leave_room, send

from helpers import login_required, authenticated_only

# from json import dumps

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

users_db = set()
live_channels = set()


@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.route("/")
@login_required
def index():
    """Renders main page."""
    return render_template("index.html", username=session[
        "username"
    ])


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    """Log in user to chat."""

    # Forget any logged in user
    session.clear()
    if request.method == "GET":
        return render_template("adduser.html")
    else:
        username = request.form.get("username")
        if username not in users_db:
            users_db.add(username)

            # Remember username in session
            session["username"] = username
            return redirect(url_for('index'))
        else:
            # TODO Add message that username already exists
            return render_template("error.html")


@app.route("/leave")
def logout():
    """Log user out."""
    session.clear()

    return redirect(url_for('adduser'))


@app.route("/channel/<channelname>")
@login_required
def chat(channelname):
    """Show chat room messages."""
    return render_template("chat.html", channel_name=channelname)

@socketio.on('create channel')
@authenticated_only
def channel(data):
    """User attempts to create a channel."""

    channel = data['channel']
    # Notify user when sending empty form data
    # Note to self: when sending data with JS `FromData' object, the key gets
    # assigned an empty string as its value when submitting empty form
    if not channel:
        emit('channel created?', {
            'message': "You sent an empty form",
            'channel': ""
        })

    # Check channel has not already been created
    elif channel in live_channels:
        emit('channel created?',{
            "message": "Channel already exists.",
            'channel': ""
        })
    else:
        live_channels.add(channel)
        emit('channel created?',{
            "message": "Channel created.",
            'channel': channel
        })


@socketio.on('connect')
@authenticated_only
def connect_handler():
    """Connect a user to socket."""
    emit('my response',
         {'message': 'Welcome to Flack!!!'})


@socketio.on('join')
@authenticated_only
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    send(username + ' has entered the room.', room=room)


@socketio.on('leave')
@authenticated_only
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    send(username + ' has left the room.', room=room)


if __name__ == '__main__':
    socketio.run(app, debug=True)
