import os

from flask import Flask, render_template, request, session, jsonify, redirect, url_for

from flask_socketio import SocketIO, emit, join_room, leave_room, send,\
    disconnect

from helpers import login_required, authenticated_only

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

users_db = set()
live_channels = set()


@app.route("/")
@login_required
def index():
    """Renders main page."""
    return render_template("index.html")


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    """Log user in."""
    if request.method == "GET":
        return render_template("adduser.html")
    else:
        # Don't allow user to submit empty forms
        username = request.form.get("username")
        if not username:
            return jsonify({})
        elif username not in users_db:
            users_db.add(username)


@app.route("/leave")
def leave():
    """Leave chat."""
    session.clear()
    disconnect()
    return redirect(url_for('index'))


@socketio.on('connect')
@authenticated_only
def handle_connect():
    """Set up user log in."""
    #  Return a value that gets handled in client callback indicating connection
    return session['username'], list(live_channels), "you're ready to chat!"


@socketio.on('create channel')
def handle_channel(data):
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
        emit('channel created?', {
            "message": "Channel already exists.",
            'channel': ""
        })
    else:
        live_channels.add(channel)
        emit('channel created?', {
            "message": "Channel created.",
            'channel': channel
        },
             broadcast=True)


@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    send(username + ' has entered the room.', room=room)


@socketio.on('message')
def handle_message(data):
    """Send messages to rooms."""
    pass


@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    send(username + ' has left the room.', room=room)


if __name__ == '__main__':
    socketio.run(app, debug=True)
