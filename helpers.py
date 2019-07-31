from functools import wraps
from flask import session, url_for, redirect
from flask_socketio import disconnect


def authenticated_only(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if session.get("username") is None:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("username") is None:
            return redirect(url_for('adduser'))
        return f(*args, **kwargs)
    return decorated_function
