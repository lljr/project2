import os

from flask import Flask, render_template, redirect, request, session, \
    jsonify, url_for
from flask_socketio import SocketIO, emit
# from tempfile import mkdtemp

# from flask_session import Session

from helpers import login_required

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

db = []
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
    # TODO fix KeyError because user has not set name in form
    return render_template("index.html", channels=channels, username=session[
        "username"
    ])


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    """User chooses a display name."""
    # Forget any logged in user
    session.clear()

    username = request.form.get("username")
    # Check name not taken already
    if request.method == "POST":
        if username not in db:
            db.append(username)
            # Remember username in session
            session["username"] = username

            print(dumps(db, sort_keys=True, default="str", indent=4))

            return redirect(url_for('index'))

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
    # Check form is not empty
    if channel is None:
        return jsonify({"message": "can't send an empty form."})
    # Check channel has not already been created
    elif channel in channels:
        return jsonify({"message": "channel already exists."})

    channels.append(channel)
    print(f"channels are {channels}")
    return jsonify({
        "channel": channel,
        "message": "channel created."
    })


if __name__ == '__main__':
    socketio.run(app, debug=True)
