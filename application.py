import os

from flask import Flask, render_template, redirect, request, session, jsonify, url_for
from flask_socketio import SocketIO, emit

from helpers import login_required

from json import dumps


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Dont' cache response for dev purposes
@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

db = {}
channels = []


@app.route("/")
@login_required
def index():
    # TODO fix KeyError because user has not set name in form
    return render_template("index.html", channels=channels, username=session["username"])


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    """User chooses a display name."""
    # Forget any logged in user
    session.clear()

    username = request.form.get("username")
    # Check name not taken already
    if request.method ==  "POST":
        if username not in db:
            db.update({
                username: {
                   "channels": []
                }
            })
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

# Maybe I could also create, leave and join a channel here
@app.route("/channel", methods=["POST", "GET"])
@login_required
def channel():
    """Create, join, or leave a channel."""

    channel = request.form.get("channel")
    if request.form == "POST":
        # Check form is not empty
        if channel is None:
            return jsonify({"message": "can't send an empty form."})
        # Check channel has not already been created
        elif channel in channels:
            return jsonify({"message": "channel already exists."})

        channels.append(channel)

        return jsonify({"message": "channel created."})
    else:
        # NOTE: this depends on opened channel socket.... may need to implement later
        # Check channel exists
        # Check channel form not empty
        # Log out user in channel
        pass

    # NOTE TO SELF: there is a difference between channels AND  channel(this may need its own view)
if __name__ == '__main__':
    socketio.run(app, debug=True)
