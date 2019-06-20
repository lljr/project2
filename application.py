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


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == '__main__':
    socketio.run(app, debug=True)
