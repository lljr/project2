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


def check_unallowed_chars(sent_input, unallowed):
    """Checks for a series of unallowed chars in a string."""

    for char in unallowed:
        if char in sent_input:
            return True
    return False
