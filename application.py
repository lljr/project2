import os

from flask import Flask, render_template, redirect, request, session, \
    jsonify, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
# from tempfile import mkdtemp

# from flask_session import Session

from helpers import login_required, authenticated_only

from json import dumps


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
# app.config.update(
#     SESSION_PERMANENT=False,
#     SESSION_TYPE="filesystem",
#     SESSION_FILE_DIR=mkdtemp()
# )
# Session(app)
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
    return render_template("index.html", username=session[
        "username"
    ])


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    """User chooses a display name."""
    # Forget any logged in user
    session.clear()

    # Check name not taken already
    if request.method == "POST":
        username = request.form.get("username")

        if username not in users_db:
            users_db.add(username)

            # Remember username in session
            session["username"] = username

            return redirect(url_for('index'))
        else:
            return render_template("error.html")

    else:
        return render_template("adduser.html")


@app.route("/leave")
def logout():
    """Log user out."""
    session.clear()

    return redirect(url_for('adduser'))


@app.route("/createchannel", methods=["POST"])
@login_required
def createchannel():
    """Return a channel by checking it does not exist in local DB."""

    channel = request.form.get("channelname")

    # Notify user when sending empty form data
    # Note to self... when sending data with JS FromData, the key entry gets
    # assign an empty string with empty text input
    if not channel:
        return jsonify({
            "success": False,
            "message": "Can't send an empty form."
        })

    # Check channel has not already been created
    elif channel in live_channels:
        return jsonify({
            "success": False,
            "message": "Channel already exists."
        })

    live_channels.add(channel)
    return jsonify({
        "success": True,
        "message": "Channel created."
    })


@app.route("/channels")
@login_required
def channels():
    return jsonify({"channels": list(live_channels)})

@app.route("/channel/<channelname>")
@login_required
def chat(channelname):
    """Show chat room messages."""
    return render_template("chat.html", channel_name=channelname)


@socketio.on('connect')
@authenticated_only
def connect_handler():
    """Connect a user to socket."""
    emit('my response',
         {'message': 'Welcome to Flack!!!'})


@socketio.on('join')
@authenticated_only
def on_join(data):
    """Join user to chat room."""
    username = session['username']
    if room in live_channels:
        join_room(room)
        room = data['room']
        send(username + ' has entered the room.', room=room)
    else:
        send("{room} channel does not exist.")
        # TODO flash with error message???


if __name__ == '__main__':
    socketio.run(app, debug=True)
