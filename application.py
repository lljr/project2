import os

from flask import Flask, render_template, redirect, request, session
from flask_socketio import SocketIO, emit

from helpers import login_required


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

users = []
joined_chats = {}


@app.route("/")
@login_required
def index():
    # TODO fix KeyError because user has not set name in form
    # return render_template("index.html", username=session['username'])
    # NOTE: maybe I can still check for variable assignment in index.html
    # because it inherits from layout.html -- so I'm guessing it implicitly
    # renders it as well??
    return render_template("index.html", channels=session["channels"])


@app.route("/adduser", methods=["GET", "POST"])
def adduser():
    # Forget any logged in user
    session.clear()

    username = request.form.get("username")
    # Check name not taken already
    if request.method ==  "POST":

        if username not in users:
            users.append(session['username'])
        # Remember username in session
            session["username"] = username
            session["channels"] = []

            return redirect(url_for('index'))

    return render_template("adduser.html")


@app.route("/leave")
def logout():

    session.clear()

    return redirect(url_for('login'))



if __name__ == '__main__':
    socketio.run(app, debug=True)
