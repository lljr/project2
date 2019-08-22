import collections
import os
import string
from uuid import uuid4

from datetime import datetime, timezone

from flask import Flask, render_template, request, session, jsonify, redirect,\
    url_for

from flask_socketio import SocketIO, emit, join_room, leave_room, send

from helpers import login_required, authenticated_only, check_unallowed_chars

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

db = {
    "users": set(),
    "channels": dict()
}


@app.route("/")
@login_required
def index():
    """Renders main page."""
    return render_template("index.html")


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    """Log user in."""

    if request.method == "POST":
        session.clear()

        username = request.form.get("username")
        # Don't allow user to submit empty forms
        if not username:
            msg = "You sent an empty form. Try again."
            return render_template(
                "error.html",
                message=msg,
                error=400,
                link="adduser"
            )

        if username not in db.get("users"):
            session["username"] = username
            db["users"].add(username)
            return redirect(url_for("index"))
        else:
            msg = "Username already in use. Choose another."
            return render_template(
                "error.html",
                message=msg,
                error=400,
                link="adduser"
            )
    else:
        return render_template("adduser.html")


@app.route("/leave")
def logout():
    """Leave chat."""

    try:
        # Remove user from DB
        db["users"].remove(session.get("username"))
        session.clear()
    except KeyError:
        return render_template("error.html", message="Dev error.", link='adduser', error=400)
    return jsonify({"address": "/adduser"})


@socketio.on('connect')
@authenticated_only
def handle_connect():
    """Set up user log in."""

    send({
        "type": "sync",
        "channels": list(db.get("channels")),
        "username": session.get("username")
    }, json=True)


@socketio.on('create channel')
@authenticated_only
def handle_channel(data):
    """User attempts to create a channel."""

    channel = data['channel']

    has_punctuation = check_unallowed_chars(channel, string.punctuation)
    has_whitespace = check_unallowed_chars(channel, string.whitespace)
    has_digits = check_unallowed_chars(channel, string.digits)

    # User sends empty value when submitting an empty form
    if not channel:
        emit('channel created?', {
            'message': "You sent an empty form",
            'channel': ""
        })
    # Check channel has not already been created
    elif channel in db.get("channels"):
        emit('channel created?', {
            "message": "Channel already exists.",
            'channel': ""
        })
    elif has_digits or has_punctuation or has_whitespace:
        emit('channel created?', {
            "message": f"Cannot create channel that contains '{string.whitespace}'or \
            '{string.punctuation}' or '{string.digits}'",
            "channel": ""
        })
    else:
        db["channels"].update({
            channel: {
                "messages": collections.deque(maxlen=100)
            }
        })

        emit('channel created?', {
            "message": "New channel created.",
            'channel': channel
        },
             broadcast=True)


@socketio.on('join')
@authenticated_only
def on_join(data):
    """User joins room."""

    username = data['username']
    room = data['room']
    join_room(room)

    current_messages = list(db["channels"][room]["messages"])
    #  Let the user join
    send({
        "type": "join",
        "room": room,
        "messages": current_messages
    }, json=True)

    # Tell everyone
    send({
        "type": "message",
        "message": f"{username} has entered the room.",
        "room": room
    }, room=room, json=True)

    return "ok"


@socketio.on("refresh")
@authenticated_only
def handle_refresh(data):
    """User fetches convo messages again."""
    room = data['room']

    if room is not None:
        current_messages = list(db["channels"][room]["messages"])
        send({
            "type": "refresh",
            "room": room,
            "messages": current_messages
        }, json=True)

    return "ok"


@socketio.on('message')
@authenticated_only
def handle_message(data):
    """Send messages to rooms."""

    date = datetime.now(timezone.utc)
    room = db["channels"].get(data["room"])
    room["messages"].append({
        "sender": data["username"],
        "content": data["message"],
        "date": str(date)
    })

    send({
        "type": "message",
        "sender": data["username"],
        "room": data['room'],
        "message": data["message"],
        "date": str(date)
    }, room=data["room"], json=True)

    return "ok"


@socketio.on('leave')
@authenticated_only
def on_leave(data):
    """User leaves chat room."""
    username = data['username']
    room = data['room']
    leave_room(room)

    # Tell everyone
    send({
        "type": "message",
        "message": f"{username} has left the room.",
        "room": room
    }, room=room, json=True)

    return "ok"


if __name__ == '__main__':
    socketio.run(app, debug=True)
